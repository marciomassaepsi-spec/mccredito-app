-- Contratos que já estavam em andamento antes do app
--
-- criar_emprestimo_em_andamento: cria o empréstimo e já dá baixa nas primeiras
-- parcelas, que o cliente pagou antes de o contrato entrar no app.
-- importar_contratos: o mesmo para várias linhas de uma planilha, criando o
-- cliente quando ele ainda não existe. Cada linha é independente: se uma der
-- erro, só ela volta atrás e as outras continuam.

-- ---------------------------------------------------------------------------
-- Empréstimo com parcelas já pagas
-- As parcelas pagas entram com a data do vencimento (ou hoje, se ainda não
-- venceram), forma "outro" e a observação "Paga antes do cadastro no app".
-- ---------------------------------------------------------------------------
create function criar_emprestimo_em_andamento(p_emprestimo jsonb, p_parcelas jsonb, p_ja_pagas int)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_liberado date := (p_emprestimo ->> 'liberado_em')::date;
  v_parcela record;
begin
  if p_ja_pagas is null or p_ja_pagas < 0 or p_ja_pagas >= (p_emprestimo ->> 'qtd_parcelas')::int then
    raise exception 'JA_PAGAS_INVALIDO: parcelas já pagas precisa ser de 0 até o total menos 1 (recebido %)', p_ja_pagas;
  end if;

  v_id := criar_emprestimo(p_emprestimo, p_parcelas);

  for v_parcela in
    select id, vencimento, valor_centavos
      from parcelas
     where emprestimo_id = v_id and numero <= p_ja_pagas
     order by numero
  loop
    perform registrar_pagamento(
      v_parcela.id, v_parcela.valor_centavos, 0, 0, 0,
      greatest(least(v_parcela.vencimento, v_hoje), v_liberado),
      'outro', null, 'Paga antes do cadastro no app'
    );
  end loop;

  return v_id;
end;
$$;

revoke all on function criar_emprestimo_em_andamento(jsonb, jsonb, int) from public, anon;
grant execute on function criar_emprestimo_em_andamento(jsonb, jsonb, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Importar contratos de uma planilha
-- Cada linha: {"linha": 2, "cliente": {nome, cpf, whatsapp, endereco},
--              "emprestimo": {...como em criar_emprestimo, sem cliente_id},
--              "parcelas": [...], "ja_pagas": 3}
-- O cliente é achado pelo CPF; sem CPF, pelo nome e WhatsApp iguais. Se não
-- existir, é cadastrado. Um empréstimo igual (mesmo cliente, valor, data de
-- liberação e número de parcelas) não é criado de novo, para a mesma planilha
-- poder ser enviada outra vez sem duplicar nada.
-- Devolve uma lista com {linha, situacao: criado | ja_existia | erro, ...}.
-- ---------------------------------------------------------------------------
create function importar_contratos(p_linhas jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_linha jsonb;
  v_emprestimo jsonb;
  v_resultado jsonb := '[]'::jsonb;
  v_cliente uuid;
  v_cliente_novo boolean;
  v_emprestimo_id uuid;
  v_nome text;
  v_cpf text;
  v_whatsapp text;
begin
  if jsonb_typeof(p_linhas) <> 'array' then
    raise exception 'VALOR_INVALIDO: a lista de contratos veio vazia';
  end if;

  for v_linha in select * from jsonb_array_elements(p_linhas)
  loop
    begin
      v_nome := btrim(coalesce(v_linha -> 'cliente' ->> 'nome', ''));
      v_cpf := nullif(btrim(coalesce(v_linha -> 'cliente' ->> 'cpf', '')), '');
      v_whatsapp := btrim(coalesce(v_linha -> 'cliente' ->> 'whatsapp', ''));
      v_emprestimo := v_linha -> 'emprestimo';
      v_cliente := null;
      v_cliente_novo := false;

      if v_cpf is not null then
        select id into v_cliente from clientes where cpf = v_cpf;
      end if;
      if v_cliente is null then
        select id into v_cliente
          from clientes
         where anonimizado_em is null
           and lower(btrim(nome)) = lower(v_nome)
           and whatsapp = v_whatsapp
           and (v_cpf is null or cpf is null)
         order by criado_em
         limit 1;
      end if;
      if v_cliente is null then
        insert into clientes (nome, cpf, whatsapp, endereco)
        values (v_nome, v_cpf, v_whatsapp, btrim(coalesce(v_linha -> 'cliente' ->> 'endereco', '')))
        returning id into v_cliente;
        v_cliente_novo := true;
      end if;

      select id into v_emprestimo_id
        from emprestimos
       where cliente_id = v_cliente
         and status in ('ativo', 'quitado', 'em_atraso')
         and valor_centavos = (v_emprestimo ->> 'valor_centavos')::bigint
         and liberado_em = (v_emprestimo ->> 'liberado_em')::date
         and qtd_parcelas = (v_emprestimo ->> 'qtd_parcelas')::int
       limit 1;

      if v_emprestimo_id is not null then
        v_resultado := v_resultado || jsonb_build_object(
          'linha', v_linha -> 'linha', 'situacao', 'ja_existia', 'emprestimo_id', v_emprestimo_id
        );
        continue;
      end if;

      v_emprestimo_id := criar_emprestimo_em_andamento(
        v_emprestimo || jsonb_build_object('cliente_id', v_cliente),
        v_linha -> 'parcelas',
        coalesce((v_linha ->> 'ja_pagas')::int, 0)
      );

      v_resultado := v_resultado || jsonb_build_object(
        'linha', v_linha -> 'linha', 'situacao', 'criado',
        'emprestimo_id', v_emprestimo_id, 'cliente_novo', v_cliente_novo
      );
    exception when others then
      -- Só esta linha volta atrás (inclusive o cliente, se tinha sido criado agora)
      v_resultado := v_resultado || jsonb_build_object(
        'linha', v_linha -> 'linha', 'situacao', 'erro', 'mensagem', sqlerrm, 'codigo', sqlstate
      );
    end;
  end loop;

  return v_resultado;
end;
$$;

revoke all on function importar_contratos(jsonb) from public, anon;
grant execute on function importar_contratos(jsonb) to authenticated;

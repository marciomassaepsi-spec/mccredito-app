-- Mudar a data de vencimento
--
-- O cliente pede para pagar em outro dia. Muda só a data de vencimento das
-- parcelas em aberto: valor, juros, amortização, saldo e pagamentos ficam como
-- estão. As novas datas são calculadas no app (lib/finance/vencimentos.ts) e
-- conferidas aqui. A auditoria por gatilho registra cada parcela alterada.

-- ---------------------------------------------------------------------------
-- alterar_vencimentos
--   p_novas      = [{ parcela_id, vencimento }] (só as parcelas que mudam)
--   p_observacao = motivo (opcional), vai junto na linha das observações
-- Numa transação só: trava o empréstimo e as parcelas, confere tudo, troca as
-- datas, mantém primeiro_vencimento igual ao da 1ª parcela e anota nas
-- observações do empréstimo.
-- ---------------------------------------------------------------------------
create function alterar_vencimentos(p_emprestimo uuid, p_novas jsonb, p_observacao text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_emp emprestimos%rowtype;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_texto text := btrim(coalesce(p_observacao, ''));
  v_enviadas int;
  v_distintas int;
  v_mudadas int;
  v_mudancas jsonb;
  v_primeiro record;
  v_min int;
  v_max int;
  v_numeros text;
  v_linha text;
  v_fora record;
begin
  if papel_atual() is distinct from 'admin' and papel_atual() is distinct from 'operador' then
    raise exception 'SEM_ACESSO: só o dono ou um operador pode mudar vencimentos' using errcode = '42501';
  end if;

  select * into v_emp from emprestimos where id = p_emprestimo for update;
  if not found then
    raise exception 'NAO_ENCONTRADO: empréstimo não existe';
  end if;
  if v_emp.status <> 'ativo' then
    raise exception 'EMPRESTIMO_INATIVO: só dá para mudar vencimento de empréstimo ativo (este está %)', v_emp.status;
  end if;

  if p_novas is null or jsonb_typeof(p_novas) <> 'array' or jsonb_array_length(p_novas) = 0 then
    raise exception 'VENCIMENTO_INVALIDO: nenhuma parcela enviada';
  end if;

  -- Trava as parcelas: um pagamento não entra no meio da troca
  perform 1 from parcelas where emprestimo_id = p_emprestimo for update;

  select count(*), count(distinct x.parcela_id) into v_enviadas, v_distintas
    from jsonb_to_recordset(p_novas) as x(parcela_id uuid, vencimento date);
  if v_distintas <> v_enviadas then
    raise exception 'VENCIMENTO_INVALIDO: parcela repetida na lista';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_novas) as x(parcela_id uuid, vencimento date)
              where x.parcela_id is null or x.vencimento is null) then
    raise exception 'VENCIMENTO_INVALIDO: parcela ou data em branco';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_novas) as x(parcela_id uuid, vencimento date)
              left join parcelas p on p.id = x.parcela_id
              where p.emprestimo_id is distinct from p_emprestimo) then
    raise exception 'NAO_ENCONTRADO: parcela de outro empréstimo';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_novas) as x(parcela_id uuid, vencimento date)
               join parcelas p on p.id = x.parcela_id
              where p.status not in ('a_vencer', 'paga_parcial')) then
    raise exception 'PARCELA_FECHADA: só parcelas em aberto podem mudar de vencimento';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_novas) as x(parcela_id uuid, vencimento date)
              where x.vencimento < v_emp.liberado_em) then
    raise exception 'VENCIMENTO_ANTES_LIBERACAO: o vencimento não pode ser antes de % (liberação)', v_emp.liberado_em;
  end if;

  -- Só as que mudam de fato, com a data de antes (para a anotação)
  select coalesce(jsonb_agg(jsonb_build_object(
           'parcela_id', p.id, 'numero', p.numero, 'antes', p.vencimento, 'depois', x.vencimento
         ) order by p.numero), '[]'::jsonb)
    into v_mudancas
    from jsonb_to_recordset(p_novas) as x(parcela_id uuid, vencimento date)
    join parcelas p on p.id = x.parcela_id
   where p.vencimento <> x.vencimento;
  v_mudadas := jsonb_array_length(v_mudancas);
  if v_mudadas = 0 then
    raise exception 'VENCIMENTO_INVALIDO: as datas enviadas são as mesmas de agora';
  end if;

  -- Só a data muda; nada de valor, juros, saldo ou pagamento
  update parcelas p
     set vencimento = m.depois
    from jsonb_to_recordset(v_mudancas) as m(parcela_id uuid, depois date)
   where p.id = m.parcela_id;

  -- A ordem final (sem as canceladas) precisa seguir o número da parcela
  select numero, vencimento, anterior_numero, anterior_vencimento into v_fora
    from (
      select numero, vencimento,
             lag(numero) over (order by numero) as anterior_numero,
             lag(vencimento) over (order by numero) as anterior_vencimento
        from parcelas
       where emprestimo_id = p_emprestimo and status <> 'cancelada'
    ) t
   where vencimento < anterior_vencimento
   order by numero
   limit 1;
  if found then
    raise exception 'ORDEM_VENCIMENTOS: a parcela % (%) ficaria antes da parcela % (%)',
      v_fora.numero, to_char(v_fora.vencimento, 'DD/MM/YYYY'),
      v_fora.anterior_numero, to_char(v_fora.anterior_vencimento, 'DD/MM/YYYY');
  end if;

  -- primeiro_vencimento acompanha a 1ª parcela (só muda se ela mudou)
  update emprestimos e
     set primeiro_vencimento = p.vencimento
    from parcelas p
   where e.id = p_emprestimo and p.emprestimo_id = e.id and p.numero = 1
     and e.primeiro_vencimento is distinct from p.vencimento;

  -- "Vencimento alterado em 14/11/2026: parcelas 3 a 6 de 10/09/2026 para 20/09/2026. Motivo"
  select m.antes, m.depois into v_primeiro
    from jsonb_to_recordset(v_mudancas) as m(numero int, antes date, depois date)
   order by m.numero limit 1;
  select min(m.numero), max(m.numero), string_agg(m.numero::text, ', ' order by m.numero)
    into v_min, v_max, v_numeros
    from jsonb_to_recordset(v_mudancas) as m(numero int);
  v_linha := 'Vencimento alterado em ' || to_char(v_hoje, 'DD/MM/YYYY') || ': '
    || case
         when v_mudadas = 1 then 'parcela ' || v_min
         when v_max - v_min + 1 = v_mudadas then 'parcelas ' || v_min || ' a ' || v_max
         else 'parcelas ' || regexp_replace(v_numeros, ', (\d+)$', ' e \1')
       end
    || ' de ' || to_char(v_primeiro.antes, 'DD/MM/YYYY')
    || ' para ' || to_char(v_primeiro.depois, 'DD/MM/YYYY')
    || '.'
    || case when v_texto <> '' then ' ' || v_texto else '' end;

  update emprestimos
     set observacoes = btrim(observacoes || E'\n' || v_linha, E' \n')
   where id = p_emprestimo;
end;
$$;

revoke all on function alterar_vencimentos(uuid, jsonb, text) from public, anon;
grant execute on function alterar_vencimentos(uuid, jsonb, text) to authenticated;

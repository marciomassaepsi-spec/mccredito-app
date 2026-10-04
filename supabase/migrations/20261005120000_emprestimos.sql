-- Fase 4: cadastro de empréstimos e configurações da empresa

-- ---------------------------------------------------------------------------
-- Correção: para quem não tem perfil, eh_admin() devolvia NULL em vez de false,
-- e um "if not eh_admin()" não barrava. Agora é sempre true ou false.
-- ---------------------------------------------------------------------------
create or replace function eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(papel_atual() = 'admin', false)
$$;

-- ---------------------------------------------------------------------------
-- Configurações: dados de quem empresta (vão no contrato e no PIX)
-- ---------------------------------------------------------------------------
alter table configuracoes
  add column razao_social text not null default '',
  add column tipo_chave_pix text not null default ''
    check (tipo_chave_pix in ('', 'cpf', 'cnpj', 'telefone', 'email', 'aleatoria'));

comment on column configuracoes.nome_empresa is 'Nome fantasia, ex.: MC Créditos';
comment on column configuracoes.razao_social is 'Nome completo (pessoa física) ou razão social do credor';
comment on column configuracoes.chave_pix is 'Chave já normalizada: telefone em +55DDNNNNNNNNN, CPF/CNPJ só dígitos';

-- ---------------------------------------------------------------------------
-- Criar empréstimo e parcelas numa transação só.
-- O cronograma é calculado no servidor do app (lib/finance) e conferido aqui.
-- security invoker: as regras de RLS de quem chamou continuam valendo.
-- ---------------------------------------------------------------------------
create function criar_emprestimo(p_emprestimo jsonb, p_parcelas jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_limite int;
  v_ativos int;
  v_valor bigint := (p_emprestimo ->> 'valor_centavos')::bigint;
  v_qtd int := (p_emprestimo ->> 'qtd_parcelas')::int;
  v_soma_amortizacao bigint;
  v_linhas int;
begin
  select limite_contratos_ativos into v_limite from configuracoes;
  select count(*) into v_ativos from emprestimos where status = 'ativo';
  if v_ativos >= coalesce(v_limite, 150) then
    raise exception 'LIMITE_CONTRATOS: já existem % contratos ativos (limite %)', v_ativos, v_limite
      using errcode = 'P0001';
  end if;

  select count(*), coalesce(sum((p ->> 'amortizacao_centavos')::bigint), 0)
    into v_linhas, v_soma_amortizacao
    from jsonb_array_elements(p_parcelas) as p;

  if v_linhas <> v_qtd then
    raise exception 'CRONOGRAMA_INVALIDO: % parcelas enviadas, % esperadas', v_linhas, v_qtd;
  end if;
  if v_soma_amortizacao <> v_valor then
    raise exception 'CRONOGRAMA_INVALIDO: amortizações somam %, valor emprestado é %',
      v_soma_amortizacao, v_valor;
  end if;

  insert into emprestimos (
    cliente_id, valor_centavos, taxa_percentual, sistema, qtd_parcelas, periodicidade,
    liberado_em, primeiro_vencimento, renegociado_de, observacoes
  ) values (
    (p_emprestimo ->> 'cliente_id')::uuid,
    v_valor,
    (p_emprestimo ->> 'taxa_percentual')::numeric,
    (p_emprestimo ->> 'sistema')::sistema_amortizacao,
    v_qtd,
    (p_emprestimo ->> 'periodicidade')::periodicidade,
    (p_emprestimo ->> 'liberado_em')::date,
    (p_emprestimo ->> 'primeiro_vencimento')::date,
    nullif(p_emprestimo ->> 'renegociado_de', '')::uuid,
    coalesce(p_emprestimo ->> 'observacoes', '')
  )
  returning id into v_id;

  insert into parcelas (
    emprestimo_id, numero, vencimento, valor_centavos, juros_centavos,
    amortizacao_centavos, saldo_devedor_centavos
  )
  select v_id, x.numero, x.vencimento, x.valor_centavos, x.juros_centavos,
         x.amortizacao_centavos, x.saldo_devedor_centavos
    from jsonb_to_recordset(p_parcelas) as x(
      numero int, vencimento date, valor_centavos bigint, juros_centavos bigint,
      amortizacao_centavos bigint, saldo_devedor_centavos bigint
    );

  return v_id;
end;
$$;

revoke all on function criar_emprestimo(jsonb, jsonb) from public, anon;
grant execute on function criar_emprestimo(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Cancelar empréstimo (só admin). Parcelas em aberto viram canceladas;
-- as já pagas ficam como estão.
-- ---------------------------------------------------------------------------
create function cancelar_emprestimo(p_id uuid, p_motivo text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not eh_admin() then
    raise exception 'SEM_PERMISSAO: só o dono pode cancelar empréstimos';
  end if;
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'MOTIVO_OBRIGATORIO: informe o motivo do cancelamento';
  end if;

  update parcelas set status = 'cancelada'
   where emprestimo_id = p_id and status in ('a_vencer', 'paga_parcial');

  update emprestimos
     set status = 'cancelado',
         observacoes = btrim(observacoes || E'\nCancelado: ' || trim(p_motivo), E' \n')
   where id = p_id and status = 'ativo';

  if not found then
    raise exception 'NAO_ENCONTRADO: empréstimo não existe ou não está ativo';
  end if;
end;
$$;

revoke all on function cancelar_emprestimo(uuid, text) from public, anon;
grant execute on function cancelar_emprestimo(uuid, text) to authenticated;

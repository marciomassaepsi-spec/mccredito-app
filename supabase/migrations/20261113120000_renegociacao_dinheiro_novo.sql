-- Renegociação com dinheiro novo
--
-- Ao renegociar, o dono pode mandar mais dinheiro para o cliente. O valor do
-- novo contrato é:
--   saldo em aberto do contrato antigo (parcelas a vencer e pagas em parte,
--   sem multa e mora)
--   + multa e mora até a data da renegociação, se o dono escolher somar
--   + dinheiro novo entregue ao cliente agora (pode ser zero)
-- O saldo é recalculado aqui; o app manda o cronograma e os outros dois valores.

-- ---------------------------------------------------------------------------
-- Quanto de dinheiro novo foi entregue numa renegociação.
-- null: o empréstimo não veio de renegociação. Zero ou mais: veio.
-- ---------------------------------------------------------------------------
alter table emprestimos add column dinheiro_novo_centavos bigint;

comment on column emprestimos.dinheiro_novo_centavos is
  'Renegociação: dinheiro novo entregue ao cliente, em centavos (0 se só mudou o prazo). null se não é renegociação.';

-- Renegociações feitas antes desta versão não tinham dinheiro novo
update emprestimos set dinheiro_novo_centavos = 0 where renegociado_de is not null;

alter table emprestimos add constraint emprestimos_dinheiro_novo_check check (
  (renegociado_de is null and dinheiro_novo_centavos is null)
  or (renegociado_de is not null and dinheiro_novo_centavos is not null and dinheiro_novo_centavos >= 0)
);

-- ---------------------------------------------------------------------------
-- criar_emprestimo passa a gravar dinheiro_novo_centavos (quando vem no JSON).
-- O resto é igual à versão de 20261005120000_emprestimos.sql.
-- ---------------------------------------------------------------------------
create or replace function criar_emprestimo(p_emprestimo jsonb, p_parcelas jsonb)
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
    liberado_em, primeiro_vencimento, renegociado_de, dinheiro_novo_centavos, observacoes
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
    nullif(p_emprestimo ->> 'dinheiro_novo_centavos', '')::bigint,
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
-- Renegociação, agora com dinheiro novo e multa/mora opcionais.
-- Troca a versão de 20261006120000_pagamentos.sql (que tinha motivo obrigatório).
--   p_novo         = empréstimo novo, como em criar_emprestimo (sem renegociado_de)
--   p_parcelas     = cronograma do novo, calculado no app
--   p_encargos     = multa + mora somadas ao saldo (0 se o dono não quis somar)
--   p_dinheiro_novo= dinheiro entregue ao cliente agora (0 se só mudou o prazo)
--   p_observacao   = texto que vai nas observações (opcional)
-- Numa transação só: trava o antigo, confere o valor, cancela as parcelas em
-- aberto, marca o antigo como renegociado e cria o novo ligado a ele.
-- ---------------------------------------------------------------------------
drop function renegociar_emprestimo(uuid, jsonb, jsonb, text);

create function renegociar_emprestimo(
  p_antigo uuid,
  p_novo jsonb,
  p_parcelas jsonb,
  p_encargos bigint,
  p_dinheiro_novo bigint,
  p_observacao text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_antigo emprestimos%rowtype;
  v_saldo bigint;
  v_abertas int;
  v_valor bigint := (p_novo ->> 'valor_centavos')::bigint;
  v_data date := (p_novo ->> 'liberado_em')::date;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_texto text := btrim(coalesce(p_observacao, ''));
begin
  select * into v_antigo from emprestimos where id = p_antigo for update;
  if not found then
    raise exception 'NAO_ENCONTRADO: empréstimo não existe';
  end if;
  if v_antigo.status <> 'ativo' then
    raise exception 'EMPRESTIMO_INATIVO: só dá para renegociar empréstimo ativo (este está %)', v_antigo.status;
  end if;
  if (p_novo ->> 'cliente_id')::uuid is distinct from v_antigo.cliente_id then
    raise exception 'CRONOGRAMA_INVALIDO: o novo empréstimo precisa ser do mesmo cliente';
  end if;
  if p_encargos is null or p_encargos < 0 then
    raise exception 'VALOR_INVALIDO: multa e mora não podem ser negativas';
  end if;
  if p_dinheiro_novo is null or p_dinheiro_novo < 0 then
    raise exception 'VALOR_INVALIDO: o dinheiro novo não pode ser negativo';
  end if;
  if v_data is null or v_data < v_antigo.liberado_em or v_data > v_hoje then
    raise exception 'DATA_INVALIDA: a data da renegociação precisa ser entre % e hoje', v_antigo.liberado_em;
  end if;

  -- Trava as parcelas em aberto: um pagamento não entra no meio da conta
  perform 1 from parcelas
   where emprestimo_id = p_antigo and status in ('a_vencer', 'paga_parcial')
     for update;

  select count(*), coalesce(sum(valor_centavos - pago_centavos), 0)
    into v_abertas, v_saldo
    from parcelas
   where emprestimo_id = p_antigo and status in ('a_vencer', 'paga_parcial');

  if v_abertas = 0 then
    raise exception 'PARCELA_FECHADA: não há parcelas em aberto para renegociar';
  end if;
  if v_valor is distinct from v_saldo + p_encargos + p_dinheiro_novo then
    raise exception 'SALDO_MUDOU: saldo em aberto % + multa e mora % + dinheiro novo % = %, mas o novo contrato veio com %',
      v_saldo, p_encargos, p_dinheiro_novo, v_saldo + p_encargos + p_dinheiro_novo, v_valor;
  end if;

  if v_texto = '' then
    v_texto := 'novo contrato';
  end if;

  update parcelas set status = 'cancelada'
   where emprestimo_id = p_antigo and status in ('a_vencer', 'paga_parcial');
  update emprestimos
     set status = 'renegociado',
         observacoes = btrim(observacoes || E'\nRenegociado: ' || v_texto, E' \n')
   where id = p_antigo;

  return criar_emprestimo(
    p_novo || jsonb_build_object('renegociado_de', p_antigo, 'dinheiro_novo_centavos', p_dinheiro_novo),
    p_parcelas
  );
end;
$$;

revoke all on function renegociar_emprestimo(uuid, jsonb, jsonb, bigint, bigint, text) from public, anon;
grant execute on function renegociar_emprestimo(uuid, jsonb, jsonb, bigint, bigint, text) to authenticated;

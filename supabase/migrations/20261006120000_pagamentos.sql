-- Fase 5: pagamentos, estornos, quitação antecipada, renegociação e modelo de contrato
--
-- Como um pagamento é registrado (centavos):
--   valor_centavos    = quanto abate da parcela (principal + juros dela)
--   multa_centavos    = multa por atraso cobrada
--   mora_centavos     = juros de mora cobrados
--   desconto_centavos = desconto dado (ex.: juros futuros na quitação antecipada)
--   recebido de fato  = valor + multa + mora - desconto
-- Os valores são calculados no servidor do app (lib/finance) e conferidos aqui.

-- ---------------------------------------------------------------------------
-- Recalcula o status da parcela e do empréstimo a partir dos pagamentos válidos
-- ---------------------------------------------------------------------------
create function recalcular_parcela(p_parcela uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pago bigint;
  v_ultimo date;
  v_parcela parcelas%rowtype;
  v_abertas int;
begin
  select * into v_parcela from parcelas where id = p_parcela for update;
  if not found then
    raise exception 'NAO_ENCONTRADO: parcela não existe';
  end if;

  select coalesce(sum(valor_centavos), 0), max(pago_em)
    into v_pago, v_ultimo
    from pagamentos
   where parcela_id = p_parcela and not estornado;

  update parcelas
     set pago_centavos = v_pago,
         status = case
           when v_parcela.status = 'cancelada' then 'cancelada'
           when v_pago >= v_parcela.valor_centavos then 'paga'
           when v_pago > 0 then 'paga_parcial'
           else 'a_vencer'
         end::status_parcela,
         quitada_em = case when v_pago >= v_parcela.valor_centavos then v_ultimo end
   where id = p_parcela;

  -- Empréstimo ativo sem parcelas em aberto vira quitado; quitado com parcela reaberta volta a ativo
  select count(*) into v_abertas
    from parcelas
   where emprestimo_id = v_parcela.emprestimo_id and status in ('a_vencer', 'paga_parcial');

  update emprestimos
     set status = case
       when status = 'ativo' and v_abertas = 0 then 'quitado'
       when status = 'quitado' and v_abertas > 0 then 'ativo'
       else status
     end::status_emprestimo
   where id = v_parcela.emprestimo_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Registrar pagamento de uma parcela
-- ---------------------------------------------------------------------------
create function registrar_pagamento(
  p_parcela uuid,
  p_valor bigint,
  p_multa bigint,
  p_mora bigint,
  p_desconto bigint,
  p_pago_em date,
  p_forma forma_pagamento,
  p_comprovante text,
  p_observacoes text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_parcela parcelas%rowtype;
  v_status_emprestimo status_emprestimo;
begin
  select * into v_parcela from parcelas where id = p_parcela for update;
  if not found then
    raise exception 'NAO_ENCONTRADO: parcela não existe';
  end if;

  select status into v_status_emprestimo from emprestimos where id = v_parcela.emprestimo_id;
  if v_status_emprestimo <> 'ativo' then
    raise exception 'EMPRESTIMO_INATIVO: o empréstimo não está ativo';
  end if;
  if v_parcela.status not in ('a_vencer', 'paga_parcial') then
    raise exception 'PARCELA_FECHADA: esta parcela já está paga ou cancelada';
  end if;
  if p_valor <= 0 then
    raise exception 'VALOR_INVALIDO: o valor precisa ser maior que zero';
  end if;
  if v_parcela.pago_centavos + p_valor > v_parcela.valor_centavos then
    raise exception 'VALOR_ACIMA: o pagamento passa do valor em aberto da parcela (faltam % centavos)',
      v_parcela.valor_centavos - v_parcela.pago_centavos;
  end if;
  if p_desconto > p_valor + p_multa + p_mora then
    raise exception 'VALOR_INVALIDO: desconto maior que o valor';
  end if;

  insert into pagamentos (
    parcela_id, valor_centavos, multa_centavos, mora_centavos, desconto_centavos,
    pago_em, forma, comprovante_path, observacoes
  ) values (
    p_parcela, p_valor, p_multa, p_mora, p_desconto,
    p_pago_em, p_forma, nullif(p_comprovante, ''), coalesce(p_observacoes, '')
  )
  returning id into v_id;

  perform recalcular_parcela(p_parcela);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Estornar pagamento (com motivo). Reabre a parcela e, se for o caso, o empréstimo.
-- ---------------------------------------------------------------------------
create function estornar_pagamento(p_pagamento uuid, p_motivo text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_parcela uuid;
begin
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'MOTIVO_OBRIGATORIO: informe o motivo do estorno';
  end if;

  update pagamentos
     set estornado = true, estorno_motivo = trim(p_motivo)
   where id = p_pagamento and not estornado
   returning parcela_id into v_parcela;

  if v_parcela is null then
    raise exception 'NAO_ENCONTRADO: pagamento não existe ou já foi estornado';
  end if;

  perform recalcular_parcela(v_parcela);
end;
$$;

-- ---------------------------------------------------------------------------
-- Quitação antecipada: paga todas as parcelas em aberto de uma vez.
-- p_itens = [{ parcela_id, valor, multa, mora, desconto }]
-- ---------------------------------------------------------------------------
create function quitar_emprestimo(
  p_emprestimo uuid,
  p_itens jsonb,
  p_pago_em date,
  p_forma forma_pagamento,
  p_comprovante text,
  p_observacoes text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item record;
  v_abertas int;
  v_enviadas int;
begin
  select count(*) into v_abertas
    from parcelas where emprestimo_id = p_emprestimo and status in ('a_vencer', 'paga_parcial');
  select count(distinct x.parcela_id) into v_enviadas
    from jsonb_to_recordset(p_itens) as x(parcela_id uuid);

  if v_abertas = 0 then
    raise exception 'PARCELA_FECHADA: não há parcelas em aberto';
  end if;
  if v_enviadas <> v_abertas then
    raise exception 'QUITACAO_INCOMPLETA: % parcelas em aberto, % enviadas', v_abertas, v_enviadas;
  end if;

  for v_item in
    select x.* from jsonb_to_recordset(p_itens)
      as x(parcela_id uuid, valor bigint, multa bigint, mora bigint, desconto bigint)
  loop
    if not exists (select 1 from parcelas where id = v_item.parcela_id and emprestimo_id = p_emprestimo) then
      raise exception 'NAO_ENCONTRADO: parcela de outro empréstimo';
    end if;
    perform registrar_pagamento(
      v_item.parcela_id, v_item.valor, v_item.multa, v_item.mora, v_item.desconto,
      p_pago_em, p_forma, p_comprovante, coalesce(p_observacoes, 'Quitação antecipada')
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Renegociação: encerra o empréstimo atual (status renegociado, parcelas em
-- aberto canceladas) e cria um novo, ligado ao antigo, numa transação só.
-- ---------------------------------------------------------------------------
create function renegociar_emprestimo(
  p_antigo uuid,
  p_novo jsonb,
  p_parcelas jsonb,
  p_motivo text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cliente uuid;
begin
  if length(trim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'MOTIVO_OBRIGATORIO: informe o motivo da renegociação';
  end if;

  select cliente_id into v_cliente from emprestimos where id = p_antigo and status = 'ativo' for update;
  if v_cliente is null then
    raise exception 'NAO_ENCONTRADO: empréstimo não existe ou não está ativo';
  end if;
  if (p_novo ->> 'cliente_id')::uuid <> v_cliente then
    raise exception 'CRONOGRAMA_INVALIDO: o novo empréstimo precisa ser do mesmo cliente';
  end if;

  update parcelas set status = 'cancelada'
   where emprestimo_id = p_antigo and status in ('a_vencer', 'paga_parcial');
  update emprestimos
     set status = 'renegociado',
         observacoes = btrim(observacoes || E'\nRenegociado: ' || trim(p_motivo), E' \n')
   where id = p_antigo;

  return criar_emprestimo(p_novo || jsonb_build_object('renegociado_de', p_antigo), p_parcelas);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'recalcular_parcela(uuid)',
    'registrar_pagamento(uuid, bigint, bigint, bigint, bigint, date, forma_pagamento, text, text)',
    'estornar_pagamento(uuid, text)',
    'quitar_emprestimo(uuid, jsonb, date, forma_pagamento, text, text)',
    'renegociar_emprestimo(uuid, jsonb, jsonb, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Modelo de contrato editável (texto com {{variaveis}})
-- ---------------------------------------------------------------------------
alter table configuracoes add column modelo_contrato text not null default '';

-- Documentos: quem enviou
alter table documentos add column enviado_por uuid default auth.uid() references auth.users (id);

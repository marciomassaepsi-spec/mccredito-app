-- REPARO: recalcular parcelas e empréstimos a partir dos pagamentos
--
-- Não é uma migration. Rode no Supabase > SQL Editor quando os valores de
-- parcelas ou empréstimos parecerem não bater com os pagamentos (por exemplo,
-- uma parcela com pagamento registrado que continua "em aberto", ou um
-- empréstimo todo pago que continua "ativo"). Pode rodar quantas vezes quiser:
-- se estiver tudo certo, nada muda e o resultado mostra 0 correções.
--
-- O que faz, numa transação só (se algo der errado, nada é gravado):
--   1. Para TODAS as parcelas, refaz pago_centavos, status e quitada_em a partir
--      dos pagamentos não estornados, com a mesma regra da função
--      recalcular_parcela (supabase/migrations/20261006120000_pagamentos.sql):
--        pago       = soma do valor_centavos dos pagamentos não estornados
--        status     = cancelada continua cancelada; pago >= valor: paga;
--                     pago > 0: paga_parcial; senão: a_vencer
--        quitada_em = data do último pagamento, se pago >= valor; senão vazio
--   2. Empréstimo ativo sem parcela em aberto vira quitado; quitado com parcela
--      em aberto volta a ativo. Cancelados e renegociados não são mexidos.
--   3. Mostra um resumo só com contagens e somas (nenhum dado de cliente).
--
-- Só são alteradas as linhas que estão diferentes do certo, e cada alteração
-- fica registrada no Histórico de alterações do app.
-- Pagamentos nunca são alterados por este script.

begin;

-- Ninguém registra pagamento enquanto o reparo roda (leva poucos segundos)
lock table emprestimos, parcelas, pagamentos in share row exclusive mode;

create temp table if not exists reparo_resumo (item text primary key, valor bigint not null);
truncate pg_temp.reparo_resumo;

-- Carteira antes: o que falta receber das parcelas em aberto de empréstimos ativos
insert into reparo_resumo
select 'carteira_antes', coalesce(sum(greatest(0, p.valor_centavos - p.pago_centavos)), 0)
  from parcelas p
  join emprestimos e on e.id = p.emprestimo_id
 where p.status in ('a_vencer', 'paga_parcial') and e.status = 'ativo';

-- 1. Parcelas
with pagos as (
  select p.id,
         coalesce(sum(pg.valor_centavos) filter (where not pg.estornado), 0) as pago,
         max(pg.pago_em) filter (where not pg.estornado) as ultimo
    from parcelas p
    left join pagamentos pg on pg.parcela_id = p.id
   group by p.id
),
certo as (
  select p.id,
         x.pago,
         case
           when p.status = 'cancelada' then 'cancelada'
           when x.pago >= p.valor_centavos then 'paga'
           when x.pago > 0 then 'paga_parcial'
           else 'a_vencer'
         end::status_parcela as status,
         case when x.pago >= p.valor_centavos then x.ultimo end as quitada_em
    from parcelas p
    join pagos x on x.id = p.id
),
mudou as (
  update parcelas p
     set pago_centavos = c.pago,
         status = c.status,
         quitada_em = c.quitada_em
    from certo c
   where c.id = p.id
     and (p.pago_centavos, p.status, p.quitada_em) is distinct from (c.pago, c.status, c.quitada_em)
  returning p.id
)
insert into reparo_resumo select 'parcelas_corrigidas', count(*) from mudou;

-- 2. Empréstimos (só ativo <-> quitado)
with abertas as (
  select e.id, count(p.id) filter (where p.status in ('a_vencer', 'paga_parcial')) as n
    from emprestimos e
    left join parcelas p on p.emprestimo_id = e.id
   where e.status in ('ativo', 'quitado')
   group by e.id
),
mudou as (
  update emprestimos e
     set status = case when e.status = 'ativo' then 'quitado' else 'ativo' end::status_emprestimo
    from abertas a
   where a.id = e.id
     and ((e.status = 'ativo' and a.n = 0) or (e.status = 'quitado' and a.n > 0))
  returning e.status
)
insert into reparo_resumo
select 'emprestimos_quitados', count(*) filter (where status = 'quitado') from mudou
union all
select 'emprestimos_reabertos', count(*) filter (where status = 'ativo') from mudou;

-- Carteira depois
insert into reparo_resumo
select 'carteira_depois', coalesce(sum(greatest(0, p.valor_centavos - p.pago_centavos)), 0)
  from parcelas p
  join emprestimos e on e.id = p.emprestimo_id
 where p.status in ('a_vencer', 'paga_parcial') and e.status = 'ativo';

commit;

-- 3. Resumo (valores em reais)
select
  case
    when (select valor from reparo_resumo where item = 'parcelas_corrigidas') = 0
     and (select valor from reparo_resumo where item = 'emprestimos_quitados') = 0
     and (select valor from reparo_resumo where item = 'emprestimos_reabertos') = 0
    then 'Tudo certo: nada precisou ser corrigido'
    else 'Corrigido'
  end as resultado,
  (select valor from reparo_resumo where item = 'parcelas_corrigidas') as parcelas_corrigidas,
  (select valor from reparo_resumo where item = 'emprestimos_quitados') as emprestimos_que_viraram_quitados,
  (select valor from reparo_resumo where item = 'emprestimos_reabertos') as emprestimos_que_voltaram_a_ativo,
  round((select valor from reparo_resumo where item = 'carteira_antes') / 100.0, 2) as falta_receber_antes_reais,
  round((select valor from reparo_resumo where item = 'carteira_depois') / 100.0, 2) as falta_receber_depois_reais,
  (select count(*) from emprestimos where status = 'ativo') as contratos_ativos,
  (select count(*) from parcelas p join emprestimos e on e.id = p.emprestimo_id
    where p.status in ('a_vencer', 'paga_parcial') and e.status = 'ativo') as parcelas_em_aberto,
  (select count(*) from pagamentos where not estornado) as pagamentos_validos,
  (select count(*) from pagamentos where estornado) as pagamentos_estornados,
  round(coalesce((select sum(valor_centavos) from pagamentos where not estornado), 0) / 100.0, 2) as total_abatido_das_parcelas_reais,
  round(coalesce((select sum(valor_centavos + multa_centavos + mora_centavos - desconto_centavos)
                    from pagamentos where not estornado), 0) / 100.0, 2) as total_recebido_com_juros_reais,
  (select count(*) from parcelas where pago_centavos > valor_centavos) as parcelas_pagas_a_mais_conferir;

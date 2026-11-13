-- Atraso: juros de 1% ao dia sobre o valor da parcela, sem multa e sem teto
--
-- Pedido do dono: "Juros padrão para atrasos de 1% ao dia em cima do valor da
-- parcela, em todos os contratos." Sem multa fixa e sem limite.
--
-- Regra (calculada no app, em src/lib/finance/atraso.ts, sempre na hora):
--   juros de atraso = (valor − pago da parcela) × taxa diária × dias de atraso
--   juros simples, arredondado para o centavo. Ex.: R$ 250,00 com 10 dias = R$ 275,00.
-- Valor, juros e amortização gravados nas parcelas não mudam.
--
-- Nos pagamentos, os juros de atraso cobrados vão em mora_centavos e
-- multa_centavos fica 0. Pagamentos antigos continuam com a multa e a mora
-- que foram cobradas na época. As funções registrar_pagamento,
-- quitar_emprestimo e renegociar_emprestimo não mudam: já aceitam qualquer
-- multa/mora >= 0 calculada pelo app.

-- ---------------------------------------------------------------------------
-- Taxa diária de atraso, em percentual (1 = 1% ao dia)
-- ---------------------------------------------------------------------------
alter table configuracoes
  add column juros_atraso_dia_percentual numeric(6, 3) not null default 1
    check (juros_atraso_dia_percentual >= 0 and juros_atraso_dia_percentual <= 10);

comment on column configuracoes.juros_atraso_dia_percentual is
  'Juros por dia de atraso, em % (1 = 1% ao dia), sobre o valor em aberto da parcela; juros simples, sem multa e sem teto';

-- A linha que já existe passa a usar 1% ao dia (o default já preenche, mas fica explícito)
update configuracoes set juros_atraso_dia_percentual = 1;

-- ---------------------------------------------------------------------------
-- Sem multa. As colunas antigas ficam, sem uso pelo app, para não quebrar
-- uma versão anterior do app que esteja no ar durante a publicação e para
-- manter o histórico da auditoria legível.
-- ---------------------------------------------------------------------------
alter table configuracoes alter column multa_percentual set default 0;
update configuracoes set multa_percentual = 0;

comment on column configuracoes.multa_percentual is 'Sem uso desde a migration 20261115120000: não há multa por atraso (zerada)';
comment on column configuracoes.mora_percentual_mes is 'Sem uso desde a migration 20261115120000: substituída por juros_atraso_dia_percentual';
comment on column configuracoes.multa_limite_aviso is 'Sem uso desde a migration 20261115120000';
comment on column configuracoes.mora_limite_aviso is 'Sem uso desde a migration 20261115120000';

comment on column pagamentos.multa_centavos is 'Multa por atraso cobrada (0 desde a migration 20261115120000: não há mais multa)';
comment on column pagamentos.mora_centavos is 'Juros de atraso cobrados (1% ao dia sobre o valor em aberto, desde a migration 20261115120000)';

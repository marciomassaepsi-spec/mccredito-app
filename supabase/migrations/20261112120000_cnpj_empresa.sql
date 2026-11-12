-- Contrato em nome da empresa: CNPJ da MC Créditos nas Configurações

-- ---------------------------------------------------------------------------
-- CNPJ da empresa (credor do contrato). Só dígitos; vazio = ainda não informado,
-- e o contrato sai com uma linha em branco para preencher à mão.
-- ---------------------------------------------------------------------------
alter table configuracoes
  add column cnpj_empresa text not null default ''
    check (cnpj_empresa ~ '^([0-9]{14})?$');

comment on column configuracoes.cnpj_empresa is 'CNPJ da empresa (credor no contrato), só dígitos; vazio se ainda não informado';
comment on column configuracoes.razao_social is 'Nome completo do responsável, que representa a empresa no contrato';
comment on column configuracoes.documento_empresa is 'CPF (ou CNPJ) do responsável, só dígitos';

-- Quem já tinha digitado um CNPJ no campo "CPF ou CNPJ" não precisa digitar de novo
update configuracoes
   set cnpj_empresa = documento_empresa
 where documento_empresa ~ '^[0-9]{14}$';

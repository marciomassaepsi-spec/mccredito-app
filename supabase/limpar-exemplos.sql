-- Apaga os DADOS DE EXEMPLO carregados por seed.sql (ids que começam com 5eed0000).
-- Dados que você cadastrou pelo app não são tocados.
-- Rode no SQL Editor do Supabase.

begin;

-- Pagamentos normalmente não podem ser apagados; liberamos só durante esta limpeza.
alter table pagamentos disable trigger pagamentos_sem_exclusao;

delete from contatos_cobranca where id::text like '5eed0000-%';
delete from pagamentos where id::text like '5eed0000-%';
delete from parcelas where id::text like '5eed0000-%';
delete from emprestimos where id::text like '5eed0000-%';
delete from clientes where id::text like '5eed0000-%';

alter table pagamentos enable trigger pagamentos_sem_exclusao;

delete from auditoria where registro_id like '5eed0000-%';

commit;

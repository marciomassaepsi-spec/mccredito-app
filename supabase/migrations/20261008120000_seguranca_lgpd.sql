-- Fase 8: ajustes de segurança e direitos do titular (LGPD)

-- ---------------------------------------------------------------------------
-- search_path fixo em todas as funções (alerta "function_search_path_mutable"
-- do Supabase)
-- ---------------------------------------------------------------------------
alter function impedir_exclusao_pagamento() set search_path = public;
alter function proteger_pagamento() set search_path = public;
alter function marcar_atualizado_em() set search_path = public;

-- ---------------------------------------------------------------------------
-- Funções internas: ninguém sem login precisa executá-las
-- ---------------------------------------------------------------------------
revoke execute on function papel_atual() from public, anon;
revoke execute on function eh_membro() from public, anon;
revoke execute on function eh_admin() from public, anon;
grant execute on function papel_atual() to authenticated;
grant execute on function eh_membro() to authenticated;
grant execute on function eh_admin() to authenticated;

revoke execute on function criar_perfil_primeiro_usuario() from public, anon, authenticated;
revoke execute on function registrar_auditoria() from public, anon, authenticated;
revoke execute on function impedir_exclusao_pagamento() from public, anon, authenticated;
revoke execute on function proteger_pagamento() from public, anon, authenticated;
revoke execute on function marcar_atualizado_em() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- LGPD: excluir os dados de um titular
--
-- Sem nenhum empréstimo: o cadastro é apagado.
-- Com empréstimos encerrados: os dados pessoais são apagados (anonimização), e
-- os valores, parcelas e pagamentos ficam, porque a lei permite guardar o que
-- é preciso para cumprir obrigações legais (LGPD, art. 16, I).
-- Com empréstimo ativo: recusa (há uma dívida em andamento).
-- Em todos os casos, os dados pessoais também saem do histórico de alterações.
-- Os arquivos guardados são apagados pelo app logo depois (Storage).
-- ---------------------------------------------------------------------------
alter table clientes alter column cpf drop not null;
alter table clientes add column anonimizado_em timestamptz;

create function excluir_dados_cliente(p_cliente uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emprestimos uuid[];
  v_ativos int;
  v_resultado text;
  v_campos text[] := array['nome', 'cpf', 'whatsapp', 'endereco', 'observacoes', 'foto_documento_path'];
begin
  if not eh_admin() then
    raise exception 'SEM_PERMISSAO: só o dono pode excluir dados de clientes';
  end if;
  if not exists (select 1 from clientes where id = p_cliente) then
    raise exception 'NAO_ENCONTRADO: cliente não existe';
  end if;

  select coalesce(array_agg(id), '{}'),
         count(*) filter (where status = 'ativo')
    into v_emprestimos, v_ativos
    from emprestimos where cliente_id = p_cliente;

  if v_ativos > 0 then
    raise exception 'EMPRESTIMO_ATIVO: o cliente tem empréstimo ativo; quite, renegocie ou cancele antes';
  end if;

  delete from documentos where cliente_id = p_cliente or emprestimo_id = any(v_emprestimos);

  if cardinality(v_emprestimos) = 0 then
    delete from clientes where id = p_cliente;
    v_resultado := 'excluido';
  else
    update contatos_cobranca set observacoes = '' where cliente_id = p_cliente;
    update clientes
       set nome = 'Titular anonimizado',
           cpf = null,
           whatsapp = '',
           endereco = '',
           observacoes = '',
           foto_documento_path = null,
           consentimento_lgpd_em = null,
           anonimizado_em = now()
     where id = p_cliente;
    v_resultado := 'anonimizado';
  end if;

  -- Tira os dados pessoais também das cópias guardadas no histórico
  update auditoria
     set dados_antes = case when dados_antes is null then null else dados_antes - v_campos end,
         dados_depois = case when dados_depois is null then null else dados_depois - v_campos end
   where tabela = 'clientes' and registro_id = p_cliente::text;

  update auditoria
     set dados_antes = case when dados_antes is null then null else dados_antes - 'observacoes' end,
         dados_depois = case when dados_depois is null then null else dados_depois - 'observacoes' end
   where tabela = 'contatos_cobranca'
     and coalesce(dados_depois ->> 'cliente_id', dados_antes ->> 'cliente_id') = p_cliente::text;

  update auditoria
     set dados_antes = case when dados_antes is null then null else dados_antes - array['nome_arquivo', 'caminho'] end,
         dados_depois = case when dados_depois is null then null else dados_depois - array['nome_arquivo', 'caminho'] end
   where tabela = 'documentos'
     and (coalesce(dados_depois ->> 'cliente_id', dados_antes ->> 'cliente_id') = p_cliente::text
          or coalesce(dados_depois ->> 'emprestimo_id', dados_antes ->> 'emprestimo_id') = any(v_emprestimos::text[]));

  return v_resultado;
end;
$$;

revoke all on function excluir_dados_cliente(uuid) from public, anon;
grant execute on function excluir_dados_cliente(uuid) to authenticated;

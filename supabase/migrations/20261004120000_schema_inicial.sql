-- MC Créditos: esquema inicial
-- Valores em dinheiro são sempre bigint em centavos. Taxas ficam em percentual (10 = 10%).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type papel_usuario as enum ('admin', 'operador', 'cobrador');
create type sistema_amortizacao as enum ('price', 'sac', 'simples');
create type periodicidade as enum ('mensal', 'quinzenal', 'semanal');
create type status_emprestimo as enum ('ativo', 'quitado', 'em_atraso', 'renegociado', 'cancelado');
create type status_parcela as enum ('a_vencer', 'paga', 'paga_parcial', 'cancelada');
create type forma_pagamento as enum ('pix', 'dinheiro', 'transferencia', 'outro');
create type tipo_contato as enum ('whatsapp', 'ligacao', 'visita', 'outro');
create type resultado_contato as enum ('prometeu_pagar', 'nao_atendeu', 'negociando', 'pagou', 'recusou', 'outro');
create type tipo_documento as enum ('contrato', 'promissoria', 'documento_cliente', 'comprovante', 'outro');

-- ---------------------------------------------------------------------------
-- Perfis: quem pode entrar no app. Hoje só o dono (admin); a estrutura já
-- aceita operador e cobrador no futuro.
-- ---------------------------------------------------------------------------
create table perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  papel papel_usuario not null default 'admin',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- O primeiro usuário criado no Supabase vira admin automaticamente.
-- Os seguintes não ganham acesso até um admin cadastrar o perfil deles.
create function criar_perfil_primeiro_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.perfis) then
    insert into public.perfis (user_id, nome, papel)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''), 'admin');
  end if;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function criar_perfil_primeiro_usuario();

create function papel_atual() returns papel_usuario
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where user_id = auth.uid() and ativo
$$;

create function eh_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select papel_atual() is not null
$$;

create function eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select papel_atual() = 'admin'
$$;

-- ---------------------------------------------------------------------------
-- Configurações (uma linha só)
-- ---------------------------------------------------------------------------
create table configuracoes (
  id boolean primary key default true check (id),
  nome_empresa text not null default 'MC Créditos',
  documento_empresa text not null default '',
  cidade text not null default '',
  chave_pix text not null default '',
  nome_recebedor_pix text not null default '',
  multa_percentual numeric(6, 3) not null default 2 check (multa_percentual >= 0),
  mora_percentual_mes numeric(6, 3) not null default 1 check (mora_percentual_mes >= 0),
  multa_limite_aviso numeric(6, 3) not null default 2,
  mora_limite_aviso numeric(6, 3) not null default 1,
  cobranca_hora_inicio time not null default '08:00',
  cobranca_hora_fim time not null default '20:00',
  limite_contratos_ativos int not null default 150,
  atualizado_em timestamptz not null default now()
);

insert into configuracoes default values;

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  cpf char(11) not null unique check (cpf ~ '^[0-9]{11}$'),
  whatsapp text not null default '',
  endereco text not null default '',
  observacoes text not null default '',
  foto_documento_path text,
  consentimento_lgpd_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index clientes_nome_idx on clientes using gin (to_tsvector('portuguese', nome));
create index clientes_whatsapp_idx on clientes (whatsapp);

-- ---------------------------------------------------------------------------
-- Empréstimos
-- ---------------------------------------------------------------------------
create table emprestimos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete restrict,
  valor_centavos bigint not null check (valor_centavos > 0),
  taxa_percentual numeric(8, 4) not null check (taxa_percentual >= 0),
  sistema sistema_amortizacao not null,
  qtd_parcelas int not null check (qtd_parcelas between 1 and 360),
  periodicidade periodicidade not null default 'mensal',
  liberado_em date not null,
  primeiro_vencimento date not null check (primeiro_vencimento >= liberado_em),
  status status_emprestimo not null default 'ativo',
  renegociado_de uuid references emprestimos (id) on delete restrict,
  observacoes text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index emprestimos_cliente_idx on emprestimos (cliente_id);
create index emprestimos_status_idx on emprestimos (status);

-- ---------------------------------------------------------------------------
-- Parcelas (cronograma gerado pelo app ao salvar o empréstimo)
-- "Atrasada" e "vence hoje" não são gravados: saem da data de vencimento.
-- ---------------------------------------------------------------------------
create table parcelas (
  id uuid primary key default gen_random_uuid(),
  emprestimo_id uuid not null references emprestimos (id) on delete cascade,
  numero int not null check (numero >= 1),
  vencimento date not null,
  valor_centavos bigint not null check (valor_centavos >= 0),
  juros_centavos bigint not null check (juros_centavos >= 0),
  amortizacao_centavos bigint not null check (amortizacao_centavos >= 0),
  saldo_devedor_centavos bigint not null check (saldo_devedor_centavos >= 0),
  pago_centavos bigint not null default 0 check (pago_centavos >= 0),
  status status_parcela not null default 'a_vencer',
  quitada_em date,
  unique (emprestimo_id, numero)
);

create index parcelas_vencimento_idx on parcelas (vencimento) where status in ('a_vencer', 'paga_parcial');

-- ---------------------------------------------------------------------------
-- Pagamentos: nunca são apagados, só estornados com justificativa
-- ---------------------------------------------------------------------------
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null references parcelas (id) on delete restrict,
  valor_centavos bigint not null check (valor_centavos > 0),
  multa_centavos bigint not null default 0 check (multa_centavos >= 0),
  mora_centavos bigint not null default 0 check (mora_centavos >= 0),
  desconto_centavos bigint not null default 0 check (desconto_centavos >= 0),
  pago_em date not null,
  forma forma_pagamento not null,
  comprovante_path text,
  observacoes text not null default '',
  estornado boolean not null default false,
  estorno_motivo text,
  estornado_em timestamptz,
  registrado_por uuid default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now(),
  check (not estornado or length(trim(coalesce(estorno_motivo, ''))) > 0)
);

create index pagamentos_parcela_idx on pagamentos (parcela_id);

create function impedir_exclusao_pagamento() returns trigger
language plpgsql as $$
begin
  raise exception 'Pagamentos não podem ser apagados. Use o estorno com justificativa.';
end;
$$;

create trigger pagamentos_sem_exclusao
  before delete on pagamentos
  for each row execute function impedir_exclusao_pagamento();

-- Depois de registrado, um pagamento só pode mudar para estornado.
create function proteger_pagamento() returns trigger
language plpgsql as $$
begin
  if old.estornado then
    raise exception 'Este pagamento já foi estornado.';
  end if;
  if (new.parcela_id, new.valor_centavos, new.multa_centavos, new.mora_centavos,
      new.desconto_centavos, new.pago_em, new.forma)
     is distinct from
     (old.parcela_id, old.valor_centavos, old.multa_centavos, old.mora_centavos,
      old.desconto_centavos, old.pago_em, old.forma) then
    raise exception 'Valores de um pagamento não podem ser alterados. Estorne e registre de novo.';
  end if;
  if new.estornado and new.estornado_em is null then
    new.estornado_em := now();
  end if;
  return new;
end;
$$;

create trigger pagamentos_protegidos
  before update on pagamentos
  for each row execute function proteger_pagamento();

-- ---------------------------------------------------------------------------
-- Contatos de cobrança e promessas
-- ---------------------------------------------------------------------------
create table contatos_cobranca (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  parcela_id uuid references parcelas (id) on delete set null,
  tipo tipo_contato not null,
  resultado resultado_contato not null,
  promessa_para date,
  observacoes text not null default '',
  registrado_por uuid default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now()
);

create index contatos_cliente_idx on contatos_cobranca (cliente_id, criado_em desc);
create index contatos_promessa_idx on contatos_cobranca (promessa_para) where promessa_para is not null;

-- ---------------------------------------------------------------------------
-- Documentos (arquivos no bucket privado "documentos")
-- ---------------------------------------------------------------------------
create table documentos (
  id uuid primary key default gen_random_uuid(),
  emprestimo_id uuid references emprestimos (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete cascade,
  tipo tipo_documento not null,
  nome_arquivo text not null,
  caminho text not null unique,
  tamanho_bytes bigint,
  criado_em timestamptz not null default now(),
  check (emprestimo_id is not null or cliente_id is not null)
);

-- ---------------------------------------------------------------------------
-- Modelos de mensagem da régua de cobrança
-- ---------------------------------------------------------------------------
create table modelos_mensagem (
  id uuid primary key default gen_random_uuid(),
  dias_relativos int not null unique, -- -3 = três dias antes do vencimento; 7 = sete dias depois
  titulo text not null,
  texto text not null,
  ativo boolean not null default true
);

insert into modelos_mensagem (dias_relativos, titulo, texto) values
  (-3, 'Lembrete (3 dias antes)',
   'Olá, {{cliente.primeiro_nome}}! Passando para lembrar que a parcela {{parcela.numero}} de {{parcela.total}}, no valor de {{parcela.valor}}, vence em {{parcela.vencimento}}. Chave PIX: {{empresa.pix}}. Obrigado! {{empresa.nome}}'),
  (0, 'Vence hoje',
   'Bom dia, {{cliente.primeiro_nome}}! Hoje vence a parcela {{parcela.numero}} de {{parcela.total}}, no valor de {{parcela.valor}}. Chave PIX: {{empresa.pix}}. Se já pagou, pode desconsiderar. {{empresa.nome}}'),
  (1, '1 dia de atraso',
   'Olá, {{cliente.primeiro_nome}}. Não identificamos o pagamento da parcela {{parcela.numero}}, que venceu ontem. O valor atualizado é {{parcela.valor_atualizado}}. Chave PIX: {{empresa.pix}}. Qualquer dúvida, estou à disposição. {{empresa.nome}}'),
  (7, '7 dias de atraso',
   'Olá, {{cliente.primeiro_nome}}. A parcela {{parcela.numero}} está com {{parcela.dias_atraso}} dias de atraso. Valor atualizado: {{parcela.valor_atualizado}}. Podemos combinar uma data para o pagamento? {{empresa.nome}}'),
  (15, '15 dias de atraso',
   'Olá, {{cliente.primeiro_nome}}. Gostaria de conversar sobre a parcela {{parcela.numero}}, em aberto há {{parcela.dias_atraso}} dias (valor atualizado {{parcela.valor_atualizado}}). Se estiver com dificuldade, podemos ver uma renegociação. {{empresa.nome}}');

-- ---------------------------------------------------------------------------
-- Auditoria: quem criou, alterou ou excluiu o quê, e quando
-- ---------------------------------------------------------------------------
create table auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  acao text not null check (acao in ('criou', 'alterou', 'excluiu')),
  dados_antes jsonb,
  dados_depois jsonb,
  usuario_id uuid,
  feito_em timestamptz not null default now()
);

create index auditoria_registro_idx on auditoria (tabela, registro_id);

create function registrar_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.auditoria (tabela, registro_id, acao, dados_antes, dados_depois, usuario_id)
  values (
    tg_table_name,
    coalesce(depois ->> 'id', depois ->> 'user_id', antes ->> 'id', antes ->> 'user_id'),
    case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'excluiu' end,
    antes,
    depois,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

create function marcar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['clientes', 'emprestimos', 'parcelas', 'pagamentos', 'contatos_cobranca',
                           'documentos', 'modelos_mensagem', 'configuracoes', 'perfis'] loop
    execute format('create trigger %I_auditoria after insert or update or delete on %I
                    for each row execute function registrar_auditoria()', t, t);
  end loop;
  foreach t in array array['clientes', 'emprestimos', 'configuracoes'] loop
    execute format('create trigger %I_atualizado_em before update on %I
                    for each row execute function marcar_atualizado_em()', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: nada é acessível sem login de um membro ativo
-- ---------------------------------------------------------------------------
alter table perfis enable row level security;
alter table configuracoes enable row level security;
alter table clientes enable row level security;
alter table emprestimos enable row level security;
alter table parcelas enable row level security;
alter table pagamentos enable row level security;
alter table contatos_cobranca enable row level security;
alter table documentos enable row level security;
alter table modelos_mensagem enable row level security;
alter table auditoria enable row level security;

create policy "membro vê o próprio perfil; admin vê todos" on perfis
  for select to authenticated using (user_id = auth.uid() or eh_admin());
create policy "admin gerencia perfis" on perfis
  for all to authenticated using (eh_admin()) with check (eh_admin());

create policy "membros leem configurações" on configuracoes
  for select to authenticated using (eh_membro());
create policy "admin altera configurações" on configuracoes
  for update to authenticated using (eh_admin()) with check (eh_admin());

do $$
declare
  t text;
begin
  foreach t in array array['clientes', 'emprestimos', 'parcelas', 'documentos', 'modelos_mensagem'] loop
    execute format('create policy "membros leem" on %I for select to authenticated using (eh_membro())', t);
    execute format('create policy "admin e operador criam" on %I for insert to authenticated
                    with check (papel_atual() in (''admin'', ''operador''))', t);
    execute format('create policy "admin e operador alteram" on %I for update to authenticated
                    using (papel_atual() in (''admin'', ''operador''))
                    with check (papel_atual() in (''admin'', ''operador''))', t);
    execute format('create policy "admin exclui" on %I for delete to authenticated using (eh_admin())', t);
  end loop;
end;
$$;

-- Pagamentos: sem política de exclusão (e o gatilho acima bloqueia de qualquer forma)
create policy "membros leem" on pagamentos for select to authenticated using (eh_membro());
create policy "admin e operador registram" on pagamentos for insert to authenticated
  with check (papel_atual() in ('admin', 'operador'));
create policy "admin e operador estornam" on pagamentos for update to authenticated
  using (papel_atual() in ('admin', 'operador')) with check (papel_atual() in ('admin', 'operador'));

-- Contatos: qualquer membro, inclusive cobrador, registra
create policy "membros leem" on contatos_cobranca for select to authenticated using (eh_membro());
create policy "membros registram" on contatos_cobranca for insert to authenticated with check (eh_membro());
create policy "admin exclui" on contatos_cobranca for delete to authenticated using (eh_admin());

-- Auditoria: só leitura, só admin. As linhas entram pelo gatilho (security definer).
create policy "admin lê auditoria" on auditoria for select to authenticated using (eh_admin());

-- ---------------------------------------------------------------------------
-- Arquivos: bucket privado, acessado só por URL assinada temporária
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']);

create policy "membros leem arquivos" on storage.objects
  for select to authenticated using (bucket_id = 'documentos' and eh_membro());
create policy "admin e operador enviam arquivos" on storage.objects
  for insert to authenticated with check (bucket_id = 'documentos' and papel_atual() in ('admin', 'operador'));
create policy "admin apaga arquivos" on storage.objects
  for delete to authenticated using (bucket_id = 'documentos' and eh_admin());

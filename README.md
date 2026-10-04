# MC Créditos

Aplicativo da MC Créditos para cuidar dos empréstimos pessoais: clientes, parcelas, contratos,
cobrança e calculadora de juros. Funciona no navegador e pode ser instalado no celular como app.

## Andamento

| Fase | O que entrega | Situação |
| ---- | ------------- | -------- |
| 1 | Plano, identidade visual e telas de exemplo | Aprovada |
| 2 | Base: login, layout com o logo, banco de dados e segurança | Pronta |
| 3 | Calculadora de juros (7 modos), com testes | Pronta |
| 4 | Clientes e empréstimos, com parcelas geradas sozinhas; Configurações editáveis | **Pronta** |
| 5 | Pagamentos, quitação, renegociação e contratos (upload e PDF) | Próxima |
| 6 | Cobrança: tela do dia, WhatsApp, PIX, régua e histórico | |
| 7 | Painel, exportação, backup e auditoria | |
| 8 | Revisão de segurança e publicação | |

## Como colocar no ar

Leva uns 15 minutos e é feito uma vez só. Os dois serviços são gratuitos para o tamanho da
MC Créditos (até 150 contratos ativos).

### 1. Criar o banco de dados (Supabase)

1. Crie uma conta em [supabase.com](https://supabase.com) e clique em **New project**.
   - Nome: `mccredito`
   - Senha do banco: crie uma forte e guarde (não é a senha do app).
   - Região: **South America (São Paulo)**.
2. Quando o projeto terminar de criar, abra **SQL Editor** no menu da esquerda.
3. Rode os arquivos da pasta [`supabase/migrations`](supabase/migrations), **um de cada vez e na
   ordem** (a data no começo do nome diz a ordem):
   1. [`20261004120000_schema_inicial.sql`](supabase/migrations/20261004120000_schema_inicial.sql)
   2. [`20261005120000_emprestimos.sql`](supabase/migrations/20261005120000_emprestimos.sql)

   Para cada um: abra aqui no GitHub, copie todo o conteúdo, cole no SQL Editor (em uma aba nova,
   **New query**) e clique em **Run**. Deve aparecer "Success. No rows returned".

   Quando uma fase nova trouxer outro arquivo nessa pasta, rode só o arquivo novo.

### 2. Criar o seu login

1. No Supabase, vá em **Authentication → Users → Add user → Create new user**.
2. Coloque seu e-mail e a senha que vai usar no app. Marque **Auto Confirm User**.
3. **O primeiro usuário criado vira o dono automaticamente**, com acesso total.
4. Depois, em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
   Assim ninguém consegue criar conta sozinho pelo app.

### 3. Pegar as chaves do projeto

Em **Project Settings → API Keys** (ou no botão **Connect** do topo), copie:

- **Project URL** (algo como `https://abcd1234.supabase.co`)
- **Publishable key** (começa com `sb_publishable_`). Se o seu projeto mostrar só a
  `anon key`, ela também funciona.

Essas duas chaves são públicas por natureza: quem protege os dados é o login e as regras de
segurança do banco. **Nunca use a `secret key` ou a `service_role` no app.**

### 4. Publicar o app (Vercel)

1. Crie uma conta em [vercel.com](https://vercel.com) entrando com o seu GitHub.
2. Clique em **Add New → Project** e importe o repositório `mccredito-app`.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = a Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = a publishable key
4. Clique em **Deploy**. No fim, a Vercel mostra o endereço do app (algo como
   `mccredito-app.vercel.app`).

### 5. Preencher os dados da empresa

Entre no app, toque na engrenagem (Configurações) e preencha nome completo, CPF, cidade e a chave
PIX. Eles vão no contrato e nas mensagens de cobrança. A chave de celular pode ser digitada do jeito
que for, ex. `(71) 91234-5678`: o app guarda no formato que o PIX exige.

### 6. Instalar no celular

- **Android (Chrome):** abra o endereço do app, toque nos três pontinhos e em
  **Adicionar à tela inicial**.
- **iPhone (Safari):** abra o endereço, toque em **Compartilhar** e em
  **Adicionar à Tela de Início**.

## Dados de exemplo (opcional)

Para experimentar o app antes de cadastrar clientes de verdade, rode
[`supabase/seed.sql`](supabase/seed.sql) no SQL Editor. Ele cria 20 clientes e 40 empréstimos
fictícios, com parcelas em dia, atrasadas, vencendo hoje e quitadas.

Para apagar tudo depois, rode [`supabase/limpar-exemplos.sql`](supabase/limpar-exemplos.sql).
Ele só apaga os dados de exemplo: o que você cadastrou pelo app fica.

## Dúvidas comuns

**Esqueci a senha.** No Supabase, vá em **Authentication → Users**, clique no seu usuário e use
**Send password recovery** (chega um e-mail) ou defina uma senha nova ali mesmo.

**O app abriu dizendo "Falta conectar o banco de dados".** As variáveis do passo 4 não foram
salvas ou têm algum erro de digitação. Corrija na Vercel em **Settings → Environment Variables**
e faça um novo deploy em **Deployments → Redeploy**.

**Entrei, mas aparece "sem perfil de acesso".** O banco foi criado depois do seu usuário. Rode no
SQL Editor, trocando o e-mail:

```sql
insert into perfis (user_id, papel)
select id, 'admin' from auth.users where email = 'seu@email.com';
```

**O Supabase pausou o projeto.** No plano gratuito, o projeto pausa depois de 7 dias sem nenhum
acesso. Basta abrir o painel do Supabase e clicar em **Restore**. Usando o app toda semana, isso
não acontece.

**Backup.** O plano gratuito não guarda cópias que você possa baixar. Na fase 7 o app ganha um
botão **Fazer backup** que baixa tudo numa planilha. Até lá, dá para exportar cada tabela em
**Table Editor → Export → CSV**.

---

## Para desenvolvedores

Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui · Supabase (Postgres, Auth, Storage) · Vitest.

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev                  # http://localhost:3000
npm test                     # testes unitários
npm run typecheck && npm run lint
```

- `src/app/(app)/` telas que exigem login · `src/app/login/` entrada · `src/proxy.ts` renova a
  sessão e redireciona quem não está logado.
- `src/lib/finance/` cálculos financeiros como funções puras (Price, SAC, juros simples e compostos,
  taxa reversa, CET, multa e mora, quitação antecipada, datas de vencimento), com testes que
  conferem valores calculados à mão em `finance.test.ts`.
- `src/lib/emprestimos.ts` monta o cronograma com datas e calcula situação das parcelas e
  pontualidade. O cronograma é sempre recalculado no servidor e gravado pela função
  `criar_emprestimo`, que confere a soma das amortizações e o limite de contratos numa transação.
- `npm run db:seed:gerar` regenera `supabase/seed.sql` a partir de `scripts/gerar-seed.ts`.
- `src/lib/format.ts` dinheiro (sempre centavos inteiros), datas no fuso `America/Sao_Paulo` e CPF.
- `supabase/migrations/` esquema versionado. Tudo tem Row Level Security: só membros ativos de
  `perfis` leem dados, só admin apaga, pagamentos nunca são apagados (só estornados com motivo) e
  toda alteração vai para `auditoria`.
- `src/lib/supabase/database.types.ts` é gerado do banco com
  `DATABASE_URL=postgresql://... npm run db:types` depois de mudar uma migration.

# MC Créditos

Aplicativo da MC Créditos para cuidar dos empréstimos pessoais: clientes, parcelas, contratos,
cobrança e calculadora de juros. Funciona no navegador e pode ser instalado no celular como app.

## Andamento

| Fase | O que entrega | Situação |
| ---- | ------------- | -------- |
| 1 | Plano, identidade visual e telas de exemplo | Aprovada |
| 2 | Base: login, layout com o logo, banco de dados e segurança | Pronta |
| 3 | Calculadora de juros (7 modos), com testes | Pronta |
| 4 | Clientes e empréstimos, com parcelas geradas sozinhas; Configurações editáveis | Pronta |
| 5 | Pagamentos, quitação, renegociação e contratos (upload e PDF) | Pronta |
| 6 | Cobrança: tela do dia, WhatsApp com mensagem pronta, chave PIX, régua, promessas e visitas | Pronta |
| 7 | Painel, exportação, backup e histórico de alterações | Pronta |
| 8 | Revisão de segurança, direitos do cliente (LGPD) e roteiro de testes | **Pronta** |

Depois de publicar, siga o [roteiro de testes](docs/roteiro-de-testes.md) (uns 20 minutos).

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
   3. [`20261006120000_pagamentos.sql`](supabase/migrations/20261006120000_pagamentos.sql)
   4. [`20261008120000_seguranca_lgpd.sql`](supabase/migrations/20261008120000_seguranca_lgpd.sql)

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

## Cobrança

A aba **Cobrança** abre com quem precisa ser cobrado: promessas que vencem hoje ou não foram cumpridas,
parcelas atrasadas (das mais antigas para as mais novas), as que vencem hoje e as dos próximos 7 dias.
Em cada uma:

- **WhatsApp** abre a conversa com a mensagem pronta para aquele dia de atraso. Os textos ficam em
  **Configurações → Mensagens de cobrança**. Fora do horário de cobrança (padrão: 8h às 20h) o botão
  fica bloqueado.
- **Chave PIX** copia a sua chave para colar onde quiser.
- **Contato** registra o que aconteceu (não atendeu, prometeu pagar em tal dia, negociando...). O
  histórico aparece na ficha do cliente.

**Visitas do dia** lista os clientes atrasados com endereço e abre a rota no Google Maps.

## Contrato

Cada empréstimo tem o botão **Abrir PDF**, que gera o contrato com os dados do cliente, as parcelas
e os seus dados das Configurações. O texto pode ser alterado em **Configurações → Modelo de
contrato**. O modelo que vem pronto é um ponto de partida: **peça para um advogado revisar antes de
usar com clientes**.

## Dados dos clientes (LGPD)

- O cadastro só é salvo com a autorização do cliente marcada.
- Nas listas, o CPF aparece mascarado (`***.982.247-**`); completo só na ficha.
- Na ficha do cliente, em **Dados pessoais (LGPD)**:
  - **Baixar os dados deste cliente** gera um arquivo com tudo o que existe sobre ele, para entregar
    quando ele pedir.
  - **Excluir dados pessoais** apaga nome, CPF, telefone, endereço, observações e arquivos. Se ele
    nunca teve empréstimo, o cadastro some. Se teve, os valores dos empréstimos e pagamentos ficam,
    sem identificação, porque a lei permite guardar o que é necessário para obrigações legais.
    Com empréstimo ativo, não dá para excluir.
- Os dados pessoais também saem do histórico de alterações quando são excluídos.

## Segurança

- Ninguém vê nada sem login. O banco confere quem está pedindo em cada consulta (Row Level
  Security), então mesmo alguém com as chaves públicas do projeto não lê nenhum dado.
- Só o dono apaga registros, cancela empréstimos, exporta dados e vê o histórico.
- Pagamentos não podem ser apagados nem alterados; um erro se corrige com estorno e motivo.
- Contratos, comprovantes e documentos ficam num armazenamento privado e abrem por um link que
  expira em 2 minutos.
- Toda criação, alteração ou exclusão fica registrada em **Configurações → Histórico de alterações**.
- O app não pode ser aberto dentro de outro site e pede aos buscadores para não ser indexado.

## O que o app não faz (por decisão ou para uma próxima etapa)

- **Não envia mensagens sozinho.** O botão de WhatsApp abre a conversa com o texto pronto; quem
  envia é você. Envio automático exige a API paga do WhatsApp Business.
- **Não gera PIX copia-e-cola.** As mensagens usam a chave PIX da conta, como você pediu.
- **Um usuário só.** O banco já está pronto para operador e cobrador, mas ainda não há tela para
  cadastrar outros usuários.
- **Precisa de internet.** Sem conexão, o app não abre.

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

**Saiu uma atualização do app com arquivo de banco novo.** Rode só o arquivo novo da pasta
`supabase/migrations` no SQL Editor, antes ou logo depois de a Vercel publicar a versão nova.

**Backup.** O plano gratuito do Supabase não guarda cópias que você possa baixar. Em
**Configurações → Exportar e backup**, o botão **Baixar backup** gera uma planilha do Excel com
clientes, empréstimos, parcelas, pagamentos e contatos. Faça isso toda semana e guarde o arquivo num
lugar seguro, como o Google Drive. O arquivo tem CPF e endereço dos clientes: não envie para outras
pessoas.

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
- `src/lib/pagamentos.ts` multa e mora na data, divisão do recebimento (encargos primeiro) e plano
  de quitação. As funções `registrar_pagamento`, `estornar_pagamento`, `quitar_emprestimo` e
  `renegociar_emprestimo` gravam tudo numa transação e recalculam parcela e empréstimo.
- `src/lib/contrato.ts` + `contrato-pdf.ts` modelo com `{{variaveis}}` e geração do PDF (pdf-lib).
- Arquivos ficam no bucket privado `documentos`; fotos são reduzidas no navegador antes do envio
  (limite de 4,5 MB da Vercel) e abertas por `/arquivos/...`, que gera um link assinado de 2 minutos.
- `src/lib/painel.ts` indicadores do painel (carteira, atraso por faixa, recebido × previsto por
  mês, juros recebidos). `src/components/app/graficos.tsx` desenha os gráficos em HTML, com legenda,
  dica ao tocar e tabela com os números.
- `/exportar/[tabela]` gera CSV para Excel (`;`, vírgula decimal, BOM) e `/exportar/backup` a
  planilha `.xlsx` (exceljs). Só o dono exporta.
- `src/lib/auditoria.ts` transforma as linhas da tabela `auditoria` em frases para o histórico.
- `src/lib/cobranca.ts` fila de cobrança, escolha da mensagem da régua por dias de atraso, variáveis
  das mensagens e horário de cobrança no fuso de São Paulo.
- Formulários usam `useAcaoSemReset` (`src/components/app/form.tsx`): com `<form action>` o React
  limpa o formulário depois de cada envio, e listas de seleção controladas ficavam com um valor na tela
  e outro no estado.
- `excluir_dados_cliente` (migration de LGPD) apaga ou anonimiza o titular e limpa os dados pessoais
  da auditoria; `/clientes/[id]/dados` exporta os dados do titular em JSON.
- `next.config.ts` define cabeçalhos de segurança; `src/app/robots.ts` bloqueia indexação.
- `npm run db:seed:gerar` regenera `supabase/seed.sql` a partir de `scripts/gerar-seed.ts`.
- `src/lib/format.ts` dinheiro (sempre centavos inteiros), datas no fuso `America/Sao_Paulo` e CPF.
- `supabase/migrations/` esquema versionado. Tudo tem Row Level Security: só membros ativos de
  `perfis` leem dados, só admin apaga, pagamentos nunca são apagados (só estornados com motivo) e
  toda alteração vai para `auditoria`.
- `src/lib/supabase/database.types.ts` é gerado do banco com
  `DATABASE_URL=postgresql://... npm run db:types` depois de mudar uma migration.

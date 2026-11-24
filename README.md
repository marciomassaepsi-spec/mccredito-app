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
| 8 | Revisão de segurança, direitos do cliente (LGPD) e roteiro de testes | Pronta |
| 9 | Contratos de antes do app: parcelas já pagas, valor da parcela e importação por planilha | Pronta |
| 10 | Vendas por mês: quanto foi emprestado e os juros desses contratos, com gráfico e detalhe do mês | Pronta |
| 11 | Renegociar com dinheiro novo: o que falta + o que você manda vira um contrato novo | Pronta |
| 12 | Mudar a data de vencimento sem mexer em valores nem juros | **Pronta** |

Depois de publicar, siga o [roteiro de testes](docs/roteiro-de-testes.md) (uns 20 minutos).

## Como colocar no ar

Leva uns 30 minutos e é feito uma vez só. O Supabase tem plano gratuito que comporta o tamanho da
MC Créditos (até 150 contratos ativos). Na Vercel, o plano gratuito (Hobby) é, pelos termos dela,
para uso pessoal e não comercial; para a empresa, o plano adequado é o Pro (pago). Confira os
termos atuais em vercel.com/pricing antes de escolher.

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
   5. [`20261009120000_contratos_em_andamento.sql`](supabase/migrations/20261009120000_contratos_em_andamento.sql)
   6. [`20261112120000_cnpj_empresa.sql`](supabase/migrations/20261112120000_cnpj_empresa.sql)
   7. [`20261113120000_renegociacao_dinheiro_novo.sql`](supabase/migrations/20261113120000_renegociacao_dinheiro_novo.sql)
   8. [`20261114120000_alterar_vencimento.sql`](supabase/migrations/20261114120000_alterar_vencimento.sql)
   9. [`20261115120000_juros_atraso_dia.sql`](supabase/migrations/20261115120000_juros_atraso_dia.sql)

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
5. Volte ao Supabase, em **Authentication → URL Configuration**, e coloque esse endereço em
   **Site URL**. É para onde vão os links de "esqueci a senha".

### 5. Preencher os dados da empresa

Entre no app, toque na engrenagem (Configurações) e preencha o CNPJ da empresa (opcional), a cidade,
o nome completo e o CPF do responsável e a chave PIX. Eles vão no contrato e nas mensagens de
cobrança. A chave de celular pode ser digitada do jeito
que for, ex. `(71) 91234-5678`: o app guarda no formato que o PIX exige.

### 6. Instalar no celular

- **Android (Chrome):** abra o endereço do app, toque nos três pontinhos e em
  **Adicionar à tela inicial**.
- **iPhone (Safari):** abra o endereço, toque em **Compartilhar** e em
  **Adicionar à Tela de Início**.

## Contratos de antes do app

Para os empréstimos que já estavam rodando quando você começou a usar o app:

- **Um por um:** em **Empréstimos → Novo**, use a data do empréstimo e do 1º vencimento de verdade
  (podem estar no passado), marque **Este empréstimo começou antes do app** e diga quantas parcelas
  já foram pagas. Se você sabe o valor da parcela combinada (ex.: 6x de R$ 344,00) e não a taxa,
  toque em **Sei o valor da parcela**: o app usa exatamente esse valor e calcula a taxa.
- **Vários de uma vez:** em **Empréstimos → Importar contratos de antes do app**, baixe a planilha
  modelo, preencha uma linha por contrato (no Excel ou no Google Planilhas) e envie. O app mostra
  linha por linha o que vai entrar e o que está errado, e só grava quando você confirma. O cliente
  é cadastrado se ainda não existir (achado pelo CPF ou, sem CPF, pelo nome e WhatsApp). Mandar a
  mesma planilha de novo não duplica nada.

As parcelas já pagas entram como recebidas na data do vencimento de cada uma, com a observação
"Paga antes do cadastro no app". Se uma delas foi paga só em parte, registre o resto depois em
**Receber**. O CPF é opcional na planilha; complete na ficha do cliente antes de gerar um contrato
novo para ele.

## Vendas por mês

No **Painel**, o cartão **Vendido em (mês)** abre a tela **Vendas**: quanto você emprestou em cada mês
(pela data em que o dinheiro foi entregue) e quanto de juros esses contratos geram. Mostra o total
do período (6, 12 ou 24 meses), a comparação com o mês anterior, ticket médio, taxa média e um
gráfico com o valor emprestado e os juros de cada mês. Toque num mês para ver os contratos dele,
quanto já foi recebido e quanto rende no total. Os juros são os combinados no contrato, sem os juros
de atraso. Empréstimos cancelados não contam como venda. Uma renegociação só conta o **dinheiro novo** que
você mandou ao cliente, no mês da renegociação, com a parte dos juros do novo contrato que cabe a
ele (juros × dinheiro novo ÷ valor do novo contrato); o saldo antigo já contou no mês do contrato
original. Renegociação sem dinheiro novo fica de fora. No detalhe do mês ela aparece com a etiqueta
**Renegociação** e o valor do dinheiro novo.

## Renegociar com dinheiro novo

No empréstimo, toque em **Renegociar**. Exemplo: o cliente pegou R$ 1.000 em 6x de R$ 250 e já
pagou 4. A tela mostra **Quanto falta: R$ 500,00** (2 parcelas, sem juros de atraso). Em **Dinheiro
novo para o cliente** digite `500,00`: o **valor do novo contrato** fica R$ 1.000,00. Em **Parcelas
novas** digite o valor da parcela (`250,00`) e quantas (`6`); o app mostra a taxa que isso dá
(12,98% ao mês). Se preferir, toque em **Prefiro informar a taxa**. **Revisar renegociação** mostra
tudo antes de salvar, com **O cliente recebe agora: R$ 500,00** em destaque.

- Se alguma parcela estiver atrasada, aparecem os juros de atraso (1% ao dia) até a data da
  renegociação e a caixa **Somar os juros de atraso ao saldo** (desmarcada: o que vale é o que falta
  das parcelas).
- Dinheiro novo pode ser 0: aí é só trocar as parcelas.
- A observação é opcional; o app escreve sozinho "Renegociação: saldo R$ 500,00 + R$ 500,00 novos".
- O contrato antigo fica **Renegociado** (as parcelas em aberto são canceladas; os pagamentos ficam
  no histórico) e o novo mostra "Renegociação de contrato de dd/mm/aaaa: saldo anterior + dinheiro
  novo". No PDF do contrato novo, a cláusula 1 explica que o valor é o saldo anterior somado ao
  dinheiro entregue (variáveis `{{entrega}}` e `{{renegociacao}}`). Se você personalizou o modelo de
  contrato, acrescente essas duas variáveis nele.

## Mudar a data de vencimento

Quando o cliente pede para pagar em outro dia, abra o empréstimo e toque em **Mudar vencimento**.
Só a data muda: valor das parcelas, juros, saldo e pagamentos continuam iguais.

- **Parcela**: já vem a primeira em aberto; dá para escolher outra em aberto.
- **Nova data de vencimento**: por exemplo, de dia 10 para dia 20.
- **Mudar também as parcelas seguintes** (marcada): as parcelas em aberto depois dela passam a seguir
  a nova data, na frequência do contrato (no mensal, o mesmo dia de cada mês; em mês sem esse dia,
  o último dia do mês). Desmarcada, só aquela parcela muda, e a data não pode passar da parcela
  seguinte.
- **O que muda** mostra cada parcela com a data antiga riscada e a nova; depois é só confirmar.
- O app anota nas observações do empréstimo, por exemplo: "Vencimento alterado em 14/11/2026:
  parcelas 3 a 6 de 10/11/2026 para 20/11/2026. Cliente recebe o salário no dia 20."
- Atraso, juros de atraso, cobrança e o PDF do contrato passam a usar as datas novas. Cada parcela
  alterada aparece no **Histórico de alterações** ("Mudou o vencimento da parcela 3").
- A data não pode ser antes da liberação do dinheiro. Parcela paga ou cancelada não muda.

## Atraso: 1% ao dia sobre a parcela

Parcela paga depois do vencimento tem **juros de 1% ao dia** sobre o valor da parcela, em juros
simples, **sem multa e sem teto**. Exemplo: parcela de R$ 250,00 com 10 dias de atraso vale
**R$ 275,00**; com 100 dias, R$ 500,00. Se a parcela já foi paga em parte, os juros correm só sobre o
que falta (pagou R$ 100,00 de R$ 250,00: 10 dias dão R$ 15,00 de juros sobre os R$ 150,00).

- A taxa fica em **Configurações → Atraso e cobrança → Juros por dia de atraso (%)** (padrão 1, de 0
  a 10). Vale para todos os contratos, inclusive os antigos.
- Os juros são calculados na hora, pela data de hoje (ou a data do pagamento): o valor, os juros e a
  amortização gravados em cada parcela nunca mudam.
- Onde aparece valor atrasado, ele já vem com os juros, com o detalhe embaixo ("parcela R$ 250,00 +
  juros R$ 25,00 · 10 dias"): empréstimo, Cobrança, Visitas, Receber, Quitar tudo, Renegociar,
  Painel (valor atrasado, inadimplência e faixas de atraso), Clientes e Empréstimos.
- Em **Receber**, o valor sugerido é o da parcela com os juros. Dá para **Dispensar os juros de
  atraso** daquela vez. O recebimento paga primeiro os juros e o resto abate a parcela.
- No banco, os juros recebidos ficam em `pagamentos.mora_centavos` e `multa_centavos` é 0. Pagamentos
  antigos continuam com a multa e a mora cobradas na época.
- A inadimplência do Painel é o atrasado com juros dividido pela carteira mais os juros de atraso.

## Cobrança

A aba **Cobrança** abre com quem precisa ser cobrado: promessas que vencem hoje ou não foram cumpridas,
parcelas atrasadas (das mais antigas para as mais novas), as que vencem hoje e as dos próximos 7 dias.
Em cada uma:

- **WhatsApp** abre a conversa com a mensagem pronta para aquele dia de atraso. Os textos ficam em
  **Configurações → Mensagens de cobrança**. Numa parcela atrasada, `{{parcela.valor}}` e
  `{{parcela.valor_atualizado}}` já vêm com os juros de atraso; `{{parcela.valor_original}}` é o valor
  sem juros e `{{parcela.juros_atraso}}` só os juros. Fora do horário de cobrança (padrão: 8h às 20h) o botão
  fica bloqueado.
- **Chave PIX** copia a sua chave para colar onde quiser.
- **Contato** registra o que aconteceu (não atendeu, prometeu pagar em tal dia, negociando...). O
  histórico aparece na ficha do cliente.

**Visitas do dia** lista os clientes atrasados com endereço e abre a rota no Google Maps.

## Contrato

Cada empréstimo tem o botão **Abrir PDF**, que gera o contrato com os dados do cliente, as parcelas
e os dados da empresa das Configurações. O texto pode ser alterado em **Configurações → Modelo de
contrato**. O modelo que vem pronto é um ponto de partida: **peça para um advogado revisar antes de
usar com clientes**.

**Credor é a empresa.** No contrato, quem empresta é a MC Créditos (o **Nome da empresa** das
Configurações), com o **CNPJ da empresa**: "MC Créditos, inscrita no CNPJ sob o nº
11.222.333/0001-81, com sede em Salvador - BA, neste ato representada por Fulano de Tal, CPF nº
529.982.247-25". O representante é o **Nome completo do responsável** (e o CPF dele, se for um
CPF); se esse nome ficar vazio, o trecho "neste ato representada por" sai. A assinatura do CREDOR
no PDF também é da empresa, com o CNPJ e o nome de quem representa.

**CNPJ da empresa** (Configurações → Empresa) é opcional. Digite com ou sem pontos: o app confere os
dígitos, guarda só os números e mostra no formato `00.000.000/0000-00`. Enquanto estiver vazio, o
contrato e a assinatura saem com uma linha em branco (`________________________`) no lugar do
número, para escrever à mão depois de imprimir.

No modelo, o credor aparece com `{{empresa.qualificacao}}` (nome, CNPJ, sede e representante). Para
montar o texto do seu jeito há também `{{empresa.nome}}`, `{{empresa.cnpj}}`,
`{{responsavel.nome}}`, `{{responsavel.documento}}` e `{{pix.titular}}`; a lista completa fica
na tela do modelo. Quem tinha salvo o modelo padrão sem mudar nada passa a usar o novo sozinho. Um
modelo **personalizado** não é reescrito: nele, `{{credor.nome}}` e `{{credor.documento}}` agora
trazem o nome e o CNPJ da empresa. Para pegar o texto novo completo, toque em **Voltar para o
modelo padrão** (isso apaga as suas alterações no texto).

**Cláusula 4 (atraso).** O modelo padrão diz: "A parcela paga depois do vencimento terá juros de
{{juros_atraso_dia}} ao dia sobre o valor da parcela em atraso, contados por dia de atraso." A
variável `{{juros_atraso_dia}}` vem da taxa das Configurações (1% ao dia) e não há multa. Quem tinha o
padrão antigo (multa de 2% e mora de 1% ao mês) sem mexer passa a usar o novo sozinho. Num modelo
**personalizado** que ainda usa `{{multa}}` e `{{mora}}`, `{{multa}}` sai como **0%** e `{{mora}}`
como os juros de atraso ao mês (1% ao dia = **30%** ao mês, que é a mesma conta por dia); a tela do
modelo avisa e sugere trocar pela `{{juros_atraso_dia}}`.

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

**Dei baixa num pagamento e o valor do Painel não mudou.** Corrigido nesta versão: o app mostrava
a tela guardada quando você voltava pelo botão "voltar" do celular, e com mais de 1000 parcelas em
aberto o Painel somava só uma parte delas. Agora, depois de qualquer pagamento, estorno, quitação,
renegociação ou mudança de vencimento, todas as telas buscam os valores de novo. Se mesmo assim
algum número parecer errado (uma parcela com pagamento que continua em aberto, ou um empréstimo todo
pago que continua ativo), rode o reparo abaixo.

**Reparo: recalcular parcelas.** O arquivo
[`supabase/reparos/recalcular_parcelas.sql`](supabase/reparos/recalcular_parcelas.sql) refaz o que
foi pago, a situação e a data de quitação de **todas** as parcelas a partir dos pagamentos (os
estornados não contam), e ajusta os empréstimos: ativo sem parcela em aberto vira quitado; quitado
com parcela em aberto volta a ativo. Cancelados e renegociados não mudam, e os pagamentos nunca são
alterados. Para rodar:

1. No Supabase, abra **SQL Editor → New query**.
2. Copie todo o conteúdo do arquivo, cole e clique em **Run**. Leva poucos segundos.
3. Confira o resultado: uma linha com quantas parcelas e empréstimos foram corrigidos, quanto falta
   receber antes e depois, e o total de pagamentos. Não aparece nenhum dado de cliente.

Pode rodar quantas vezes quiser: se estiver tudo certo, o resultado diz "Tudo certo: nada precisou
ser corrigido". Ele roda numa transação só (se der erro, nada é gravado) e cada correção fica no
Histórico de alterações. Não é uma migration: não precisa rodar depois de atualizar o app.

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
  taxa reversa, CET, juros de atraso de 1% ao dia em `atraso.ts`, quitação antecipada, datas de
  vencimento), com testes que
  conferem valores calculados à mão em `finance.test.ts`.
- `src/lib/emprestimos.ts` monta o cronograma com datas e calcula situação das parcelas e
  pontualidade. O cronograma é sempre recalculado no servidor e gravado pela função
  `criar_emprestimo`, que confere a soma das amortizações e o limite de contratos numa transação.
- `src/lib/pagamentos.ts` juros de atraso na data, divisão do recebimento (juros primeiro) e plano
  de quitação. Os juros de atraso vão para `mora_centavos` e `multa_centavos` é 0
  (`colunasJurosAtraso`). As funções `registrar_pagamento`, `estornar_pagamento`, `quitar_emprestimo` e
  `renegociar_emprestimo` gravam tudo numa transação e recalculam parcela e empréstimo.
- `src/lib/renegociacao.ts` saldo em aberto, juros de atraso na data e o novo contrato (saldo +
  juros de atraso, se somados, + dinheiro novo), pela parcela ou pela taxa. `renegociar_emprestimo`
  recalcula o saldo no banco, confere o valor do novo contrato (erro `SALDO_MUDOU` se não bate) e
  grava `emprestimos.dinheiro_novo_centavos` (null quando não é renegociação).
- `src/lib/importacao.ts` lê e confere a planilha de contratos em andamento (títulos com apelidos,
  datas, CPF sem o zero da frente, CSV) e `src/lib/planilha.ts` abre `.xlsx`/CSV e gera o modelo
  (`/importar/modelo`). `importar_contratos` grava cada linha numa subtransação: uma linha com erro
  não desfaz as outras. `criar_emprestimo_em_andamento` cria o empréstimo e dá baixa nas primeiras
  parcelas. Pelo valor da parcela, `montarParcelasPelaParcela` acha a taxa da Price e usa a parcela
  exata em todas, inclusive na última (a sobra do arredondamento fica nos juros dela).
- `src/lib/vendas.ts` agrupa as vendas por mês da liberação (emprestado, juros do contrato,
  recebido, ticket e taxa média ponderada; renegociação conta só o dinheiro novo, em `parteVendida`);
  `src/lib/vendas-dados.ts` faz a consulta; `/vendas` mostra o gráfico de colunas empilhadas
  (`GraficoVendas`) e o detalhe do mês em `?mes=aaaa-mm`.
- `src/lib/contrato.ts` + `contrato-pdf.ts` modelo com `{{variaveis}}` e geração do PDF (pdf-lib).
  O credor é a empresa (`nome_empresa` + `cnpj_empresa`). Ao mudar o `MODELO_PADRAO`, guarde o texto
  anterior em `MODELOS_PADRAO_ANTERIORES`: quem salvou um padrão antigo sem mexer passa a usar o novo.
- Arquivos ficam no bucket privado `documentos`; fotos são reduzidas no navegador antes do envio
  (limite de 4,5 MB da Vercel) e abertas por `/arquivos/...`, que gera um link assinado de 2 minutos.
- Consultas que podem passar de 1000 linhas (Painel e exportação) usam `lerTodas`
  (`src/lib/paginar.ts`), que pede de página em página com ordem estável: o Supabase corta cada
  resposta no "Max rows" da API (1000) sem avisar. Uma consulta que falha mostra o aviso
  `AvisoBanco` em vez de um total pela metade.
- Toda Server Action que muda valores chama `atualizarTelas()` (`src/lib/telas.ts`,
  `revalidatePath("/", "layout")`) antes do `redirect`: sem isso, o botão voltar do celular mostrava
  o Painel guardado no cache do navegador, com o valor de antes do pagamento.
- `supabase/reparos/` scripts de manutenção para rodar à mão no SQL Editor (não são migrations).
- `src/lib/painel.ts` indicadores do painel (carteira, atraso com juros por faixa, recebido × previsto por
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

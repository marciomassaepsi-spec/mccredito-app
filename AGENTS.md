<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Notas do projeto (MC Créditos)

- App de gestão de empréstimos pessoais para um único dono; interface e textos em português do Brasil.
- Dinheiro sempre em centavos inteiros (`bigint` no banco, `number` inteiro no código). Taxas no banco
  em percentual (`9.99`), no código em decimal (`0.0999`).
- Datas como texto `aaaa-mm-dd`; "hoje" sempre no fuso `America/Sao_Paulo` (`hojeISO`).
- Cálculos financeiros são funções puras em `src/lib/finance/` com testes; nunca calcule valores no
  navegador para gravar: as Server Actions recalculam e as funções SQL conferem.
- Escritas que mexem em várias tabelas passam por funções SQL (`criar_emprestimo`,
  `registrar_pagamento`, `quitar_emprestimo`, `renegociar_emprestimo`, `excluir_dados_cliente`).
- Mudança no banco = nova migration em `supabase/migrations/` (nunca editar uma já publicada) +
  `npm run db:types` + atualizar a lista de migrations no README.
- Formulários usam `useAcaoSemReset` (não `<form action>`), para o React não limpar os campos.
- Sem PIX copia-e-cola: o dono pediu para usar só a chave PIX da conta.
- Antes de commitar: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

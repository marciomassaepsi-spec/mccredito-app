"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";

import { Selo } from "@/components/app/selo";
import { Button, buttonVariants } from "@/components/ui/button";

import { importarContratos, lerPlanilha } from "./actions";
import { INICIO_IMPORTACAO, type EstadoImportacao } from "./estado";

/**
 * Importar contratos em andamento: 1) baixar o modelo, 2) mandar a planilha e
 * conferir linha a linha, 3) confirmar. Nada é gravado antes do passo 3.
 */
export function ImportarForm() {
  const [leitura, ler, lendo] = useActionState(lerPlanilha, INICIO_IMPORTACAO);
  const [importacao, importar, importando] = useActionState(importarContratos, INICIO_IMPORTACAO);
  const [nomeArquivo, setNomeArquivo] = useState("");
  // Qual dos dois passos respondeu por último
  const [ultimo, setUltimo] = useState<"ler" | "importar">("ler");

  // A prévia vem sempre da leitura; um erro ao importar aparece em cima dela
  const estado: EstadoImportacao = leitura;
  const erro = ultimo === "importar" ? importacao.erro : leitura.erro;

  function enviar(acao: (dados: FormData) => void, qual: "ler" | "importar") {
    return (evento: FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      const dados = new FormData(evento.currentTarget);
      setUltimo(qual);
      startTransition(() => acao(dados));
    };
  }

  if (importacao.etapa === "concluido" && importacao.resultado) {
    const r = importacao.resultado;
    return (
      <div className="grid gap-4">
        <section role="status" className="grid gap-2 rounded-2xl bg-brand-deep p-5 text-white">
          <p className="text-sm font-bold text-white/75">Importação concluída</p>
          <p className="font-heading text-3xl font-black text-[#f0d45a]">
            {r.criados} {r.criados === 1 ? "contrato importado" : "contratos importados"}
          </p>
          <ul className="grid gap-1 text-sm text-white/90">
            {r.clientesNovos > 0 && <li>{r.clientesNovos} clientes cadastrados.</li>}
            {r.jaExistiam > 0 && <li>{r.jaExistiam} já estavam no app e não foram duplicados.</li>}
            {r.erros.length > 0 && <li>{r.erros.length} não entraram (veja abaixo).</li>}
          </ul>
        </section>

        {r.erros.length > 0 && (
          <ul className="grid gap-2">
            {r.erros.map((e) => (
              <li key={e.linha} className="rounded-xl bg-late-soft px-4 py-3 text-sm text-late">
                <span className="font-bold">
                  Linha {e.linha}
                  {e.nome ? ` · ${e.nome}` : ""}:
                </span>{" "}
                {e.mensagem}
              </li>
            ))}
          </ul>
        )}

        <p className="text-sm text-muted-foreground">
          Clientes que vieram sem CPF ficam sem ele no cadastro: complete na ficha do cliente antes de gerar um contrato
          novo.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/emprestimos" className={buttonVariants({ className: "h-12 text-base font-bold" })}>
            Ver empréstimos
          </Link>
          <Link href="/cobranca" className={buttonVariants({ variant: "outline", className: "h-12 text-base font-bold" })}>
            Ir para a cobrança
          </Link>
        </div>
      </div>
    );
  }

  const prontas = estado.linhas.filter((l) => l.erros.length === 0);
  const comErro = estado.linhas.length - prontas.length;

  return (
    <div className="grid gap-5">
      <ol className="grid gap-3">
        <li className="grid gap-2 rounded-2xl border bg-card p-4">
          <p className="font-extrabold">1. Baixe a planilha modelo</p>
          <p className="text-sm text-muted-foreground">
            Abre no Excel ou no Google Planilhas. A aba “Como preencher” explica cada coluna.
          </p>
          <a href="/importar/modelo" download className={buttonVariants({ variant: "outline", className: "h-12 text-base font-bold" })}>
            <FileSpreadsheet aria-hidden /> Baixar planilha modelo
          </a>
        </li>
        <li className="grid gap-1 rounded-2xl border bg-card p-4">
          <p className="font-extrabold">2. Preencha uma linha por contrato</p>
          <p className="text-sm text-muted-foreground">
            Nome, WhatsApp, valor emprestado, valor da parcela, total de parcelas, quantas já foram pagas e a data do
            empréstimo. O CPF é opcional.
          </p>
        </li>
        <li className="rounded-2xl border bg-card p-4">
          <form onSubmit={enviar(ler, "ler")} className="grid gap-3">
            <p className="font-extrabold">3. Envie a planilha</p>
            <label
              htmlFor="arquivo"
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-background px-3 py-2 focus-within:ring-3 focus-within:ring-ring/40"
            >
              <Upload className="size-5 shrink-0 text-primary" aria-hidden />
              <span className={nomeArquivo ? "min-w-0 truncate font-semibold" : "text-muted-foreground"}>
                {nomeArquivo || "Escolher planilha (.xlsx ou .csv)"}
              </span>
              <input
                id="arquivo"
                name="arquivo"
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="sr-only"
                onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? "")}
              />
            </label>
            <Button type="submit" disabled={lendo || !nomeArquivo} className="h-12 text-base font-bold">
              {lendo ? "Lendo a planilha…" : "Conferir planilha"}
            </Button>
            <p className="text-xs text-muted-foreground">Nada é gravado agora: primeiro você confere.</p>
          </form>
        </li>
      </ol>

      {erro && (
        <p role="alert" className="rounded-xl bg-late-soft px-4 py-3 text-sm font-semibold text-late">
          {erro}
        </p>
      )}

      {estado.etapa === "previa" && (
        <section className="grid gap-3" aria-labelledby="previa-titulo">
          <h2 id="previa-titulo" className="text-lg font-extrabold">
            Confira antes de importar
          </h2>
          <p className="text-sm">
            <span className="font-bold">{prontas.length}</span> {prontas.length === 1 ? "contrato pronto" : "contratos prontos"}
            {comErro > 0 && (
              <>
                {" "}
                · <span className="font-bold text-late">{comErro} com erro</span> (não entram; corrija na planilha e mande de
                novo)
              </>
            )}
          </p>
          {estado.colunasIgnoradas.length > 0 && (
            <p className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
              Colunas que o app não usa e foram deixadas de lado: {estado.colunasIgnoradas.join(", ")}.
            </p>
          )}

          <ul className="grid gap-2">
            {estado.linhas.map((l) => (
              <li key={l.linha} className="grid gap-1.5 rounded-2xl border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-bold break-words">
                    <span className="text-sm font-semibold text-muted-foreground">Linha {l.linha} · </span>
                    {l.nome || "Sem nome"}
                  </p>
                  {l.erros.length > 0 ? <Selo tom="atraso">Com erro</Selo> : <Selo tom="ok">Pronto</Selo>}
                </div>
                {l.resumo && <p className="num text-sm text-muted-foreground">{l.resumo}</p>}
                {l.erros.map((e) => (
                  <p key={e} className="text-sm font-semibold text-late">
                    {e}
                  </p>
                ))}
                {l.avisos.map((a) => (
                  <p key={a} className="text-sm text-gold-ink">
                    {a}
                  </p>
                ))}
              </li>
            ))}
          </ul>

          {prontas.length > 0 && (
            <form onSubmit={enviar(importar, "importar")} className="sticky bottom-20 grid gap-2">
              <input type="hidden" name="dados" value={estado.dados} />
              <Button type="submit" disabled={importando} className="h-12 text-base font-bold shadow-lg">
                {importando
                  ? "Importando…"
                  : `Importar ${prontas.length} ${prontas.length === 1 ? "contrato" : "contratos"}`}
              </Button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

import { FilePlus2, FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Selo } from "@/components/app/selo";
import { buttonVariants } from "@/components/ui/button";
import { resumirParcelas } from "@/lib/emprestimos";
import { formatCentavos, formatData, hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import { cn } from "cn";

export const metadata: Metadata = { title: "Empréstimos" };

const FILTROS = [
  { id: "ativos", rotulo: "Ativos" },
  { id: "atraso", rotulo: "Em atraso" },
  { id: "quitados", rotulo: "Quitados" },
  { id: "cancelados", rotulo: "Cancelados" },
  { id: "todos", rotulo: "Todos" },
] as const;

type Filtro = (typeof FILTROS)[number]["id"];

export default async function EmprestimosPage({ searchParams }: PageProps<"/emprestimos">) {
  const { f } = await searchParams;
  const filtro: Filtro = FILTROS.some((x) => x.id === f) ? (f as Filtro) : "ativos";
  const { supabase } = await requireUser();

  let consulta = supabase
    .from("emprestimos")
    .select(
      "id, valor_centavos, qtd_parcelas, liberado_em, status, clientes(nome), parcelas(numero, vencimento, valor_centavos, pago_centavos, status, quitada_em)",
    )
    .order("liberado_em", { ascending: false })
    .limit(500);
  if (filtro === "ativos" || filtro === "atraso") consulta = consulta.eq("status", "ativo");
  if (filtro === "quitados") consulta = consulta.eq("status", "quitado");
  if (filtro === "cancelados") consulta = consulta.in("status", ["cancelado", "renegociado"]);

  const { data, error } = await consulta;
  const hoje = hojeISO();
  const lista = (data ?? [])
    .map((e) => ({ ...e, resumo: resumirParcelas(e.parcelas, hoje) }))
    .filter((e) => filtro !== "atraso" || e.resumo.atrasadas > 0)
    .sort((a, b) => (filtro === "atraso" ? b.resumo.maiorAtrasoDias - a.resumo.maiorAtrasoDias : 0));

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black italic text-brand-deep">Empréstimos</h1>
        <Link href="/emprestimos/novo" className={buttonVariants({ className: "h-11 px-4 font-bold" })}>
          <FilePlus2 aria-hidden /> Novo
        </Link>
      </div>
      <Link href="/emprestimos/importar" className="-mt-3 flex items-center gap-2 text-sm font-bold text-primary">
        <FileSpreadsheet className="size-4" aria-hidden /> Importar contratos de antes do app (planilha)
      </Link>

      <nav aria-label="Filtrar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {FILTROS.map((x) => (
          <Link
            key={x.id}
            href={x.id === "ativos" ? "/emprestimos" : `/emprestimos?f=${x.id}`}
            aria-current={filtro === x.id ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap",
              filtro === x.id ? "border-gold bg-gold text-[#2b2300]" : "bg-card text-muted-foreground",
            )}
          >
            {x.rotulo}
          </Link>
        ))}
      </nav>

      {error && <p className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">Não foi possível carregar.</p>}
      {!error && lista.length === 0 && (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">
          Nenhum empréstimo aqui.
        </p>
      )}

      <ul className="grid gap-2">
        {lista.map((e) => (
          <li key={e.id}>
            <Link
              href={`/emprestimos/${e.id}`}
              className="grid gap-1 rounded-2xl border bg-card px-4 py-3 outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 font-bold break-words">{e.clientes?.nome}</span>
                {e.status !== "ativo" ? (
                  <Selo tom="neutro">{e.status === "quitado" ? "Quitado" : e.status === "renegociado" ? "Renegociado" : "Cancelado"}</Selo>
                ) : e.resumo.atrasadas > 0 ? (
                  <Selo tom="atraso">{e.resumo.maiorAtrasoDias} dias de atraso</Selo>
                ) : e.resumo.proxima?.situacao === "vence_hoje" ? (
                  <Selo tom="hoje">Vence hoje</Selo>
                ) : (
                  <Selo tom="ok">Em dia</Selo>
                )}
              </div>
              <div className="num flex flex-wrap justify-between gap-x-3 text-sm text-muted-foreground">
                <span>
                  {formatCentavos(e.valor_centavos)} em {e.qtd_parcelas}x · {formatData(e.liberado_em)}
                </span>
                <span>
                  {e.resumo.pagas}/{e.resumo.total} pagas
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

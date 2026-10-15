import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { GraficoVendas } from "@/components/app/graficos";
import { Selo } from "@/components/app/selo";
import { formatCentavos, formatData, formatPercentual, hojeISO } from "@/lib/format";
import { ultimosMeses } from "@/lib/painel";
import { requireUser } from "@/lib/supabase/server";
import { resumir, variacao, vendasPorMes, type EmprestimoVenda } from "@/lib/vendas";
import { cn } from "cn";

export const metadata: Metadata = { title: "Vendas" };

const PERIODOS = [6, 12, 24] as const;
type Periodo = (typeof PERIODOS)[number];

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="grid content-start gap-0.5 rounded-2xl border bg-card p-4">
      <p className="text-sm font-bold text-muted-foreground">{rotulo}</p>
      <p className="font-heading text-[clamp(1.1rem,5.4vw,1.5rem)] font-black whitespace-nowrap">{valor}</p>
      {detalhe && <p className="num text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  const sobe = valor >= 0;
  return (
    <span className={cn("font-bold", sobe ? "text-primary" : "text-late")}>
      {sobe ? "▲" : "▼"} {formatPercentual(Math.abs(valor), 0)}
    </span>
  );
}

export default async function VendasPage({ searchParams }: PageProps<"/vendas">) {
  const q = await searchParams;
  const periodo: Periodo = PERIODOS.find((p) => String(p) === q.periodo) ?? 12;
  const hoje = hojeISO();
  const janela = ultimosMeses(hoje, periodo);
  const inicio = janela[0].inicio;
  const fim = janela[janela.length - 1].fim;

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("emprestimos")
    .select(
      "id, liberado_em, valor_centavos, taxa_percentual, qtd_parcelas, status, renegociado_de, clientes(nome), parcelas(valor_centavos, juros_centavos, pago_centavos)",
    )
    .gte("liberado_em", inicio)
    .lte("liberado_em", fim)
    .neq("status", "cancelado")
    .is("renegociado_de", null)
    .order("liberado_em");

  const emprestimos: EmprestimoVenda[] = data ?? [];
  const meses = vendasPorMes(emprestimos, janela);
  const total = resumir(emprestimos);
  const atual = meses[meses.length - 1];
  const anterior = meses[meses.length - 2];

  const mesEscolhido = meses.find((m) => m.chave === q.mes) ?? null;
  const doMes = mesEscolhido ? emprestimos.filter((e) => e.liberado_em.startsWith(mesEscolhido.chave)) : [];
  const hrefMes = `/vendas?periodo=${periodo}&mes=`;

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href="/" className="text-sm font-bold text-primary">
          ← Painel
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Vendas</h1>
        <p className="text-muted-foreground">Quanto você emprestou em cada mês e quanto de juros esses contratos geram.</p>
      </section>

      <nav aria-label="Período" className="flex gap-2">
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={p === 12 ? "/vendas" : `/vendas?periodo=${p}`}
            aria-current={periodo === p ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap",
              periodo === p ? "border-gold bg-gold text-[#2b2300]" : "bg-card text-muted-foreground",
            )}
          >
            {p} meses
          </Link>
        ))}
      </nav>

      {error && <p className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">Não foi possível carregar as vendas.</p>}

      <section className="rounded-2xl bg-brand-deep p-5 text-white">
        <p className="text-sm font-bold text-white/75">
          Emprestado de {janela[0].rotulo} a {atual.rotulo}
        </p>
        <p className="font-heading text-[clamp(2rem,10.5vw,3rem)] leading-tight font-black whitespace-nowrap">
          {formatCentavos(total.emprestadoCentavos)}
        </p>
        <dl className="num mt-2 grid gap-1 border-t border-white/15 pt-2 text-sm">
          {(
            [
              ["Juros dos contratos", formatCentavos(total.jurosCentavos)],
              ["Total a receber", formatCentavos(total.totalCentavos)],
              ["Contratos", String(total.contratos)],
            ] as const
          ).map(([rotulo, valor]) => (
            <div key={rotulo} className="flex items-baseline justify-between gap-3">
              <dt className="text-white/80">{rotulo}</dt>
              <dd className="font-bold text-[#f0d45a]">{valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Indicador
          rotulo={`Vendido em ${atual.rotulo}`}
          valor={formatCentavos(atual.emprestadoCentavos)}
          detalhe={`${atual.contratos} ${atual.contratos === 1 ? "contrato" : "contratos"}`}
        />
        <div className="grid content-start gap-0.5 rounded-2xl border bg-card p-4">
          <p className="text-sm font-bold text-muted-foreground">Comparado a {anterior.rotulo}</p>
          <p className="font-heading text-[clamp(1.1rem,5.4vw,1.5rem)] font-black whitespace-nowrap">
            {variacao(atual.emprestadoCentavos, anterior.emprestadoCentavos) === null ? (
              "—"
            ) : (
              <Variacao valor={variacao(atual.emprestadoCentavos, anterior.emprestadoCentavos)} />
            )}
          </p>
          <p className="num text-xs text-muted-foreground">{formatCentavos(anterior.emprestadoCentavos)} no mês anterior</p>
        </div>
        <Indicador rotulo="Ticket médio" valor={formatCentavos(total.ticketMedioCentavos)} detalhe="valor por contrato" />
        <Indicador rotulo="Taxa média" valor={`${formatPercentual(total.taxaMedia)}`} detalhe="ao mês, pesada pelo valor" />
      </section>

      {total.contratos === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">
          Nenhuma venda nesse período.
        </p>
      ) : (
        <GraficoVendas
          meses={meses.map((m) => ({ chave: m.chave, rotulo: m.rotulo, emprestado: m.emprestadoCentavos, juros: m.jurosCentavos, contratos: m.contratos }))}
          selecionado={mesEscolhido?.chave ?? null}
          hrefMes={hrefMes}
        />
      )}

      {mesEscolhido && (
        <section id="mes" className="grid scroll-mt-20 gap-3 rounded-2xl border-2 border-primary bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-black">Contratos de {mesEscolhido.rotulo}</h2>
            <Link href={periodo === 12 ? "/vendas" : `/vendas?periodo=${periodo}`} className="text-sm font-bold text-primary">
              Fechar
            </Link>
          </div>
          <dl className="num grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {(
              [
                ["Emprestado", formatCentavos(mesEscolhido.emprestadoCentavos)],
                ["Juros", formatCentavos(mesEscolhido.jurosCentavos)],
                ["Total a receber", formatCentavos(mesEscolhido.totalCentavos)],
                ["Já recebido", formatCentavos(mesEscolhido.recebidoCentavos)],
                ["Ticket médio", formatCentavos(mesEscolhido.ticketMedioCentavos)],
                ["Taxa média", `${formatPercentual(mesEscolhido.taxaMedia)} a.m.`],
              ] as const
            ).map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                <dd className="font-bold">{valor}</dd>
              </div>
            ))}
          </dl>
          {doMes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma venda neste mês.</p>
          ) : (
            <ul className="grid gap-2">
              {doMes.map((e) => {
                const juros = e.parcelas.reduce((s, p) => s + p.juros_centavos, 0);
                const parcela = e.parcelas[0]?.valor_centavos ?? 0;
                return (
                  <li key={e.id}>
                    <Link
                      href={`/emprestimos/${e.id}`}
                      className="grid gap-1 rounded-xl border px-3 py-2.5 outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 font-bold break-words">{e.clientes?.nome}</span>
                        {e.status === "quitado" ? (
                          <Selo tom="ok">Quitado</Selo>
                        ) : e.status === "renegociado" ? (
                          <Selo tom="neutro">Renegociado</Selo>
                        ) : (
                          <Selo tom="neutro">Ativo</Selo>
                        )}
                      </div>
                      <p className="num text-sm text-muted-foreground">
                        {formatData(e.liberado_em)} · {formatCentavos(e.valor_centavos)}{" "}
                        <span className="whitespace-nowrap">
                          em {e.qtd_parcelas}x de {formatCentavos(parcela)}
                        </span>
                      </p>
                      <p className="num text-sm">
                        Juros <b>{formatCentavos(juros)}</b> · {formatPercentual(e.taxa_percentual / 100)} ao mês
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="grid gap-2" aria-labelledby="mes-a-mes">
        <h2 id="mes-a-mes" className="text-lg font-extrabold">
          Mês a mês
        </h2>
        <ul className="grid gap-2">
          {[...meses].reverse().map((m, i, lista) => {
            const antes = lista[i + 1];
            return (
              <li key={m.chave}>
                <Link
                  href={`${hrefMes}${m.chave}#mes`}
                  aria-current={mesEscolhido?.chave === m.chave ? "true" : undefined}
                  className={cn(
                    "grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-2xl border bg-card px-4 py-3 outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                    mesEscolhido?.chave === m.chave && "border-primary",
                  )}
                >
                  <div className="grid min-w-0 gap-0.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-extrabold">{m.rotulo}</span>
                      <span className="num font-heading text-lg font-black">{formatCentavos(m.emprestadoCentavos)}</span>
                    </div>
                    {m.contratos > 0 ? (
                      <p className="num flex flex-wrap justify-between gap-x-3 text-sm text-muted-foreground">
                        <span>
                          {m.contratos} {m.contratos === 1 ? "contrato" : "contratos"} · juros{" "}
                          <b className="text-foreground">{formatCentavos(m.jurosCentavos)}</b>
                        </span>
                        {antes && <Variacao valor={variacao(m.emprestadoCentavos, antes.emprestadoCentavos)} />}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma venda</p>
                    )}
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        Conta pela data em que o dinheiro foi entregue. Os juros são os combinados no contrato, sem multa e mora.
        Empréstimos cancelados e renegociações (que não são dinheiro novo) ficam de fora.
      </p>
    </div>
  );
}

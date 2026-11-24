import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { GraficoVendas } from "@/components/app/graficos";
import { Selo } from "@/components/app/selo";
import { formatCentavos, formatData, formatPercentual, hojeISO } from "@/lib/format";
import { ultimosMeses } from "@/lib/painel";
import { requireUser } from "@/lib/supabase/server";
import { FALTA_ATUALIZAR_BANCO } from "@/lib/acoes";
import { ehVenda, parteVendida, resumir, variacao, vendasPorMes } from "@/lib/vendas";
import { carregarVendas } from "@/lib/vendas-dados";
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
  const { emprestimos: carregados, erro } = await carregarVendas(supabase, inicio, fim);
  const emprestimos = carregados.filter(ehVenda);
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

      {erro && (
        <p role="alert" className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">
          {erro === "banco" ? `${FALTA_ATUALIZAR_BANCO} Até lá, as renegociações com dinheiro novo não aparecem aqui.` : "Não foi possível carregar as vendas."}
        </p>
      )}

      <section className="rounded-2xl bg-brand-deep p-5 text-white">
        <p className="text-sm font-bold text-white/75">
          Emprestado de {janela[0].rotulo} a {atual.rotulo}
        </p>
        <p className="font-heading text-[clamp(2rem,10.5vw,3rem)] leading-tight font-black whitespace-nowrap">
          {formatCentavos(total.emprestadoCentavos)}
        </p>
        <dl className="num mt-2 grid gap-1 border-t border-white/15 pt-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/80">Juros dos contratos</dt>
            <dd className="font-bold text-[#f0d45a]">{formatCentavos(total.jurosCentavos)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/80">Já recebido</dt>
            <dd className="font-bold text-[#f0d45a]">{formatCentavos(total.recebidoCentavos)}</dd>
          </div>
          <div className="-mx-2 my-1 flex items-baseline justify-between gap-3 rounded-xl bg-white/10 px-2 py-1.5">
            <dt className="font-bold text-white">Falta receber</dt>
            <dd className="font-heading text-xl font-black whitespace-nowrap text-[#f0d45a]">{formatCentavos(total.faltaReceberCentavos)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/80">Contratos</dt>
            <dd className="font-bold text-[#f0d45a]">{total.contratos}</dd>
          </div>
        </dl>
        <p className="num mt-2 text-xs text-white/60">
          Falta receber: só o que falta pagar das parcelas em aberto dos contratos ativos, sem juros de atraso; diminui a cada
          baixa. Total dos contratos (emprestado + juros): {formatCentavos(total.totalCentavos)}.
        </p>
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
          <div className="flex items-baseline justify-between gap-3 rounded-xl bg-accent px-3 py-2">
            <p className="text-sm font-bold">Falta receber</p>
            <p className="num font-heading text-xl font-black whitespace-nowrap text-primary">{formatCentavos(mesEscolhido.faltaReceberCentavos)}</p>
          </div>
          <dl className="num grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {(
              [
                ["Emprestado", formatCentavos(mesEscolhido.emprestadoCentavos)],
                ["Juros", formatCentavos(mesEscolhido.jurosCentavos)],
                ["Já recebido", formatCentavos(mesEscolhido.recebidoCentavos)],
                ["Total dos contratos", formatCentavos(mesEscolhido.totalCentavos)],
                ["Ticket médio", formatCentavos(mesEscolhido.ticketMedioCentavos)],
                ["Taxa média", `${formatPercentual(mesEscolhido.taxaMedia)} a.m.`],
              ] as const
            ).map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                <dd className={cn("font-bold", rotulo === "Total dos contratos" && "font-semibold text-muted-foreground")}>{valor}</dd>
              </div>
            ))}
          </dl>
          {doMes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma venda neste mês.</p>
          ) : (
            <ul className="grid gap-2">
              {doMes.map((e) => {
                const parte = parteVendida(e);
                const parcela = e.parcelas[0]?.valor_centavos ?? 0;
                const renegociacao = e.renegociado_de !== null;
                return (
                  <li key={e.id}>
                    <Link
                      href={`/emprestimos/${e.id}`}
                      className="grid gap-1 rounded-xl border px-3 py-2.5 outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 font-bold break-words">{e.clientes?.nome}</span>
                        <span className="flex shrink-0 flex-wrap justify-end gap-1">
                          {renegociacao && <Selo tom="info">Renegociação</Selo>}
                          {e.status === "quitado" ? (
                            <Selo tom="ok">Quitado</Selo>
                          ) : e.status === "renegociado" ? (
                            <Selo tom="neutro">Renegociado</Selo>
                          ) : (
                            <Selo tom="neutro">Ativo</Selo>
                          )}
                        </span>
                      </div>
                      {renegociacao ? (
                        <p className="num text-sm text-muted-foreground">
                          {formatData(e.liberado_em)} · dinheiro novo <b className="text-foreground">{formatCentavos(parte.emprestadoCentavos)}</b>{" "}
                          <span className="whitespace-nowrap">no contrato de {formatCentavos(e.valor_centavos)}</span>{" "}
                          <span className="whitespace-nowrap">
                            em {e.qtd_parcelas}x de {formatCentavos(parcela)}
                          </span>
                        </p>
                      ) : (
                        <p className="num text-sm text-muted-foreground">
                          {formatData(e.liberado_em)} · {formatCentavos(e.valor_centavos)}{" "}
                          <span className="whitespace-nowrap">
                            em {e.qtd_parcelas}x de {formatCentavos(parcela)}
                          </span>
                        </p>
                      )}
                      <p className="num text-sm">
                        Juros <b>{formatCentavos(parte.jurosCentavos)}</b>
                        {renegociacao && " (parte do dinheiro novo)"} · {formatPercentual(e.taxa_percentual / 100)} ao mês
                      </p>
                      {e.status === "ativo" && (
                        <p className="num text-sm">
                          Falta receber <b className="text-primary">{formatCentavos(parte.faltaReceberCentavos)}</b>
                        </p>
                      )}
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
        Conta pela data em que o dinheiro foi entregue. Os juros são os combinados no contrato, sem os juros de atraso.
        Empréstimos cancelados ficam de fora. Numa renegociação, só conta o dinheiro novo que você mandou ao
        cliente, com a parte dos juros do novo contrato que cabe a ele; o saldo antigo já contou no mês do
        contrato original. Renegociação sem dinheiro novo fica de fora. &ldquo;Falta receber&rdquo; é o que ainda falta pagar
        das parcelas em aberto dos contratos ativos, sem juros de atraso: diminui a cada baixa. Contrato quitado não tem
        nada a receber, e o que sobrou de um renegociado é cobrado no contrato novo.
      </p>
    </div>
  );
}

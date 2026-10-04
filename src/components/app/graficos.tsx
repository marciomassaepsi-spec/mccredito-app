"use client";

import { useState } from "react";

import { formatCentavos } from "@/lib/format";
import { marcasEixo } from "@/lib/painel";
import { cn } from "cn";

/** "R$ 12,5 mil" para os eixos, onde o valor completo não cabe */
function compacto(centavos: number) {
  const reais = centavos / 100;
  if (reais >= 1000) return `${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

type Mes = { chave: string; rotulo: string; previsto: number; recebido: number };

const COR_PREVISTO = "var(--gold)";
const COR_RECEBIDO = "var(--primary)";

/**
 * Colunas agrupadas: previsto (dourado) e recebido (verde) por mês.
 * Um eixo só, legenda sempre visível, dica ao passar o dedo ou o mouse em cada
 * mês e a tabela com todos os números logo abaixo.
 */
export function GraficoMensal({ meses }: { meses: Mes[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const maximo = Math.max(...meses.flatMap((m) => [m.previsto, m.recebido]), 0);
  const marcas = marcasEixo(maximo);
  const topo = marcas[marcas.length - 1] || 1;
  const altura = (v: number) => `${(v / topo) * 100}%`;

  return (
    <figure className="grid gap-3 rounded-2xl border bg-card p-4">
      <figcaption className="grid gap-2">
        <h2 className="text-lg font-extrabold">Recebimentos por mês</h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i className="size-3 rounded-[3px]" style={{ background: COR_PREVISTO }} aria-hidden /> Previsto
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-3 rounded-[3px]" style={{ background: COR_RECEBIDO }} aria-hidden /> Recebido
          </span>
        </div>
      </figcaption>

      <div className="relative mt-4 grid grid-cols-[auto_1fr] gap-x-2">
        {/* eixo Y */}
        <div className="num relative h-44 text-right text-[11px] text-muted-foreground" aria-hidden>
          {marcas.map((m) => (
            <span key={m} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ bottom: altura(m) }}>
              {compacto(m)}
            </span>
          ))}
          <span className="invisible block">{compacto(topo)}</span>
        </div>

        <div className="relative h-44">
          {marcas.map((m) => (
            <div key={m} className="absolute inset-x-0 border-t border-border" style={{ bottom: altura(m) }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-stretch">
            {meses.map((m, i) => (
              <div
                key={m.chave}
                tabIndex={0}
                role="img"
                aria-label={`${m.rotulo}: previsto ${formatCentavos(m.previsto)}, recebido ${formatCentavos(m.recebido)}`}
                onPointerEnter={() => setAtivo(i)}
                onPointerLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
                className={cn(
                  "relative flex flex-1 items-end justify-center gap-[2px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  ativo === i && "bg-muted/60",
                )}
              >
                <span className="w-full max-w-[18px] rounded-t-[4px]" style={{ height: altura(m.previsto), background: COR_PREVISTO, minHeight: m.previsto ? 2 : 0 }} />
                <span className="w-full max-w-[18px] rounded-t-[4px]" style={{ height: altura(m.recebido), background: COR_RECEBIDO, minHeight: m.recebido ? 2 : 0 }} />
              </div>
            ))}
          </div>

          {ativo !== null && (
            <div
              role="status"
              className="pointer-events-none absolute -top-2 z-10 min-w-36 rounded-xl border bg-popover px-3 py-2 text-sm shadow-md"
              style={{
                left: `${((ativo + 0.5) / meses.length) * 100}%`,
                transform: `translate(${ativo < meses.length / 2 ? "-20%" : "-80%"}, -100%)`,
              }}
            >
              <p className="text-xs font-bold text-muted-foreground">{meses[ativo].rotulo}</p>
              <p className="flex items-center gap-2 whitespace-nowrap">
                <i className="h-0.5 w-3 rounded" style={{ background: COR_RECEBIDO }} aria-hidden />
                <b className="num">{formatCentavos(meses[ativo].recebido)}</b>
                <span className="text-muted-foreground">recebido</span>
              </p>
              <p className="flex items-center gap-2 whitespace-nowrap">
                <i className="h-0.5 w-3 rounded" style={{ background: COR_PREVISTO }} aria-hidden />
                <b className="num">{formatCentavos(meses[ativo].previsto)}</b>
                <span className="text-muted-foreground">previsto</span>
              </p>
            </div>
          )}
        </div>

        <span aria-hidden />
        <div className="flex pt-1.5 text-[11px] text-muted-foreground" aria-hidden>
          {meses.map((m) => (
            <span key={m.chave} className="flex-1 text-center">
              {m.rotulo}
            </span>
          ))}
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-bold text-primary">Ver os números</summary>
        <table className="num mt-2 w-full">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 text-left font-bold">Mês</th>
              <th className="py-1.5 text-right font-bold">Previsto</th>
              <th className="py-1.5 text-right font-bold">Recebido</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.chave} className="border-b last:border-b-0">
                <td className="py-1.5">{m.rotulo}</td>
                <td className="py-1.5 text-right">{formatCentavos(m.previsto)}</td>
                <td className="py-1.5 text-right font-bold">{formatCentavos(m.recebido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

type Faixa = { rotulo: string; centavos: number; parcelas: number };

/** Barras horizontais, uma série só: quanto está atrasado em cada faixa de dias. */
export function GraficoAtraso({ faixas }: { faixas: Faixa[] }) {
  const maximo = Math.max(...faixas.map((f) => f.centavos), 1);
  const total = faixas.reduce((s, f) => s + f.centavos, 0);
  return (
    <figure className="grid gap-3 rounded-2xl border bg-card p-4">
      <figcaption>
        <h2 className="text-lg font-extrabold">Atrasos por faixa de dias</h2>
        <p className="num text-sm text-muted-foreground">
          {total > 0 ? `${formatCentavos(total)} em atraso, sem multa e mora` : "Nenhuma parcela atrasada."}
        </p>
      </figcaption>
      {total > 0 && (
        <ul className="grid gap-2.5">
          {faixas.map((f) => (
            <li
              key={f.rotulo}
              className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm"
              title={`${f.rotulo}: ${formatCentavos(f.centavos)} em ${f.parcelas} ${f.parcelas === 1 ? "parcela" : "parcelas"}`}
            >
              <span className="text-muted-foreground">{f.rotulo}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-4 rounded-r-[4px] bg-late"
                  style={{ width: `${(f.centavos / maximo) * 72}%`, minWidth: f.centavos ? 2 : 0 }}
                  aria-hidden
                />
                <span className="num shrink-0 font-bold">
                  {formatCentavos(f.centavos)}
                  {f.parcelas > 0 && <span className="font-normal text-muted-foreground"> · {f.parcelas}</span>}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

import type { Periodicidade } from "./tipos";

/** Taxa mensal → anual equivalente (composta). 10% a.m. → 213,84% a.a. */
export function mensalParaAnual(taxaMensal: number): number {
  return (1 + taxaMensal) ** 12 - 1;
}

/** Taxa anual → mensal equivalente (composta). */
export function anualParaMensal(taxaAnual: number): number {
  return (1 + taxaAnual) ** (1 / 12) - 1;
}

/** Quantos períodos de cada tipo cabem em um mês. */
export const PERIODOS_POR_MES: Record<Periodicidade, number> = {
  mensal: 1,
  quinzenal: 2,
  semanal: 52 / 12,
};

/** Converte a taxa mensal para a taxa equivalente de um período (quinzena, semana). */
export function taxaDoPeriodo(taxaMensal: number, periodicidade: Periodicidade): number {
  return (1 + taxaMensal) ** (1 / PERIODOS_POR_MES[periodicidade]) - 1;
}

/** Converte a taxa de um período para a taxa mensal equivalente. */
export function taxaMensalDoPeriodo(taxaPeriodo: number, periodicidade: Periodicidade): number {
  return (1 + taxaPeriodo) ** PERIODOS_POR_MES[periodicidade] - 1;
}

/**
 * Taxa interna de retorno de um fluxo com intervalos iguais.
 * fluxos[0] é o valor liberado (negativo), os demais são as parcelas.
 * Newton-Raphson, com bisseção de reserva se Newton não convergir.
 */
export function taxaInterna(fluxos: number[]): number | null {
  const vpl = (r: number) => fluxos.reduce((s, f, t) => s + f / (1 + r) ** t, 0);
  const derivada = (r: number) => fluxos.reduce((s, f, t) => s - (t * f) / (1 + r) ** (t + 1), 0);

  let r = 0.05;
  for (let i = 0; i < 100; i++) {
    const v = vpl(r);
    const d = derivada(r);
    if (d === 0 || !Number.isFinite(v)) break;
    const proximo = r - v / d;
    if (!Number.isFinite(proximo) || proximo <= -0.99) break;
    if (Math.abs(proximo - r) < 1e-12) return proximo;
    r = proximo;
  }

  // Bisseção entre 0% e 1000% por período
  let baixo = -0.99;
  let alto = 10;
  if (vpl(baixo) * vpl(alto) > 0) return null;
  for (let i = 0; i < 300; i++) {
    const meio = (baixo + alto) / 2;
    if (vpl(baixo) * vpl(meio) <= 0) alto = meio;
    else baixo = meio;
  }
  return (baixo + alto) / 2;
}

/**
 * Descobre a taxa por período quando se sabe o valor emprestado, a parcela fixa
 * e o número de parcelas.
 */
export function descobrirTaxa(
  principalCentavos: number,
  parcelaCentavos: number,
  parcelas: number,
): number | null {
  if (principalCentavos <= 0 || parcelaCentavos <= 0 || parcelas < 1) return null;
  if (parcelaCentavos * parcelas < principalCentavos) return null; // pagaria menos que pegou
  if (parcelaCentavos * parcelas === principalCentavos) return 0;
  return taxaInterna([-principalCentavos, ...Array<number>(parcelas).fill(parcelaCentavos)]);
}

/**
 * CET (custo efetivo total) mensal de um cronograma: a taxa que iguala o valor
 * liberado às parcelas. Sem tarifas, no Price ele é igual à taxa; em juros
 * simples ele fica acima da taxa anunciada.
 */
export function cetMensal(
  valorLiberadoCentavos: number,
  parcelasCentavos: number[],
  periodicidade: Periodicidade = "mensal",
): number | null {
  const porPeriodo = taxaInterna([-valorLiberadoCentavos, ...parcelasCentavos]);
  return porPeriodo === null ? null : taxaMensalDoPeriodo(porPeriodo, periodicidade);
}

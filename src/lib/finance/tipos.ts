/** Uma linha do cronograma. Todos os valores em centavos inteiros. */
export type LinhaCronograma = {
  numero: number;
  valorCentavos: number;
  jurosCentavos: number;
  amortizacaoCentavos: number;
  /** Saldo devedor depois de pagar esta parcela */
  saldoCentavos: number;
};

export type Cronograma = {
  linhas: LinhaCronograma[];
  totalCentavos: number;
  totalJurosCentavos: number;
};

export type Sistema = "price" | "sac" | "simples";

export type Periodicidade = "mensal" | "quinzenal" | "semanal";

/**
 * Arredonda para o centavo mais próximo (meio centavo sobe).
 * A folga de 1e-9 evita que 0,5 representado como 0,4999999… em ponto
 * flutuante arredonde para baixo.
 */
export function arredondar(valor: number): number {
  return Math.round(valor + 1e-9 * Math.sign(valor));
}

export function validarEntrada(principalCentavos: number, taxa: number, parcelas: number) {
  if (!Number.isSafeInteger(principalCentavos) || principalCentavos <= 0) {
    throw new RangeError("O valor emprestado precisa ser maior que zero.");
  }
  if (!Number.isFinite(taxa) || taxa < 0 || taxa > 10) {
    throw new RangeError("A taxa precisa estar entre 0% e 1000%.");
  }
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 360) {
    throw new RangeError("O número de parcelas precisa estar entre 1 e 360.");
  }
}

export function totalizar(linhas: LinhaCronograma[]): Cronograma {
  return {
    linhas,
    totalCentavos: linhas.reduce((s, l) => s + l.valorCentavos, 0),
    totalJurosCentavos: linhas.reduce((s, l) => s + l.jurosCentavos, 0),
  };
}

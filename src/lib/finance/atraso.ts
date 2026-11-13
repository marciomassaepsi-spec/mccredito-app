import { arredondar } from "./tipos";

/**
 * Regra de atraso: juros simples de 1% ao dia (configurável) sobre o valor em
 * aberto da parcela, sem multa fixa e sem teto. Sempre calculados na hora:
 * valor, juros e amortização gravados na parcela nunca mudam.
 */
export const JUROS_ATRASO_DIA_PADRAO_PERCENTUAL = 1;

export type AtualizacaoAtraso = {
  diasAtraso: number;
  /** Valor em aberto da parcela, sem juros de atraso */
  valorOriginalCentavos: number;
  /** Juros de atraso até a data */
  jurosCentavos: number;
  /** Em aberto + juros de atraso */
  totalCentavos: number;
};

const MS_DIA = 24 * 60 * 60 * 1000;

function paraUTC(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Dias corridos entre duas datas "aaaa-mm-dd" (negativo se `ate` vem antes). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUTC(ate) - paraUTC(de)) / MS_DIA);
}

/**
 * Taxa diária de atraso em decimal a partir do percentual gravado nas
 * Configurações (1 = 1% ao dia → 0.01). Sem valor válido, usa o padrão.
 */
export function jurosAtrasoDiario(percentual: number | string | null | undefined): number {
  const n = typeof percentual === "string" ? Number(percentual) : percentual;
  if (n === null || n === undefined || !Number.isFinite(n) || n < 0) return JUROS_ATRASO_DIA_PADRAO_PERCENTUAL / 100;
  return n / 100;
}

/**
 * Atualiza uma parcela atrasada: juros simples de `jurosDiario` por dia de
 * atraso sobre o valor em aberto. Sem multa e sem limite.
 * Ex.: R$ 250,00 com 10 dias a 1% ao dia → R$ 275,00; com 100 dias → R$ 500,00.
 *
 * @param valorCentavos o que falta pagar da parcela (valor − pago)
 * @param jurosDiario decimal (1% ao dia = 0.01)
 */
export function atualizarAtraso(valorCentavos: number, diasAtraso: number, jurosDiario: number): AtualizacaoAtraso {
  if (!Number.isSafeInteger(valorCentavos) || valorCentavos < 0) {
    throw new RangeError("Valor da parcela inválido.");
  }
  if (!Number.isFinite(jurosDiario) || jurosDiario < 0) {
    throw new RangeError("Taxa de juros de atraso inválida.");
  }
  const dias = Math.max(0, Math.floor(diasAtraso));
  const jurosCentavos = dias === 0 ? 0 : arredondar(valorCentavos * jurosDiario * dias);
  return {
    diasAtraso: dias,
    valorOriginalCentavos: valorCentavos,
    jurosCentavos,
    totalCentavos: valorCentavos + jurosCentavos,
  };
}

/** Valor atualizado de uma parcela que venceu em `vencimento`, paga em `pagamento`. */
export function atualizarPorDatas(
  valorCentavos: number,
  vencimento: string,
  pagamento: string,
  jurosDiario: number,
): AtualizacaoAtraso {
  return atualizarAtraso(valorCentavos, diasEntre(vencimento, pagamento), jurosDiario);
}

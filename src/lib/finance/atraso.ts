import { arredondar } from "./tipos";

export type AtualizacaoAtraso = {
  diasAtraso: number;
  valorOriginalCentavos: number;
  multaCentavos: number;
  moraCentavos: number;
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
 * Atualiza uma parcela atrasada: multa fixa sobre o valor (uma vez só) e juros
 * de mora proporcionais aos dias de atraso (mora mensal ÷ 30 por dia).
 *
 * @param multa decimal (2% = 0.02)
 * @param moraMensal decimal (1% ao mês = 0.01)
 */
export function atualizarAtraso(
  valorCentavos: number,
  diasAtraso: number,
  multa: number,
  moraMensal: number,
): AtualizacaoAtraso {
  if (!Number.isSafeInteger(valorCentavos) || valorCentavos < 0) {
    throw new RangeError("Valor da parcela inválido.");
  }
  const dias = Math.max(0, Math.floor(diasAtraso));
  if (dias === 0) {
    return {
      diasAtraso: 0,
      valorOriginalCentavos: valorCentavos,
      multaCentavos: 0,
      moraCentavos: 0,
      totalCentavos: valorCentavos,
    };
  }
  const multaCentavos = arredondar(valorCentavos * multa);
  const moraCentavos = arredondar((valorCentavos * moraMensal * dias) / 30);
  return {
    diasAtraso: dias,
    valorOriginalCentavos: valorCentavos,
    multaCentavos,
    moraCentavos,
    totalCentavos: valorCentavos + multaCentavos + moraCentavos,
  };
}

/** Valor atualizado de uma parcela que venceu em `vencimento`, paga em `pagamento`. */
export function atualizarPorDatas(
  valorCentavos: number,
  vencimento: string,
  pagamento: string,
  multa: number,
  moraMensal: number,
): AtualizacaoAtraso {
  return atualizarAtraso(valorCentavos, diasEntre(vencimento, pagamento), multa, moraMensal);
}

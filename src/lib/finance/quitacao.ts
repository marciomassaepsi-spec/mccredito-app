import { diasEntre } from "./atraso";
import { arredondar } from "./tipos";

export type ParcelaEmAberto = {
  valorCentavos: number;
  vencimento: string;
};

export type Quitacao = {
  valorNominalCentavos: number;
  valorQuitacaoCentavos: number;
  descontoCentavos: number;
};

/**
 * Quitação antecipada com desconto proporcional dos juros futuros: cada parcela
 * que ainda vai vencer é trazida a valor presente pela taxa do contrato, pelos
 * dias que faltam (base de 30 dias por mês). Parcelas já vencidas entram cheias;
 * multa e mora delas são calculadas à parte.
 *
 * @param taxaMensal decimal (10% = 0.1)
 * @param dataQuitacao "aaaa-mm-dd"
 */
export function calcularQuitacao(
  parcelas: ParcelaEmAberto[],
  taxaMensal: number,
  dataQuitacao: string,
): Quitacao {
  let nominal = 0;
  let presente = 0;
  for (const p of parcelas) {
    nominal += p.valorCentavos;
    const dias = diasEntre(dataQuitacao, p.vencimento);
    presente += dias <= 0 ? p.valorCentavos : p.valorCentavos / (1 + taxaMensal) ** (dias / 30);
  }
  const valorQuitacao = arredondar(presente);
  return {
    valorNominalCentavos: nominal,
    valorQuitacaoCentavos: valorQuitacao,
    descontoCentavos: nominal - valorQuitacao,
  };
}

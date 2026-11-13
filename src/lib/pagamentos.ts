import { atualizarAtraso, calcularQuitacao, diasEntre } from "./finance";
import { formatCentavos } from "./format";

export type ParcelaAberta = {
  id: string;
  numero: number;
  vencimento: string;
  valor_centavos: number;
  pago_centavos: number;
};

export type Encargos = {
  /** O que falta pagar da parcela (valor − pago), base dos juros de atraso */
  emAbertoCentavos: number;
  diasAtraso: number;
  /** Juros de atraso até a data (1% ao dia, configurável) */
  jurosCentavos: number;
  /** Em aberto + juros de atraso */
  devidoCentavos: number;
};

/**
 * Quanto a parcela vale na data do pagamento: o que falta pagar mais os juros
 * de atraso por dia, se atrasada. Numa parcela paga em parte, a base é o que falta.
 *
 * @param jurosDiario decimal (1% ao dia = 0.01)
 */
export function encargosNaData(parcela: ParcelaAberta, dataPagamento: string, jurosDiario: number): Encargos {
  const emAberto = Math.max(0, parcela.valor_centavos - parcela.pago_centavos);
  const a = atualizarAtraso(emAberto, diasEntre(parcela.vencimento, dataPagamento), jurosDiario);
  return {
    emAbertoCentavos: emAberto,
    diasAtraso: a.diasAtraso,
    jurosCentavos: a.jurosCentavos,
    devidoCentavos: a.totalCentavos,
  };
}

/**
 * Linha de detalhe de uma parcela atrasada: "parcela R$ 250,00 + juros R$ 25,00 · 10 dias".
 * Paga em parte, a base é o que falta: "falta R$ 150,00 + juros R$ 15,00 · 10 dias".
 */
export function detalheAtraso(a: { valorCentavos: number; jurosCentavos: number; diasAtraso: number; pagoEmParte?: boolean }): string {
  const dias = `${a.diasAtraso} ${a.diasAtraso === 1 ? "dia" : "dias"}`;
  return `${a.pagoEmParte ? "falta" : "parcela"} ${formatCentavos(a.valorCentavos)} + juros ${formatCentavos(a.jurosCentavos)} · ${dias}`;
}

/** "juros de atraso R$ 25,00" (pagamentos antigos podem ter multa e mora separadas). */
export function textoJurosDoPagamento(p: { multa_centavos: number; mora_centavos: number }): string {
  if (p.multa_centavos > 0) return `multa ${formatCentavos(p.multa_centavos)} + mora ${formatCentavos(p.mora_centavos)}`;
  return p.mora_centavos > 0 ? `juros de atraso ${formatCentavos(p.mora_centavos)}` : "";
}

export type Alocacao = { ok: true; valor: number; juros: number; parcial: boolean } | { ok: false; erro: string };

/**
 * Divide o valor recebido: primeiro os juros de atraso (a não ser que sejam
 * dispensados), o restante abate a parcela. Não aceita receber mais do que o devido.
 */
export function alocarRecebimento(recebidoCentavos: number, encargos: Encargos, dispensarJuros: boolean): Alocacao {
  if (!Number.isSafeInteger(recebidoCentavos) || recebidoCentavos <= 0) {
    return { ok: false, erro: "Digite o valor recebido." };
  }
  const juros = dispensarJuros ? 0 : encargos.jurosCentavos;
  const devido = encargos.emAbertoCentavos + juros;
  if (recebidoCentavos > devido) {
    return { ok: false, erro: "O valor recebido é maior do que o devido nesta parcela." };
  }
  if (recebidoCentavos <= juros) {
    return { ok: false, erro: "O valor não cobre nem os juros de atraso. Dispense os juros ou receba mais." };
  }
  const valor = recebidoCentavos - juros;
  return { ok: true, valor, juros, parcial: valor < encargos.emAbertoCentavos };
}

export type ItemQuitacao = {
  parcela_id: string;
  numero: number;
  vencimento: string;
  valor: number;
  diasAtraso: number;
  /** Juros de atraso (0 se a parcela não está atrasada ou se foram dispensados) */
  juros: number;
  desconto: number;
};

export type PlanoQuitacao = {
  itens: ItemQuitacao[];
  emAbertoCentavos: number;
  descontoCentavos: number;
  /** Juros de atraso das parcelas vencidas */
  jurosAtrasoCentavos: number;
  /** O que o cliente paga para quitar */
  totalCentavos: number;
};

/**
 * Quitação antecipada: parcelas vencidas entram com os juros de atraso (a não
 * ser que dispensados); as que ainda vão vencer têm desconto dos juros futuros,
 * pela taxa do contrato, proporcional aos dias que faltam.
 */
export function planoQuitacao(
  parcelas: ParcelaAberta[],
  taxaMensal: number,
  data: string,
  jurosDiario: number,
  dispensarJuros: boolean,
): PlanoQuitacao {
  const itens = [...parcelas]
    .sort((a, b) => a.numero - b.numero)
    .map((p) => {
      const enc = encargosNaData(p, data, jurosDiario);
      const q = calcularQuitacao([{ valorCentavos: enc.emAbertoCentavos, vencimento: p.vencimento }], taxaMensal, data);
      return {
        parcela_id: p.id,
        numero: p.numero,
        vencimento: p.vencimento,
        valor: enc.emAbertoCentavos,
        diasAtraso: enc.diasAtraso,
        juros: dispensarJuros ? 0 : enc.jurosCentavos,
        desconto: q.descontoCentavos,
      };
    });

  const emAberto = itens.reduce((s, i) => s + i.valor, 0);
  const desconto = itens.reduce((s, i) => s + i.desconto, 0);
  const juros = itens.reduce((s, i) => s + i.juros, 0);
  return {
    itens,
    emAbertoCentavos: emAberto,
    descontoCentavos: desconto,
    jurosAtrasoCentavos: juros,
    totalCentavos: emAberto + juros - desconto,
  };
}

/**
 * Como os juros de atraso vão para o banco: tudo em `mora_centavos` e
 * `multa_centavos` = 0 (não existe mais multa). Pagamentos antigos continuam
 * com a multa e a mora que foram cobradas na época.
 */
export function colunasJurosAtraso(juros: number): { multa: number; mora: number } {
  return { multa: 0, mora: juros };
}

/** Recebido de fato num pagamento gravado. */
export function recebidoDoPagamento(p: {
  valor_centavos: number;
  multa_centavos: number;
  mora_centavos: number;
  desconto_centavos: number;
}): number {
  return p.valor_centavos + p.multa_centavos + p.mora_centavos - p.desconto_centavos;
}

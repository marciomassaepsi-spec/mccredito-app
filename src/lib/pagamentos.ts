import { atualizarAtraso, calcularQuitacao, diasEntre } from "./finance";

export type ParcelaAberta = {
  id: string;
  numero: number;
  vencimento: string;
  valor_centavos: number;
  pago_centavos: number;
};

export type Encargos = {
  emAbertoCentavos: number;
  diasAtraso: number;
  multaCentavos: number;
  moraCentavos: number;
  /** Em aberto + multa + mora */
  devidoCentavos: number;
};

/** Quanto a parcela vale na data do pagamento, com multa e mora se atrasada. */
export function encargosNaData(
  parcela: ParcelaAberta,
  dataPagamento: string,
  multa: number,
  moraMensal: number,
): Encargos {
  const emAberto = Math.max(0, parcela.valor_centavos - parcela.pago_centavos);
  const a = atualizarAtraso(emAberto, diasEntre(parcela.vencimento, dataPagamento), multa, moraMensal);
  return {
    emAbertoCentavos: emAberto,
    diasAtraso: a.diasAtraso,
    multaCentavos: a.multaCentavos,
    moraCentavos: a.moraCentavos,
    devidoCentavos: a.totalCentavos,
  };
}

export type Alocacao =
  | { ok: true; valor: number; multa: number; mora: number; parcial: boolean }
  | { ok: false; erro: string };

/**
 * Divide o valor recebido: primeiro multa e mora (a não ser que sejam
 * dispensadas), o restante abate a parcela. Não aceita receber mais do que o devido.
 */
export function alocarRecebimento(recebidoCentavos: number, encargos: Encargos, dispensarEncargos: boolean): Alocacao {
  if (!Number.isSafeInteger(recebidoCentavos) || recebidoCentavos <= 0) {
    return { ok: false, erro: "Digite o valor recebido." };
  }
  const multa = dispensarEncargos ? 0 : encargos.multaCentavos;
  const mora = dispensarEncargos ? 0 : encargos.moraCentavos;
  const devido = encargos.emAbertoCentavos + multa + mora;
  if (recebidoCentavos > devido) {
    return { ok: false, erro: "O valor recebido é maior do que o devido nesta parcela." };
  }
  if (recebidoCentavos <= multa + mora) {
    return { ok: false, erro: "O valor não cobre nem a multa e a mora. Dispense os encargos ou receba mais." };
  }
  const valor = recebidoCentavos - multa - mora;
  return { ok: true, valor, multa, mora, parcial: valor < encargos.emAbertoCentavos };
}

export type ItemQuitacao = {
  parcela_id: string;
  numero: number;
  vencimento: string;
  valor: number;
  multa: number;
  mora: number;
  desconto: number;
};

export type PlanoQuitacao = {
  itens: ItemQuitacao[];
  emAbertoCentavos: number;
  descontoCentavos: number;
  encargosCentavos: number;
  /** O que o cliente paga para quitar */
  totalCentavos: number;
};

/**
 * Quitação antecipada: parcelas vencidas entram com multa e mora (a não ser que
 * dispensadas); as que ainda vão vencer têm desconto dos juros futuros, pela
 * taxa do contrato, proporcional aos dias que faltam.
 */
export function planoQuitacao(
  parcelas: ParcelaAberta[],
  taxaMensal: number,
  data: string,
  multa: number,
  moraMensal: number,
  dispensarEncargos: boolean,
): PlanoQuitacao {
  const itens = [...parcelas]
    .sort((a, b) => a.numero - b.numero)
    .map((p) => {
      const enc = encargosNaData(p, data, multa, moraMensal);
      const q = calcularQuitacao([{ valorCentavos: enc.emAbertoCentavos, vencimento: p.vencimento }], taxaMensal, data);
      return {
        parcela_id: p.id,
        numero: p.numero,
        vencimento: p.vencimento,
        valor: enc.emAbertoCentavos,
        multa: dispensarEncargos ? 0 : enc.multaCentavos,
        mora: dispensarEncargos ? 0 : enc.moraCentavos,
        desconto: q.descontoCentavos,
      };
    });

  const emAberto = itens.reduce((s, i) => s + i.valor, 0);
  const desconto = itens.reduce((s, i) => s + i.desconto, 0);
  const encargos = itens.reduce((s, i) => s + i.multa + i.mora, 0);
  return {
    itens,
    emAbertoCentavos: emAberto,
    descontoCentavos: desconto,
    encargosCentavos: encargos,
    totalCentavos: emAberto + encargos - desconto,
  };
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

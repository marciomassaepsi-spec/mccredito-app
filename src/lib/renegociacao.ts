/**
 * Renegociação com dinheiro novo.
 *
 * O novo contrato vale: o que falta do contrato atual (parcelas a vencer e
 * pagas em parte, sem juros de atraso) + juros de atraso até a data (1% ao dia
 * sobre o que falta de cada parcela vencida), se o dono quiser somar + o dinheiro novo entregue ao cliente agora (pode ser zero).
 *
 * Ex.: R$ 1.000 em 6x de R$ 250, 4 pagas: faltam R$ 500. Com mais R$ 500 para
 * o cliente, o novo contrato é de R$ 1.000, de novo em 6x de R$ 250.
 *
 * A tela usa estas funções para mostrar a conta; a Server Action refaz tudo e a
 * função SQL renegociar_emprestimo confere o saldo.
 */
import { planejarEmprestimo, type ModoCalculo, type ParcelaNova } from "./emprestimos";
import type { Periodicidade, Sistema } from "./finance";
import { formatCentavos } from "./format";
import { encargosNaData, type ParcelaAberta } from "./pagamentos";

export type ParcelaDoContrato = ParcelaAberta & { status: string };

export type SaldoRenegociacao = {
  /** Soma de (valor − pago) das parcelas em aberto, sem juros de atraso */
  saldoCentavos: number;
  parcelasEmAberto: number;
  /** Parcelas vencidas na data da renegociação */
  atrasadas: number;
  /** Juros de atraso das parcelas vencidas até a data */
  encargosCentavos: number;
};

const EM_ABERTO = new Set(["a_vencer", "paga_parcial"]);

/**
 * Quanto falta do contrato atual e quanto dá de juros de atraso na data da renegociação.
 *
 * @param jurosDiario decimal (1% ao dia = 0.01)
 */
export function saldoParaRenegociar(parcelas: ParcelaDoContrato[], data: string, jurosDiario: number): SaldoRenegociacao {
  let saldo = 0;
  let abertas = 0;
  let atrasadas = 0;
  let juros = 0;
  for (const p of parcelas) {
    if (!EM_ABERTO.has(p.status)) continue;
    const e = encargosNaData(p, data, jurosDiario);
    if (e.emAbertoCentavos <= 0) continue;
    abertas++;
    saldo += e.emAbertoCentavos;
    if (e.diasAtraso > 0) atrasadas++;
    juros += e.jurosCentavos;
  }
  return {
    saldoCentavos: saldo,
    parcelasEmAberto: abertas,
    atrasadas,
    encargosCentavos: juros,
  };
}

/** Valor do novo contrato: saldo + (juros de atraso, se somados) + dinheiro novo. */
export function valorDoNovoContrato(saldo: SaldoRenegociacao, somarEncargos: boolean, dinheiroNovoCentavos: number): number {
  return saldo.saldoCentavos + (somarEncargos ? saldo.encargosCentavos : 0) + dinheiroNovoCentavos;
}

export type PedidoRenegociacao = {
  saldo: SaldoRenegociacao;
  somarEncargos: boolean;
  dinheiroNovoCentavos: number;
  modo: ModoCalculo;
  sistema: Sistema;
  taxaMensal: number | null;
  parcelaCentavos: number | null;
  qtdParcelas: number;
  primeiroVencimento: string;
  periodicidade: Periodicidade;
};

export type PlanoRenegociacao = {
  saldoCentavos: number;
  /** Juros de atraso somados ao saldo (0 se não somou) */
  encargosCentavos: number;
  dinheiroNovoCentavos: number;
  valorCentavos: number;
  taxaMensal: number;
  sistema: Sistema;
  parcelas: ParcelaNova[];
  totalCentavos: number;
  jurosCentavos: number;
};

export type ResultadoRenegociacao = { ok: true; plano: PlanoRenegociacao } | { ok: false; campo: string; erro: string };

/** Monta o novo contrato da renegociação, pelo valor da parcela (padrão) ou pela taxa. */
export function planejarRenegociacao(p: PedidoRenegociacao): ResultadoRenegociacao {
  if (p.saldo.parcelasEmAberto === 0) return { ok: false, campo: "geral", erro: "Este empréstimo não tem parcelas em aberto." };
  if (!Number.isSafeInteger(p.dinheiroNovoCentavos) || p.dinheiroNovoCentavos < 0) {
    return { ok: false, campo: "dinheiro_novo", erro: "Digite quanto vai mandar, ex.: 500,00 (ou 0)." };
  }
  const encargos = p.somarEncargos ? p.saldo.encargosCentavos : 0;
  const valor = p.saldo.saldoCentavos + encargos + p.dinheiroNovoCentavos;

  const plano = planejarEmprestimo({
    modo: p.modo,
    sistema: p.sistema,
    valorCentavos: valor,
    taxaMensal: p.taxaMensal,
    parcelaCentavos: p.parcelaCentavos,
    qtdParcelas: p.qtdParcelas,
    primeiroVencimento: p.primeiroVencimento,
    periodicidade: p.periodicidade,
  });
  if (!plano) {
    if (p.modo === "parcela" && p.parcelaCentavos !== null) {
      const total = p.parcelaCentavos * p.qtdParcelas;
      return {
        ok: false,
        campo: "parcela",
        erro:
          total < valor
            ? `A parcela não fecha: ${p.qtdParcelas}x de ${formatCentavos(p.parcelaCentavos)} somam ${formatCentavos(total)}, menos que o novo contrato de ${formatCentavos(valor)}. Aumente a parcela ou o número de parcelas.`
            : "Com essa parcela os juros passam de 1000% ao mês. Confira o valor.",
      };
    }
    return { ok: false, campo: p.modo === "parcela" ? "parcela" : "taxa", erro: p.modo === "parcela" ? "Digite a parcela, ex.: 250,00" : "Digite a taxa, ex.: 9,99" };
  }

  const total = plano.parcelas.reduce((s, x) => s + x.valor_centavos, 0);
  return {
    ok: true,
    plano: {
      saldoCentavos: p.saldo.saldoCentavos,
      encargosCentavos: encargos,
      dinheiroNovoCentavos: p.dinheiroNovoCentavos,
      valorCentavos: valor,
      taxaMensal: plano.taxaMensal,
      sistema: plano.sistema,
      parcelas: plano.parcelas,
      totalCentavos: total,
      jurosCentavos: total - valor,
    },
  };
}

/** Resumo da conta: "saldo R$ 500,00 + R$ 500,00 novos". */
export function detalheRenegociacao(plano: Pick<PlanoRenegociacao, "saldoCentavos" | "encargosCentavos" | "dinheiroNovoCentavos">): string {
  let texto = `saldo ${formatCentavos(plano.saldoCentavos)}`;
  if (plano.encargosCentavos > 0) texto += ` + juros de atraso ${formatCentavos(plano.encargosCentavos)}`;
  texto += plano.dinheiroNovoCentavos > 0 ? ` + ${formatCentavos(plano.dinheiroNovoCentavos)} novos` : ", sem dinheiro novo";
  return texto;
}

/**
 * Observações do novo contrato: "Renegociação: saldo R$ 500,00 + R$ 500,00 novos",
 * seguido do que o dono escreveu, se escreveu.
 */
export function observacaoRenegociacao(
  plano: Pick<PlanoRenegociacao, "saldoCentavos" | "encargosCentavos" | "dinheiroNovoCentavos">,
  escrita = "",
): string {
  const extra = escrita.trim();
  return `Renegociação: ${detalheRenegociacao(plano)}${extra ? `. ${extra}` : ""}`;
}

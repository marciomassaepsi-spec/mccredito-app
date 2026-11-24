/**
 * Vendas por mês: quanto foi emprestado (dinheiro que saiu, pela data de
 * liberação) e quanto de juros esses contratos geram.
 *
 * - Empréstimos cancelados não contam (o dinheiro não saiu, ou voltou).
 * - Renegociação só conta o dinheiro novo entregue ao cliente, no mês da
 *   renegociação, com a parte dos juros do novo contrato que cabe a ele
 *   (juros × dinheiro novo ÷ valor do novo contrato). O saldo antigo que foi
 *   para o novo contrato não conta de novo: o contrato original já contou no
 *   mês em que foi feito. Renegociação sem dinheiro novo fica de fora.
 * - "Juros" são os juros combinados no contrato (soma dos juros das parcelas),
 *   sem juros de atraso, que dependem do atraso e não da venda.
 * - "Falta receber" é o que ainda falta pagar desses contratos: valor − pago das
 *   parcelas em aberto (a vencer ou pagas em parte), sem juros de atraso, e só
 *   dos empréstimos ativos. Quitado não tem nada a receber, e o que sobrou de um
 *   renegociado passou a ser cobrado no contrato novo. Diminui a cada baixa.
 */
import { mesDe } from "./painel";

export type EmprestimoVenda = {
  id: string;
  liberado_em: string;
  valor_centavos: number;
  /** Em percentual, como no banco (9.99) */
  taxa_percentual: number;
  qtd_parcelas: number;
  status: string;
  renegociado_de: string | null;
  /** Renegociação: dinheiro novo entregue ao cliente; null se não é renegociação */
  dinheiro_novo_centavos: number | null;
  clientes: { nome: string } | null;
  parcelas: Array<{ valor_centavos: number; juros_centavos: number; pago_centavos: number; status: string }>;
};

/** Parcelas que ainda têm algo a receber */
const PARCELA_EM_ABERTO = new Set(["a_vencer", "paga_parcial"]);

export type ResumoVendas = {
  contratos: number;
  emprestadoCentavos: number;
  jurosCentavos: number;
  /** emprestado + juros: o total dos contratos (não muda com pagamento) */
  totalCentavos: number;
  /** já recebido desses contratos (parcelas, sem juros de atraso) */
  recebidoCentavos: number;
  /**
   * o que ainda falta receber: valor − pago das parcelas em aberto dos
   * empréstimos ativos, sem juros de atraso. Diminui a cada baixa.
   */
  faltaReceberCentavos: number;
  ticketMedioCentavos: number;
  /** taxa ao mês média, ponderada pelo valor emprestado, em decimal */
  taxaMedia: number;
};

export type MesVendas = ResumoVendas & { chave: string; rotulo: string };

type DadosVenda = Pick<EmprestimoVenda, "valor_centavos" | "taxa_percentual" | "status" | "parcelas" | "renegociado_de" | "dinheiro_novo_centavos">;

type ParteVendida = { emprestadoCentavos: number; jurosCentavos: number; recebidoCentavos: number; faltaReceberCentavos: number };

/** Só o que é venda: sem cancelados, e renegociação só com dinheiro novo. */
export function ehVenda(e: Pick<EmprestimoVenda, "status" | "renegociado_de" | "dinheiro_novo_centavos">): boolean {
  if (e.status === "cancelado") return false;
  return e.renegociado_de === null || (e.dinheiro_novo_centavos ?? 0) > 0;
}

/**
 * O que falta receber do contrato inteiro: valor − pago das parcelas em aberto,
 * sem juros de atraso. Empréstimo que não está ativo (quitado, renegociado,
 * cancelado) não tem nada a receber nele.
 */
export function faltaReceberDoContrato(e: Pick<EmprestimoVenda, "status" | "parcelas">): number {
  if (e.status !== "ativo") return 0;
  return e.parcelas.reduce((s, p) => (PARCELA_EM_ABERTO.has(p.status) ? s + Math.max(0, p.valor_centavos - p.pago_centavos) : s), 0);
}

/**
 * Quanto do contrato é venda. Contrato normal: tudo. Renegociação: só o
 * dinheiro novo, e os juros, o já recebido e o que falta receber na mesma
 * proporção.
 */
export function parteVendida(e: DadosVenda): ParteVendida {
  const juros = e.parcelas.reduce((s, p) => s + p.juros_centavos, 0);
  const recebido = e.parcelas.reduce((s, p) => s + p.pago_centavos, 0);
  const falta = faltaReceberDoContrato(e);
  if (e.renegociado_de === null) {
    return { emprestadoCentavos: e.valor_centavos, jurosCentavos: juros, recebidoCentavos: recebido, faltaReceberCentavos: falta };
  }
  const novo = Math.max(0, Math.min(e.dinheiro_novo_centavos ?? 0, e.valor_centavos));
  // Multiplica antes de dividir, para o arredondamento sair certo nos centavos
  const proporcional = (centavos: number) => (e.valor_centavos > 0 ? Math.round((centavos * novo) / e.valor_centavos) : 0);
  return {
    emprestadoCentavos: novo,
    jurosCentavos: proporcional(juros),
    recebidoCentavos: proporcional(recebido),
    faltaReceberCentavos: proporcional(falta),
  };
}

export function resumir(emprestimos: DadosVenda[]): ResumoVendas {
  let emprestado = 0;
  let juros = 0;
  let recebido = 0;
  let falta = 0;
  let taxaPonderada = 0;
  for (const e of emprestimos) {
    const parte = parteVendida(e);
    emprestado += parte.emprestadoCentavos;
    juros += parte.jurosCentavos;
    recebido += parte.recebidoCentavos;
    falta += parte.faltaReceberCentavos;
    taxaPonderada += (e.taxa_percentual / 100) * parte.emprestadoCentavos;
  }
  return {
    contratos: emprestimos.length,
    emprestadoCentavos: emprestado,
    jurosCentavos: juros,
    totalCentavos: emprestado + juros,
    recebidoCentavos: recebido,
    faltaReceberCentavos: falta,
    ticketMedioCentavos: emprestimos.length ? Math.round(emprestado / emprestimos.length) : 0,
    taxaMedia: emprestado ? taxaPonderada / emprestado : 0,
  };
}

/** Agrupa as vendas pelo mês da liberação, um item por mês da janela (meses sem venda ficam zerados). */
export function vendasPorMes(emprestimos: EmprestimoVenda[], meses: Array<{ chave: string; rotulo: string }>): MesVendas[] {
  const porMes = new Map<string, EmprestimoVenda[]>();
  for (const e of emprestimos) {
    if (!ehVenda(e)) continue;
    const chave = mesDe(e.liberado_em);
    porMes.set(chave, [...(porMes.get(chave) ?? []), e]);
  }
  return meses.map((m) => ({ ...m, ...resumir(porMes.get(m.chave) ?? []) }));
}

/** Variação de um mês para o anterior, em decimal (0,25 = +25%). Null quando não dá para comparar. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return (atual - anterior) / anterior;
}

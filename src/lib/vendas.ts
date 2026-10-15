/**
 * Vendas por mês: quanto foi emprestado (dinheiro que saiu, pela data de
 * liberação) e quanto de juros esses contratos geram.
 *
 * - Empréstimos cancelados não contam (o dinheiro não saiu, ou voltou).
 * - Renegociações não contam: não é dinheiro novo, é a dívida antiga com novo
 *   prazo. O contrato original continua contando no mês em que foi feito.
 * - "Juros" são os juros combinados no contrato (soma dos juros das parcelas),
 *   sem multa e mora, que dependem de atraso e não da venda.
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
  clientes: { nome: string } | null;
  parcelas: Array<{ valor_centavos: number; juros_centavos: number; pago_centavos: number }>;
};

export type ResumoVendas = {
  contratos: number;
  emprestadoCentavos: number;
  jurosCentavos: number;
  /** emprestado + juros: o total que esses contratos rendem se forem pagos em dia */
  totalCentavos: number;
  /** já recebido desses contratos (parcelas, sem multa e mora) */
  recebidoCentavos: number;
  ticketMedioCentavos: number;
  /** taxa ao mês média, ponderada pelo valor emprestado, em decimal */
  taxaMedia: number;
};

export type MesVendas = ResumoVendas & { chave: string; rotulo: string };

/** Só o que é venda: sem cancelados e sem renegociações. */
export function ehVenda(e: Pick<EmprestimoVenda, "status" | "renegociado_de">): boolean {
  return e.status !== "cancelado" && e.renegociado_de === null;
}

export function resumir(emprestimos: Array<Pick<EmprestimoVenda, "valor_centavos" | "taxa_percentual" | "parcelas">>): ResumoVendas {
  let emprestado = 0;
  let juros = 0;
  let recebido = 0;
  let taxaPonderada = 0;
  for (const e of emprestimos) {
    emprestado += e.valor_centavos;
    taxaPonderada += (e.taxa_percentual / 100) * e.valor_centavos;
    for (const p of e.parcelas) {
      juros += p.juros_centavos;
      recebido += p.pago_centavos;
    }
  }
  return {
    contratos: emprestimos.length,
    emprestadoCentavos: emprestado,
    jurosCentavos: juros,
    totalCentavos: emprestado + juros,
    recebidoCentavos: recebido,
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

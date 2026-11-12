import { describe, expect, it } from "vitest";

import { ehVenda, parteVendida, resumir, variacao, vendasPorMes, type EmprestimoVenda } from "./vendas";

function emprestimo(dados: Partial<EmprestimoVenda> & { liberado_em: string; valor_centavos: number; parcela: number; qtd: number }): EmprestimoVenda {
  // Juros do contrato divididos entre as parcelas; a última leva a sobra dos centavos
  const totalJuros = dados.parcela * dados.qtd - dados.valor_centavos;
  const juros = Math.floor(totalJuros / dados.qtd);
  return {
    id: crypto.randomUUID(),
    taxa_percentual: 10,
    qtd_parcelas: dados.qtd,
    status: "ativo",
    renegociado_de: null,
    dinheiro_novo_centavos: null,
    clientes: { nome: "Teste" },
    parcelas: Array.from({ length: dados.qtd }, (_, i) => ({
      valor_centavos: dados.parcela,
      juros_centavos: i === dados.qtd - 1 ? totalJuros - juros * (dados.qtd - 1) : juros,
      pago_centavos: 0,
    })),
    ...dados,
  };
}

const MESES = [
  { chave: "2026-08", rotulo: "ago/26" },
  { chave: "2026-09", rotulo: "set/26" },
  { chave: "2026-10", rotulo: "out/26" },
];

describe("vendas por mês", () => {
  it("soma emprestado e juros pelo mês da liberação, com meses vazios zerados", () => {
    const lista = [
      // R$ 1.000 em 6x de R$ 250: R$ 500 de juros
      emprestimo({ liberado_em: "2026-09-05", valor_centavos: 100000, parcela: 25000, qtd: 6 }),
      // R$ 3.000 em 6x de R$ 750: R$ 1.500 de juros
      emprestimo({ liberado_em: "2026-09-30", valor_centavos: 300000, parcela: 75000, qtd: 6, taxa_percentual: 13 }),
      emprestimo({ liberado_em: "2026-10-13", valor_centavos: 180000, parcela: 48500, qtd: 6 }),
    ];
    const meses = vendasPorMes(lista, MESES);
    expect(meses.map((m) => [m.chave, m.contratos, m.emprestadoCentavos, m.jurosCentavos])).toEqual([
      ["2026-08", 0, 0, 0],
      ["2026-09", 2, 400000, 200000],
      ["2026-10", 1, 180000, 111000],
    ]);
    expect(meses[1].totalCentavos).toBe(600000);
    expect(meses[1].ticketMedioCentavos).toBe(200000);
    // (10% × 1.000 + 13% × 3.000) / 4.000 = 12,25%
    expect(meses[1].taxaMedia).toBeCloseTo(0.1225, 6);
    expect(meses[0].taxaMedia).toBe(0);
  });

  it("cancelados e renegociações sem dinheiro novo não contam como venda", () => {
    const lista = [
      emprestimo({ liberado_em: "2026-10-01", valor_centavos: 100000, parcela: 25000, qtd: 6, status: "cancelado" }),
      emprestimo({ liberado_em: "2026-10-02", valor_centavos: 50000, parcela: 30000, qtd: 2, renegociado_de: "x", dinheiro_novo_centavos: 0 }),
      // Renegociação de antes desta versão (sem a coluna preenchida)
      emprestimo({ liberado_em: "2026-10-02", valor_centavos: 50000, parcela: 30000, qtd: 2, renegociado_de: "y" }),
      emprestimo({ liberado_em: "2026-10-03", valor_centavos: 100000, parcela: 25000, qtd: 6, status: "renegociado" }),
      emprestimo({ liberado_em: "2026-10-04", valor_centavos: 100000, parcela: 25000, qtd: 6, status: "quitado" }),
    ];
    const outubro = vendasPorMes(lista, MESES)[2];
    expect(outubro.contratos).toBe(2);
    expect(outubro.emprestadoCentavos).toBe(200000);
  });

  it("renegociação com dinheiro novo conta só o dinheiro novo, com a parte proporcional dos juros", () => {
    // Exemplo do dono: faltavam R$ 500, mandou mais R$ 500 → novo contrato de R$ 1.000 em 6x de R$ 250
    const renegociacao = emprestimo({
      liberado_em: "2026-11-12",
      valor_centavos: 100000,
      parcela: 25000,
      qtd: 6,
      taxa_percentual: 12.978,
      renegociado_de: "antigo",
      dinheiro_novo_centavos: 50000,
    });
    expect(ehVenda(renegociacao)).toBe(true);
    // Juros do novo contrato: R$ 500; metade deles cabe ao dinheiro novo
    expect(parteVendida(renegociacao)).toEqual({ emprestadoCentavos: 50000, jurosCentavos: 25000, recebidoCentavos: 0 });

    const novembro = vendasPorMes(
      [renegociacao, emprestimo({ liberado_em: "2026-11-03", valor_centavos: 200000, parcela: 50000, qtd: 6 })],
      [{ chave: "2026-11", rotulo: "nov/26" }],
    )[0];
    expect(novembro.contratos).toBe(2);
    expect(novembro.emprestadoCentavos).toBe(250000);
    expect(novembro.jurosCentavos).toBe(25000 + 100000);
    // Taxa média pesada pelo que saiu de dinheiro: (12,978% × 500 + 10% × 2.000) / 2.500
    expect(novembro.taxaMedia).toBeCloseTo((0.12978 * 50000 + 0.1 * 200000) / 250000, 8);
    expect(novembro.ticketMedioCentavos).toBe(125000);
  });

  it("proporção dos juros é arredondada para centavos", () => {
    // R$ 333,33 novos num contrato de R$ 1.000 com R$ 500 de juros → R$ 166,665 → R$ 166,67
    const e = emprestimo({ liberado_em: "2026-11-12", valor_centavos: 100000, parcela: 25000, qtd: 6, renegociado_de: "a", dinheiro_novo_centavos: 33333 });
    expect(parteVendida(e).jurosCentavos).toBe(16667);
    expect(ehVenda({ ...e, status: "cancelado" })).toBe(false);
  });

  it("recebido soma o que já foi pago das parcelas", () => {
    const e = emprestimo({ liberado_em: "2026-10-01", valor_centavos: 100000, parcela: 25000, qtd: 6 });
    e.parcelas[0].pago_centavos = 25000;
    e.parcelas[1].pago_centavos = 10000;
    expect(resumir([e]).recebidoCentavos).toBe(35000);
  });

  it("variação contra o mês anterior", () => {
    expect(variacao(150, 100)).toBeCloseTo(0.5);
    expect(variacao(50, 100)).toBeCloseTo(-0.5);
    expect(variacao(100, 0)).toBeNull();
  });
});

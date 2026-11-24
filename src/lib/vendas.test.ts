import { describe, expect, it } from "vitest";

import { ehVenda, faltaReceberDoContrato, parteVendida, resumir, variacao, vendasPorMes, type EmprestimoVenda } from "./vendas";

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
      status: "a_vencer",
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
    expect(parteVendida(renegociacao)).toEqual({ emprestadoCentavos: 50000, jurosCentavos: 25000, recebidoCentavos: 0, faltaReceberCentavos: 75000 });

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

  describe("falta receber", () => {
    /** Baixa de um pagamento, como recalcular_parcela faz no banco */
    function pagar(e: EmprestimoVenda, i: number, centavos: number) {
      const p = e.parcelas[i];
      p.pago_centavos += centavos;
      p.status = p.pago_centavos >= p.valor_centavos ? "paga" : "paga_parcial";
    }

    it("sem pagamentos é o total do contrato", () => {
      const e = emprestimo({ liberado_em: "2026-10-01", valor_centavos: 100000, parcela: 25000, qtd: 6 });
      const r = resumir([e]);
      expect(r.faltaReceberCentavos).toBe(150000);
      expect(r.totalCentavos).toBe(150000);
    });

    it("cada baixa diminui exatamente o valor pago, e o total dos contratos não muda", () => {
      const e = emprestimo({ liberado_em: "2026-10-01", valor_centavos: 100000, parcela: 25000, qtd: 6 });
      const outro = emprestimo({ liberado_em: "2026-10-09", valor_centavos: 200000, parcela: 50000, qtd: 6 });
      const antes = resumir([e, outro]);

      pagar(e, 0, 25000);
      const depois = resumir([e, outro]);
      expect(antes.faltaReceberCentavos - depois.faltaReceberCentavos).toBe(25000);
      expect(depois.recebidoCentavos - antes.recebidoCentavos).toBe(25000);
      expect(depois.totalCentavos).toBe(antes.totalCentavos);

      // Pagamento parcial: só o que foi pago sai do que falta
      pagar(outro, 0, 12345);
      expect(depois.faltaReceberCentavos - resumir([e, outro]).faltaReceberCentavos).toBe(12345);
      expect(faltaReceberDoContrato(outro)).toBe(300000 - 12345);
    });

    it("parcela paga e parcela cancelada não entram", () => {
      const e = emprestimo({ liberado_em: "2026-10-01", valor_centavos: 100000, parcela: 25000, qtd: 6 });
      e.parcelas[0] = { ...e.parcelas[0], pago_centavos: 25000, status: "paga" };
      e.parcelas[1] = { ...e.parcelas[1], status: "cancelada" };
      expect(faltaReceberDoContrato(e)).toBe(4 * 25000);
    });

    it("empréstimo quitado ou renegociado não tem nada a receber", () => {
      const quitado = emprestimo({ liberado_em: "2026-10-01", valor_centavos: 100000, parcela: 25000, qtd: 6, status: "quitado" });
      // Quitação antecipada com desconto: parcelas ficaram sem o valor cheio pago
      quitado.parcelas[5].pago_centavos = 20000;
      const renegociado = emprestimo({ liberado_em: "2026-10-02", valor_centavos: 100000, parcela: 25000, qtd: 6, status: "renegociado" });
      expect(resumir([quitado]).faltaReceberCentavos).toBe(0);
      expect(resumir([renegociado]).faltaReceberCentavos).toBe(0);
      // Mas continuam contando como venda
      expect(resumir([quitado, renegociado]).contratos).toBe(2);
      expect(resumir([quitado, renegociado]).totalCentavos).toBe(300000);
    });

    it("quitar o último pagamento zera o que falta", () => {
      const e = emprestimo({ liberado_em: "2026-10-01", valor_centavos: 50000, parcela: 30000, qtd: 2 });
      pagar(e, 0, 30000);
      pagar(e, 1, 30000);
      e.status = "quitado";
      expect(resumir([e]).faltaReceberCentavos).toBe(0);
      expect(resumir([e]).recebidoCentavos).toBe(60000);
    });

    it("renegociação com dinheiro novo conta só a parte do dinheiro novo no que falta receber", () => {
      // Novo contrato de R$ 1.000 em 6x de R$ 250 (R$ 1.500); R$ 500 de dinheiro novo = metade
      const e = emprestimo({
        liberado_em: "2026-11-12",
        valor_centavos: 100000,
        parcela: 25000,
        qtd: 6,
        renegociado_de: "antigo",
        dinheiro_novo_centavos: 50000,
      });
      expect(parteVendida(e).faltaReceberCentavos).toBe(75000);
      pagar(e, 0, 25000);
      // Pagou R$ 250 do contrato; metade disso sai do que falta da venda
      expect(parteVendida(e).faltaReceberCentavos).toBe(62500);
      expect(parteVendida(e).recebidoCentavos).toBe(12500);
      // Dinheiro novo de 1/3: R$ 1.250 × 33.333 / 100.000 = R$ 416,66
      const terco = emprestimo({ liberado_em: "2026-11-12", valor_centavos: 100000, parcela: 25000, qtd: 6, renegociado_de: "a", dinheiro_novo_centavos: 33333 });
      pagar(terco, 0, 25000);
      expect(parteVendida(terco).faltaReceberCentavos).toBe(Math.round((125000 * 33333) / 100000));
      expect(resumir([terco]).faltaReceberCentavos).toBe(41666);
    });
  });

  it("variação contra o mês anterior", () => {
    expect(variacao(150, 100)).toBeCloseTo(0.5);
    expect(variacao(50, 100)).toBeCloseTo(-0.5);
    expect(variacao(100, 0)).toBeNull();
  });
});

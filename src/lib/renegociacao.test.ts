import { describe, expect, it } from "vitest";

import { FALTA_ATUALIZAR_BANCO, mensagemDoBanco } from "./acoes";
import { umPeriodoDepois } from "./emprestimos";
import { detalheRenegociacao, observacaoRenegociacao, planejarRenegociacao, saldoParaRenegociar, valorDoNovoContrato, type ParcelaDoContrato } from "./renegociacao";

// R$ 1.000 em 6x de R$ 250, 1º vencimento 20/07/2026; 4 pagas
const VENCIMENTOS = ["2026-07-20", "2026-08-20", "2026-09-20", "2026-10-20", "2026-11-20", "2026-12-20"];
const contrato: ParcelaDoContrato[] = VENCIMENTOS.map((vencimento, i) => ({
  id: `p${i + 1}`,
  numero: i + 1,
  vencimento,
  valor_centavos: 25000,
  pago_centavos: i < 4 ? 25000 : 0,
  status: i < 4 ? "paga" : "a_vencer",
}));

const pedidoBase = {
  somarEncargos: false,
  modo: "parcela" as const,
  sistema: "price" as const,
  taxaMensal: null,
  parcelaCentavos: 25000,
  qtdParcelas: 6,
  primeiroVencimento: "2026-12-12",
  periodicidade: "mensal" as const,
};

describe("renegociação: quanto falta", () => {
  it("soma valor − pago das parcelas em aberto, sem juros de atraso", () => {
    const s = saldoParaRenegociar(contrato, "2026-11-12", 0.01);
    expect(s).toEqual({ saldoCentavos: 50000, parcelasEmAberto: 2, atrasadas: 0, encargosCentavos: 0 });
  });

  it("parcela paga em parte entra só com o que falta; canceladas e pagas ficam de fora", () => {
    const parcelas: ParcelaDoContrato[] = [
      { ...contrato[3], status: "paga_parcial", pago_centavos: 10000 },
      { ...contrato[4], status: "cancelada" },
      contrato[5],
    ];
    const s = saldoParaRenegociar(parcelas, "2026-11-12", 0.01);
    expect(s.saldoCentavos).toBe(15000 + 25000);
    expect(s.parcelasEmAberto).toBe(2);
  });

  it("parcela atrasada: juros de 1% ao dia até a data da renegociação, separados do saldo", () => {
    // 5ª venceu em 20/11; renegociando em 30/11 são 10 dias: R$ 250,00 × 1% × 10 = R$ 25,00
    const s = saldoParaRenegociar(contrato, "2026-11-30", 0.01);
    expect(s.saldoCentavos).toBe(50000);
    expect(s.atrasadas).toBe(1);
    expect(s.encargosCentavos).toBe(2500);
    expect(valorDoNovoContrato(s, false, 50000)).toBe(100000);
    expect(valorDoNovoContrato(s, true, 50000)).toBe(102500);
  });

  it("parcela atrasada paga em parte: juros só sobre o que falta", () => {
    const parcelas: ParcelaDoContrato[] = [{ ...contrato[4], status: "paga_parcial", pago_centavos: 10000 }, contrato[5]];
    // faltam R$ 150,00 da 5ª × 1% × 10 dias = R$ 15,00
    expect(saldoParaRenegociar(parcelas, "2026-11-30", 0.01).encargosCentavos).toBe(1500);
  });
});

describe("renegociação: novo contrato", () => {
  it("exemplo do dono: faltam R$ 500, manda mais R$ 500, novo contrato de R$ 1.000 em 6x de R$ 250", () => {
    const saldo = saldoParaRenegociar(contrato, "2026-11-12", 0.01);
    const r = planejarRenegociacao({ ...pedidoBase, saldo, dinheiroNovoCentavos: 50000 });
    if (!r.ok) throw new Error(r.erro);
    const p = r.plano;
    expect(p.saldoCentavos).toBe(50000);
    expect(p.dinheiroNovoCentavos).toBe(50000);
    expect(p.encargosCentavos).toBe(0);
    expect(p.valorCentavos).toBe(100000);
    expect(p.sistema).toBe("price");
    expect(p.parcelas).toHaveLength(6);
    // Taxa ≈ 12,98% ao mês
    expect(p.taxaMensal).toBeCloseTo(0.12978, 4);
    expect(Math.round(p.taxaMensal * 10000) / 100).toBe(12.98);
    // As 6 parcelas são as R$ 250 combinadas, inclusive a última: total R$ 1.500, juros R$ 500
    expect(p.parcelas.every((x) => x.valor_centavos === 25000)).toBe(true);
    expect(p.totalCentavos).toBe(150000);
    expect(p.jurosCentavos).toBe(50000);
    expect(p.parcelas.reduce((s, x) => s + x.amortizacao_centavos, 0)).toBe(100000);
    expect(p.totalCentavos).toBe(p.parcelas.reduce((s, x) => s + x.valor_centavos, 0));
    expect(p.jurosCentavos).toBe(p.totalCentavos - 100000);
    expect(p.parcelas.map((x) => x.vencimento)).toEqual(["2026-12-12", "2027-01-12", "2027-02-12", "2027-03-12", "2027-04-12", "2027-05-12"]);
    expect(observacaoRenegociacao(p)).toBe("Renegociação: saldo R$ 500,00 + R$ 500,00 novos");
    expect(observacaoRenegociacao(p, " Cliente pediu mais prazo ")).toBe("Renegociação: saldo R$ 500,00 + R$ 500,00 novos. Cliente pediu mais prazo");
    expect(detalheRenegociacao(p)).toBe("saldo R$ 500,00 + R$ 500,00 novos");
  });

  it("sem dinheiro novo e com os juros de atraso somados", () => {
    const saldo = saldoParaRenegociar(contrato, "2026-11-30", 0.01);
    const r = planejarRenegociacao({ ...pedidoBase, saldo, somarEncargos: true, dinheiroNovoCentavos: 0, parcelaCentavos: 15000, qtdParcelas: 4 });
    if (!r.ok) throw new Error(r.erro);
    expect(r.plano.valorCentavos).toBe(52500);
    expect(r.plano.encargosCentavos).toBe(2500);
    expect(observacaoRenegociacao(r.plano)).toBe("Renegociação: saldo R$ 500,00 + juros de atraso R$ 25,00, sem dinheiro novo");
  });

  it("pela taxa, com o sistema escolhido", () => {
    const saldo = saldoParaRenegociar(contrato, "2026-11-12", 0.01);
    const r = planejarRenegociacao({ ...pedidoBase, saldo, dinheiroNovoCentavos: 50000, modo: "taxa", taxaMensal: 0.1, parcelaCentavos: null, sistema: "sac" });
    if (!r.ok) throw new Error(r.erro);
    expect(r.plano.taxaMensal).toBe(0.1);
    expect(r.plano.sistema).toBe("sac");
    expect(r.plano.parcelas[0].valor_centavos).toBeGreaterThan(r.plano.parcelas[5].valor_centavos);
  });

  it("parcela que não fecha com o valor do contrato dá um erro claro", () => {
    const saldo = saldoParaRenegociar(contrato, "2026-11-12", 0.01);
    const r = planejarRenegociacao({ ...pedidoBase, saldo, dinheiroNovoCentavos: 50000, parcelaCentavos: 15000 });
    expect(r).toEqual({
      ok: false,
      campo: "parcela",
      erro: "A parcela não fecha: 6x de R$ 150,00 somam R$ 900,00, menos que o novo contrato de R$ 1.000,00. Aumente a parcela ou o número de parcelas.",
    });
  });

  it("recusa dinheiro novo negativo e contrato sem parcelas em aberto", () => {
    const saldo = saldoParaRenegociar(contrato, "2026-11-12", 0.01);
    expect(planejarRenegociacao({ ...pedidoBase, saldo, dinheiroNovoCentavos: -1 })).toMatchObject({ ok: false, campo: "dinheiro_novo" });
    const quitado = saldoParaRenegociar(contrato.slice(0, 4), "2026-11-12", 0.01);
    expect(planejarRenegociacao({ ...pedidoBase, saldo: quitado, dinheiroNovoCentavos: 0 })).toMatchObject({ ok: false, campo: "geral" });
  });

  it("1º vencimento sugerido: um período depois da data", () => {
    expect(umPeriodoDepois("2026-11-12", "mensal")).toBe("2026-12-12");
    expect(umPeriodoDepois("2026-01-31", "mensal")).toBe("2026-02-28");
    expect(umPeriodoDepois("2026-11-12", "quinzenal")).toBe("2026-11-27");
    expect(umPeriodoDepois("2026-11-12", "semanal")).toBe("2026-11-19");
  });
});

describe("renegociação: erros do banco", () => {
  it("traduz os erros da função SQL e mantém o aviso de banco desatualizado", () => {
    expect(mensagemDoBanco({ message: "SALDO_MUDOU: saldo em aberto 50000 ..." })).toMatch(/^O saldo do empréstimo mudou/);
    expect(mensagemDoBanco({ message: "EMPRESTIMO_INATIVO: só dá para renegociar empréstimo ativo" })).toBe("Este empréstimo não está mais ativo.");
    expect(mensagemDoBanco({ message: "DATA_INVALIDA: ..." })).toMatch(/data da renegociação/);
    expect(mensagemDoBanco({ code: "PGRST202", message: "Could not find the function public.renegociar_emprestimo" })).toBe(FALTA_ATUALIZAR_BANCO);
    expect(mensagemDoBanco({ code: "42703", message: "column emprestimos.dinheiro_novo_centavos does not exist" })).toBe(FALTA_ATUALIZAR_BANCO);
  });
});

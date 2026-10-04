import { describe, expect, it } from "vitest";

import { calcularIndicadores, jurosDoPagamento, marcasEixo, ultimosMeses } from "./painel";

describe("meses", () => {
  it("últimos 6 meses até o atual, atravessando o ano", () => {
    const m = ultimosMeses("2026-02-15", 6);
    expect(m.map((x) => x.chave)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(m.at(-1)).toMatchObject({ rotulo: "fev/26", inicio: "2026-02-01", fim: "2026-02-28" });
  });
});

describe("juros recebidos", () => {
  it("parte de juros proporcional + multa + mora − desconto", () => {
    // parcela de 229,61 com 100,00 de juros, paga inteira com 4,59 de multa e 0,77 de mora
    expect(
      jurosDoPagamento({
        pago_em: "2026-10-05",
        valor_centavos: 22961,
        multa_centavos: 459,
        mora_centavos: 77,
        desconto_centavos: 0,
        parcelas: { valor_centavos: 22961, juros_centavos: 10000 },
      }),
    ).toBe(10000 + 459 + 77);
    // pagamento parcial de metade: metade dos juros
    expect(
      jurosDoPagamento({
        pago_em: "2026-10-05",
        valor_centavos: 11480,
        multa_centavos: 0,
        mora_centavos: 0,
        desconto_centavos: 0,
        parcelas: { valor_centavos: 22961, juros_centavos: 10000 },
      }),
    ).toBe(5000);
  });
});

describe("indicadores do painel", () => {
  const hoje = "2026-10-05";
  const ind = calcularIndicadores({
    hoje,
    abertas: [
      { vencimento: "2026-10-01", valor_centavos: 10000, pago_centavos: 0 }, // 4 dias de atraso
      { vencimento: "2026-08-20", valor_centavos: 10000, pago_centavos: 4000 }, // 46 dias, faltam 60,00
      { vencimento: "2026-06-01", valor_centavos: 5000, pago_centavos: 0 }, // 126 dias
      { vencimento: "2026-10-05", valor_centavos: 20000, pago_centavos: 0 }, // hoje: não é atraso
      { vencimento: "2026-11-05", valor_centavos: 20000, pago_centavos: 0 },
    ],
    previstas: [
      { vencimento: "2026-10-01", valor_centavos: 10000 },
      { vencimento: "2026-10-05", valor_centavos: 20000 },
      { vencimento: "2026-09-10", valor_centavos: 15000 },
      { vencimento: "2026-01-10", valor_centavos: 99999 }, // fora da janela
    ],
    pagamentos: [
      { pago_em: "2026-10-02", valor_centavos: 15000, multa_centavos: 300, mora_centavos: 50, desconto_centavos: 0, parcelas: { valor_centavos: 15000, juros_centavos: 3000 } },
      { pago_em: "2026-09-10", valor_centavos: 15000, multa_centavos: 0, mora_centavos: 0, desconto_centavos: 0, parcelas: { valor_centavos: 15000, juros_centavos: 3000 } },
    ],
    valoresAtivos: [100000, 200000, 150000],
  });

  it("carteira, atraso e inadimplência", () => {
    expect(ind.carteiraCentavos).toBe(10000 + 6000 + 5000 + 20000 + 20000);
    expect(ind.atrasadoCentavos).toBe(10000 + 6000 + 5000);
    expect(ind.inadimplencia).toBeCloseTo(21000 / 61000, 10);
  });

  it("faixas de atraso", () => {
    expect(ind.faixas.map((f) => f.centavos)).toEqual([10000, 0, 6000, 0, 5000]);
    expect(ind.faixas.map((f) => f.parcelas)).toEqual([1, 0, 1, 0, 1]);
  });

  it("mês atual: recebido, previsto e juros", () => {
    expect(ind.recebidoMesCentavos).toBe(15350);
    expect(ind.previstoMesCentavos).toBe(30000);
    expect(ind.jurosMesCentavos).toBe(3000 + 300 + 50);
  });

  it("série de 6 meses", () => {
    expect(ind.serie.map((s) => s.chave)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(ind.serie.at(-2)).toMatchObject({ previsto: 15000, recebido: 15000 });
  });

  it("ticket médio e contratos", () => {
    expect(ind.ticketMedioCentavos).toBe(150000);
    expect(ind.contratosAtivos).toBe(3);
  });

  it("sem dados não divide por zero", () => {
    const vazio = calcularIndicadores({ hoje, abertas: [], previstas: [], pagamentos: [], valoresAtivos: [] });
    expect(vazio.inadimplencia).toBe(0);
    expect(vazio.ticketMedioCentavos).toBe(0);
  });
});

describe("eixo", () => {
  it("marcas redondas", () => {
    expect(marcasEixo(1_150_000)).toEqual([0, 500_000, 1_000_000, 1_500_000]);
    expect(marcasEixo(800_000)).toEqual([0, 200_000, 400_000, 600_000, 800_000]);
    expect(marcasEixo(0)).toEqual([0]);
  });
});

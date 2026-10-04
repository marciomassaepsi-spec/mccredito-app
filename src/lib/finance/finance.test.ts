import { describe, expect, it } from "vitest";

import {
  anualParaMensal,
  atualizarAtraso,
  atualizarPorDatas,
  calcularQuitacao,
  cetMensal,
  descobrirTaxa,
  diasEntre,
  gerarCronograma,
  gerarVencimentos,
  mensalParaAnual,
  montanteComposto,
  montanteSimples,
  tabelaJurosSimples,
  tabelaPrice,
  tabelaSAC,
  taxaDoPeriodo,
} from ".";

// Os valores esperados abaixo foram calculados à mão / com Decimal em Python,
// arredondando cada linha para o centavo (meio centavo sobe).

describe("Tabela Price", () => {
  it("R$ 1.000 a 10% a.m. em 6x dá parcela de R$ 229,61 (critério de aceite)", () => {
    const t = tabelaPrice(100000, 0.1, 6);
    expect(t.linhas.map((l) => l.valorCentavos)).toEqual([
      22961, 22961, 22961, 22961, 22961, 22959,
    ]);
    expect(t.linhas.map((l) => l.jurosCentavos)).toEqual([10000, 8704, 7278, 5710, 3985, 2087]);
    expect(t.linhas.map((l) => l.saldoCentavos)).toEqual([87039, 72782, 57099, 39848, 20872, 0]);
    expect(t.totalCentavos).toBe(137764);
    expect(t.totalJurosCentavos).toBe(37764);
  });

  it("exemplo da MC Créditos: R$ 1.500 a 9,99% a.m. em 6x dá R$ 344,31", () => {
    const t = tabelaPrice(150000, 0.0999, 6);
    expect(t.linhas[0].valorCentavos).toBe(34431);
    expect(t.linhas[5].valorCentavos).toBe(34430);
    expect(t.totalCentavos).toBe(206585);
    expect(t.totalJurosCentavos).toBe(56585);
  });

  it("amortizações somam exatamente o valor emprestado", () => {
    for (const [p, i, n] of [
      [123457, 0.0731, 17],
      [50000, 0.25, 3],
      [999999, 0.015, 48],
    ] as const) {
      const t = tabelaPrice(p, i, n);
      expect(t.linhas.reduce((s, l) => s + l.amortizacaoCentavos, 0)).toBe(p);
      expect(t.linhas.at(-1)?.saldoCentavos).toBe(0);
      expect(t.totalCentavos).toBe(p + t.totalJurosCentavos);
    }
  });

  it("taxa zero divide o valor em parcelas iguais", () => {
    const t = tabelaPrice(100000, 0, 3);
    expect(t.linhas.map((l) => l.valorCentavos)).toEqual([33333, 33333, 33334]);
    expect(t.totalJurosCentavos).toBe(0);
  });

  it("parcela única = valor + um mês de juros", () => {
    expect(tabelaPrice(100000, 0.2, 1).totalCentavos).toBe(120000);
  });

  it("recusa entradas inválidas", () => {
    expect(() => tabelaPrice(0, 0.1, 6)).toThrow();
    expect(() => tabelaPrice(100000, -0.1, 6)).toThrow();
    expect(() => tabelaPrice(100000, 0.1, 0)).toThrow();
    expect(() => tabelaPrice(100.5, 0.1, 6)).toThrow();
  });
});

describe("SAC", () => {
  it("R$ 1.200 a 10% em 4x: amortização fixa de R$ 300 e parcelas decrescentes", () => {
    const t = tabelaSAC(120000, 0.1, 4);
    expect(t.linhas.map((l) => l.amortizacaoCentavos)).toEqual([30000, 30000, 30000, 30000]);
    expect(t.linhas.map((l) => l.jurosCentavos)).toEqual([12000, 9000, 6000, 3000]);
    expect(t.linhas.map((l) => l.valorCentavos)).toEqual([42000, 39000, 36000, 33000]);
    expect(t.totalCentavos).toBe(150000);
  });

  it("a sobra da divisão vai para a última amortização", () => {
    const t = tabelaSAC(100000, 0.1, 3);
    expect(t.linhas.map((l) => l.amortizacaoCentavos)).toEqual([33333, 33333, 33334]);
    expect(t.linhas.at(-1)?.saldoCentavos).toBe(0);
  });
});

describe("Juros simples", () => {
  it("R$ 1.000 a 10% em 3x: R$ 300 de juros, parcelas de R$ 433,33", () => {
    const t = tabelaJurosSimples(100000, 0.1, 3);
    expect(t.totalJurosCentavos).toBe(30000);
    expect(t.linhas.map((l) => l.valorCentavos)).toEqual([43333, 43333, 43334]);
    expect(t.totalCentavos).toBe(130000);
  });

  it("parcela única: R$ 1.000 a 20% → R$ 1.200", () => {
    expect(tabelaJurosSimples(100000, 0.2, 1).totalCentavos).toBe(120000);
  });

  it("montante sem parcelas", () => {
    expect(montanteSimples(100000, 0.1, 3)).toEqual({ montanteCentavos: 130000, jurosCentavos: 30000 });
  });
});

describe("Juros compostos", () => {
  it("R$ 1.000 a 10% por 2 meses vira R$ 1.210", () => {
    expect(montanteComposto(100000, 0.1, 2)).toEqual({ montanteCentavos: 121000, jurosCentavos: 21000 });
  });
});

describe("gerarCronograma", () => {
  it("escolhe o sistema certo", () => {
    expect(gerarCronograma("price", 100000, 0.1, 6).linhas[0].valorCentavos).toBe(22961);
    expect(gerarCronograma("sac", 120000, 0.1, 4).linhas[0].valorCentavos).toBe(42000);
    expect(gerarCronograma("simples", 100000, 0.1, 3).linhas[0].valorCentavos).toBe(43333);
  });
});

describe("Taxas", () => {
  it("descobre a taxa a partir da parcela (taxa reversa)", () => {
    expect(descobrirTaxa(100000, 22961, 6)).toBeCloseTo(0.1, 4);
    // R$ 1.500 em 6x de R$ 344,00 → 9,96% a.m.
    expect(descobrirTaxa(150000, 34400, 6)).toBeCloseTo(0.0995926, 6);
  });

  it("taxa reversa em casos de borda", () => {
    expect(descobrirTaxa(90000, 30000, 3)).toBe(0);
    expect(descobrirTaxa(100000, 30000, 3)).toBeNull(); // paga menos do que pegou
    expect(descobrirTaxa(100000, 0, 3)).toBeNull();
    expect(descobrirTaxa(100000, 150000, 1)).toBeCloseTo(0.5, 8);
  });

  it("converte mensal ↔ anual (composta)", () => {
    expect(mensalParaAnual(0.1)).toBeCloseTo(2.138428, 6);
    expect(anualParaMensal(0.12)).toBeCloseTo(0.0094888, 6);
    expect(anualParaMensal(mensalParaAnual(0.0999))).toBeCloseTo(0.0999, 10);
  });

  it("taxa equivalente por quinzena e semana", () => {
    expect((1 + taxaDoPeriodo(0.1, "quinzenal")) ** 2).toBeCloseTo(1.1, 10);
    expect((1 + taxaDoPeriodo(0.1, "semanal")) ** (52 / 12)).toBeCloseTo(1.1, 10);
  });

  it("CET do Price sem tarifas é a própria taxa", () => {
    const t = tabelaPrice(100000, 0.1, 6);
    expect(cetMensal(100000, t.linhas.map((l) => l.valorCentavos))).toBeCloseTo(0.1, 4);
  });

  it("CET de juros simples fica acima da taxa anunciada", () => {
    const t = tabelaJurosSimples(100000, 0.1, 3);
    expect(cetMensal(100000, t.linhas.map((l) => l.valorCentavos))).toBeCloseTo(0.143596, 5);
  });
});

describe("Atraso", () => {
  it("R$ 229,61 com 10 dias de atraso: multa 2% (R$ 4,59) + mora 1% a.m. pro rata (R$ 0,77)", () => {
    expect(atualizarAtraso(22961, 10, 0.02, 0.01)).toEqual({
      diasAtraso: 10,
      valorOriginalCentavos: 22961,
      multaCentavos: 459,
      moraCentavos: 77,
      totalCentavos: 23497,
    });
  });

  it("sem atraso não cobra nada a mais", () => {
    expect(atualizarAtraso(22961, 0, 0.02, 0.01).totalCentavos).toBe(22961);
    expect(atualizarAtraso(22961, -3, 0.02, 0.01).totalCentavos).toBe(22961);
  });

  it("conta os dias pelas datas", () => {
    expect(diasEntre("2026-09-22", "2026-10-04")).toBe(12);
    expect(diasEntre("2026-02-28", "2026-03-01")).toBe(1);
    expect(diasEntre("2026-10-04", "2026-10-01")).toBe(-3);
    // exemplo da tela de cobrança do plano: 12 dias de atraso
    expect(atualizarPorDatas(22961, "2026-09-22", "2026-10-04", 0.02, 0.01).totalCentavos).toBe(23512);
  });
});

describe("Quitação antecipada", () => {
  const parcelasRestantes = [22961, 22961, 22961, 22961, 22959].map((valorCentavos, i) => ({
    valorCentavos,
    // vencimentos a cada 30 dias a partir de 31/10/2026
    vencimento: ["2026-10-31", "2026-11-30", "2026-12-30", "2027-01-29", "2027-02-28"][i],
  }));

  it("quitando um período antes da próxima parcela, paga o saldo devedor da tabela", () => {
    const q = calcularQuitacao(parcelasRestantes, 0.1, "2026-10-01");
    expect(q.valorNominalCentavos).toBe(114803);
    expect(q.valorQuitacaoCentavos).toBe(87039);
    expect(q.descontoCentavos).toBe(114803 - 87039);
  });

  it("parcelas já vencidas entram sem desconto", () => {
    const q = calcularQuitacao(parcelasRestantes, 0.1, "2027-03-10");
    expect(q.valorQuitacaoCentavos).toBe(114803);
    expect(q.descontoCentavos).toBe(0);
  });
});

describe("Vencimentos", () => {
  it("mensal mantém o dia e usa o último dia em meses curtos", () => {
    expect(gerarVencimentos("2026-01-31", 4, "mensal")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
    expect(gerarVencimentos("2027-12-31", 3, "mensal")).toEqual([
      "2027-12-31",
      "2028-01-31",
      "2028-02-29",
    ]);
  });

  it("quinzenal e semanal", () => {
    expect(gerarVencimentos("2026-10-01", 3, "quinzenal")).toEqual([
      "2026-10-01",
      "2026-10-16",
      "2026-10-31",
    ]);
    expect(gerarVencimentos("2026-12-24", 3, "semanal")).toEqual([
      "2026-12-24",
      "2026-12-31",
      "2027-01-07",
    ]);
  });
});

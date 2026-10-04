import { describe, expect, it } from "vitest";

import {
  cpfValido,
  formatCentavos,
  formatData,
  formatDataExtenso,
  hojeISO,
  mascararCPF,
  parseReaisParaCentavos,
} from "./format";

describe("formatCentavos", () => {
  it("formata em reais no padrão brasileiro", () => {
    expect(formatCentavos(137764)).toBe("R$ 1.377,64");
    expect(formatCentavos(22961)).toBe("R$ 229,61");
    expect(formatCentavos(0)).toBe("R$ 0,00");
    expect(formatCentavos(5)).toBe("R$ 0,05");
  });

  it("recusa valores que não são centavos inteiros", () => {
    expect(() => formatCentavos(10.5)).toThrow();
  });
});

describe("parseReaisParaCentavos", () => {
  it.each([
    ["1.377,64", 137764],
    ["1377,64", 137764],
    ["R$ 1.377,64", 137764],
    ["1377.64", 137764],
    ["1000", 100000],
    ["0,5", 50],
    ["229,61", 22961],
    ["1.000", 100000],
    ["12.500", 1250000],
    ["1.37", 137],
  ])("%s → %i", (texto, esperado) => {
    expect(parseReaisParaCentavos(texto)).toBe(esperado);
  });

  it.each(["", "abc", "1,2,3", "12,345", "1.3.7"])("recusa %j", (texto) => {
    expect(parseReaisParaCentavos(texto)).toBeNull();
  });
});

describe("datas", () => {
  it("usa o fuso de São Paulo para o dia de hoje", () => {
    // 02:30 UTC de 5/10 ainda é 23:30 de 4/10 em São Paulo
    expect(hojeISO(new Date("2026-10-05T02:30:00Z"))).toBe("2026-10-04");
    expect(hojeISO(new Date("2026-10-05T03:30:00Z"))).toBe("2026-10-05");
  });

  it("escreve a data por extenso só com a primeira letra maiúscula", () => {
    expect(formatDataExtenso(new Date("2026-10-04T15:00:00Z"))).toBe("Domingo, 4 de outubro");
  });

  it("formata dd/mm/aaaa", () => {
    expect(formatData("2026-10-04")).toBe("04/10/2026");
  });
});

describe("CPF", () => {
  it("valida dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("123")).toBe(false);
  });

  it("mascara nas listagens", () => {
    expect(mascararCPF("52998224725")).toBe("***.982.247-**");
  });
});

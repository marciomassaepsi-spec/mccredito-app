import { describe, expect, it } from "vitest";

import {
  calcularPontualidade,
  montarParcelas,
  resumirParcelas,
  situacaoParcela,
  umMesDepois,
  type ParcelaGravada,
} from "./emprestimos";
import { cnpjValido, formatCPF, formatTelefone, linkWhatsApp, normalizarTelefone } from "./format";
import { exibirChavePix, normalizarChavePix } from "./pix";

describe("chave PIX", () => {
  it("celular vira +55 com DDD, em qualquer formato digitado", () => {
    for (const t of ["71912345678", "(71) 91234-5678", "5571912345678", "+55 71 91234-5678"]) {
      expect(normalizarChavePix("telefone", t)).toEqual({ ok: true, chave: "+5571912345678" });
    }
    expect(exibirChavePix("telefone", "+5571912345678")).toBe("(71) 91234-5678");
  });

  it("recusa celular sem DDD ou fixo", () => {
    expect(normalizarChavePix("telefone", "912345678").ok).toBe(false);
    expect(normalizarChavePix("telefone", "7133334444").ok).toBe(false);
  });

  it("CPF, CNPJ, e-mail e aleatória", () => {
    expect(normalizarChavePix("cpf", "529.982.247-25")).toEqual({ ok: true, chave: "52998224725" });
    expect(normalizarChavePix("cpf", "529.982.247-24").ok).toBe(false);
    expect(normalizarChavePix("cnpj", "11.222.333/0001-81")).toEqual({ ok: true, chave: "11222333000181" });
    expect(normalizarChavePix("email", " Dono@MCcreditos.com.br ")).toEqual({
      ok: true,
      chave: "dono@mccreditos.com.br",
    });
    expect(normalizarChavePix("aleatoria", "123E4567-E89B-12D3-A456-426614174000")).toEqual({
      ok: true,
      chave: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(normalizarChavePix("aleatoria", "abc").ok).toBe(false);
  });
});

describe("documentos e telefones", () => {
  it("valida CNPJ", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
  });

  it("formata CPF e telefone", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
    expect(formatTelefone("71912345678")).toBe("(71) 91234-5678");
    expect(formatTelefone("7133334444")).toBe("(71) 3333-4444");
    expect(normalizarTelefone("+55 (71) 91234-5678")).toBe("71912345678");
    expect(normalizarTelefone("12345")).toBeNull();
  });

  it("monta link do WhatsApp", () => {
    expect(linkWhatsApp("(71) 91234-5678", "Olá!")).toBe("https://wa.me/5571912345678?text=Ol%C3%A1!");
    expect(linkWhatsApp("123")).toBeNull();
  });
});

describe("montarParcelas", () => {
  it("Price mensal com datas", () => {
    const p = montarParcelas({
      sistema: "price",
      valorCentavos: 150000,
      taxaMensal: 0.0999,
      qtdParcelas: 6,
      primeiroVencimento: "2026-11-05",
      periodicidade: "mensal",
    });
    expect(p.map((x) => x.vencimento)).toEqual([
      "2026-11-05",
      "2026-12-05",
      "2027-01-05",
      "2027-02-05",
      "2027-03-05",
      "2027-04-05",
    ]);
    expect(p[0].valor_centavos).toBe(34431);
    expect(p.reduce((s, x) => s + x.amortizacao_centavos, 0)).toBe(150000);
  });

  it("quinzenal usa a taxa equivalente da quinzena (Price)", () => {
    const p = montarParcelas({
      sistema: "price",
      valorCentavos: 100000,
      taxaMensal: 0.1,
      qtdParcelas: 2,
      primeiroVencimento: "2026-10-20",
      periodicidade: "quinzenal",
    });
    // 10% a.m. ≈ 4,8809% por quinzena; juros da 1ª = 1.000 × 4,8809% = 48,81
    expect(p[0].juros_centavos).toBe(4881);
    expect(p.map((x) => x.vencimento)).toEqual(["2026-10-20", "2026-11-04"]);
  });

  it("juros simples semanal divide a taxa mensal pelas semanas do mês", () => {
    const p = montarParcelas({
      sistema: "simples",
      valorCentavos: 100000,
      taxaMensal: 0.13,
      qtdParcelas: 4,
      primeiroVencimento: "2026-10-12",
      periodicidade: "semanal",
    });
    // 13% ÷ (52/12) = 3% por semana → R$ 30 de juros por semana
    expect(p.map((x) => x.juros_centavos)).toEqual([3000, 3000, 3000, 3000]);
  });
});

const parcela = (n: number, vencimento: string, extra: Partial<ParcelaGravada> = {}): ParcelaGravada => ({
  numero: n,
  vencimento,
  valor_centavos: 10000,
  pago_centavos: 0,
  status: "a_vencer",
  quitada_em: null,
  ...extra,
});

describe("situação das parcelas", () => {
  const hoje = "2026-10-05";

  it("classifica pela data", () => {
    expect(situacaoParcela(parcela(1, "2026-09-22"), hoje)).toEqual({
      situacao: "atrasada",
      diasAtraso: 13,
      emAbertoCentavos: 10000,
    });
    expect(situacaoParcela(parcela(1, "2026-10-05"), hoje).situacao).toBe("vence_hoje");
    expect(situacaoParcela(parcela(1, "2026-10-06"), hoje).situacao).toBe("a_vencer");
    expect(situacaoParcela(parcela(1, "2026-09-01", { status: "paga" }), hoje).situacao).toBe("paga");
  });

  it("pagamento parcial reduz o que falta", () => {
    const s = situacaoParcela(parcela(1, "2026-09-30", { status: "paga_parcial", pago_centavos: 4000 }), hoje);
    expect(s).toEqual({ situacao: "atrasada", diasAtraso: 5, emAbertoCentavos: 6000 });
  });

  it("resume o empréstimo", () => {
    const r = resumirParcelas(
      [
        parcela(3, "2026-11-05"),
        parcela(1, "2026-09-05", { status: "paga", pago_centavos: 10000, quitada_em: "2026-09-05" }),
        parcela(2, "2026-10-01"),
      ],
      hoje,
    );
    expect(r).toMatchObject({
      pagas: 1,
      total: 3,
      atrasadas: 1,
      maiorAtrasoDias: 4,
      emAbertoCentavos: 20000,
      atrasadoCentavos: 10000,
    });
    expect(r.proxima?.numero).toBe(2);
  });
});

describe("pontualidade", () => {
  const hoje = "2026-10-05";

  it("sem parcelas vencidas não tem nota", () => {
    expect(calcularPontualidade([parcela(1, "2026-11-01")], hoje)).toEqual({ tipo: "sem_historico" });
  });

  it("conta pagas em dia sobre as que já venceram", () => {
    const r = calcularPontualidade(
      [
        parcela(1, "2026-07-05", { status: "paga", quitada_em: "2026-07-05" }),
        parcela(2, "2026-08-05", { status: "paga", quitada_em: "2026-08-09" }),
        parcela(3, "2026-09-05", { status: "paga", quitada_em: "2026-09-01" }),
        parcela(4, "2026-10-01"),
        parcela(5, "2026-11-05"),
      ],
      hoje,
    );
    expect(r).toEqual({ tipo: "nota", percentual: 50, pagasEmDia: 2, avaliadas: 4, atrasadasAgora: 1 });
  });
});

describe("datas", () => {
  it("sugere o vencimento um mês depois", () => {
    expect(umMesDepois("2026-10-05")).toBe("2026-11-05");
    expect(umMesDepois("2027-01-31")).toBe("2027-02-28");
  });
});

import { describe, expect, it } from "vitest";

import { MODELO_PADRAO, montarVariaveis, preencherModelo, VARIAVEIS, type DadosContrato } from "./contrato";
import { gerarContratoPDF } from "./contrato-pdf";
import { inteiroPorExtenso, reaisPorExtenso } from "./extenso";
import { alocarRecebimento, encargosNaData, planoQuitacao, recebidoDoPagamento } from "./pagamentos";

describe("valor por extenso", () => {
  it.each([
    [1, "um"],
    [10, "dez"],
    [15, "quinze"],
    [21, "vinte e um"],
    [100, "cem"],
    [101, "cento e um"],
    [110, "cento e dez"],
    [344, "trezentos e quarenta e quatro"],
    [1000, "mil"],
    [1001, "mil e um"],
    [1100, "mil e cem"],
    [1250, "mil duzentos e cinquenta"],
    [1500, "mil e quinhentos"],
    [2065, "dois mil e sessenta e cinco"],
    [21000, "vinte e um mil"],
    [100000, "cem mil"],
    [1000000, "um milhão"],
    [2500300, "dois milhões quinhentos mil e trezentos"],
  ])("%i → %s", (n, texto) => {
    expect(inteiroPorExtenso(n)).toBe(texto);
  });

  it("reais e centavos", () => {
    expect(reaisPorExtenso(150000)).toBe("mil e quinhentos reais");
    expect(reaisPorExtenso(206585)).toBe("dois mil e sessenta e cinco reais e oitenta e cinco centavos");
    expect(reaisPorExtenso(100)).toBe("um real");
    expect(reaisPorExtenso(101)).toBe("um real e um centavo");
    expect(reaisPorExtenso(45)).toBe("quarenta e cinco centavos");
    expect(reaisPorExtenso(100000000)).toBe("um milhão de reais");
  });
});

const parcela = { id: "p1", numero: 1, vencimento: "2026-09-25", valor_centavos: 22961, pago_centavos: 0 };

describe("pagamento de parcela", () => {
  it("calcula multa e mora na data do pagamento", () => {
    expect(encargosNaData(parcela, "2026-10-05", 0.02, 0.01)).toEqual({
      emAbertoCentavos: 22961,
      diasAtraso: 10,
      multaCentavos: 459,
      moraCentavos: 77,
      devidoCentavos: 23497,
    });
    expect(encargosNaData(parcela, "2026-09-25", 0.02, 0.01).devidoCentavos).toBe(22961);
  });

  it("recebimento cobre primeiro multa e mora, depois a parcela", () => {
    const enc = encargosNaData(parcela, "2026-10-05", 0.02, 0.01);
    expect(alocarRecebimento(23497, enc, false)).toEqual({ ok: true, valor: 22961, multa: 459, mora: 77, parcial: false });
    expect(alocarRecebimento(10000, enc, false)).toEqual({ ok: true, valor: 9464, multa: 459, mora: 77, parcial: true });
    expect(alocarRecebimento(22961, enc, true)).toEqual({ ok: true, valor: 22961, multa: 0, mora: 0, parcial: false });
  });

  it("recusa receber mais que o devido ou menos que os encargos", () => {
    const enc = encargosNaData(parcela, "2026-10-05", 0.02, 0.01);
    expect(alocarRecebimento(23498, enc, false).ok).toBe(false);
    expect(alocarRecebimento(500, enc, false).ok).toBe(false);
    expect(alocarRecebimento(0, enc, false).ok).toBe(false);
  });

  it("parcela com pagamento parcial anterior cobra só o que falta", () => {
    const enc = encargosNaData({ ...parcela, pago_centavos: 20000 }, "2026-09-25", 0.02, 0.01);
    expect(enc.emAbertoCentavos).toBe(2961);
  });

  it("recebido = valor + multa + mora − desconto", () => {
    expect(recebidoDoPagamento({ valor_centavos: 22961, multa_centavos: 459, mora_centavos: 77, desconto_centavos: 0 })).toBe(23497);
    expect(recebidoDoPagamento({ valor_centavos: 22961, multa_centavos: 0, mora_centavos: 0, desconto_centavos: 1961 })).toBe(21000);
  });
});

describe("quitação antecipada", () => {
  // R$ 1.000 a 10% em 6x, parcela 1 paga; quitando 30 dias antes da 2ª
  const restantes = [22961, 22961, 22961, 22961, 22959].map((valor_centavos, i) => ({
    id: `p${i + 2}`,
    numero: i + 2,
    vencimento: ["2026-10-31", "2026-11-30", "2026-12-30", "2027-01-29", "2027-02-28"][i],
    valor_centavos,
    pago_centavos: 0,
  }));

  it("o total para quitar é o saldo devedor da tabela", () => {
    const plano = planoQuitacao(restantes, 0.1, "2026-10-01", 0.02, 0.01, false);
    expect(plano.emAbertoCentavos).toBe(114803);
    expect(plano.encargosCentavos).toBe(0);
    // cada parcela é arredondada separadamente: a soma pode diferir 1-2 centavos do saldo de 870,39
    expect(Math.abs(plano.totalCentavos - 87039)).toBeLessThanOrEqual(2);
    expect(plano.itens.map((i) => i.parcela_id)).toEqual(["p2", "p3", "p4", "p5", "p6"]);
  });

  it("parcela atrasada entra com multa e mora e sem desconto", () => {
    const plano = planoQuitacao([{ ...parcela }], 0.1, "2026-10-05", 0.02, 0.01, false);
    expect(plano.itens[0]).toMatchObject({ valor: 22961, multa: 459, mora: 77, desconto: 0 });
    expect(plano.totalCentavos).toBe(23497);
    expect(planoQuitacao([{ ...parcela }], 0.1, "2026-10-05", 0.02, 0.01, true).totalCentavos).toBe(22961);
  });
});

const dados: DadosContrato = {
  empresa: {
    nome: "MC Créditos",
    razaoSocial: "Fulano de Tal",
    documento: "52998224725",
    cidade: "Salvador - BA",
    tipoChavePix: "telefone",
    chavePix: "+5571912345678",
  },
  cliente: { nome: "Josiane Ferreira", cpf: "11144477735", endereco: "Rua Nova, 10 - Pituba, Salvador - BA" },
  emprestimo: {
    valorCentavos: 150000,
    taxaPercentual: 9.99,
    sistema: "price",
    periodicidade: "mensal",
    liberadoEm: "2026-10-05",
    multaPercentual: 2,
    moraPercentual: 1,
  },
  parcelas: [34431, 34431, 34431, 34431, 34431, 34430].map((valor_centavos, i) => ({
    numero: i + 1,
    vencimento: `2026-${String(11 + i).padStart(2, "0")}-05`.replace("2026-13", "2027-01").replace("2026-14", "2027-02").replace("2026-15", "2027-03").replace("2026-16", "2027-04"),
    valor_centavos,
  })),
  hoje: "2026-10-05",
};

describe("contrato", () => {
  it("preenche todas as variáveis do modelo padrão", () => {
    const vars = montarVariaveis(dados);
    const { blocos, desconhecidas } = preencherModelo(MODELO_PADRAO, vars);
    expect(desconhecidas).toEqual([]);
    const texto = blocos.map((b) => ("texto" in b ? b.texto : `<${b.tipo}>`)).join("\n");
    expect(texto).toContain("**R$ 1.500,00** (mil e quinhentos reais)");
    expect(texto).toContain("6 parcelas mensais");
    expect(texto).toContain("**R$ 2.065,85** (dois mil e sessenta e cinco reais e oitenta e cinco centavos)");
    expect(texto).toContain("CPF/CNPJ sob o nº 529.982.247-25");
    expect(texto).toContain("chave (71) 91234-5678");
    expect(texto).toContain("Salvador - BA, 5 de outubro de 2026.");
    expect(blocos.filter((b) => b.tipo === "tabela_parcelas")).toHaveLength(1);
    expect(blocos.filter((b) => b.tipo === "assinaturas")).toHaveLength(1);
  });

  it("toda variável documentada existe", () => {
    const vars = montarVariaveis(dados);
    for (const [nome] of VARIAVEIS) {
      if (nome === "tabela_parcelas" || nome === "assinaturas") continue;
      expect(vars, nome).toHaveProperty([nome]);
    }
  });

  it("aponta variável digitada errado", () => {
    expect(preencherModelo("Olá {{cliente.nme}}", montarVariaveis(dados)).desconhecidas).toEqual(["cliente.nme"]);
  });

  it("gera um PDF válido", async () => {
    const { blocos } = preencherModelo(MODELO_PADRAO, montarVariaveis(dados));
    const pdf = await gerarContratoPDF(blocos, dados);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });
});

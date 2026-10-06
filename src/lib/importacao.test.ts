import { describe, expect, it } from "vitest";

import { montarParcelasPelaParcela, planejarEmprestimo } from "./emprestimos";
import { conferirLinha, lerCSV, lerLinhas, paraFuncaoSQL, parseDataPlanilha, type LinhaPlanilha } from "./importacao";

const HOJE = "2026-10-06";

function linha(valores: LinhaPlanilha["valores"]): LinhaPlanilha {
  return {
    linha: 2,
    valores: {
      nome: "Maria da Silva",
      whatsapp: "(71) 91234-5678",
      valor: "1.500,00",
      parcela: "344,00",
      qtd: "6",
      pagas: "2",
      liberado: "05/07/2026",
      vencimento: "05/08/2026",
      ...valores,
    },
  };
}

describe("montarParcelasPelaParcela", () => {
  it("usa a parcela combinada e acerta os centavos na última", () => {
    const plano = montarParcelasPelaParcela({
      valorCentavos: 150000,
      parcelaCentavos: 34400,
      qtdParcelas: 6,
      primeiroVencimento: "2026-08-05",
      periodicidade: "mensal",
    });
    expect(plano).not.toBeNull();
    expect(plano?.parcelas.slice(0, 5).every((p) => p.valor_centavos === 34400)).toBe(true);
    expect(Math.abs((plano?.parcelas[5].valor_centavos ?? 0) - 34400)).toBeLessThanOrEqual(2);
    expect(plano?.parcelas.reduce((s, p) => s + p.amortizacao_centavos, 0)).toBe(150000);
    expect(plano?.taxaMensal).toBeCloseTo(0.0996, 4);
  });

  it("recusa parcela que não paga nem o valor emprestado", () => {
    expect(
      montarParcelasPelaParcela({ valorCentavos: 150000, parcelaCentavos: 20000, qtdParcelas: 6, primeiroVencimento: "2026-08-05", periodicidade: "mensal" }),
    ).toBeNull();
  });

  it("planejarEmprestimo pela parcela é sempre Price", () => {
    const plano = planejarEmprestimo({
      modo: "parcela",
      sistema: "sac",
      valorCentavos: 100000,
      taxaMensal: null,
      parcelaCentavos: 40211,
      qtdParcelas: 3,
      primeiroVencimento: "2026-08-05",
      periodicidade: "mensal",
    });
    expect(plano?.sistema).toBe("price");
    expect(plano?.taxaMensal).toBeCloseTo(0.1, 4);
  });
});

describe("lerLinhas", () => {
  it("acha os títulos mesmo com acento, maiúscula e apelidos", () => {
    const r = lerLinhas([
      ["Controle de clientes"],
      ["CLIENTE", "Telefone", "Valor", "Parcela", "Parcelas", "Pagas", "Data", "1º Vencimento", "Cor favorita"],
      ["Maria", "71912345678", "1500", "344", "6", "2", "2026-07-05", "2026-08-05", "azul"],
      ["", "", "", "", "", "", "", "", ""],
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ignoradas).toEqual(["Cor favorita"]);
    expect(r.linhas).toEqual([
      {
        linha: 3,
        valores: {
          nome: "Maria",
          whatsapp: "71912345678",
          valor: "1500",
          parcela: "344",
          qtd: "6",
          pagas: "2",
          liberado: "2026-07-05",
          vencimento: "2026-08-05",
        },
      },
    ]);
  });

  it("avisa quais colunas obrigatórias faltam", () => {
    const r = lerLinhas([["Nome", "WhatsApp", "Valor emprestado", "Parcelas pagas"]]);
    expect(r).toEqual({
      ok: false,
      erro: "Faltam colunas na planilha: Total de parcelas, Data do empréstimo, Valor da parcela (ou Taxa ao mês).",
    });
  });

  it("recusa planilha sem títulos", () => {
    expect(lerLinhas([["a", "b"], ["1", "2"]]).ok).toBe(false);
  });
});

describe("conferirLinha", () => {
  it("monta o contrato com as parcelas já pagas e avisa o atraso", () => {
    const r = conferirLinha(linha({}), HOJE);
    expect(r.erros).toEqual([]);
    // Vencimentos 05/08, 05/09, 05/10 (atrasada em 06/10), 05/11...
    expect(r.avisos).toEqual(["1 parcela em atraso (venceu em 05/10/2026)."]);
    expect(r.resumo).toBe("R$ 1.500,00 em 6x de R$ 344,00 · 9,96% ao mês · 2 de 6 pagas · próxima 05/10/2026");
    expect(r.contrato?.pagas).toBe(2);
    expect(r.contrato?.cliente).toEqual({ nome: "Maria da Silva", cpf: null, whatsapp: "71912345678", endereco: "" });

    const sql = r.contrato && paraFuncaoSQL(r.contrato);
    expect(sql?.ja_pagas).toBe(2);
    expect(sql?.emprestimo).toMatchObject({ valor_centavos: 150000, sistema: "price", qtd_parcelas: 6, liberado_em: "2026-07-05", primeiro_vencimento: "2026-08-05" });
    expect(sql?.emprestimo.taxa_percentual).toBeCloseTo(9.9593, 3);
  });

  it("pela taxa, com SAC quinzenal e 1º vencimento em branco", () => {
    const r = conferirLinha(
      linha({ parcela: undefined, taxa: "10", sistema: "SAC", frequencia: "Quinzenal", vencimento: undefined, pagas: "", qtd: "4", liberado: "20/09/2026" }),
      HOJE,
    );
    expect(r.erros).toEqual([]);
    expect(r.contrato?.primeiroVencimento).toBe("2026-10-05");
    expect(r.contrato?.sistema).toBe("sac");
    expect(r.contrato?.periodicidade).toBe("quinzenal");
    expect(r.contrato?.pagas).toBe(0);
  });

  it("aponta cada problema da linha", () => {
    const r = conferirLinha(
      linha({ nome: "", cpf: "111.111.111-11", whatsapp: "123", valor: "abc", qtd: "0", liberado: "31/02/2026", frequencia: "anual" }),
      HOJE,
    );
    expect(r.contrato).toBeNull();
    expect(r.erros).toEqual([
      "Falta o nome do cliente.",
      "CPF inválido (111.111.111-11).",
      "WhatsApp inválido (123). Use o DDD, ex.: (71) 91234-5678.",
      "Valor emprestado inválido (abc).",
      "Total de parcelas inválido (0).",
      "Frequência inválida (anual). Use Mensal, Quinzenal ou Semanal.",
      "Data do empréstimo inválida (31/02/2026). Use dd/mm/aaaa.",
    ]);
  });

  it("contrato com todas as parcelas pagas não precisa ser importado", () => {
    expect(conferirLinha(linha({ pagas: "6" }), HOJE).erros).toEqual([
      "Todas as parcelas já foram pagas: o contrato terminou e não precisa ser importado.",
    ]);
  });

  it("parcela pequena demais", () => {
    expect(conferirLinha(linha({ parcela: "200,00" }), HOJE).erros).toEqual([
      "Confira os valores: 6x de R$ 200,00 dá menos que o valor emprestado.",
    ]);
  });

  it("devolve o zero da frente do CPF que o Excel tirou", () => {
    // 012.345.678-90 guardado como número vira 1234567890
    expect(conferirLinha(linha({ cpf: "1234567890" }), HOJE).contrato?.cliente.cpf).toBe("01234567890");
  });

  it("parcela e taxa que não batem: vale a parcela, com aviso", () => {
    const r = conferirLinha(linha({ taxa: "12" }), HOJE);
    expect(r.erros).toEqual([]);
    expect(r.avisos[0]).toBe("A taxa da planilha (12%) não bate com a parcela; usei a parcela, que dá 9,96% ao mês.");
  });

  it("parcela com sistema SAC é recusada", () => {
    expect(conferirLinha(linha({ sistema: "SAC" }), HOJE).erros).toEqual([
      "Com o valor da parcela, o sistema é Price (parcelas iguais). Deixe o Sistema em branco ou use a taxa.",
    ]);
  });

  it("sem WhatsApp entra, mas com aviso", () => {
    const r = conferirLinha(linha({ whatsapp: undefined }), HOJE);
    expect(r.erros).toEqual([]);
    expect(r.avisos[0]).toContain("Sem WhatsApp");
  });
});

describe("datas e CSV", () => {
  it("entende as datas mais comuns", () => {
    expect(parseDataPlanilha("05/07/2026")).toBe("2026-07-05");
    expect(parseDataPlanilha("5/7/26")).toBe("2026-07-05");
    expect(parseDataPlanilha("2026-07-05")).toBe("2026-07-05");
    expect(parseDataPlanilha("31/06/2026")).toBeNull();
    expect(parseDataPlanilha("julho")).toBeNull();
  });

  it("lê CSV do Excel (ponto e vírgula) e do Google (vírgula, aspas)", () => {
    expect(lerCSV("﻿Nome;Valor\r\nMaria;1.500,00\r\n")).toEqual([
      ["Nome", "Valor"],
      ["Maria", "1.500,00"],
    ]);
    expect(lerCSV('Nome,Valor,Obs\n"Silva, Maria","1.500,00","disse ""ok"""')).toEqual([
      ["Nome", "Valor", "Obs"],
      ["Silva, Maria", "1.500,00", 'disse "ok"'],
    ]);
  });
});

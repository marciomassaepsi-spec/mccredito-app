import { describe, expect, it } from "vitest";

import { descreverEntrada, formatarValor, linkDaEntrada } from "./auditoria";
import { gerarCSV, type QualquerTabela } from "./csv";

describe("histórico de alterações", () => {
  it("pagamento registrado e estornado", () => {
    const criado = { id: 1, tabela: "pagamentos", acao: "criou", dados_antes: null, dados_depois: { id: "x", valor_centavos: 34431, estornado: false }, feito_em: "2026-10-05T15:00:00Z" };
    expect(descreverEntrada(criado).titulo).toBe("Registrou pagamento de R$ 344,31");

    const estorno = {
      ...criado,
      acao: "alterou",
      dados_antes: { id: "x", valor_centavos: 34431, estornado: false, estorno_motivo: null },
      dados_depois: { id: "x", valor_centavos: 34431, estornado: true, estorno_motivo: "PIX não caiu", estornado_em: "2026-10-05" },
    };
    const d = descreverEntrada(estorno);
    expect(d.titulo).toBe("Estornou pagamento de R$ 344,31");
    expect(d.mudancas).toEqual([
      { campo: "Estornado", antes: "não", depois: "sim" },
      { campo: "Motivo do estorno", antes: "vazio", depois: "PIX não caiu" },
    ]);
  });

  it("empréstimo quitado e parcela paga", () => {
    expect(
      descreverEntrada({ id: 2, tabela: "emprestimos", acao: "alterou", dados_antes: { id: "e", valor_centavos: 150000, status: "ativo" }, dados_depois: { id: "e", valor_centavos: 150000, status: "quitado" }, feito_em: "" }).titulo,
    ).toBe("Empréstimo de R$ 1.500,00 ficou quitado");
    expect(
      descreverEntrada({ id: 3, tabela: "parcelas", acao: "alterou", dados_antes: { numero: 2, status: "a_vencer", pago_centavos: 0 }, dados_depois: { numero: 2, status: "paga", pago_centavos: 34431 }, feito_em: "" }),
    ).toEqual({
      titulo: "Parcela 2 ficou paga",
      mudancas: [
        { campo: "Situação", antes: "em aberto", depois: "paga" },
        { campo: "Pago", antes: "R$ 0,00", depois: "R$ 344,31" },
      ],
    });
  });

  it("ignora campos técnicos e formata datas", () => {
    const d = descreverEntrada({ id: 4, tabela: "clientes", acao: "alterou", dados_antes: { id: "c", nome: "Ana", atualizado_em: "a" }, dados_depois: { id: "c", nome: "Ana Paula", atualizado_em: "b" }, feito_em: "" });
    expect(d).toEqual({ titulo: "Alterou o cliente Ana Paula", mudancas: [{ campo: "Nome", antes: "Ana", depois: "Ana Paula" }] });
    expect(formatarValor("vencimento", "2026-10-05")).toBe("05/10/2026");
  });

  it("aponta para a tela certa", () => {
    expect(linkDaEntrada({ id: 5, tabela: "parcelas", acao: "alterou", dados_antes: null, dados_depois: { emprestimo_id: "e1" }, feito_em: "" })).toBe("/emprestimos/e1");
    expect(linkDaEntrada({ id: 6, tabela: "configuracoes", acao: "alterou", dados_antes: null, dados_depois: {}, feito_em: "" })).toBeNull();
  });
});

describe("CSV para Excel", () => {
  const tabela: QualquerTabela = {
    aba: "Teste",
    arquivo: "teste",
    linhas: [
      { nome: "Ana; Maria", valor: 1377.64, data: "2026-10-05", obs: 'disse "amanhã"' },
      { nome: "=SOMA(A1)", valor: null, data: null, obs: "" },
    ],
    colunas: [
      { titulo: "Nome", tipo: "texto", valor: (l: { nome: string }) => l.nome },
      { titulo: "Valor", tipo: "dinheiro", valor: (l: { valor: number | null }) => l.valor },
      { titulo: "Data", tipo: "data", valor: (l: { data: string | null }) => l.data },
      { titulo: "Obs", tipo: "texto", valor: (l: { obs: string }) => l.obs },
    ] as QualquerTabela["colunas"],
  };
  const csv = gerarCSV(tabela);

  it("começa com BOM e usa ponto e vírgula", () => {
    expect(csv.startsWith("﻿Nome;Valor;Data;Obs\r\n")).toBe(true);
  });

  it("vírgula decimal, data brasileira e aspas onde precisa", () => {
    expect(csv).toContain('"Ana; Maria";1377,64;05/10/2026;"disse ""amanhã"""');
  });

  it("neutraliza fórmulas digitadas", () => {
    expect(csv).toContain("'=SOMA(A1);;;");
  });
});

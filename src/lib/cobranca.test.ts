import { describe, expect, it } from "vitest";

import {
  dentroDoHorario,
  escolherModelo,
  montarFila,
  preencherMensagem,
  primeiroNome,
  variaveisDoItem,
  type Contato,
  type EmprestimoCobranca,
  type ModeloMensagem,
} from "./cobranca";

const modelos: ModeloMensagem[] = [-3, 0, 1, 7, 15].map((d) => ({
  dias_relativos: d,
  titulo: `D${d}`,
  texto: `texto ${d}`,
  ativo: true,
}));

describe("régua de cobrança", () => {
  it.each([
    [-7, -3],
    [-3, -3],
    [-2, -3],
    [0, 0],
    [1, 1],
    [6, 1],
    [7, 7],
    [14, 7],
    [90, 15],
  ])("%i dias → modelo D%i", (dias, esperado) => {
    expect(escolherModelo(modelos, dias)?.dias_relativos).toBe(esperado);
  });

  it("ignora modelos desligados", () => {
    const semD7 = modelos.map((m) => (m.dias_relativos === 7 ? { ...m, ativo: false } : m));
    expect(escolherModelo(semD7, 10)?.dias_relativos).toBe(1);
    expect(escolherModelo([], 3)).toBeNull();
  });
});

describe("mensagem", () => {
  it("troca as variáveis e aponta as desconhecidas", () => {
    const r = preencherMensagem("Olá, {{cliente.primeiro_nome}}! Valor: {{parcela.valor}} {{x.y}}", {
      "cliente.primeiro_nome": "Josiane",
      "parcela.valor": "R$ 344,31",
    });
    expect(r.texto).toBe("Olá, Josiane! Valor: R$ 344,31");
    expect(r.desconhecidas).toEqual(["x.y"]);
  });

  it("primeiro nome com maiúscula", () => {
    expect(primeiroNome("  JOSIANE ferreira dos Santos")).toBe("Josiane");
  });
});

describe("horário de cobrança (São Paulo)", () => {
  it("respeita o fuso", () => {
    // 10:59 UTC = 07:59 em São Paulo
    expect(dentroDoHorario(new Date("2026-10-05T10:59:00Z"), "08:00", "20:00")).toBe(false);
    expect(dentroDoHorario(new Date("2026-10-05T11:00:00Z"), "08:00", "20:00")).toBe(true);
    // 22:59 UTC = 19:59; 23:00 UTC = 20:00 (já fora)
    expect(dentroDoHorario(new Date("2026-10-05T22:59:00Z"), "08:00:00", "20:00:00")).toBe(true);
    expect(dentroDoHorario(new Date("2026-10-05T23:00:00Z"), "08:00", "20:00")).toBe(false);
  });
});

const p = (id: string, numero: number, vencimento: string, extra = {}) => ({
  id,
  numero,
  vencimento,
  valor_centavos: 22961,
  pago_centavos: 0,
  status: "a_vencer" as const,
  quitada_em: null,
  ...extra,
});

const cliente = (id: string, nome: string) => ({ id, nome, whatsapp: "71912345678", endereco: "Rua A, 1" });

describe("fila de cobrança", () => {
  const hoje = "2026-10-05";
  const emprestimos: EmprestimoCobranca[] = [
    {
      id: "e1",
      clientes: cliente("c1", "Ana"),
      parcelas: [
        p("a1", 1, "2026-09-05", { status: "paga", pago_centavos: 22961, quitada_em: "2026-09-05" }),
        p("a2", 2, "2026-09-25"),
        p("a3", 3, "2026-10-25"),
      ],
    },
    {
      id: "e2",
      clientes: cliente("c2", "Bruno"),
      parcelas: [p("b1", 1, "2026-10-05"), p("b2", 2, "2026-10-08"), p("b3", 3, "2026-10-20")],
    },
    {
      id: "e3",
      clientes: cliente("c3", "Carla"),
      parcelas: [p("c1p", 1, "2026-08-06", { status: "paga_parcial", pago_centavos: 10000 })],
    },
  ];
  const contatos: Contato[] = [
    { cliente_id: "c1", parcela_id: "a2", tipo: "whatsapp", resultado: "nao_atendeu", promessa_para: null, observacoes: "", criado_em: "2026-10-01T12:00:00Z" },
    { cliente_id: "c1", parcela_id: "a2", tipo: "ligacao", resultado: "prometeu_pagar", promessa_para: "2026-10-05", observacoes: "", criado_em: "2026-10-03T12:00:00Z" },
  ];

  const fila = montarFila(emprestimos, contatos, hoje, 0.02, 0.01);

  it("ordena: atrasadas (mais dias primeiro), hoje, próximos 7 dias", () => {
    expect(fila.map((i) => [i.parcela.id, i.grupo])).toEqual([
      ["c1p", "atrasada"],
      ["a2", "atrasada"],
      ["b1", "hoje"],
      ["b2", "proximos"],
    ]);
  });

  it("deixa de fora parcelas pagas e as que vencem depois de 7 dias", () => {
    const ids = fila.map((i) => i.parcela.id);
    expect(ids).not.toContain("a1");
    expect(ids).not.toContain("a3");
    expect(ids).not.toContain("b3");
  });

  it("calcula o devido com multa e mora sobre o que falta", () => {
    const carla = fila[0];
    expect(carla.emAbertoCentavos).toBe(12961);
    expect(carla.diasRelativos).toBe(60);
    // multa 2% = 259; mora 1% a.m. × 60 dias = 259
    expect(carla.devidoCentavos).toBe(12961 + 259 + 259);
  });

  it("traz o último contato e a promessa que vence hoje", () => {
    const ana = fila[1];
    expect(ana.ultimoContato?.tipo).toBe("ligacao");
    expect(ana.promessa).toBe("2026-10-05");
    expect(ana.promessaVencida).toBe(true);
  });

  it("monta as variáveis da mensagem", () => {
    const v = variaveisDoItem(fila[1], { nome: "MC Créditos", pix: "(71) 91234-5678" });
    expect(v).toMatchObject({
      "cliente.primeiro_nome": "Ana",
      "parcela.numero": "2",
      "parcela.total": "3",
      "parcela.valor": "R$ 229,61",
      "parcela.vencimento": "25/09/2026",
      "parcela.dias_atraso": "10",
      "empresa.pix": "(71) 91234-5678",
    });
    expect(v["parcela.valor_atualizado"]).toBe("R$ 234,97");
  });
});

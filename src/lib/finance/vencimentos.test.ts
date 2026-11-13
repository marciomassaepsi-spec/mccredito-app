import { describe, expect, it } from "vitest";

import { remarcarVencimentos, type ParcelaParaRemarcar } from ".";

/** Parcelas p1, p2, … com as datas dadas; as `pagas` primeiras já pagas. */
function parcelas(datas: string[], pagas = 0): ParcelaParaRemarcar[] {
  return datas.map((vencimento, i) => ({
    id: `p${i + 1}`,
    numero: i + 1,
    vencimento,
    status: i < pagas ? "paga" : "a_vencer",
  }));
}

const MENSAL = ["2026-07-10", "2026-08-10", "2026-09-10", "2026-10-10", "2026-11-10", "2026-12-10"];

describe("remarcarVencimentos", () => {
  it("mensal: muda a 3ª e as seguintes para o dia 20, sem mexer nas pagas", () => {
    const r = remarcarVencimentos({
      parcelas: parcelas(MENSAL, 2),
      parcelaId: "p3",
      novaData: "2026-09-20",
      seguintes: true,
      periodicidade: "mensal",
      liberadoEm: "2026-06-10",
    });
    expect(r).toEqual({
      ok: true,
      mudancas: [
        { parcela_id: "p3", numero: 3, antes: "2026-09-10", depois: "2026-09-20" },
        { parcela_id: "p4", numero: 4, antes: "2026-10-10", depois: "2026-10-20" },
        { parcela_id: "p5", numero: 5, antes: "2026-11-10", depois: "2026-11-20" },
        { parcela_id: "p6", numero: 6, antes: "2026-12-10", depois: "2026-12-20" },
      ],
    });
  });

  it("mensal com dia 31: usa o último dia nos meses mais curtos e volta ao 31 depois", () => {
    const r = remarcarVencimentos({
      parcelas: parcelas(["2026-12-10", "2027-01-10", "2027-02-10", "2027-03-10", "2027-04-10"]),
      parcelaId: "p2",
      novaData: "2027-01-31",
      seguintes: true,
      periodicidade: "mensal",
      liberadoEm: "2026-11-10",
    });
    expect(r.ok && r.mudancas.map((m) => m.depois)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
  });

  it("quinzenal: as seguintes ficam de 15 em 15 dias a partir da nova data", () => {
    const r = remarcarVencimentos({
      parcelas: parcelas(["2026-10-01", "2026-10-16", "2026-10-31", "2026-11-15"], 1),
      parcelaId: "p2",
      novaData: "2026-10-20",
      seguintes: true,
      periodicidade: "quinzenal",
      liberadoEm: "2026-09-15",
    });
    expect(r.ok && r.mudancas.map((m) => [m.numero, m.depois])).toEqual([
      [2, "2026-10-20"],
      [3, "2026-11-04"],
      [4, "2026-11-19"],
    ]);
  });

  it("semanal: as seguintes ficam de 7 em 7 dias, virando o ano", () => {
    const r = remarcarVencimentos({
      parcelas: parcelas(["2026-12-17", "2026-12-24", "2026-12-31"]),
      parcelaId: "p1",
      novaData: "2026-12-19",
      seguintes: true,
      periodicidade: "semanal",
      liberadoEm: "2026-12-10",
    });
    expect(r.ok && r.mudancas.map((m) => m.depois)).toEqual(["2026-12-19", "2026-12-26", "2027-01-02"]);
  });

  it("só uma parcela: as outras ficam como estão", () => {
    const r = remarcarVencimentos({
      parcelas: parcelas(MENSAL, 2),
      parcelaId: "p3",
      novaData: "2026-09-25",
      seguintes: false,
      periodicidade: "mensal",
      liberadoEm: "2026-06-10",
    });
    expect(r).toEqual({ ok: true, mudancas: [{ parcela_id: "p3", numero: 3, antes: "2026-09-10", depois: "2026-09-25" }] });
  });

  it("só uma parcela: a mesma data da próxima é aceita", () => {
    const r = remarcarVencimentos({
      parcelas: parcelas(MENSAL, 2),
      parcelaId: "p3",
      novaData: "2026-10-10",
      seguintes: false,
      periodicidade: "mensal",
      liberadoEm: "2026-06-10",
    });
    expect(r.ok).toBe(true);
  });

  it("erro de ordem: só uma parcela, pulando por cima da próxima", () => {
    const r = remarcarVencimentos({
      parcelas: parcelas(MENSAL, 2),
      parcelaId: "p3",
      novaData: "2026-10-15",
      seguintes: false,
      periodicidade: "mensal",
      liberadoEm: "2026-06-10",
    });
    expect(r).toEqual({
      ok: false,
      campo: "nova_data",
      erro:
        "Com essa data, a 3ª parcela (15/10/2026) ficaria depois da 4ª (10/10/2026). Os vencimentos precisam seguir a ordem das parcelas. " +
        'Escolha uma data até 10/10/2026 ou marque "Mudar também as parcelas seguintes".',
    });
  });

  it("erro de ordem: nova data antes da parcela anterior (já paga)", () => {
    const r = remarcarVencimentos({
      parcelas: parcelas(MENSAL, 2),
      parcelaId: "p3",
      novaData: "2026-08-05",
      seguintes: true,
      periodicidade: "mensal",
      liberadoEm: "2026-06-10",
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro).toContain("a 2ª parcela (10/08/2026) ficaria depois da 3ª (05/08/2026)");
  });

  it("recusa parcela paga ou cancelada", () => {
    const base = { novaData: "2026-08-20", seguintes: true, periodicidade: "mensal" as const, liberadoEm: "2026-06-10" };
    expect(remarcarVencimentos({ ...base, parcelas: parcelas(MENSAL, 2), parcelaId: "p2" })).toMatchObject({
      ok: false,
      campo: "parcela_id",
    });
    const comCancelada = parcelas(MENSAL).map((p) => (p.numero === 2 ? { ...p, status: "cancelada" as const } : p));
    expect(remarcarVencimentos({ ...base, parcelas: comCancelada, parcelaId: "p2" })).toMatchObject({ ok: false, campo: "parcela_id" });
    expect(remarcarVencimentos({ ...base, parcelas: parcelas(MENSAL), parcelaId: "outra" })).toMatchObject({ ok: false, campo: "parcela_id" });
  });

  it("recusa data antes da liberação e data igual à atual", () => {
    const base = { parcelas: parcelas(MENSAL), parcelaId: "p1", seguintes: true, periodicidade: "mensal" as const, liberadoEm: "2026-06-10" };
    expect(remarcarVencimentos({ ...base, novaData: "2026-06-09" })).toEqual({
      ok: false,
      campo: "nova_data",
      erro: "A nova data não pode ser antes da liberação (10/06/2026).",
    });
    expect(remarcarVencimentos({ ...base, novaData: "2026-07-10" })).toMatchObject({ ok: false, campo: "nova_data" });
    expect(remarcarVencimentos({ ...base, novaData: "" })).toMatchObject({ ok: false, campo: "nova_data" });
  });

  it("paga em parte conta como em aberto e acompanha a mudança", () => {
    const lista = parcelas(MENSAL, 2).map((p) => (p.numero === 3 ? { ...p, status: "paga_parcial" as const } : p));
    const r = remarcarVencimentos({
      parcelas: lista,
      parcelaId: "p3",
      novaData: "2026-09-15",
      seguintes: true,
      periodicidade: "mensal",
      liberadoEm: "2026-06-10",
    });
    expect(r.ok && r.mudancas.map((m) => m.numero)).toEqual([3, 4, 5, 6]);
  });
});

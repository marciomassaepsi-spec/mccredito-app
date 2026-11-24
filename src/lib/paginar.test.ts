import { describe, expect, it } from "vitest";

import { problemaDasConsultas } from "./acoes";
import { lerTodas } from "./paginar";

/** Simula o Supabase: devolve no máximo `maxRows` linhas por pedido, como o "Max rows" da API. */
function bancoFalso(total: number, maxRows: number) {
  const linhas = Array.from({ length: total }, (_, i) => i);
  const pedidos: Array<[number, number]> = [];
  const pagina = async (de: number, ate: number) => {
    pedidos.push([de, ate]);
    return { data: linhas.slice(de, Math.min(ate + 1, de + maxRows)), error: null };
  };
  return { pagina, pedidos };
}

describe("ler todas as linhas, além do limite de 1000 do Supabase", () => {
  it("junta as páginas até vir uma vazia", async () => {
    const { pagina, pedidos } = bancoFalso(2500, 1000);
    const r = await lerTodas(pagina);
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(2500);
    expect(new Set(r.data).size).toBe(2500);
    expect(pedidos).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [2500, 3499],
    ]);
  });

  it("funciona mesmo se o Supabase estiver configurado com menos de 1000 linhas", async () => {
    const { pagina } = bancoFalso(1234, 300);
    const r = await lerTodas(pagina);
    expect(r.data).toHaveLength(1234);
    expect(r.data.at(-1)).toBe(1233);
  });

  it("sem linhas, um pedido só", async () => {
    const { pagina, pedidos } = bancoFalso(0, 1000);
    expect((await lerTodas(pagina)).data).toEqual([]);
    expect(pedidos).toHaveLength(1);
  });

  it("devolve o erro em vez de um total pela metade sem avisar", async () => {
    let n = 0;
    const r = await lerTodas(async () => (n++ === 0 ? { data: [1, 2], error: null } : { data: null, error: { code: "42703" } }), 2);
    expect(r.error).toEqual({ code: "42703" });
    expect(problemaDasConsultas([null, r.error])).toBe("banco");
  });
});

describe("aviso de consulta que falhou", () => {
  it("banco desatualizado tem prioridade; outro erro vira falha; sem erro, nada", () => {
    expect(problemaDasConsultas([null, undefined, null])).toBeNull();
    expect(problemaDasConsultas([null, { code: "08006" }])).toBe("falha");
    expect(problemaDasConsultas([{ code: "08006" }, { code: "PGRST202" }])).toBe("banco");
    expect(problemaDasConsultas([null, "banco"])).toBe("banco");
    expect(problemaDasConsultas(["falha"])).toBe("falha");
  });
});

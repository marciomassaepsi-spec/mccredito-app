import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { bancoDesatualizado } from "./acoes";
import { lerTodas } from "./paginar";
import type { Database } from "./supabase/database.types";
import type { EmprestimoVenda } from "./vendas";

export type VendasCarregadas = {
  emprestimos: EmprestimoVenda[];
  /** "banco": falta rodar a migration da renegociação com dinheiro novo; "falha": outro erro */
  erro: "banco" | "falha" | null;
};

/** Status das parcelas e do empréstimo entram para calcular o que falta receber */
const PARCELAS = "parcelas(valor_centavos, juros_centavos, pago_centavos, status)";

/**
 * Empréstimos que contam como venda, liberados entre as datas: sem cancelados
 * e, das renegociações, só as que tiveram dinheiro novo.
 * Lidos de página em página (lerTodas): o Supabase corta cada consulta em 1000
 * linhas sem avisar.
 * Se o banco ainda não tem a coluna dinheiro_novo_centavos, carrega como antes
 * (sem renegociações) e avisa.
 */
export async function carregarVendas(supabase: SupabaseClient<Database>, inicio: string, fim: string): Promise<VendasCarregadas> {
  const { data, error } = await lerTodas((de, ate) =>
    supabase
      .from("emprestimos")
      .select(
        `id, liberado_em, valor_centavos, taxa_percentual, qtd_parcelas, status, renegociado_de, dinheiro_novo_centavos, clientes(nome), ${PARCELAS}`,
      )
      .gte("liberado_em", inicio)
      .lte("liberado_em", fim)
      .neq("status", "cancelado")
      .or("renegociado_de.is.null,dinheiro_novo_centavos.gt.0")
      .order("liberado_em")
      .order("id")
      .range(de, ate),
  );
  if (!error) return { emprestimos: data, erro: null };
  if (!bancoDesatualizado(error)) return { emprestimos: [], erro: "falha" };

  const antigo = await lerTodas((de, ate) =>
    supabase
      .from("emprestimos")
      .select(`id, liberado_em, valor_centavos, taxa_percentual, qtd_parcelas, status, renegociado_de, clientes(nome), ${PARCELAS}`)
      .gte("liberado_em", inicio)
      .lte("liberado_em", fim)
      .neq("status", "cancelado")
      .is("renegociado_de", null)
      .order("liberado_em")
      .order("id")
      .range(de, ate),
  );
  if (antigo.error) return { emprestimos: [], erro: "falha" };
  return { emprestimos: antigo.data.map((e) => ({ ...e, dinheiro_novo_centavos: null })), erro: "banco" };
}

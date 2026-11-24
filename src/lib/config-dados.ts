import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { jurosAtrasoDiario } from "./finance";
import type { Database } from "./supabase/database.types";

/**
 * Juros de atraso por dia das Configurações, em decimal (1% = 0.01).
 * Se a leitura falhar (por exemplo, o banco ainda não tem a coluna
 * juros_atraso_dia_percentual), usa 1% ao dia, o mesmo valor que a migration
 * grava, e devolve o erro para a tela avisar.
 */
export async function carregarJurosAtraso(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("configuracoes").select("juros_atraso_dia_percentual").maybeSingle();
  return { jurosDiario: jurosAtrasoDiario(data?.juros_atraso_dia_percentual), erro: error };
}

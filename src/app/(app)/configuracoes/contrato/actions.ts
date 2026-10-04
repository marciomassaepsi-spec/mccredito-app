"use server";

import { revalidatePath } from "next/cache";

import type { EstadoForm } from "@/components/app/form";
import { falha, mensagemDoBanco } from "@/lib/acoes";
import { MODELO_PADRAO, preencherModelo, VARIAVEIS } from "@/lib/contrato";
import { requireUser } from "@/lib/supabase/server";

export async function salvarModeloContrato(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const restaurar = formData.get("restaurar") === "1";
  const modelo = restaurar ? "" : String(formData.get("modelo") ?? "").trim();
  const valores = { modelo: String(formData.get("modelo") ?? "") };

  if (!restaurar) {
    if (modelo.length < 50) return falha(valores, "O modelo ficou curto demais.", { modelo: "Escreva o contrato completo." });
    if (modelo.length > 30000) return falha(valores, "O modelo passou de 30 mil caracteres.", { modelo: "Muito longo." });
    // Confere as variáveis com valores de exemplo
    const exemplo = Object.fromEntries(VARIAVEIS.map(([nome]) => [nome, "x"]));
    const { desconhecidas } = preencherModelo(modelo, exemplo);
    if (desconhecidas.length) {
      const lista = desconhecidas.map((d) => `{{${d}}}`).join(", ");
      return falha(valores, `Estas variáveis não existem: ${lista}. Confira a lista abaixo.`, { modelo: `Corrija ${lista}.` });
    }
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("configuracoes")
    // Modelo igual ao padrão é guardado vazio, para receber melhorias futuras do padrão
    .update({ modelo_contrato: modelo === MODELO_PADRAO.trim() ? "" : modelo })
    .eq("id", true)
    .select("id");
  if (error) return falha(valores, mensagemDoBanco(error));
  if (!data?.length) return falha(valores, "Só o dono pode alterar o modelo.");

  revalidatePath("/configuracoes/contrato");
  return { ok: true, mensagem: restaurar ? "Modelo padrão restaurado." : "Modelo salvo.", erros: {}, valores: {} };
}

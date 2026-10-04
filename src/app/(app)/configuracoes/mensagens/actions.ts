"use server";

import { revalidatePath } from "next/cache";

import type { EstadoForm } from "@/components/app/form";
import { falha, lerFormulario, mensagemDoBanco } from "@/lib/acoes";
import { preencherMensagem, VARIAVEIS_MENSAGEM } from "@/lib/cobranca";
import { requireUser } from "@/lib/supabase/server";

const EXEMPLO = Object.fromEntries(VARIAVEIS_MENSAGEM.map(([nome]) => [nome, "x"]));

export async function salvarMensagens(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const dias = formData.getAll("dias").map((d) => Number(d)).filter((d) => Number.isInteger(d));

  const erros: Record<string, string> = {};
  const atualizacoes: Array<{ dias: number; texto: string; ativo: boolean }> = [];
  for (const d of dias) {
    const texto = (valores[`texto_${d}`] ?? "").trim();
    const ativo = valores[`ativo_${d}`] === "on";
    if (ativo && texto.length < 10) erros[`texto_${d}`] = "Escreva a mensagem (ou desligue este dia).";
    else if (texto.length > 1000) erros[`texto_${d}`] = "Mensagem longa demais (máximo 1.000 caracteres).";
    else {
      const { desconhecidas } = preencherMensagem(texto, EXEMPLO);
      if (desconhecidas.length) erros[`texto_${d}`] = `Variável que não existe: ${desconhecidas.map((x) => `{{${x}}}`).join(", ")}`;
    }
    atualizacoes.push({ dias: d, texto, ativo });
  }
  if (Object.keys(erros).length) return falha(valores, "Confira as mensagens destacadas.", erros);
  if (!atualizacoes.some((a) => a.ativo)) return falha(valores, "Deixe pelo menos uma mensagem ligada.");

  const { supabase } = await requireUser();
  for (const a of atualizacoes) {
    const { data, error } = await supabase
      .from("modelos_mensagem")
      .update({ texto: a.texto, ativo: a.ativo })
      .eq("dias_relativos", a.dias)
      .select("id");
    if (error) return falha(valores, mensagemDoBanco(error));
    if (!data?.length) return falha(valores, "Seu usuário não pode alterar as mensagens.");
  }

  revalidatePath("/configuracoes/mensagens");
  revalidatePath("/cobranca");
  return { ok: true, mensagem: "Mensagens salvas.", erros: {}, valores: {} };
}

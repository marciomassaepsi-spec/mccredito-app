import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase/database.types";

export const BUCKET = "documentos";
/** A Vercel recusa requisições acima de 4,5 MB; fotos são reduzidas no celular antes do envio. */
export const TAMANHO_MAXIMO = 4 * 1024 * 1024;

const TIPOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export type TipoDocumento = Database["public"]["Enums"]["tipo_documento"];

/** Lê o arquivo enviado num FormData; devolve null se o campo veio vazio. */
export function lerArquivo(formData: FormData, campo = "arquivo"): File | null {
  const f = formData.get(campo);
  return f instanceof File && f.size > 0 ? f : null;
}

export function validarArquivo(arquivo: File): string | null {
  if (!TIPOS[arquivo.type]) return "Envie PDF ou foto (JPG, PNG, WEBP).";
  if (arquivo.size > TAMANHO_MAXIMO) return "Arquivo grande demais (máximo 4 MB).";
  return null;
}

/**
 * Envia para o bucket privado e registra em `documentos`.
 * Se o registro falhar, o arquivo enviado é apagado para não ficar órfão.
 */
export async function guardarArquivo(
  supabase: SupabaseClient<Database>,
  arquivo: File | Blob,
  dados: {
    pasta: string;
    nome: string;
    tipo: TipoDocumento;
    contentType: string;
    emprestimoId?: string | null;
    clienteId?: string | null;
  },
): Promise<{ ok: true; caminho: string; id: string } | { ok: false; erro: string }> {
  const extensao = TIPOS[dados.contentType] ?? "bin";
  const caminho = `${dados.pasta}/${crypto.randomUUID()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: dados.contentType, upsert: false });
  if (erroUpload) return { ok: false, erro: "Não foi possível enviar o arquivo. Tente de novo." };

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      caminho,
      nome_arquivo: dados.nome.slice(0, 200) || `arquivo.${extensao}`,
      tipo: dados.tipo,
      tamanho_bytes: arquivo.size,
      emprestimo_id: dados.emprestimoId ?? null,
      cliente_id: dados.clienteId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    return { ok: false, erro: "Não foi possível registrar o arquivo." };
  }
  return { ok: true, caminho, id: data.id };
}

/** Link para abrir um arquivo guardado (passa pela checagem de acesso). */
export function linkArquivo(caminho: string) {
  return `/arquivos/${caminho}`;
}

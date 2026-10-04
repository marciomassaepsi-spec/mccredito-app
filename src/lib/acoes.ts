import type { z } from "zod";

import type { EstadoForm } from "@/components/app/form";

/** Lê os campos de texto de um FormData. */
export function lerFormulario(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (typeof valor === "string" && !chave.startsWith("$ACTION")) valores[chave] = valor;
  }
  return valores;
}

/** Converte os erros do Zod em { campo: primeira mensagem }. */
export function errosDoZod(erro: z.ZodError): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = String(issue.path[0] ?? "geral");
    erros[campo] ??= issue.message;
  }
  return erros;
}

export function falha(valores: Record<string, string>, mensagem: string, erros: Record<string, string> = {}): EstadoForm {
  return { ok: false, mensagem, erros, valores };
}

/** Traduz erros do banco em mensagens que o dono entende. */
export function mensagemDoBanco(erro: { code?: string; message?: string } | null): string {
  if (!erro) return "Algo deu errado. Tente de novo.";
  const msg = erro.message ?? "";
  if (erro.code === "23505" && msg.includes("cpf")) return "Já existe um cliente com esse CPF.";
  if (msg.startsWith("LIMITE_CONTRATOS")) {
    return "Você chegou ao limite de contratos ativos. Quite ou cancele algum, ou aumente o limite nas Configurações.";
  }
  if (msg.startsWith("SEM_PERMISSAO")) return "Só o dono pode fazer isso.";
  if (msg.startsWith("MOTIVO_OBRIGATORIO")) return "Informe o motivo.";
  if (msg.startsWith("NAO_ENCONTRADO")) return "Não encontrado, ou já não está ativo.";
  if (erro.code === "42501") return "Seu usuário não tem permissão para isso.";
  if (erro.code === "23503") return "Não dá para apagar: há registros ligados a este.";
  return "Não foi possível salvar agora. Confira sua internet e tente de novo.";
}

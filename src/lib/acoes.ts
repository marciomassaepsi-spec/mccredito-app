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

/** Mostrado quando o app pede ao banco algo de uma migration que ainda não foi rodada. */
export const FALTA_ATUALIZAR_BANCO =
  "Falta atualizar o banco de dados: no Supabase, rode no SQL Editor a migration mais nova da pasta supabase/migrations (veja o README).";

/** Função SQL (PGRST202) ou coluna (42703) que ainda não existe no banco. */
export function bancoDesatualizado(erro: { code?: string } | null): boolean {
  return erro?.code === "PGRST202" || erro?.code === "42703";
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
  if (msg.startsWith("PARCELA_FECHADA")) return "Esta parcela já está paga ou cancelada. Atualize a tela.";
  if (msg.startsWith("VALOR_ACIMA")) return "O valor passa do que falta nesta parcela. Atualize a tela e confira.";
  if (msg.startsWith("VALOR_INVALIDO")) return "Valor inválido.";
  if (msg.startsWith("EMPRESTIMO_INATIVO")) return "Este empréstimo não está mais ativo.";
  if (msg.startsWith("QUITACAO_INCOMPLETA")) return "As parcelas mudaram enquanto você conferia. Atualize a tela e tente de novo.";
  if (msg.startsWith("CRONOGRAMA_INVALIDO")) return "As parcelas calculadas não conferem. Revise os valores.";
  if (msg.startsWith("JA_PAGAS_INVALIDO")) return "Parcelas já pagas precisa ser menor que o total de parcelas.";
  if (msg.startsWith("SALDO_MUDOU")) {
    return "O saldo do empréstimo mudou enquanto você conferia (talvez um pagamento entrou agora). Atualize a tela e confira os valores.";
  }
  if (msg.startsWith("DATA_INVALIDA")) return "A data da renegociação precisa ser entre a data do empréstimo e hoje.";
  if (msg.startsWith("SEM_ACESSO")) return "Só o dono ou um operador pode fazer isso.";
  if (msg.startsWith("VENCIMENTO_ANTES_LIBERACAO")) return "O vencimento não pode ser antes da data em que o dinheiro foi liberado.";
  if (msg.startsWith("ORDEM_VENCIMENTOS")) {
    const detalhe = msg.slice(msg.indexOf(":") + 1).trim();
    return `Os vencimentos ficariam fora de ordem: ${detalhe}. Atualize a tela e confira as datas.`;
  }
  if (msg.startsWith("VENCIMENTO_INVALIDO")) return "As datas não conferem com as parcelas de agora. Atualize a tela e tente de novo.";
  // Função SQL ou coluna que ainda não existe no banco: faltou rodar a migration nova
  if (bancoDesatualizado(erro)) return FALTA_ATUALIZAR_BANCO;
  if (erro.code === "42501") return "Seu usuário não tem permissão para isso.";
  if (erro.code === "23503") return "Não dá para apagar: há registros ligados a este.";
  return "Não foi possível salvar agora. Confira sua internet e tente de novo.";
}

/** Problema numa tela que lê o banco: "banco" = falta rodar migration; "falha" = outro erro. */
export type ProblemaBanco = "banco" | "falha" | null;

/**
 * Junta os erros das consultas de uma tela. Uma consulta que falha devolve
 * `data` vazio: sem este aviso, a tela mostraria totais pela metade como se
 * estivessem certos. Banco desatualizado tem prioridade, porque diz o que fazer.
 */
export function problemaDasConsultas(erros: Array<{ code?: string } | ProblemaBanco | undefined>): ProblemaBanco {
  let problema: ProblemaBanco = null;
  for (const erro of erros) {
    if (!erro) continue;
    if (erro === "banco" || (typeof erro === "object" && bancoDesatualizado(erro))) return "banco";
    problema = "falha";
  }
  return problema;
}

export function textoDoProblema(problema: Exclude<ProblemaBanco, null>): string {
  if (problema === "banco") return FALTA_ATUALIZAR_BANCO;
  return "Não foi possível ler tudo do banco agora: os valores desta tela podem estar incompletos. Confira a internet e atualize a tela.";
}

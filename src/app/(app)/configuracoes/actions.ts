"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { EstadoForm } from "@/components/app/form";
import { errosDoZod, falha, lerFormulario, mensagemDoBanco } from "@/lib/acoes";
import { cnpjValido, cpfValido } from "@/lib/format";
import { normalizarChavePix, type TipoChavePix } from "@/lib/pix";
import { requireUser } from "@/lib/supabase/server";

/** Percentual digitado ("1", "0,5", "1%") dentro de uma faixa. */
const percentual = (rotulo: string, maximo: number) =>
  z
    .string()
    .refine((v) => v.trim() !== "", `${rotulo}: digite um número de 0 a ${maximo}.`)
    .transform((v) => Number(v.replace(",", ".").replace("%", "").trim()))
    .refine((v) => Number.isFinite(v) && v >= 0 && v <= maximo, `${rotulo}: digite um número de 0 a ${maximo}.`);

const hora = z.string().regex(/^\d{2}:\d{2}$/, "Escolha o horário.");

const configSchema = z
  .object({
    nome_empresa: z.string().trim().min(2, "Digite o nome da empresa.").max(80),
    // Opcional: sem CNPJ, o contrato sai com uma linha em branco para preencher à mão
    cnpj_empresa: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v === "" || cnpjValido(v), "CNPJ inválido. Confira os 14 números."),
    razao_social: z.string().trim().max(120),
    documento_empresa: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v === "" || cpfValido(v) || cnpjValido(v), "CPF ou CNPJ inválido."),
    cidade: z.string().trim().max(80),
    tipo_chave_pix: z.enum(["", "cpf", "cnpj", "telefone", "email", "aleatoria"]),
    chave_pix: z.string().trim().max(120),
    nome_recebedor_pix: z.string().trim().max(120),
    // 1% ao dia sobre o valor em aberto da parcela, sem multa e sem teto (o banco aceita de 0 a 10)
    juros_atraso_dia_percentual: percentual("Juros por dia de atraso", 10),
    cobranca_hora_inicio: hora,
    cobranca_hora_fim: hora,
    limite_contratos_ativos: z.coerce.number().int().min(1, "Mínimo 1.").max(10000, "Máximo 10.000."),
  })
  .refine((d) => d.cobranca_hora_inicio < d.cobranca_hora_fim, {
    path: ["cobranca_hora_fim"],
    message: "O fim precisa ser depois do início.",
  });

export async function salvarConfiguracoes(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const dados = configSchema.safeParse(valores);

  // A chave PIX é conferida junto, para todos os erros aparecerem de uma vez
  const errosPix: Record<string, string> = {};
  let chave = "";
  const tipo = valores.tipo_chave_pix ?? "";
  const textoChave = (valores.chave_pix ?? "").trim();
  if (textoChave) {
    if (!tipo) errosPix.tipo_chave_pix = "Escolha o tipo da chave.";
    else {
      const r = normalizarChavePix(tipo as TipoChavePix, textoChave);
      if (r.ok) chave = r.chave;
      else errosPix.chave_pix = r.erro;
    }
  }

  const erros = { ...(dados.success ? {} : errosDoZod(dados.error)), ...errosPix };
  if (!dados.success || Object.keys(erros).length > 0) {
    return falha(valores, "Confira os campos destacados.", erros);
  }
  const d = dados.data;

  const { supabase } = await requireUser();
  const { data: salvo, error } = await supabase
    .from("configuracoes")
    .update({
      ...d,
      chave_pix: chave,
      tipo_chave_pix: chave ? d.tipo_chave_pix : "",
      nome_recebedor_pix: d.nome_recebedor_pix || d.razao_social,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", true)
    .select("id");
  if (error) return falha(valores, mensagemDoBanco(error));
  // Com RLS, quem não é dono atualiza zero linhas sem erro
  if (!salvo?.length) return falha(valores, "Só o dono pode alterar as configurações.");

  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Configurações salvas.", erros: {}, valores: {} };
}

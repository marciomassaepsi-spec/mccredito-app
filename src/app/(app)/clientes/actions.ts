"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { EstadoForm } from "@/components/app/form";
import { errosDoZod, falha, lerFormulario, mensagemDoBanco } from "@/lib/acoes";
import { cpfValido, normalizarTelefone } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

const clienteSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nome: z.string().trim().min(3, "Digite o nome completo.").max(120, "Nome muito longo."),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine(cpfValido, "CPF inválido. Confira os números."),
  whatsapp: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return "";
      const tel = normalizarTelefone(v);
      if (!tel) {
        ctx.addIssue({ code: "custom", message: "Telefone com DDD, ex.: (71) 91234-5678." });
        return z.NEVER;
      }
      return tel;
    }),
  endereco: z.string().trim().max(300, "Endereço muito longo."),
  observacoes: z.string().trim().max(2000, "Observação muito longa."),
  consentimento: z.literal("on", { error: "É preciso registrar a autorização do cliente." }),
  voltar: z.string().optional(),
});

export async function salvarCliente(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const dados = clienteSchema.safeParse({ ...valores, consentimento: valores.consentimento ?? "" });
  if (!dados.success) return falha(valores, "Confira os campos destacados.", errosDoZod(dados.error));

  const { supabase } = await requireUser();
  const { id, voltar, nome, cpf, whatsapp, endereco, observacoes } = dados.data;
  const campos = { nome, cpf, whatsapp, endereco, observacoes };

  let clienteId = id || "";
  if (clienteId) {
    const { error } = await supabase.from("clientes").update(campos).eq("id", clienteId);
    if (error) return falha(valores, mensagemDoBanco(error));
  } else {
    const { data, error } = await supabase
      .from("clientes")
      .insert({ ...campos, consentimento_lgpd_em: new Date().toISOString() })
      .select("id")
      .single();
    if (error || !data) return falha(valores, mensagemDoBanco(error));
    clienteId = data.id;
  }

  if (voltar === "emprestimo") redirect(`/emprestimos/novo?cliente=${clienteId}`);
  redirect(`/clientes/${clienteId}`);
}

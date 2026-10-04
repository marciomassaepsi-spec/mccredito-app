"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { EstadoForm } from "@/components/app/form";
import { errosDoZod, falha, lerFormulario, mensagemDoBanco } from "@/lib/acoes";
import { hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

const contatoSchema = z
  .object({
    cliente_id: z.string().uuid(),
    parcela_id: z.string().uuid().optional().or(z.literal("")),
    tipo: z.enum(["whatsapp", "ligacao", "visita", "outro"]),
    resultado: z.enum(["prometeu_pagar", "nao_atendeu", "negociando", "pagou", "recusou", "outro"], {
      error: "Escolha o que aconteceu.",
    }),
    promessa_para: z.string().optional(),
    observacoes: z.string().trim().max(500),
  })
  .superRefine((d, ctx) => {
    if (d.resultado !== "prometeu_pagar") return;
    if (!d.promessa_para || !/^\d{4}-\d{2}-\d{2}$/.test(d.promessa_para)) {
      ctx.addIssue({ code: "custom", path: ["promessa_para"], message: "Qual dia ele prometeu pagar?" });
    } else if (d.promessa_para < hojeISO()) {
      ctx.addIssue({ code: "custom", path: ["promessa_para"], message: "A promessa não pode ser para um dia que já passou." });
    }
  });

export async function registrarContato(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const dados = contatoSchema.safeParse(valores);
  if (!dados.success) return falha(valores, "Confira os campos destacados.", errosDoZod(dados.error));
  const d = dados.data;

  const { supabase } = await requireUser();
  const { error } = await supabase.from("contatos_cobranca").insert({
    cliente_id: d.cliente_id,
    parcela_id: d.parcela_id || null,
    tipo: d.tipo,
    resultado: d.resultado,
    promessa_para: d.resultado === "prometeu_pagar" ? (d.promessa_para ?? null) : null,
    observacoes: d.observacoes,
  });
  if (error) return falha(valores, mensagemDoBanco(error));

  revalidatePath("/cobranca");
  revalidatePath(`/clientes/${d.cliente_id}`);
  return { ok: true, mensagem: "Contato registrado.", erros: {}, valores: {} };
}

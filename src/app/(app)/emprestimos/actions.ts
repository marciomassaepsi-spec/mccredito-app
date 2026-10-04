"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { EstadoForm } from "@/components/app/form";
import { errosDoZod, falha, lerFormulario, mensagemDoBanco } from "@/lib/acoes";
import { montarParcelas } from "@/lib/emprestimos";
import { parsePercentual, parseReaisParaCentavos } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data.");

const emprestimoSchema = z
  .object({
    cliente_id: z.string().uuid("Escolha o cliente."),
    valor: z
      .string()
      .transform((v) => parseReaisParaCentavos(v))
      .refine((v): v is number => v !== null && v > 0, "Digite o valor, ex.: 1.500,00"),
    taxa: z
      .string()
      .transform((v) => parsePercentual(v))
      .refine((v): v is number => v !== null && v <= 10, "Digite a taxa, ex.: 9,99"),
    sistema: z.enum(["price", "sac", "simples"]),
    qtd_parcelas: z.coerce.number().int("Número inteiro.").min(1, "Mínimo 1.").max(360, "Máximo 360."),
    periodicidade: z.enum(["mensal", "quinzenal", "semanal"]),
    liberado_em: data,
    primeiro_vencimento: data,
    observacoes: z.string().trim().max(2000),
  })
  .refine((d) => d.primeiro_vencimento >= d.liberado_em, {
    path: ["primeiro_vencimento"],
    message: "O 1º vencimento não pode ser antes da liberação.",
  });

export async function criarEmprestimo(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const dados = emprestimoSchema.safeParse(valores);
  if (!dados.success) return falha(valores, "Confira os campos destacados.", errosDoZod(dados.error));
  const d = dados.data;

  // O cronograma é sempre recalculado aqui no servidor, nunca aceito do navegador.
  const parcelas = montarParcelas({
    sistema: d.sistema,
    valorCentavos: d.valor,
    taxaMensal: d.taxa,
    qtdParcelas: d.qtd_parcelas,
    primeiroVencimento: d.primeiro_vencimento,
    periodicidade: d.periodicidade,
  });

  const { supabase } = await requireUser();
  const { data: id, error } = await supabase.rpc("criar_emprestimo", {
    p_emprestimo: {
      cliente_id: d.cliente_id,
      valor_centavos: d.valor,
      taxa_percentual: Math.round(d.taxa * 100 * 10000) / 10000,
      sistema: d.sistema,
      qtd_parcelas: d.qtd_parcelas,
      periodicidade: d.periodicidade,
      liberado_em: d.liberado_em,
      primeiro_vencimento: d.primeiro_vencimento,
      observacoes: d.observacoes,
    },
    p_parcelas: parcelas,
  });

  if (error || !id) return falha(valores, mensagemDoBanco(error));
  redirect(`/emprestimos/${id}`);
}

export async function cancelarEmprestimo(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const id = z.string().uuid().safeParse(valores.id);
  const motivo = (valores.motivo ?? "").trim();
  if (!id.success) return falha(valores, "Empréstimo inválido.");
  if (motivo.length < 3) return falha(valores, "Escreva o motivo do cancelamento.", { motivo: "Obrigatório." });

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("cancelar_emprestimo", { p_id: id.data, p_motivo: motivo });
  if (error) return falha(valores, mensagemDoBanco(error));
  redirect(`/emprestimos/${id.data}`);
}

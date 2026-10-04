"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { EstadoForm } from "@/components/app/form";
import { errosDoZod, falha, lerFormulario, mensagemDoBanco } from "@/lib/acoes";
import { BUCKET, guardarArquivo, lerArquivo, validarArquivo, type TipoDocumento } from "@/lib/arquivos";
import { montarVariaveis, preencherModelo } from "@/lib/contrato";
import { carregarDadosContrato, nomeArquivoContrato } from "@/lib/contrato-dados";
import { gerarContratoPDF } from "@/lib/contrato-pdf";
import { montarParcelas } from "@/lib/emprestimos";
import { hojeISO, parsePercentual, parseReaisParaCentavos } from "@/lib/format";
import { alocarRecebimento, encargosNaData, planoQuitacao } from "@/lib/pagamentos";
import { requireUser } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data.")
  .refine((d) => d <= hojeISO(), "Não pode ser uma data futura.");
const forma = z.enum(["pix", "dinheiro", "transferencia", "outro"], { error: "Escolha a forma de pagamento." });
const uuid = z.string().uuid();

async function encargosDaConfig(supabase: Supabase) {
  const { data: c } = await supabase.from("configuracoes").select("multa_percentual, mora_percentual_mes").maybeSingle();
  return { multa: Number(c?.multa_percentual ?? 2) / 100, mora: Number(c?.mora_percentual_mes ?? 1) / 100 };
}

/** Envia o comprovante (se houver). Devolve o caminho, "" sem arquivo, ou um erro. */
async function enviarComprovante(supabase: Supabase, formData: FormData, emprestimoId: string) {
  const arquivo = lerArquivo(formData);
  if (!arquivo) return { ok: true as const, caminho: "", docId: null };
  const erro = validarArquivo(arquivo);
  if (erro) return { ok: false as const, erro };
  const r = await guardarArquivo(supabase, arquivo, {
    pasta: `emprestimos/${emprestimoId}`,
    nome: arquivo.name,
    tipo: "comprovante",
    contentType: arquivo.type,
    emprestimoId,
  });
  return r.ok ? { ok: true as const, caminho: r.caminho, docId: r.id } : r;
}

async function desfazerComprovante(supabase: Supabase, caminho: string, docId: string | null) {
  if (!caminho) return;
  if (docId) await supabase.from("documentos").delete().eq("id", docId);
  await supabase.storage.from(BUCKET).remove([caminho]);
}

// ---------------------------------------------------------------------------
// Receber uma parcela
// ---------------------------------------------------------------------------
const pagamentoSchema = z.object({
  emprestimo_id: uuid,
  parcela_id: uuid,
  pago_em: data,
  recebido: z.string().transform((v) => parseReaisParaCentavos(v)),
  dispensar: z.string().optional(),
  forma,
  observacoes: z.string().trim().max(500),
});

export async function registrarPagamento(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const dados = pagamentoSchema.safeParse(valores);
  if (!dados.success) return falha(valores, "Confira os campos destacados.", errosDoZod(dados.error));
  const d = dados.data;

  const { supabase } = await requireUser();
  const { data: parcela } = await supabase
    .from("parcelas")
    .select("id, numero, vencimento, valor_centavos, pago_centavos, status, emprestimo_id")
    .eq("id", d.parcela_id)
    .eq("emprestimo_id", d.emprestimo_id)
    .maybeSingle();
  if (!parcela) return falha(valores, "Parcela não encontrada.");

  // Valores sempre recalculados aqui, com a configuração atual
  const { multa, mora } = await encargosDaConfig(supabase);
  const encargos = encargosNaData(parcela, d.pago_em, multa, mora);
  const alocacao = alocarRecebimento(d.recebido ?? 0, encargos, d.dispensar === "on");
  if (!alocacao.ok) return falha(valores, alocacao.erro, { recebido: alocacao.erro });

  const comprovante = await enviarComprovante(supabase, formData, d.emprestimo_id);
  if (!comprovante.ok) return falha(valores, comprovante.erro, { arquivo: comprovante.erro });

  const { error } = await supabase.rpc("registrar_pagamento", {
    p_parcela: parcela.id,
    p_valor: alocacao.valor,
    p_multa: alocacao.multa,
    p_mora: alocacao.mora,
    p_desconto: 0,
    p_pago_em: d.pago_em,
    p_forma: d.forma,
    p_comprovante: comprovante.caminho,
    p_observacoes: d.observacoes,
  });
  if (error) {
    await desfazerComprovante(supabase, comprovante.caminho, comprovante.docId);
    return falha(valores, mensagemDoBanco(error));
  }
  redirect(`/emprestimos/${d.emprestimo_id}?ok=${alocacao.parcial ? "parcial" : "pago"}`);
}

// ---------------------------------------------------------------------------
// Estornar pagamento
// ---------------------------------------------------------------------------
export async function estornarPagamento(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const pagamento = uuid.safeParse(valores.pagamento_id);
  const emprestimo = uuid.safeParse(valores.emprestimo_id);
  const motivo = (valores.motivo ?? "").trim();
  if (!pagamento.success || !emprestimo.success) return falha(valores, "Pagamento inválido.");
  if (motivo.length < 3) return falha(valores, "Escreva o motivo do estorno.", { motivo: "Obrigatório." });

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("estornar_pagamento", { p_pagamento: pagamento.data, p_motivo: motivo });
  if (error) return falha(valores, mensagemDoBanco(error));
  redirect(`/emprestimos/${emprestimo.data}?ok=estorno`);
}

// ---------------------------------------------------------------------------
// Quitação antecipada
// ---------------------------------------------------------------------------
const quitacaoSchema = z.object({
  emprestimo_id: uuid,
  pago_em: data,
  dispensar: z.string().optional(),
  forma,
  observacoes: z.string().trim().max(500),
});

export async function quitarEmprestimo(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const dados = quitacaoSchema.safeParse(valores);
  if (!dados.success) return falha(valores, "Confira os campos destacados.", errosDoZod(dados.error));
  const d = dados.data;

  const { supabase } = await requireUser();
  const { data: e } = await supabase
    .from("emprestimos")
    .select("id, taxa_percentual, status, parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status)")
    .eq("id", d.emprestimo_id)
    .maybeSingle();
  if (!e || e.status !== "ativo") return falha(valores, "Empréstimo não encontrado ou não está ativo.");

  const abertas = e.parcelas.filter((p) => p.status === "a_vencer" || p.status === "paga_parcial");
  const { multa, mora } = await encargosDaConfig(supabase);
  const plano = planoQuitacao(abertas, Number(e.taxa_percentual) / 100, d.pago_em, multa, mora, d.dispensar === "on");

  const comprovante = await enviarComprovante(supabase, formData, d.emprestimo_id);
  if (!comprovante.ok) return falha(valores, comprovante.erro, { arquivo: comprovante.erro });

  const { error } = await supabase.rpc("quitar_emprestimo", {
    p_emprestimo: e.id,
    p_itens: plano.itens.map(({ parcela_id, valor, multa: m, mora: j, desconto }) => ({
      parcela_id,
      valor,
      multa: m,
      mora: j,
      desconto,
    })),
    p_pago_em: d.pago_em,
    p_forma: d.forma,
    p_comprovante: comprovante.caminho,
    p_observacoes: d.observacoes || "Quitação antecipada",
  });
  if (error) {
    await desfazerComprovante(supabase, comprovante.caminho, comprovante.docId);
    return falha(valores, mensagemDoBanco(error));
  }
  redirect(`/emprestimos/${e.id}?ok=quitado`);
}

// ---------------------------------------------------------------------------
// Renegociação
// ---------------------------------------------------------------------------
const renegociacaoSchema = z
  .object({
    emprestimo_id: uuid,
    valor: z
      .string()
      .transform((v) => parseReaisParaCentavos(v))
      .refine((v): v is number => v !== null && v > 0, "Digite o novo valor."),
    taxa: z
      .string()
      .transform((v) => parsePercentual(v))
      .refine((v): v is number => v !== null && v <= 10, "Digite a taxa, ex.: 9,99"),
    sistema: z.enum(["price", "sac", "simples"]),
    qtd_parcelas: z.coerce.number().int().min(1, "Mínimo 1.").max(360, "Máximo 360."),
    periodicidade: z.enum(["mensal", "quinzenal", "semanal"]),
    primeiro_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data."),
    motivo: z.string().trim().min(3, "Escreva o motivo."),
  })
  .refine((d) => d.primeiro_vencimento >= hojeISO(), {
    path: ["primeiro_vencimento"],
    message: "O 1º vencimento não pode ser antes de hoje.",
  });

export async function renegociarEmprestimo(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const dados = renegociacaoSchema.safeParse(valores);
  if (!dados.success) return falha(valores, "Confira os campos destacados.", errosDoZod(dados.error));
  const d = dados.data;

  const { supabase } = await requireUser();
  const { data: antigo } = await supabase.from("emprestimos").select("id, cliente_id").eq("id", d.emprestimo_id).maybeSingle();
  if (!antigo) return falha(valores, "Empréstimo não encontrado.");

  const parcelas = montarParcelas({
    sistema: d.sistema,
    valorCentavos: d.valor,
    taxaMensal: d.taxa,
    qtdParcelas: d.qtd_parcelas,
    primeiroVencimento: d.primeiro_vencimento,
    periodicidade: d.periodicidade,
  });

  const { data: novoId, error } = await supabase.rpc("renegociar_emprestimo", {
    p_antigo: antigo.id,
    p_novo: {
      cliente_id: antigo.cliente_id,
      valor_centavos: d.valor,
      taxa_percentual: Math.round(d.taxa * 100 * 10000) / 10000,
      sistema: d.sistema,
      qtd_parcelas: d.qtd_parcelas,
      periodicidade: d.periodicidade,
      liberado_em: hojeISO(),
      primeiro_vencimento: d.primeiro_vencimento,
      observacoes: `Renegociação do empréstimo anterior. ${d.motivo}`,
    },
    p_parcelas: parcelas,
    p_motivo: d.motivo,
  });
  if (error || !novoId) return falha(valores, mensagemDoBanco(error));
  redirect(`/emprestimos/${novoId}?ok=renegociado`);
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------
const TIPOS_DOCUMENTO = ["contrato", "promissoria", "documento_cliente", "comprovante", "outro"] as const;

export async function enviarDocumento(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = lerFormulario(formData);
  const emprestimoId = uuid.safeParse(valores.emprestimo_id).data ?? null;
  const clienteId = uuid.safeParse(valores.cliente_id).data ?? null;
  const tipo = z.enum(TIPOS_DOCUMENTO).safeParse(valores.tipo);
  if (!emprestimoId && !clienteId) return falha(valores, "Documento sem destino.");
  if (!tipo.success) return falha(valores, "Escolha o tipo do documento.", { tipo: "Escolha o tipo." });

  const arquivo = lerArquivo(formData);
  if (!arquivo) return falha(valores, "Escolha o arquivo.", { arquivo: "Escolha o arquivo." });
  const erroArquivo = validarArquivo(arquivo);
  if (erroArquivo) return falha(valores, erroArquivo, { arquivo: erroArquivo });

  const { supabase } = await requireUser();
  const r = await guardarArquivo(supabase, arquivo, {
    pasta: emprestimoId ? `emprestimos/${emprestimoId}` : `clientes/${clienteId}`,
    nome: arquivo.name,
    tipo: tipo.data as TipoDocumento,
    contentType: arquivo.type,
    emprestimoId,
    clienteId,
  });
  if (!r.ok) return falha(valores, r.erro);

  revalidatePath(emprestimoId ? `/emprestimos/${emprestimoId}` : `/clientes/${clienteId}`);
  return { ok: true, mensagem: "Documento guardado.", erros: {}, valores: {} };
}

export async function apagarDocumento(formData: FormData) {
  const id = uuid.safeParse(formData.get("id"));
  const voltar = String(formData.get("voltar") ?? "/");
  if (!id.success) return;
  const { supabase } = await requireUser();
  const { data: doc } = await supabase.from("documentos").select("caminho").eq("id", id.data).maybeSingle();
  if (!doc) return;
  // A regra do banco só deixa o dono apagar; se a linha não sair, o arquivo fica
  const { data: apagados } = await supabase.from("documentos").delete().eq("id", id.data).select("id");
  if (apagados?.length) await supabase.storage.from(BUCKET).remove([doc.caminho]);
  revalidatePath(voltar.startsWith("/") ? voltar : "/");
}

export async function guardarContrato(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const id = uuid.safeParse(formData.get("emprestimo_id"));
  if (!id.success) return falha({}, "Empréstimo inválido.");
  const { supabase } = await requireUser();
  const carregado = await carregarDadosContrato(supabase, id.data);
  if (!carregado) return falha({}, "Empréstimo não encontrado.");

  const { blocos, desconhecidas } = preencherModelo(carregado.modelo, montarVariaveis(carregado.dados));
  if (desconhecidas.length) {
    return falha({}, `O modelo de contrato tem variáveis que não existem: ${desconhecidas.join(", ")}. Corrija em Configurações.`);
  }
  const pdf = await gerarContratoPDF(blocos, carregado.dados);
  const r = await guardarArquivo(supabase, new Blob([pdf.slice()], { type: "application/pdf" }), {
    pasta: `emprestimos/${id.data}`,
    nome: nomeArquivoContrato(carregado.dados.cliente.nome, carregado.dados.hoje),
    tipo: "contrato",
    contentType: "application/pdf",
    emprestimoId: id.data,
  });
  if (!r.ok) return falha({}, r.erro);
  revalidatePath(`/emprestimos/${id.data}`);
  return { ok: true, mensagem: "Contrato guardado nos documentos.", erros: {}, valores: {} };
}

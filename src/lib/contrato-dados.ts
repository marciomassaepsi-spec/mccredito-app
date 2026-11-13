import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { modeloEmUso, type DadosContrato } from "./contrato";
import { hojeISO } from "./format";
import type { Database } from "./supabase/database.types";

/** Junta tudo que o contrato precisa. Devolve null se o empréstimo não existe (ou não é visível). */
export async function carregarDadosContrato(
  supabase: SupabaseClient<Database>,
  emprestimoId: string,
): Promise<{ dados: DadosContrato; modelo: string } | null> {
  const [{ data: e }, { data: config }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select(
        "id, valor_centavos, taxa_percentual, sistema, periodicidade, liberado_em, renegociado_de, clientes(nome, cpf, endereco), parcelas(numero, vencimento, valor_centavos)",
      )
      .eq("id", emprestimoId)
      .order("numero", { referencedTable: "parcelas" })
      .maybeSingle(),
    supabase
      .from("configuracoes")
      .select(
        "nome_empresa, cnpj_empresa, razao_social, documento_empresa, cidade, tipo_chave_pix, chave_pix, nome_recebedor_pix, juros_atraso_dia_percentual, modelo_contrato",
      )
      .maybeSingle(),
  ]);
  if (!e || !e.clientes || !config) return null;
  const renegociacao = e.renegociado_de ? await carregarRenegociacao(supabase, e.id, e.renegociado_de, e.valor_centavos) : null;

  return {
    modelo: modeloEmUso(config.modelo_contrato),
    dados: {
      empresa: {
        nome: config.nome_empresa,
        cnpj: config.cnpj_empresa,
        razaoSocial: config.razao_social,
        documento: config.documento_empresa,
        cidade: config.cidade,
        tipoChavePix: config.tipo_chave_pix,
        chavePix: config.chave_pix,
        nomeRecebedorPix: config.nome_recebedor_pix,
      },
      cliente: { nome: e.clientes.nome, cpf: e.clientes.cpf ?? "", endereco: e.clientes.endereco },
      emprestimo: {
        valorCentavos: e.valor_centavos,
        taxaPercentual: Number(e.taxa_percentual),
        sistema: e.sistema,
        periodicidade: e.periodicidade,
        liberadoEm: e.liberado_em,
        jurosAtrasoDiaPercentual: Number(config.juros_atraso_dia_percentual),
      },
      parcelas: e.parcelas,
      renegociacao,
      hoje: hojeISO(),
    },
  };
}

/**
 * Contrato anterior e dinheiro novo de uma renegociação. Sem a coluna
 * dinheiro_novo_centavos (banco ainda não atualizado), conta como sem dinheiro novo.
 */
async function carregarRenegociacao(
  supabase: SupabaseClient<Database>,
  id: string,
  anteriorId: string,
  valorCentavos: number,
): Promise<NonNullable<DadosContrato["renegociacao"]> | null> {
  const [{ data: anterior }, { data: novo }] = await Promise.all([
    supabase.from("emprestimos").select("liberado_em").eq("id", anteriorId).maybeSingle(),
    supabase.from("emprestimos").select("dinheiro_novo_centavos").eq("id", id).maybeSingle(),
  ]);
  if (!anterior) return null;
  const dinheiroNovo = novo?.dinheiro_novo_centavos ?? 0;
  return { contratoAnteriorEm: anterior.liberado_em, saldoAnteriorCentavos: valorCentavos - dinheiroNovo, dinheiroNovoCentavos: dinheiroNovo };
}

/** Nome do arquivo: "contrato-josiane-ferreira-2026-10-05.pdf" */
export function nomeArquivoContrato(cliente: string, data: string) {
  const slug = cliente
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `contrato-${slug}-${data}.pdf`;
}

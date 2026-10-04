import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MODELO_PADRAO, type DadosContrato } from "./contrato";
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
        "id, valor_centavos, taxa_percentual, sistema, periodicidade, liberado_em, clientes(nome, cpf, endereco), parcelas(numero, vencimento, valor_centavos)",
      )
      .eq("id", emprestimoId)
      .order("numero", { referencedTable: "parcelas" })
      .maybeSingle(),
    supabase
      .from("configuracoes")
      .select("nome_empresa, razao_social, documento_empresa, cidade, tipo_chave_pix, chave_pix, multa_percentual, mora_percentual_mes, modelo_contrato")
      .maybeSingle(),
  ]);
  if (!e || !e.clientes || !config) return null;

  return {
    modelo: config.modelo_contrato.trim() || MODELO_PADRAO,
    dados: {
      empresa: {
        nome: config.nome_empresa,
        razaoSocial: config.razao_social,
        documento: config.documento_empresa,
        cidade: config.cidade,
        tipoChavePix: config.tipo_chave_pix,
        chavePix: config.chave_pix,
      },
      cliente: { nome: e.clientes.nome, cpf: e.clientes.cpf ?? "", endereco: e.clientes.endereco },
      emprestimo: {
        valorCentavos: e.valor_centavos,
        taxaPercentual: Number(e.taxa_percentual),
        sistema: e.sistema,
        periodicidade: e.periodicidade,
        liberadoEm: e.liberado_em,
        multaPercentual: Number(config.multa_percentual),
        moraPercentual: Number(config.mora_percentual_mes),
      },
      parcelas: e.parcelas,
      hoje: hojeISO(),
    },
  };
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

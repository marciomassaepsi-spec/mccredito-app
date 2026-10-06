"use server";

import { z } from "zod";

import { mensagemDoBanco } from "@/lib/acoes";
import { hojeISO } from "@/lib/format";
import { conferirLinha, lerLinhas, paraFuncaoSQL, type LinhaPlanilha } from "@/lib/importacao";
import { lerArquivoPlanilha } from "@/lib/planilha";
import { requireUser } from "@/lib/supabase/server";

import { INICIO_IMPORTACAO, MAX_LINHAS, type EstadoImportacao } from "./estado";

function falhou(erro: string): EstadoImportacao {
  return { ...INICIO_IMPORTACAO, erro };
}

/** 1º passo: lê a planilha e mostra o que vai ser importado, sem gravar nada. */
export async function lerPlanilha(_anterior: EstadoImportacao, formData: FormData): Promise<EstadoImportacao> {
  await requireUser();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return falhou("Escolha a planilha.");

  const lido = await lerArquivoPlanilha(arquivo);
  if (!lido.ok) return falhou(lido.erro);
  const leitura = lerLinhas(lido.tabela);
  if (!leitura.ok) return falhou(leitura.erro);
  if (leitura.linhas.length === 0) return falhou("A planilha não tem nenhum contrato preenchido abaixo dos títulos.");
  if (leitura.linhas.length > MAX_LINHAS) {
    return falhou(`A planilha tem ${leitura.linhas.length} linhas. Mande no máximo ${MAX_LINHAS} de cada vez.`);
  }

  const hoje = hojeISO();
  return {
    ...INICIO_IMPORTACAO,
    etapa: "previa",
    arquivo: arquivo.name,
    colunasIgnoradas: leitura.ignoradas,
    linhas: leitura.linhas.map((l) => {
      const { linha, nome, erros, avisos, resumo } = conferirLinha(l, hoje);
      return { linha, nome, erros, avisos, resumo };
    }),
    dados: JSON.stringify(leitura.linhas),
  };
}

const linhasSchema = z
  .array(
    z.object({
      linha: z.number().int().positive(),
      valores: z.record(z.string(), z.string().max(2000)),
    }),
  )
  .min(1)
  .max(MAX_LINHAS);

const resultadoSchema = z.array(
  z.object({
    linha: z.number(),
    situacao: z.enum(["criado", "ja_existia", "erro"]),
    cliente_novo: z.boolean().optional(),
    mensagem: z.string().optional(),
    codigo: z.string().optional(),
  }),
);

/** 2º passo: confere de novo no servidor e grava os contratos que estão certos. */
export async function importarContratos(_anterior: EstadoImportacao, formData: FormData): Promise<EstadoImportacao> {
  let linhas: LinhaPlanilha[];
  try {
    const lidas = linhasSchema.safeParse(JSON.parse(String(formData.get("dados") ?? "")));
    if (!lidas.success) return falhou("Os dados da planilha se perderam. Mande a planilha de novo.");
    linhas = lidas.data;
  } catch {
    return falhou("Os dados da planilha se perderam. Mande a planilha de novo.");
  }

  const hoje = hojeISO();
  const conferidas = linhas.map((l) => conferirLinha(l, hoje));
  const contratos = conferidas.flatMap((c) => (c.contrato ? [c.contrato] : []));
  if (contratos.length === 0) return falhou("Nenhuma linha está pronta para importar. Corrija a planilha e mande de novo.");

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("importar_contratos", { p_linhas: contratos.map(paraFuncaoSQL) });
  if (error) return falhou(mensagemDoBanco(error));

  const resultado = resultadoSchema.safeParse(data);
  if (!resultado.success) return falhou("O banco respondeu algo inesperado. Confira a lista de empréstimos.");

  const nomes = new Map(conferidas.map((c) => [c.linha, c.nome]));
  return {
    ...INICIO_IMPORTACAO,
    etapa: "concluido",
    resultado: {
      criados: resultado.data.filter((r) => r.situacao === "criado").length,
      clientesNovos: resultado.data.filter((r) => r.cliente_novo).length,
      jaExistiam: resultado.data.filter((r) => r.situacao === "ja_existia").length,
      erros: resultado.data
        .filter((r) => r.situacao === "erro")
        .map((r) => ({
          linha: r.linha,
          nome: nomes.get(r.linha) ?? "",
          mensagem: mensagemDoBanco({ code: r.codigo, message: r.mensagem }),
        })),
    },
  };
}

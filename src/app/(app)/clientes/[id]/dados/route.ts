import { NextResponse } from "next/server";

import { hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/**
 * LGPD: todos os dados de um cliente num arquivo JSON (formato aberto), para
 * entregar a ele quando pedir. Só o dono pode gerar.
 */
export async function GET(request: Request, { params }: RouteContext<"/clientes/[id]/dados">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return NextResponse.redirect(new URL("/login", request.url));
  const { data: perfil } = await supabase.from("perfis").select("papel").maybeSingle();
  if (perfil?.papel !== "admin") return new NextResponse("Só o dono pode exportar os dados.", { status: 403 });

  const [{ data: cliente }, { data: config }] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "nome, cpf, whatsapp, endereco, observacoes, consentimento_lgpd_em, criado_em, emprestimos(valor_centavos, taxa_percentual, sistema, qtd_parcelas, periodicidade, liberado_em, status, parcelas(numero, vencimento, valor_centavos, pago_centavos, status, quitada_em, pagamentos(pago_em, valor_centavos, multa_centavos, mora_centavos, desconto_centavos, forma, estornado))), contatos_cobranca(criado_em, tipo, resultado, promessa_para, observacoes), documentos(tipo, nome_arquivo, criado_em)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("configuracoes").select("nome_empresa, razao_social, documento_empresa").maybeSingle(),
  ]);
  if (!cliente) return new NextResponse("Cliente não encontrado.", { status: 404 });

  const arquivo = {
    gerado_em: new Date().toISOString(),
    controlador: { nome: config?.razao_social || config?.nome_empresa, documento: config?.documento_empresa },
    finalidade: "Execução e cobrança de contrato de empréstimo pessoal (LGPD, art. 7º, V).",
    observacao: "Valores em centavos de real (ex.: 34431 = R$ 344,31).",
    titular: cliente,
  };

  return new NextResponse(JSON.stringify(arquivo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dados-do-cliente-${hojeISO()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

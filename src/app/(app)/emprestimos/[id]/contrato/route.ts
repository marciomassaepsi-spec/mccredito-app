import { NextResponse } from "next/server";

import { montarVariaveis, preencherModelo } from "@/lib/contrato";
import { carregarDadosContrato, nomeArquivoContrato } from "@/lib/contrato-dados";
import { gerarContratoPDF } from "@/lib/contrato-pdf";
import { createClient } from "@/lib/supabase/server";

/** Gera o contrato em PDF na hora, com os dados atuais do empréstimo. */
export async function GET(request: Request, { params }: RouteContext<"/emprestimos/[id]/contrato">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return NextResponse.redirect(new URL("/login", request.url));

  const carregado = await carregarDadosContrato(supabase, id);
  if (!carregado) return new NextResponse("Empréstimo não encontrado", { status: 404 });

  const { blocos } = preencherModelo(carregado.modelo, montarVariaveis(carregado.dados));
  const pdf = await gerarContratoPDF(blocos, carregado.dados);
  const nome = nomeArquivoContrato(carregado.dados.cliente.nome, carregado.dados.hoje);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}

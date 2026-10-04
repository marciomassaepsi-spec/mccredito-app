import { NextResponse } from "next/server";

import { carregarTabelas, gerarBackupExcel, gerarCSV, TABELAS_EXPORTAVEIS, type TabelaExportavel } from "@/lib/exportacao";
import { hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/**
 * /exportar/clientes, /exportar/emprestimos... → CSV para Excel
 * /exportar/backup → planilha do Excel com todas as tabelas
 * Só o dono pode exportar: os arquivos têm CPF e endereço dos clientes.
 */
export async function GET(request: Request, { params }: RouteContext<"/exportar/[tabela]">) {
  const { tabela } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return NextResponse.redirect(new URL("/login", request.url));

  const { data: perfil } = await supabase.from("perfis").select("papel").maybeSingle();
  if (perfil?.papel !== "admin") return new NextResponse("Só o dono pode exportar os dados.", { status: 403 });

  const backup = tabela === "backup";
  if (!backup && !TABELAS_EXPORTAVEIS.includes(tabela as TabelaExportavel)) {
    return new NextResponse("Exportação não encontrada.", { status: 404 });
  }

  const tabelas = await carregarTabelas(supabase);
  const hoje = hojeISO();
  const semCache = { "Cache-Control": "no-store" };

  if (backup) {
    const { data: config } = await supabase.from("configuracoes").select("nome_empresa").maybeSingle();
    const buffer = await gerarBackupExcel(tabelas, { empresa: config?.nome_empresa ?? "MC Créditos", geradoEm: new Date().toISOString() });
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        ...semCache,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="backup-mc-creditos-${hoje}.xlsx"`,
      },
    });
  }

  const t = tabelas[tabela as TabelaExportavel];
  return new NextResponse(gerarCSV(t), {
    headers: {
      ...semCache,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t.arquivo}-${hoje}.csv"`,
    },
  });
}

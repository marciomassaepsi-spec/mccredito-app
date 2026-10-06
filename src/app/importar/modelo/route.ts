import { NextResponse } from "next/server";

import { gerarModeloImportacao } from "@/lib/planilha";
import { createClient } from "@/lib/supabase/server";

/** /importar/modelo → planilha do Excel para preencher os contratos em andamento */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return NextResponse.redirect(new URL("/login", request.url));

  const buffer = await gerarModeloImportacao();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-importar-contratos.xlsx"',
    },
  });
}

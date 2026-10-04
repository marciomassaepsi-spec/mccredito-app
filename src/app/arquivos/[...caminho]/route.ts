import { NextResponse } from "next/server";

import { BUCKET } from "@/lib/arquivos";
import { createClient } from "@/lib/supabase/server";

/**
 * Abre um arquivo guardado. Confere o acesso pelo registro em `documentos`
 * (RLS) e redireciona para um link assinado que expira em 2 minutos.
 */
export async function GET(_request: Request, { params }: RouteContext<"/arquivos/[...caminho]">) {
  const { caminho } = await params;
  const path = caminho.map(decodeURIComponent).join("/");
  if (path.includes("..")) return new NextResponse("Caminho inválido", { status: 400 });

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return NextResponse.redirect(new URL("/login", _request.url));

  const { data: doc } = await supabase.from("documentos").select("id").eq("caminho", path).maybeSingle();
  if (!doc) return new NextResponse("Arquivo não encontrado", { status: 404 });

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
  if (error || !data) return new NextResponse("Não foi possível abrir o arquivo", { status: 502 });

  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}

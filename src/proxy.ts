import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos, imagens e ícones do app
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-.*\\.png|apple-icon.png|logo.png).*)",
  ],
};

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/** Cliente Supabase para Server Components, Server Actions e Route Handlers. */
export async function createClient() {
  // Ler os cookies antes de tudo deixa as páginas sempre dinâmicas (por usuário),
  // mesmo quando o build roda sem as variáveis do Supabase.
  const cookieStore = await cookies();
  const config = getSupabaseConfig();
  if (!config) redirect("/configurar");

  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component, onde cookies são somente leitura.
          // O proxy renova a sessão, então isso pode ser ignorado.
        }
      },
    },
  });
}

/** Usuário logado (validado no servidor de autenticação) ou volta para o login. */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");
  return { supabase, userId: data.claims.sub, email: data.claims.email ?? "" };
}

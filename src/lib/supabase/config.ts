export type SupabaseConfig = {
  url: string;
  key: string;
};

/**
 * Lê as chaves públicas do Supabase. Devolve null enquanto o projeto não foi
 * configurado, para o app mostrar a tela de configuração em vez de quebrar.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

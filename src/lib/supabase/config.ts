export type SupabaseConfig = {
  url: string;
  key: string;
};

/** Tira espaços, quebras de linha e aspas que vêm junto quando se copia e cola. */
function limpar(valor: string | undefined): string {
  return (valor ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

/**
 * Aceita o endereço do projeto em formatos comuns de copiar e colar e devolve
 * sempre `https://<ref>.supabase.co`: sem barra no fim, sem `/rest/v1`, e
 * convertendo o link do painel (`supabase.com/dashboard/project/<ref>`).
 */
export function normalizarUrlSupabase(valor: string | undefined): string {
  let url = limpar(valor);
  if (!url) return "";
  const painel = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (painel) return `https://${painel[1].toLowerCase()}.supabase.co`;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/i, "").replace(/\/+$/, "");
}

/**
 * Lê as chaves públicas do Supabase. Devolve null enquanto o projeto não foi
 * configurado, para o app mostrar a tela de configuração em vez de quebrar.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = normalizarUrlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = limpar(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!url || !key) return null;
  return { url, key };
}

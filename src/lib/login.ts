/** Erro do Supabase Auth, só com os campos que importam aqui. */
export type ErroAuth = { name?: string; code?: string; status?: number; message?: string };

/**
 * Traduz o erro do login numa mensagem que diz o que conferir. Os erros de
 * configuração (URL, chave, projeto pausado) só acontecem na instalação, mas
 * sem eles o dono não tem como saber o que está errado.
 */
export function mensagemErroLogin(erro: ErroAuth): string {
  const msg = (erro.message ?? "").toLowerCase();
  const status = erro.status ?? 0;

  if (erro.code === "invalid_credentials") return "E-mail ou senha incorretos.";
  if (erro.code === "email_not_confirmed") {
    return "Este e-mail ainda não foi confirmado. No Supabase, em Authentication → Users, apague o usuário e crie de novo marcando “Auto Confirm User”.";
  }
  if (erro.code === "over_request_rate_limit" || status === 429) {
    return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  }
  if (erro.code === "user_banned") return "Este usuário está bloqueado no Supabase.";
  if (status === 401 || status === 403 || msg.includes("api key")) {
    return "A chave do Supabase está errada. Na Vercel, confira NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (a chave publishable ou anon, não a secret) e faça Redeploy.";
  }
  if (status === 404 || erro.name === "AuthUnknownError") {
    return "O endereço do Supabase está errado. Na Vercel, NEXT_PUBLIC_SUPABASE_URL deve ser como https://abcdefgh.supabase.co. Corrija e faça Redeploy.";
  }
  if (status >= 500) {
    return "O Supabase não respondeu. Veja no painel do Supabase se o projeto está pausado ou ainda sendo criado.";
  }
  if (erro.name === "AuthRetryableFetchError" || status === 0) {
    return "Não foi possível falar com o Supabase. Confira NEXT_PUBLIC_SUPABASE_URL na Vercel (https://abcdefgh.supabase.co) e se o projeto não está pausado.";
  }
  return `Não foi possível entrar agora (${erro.code ?? `erro ${status}`}). Tente de novo.`;
}

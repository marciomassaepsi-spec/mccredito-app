import { describe, expect, it } from "vitest";

import { mensagemErroLogin } from "./login";
import { normalizarUrlSupabase } from "./supabase/config";

describe("mensagemErroLogin", () => {
  it("separa senha errada, e-mail não confirmado e chave errada", () => {
    expect(mensagemErroLogin({ code: "invalid_credentials", status: 400 })).toBe("E-mail ou senha incorretos.");
    expect(mensagemErroLogin({ code: "email_not_confirmed", status: 400 })).toContain("Auto Confirm User");
    expect(mensagemErroLogin({ status: 401, message: "Invalid API key" })).toContain("PUBLISHABLE_KEY");
  });

  it("aponta o endereço quando o Supabase não é encontrado", () => {
    expect(mensagemErroLogin({ name: "AuthRetryableFetchError", status: 0, message: "fetch failed" })).toContain(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
    expect(mensagemErroLogin({ name: "AuthUnknownError", message: "Unexpected token <" })).toContain("endereço");
    expect(mensagemErroLogin({ status: 404 })).toContain("endereço");
  });

  it("projeto fora do ar e muitas tentativas", () => {
    expect(mensagemErroLogin({ name: "AuthRetryableFetchError", status: 503 })).toContain("pausado");
    expect(mensagemErroLogin({ code: "over_request_rate_limit", status: 429 })).toContain("Espere");
  });
});

describe("normalizarUrlSupabase", () => {
  it("corrige os formatos comuns de copiar e colar", () => {
    const certo = "https://abcdefgh.supabase.co";
    expect(normalizarUrlSupabase(certo)).toBe(certo);
    expect(normalizarUrlSupabase(` ${certo}/ \n`)).toBe(certo);
    expect(normalizarUrlSupabase(`"${certo}"`)).toBe(certo);
    expect(normalizarUrlSupabase(`${certo}/rest/v1/`)).toBe(certo);
    expect(normalizarUrlSupabase("abcdefgh.supabase.co")).toBe(certo);
    expect(normalizarUrlSupabase("https://supabase.com/dashboard/project/abcdefgh/settings/api")).toBe(certo);
    expect(normalizarUrlSupabase(undefined)).toBe("");
  });
});

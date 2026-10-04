"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { mensagemErroLogin } from "@/lib/login";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email("Digite um e-mail válido."),
  senha: z.string().min(1, "Digite sua senha."),
});

export type LoginState = { erro: string | null; email: string };

export async function entrar(_anterior: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const dados = loginSchema.safeParse({ email, senha: formData.get("senha") });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Confira os dados.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: dados.data.email,
    password: dados.data.senha,
  });

  if (error) {
    if (error.code !== "invalid_credentials") {
      // Aparece em Vercel → Logs, para descobrir o motivo
      console.error("Falha no login:", error.name, error.code, error.status, error.message);
    }
    return { erro: mensagemErroLogin(error), email };
  }

  redirect("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

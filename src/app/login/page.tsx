import type { Metadata } from "next";

import { Logo } from "@/components/app/logo";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="bg-primary px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-16 text-primary-foreground">
        <div className="mx-auto max-w-sm">
          <Logo width={150} priority className="px-3 py-2" />
          <h1 className="mt-6 text-3xl font-black italic">Bem-vindo de volta</h1>
          <p className="mt-1 text-primary-foreground/85">Entre para ver a cobrança de hoje.</p>
        </div>
      </div>
      <div className="-mt-8 px-4 pb-10">
        <div className="mx-auto max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
        <p className="mx-auto mt-6 max-w-sm text-center text-sm text-muted-foreground">
          Esqueceu a senha? Redefina pelo painel do Supabase (passo a passo no README).
        </p>
      </div>
    </main>
  );
}

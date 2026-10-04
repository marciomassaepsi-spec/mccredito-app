import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/app/logo";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Configurar" };

export default function ConfigurarPage() {
  if (getSupabaseConfig()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <Logo width={150} priority className="self-start border" />
      <h1 className="text-3xl font-black italic text-brand-deep">Falta conectar o banco de dados</h1>
      <p className="text-muted-foreground">
        O app está instalado, mas ainda não sabe onde guardar os dados. Isso se resolve uma vez só,
        seguindo o README do repositório:
      </p>
      <ol className="grid list-decimal gap-3 pl-5">
        <li>Crie um projeto gratuito no Supabase.</li>
        <li>Rode o arquivo de banco que está em <code>supabase/migrations</code>.</li>
        <li>
          Coloque as variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> na Vercel (ou no arquivo{" "}
          <code>.env.local</code>, para rodar no computador).
        </li>
      </ol>
    </main>
  );
}

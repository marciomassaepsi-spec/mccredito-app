import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/supabase/server";

import { ImportarForm } from "./importar-form";

export const metadata: Metadata = { title: "Importar contratos" };

export default async function ImportarPage() {
  await requireUser();
  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href="/emprestimos" className="text-sm font-bold text-primary">
          ← Empréstimos
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Importar contratos</h1>
        <p className="text-muted-foreground">
          Para os empréstimos que começaram antes do app: cadastra o cliente, o empréstimo e dá baixa nas parcelas que
          já foram pagas, tudo de uma vez.
        </p>
      </section>
      <ImportarForm />
    </div>
  );
}

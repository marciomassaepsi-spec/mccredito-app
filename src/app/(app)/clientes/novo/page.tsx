import type { Metadata } from "next";

import { ClienteForm } from "../cliente-form";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NovoClientePage({ searchParams }: PageProps<"/clientes/novo">) {
  const { voltar } = await searchParams;
  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-black italic text-brand-deep">Novo cliente</h1>
      <ClienteForm voltar={voltar === "emprestimo" ? "emprestimo" : undefined} />
    </div>
  );
}

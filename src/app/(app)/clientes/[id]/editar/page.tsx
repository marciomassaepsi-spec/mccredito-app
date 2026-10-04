import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatCPF, formatTelefone } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

import { ClienteForm } from "../../cliente-form";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: c } = await supabase
    .from("clientes")
    .select("id, nome, cpf, whatsapp, endereco, observacoes, consentimento_lgpd_em, anonimizado_em")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  if (c.anonimizado_em) {
    return (
      <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">
        Os dados pessoais deste cliente foram excluídos a pedido dele (LGPD) e não podem ser editados.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-black italic text-brand-deep">Editar cliente</h1>
      <ClienteForm
        inicial={{
          id: c.id,
          nome: c.nome,
          cpf: formatCPF(c.cpf),
          whatsapp: c.whatsapp ? formatTelefone(c.whatsapp) : "",
          endereco: c.endereco,
          observacoes: c.observacoes,
          consentimento: Boolean(c.consentimento_lgpd_em),
        }}
      />
    </div>
  );
}

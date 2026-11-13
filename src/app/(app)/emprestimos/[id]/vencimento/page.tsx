import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NOME_PERIODICIDADE } from "@/lib/emprestimos";
import { hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

import { VencimentoForm } from "./vencimento-form";

export const metadata: Metadata = { title: "Mudar vencimento" };

export default async function VencimentoPage({ params }: PageProps<"/emprestimos/[id]/vencimento">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: e } = await supabase
    .from("emprestimos")
    .select("id, status, periodicidade, liberado_em, clientes(nome), parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status)")
    .eq("id", id)
    .order("numero", { referencedTable: "parcelas" })
    .maybeSingle();
  if (!e) notFound();

  const abertas = e.parcelas.filter((p) => p.status === "a_vencer" || p.status === "paga_parcial");

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href={`/emprestimos/${e.id}`} className="text-sm font-bold text-primary">
          ← Voltar ao empréstimo
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Mudar vencimento</h1>
        <p className="text-muted-foreground">
          {e.clientes?.nome}. Só a data muda: valor das parcelas, juros e saldo continuam os mesmos. Contrato{" "}
          {NOME_PERIODICIDADE[e.periodicidade].toLowerCase()}.
        </p>
      </section>
      {e.status !== "ativo" || abertas.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">
          Só dá para mudar o vencimento de empréstimos ativos com parcelas em aberto.
        </p>
      ) : (
        <VencimentoForm
          emprestimoId={e.id}
          parcelas={e.parcelas}
          periodicidade={e.periodicidade}
          liberadoEm={e.liberado_em}
          hoje={hojeISO()}
        />
      )}
    </div>
  );
}

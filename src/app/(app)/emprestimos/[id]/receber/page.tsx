import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

import { ReceberForm } from "./receber-form";

export const metadata: Metadata = { title: "Receber parcela" };

export default async function ReceberPage({ params, searchParams }: PageProps<"/emprestimos/[id]/receber">) {
  const { id } = await params;
  const { parcela: parcelaId } = await searchParams;
  const { supabase } = await requireUser();

  const [{ data: e }, { data: config }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select("id, status, clientes(nome), parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status)")
      .eq("id", id)
      .order("numero", { referencedTable: "parcelas" })
      .maybeSingle(),
    supabase.from("configuracoes").select("multa_percentual, mora_percentual_mes").maybeSingle(),
  ]);
  if (!e) notFound();

  const abertas = e.parcelas.filter((p) => p.status === "a_vencer" || p.status === "paga_parcial");
  const parcela = abertas.find((p) => p.id === parcelaId) ?? abertas[0];

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href={`/emprestimos/${e.id}`} className="text-sm font-bold text-primary">
          ← Voltar ao empréstimo
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Receber</h1>
        <p className="text-muted-foreground">{e.clientes?.nome}</p>
      </section>

      {e.status !== "ativo" || !parcela ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">
          Não há parcelas em aberto neste empréstimo.
        </p>
      ) : (
        <ReceberForm
          emprestimoId={e.id}
          parcela={parcela}
          totalParcelas={e.parcelas.length}
          hoje={hojeISO()}
          multa={Number(config?.multa_percentual ?? 2) / 100}
          mora={Number(config?.mora_percentual_mes ?? 1) / 100}
        />
      )}
    </div>
  );
}

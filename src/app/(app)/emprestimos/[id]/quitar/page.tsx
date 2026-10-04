import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

import { QuitarForm } from "./quitar-form";

export const metadata: Metadata = { title: "Quitar empréstimo" };

export default async function QuitarPage({ params }: PageProps<"/emprestimos/[id]/quitar">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: e }, { data: config }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select("id, status, taxa_percentual, clientes(nome), parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("configuracoes").select("multa_percentual, mora_percentual_mes").maybeSingle(),
  ]);
  if (!e) notFound();
  const abertas = e.parcelas.filter((p) => p.status === "a_vencer" || p.status === "paga_parcial");

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href={`/emprestimos/${e.id}`} className="text-sm font-bold text-primary">
          ← Voltar ao empréstimo
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Quitar antes do prazo</h1>
        <p className="text-muted-foreground">
          {e.clientes?.nome}. As parcelas que ainda não venceram têm desconto dos juros, proporcional aos dias que
          faltam, como manda o Código de Defesa do Consumidor.
        </p>
      </section>
      {e.status !== "ativo" || abertas.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">
          Não há parcelas em aberto neste empréstimo.
        </p>
      ) : (
        <QuitarForm
          emprestimoId={e.id}
          parcelas={abertas}
          taxaMensal={Number(e.taxa_percentual) / 100}
          hoje={hojeISO()}
          multa={Number(config?.multa_percentual ?? 2) / 100}
          mora={Number(config?.mora_percentual_mes ?? 1) / 100}
        />
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hojeISO, percentualParaTexto } from "@/lib/format";
import { planoQuitacao } from "@/lib/pagamentos";
import { requireUser } from "@/lib/supabase/server";

import { RenegociarForm } from "./renegociar-form";

export const metadata: Metadata = { title: "Renegociar" };

export default async function RenegociarPage({ params }: PageProps<"/emprestimos/[id]/renegociar">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: e }, { data: config }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select("id, status, taxa_percentual, sistema, clientes(nome), parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("configuracoes").select("multa_percentual, mora_percentual_mes").maybeSingle(),
  ]);
  if (!e) notFound();

  const hoje = hojeISO();
  const taxa = Number(e.taxa_percentual) / 100;
  const abertas = e.parcelas.filter((p) => p.status === "a_vencer" || p.status === "paga_parcial");
  const plano = planoQuitacao(abertas, taxa, hoje, Number(config?.multa_percentual ?? 2) / 100, Number(config?.mora_percentual_mes ?? 1) / 100, false);

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href={`/emprestimos/${e.id}`} className="text-sm font-bold text-primary">
          ← Voltar ao empréstimo
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Renegociar</h1>
        <p className="text-muted-foreground">
          {e.clientes?.nome}. Cria um empréstimo novo com o saldo, em novas parcelas.
        </p>
      </section>
      {e.status !== "ativo" || abertas.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">
          Só dá para renegociar empréstimos ativos com parcelas em aberto.
        </p>
      ) : (
        <RenegociarForm
          emprestimoId={e.id}
          saldoCentavos={plano.totalCentavos}
          taxaAtual={percentualParaTexto(taxa)}
          sistemaAtual={e.sistema}
          hoje={hoje}
        />
      )}
    </div>
  );
}

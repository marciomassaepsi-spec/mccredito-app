import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { centavosParaTexto, hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

import { RenegociarForm } from "./renegociar-form";

export const metadata: Metadata = { title: "Renegociar" };

export default async function RenegociarPage({ params }: PageProps<"/emprestimos/[id]/renegociar">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: e }, { data: config }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select("id, status, liberado_em, qtd_parcelas, periodicidade, clientes(nome), parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status)")
      .eq("id", id)
      .order("numero", { referencedTable: "parcelas" })
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
        <h1 className="text-3xl font-black italic text-brand-deep">Renegociar</h1>
        <p className="text-muted-foreground">
          {e.clientes?.nome}. O que falta deste contrato, mais o dinheiro novo que você mandar, vira um contrato novo.
        </p>
      </section>
      {e.status !== "ativo" || abertas.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">
          Só dá para renegociar empréstimos ativos com parcelas em aberto.
        </p>
      ) : (
        <RenegociarForm
          emprestimoId={e.id}
          parcelas={abertas}
          multa={Number(config?.multa_percentual ?? 2) / 100}
          mora={Number(config?.mora_percentual_mes ?? 1) / 100}
          hoje={hojeISO()}
          liberadoAntigo={e.liberado_em}
          inicial={{
            // Sugestão: as mesmas parcelas do contrato atual (ex.: de novo 6x de R$ 250)
            qtd: String(e.qtd_parcelas),
            parcela: centavosParaTexto(e.parcelas[0]?.valor_centavos ?? 0),
            periodicidade: e.periodicidade,
          }}
        />
      )}
    </div>
  );
}

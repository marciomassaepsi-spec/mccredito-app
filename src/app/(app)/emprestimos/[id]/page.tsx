import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Selo, type Tom } from "@/components/app/selo";
import { NOME_PERIODICIDADE, NOME_SISTEMA, NOME_SITUACAO, resumirParcelas, situacaoParcela, type Situacao } from "@/lib/emprestimos";
import { atualizarAtraso } from "@/lib/finance";
import { formatCentavos, formatData, formatPercentual, hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

import { CancelarForm } from "./cancelar-form";

export const metadata: Metadata = { title: "Empréstimo" };

const TOM: Record<Situacao, Tom> = {
  paga: "ok",
  cancelada: "neutro",
  atrasada: "atraso",
  vence_hoje: "hoje",
  a_vencer: "neutro",
};

export default async function EmprestimoPage({ params }: PageProps<"/emprestimos/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [{ data: e }, { data: config }, { data: perfil }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select(
        "id, valor_centavos, taxa_percentual, sistema, qtd_parcelas, periodicidade, liberado_em, status, observacoes, renegociado_de, clientes(id, nome), parcelas(id, numero, vencimento, valor_centavos, juros_centavos, amortizacao_centavos, saldo_devedor_centavos, pago_centavos, status, quitada_em)",
      )
      .eq("id", id)
      .order("numero", { referencedTable: "parcelas" })
      .maybeSingle(),
    supabase.from("configuracoes").select("multa_percentual, mora_percentual_mes").maybeSingle(),
    supabase.from("perfis").select("papel").maybeSingle(),
  ]);
  if (!e) notFound();

  const hoje = hojeISO();
  const resumo = resumirParcelas(e.parcelas, hoje);
  const multa = Number(config?.multa_percentual ?? 2) / 100;
  const mora = Number(config?.mora_percentual_mes ?? 1) / 100;
  const total = e.parcelas.reduce((s, p) => s + p.valor_centavos, 0);

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        {e.clientes && (
          <Link href={`/clientes/${e.clientes.id}`} className="text-sm font-bold text-primary">
            ← {e.clientes.nome}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="num text-3xl font-black italic text-brand-deep">{formatCentavos(e.valor_centavos)}</h1>
          {e.status !== "ativo" && <Selo tom="neutro">{e.status === "quitado" ? "Quitado" : e.status === "renegociado" ? "Renegociado" : "Cancelado"}</Selo>}
        </div>
        <p className="text-muted-foreground">
          {e.qtd_parcelas}x · {NOME_SISTEMA[e.sistema]} · {formatPercentual(Number(e.taxa_percentual) / 100)} ao mês ·{" "}
          {NOME_PERIODICIDADE[e.periodicidade].toLowerCase()} · liberado em {formatData(e.liberado_em)}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-bold text-muted-foreground">Pagas</p>
          <p className="num font-heading text-2xl font-black">
            {resumo.pagas} <span className="text-base text-muted-foreground">de {resumo.total}</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${resumo.total ? (resumo.pagas / resumo.total) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-bold text-muted-foreground">Falta receber</p>
          <p className="num font-heading text-2xl font-black">{formatCentavos(resumo.emAbertoCentavos)}</p>
          <p className="num text-sm text-muted-foreground">de {formatCentavos(total)}</p>
        </div>
      </section>

      {resumo.atrasadas > 0 && e.status === "ativo" && (
        <p className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">
          {resumo.atrasadas} {resumo.atrasadas === 1 ? "parcela atrasada" : "parcelas atrasadas"}, somando{" "}
          {formatCentavos(resumo.atrasadoCentavos)} sem multa e mora.
        </p>
      )}

      <section className="rounded-2xl border bg-card">
        <h2 className="px-4 pt-4 text-lg font-extrabold">Parcelas</h2>
        <ol className="mt-2 divide-y">
          {e.parcelas.map((p) => {
            const s = situacaoParcela(p, hoje);
            const atualizado = s.situacao === "atrasada" ? atualizarAtraso(s.emAbertoCentavos, s.diasAtraso, multa, mora) : null;
            return (
              <li key={p.id} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="num text-sm font-bold text-muted-foreground">{p.numero}ª</span>
                <div className="min-w-0">
                  <p className="num font-bold">{formatCentavos(p.valor_centavos)}</p>
                  <p className="num text-sm text-muted-foreground">
                    {formatData(p.vencimento)}
                    {p.status === "paga" && p.quitada_em && ` · paga em ${formatData(p.quitada_em)}`}
                    {p.status === "paga_parcial" && ` · pago ${formatCentavos(p.pago_centavos)}`}
                  </p>
                  {atualizado && (
                    <p className="num text-sm font-semibold text-late">Atualizada: {formatCentavos(atualizado.totalCentavos)}</p>
                  )}
                </div>
                <Selo tom={TOM[s.situacao]}>
                  {s.situacao === "atrasada" ? `${s.diasAtraso} ${s.diasAtraso === 1 ? "dia" : "dias"}` : NOME_SITUACAO[s.situacao]}
                </Selo>
              </li>
            );
          })}
        </ol>
      </section>

      {e.observacoes && (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-bold text-muted-foreground">Observações</h2>
          <p className="mt-1 whitespace-pre-line">{e.observacoes}</p>
        </section>
      )}

      {e.status === "ativo" && (
        <p className="text-sm text-muted-foreground">
          Registrar pagamento, quitar antes do prazo, renegociar e guardar o contrato chegam na fase 5.
        </p>
      )}

      {e.status === "ativo" && perfil?.papel === "admin" && <CancelarForm id={e.id} />}
    </div>
  );
}

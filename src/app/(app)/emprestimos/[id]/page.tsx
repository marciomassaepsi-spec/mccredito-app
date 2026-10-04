import { HandCoins, Repeat, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Documentos } from "@/components/app/documentos";
import { Selo, type Tom } from "@/components/app/selo";
import { buttonVariants } from "@/components/ui/button";
import { linkArquivo } from "@/lib/arquivos";
import { NOME_PERIODICIDADE, NOME_SISTEMA, NOME_SITUACAO, resumirParcelas, situacaoParcela, type Situacao } from "@/lib/emprestimos";
import { atualizarAtraso } from "@/lib/finance";
import { formatCentavos, formatData, formatPercentual, hojeISO } from "@/lib/format";
import { recebidoDoPagamento } from "@/lib/pagamentos";
import { requireUser } from "@/lib/supabase/server";

import { CancelarForm } from "./cancelar-form";
import { ContratoCard } from "./contrato-card";
import { EstornarForm } from "./estornar-form";

export const metadata: Metadata = { title: "Empréstimo" };

const TOM: Record<Situacao, Tom> = {
  paga: "ok",
  cancelada: "neutro",
  atrasada: "atraso",
  vence_hoje: "hoje",
  a_vencer: "neutro",
};

const AVISOS: Record<string, string> = {
  pago: "Pagamento registrado.",
  parcial: "Pagamento parcial registrado. A parcela continua em aberto com o restante.",
  estorno: "Pagamento estornado. A parcela voltou a ficar em aberto.",
  quitado: "Empréstimo quitado.",
  renegociado: "Renegociação feita. Este é o empréstimo novo.",
};

const FORMA = { pix: "PIX", dinheiro: "Dinheiro", transferencia: "Transferência", outro: "Outro" } as const;
const STATUS = { quitado: "Quitado", renegociado: "Renegociado", cancelado: "Cancelado", em_atraso: "Em atraso", ativo: "Ativo" } as const;

export default async function EmprestimoPage({ params, searchParams }: PageProps<"/emprestimos/[id]">) {
  const { id } = await params;
  const { ok } = await searchParams;
  const { supabase } = await requireUser();

  const [{ data: e }, { data: config }, { data: perfil }, { data: sucessor }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select(
        "id, valor_centavos, taxa_percentual, sistema, qtd_parcelas, periodicidade, liberado_em, status, observacoes, renegociado_de, clientes(id, nome), documentos(id, tipo, nome_arquivo, caminho, criado_em), parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status, quitada_em, pagamentos(id, valor_centavos, multa_centavos, mora_centavos, desconto_centavos, pago_em, forma, comprovante_path, observacoes, estornado, estorno_motivo, criado_em))",
      )
      .eq("id", id)
      .order("numero", { referencedTable: "parcelas" })
      .order("criado_em", { referencedTable: "documentos", ascending: false })
      .maybeSingle(),
    supabase
      .from("configuracoes")
      .select("multa_percentual, mora_percentual_mes, razao_social, documento_empresa, cidade, chave_pix")
      .maybeSingle(),
    supabase.from("perfis").select("papel").maybeSingle(),
    supabase.from("emprestimos").select("id").eq("renegociado_de", id).maybeSingle(),
  ]);
  if (!e) notFound();

  const hoje = hojeISO();
  const resumo = resumirParcelas(e.parcelas, hoje);
  const multa = Number(config?.multa_percentual ?? 2) / 100;
  const mora = Number(config?.mora_percentual_mes ?? 1) / 100;
  const total = e.parcelas.reduce((s, p) => s + p.valor_centavos, 0);
  const ativo = e.status === "ativo";
  const admin = perfil?.papel === "admin";
  const podeReceber = admin || perfil?.papel === "operador";
  const pagamentos = e.parcelas
    .flatMap((p) => p.pagamentos.map((pg) => ({ ...pg, numero: p.numero })))
    .sort((a, b) => (a.pago_em === b.pago_em ? b.criado_em.localeCompare(a.criado_em) : b.pago_em.localeCompare(a.pago_em)));
  const recebidoTotal = pagamentos.filter((p) => !p.estornado).reduce((s, p) => s + recebidoDoPagamento(p), 0);
  const aviso = typeof ok === "string" ? AVISOS[ok] : undefined;

  return (
    <div className="grid gap-5">
      {aviso && (
        <p role="status" className="rounded-xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground">
          {aviso}
        </p>
      )}

      <section className="grid gap-1">
        {e.clientes && (
          <Link href={`/clientes/${e.clientes.id}`} className="text-sm font-bold text-primary">
            ← {e.clientes.nome}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="num text-3xl font-black italic text-brand-deep">{formatCentavos(e.valor_centavos)}</h1>
          {!ativo && <Selo tom={e.status === "quitado" ? "ok" : "neutro"}>{STATUS[e.status]}</Selo>}
        </div>
        <p className="text-muted-foreground">
          {e.qtd_parcelas}x · {NOME_SISTEMA[e.sistema]} · {formatPercentual(Number(e.taxa_percentual) / 100)} ao mês ·{" "}
          {NOME_PERIODICIDADE[e.periodicidade].toLowerCase()} · liberado em {formatData(e.liberado_em)}
        </p>
        {e.renegociado_de && (
          <Link href={`/emprestimos/${e.renegociado_de}`} className="text-sm font-bold text-primary">
            Veio da renegociação de outro empréstimo →
          </Link>
        )}
        {sucessor && (
          <Link href={`/emprestimos/${sucessor.id}`} className="text-sm font-bold text-primary">
            Foi renegociado: ver o empréstimo novo →
          </Link>
        )}
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

      {resumo.atrasadas > 0 && ativo && (
        <p className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">
          {resumo.atrasadas} {resumo.atrasadas === 1 ? "parcela atrasada" : "parcelas atrasadas"}, somando{" "}
          {formatCentavos(resumo.atrasadoCentavos)} sem multa e mora.
        </p>
      )}

      {ativo && podeReceber && resumo.proxima && (
        <section className="grid grid-cols-3 gap-2">
          <Link
            href={`/emprestimos/${e.id}/receber?parcela=${resumo.proxima.id}`}
            className={buttonVariants({ className: "h-16 flex-col gap-0.5 text-xs font-bold" })}
          >
            <HandCoins aria-hidden /> Receber {resumo.proxima.numero}ª
          </Link>
          <Link href={`/emprestimos/${e.id}/quitar`} className={buttonVariants({ variant: "outline", className: "h-16 flex-col gap-0.5 text-xs font-bold" })}>
            <Wallet aria-hidden /> Quitar tudo
          </Link>
          <Link href={`/emprestimos/${e.id}/renegociar`} className={buttonVariants({ variant: "outline", className: "h-16 flex-col gap-0.5 text-xs font-bold" })}>
            <Repeat aria-hidden /> Renegociar
          </Link>
        </section>
      )}

      <section className="rounded-2xl border bg-card">
        <h2 className="px-4 pt-4 text-lg font-extrabold">Parcelas</h2>
        <ol className="mt-2 divide-y">
          {e.parcelas.map((p) => {
            const s = situacaoParcela(p, hoje);
            const atualizado = s.situacao === "atrasada" ? atualizarAtraso(s.emAbertoCentavos, s.diasAtraso, multa, mora) : null;
            const aberta = ativo && s.emAbertoCentavos > 0;
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
                  {atualizado && <p className="num text-sm font-semibold text-late">Atualizada: {formatCentavos(atualizado.totalCentavos)}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Selo tom={TOM[s.situacao]}>
                    {s.situacao === "atrasada" ? `${s.diasAtraso} ${s.diasAtraso === 1 ? "dia" : "dias"}` : NOME_SITUACAO[s.situacao]}
                  </Selo>
                  {aberta && podeReceber && (
                    <Link href={`/emprestimos/${e.id}/receber?parcela=${p.id}`} className="text-sm font-bold text-primary underline-offset-4 hover:underline">
                      Receber
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
          <h2 className="text-lg font-extrabold">Pagamentos</h2>
          {recebidoTotal > 0 && <span className="num text-sm text-muted-foreground">recebido {formatCentavos(recebidoTotal)}</span>}
        </div>
        {pagamentos.length === 0 ? (
          <p className="px-4 pt-1 pb-4 text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {pagamentos.map((pg) => (
              <li key={pg.id} className={`grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 px-4 py-3 ${pg.estornado ? "opacity-60" : ""}`}>
                <div className="min-w-0">
                  <p className={`num font-bold ${pg.estornado ? "line-through" : ""}`}>{formatCentavos(recebidoDoPagamento(pg))}</p>
                  <p className="num text-sm text-muted-foreground">
                    {formatData(pg.pago_em)} · {pg.numero}ª parcela · {FORMA[pg.forma]}
                  </p>
                  {(pg.multa_centavos > 0 || pg.mora_centavos > 0 || pg.desconto_centavos > 0) && (
                    <p className="num text-xs text-muted-foreground">
                      {pg.multa_centavos + pg.mora_centavos > 0 && `encargos ${formatCentavos(pg.multa_centavos + pg.mora_centavos)}`}
                      {pg.desconto_centavos > 0 && ` desconto ${formatCentavos(pg.desconto_centavos)}`}
                    </p>
                  )}
                  {pg.estornado && <p className="text-xs font-semibold text-late">Estornado: {pg.estorno_motivo}</p>}
                  {pg.observacoes && !pg.estornado && <p className="text-xs text-muted-foreground">{pg.observacoes}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {pg.comprovante_path && (
                    <a href={linkArquivo(pg.comprovante_path)} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary">
                      Comprovante
                    </a>
                  )}
                  {!pg.estornado && podeReceber && <EstornarForm pagamentoId={pg.id} emprestimoId={e.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ContratoCard
        emprestimoId={e.id}
        dadosIncompletos={!config?.razao_social || !config?.documento_empresa || !config?.cidade || !config?.chave_pix}
      />

      <Documentos documentos={e.documentos} emprestimoId={e.id} podeApagar={admin} voltar={`/emprestimos/${e.id}`} />

      {e.observacoes && (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-bold text-muted-foreground">Observações</h2>
          <p className="mt-1 whitespace-pre-line">{e.observacoes}</p>
        </section>
      )}

      {ativo && admin && <CancelarForm id={e.id} />}
    </div>
  );
}

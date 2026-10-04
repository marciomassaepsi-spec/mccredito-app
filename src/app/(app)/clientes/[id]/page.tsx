import { FilePlus2, MapPin, MessageCircle, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Documentos } from "@/components/app/documentos";
import { Selo } from "@/components/app/selo";
import { buttonVariants } from "@/components/ui/button";
import { NOME_RESULTADO, NOME_TIPO_CONTATO } from "@/lib/cobranca";
import { calcularPontualidade, NOME_SISTEMA, resumirParcelas } from "@/lib/emprestimos";
import { formatCentavos, formatCPF, formatData, formatPercentual, formatTelefone, hojeISO, linkWhatsApp } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

import { SecaoLGPD } from "./lgpd";

export const metadata: Metadata = { title: "Cliente" };

const NOME_STATUS = { ativo: "Ativo", quitado: "Quitado", em_atraso: "Em atraso", renegociado: "Renegociado", cancelado: "Cancelado" } as const;

export default async function ClientePage({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { ok } = await searchParams;
  const { supabase } = await requireUser();
  const { data: perfil } = await supabase.from("perfis").select("papel").maybeSingle();
  const { data: c } = await supabase
    .from("clientes")
    .select(
      "id, nome, cpf, whatsapp, endereco, observacoes, criado_em, anonimizado_em, contatos_cobranca(id, tipo, resultado, promessa_para, observacoes, criado_em), documentos(id, tipo, nome_arquivo, caminho, criado_em), emprestimos(id, valor_centavos, taxa_percentual, sistema, qtd_parcelas, liberado_em, status, parcelas(numero, vencimento, valor_centavos, pago_centavos, status, quitada_em))",
    )
    .eq("id", id)
    .order("liberado_em", { referencedTable: "emprestimos", ascending: false })
    .order("criado_em", { referencedTable: "documentos", ascending: false })
    .order("criado_em", { referencedTable: "contatos_cobranca", ascending: false })
    .maybeSingle();
  if (!c) notFound();

  const hoje = hojeISO();
  const ativos = c.emprestimos.filter((e) => e.status === "ativo");
  const resumoAtivos = resumirParcelas(ativos.flatMap((e) => e.parcelas), hoje);
  const pontualidade = calcularPontualidade(c.emprestimos.flatMap((e) => e.parcelas), hoje);
  const whatsapp = c.whatsapp ? linkWhatsApp(c.whatsapp) : null;

  const admin = perfil?.papel === "admin";

  return (
    <div className="grid gap-5">
      {ok === "anonimizado" && (
        <p role="status" className="rounded-xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground">
          Dados pessoais excluídos. Os valores dos empréstimos continuam no histórico, sem identificação.
        </p>
      )}
      {c.anonimizado_em && ok !== "anonimizado" && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
          Os dados pessoais deste cliente foram excluídos a pedido dele (LGPD).
        </p>
      )}
      <section className="grid gap-2">
        <Link href="/clientes" className="text-sm font-bold text-primary">
          ← Clientes
        </Link>
        <h1 className="text-3xl font-black italic break-words text-brand-deep">{c.nome}</h1>
        <p className="num text-muted-foreground">
          {c.cpf ? `CPF ${formatCPF(c.cpf)}` : "Sem CPF"}
          {c.whatsapp && ` · ${formatTelefone(c.whatsapp)}`}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-bold text-muted-foreground">Em aberto</p>
          <p className="num font-heading text-2xl font-black">{formatCentavos(resumoAtivos.emAbertoCentavos)}</p>
          {resumoAtivos.atrasadoCentavos > 0 && (
            <p className="num text-sm font-bold text-late">{formatCentavos(resumoAtivos.atrasadoCentavos)} atrasado</p>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-bold text-muted-foreground">Pontualidade</p>
          {pontualidade.tipo === "sem_historico" ? (
            <>
              <p className="font-heading text-2xl font-black text-muted-foreground">—</p>
              <p className="text-sm text-muted-foreground">Nenhuma parcela venceu</p>
            </>
          ) : (
            <>
              <p
                className={`num font-heading text-2xl font-black ${pontualidade.percentual >= 80 ? "text-primary" : pontualidade.percentual >= 50 ? "text-gold-ink" : "text-late"}`}
              >
                {pontualidade.percentual}%
              </p>
              <p className="text-sm text-muted-foreground">
                {pontualidade.pagasEmDia} de {pontualidade.avaliadas} em dia
              </p>
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary", className: "h-14 flex-col gap-0.5 text-xs font-bold" })}>
            <MessageCircle aria-hidden /> WhatsApp
          </a>
        ) : (
          <span className={buttonVariants({ variant: "secondary", className: "pointer-events-none h-14 flex-col gap-0.5 text-xs font-bold opacity-50" })}>
            <MessageCircle aria-hidden /> Sem WhatsApp
          </span>
        )}
        <Link href={`/clientes/${c.id}/editar`} className={buttonVariants({ variant: "outline", className: "h-14 flex-col gap-0.5 text-xs font-bold" })}>
          <Pencil aria-hidden /> Editar
        </Link>
        <Link href={`/emprestimos/novo?cliente=${c.id}`} className={buttonVariants({ className: "h-14 flex-col gap-0.5 text-xs font-bold" })}>
          <FilePlus2 aria-hidden /> Empréstimo
        </Link>
      </section>

      {(c.endereco || c.observacoes) && (
        <section className="grid gap-3 rounded-2xl border bg-card p-4">
          {c.endereco && (
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words">{c.endereco}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.endereco)}`}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary"
              >
                <MapPin className="size-4" aria-hidden /> Mapa
              </a>
            </div>
          )}
          {c.observacoes && <p className="text-sm whitespace-pre-line text-muted-foreground">{c.observacoes}</p>}
        </section>
      )}

      <section className="grid gap-2 rounded-2xl border bg-card p-4">
        <h2 className="text-lg font-extrabold">Contatos de cobrança</h2>
        {c.contatos_cobranca.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contato registrado.</p>
        ) : (
          <ol className="grid gap-2">
            {c.contatos_cobranca.slice(0, 20).map((ct) => (
              <li key={ct.id} className="grid gap-0.5 border-l-2 border-primary/40 pl-3">
                <p className="text-sm font-bold">
                  {NOME_RESULTADO[ct.resultado]}
                  {ct.promessa_para && ` para ${formatData(ct.promessa_para)}`}
                </p>
                <p className="num text-xs text-muted-foreground">
                  {NOME_TIPO_CONTATO[ct.tipo]} · {formatData(ct.criado_em.slice(0, 10))}
                  {ct.observacoes && ` · ${ct.observacoes}`}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {!c.anonimizado_em && (
        <Documentos documentos={c.documentos} clienteId={c.id} podeApagar={admin} voltar={`/clientes/${c.id}`} />
      )}

      <section className="grid gap-2">
        <h2 className="text-lg font-extrabold">Empréstimos</h2>
        {c.emprestimos.length === 0 && (
          <p className="rounded-2xl border border-dashed bg-card px-4 py-6 text-center text-muted-foreground">
            Nenhum empréstimo ainda.
          </p>
        )}
        <ul className="grid gap-2">
          {c.emprestimos.map((e) => {
            const r = resumirParcelas(e.parcelas, hoje);
            return (
              <li key={e.id}>
                <Link
                  href={`/emprestimos/${e.id}`}
                  className="grid gap-1 rounded-2xl border bg-card px-4 py-3 outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="num font-bold">
                      {formatCentavos(e.valor_centavos)} em {e.qtd_parcelas}x
                    </span>
                    {e.status === "ativo" && r.atrasadas > 0 ? (
                      <Selo tom="atraso">{r.atrasadas} {r.atrasadas === 1 ? "parcela atrasada" : "parcelas atrasadas"}</Selo>
                    ) : (
                      <Selo tom={e.status === "ativo" ? "ok" : "neutro"}>{NOME_STATUS[e.status]}</Selo>
                    )}
                  </div>
                  <p className="num text-sm text-muted-foreground">
                    {formatData(e.liberado_em)} · {NOME_SISTEMA[e.sistema]} · {formatPercentual(Number(e.taxa_percentual) / 100)} a.m. ·{" "}
                    {r.pagas} de {r.total} pagas
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      {admin && !c.anonimizado_em && (
        <SecaoLGPD clienteId={c.id} temAtivo={ativos.length > 0} temHistorico={c.emprestimos.length > 0} />
      )}
    </div>
  );
}

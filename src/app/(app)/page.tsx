import { Calculator, Download, FileText, Megaphone, UserPlus } from "lucide-react";
import Link from "next/link";

import { GraficoAtraso, GraficoMensal } from "@/components/app/graficos";
import { formatCentavos, formatDataExtenso, formatPercentual, hojeISO } from "@/lib/format";
import { calcularIndicadores, ultimosMeses } from "@/lib/painel";
import { requireUser } from "@/lib/supabase/server";

const ATALHOS = [
  { href: "/cobranca", rotulo: "Cobrança de hoje", Icone: Megaphone },
  { href: "/calculadora", rotulo: "Simular empréstimo", Icone: Calculator },
  { href: "/clientes/novo", rotulo: "Novo cliente", Icone: UserPlus },
  { href: "/emprestimos", rotulo: "Empréstimos", Icone: FileText },
] as const;

function Indicador({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: string; detalhe?: string; tom?: "atraso" }) {
  return (
    <div className="grid content-start gap-0.5 rounded-2xl border bg-card p-4">
      <p className="text-sm font-bold text-muted-foreground">{rotulo}</p>
      <p className={`font-heading text-[clamp(1.1rem,5.4vw,1.5rem)] font-black whitespace-nowrap ${tom === "atraso" ? "text-late" : ""}`}>{valor}</p>
      {detalhe && <p className="num text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

export default async function InicioPage() {
  const { supabase } = await requireUser();
  const hoje = hojeISO();
  const meses = ultimosMeses(hoje, 6);
  const inicio = meses[0].inicio;
  const fim = meses[meses.length - 1].fim;

  const [{ data: ativos }, { data: abertas }, { data: previstas }, { data: pagamentos }, { data: config }] = await Promise.all([
    supabase.from("emprestimos").select("valor_centavos").eq("status", "ativo"),
    supabase
      .from("parcelas")
      .select("vencimento, valor_centavos, pago_centavos, emprestimos!inner(status)")
      .in("status", ["a_vencer", "paga_parcial"])
      .eq("emprestimos.status", "ativo"),
    supabase
      .from("parcelas")
      .select("vencimento, valor_centavos")
      .neq("status", "cancelada")
      .gte("vencimento", inicio)
      .lte("vencimento", fim),
    supabase
      .from("pagamentos")
      .select("pago_em, valor_centavos, multa_centavos, mora_centavos, desconto_centavos, parcelas(valor_centavos, juros_centavos)")
      .eq("estornado", false)
      .gte("pago_em", inicio)
      .lte("pago_em", fim),
    supabase.from("configuracoes").select("limite_contratos_ativos").maybeSingle(),
  ]);

  const ind = calcularIndicadores({
    hoje,
    abertas: abertas ?? [],
    previstas: previstas ?? [],
    pagamentos: pagamentos ?? [],
    valoresAtivos: (ativos ?? []).map((a) => a.valor_centavos),
  });
  const limite = config?.limite_contratos_ativos ?? 150;
  const mesAtual = meses[meses.length - 1].rotulo;
  const uso = ind.contratosAtivos / limite;

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-bold text-gold-ink">{formatDataExtenso()}</p>
        <h1 className="text-3xl font-black italic text-brand-deep">Painel</h1>
      </section>

      <section className="rounded-2xl bg-brand-deep p-5 text-white">
        <p className="text-sm font-bold text-white/75">Carteira ativa (falta receber)</p>
        <p className="font-heading text-[clamp(2rem,10.5vw,3rem)] leading-tight font-black whitespace-nowrap">{formatCentavos(ind.carteiraCentavos)}</p>
        <p className="mt-1 text-sm text-white/85">
          {ind.atrasadoCentavos > 0
            ? `${formatCentavos(ind.atrasadoCentavos)} atrasado · ${formatPercentual(ind.inadimplencia, 1)} da carteira`
            : "Nada atrasado"}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Indicador
          rotulo={`Recebido em ${mesAtual}`}
          valor={formatCentavos(ind.recebidoMesCentavos)}
          detalhe={`previsto ${formatCentavos(ind.previstoMesCentavos)}`}
        />
        <Indicador rotulo="Juros recebidos no mês" valor={formatCentavos(ind.jurosMesCentavos)} detalhe="com multa e mora, sem descontos" />
        <Indicador
          rotulo="Inadimplência"
          valor={formatPercentual(ind.inadimplencia, 1)}
          detalhe={`${formatCentavos(ind.atrasadoCentavos)} em atraso`}
          tom={ind.inadimplencia >= 0.1 ? "atraso" : undefined}
        />
        <Indicador rotulo="Ticket médio" valor={formatCentavos(ind.ticketMedioCentavos)} detalhe="valor emprestado por contrato ativo" />
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-bold text-muted-foreground">Contratos ativos</p>
          <p className="font-heading text-xl font-black">
            {ind.contratosAtivos} <span className="text-sm text-muted-foreground">de {limite}</span>
          </p>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={limite}
          aria-valuenow={ind.contratosAtivos}
          aria-label="Contratos ativos"
        >
          <div
            className={`h-full rounded-full ${uso >= 0.95 ? "bg-late" : uso >= 0.8 ? "bg-gold" : "bg-primary"}`}
            style={{ width: `${Math.min(100, uso * 100)}%` }}
          />
        </div>
        {uso >= 0.8 && (
          <p className="mt-2 text-xs font-semibold text-gold-ink">
            Perto do limite. Ele pode ser alterado nas Configurações.
          </p>
        )}
      </section>

      <GraficoMensal meses={ind.serie} />
      <GraficoAtraso faixas={ind.faixas} />

      <section className="grid grid-cols-2 gap-3">
        {ATALHOS.map(({ href, rotulo, Icone }) => (
          <Link
            key={rotulo}
            href={href}
            className="flex min-h-24 flex-col justify-between rounded-2xl border bg-card p-4 font-bold outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icone className="size-6 text-primary" aria-hidden />
            {rotulo}
          </Link>
        ))}
      </section>

      <Link href="/configuracoes/exportar" className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-primary">
        <Download className="size-4" aria-hidden /> Exportar planilhas e fazer backup
      </Link>
    </div>
  );
}

import { Calculator, FileText, Megaphone, UserPlus } from "lucide-react";
import Link from "next/link";

import { formatDataExtenso } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

const ATALHOS = [
  { href: "/cobranca", rotulo: "Cobrança de hoje", Icone: Megaphone },
  { href: "/calculadora", rotulo: "Simular empréstimo", Icone: Calculator },
  { href: "/clientes", rotulo: "Novo cliente", Icone: UserPlus },
  { href: "/clientes", rotulo: "Contratos", Icone: FileText },
] as const;

export default async function InicioPage() {
  const { supabase } = await requireUser();

  const [{ count: ativos }, { data: config }] = await Promise.all([
    supabase.from("emprestimos").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    supabase.from("configuracoes").select("limite_contratos_ativos").single(),
  ]);

  const limite = config?.limite_contratos_ativos ?? 150;
  const usados = ativos ?? 0;

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-bold text-gold-ink">{formatDataExtenso()}</p>
        <h1 className="text-3xl font-black italic text-brand-deep">Painel</h1>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <p className="text-sm font-bold text-muted-foreground">Contratos ativos</p>
        <p className="num mt-1 font-heading text-4xl font-black">
          {usados} <span className="text-xl text-muted-foreground">de {limite}</span>
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, (usados / limite) * 100)}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Carteira, recebimentos e inadimplência aparecem aqui na fase 7.
        </p>
      </section>

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
    </div>
  );
}

import { MapPin, Navigation } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Selo } from "@/components/app/selo";
import { buttonVariants } from "@/components/ui/button";
import { montarFila } from "@/lib/cobranca";
import { formatCentavos, formatTelefone, hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Visitas do dia" };

const mapa = (endereco: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

/** O Google Maps aceita até 9 paradas no meio do caminho pelo link. */
function linkRota(enderecos: string[]) {
  const [destino, ...resto] = [...enderecos].reverse();
  const paradas = resto.reverse().slice(0, 9);
  const q = new URLSearchParams({ api: "1", destination: destino, travelmode: "driving" });
  if (paradas.length) q.set("waypoints", paradas.join("|"));
  return `https://www.google.com/maps/dir/?${q}`;
}

export default async function VisitasPage() {
  const { supabase } = await requireUser();
  const hoje = hojeISO();
  const [{ data: emprestimos }, { data: config }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select("id, clientes(id, nome, whatsapp, endereco), parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status, quitada_em)")
      .eq("status", "ativo"),
    supabase.from("configuracoes").select("multa_percentual, mora_percentual_mes").maybeSingle(),
  ]);

  const fila = montarFila(emprestimos ?? [], [], hoje, Number(config?.multa_percentual ?? 2) / 100, Number(config?.mora_percentual_mes ?? 1) / 100, 0);

  // Uma visita por cliente, somando as parcelas atrasadas dele
  const porCliente = new Map<string, { nome: string; endereco: string; whatsapp: string; devido: number; maiorAtraso: number; parcelas: number }>();
  for (const i of fila) {
    if (i.grupo !== "atrasada") continue;
    const atual = porCliente.get(i.cliente.id);
    porCliente.set(i.cliente.id, {
      nome: i.cliente.nome,
      endereco: i.cliente.endereco,
      whatsapp: i.cliente.whatsapp,
      devido: (atual?.devido ?? 0) + i.devidoCentavos,
      maiorAtraso: Math.max(atual?.maiorAtraso ?? 0, i.diasRelativos),
      parcelas: (atual?.parcelas ?? 0) + 1,
    });
  }
  const visitas = [...porCliente.entries()].sort((a, b) => b[1].devido - a[1].devido);
  const comEndereco = visitas.filter(([, v]) => v.endereco);

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href="/cobranca" className="text-sm font-bold text-primary">
          ← Cobrança
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Visitas do dia</h1>
        <p className="text-muted-foreground">Clientes com parcela atrasada, do maior valor para o menor.</p>
      </section>

      {comEndereco.length > 1 && (
        <a href={linkRota(comEndereco.map(([, v]) => v.endereco))} target="_blank" rel="noreferrer" className={buttonVariants({ className: "h-12 text-base font-bold" })}>
          <Navigation aria-hidden /> Abrir rota no Google Maps
          {comEndereco.length > 10 && " (10 primeiros)"}
        </a>
      )}

      {visitas.length === 0 && (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-10 text-center text-muted-foreground">Nenhum cliente atrasado.</p>
      )}

      <ol className="grid gap-2">
        {visitas.map(([id, v]) => (
          <li key={id} className="grid gap-2 rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/clientes/${id}`} className="min-w-0 font-bold break-words hover:underline">
                {v.nome}
              </Link>
              <span className="num shrink-0 font-heading text-lg font-black">{formatCentavos(v.devido)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Selo tom="atraso">{v.maiorAtraso} dias de atraso</Selo>
              {v.parcelas > 1 && <Selo tom="neutro">{v.parcelas} parcelas</Selo>}
            </div>
            {v.endereco ? (
              <a href={mapa(v.endereco)} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-sm text-primary">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="break-words">{v.endereco}</span>
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Sem endereço cadastrado.</p>
            )}
            {v.whatsapp && <p className="num text-sm text-muted-foreground">{formatTelefone(v.whatsapp)}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

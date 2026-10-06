import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { Sistema } from "@/lib/finance";
import { centavosParaTexto, hojeISO } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

import { EmprestimoForm } from "./emprestimo-form";

export const metadata: Metadata = { title: "Novo empréstimo" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

const SISTEMAS: Sistema[] = ["price", "sac", "simples"];

export default async function NovoEmprestimoPage({ searchParams }: PageProps<"/emprestimos/novo">) {
  const q = await searchParams;
  const { supabase } = await requireUser();

  const [{ data: clientes }, { count: ativos }, { data: config }] = await Promise.all([
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("emprestimos").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    supabase.from("configuracoes").select("limite_contratos_ativos").maybeSingle(),
  ]);

  const limite = config?.limite_contratos_ativos ?? 150;
  const lotado = (ativos ?? 0) >= limite;

  // Valores vindos da calculadora ("Virar empréstimo")
  const valorCentavos = Number(texto(q.valor));
  const sistema = texto(q.sistema);
  const inicial = {
    clienteId: clientes?.some((c) => c.id === texto(q.cliente)) ? texto(q.cliente) : "",
    valor: Number.isSafeInteger(valorCentavos) && valorCentavos > 0 ? centavosParaTexto(valorCentavos) : "1.500,00",
    taxa: /^\d+(\.\d+)?$/.test(texto(q.taxa)) ? texto(q.taxa).replace(".", ",") : "9,99",
    parcelas: /^\d+$/.test(texto(q.parcelas)) ? texto(q.parcelas) : "6",
    sistema: SISTEMAS.includes(sistema as Sistema) ? (sistema as Sistema) : ("price" as const),
  };

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-black italic text-brand-deep">Novo empréstimo</h1>

      {lotado && (
        <p role="alert" className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">
          Você está com {ativos} contratos ativos, o limite de {limite}. Quite ou cancele algum, ou aumente o
          limite nas Configurações.
        </p>
      )}

      {clientes && clientes.length === 0 ? (
        <div className="grid gap-3 rounded-2xl border border-dashed bg-card px-5 py-8 text-center">
          <p className="font-bold">Cadastre um cliente primeiro.</p>
          <Link href="/clientes/novo?voltar=emprestimo" className={buttonVariants({ className: "mx-auto h-12 px-5 font-bold" })}>
            <UserPlus aria-hidden /> Cadastrar cliente
          </Link>
          <Link href="/emprestimos/importar" className="text-sm font-bold text-primary">
            Ou importe clientes e contratos de uma planilha
          </Link>
        </div>
      ) : (
        <EmprestimoForm clientes={clientes ?? []} hoje={hojeISO()} inicial={inicial} />
      )}
    </div>
  );
}

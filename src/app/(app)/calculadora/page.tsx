import type { Metadata } from "next";

import { jurosAtrasoDiario } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/server";

import { Calculadora, type ConfigCalculadora } from "./calculadora";

export const metadata: Metadata = { title: "Calculadora" };

export default async function CalculadoraPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("configuracoes")
    .select("nome_empresa, juros_atraso_dia_percentual")
    .maybeSingle();

  const config: ConfigCalculadora = {
    nomeEmpresa: data?.nome_empresa || "MC Créditos",
    // Percentual vira decimal (1 → 0.01); sem configuração, 1% ao dia
    jurosAtrasoDia: jurosAtrasoDiario(data?.juros_atraso_dia_percentual),
  };

  return (
    <div className="grid min-w-0 gap-4">
      <div>
        <h1 className="text-3xl font-black italic text-brand-deep">Calculadora</h1>
        <p className="text-sm text-muted-foreground">Simule sem cadastrar nada.</p>
      </div>
      <Calculadora config={config} />
    </div>
  );
}

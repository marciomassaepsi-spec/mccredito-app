import type { Metadata } from "next";

import { requireUser } from "@/lib/supabase/server";

import { Calculadora, type ConfigCalculadora } from "./calculadora";

export const metadata: Metadata = { title: "Calculadora" };

export default async function CalculadoraPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("configuracoes")
    .select("nome_empresa, multa_percentual, mora_percentual_mes, multa_limite_aviso, mora_limite_aviso")
    .maybeSingle();

  // numeric chega como texto do Supabase; percentuais viram decimais (2 → 0.02)
  const pct = (v: number | string | undefined, padrao: number) =>
    v === undefined ? padrao : Number(v) / 100;

  const config: ConfigCalculadora = {
    nomeEmpresa: data?.nome_empresa || "MC Créditos",
    multa: pct(data?.multa_percentual, 0.02),
    mora: pct(data?.mora_percentual_mes, 0.01),
    multaLimite: pct(data?.multa_limite_aviso, 0.02),
    moraLimite: pct(data?.mora_limite_aviso, 0.01),
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

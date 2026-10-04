"use client";

import { useState } from "react";

import { cn } from "cn";

import { AtualizarAtraso, ConverterTaxa, DescobrirTaxa, JurosCompostos } from "./outros-modos";
import { ENTRADA_INICIAL, SimulacaoEmprestimo } from "./simulacao-emprestimo";

const MODOS = [
  { id: "price", rotulo: "Price" },
  { id: "sac", rotulo: "SAC" },
  { id: "simples", rotulo: "Juros simples" },
  { id: "compostos", rotulo: "Compostos" },
  { id: "taxa", rotulo: "Descobrir taxa" },
  { id: "atraso", rotulo: "Atraso" },
  { id: "conversao", rotulo: "Mensal ↔ anual" },
] as const;

type Modo = (typeof MODOS)[number]["id"];

export type ConfigCalculadora = {
  nomeEmpresa: string;
  multa: number;
  mora: number;
  multaLimite: number;
  moraLimite: number;
};

export function Calculadora({ config }: { config: ConfigCalculadora }) {
  const [modo, setModo] = useState<Modo>("price");
  const [entrada, setEntrada] = useState(ENTRADA_INICIAL);

  return (
    <div className="grid min-w-0 gap-5">
      <div
        role="tablist"
        aria-label="Tipo de cálculo"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            id={`aba-${m.id}`}
            aria-selected={modo === m.id}
            aria-controls="painel-calculadora"
            onClick={() => setModo(m.id)}
            className={cn(
              "h-10 shrink-0 rounded-full border px-4 text-sm font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              modo === m.id
                ? "border-gold bg-gold text-[#2b2300]"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {m.rotulo}
          </button>
        ))}
      </div>

      <div id="painel-calculadora" role="tabpanel" className="min-w-0" aria-labelledby={`aba-${modo}`}>
        {(modo === "price" || modo === "sac" || modo === "simples") && (
          <SimulacaoEmprestimo
            sistema={modo}
            nomeEmpresa={config.nomeEmpresa}
            entrada={entrada}
            onChange={setEntrada}
          />
        )}
        {modo === "compostos" && <JurosCompostos />}
        {modo === "taxa" && <DescobrirTaxa />}
        {modo === "atraso" && (
          <AtualizarAtraso
            multaPadrao={config.multa}
            moraPadrao={config.mora}
            multaLimite={config.multaLimite}
            moraLimite={config.moraLimite}
          />
        )}
        {modo === "conversao" && <ConverterTaxa />}
      </div>
    </div>
  );
}

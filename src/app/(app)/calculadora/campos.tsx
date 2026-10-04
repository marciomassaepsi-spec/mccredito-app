"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CampoProps = {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  /** Texto fixo antes do número, ex.: "R$" */
  prefixo?: string;
  /** Texto fixo depois do número, ex.: "% a.m." */
  sufixo?: string;
  erro?: string | null;
  tipo?: "decimal" | "inteiro";
};

/** Campo numérico grande, pensado para digitar no celular. */
export function CampoNumero({
  id,
  rotulo,
  valor,
  onChange,
  prefixo,
  sufixo,
  erro,
  tipo = "decimal",
}: CampoProps) {
  const idErro = `${id}-erro`;
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {rotulo}
      </Label>
      <div className="relative">
        {prefixo && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-bold text-muted-foreground">
            {prefixo}
          </span>
        )}
        <Input
          id={id}
          inputMode={tipo === "inteiro" ? "numeric" : "decimal"}
          autoComplete="off"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          className="num h-12 bg-card text-lg font-bold"
          style={{
            paddingLeft: prefixo ? `${prefixo.length * 0.6 + 1.25}rem` : undefined,
            paddingRight: sufixo ? `${sufixo.length * 0.5 + 1}rem` : undefined,
          }}
        />
        {sufixo && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-muted-foreground">
            {sufixo}
          </span>
        )}
      </div>
      {erro && (
        <p id={idErro} className="text-xs font-semibold text-late">
          {erro}
        </p>
      )}
    </div>
  );
}

export function lerInteiro(texto: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(texto.trim())) return null;
  const n = Number(texto);
  return n >= min && n <= max ? n : null;
}

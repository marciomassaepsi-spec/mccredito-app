"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "cn";
import { Button } from "@/components/ui/button";

/** Estado devolvido pelas Server Actions de formulário. */
export type EstadoForm = {
  erros: Record<string, string>;
  mensagem: string | null;
  ok: boolean;
  /** O que foi digitado, para repreencher o formulário quando há erro */
  valores: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoForm = { erros: {}, mensagem: null, ok: false, valores: {} };

const base =
  "w-full min-w-0 rounded-xl border border-input bg-card px-3 text-base outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:opacity-60";

type CampoProps = {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Campo({ id, rotulo, erro, dica, children, className }: CampoProps) {
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-bold">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-sm font-semibold text-late">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

type ComErro = { erro?: string };

function ariaErro(id: string | undefined, erro: string | undefined) {
  return erro ? { "aria-invalid": true, "aria-describedby": `${id}-erro` } : {};
}

export function Entrada({ className, erro, ...props }: ComponentProps<"input"> & ComErro) {
  return <input className={cn(base, "h-12", className)} {...ariaErro(props.id, erro)} {...props} />;
}

export function Selecao({ className, erro, ...props }: ComponentProps<"select"> & ComErro) {
  return <select className={cn(base, "h-12 pr-8", className)} {...ariaErro(props.id, erro)} {...props} />;
}

export function AreaTexto({ className, erro, ...props }: ComponentProps<"textarea"> & ComErro) {
  return <textarea className={cn(base, "min-h-24 py-2.5", className)} {...ariaErro(props.id, erro)} {...props} />;
}

export function BotaoEnviar({
  children,
  enviando = "Salvando…",
  className,
  variant,
}: {
  children: ReactNode;
  enviando?: string;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={cn("h-12 text-base font-bold", className)}>
      {pending ? enviando : children}
    </Button>
  );
}

export function MensagemForm({ estado }: { estado: EstadoForm }) {
  if (!estado.mensagem) return null;
  return (
    <p
      role={estado.ok ? "status" : "alert"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-semibold",
        estado.ok ? "bg-secondary text-secondary-foreground" : "bg-late-soft text-late",
      )}
    >
      {estado.mensagem}
    </p>
  );
}

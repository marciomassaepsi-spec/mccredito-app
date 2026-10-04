import type { ReactNode } from "react";

/** Cartão verde-escuro de resultado, como no plano aprovado. */
export function CartaoResultado({ children }: { children: ReactNode }) {
  return (
    <section
      aria-live="polite"
      className="grid gap-3 rounded-2xl bg-brand-deep p-5 text-white shadow-sm dark:bg-secondary"
    >
      {children}
    </section>
  );
}

export function Destaque({ children, legenda }: { children: ReactNode; legenda?: string }) {
  return (
    <div>
      {legenda && <p className="text-sm font-bold text-white/75">{legenda}</p>}
      <p className="num font-heading text-3xl leading-tight font-black">{children}</p>
    </div>
  );
}

export function Linhas({ itens }: { itens: Array<[string, string]> }) {
  return (
    <dl className="grid gap-1.5 border-t border-white/15 pt-3 text-sm">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo} className="flex items-baseline justify-between gap-3">
          <dt className="text-white/80">{rotulo}</dt>
          <dd className="num text-right font-bold text-[#f0d45a]">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
      {children}
    </p>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed bg-card px-4 py-6 text-center text-muted-foreground">
      {children}
    </p>
  );
}

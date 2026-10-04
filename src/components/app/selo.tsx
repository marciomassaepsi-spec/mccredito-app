import type { ReactNode } from "react";

import { cn } from "cn";

export type Tom = "ok" | "hoje" | "atraso" | "neutro" | "info";

const TONS: Record<Tom, string> = {
  ok: "bg-secondary text-secondary-foreground",
  hoje: "bg-accent text-accent-foreground",
  atraso: "bg-late-soft text-late",
  neutro: "bg-muted text-muted-foreground",
  info: "bg-primary text-primary-foreground",
};

/** Etiqueta de situação. A cor nunca vem sozinha: o texto diz o que é. */
export function Selo({ tom, children, className }: { tom: Tom; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", TONS[tom], className)}>
      {children}
    </span>
  );
}

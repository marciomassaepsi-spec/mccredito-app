import type { LucideIcon } from "lucide-react";

type EmBreveProps = {
  titulo: string;
  fase: number;
  descricao: string;
  itens: string[];
  Icone: LucideIcon;
};

/** Tela provisória das seções que chegam nas próximas fases. */
export function EmBreve({ titulo, fase, descricao, itens, Icone }: EmBreveProps) {
  return (
    <section className="grid gap-5">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <Icone className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-black italic text-brand-deep">{titulo}</h1>
          <p className="text-sm font-bold text-gold-ink">Chega na fase {fase}</p>
        </div>
      </div>
      <p className="text-muted-foreground">{descricao}</p>
      <ul className="grid gap-2">
        {itens.map((item) => (
          <li key={item} className="rounded-xl border bg-card px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

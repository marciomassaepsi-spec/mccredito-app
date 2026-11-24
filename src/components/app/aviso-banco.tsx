import { TriangleAlert } from "lucide-react";

import { textoDoProblema, type ProblemaBanco } from "@/lib/acoes";

/** Aviso no topo da tela quando alguma consulta ao banco falhou. */
export function AvisoBanco({ problema, detalhe }: { problema: ProblemaBanco; detalhe?: string }) {
  if (!problema) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-late/40 bg-late-soft px-4 py-3 text-late">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="text-sm font-semibold">
        {textoDoProblema(problema)}
        {detalhe ? ` ${detalhe}` : ""}
      </p>
    </div>
  );
}

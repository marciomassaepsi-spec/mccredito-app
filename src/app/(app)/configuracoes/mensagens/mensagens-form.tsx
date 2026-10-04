"use client";

import { useState } from "react";

import { AreaTexto, BotaoEnviar, useAcaoSemReset, MensagemForm } from "@/components/app/form";
import { preencherMensagem } from "@/lib/cobranca";

import { salvarMensagens } from "./actions";

type Modelo = { dias_relativos: number; titulo: string; texto: string; ativo: boolean };

function quando(d: number) {
  if (d < 0) return `${-d} ${d === -1 ? "dia" : "dias"} antes do vencimento`;
  if (d === 0) return "No dia do vencimento";
  return `A partir de ${d} ${d === 1 ? "dia" : "dias"} de atraso`;
}

export function MensagensForm({ modelos, exemplo }: { modelos: Modelo[]; exemplo: Record<string, string> }) {
  const { estado, aoEnviar, enviando } = useAcaoSemReset(salvarMensagens);
  const [textos, setTextos] = useState(() =>
    Object.fromEntries(modelos.map((m) => [m.dias_relativos, m.texto])),
  );

  return (
    <form onSubmit={aoEnviar} className="grid gap-4">
      {modelos.map((m) => {
        const d = m.dias_relativos;
        const erro = estado.erros[`texto_${d}`];
        const previa = preencherMensagem(textos[d] ?? "", exemplo).texto;
        return (
          <fieldset key={d} className="grid gap-3 rounded-2xl border bg-card p-4">
            <input type="hidden" name="dias" value={d} />
            <div className="flex items-center justify-between gap-3">
              <legend className="font-extrabold">{quando(d)}</legend>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name={`ativo_${d}`}
                  defaultChecked={estado.valores[`texto_${d}`] !== undefined ? estado.valores[`ativo_${d}`] === "on" : m.ativo}
                  className="size-5 accent-primary"
                />
                Ligada
              </label>
            </div>
            <label htmlFor={`texto_${d}`} className="sr-only">
              Mensagem: {quando(d)}
            </label>
            <AreaTexto
              id={`texto_${d}`}
              name={`texto_${d}`}
              value={textos[d] ?? ""}
              onChange={(e) => setTextos((t) => ({ ...t, [d]: e.target.value }))}
              erro={erro}
              className="min-h-28 text-sm"
            />
            {erro && (
              <p id={`texto_${d}-erro`} className="text-sm font-semibold text-late">
                {erro}
              </p>
            )}
            <div className="rounded-xl bg-[#e7f6ec] px-3 py-2 text-sm text-[#14211b] dark:bg-secondary dark:text-secondary-foreground">
              <p className="text-xs font-bold text-muted-foreground">Como o cliente recebe</p>
              <p className="whitespace-pre-line">{previa}</p>
            </div>
          </fieldset>
        );
      })}
      <MensagemForm estado={estado} />
      <BotaoEnviar pendente={enviando}>Salvar mensagens</BotaoEnviar>
    </form>
  );
}

"use client";

import { Paperclip } from "lucide-react";
import { useState } from "react";

import { formDataComArquivoReduzido } from "@/lib/comprimir";

import { useAcaoSemReset, type EstadoForm } from "./form";

/** Como useAcaoSemReset, mas reduz a foto anexada antes de enviar. */
export function useAcaoComArquivo(acao: (anterior: EstadoForm, formData: FormData) => Promise<EstadoForm>) {
  return useAcaoSemReset(acao, formDataComArquivoReduzido);
}


export function CampoArquivo({
  id = "arquivo",
  rotulo,
  erro,
  obrigatorio = false,
}: {
  id?: string;
  rotulo: string;
  erro?: string;
  obrigatorio?: boolean;
}) {
  const [nome, setNome] = useState("");
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-bold">{rotulo}</span>
      <label
        htmlFor={id}
        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-card px-3 py-2 focus-within:ring-3 focus-within:ring-ring/40"
      >
        <Paperclip className="size-5 shrink-0 text-primary" aria-hidden />
        <span className={nome ? "min-w-0 truncate font-semibold" : "text-muted-foreground"}>
          {nome || "Tirar foto ou escolher arquivo (PDF ou imagem)"}
        </span>
        <input
          id={id}
          name="arquivo"
          type="file"
          accept="image/*,application/pdf"
          required={obrigatorio}
          className="sr-only"
          aria-describedby={erro ? `${id}-erro` : undefined}
          onChange={(e) => setNome(e.target.files?.[0]?.name ?? "")}
        />
      </label>
      {erro && (
        <p id={`${id}-erro`} className="text-sm font-semibold text-late">
          {erro}
        </p>
      )}
    </div>
  );
}

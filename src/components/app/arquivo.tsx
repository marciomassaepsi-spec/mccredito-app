"use client";

import { Paperclip } from "lucide-react";
import { startTransition, useActionState, useState, type FormEvent } from "react";

import { formDataComArquivoReduzido } from "@/lib/comprimir";

import { ESTADO_INICIAL, type EstadoForm } from "./form";

type Acao = (anterior: EstadoForm, formData: FormData) => Promise<EstadoForm>;

/**
 * Como useActionState, mas reduz a foto anexada antes de enviar.
 * Devolve o handler para o onSubmit do formulário.
 */
export function useAcaoComArquivo(acao: Acao) {
  const [estado, despachar, pendente] = useActionState(acao, ESTADO_INICIAL);
  const [preparando, setPreparando] = useState(false);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPreparando(true);
    try {
      const dados = await formDataComArquivoReduzido(evento.currentTarget);
      startTransition(() => despachar(dados));
    } finally {
      setPreparando(false);
    }
  }

  return { estado, aoEnviar, enviando: pendente || preparando };
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

"use client";

import { AreaTexto, BotaoEnviar, useAcaoSemReset, MensagemForm } from "@/components/app/form";

import { salvarModeloContrato } from "./actions";

export function ModeloForm({ modelo, personalizado }: { modelo: string; personalizado: boolean }) {
  const { estado, aoEnviar, enviando } = useAcaoSemReset(salvarModeloContrato);
  return (
    <div className="grid gap-3">
      <form key={estado.mensagem ?? "modelo"} onSubmit={aoEnviar} className="grid gap-3">
        <label htmlFor="modelo" className="text-sm font-bold">
          Texto do contrato
        </label>
        <AreaTexto
          id="modelo"
          name="modelo"
          defaultValue={estado.valores.modelo ?? modelo}
          erro={estado.erros.modelo}
          spellCheck
          className="min-h-[28rem] font-mono text-sm leading-relaxed"
        />
        <MensagemForm estado={estado} />
        <BotaoEnviar pendente={enviando}>Salvar modelo</BotaoEnviar>
      </form>
      {personalizado && (
        <form onSubmit={aoEnviar}>
          <input type="hidden" name="restaurar" value="1" />
          <BotaoEnviar pendente={enviando} variant="ghost" enviando="Restaurando…" className="w-full text-muted-foreground">
            Voltar para o modelo padrão
          </BotaoEnviar>
        </form>
      )}
    </div>
  );
}

"use client";

import { useActionState } from "react";

import { AreaTexto, BotaoEnviar, ESTADO_INICIAL, MensagemForm } from "@/components/app/form";

import { salvarModeloContrato } from "./actions";

export function ModeloForm({ modelo, personalizado }: { modelo: string; personalizado: boolean }) {
  const [estado, acao] = useActionState(salvarModeloContrato, ESTADO_INICIAL);
  return (
    <div className="grid gap-3">
      <form key={estado.mensagem ?? "modelo"} action={acao} className="grid gap-3">
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
        <BotaoEnviar>Salvar modelo</BotaoEnviar>
      </form>
      {personalizado && (
        <form action={acao}>
          <input type="hidden" name="restaurar" value="1" />
          <BotaoEnviar variant="ghost" enviando="Restaurando…" className="w-full text-muted-foreground">
            Voltar para o modelo padrão
          </BotaoEnviar>
        </form>
      )}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";

import { AreaTexto, BotaoEnviar, Campo, ESTADO_INICIAL, MensagemForm } from "@/components/app/form";
import { Button } from "@/components/ui/button";

import { cancelarEmprestimo } from "../actions";

export function CancelarForm({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useActionState(cancelarEmprestimo, ESTADO_INICIAL);

  if (!aberto) {
    return (
      <Button variant="ghost" className="h-12 justify-self-start font-bold text-late" onClick={() => setAberto(true)}>
        Cancelar empréstimo
      </Button>
    );
  }

  return (
    <form action={acao} className="grid gap-3 rounded-2xl border border-late/40 bg-late-soft/40 p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">
        As parcelas em aberto deixam de ser cobradas. Pagamentos já registrados continuam no histórico. Isso
        não pode ser desfeito.
      </p>
      <Campo id="motivo" rotulo="Motivo" erro={estado.erros.motivo}>
        <AreaTexto id="motivo" name="motivo" defaultValue={estado.valores.motivo ?? ""} erro={estado.erros.motivo} className="min-h-16" />
      </Campo>
      <MensagemForm estado={estado} />
      <div className="grid gap-2 sm:grid-cols-2">
        <BotaoEnviar variant="destructive" enviando="Cancelando…">
          Confirmar cancelamento
        </BotaoEnviar>
        <Button type="button" variant="outline" className="h-12 font-bold" onClick={() => setAberto(false)}>
          Voltar
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";

import { AreaTexto, BotaoEnviar, Campo, useAcaoSemReset, MensagemForm } from "@/components/app/form";
import { Button } from "@/components/ui/button";

import { estornarPagamento } from "../pagamentos-actions";

export function EstornarForm({ pagamentoId, emprestimoId }: { pagamentoId: string; emprestimoId: string }) {
  const [aberto, setAberto] = useState(false);
  const { estado, aoEnviar, enviando } = useAcaoSemReset(estornarPagamento);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm font-bold text-late underline-offset-4 hover:underline">
        Estornar
      </button>
    );
  }
  return (
    <form onSubmit={aoEnviar} className="col-span-full grid gap-2 rounded-xl bg-late-soft/50 p-3">
      <input type="hidden" name="pagamento_id" value={pagamentoId} />
      <input type="hidden" name="emprestimo_id" value={emprestimoId} />
      <Campo id={`motivo-${pagamentoId}`} rotulo="Motivo do estorno" erro={estado.erros.motivo}>
        <AreaTexto id={`motivo-${pagamentoId}`} name="motivo" className="min-h-14" placeholder="Ex.: PIX não caiu na conta" />
      </Campo>
      <MensagemForm estado={estado} />
      <div className="grid grid-cols-2 gap-2">
        <BotaoEnviar pendente={enviando} variant="destructive" enviando="Estornando…" className="h-11">
          Confirmar estorno
        </BotaoEnviar>
        <Button type="button" variant="ghost" className="h-11 font-bold" onClick={() => setAberto(false)}>
          Voltar
        </Button>
      </div>
    </form>
  );
}

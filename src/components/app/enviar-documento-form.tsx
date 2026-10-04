"use client";

import { useState } from "react";

import { enviarDocumento } from "@/app/(app)/emprestimos/pagamentos-actions";
import { Button } from "@/components/ui/button";

import { CampoArquivo, useAcaoComArquivo } from "./arquivo";
import { Campo, MensagemForm, Selecao } from "./form";

export function EnviarDocumentoForm({ emprestimoId, clienteId }: { emprestimoId?: string; clienteId?: string }) {
  const { estado, aoEnviar, enviando } = useAcaoComArquivo(enviarDocumento);
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <Button type="button" variant="outline" className="h-11 font-bold" onClick={() => setAberto(true)}>
        + Guardar documento
      </Button>
    );
  }

  return (
    // key: depois de guardar, o formulário volta limpo
    <form key={estado.mensagem ?? "novo"} onSubmit={aoEnviar} className="grid gap-3 border-t pt-3" noValidate>
      {emprestimoId && <input type="hidden" name="emprestimo_id" value={emprestimoId} />}
      {clienteId && <input type="hidden" name="cliente_id" value={clienteId} />}
      <Campo id="tipo" rotulo="Tipo" erro={estado.erros.tipo}>
        <Selecao id="tipo" name="tipo" defaultValue={emprestimoId ? "contrato" : "documento_cliente"}>
          {emprestimoId && <option value="contrato">Contrato assinado</option>}
          {emprestimoId && <option value="promissoria">Nota promissória</option>}
          <option value="documento_cliente">Documento do cliente (RG, CNH)</option>
          <option value="comprovante">Comprovante</option>
          <option value="outro">Outro</option>
        </Selecao>
      </Campo>
      <CampoArquivo rotulo="Arquivo" erro={estado.erros.arquivo} obrigatorio />
      <MensagemForm estado={estado} />
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" disabled={enviando} className="h-11 font-bold">
          {enviando ? "Enviando…" : "Guardar"}
        </Button>
        <Button type="button" variant="ghost" className="h-11 font-bold" onClick={() => setAberto(false)}>
          Fechar
        </Button>
      </div>
    </form>
  );
}

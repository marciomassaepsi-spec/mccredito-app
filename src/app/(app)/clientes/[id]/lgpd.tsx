"use client";

import { Download, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { BotaoEnviar, Campo, Entrada, MensagemForm, useAcaoSemReset } from "@/components/app/form";
import { Button, buttonVariants } from "@/components/ui/button";

import { excluirDadosCliente } from "../actions";

export function SecaoLGPD({ clienteId, temAtivo, temHistorico }: { clienteId: string; temAtivo: boolean; temHistorico: boolean }) {
  const [aberto, setAberto] = useState(false);
  const { estado, aoEnviar, enviando } = useAcaoSemReset(excluirDadosCliente);

  return (
    <section className="grid gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" aria-hidden />
        <h2 className="text-lg font-extrabold">Dados pessoais (LGPD)</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Se o cliente pedir, entregue uma cópia dos dados dele ou exclua os dados pessoais.
      </p>
      <a href={`/clientes/${clienteId}/dados`} download className={buttonVariants({ variant: "outline", className: "h-11 font-bold" })}>
        <Download aria-hidden /> Baixar os dados deste cliente
      </a>

      {!aberto ? (
        <Button type="button" variant="ghost" className="h-11 justify-self-start font-bold text-late" onClick={() => setAberto(true)}>
          Excluir dados pessoais
        </Button>
      ) : temAtivo ? (
        <p className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
          Este cliente tem empréstimo ativo. Quite, renegocie ou cancele antes de excluir os dados.
        </p>
      ) : (
        <form onSubmit={aoEnviar} className="grid gap-3 rounded-xl border border-late/40 bg-late-soft/40 p-3">
          <input type="hidden" name="cliente_id" value={clienteId} />
          <p className="text-sm">
            {temHistorico
              ? "Nome, CPF, telefone, endereço, observações e arquivos guardados serão apagados. Os valores dos empréstimos e pagamentos ficam, sem identificação, porque a lei permite guardá-los para cumprir obrigações legais."
              : "O cadastro e os arquivos deste cliente serão apagados de vez."}{" "}
            Não dá para desfazer.
          </p>
          <Campo id="confirmacao" rotulo="Digite EXCLUIR para confirmar" erro={estado.erros.confirmacao}>
            <Entrada id="confirmacao" name="confirmacao" autoComplete="off" autoCapitalize="characters" erro={estado.erros.confirmacao} />
          </Campo>
          <MensagemForm estado={estado} />
          <div className="grid grid-cols-2 gap-2">
            <BotaoEnviar pendente={enviando} variant="destructive" enviando="Excluindo…" className="h-11">
              Excluir dados
            </BotaoEnviar>
            <Button type="button" variant="outline" className="h-11 font-bold" onClick={() => setAberto(false)}>
              Voltar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

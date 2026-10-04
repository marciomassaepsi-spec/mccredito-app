"use client";

import { FileDown, Save } from "lucide-react";
import { useActionState } from "react";

import { BotaoEnviar, ESTADO_INICIAL, MensagemForm } from "@/components/app/form";
import { buttonVariants } from "@/components/ui/button";

import { guardarContrato } from "../pagamentos-actions";

export function ContratoCard({ emprestimoId, dadosIncompletos }: { emprestimoId: string; dadosIncompletos: boolean }) {
  const [estado, acao] = useActionState(guardarContrato, ESTADO_INICIAL);
  return (
    <section className="grid gap-3 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="text-lg font-extrabold">Contrato</h2>
        <p className="text-sm text-muted-foreground">Gerado com os dados deste empréstimo e o modelo das Configurações.</p>
      </div>
      {dadosIncompletos && (
        <p className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
          Faltam seus dados (nome completo, CPF, cidade ou PIX) nas Configurações. O contrato sai com lacunas.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={`/emprestimos/${emprestimoId}/contrato`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ className: "h-12 text-base font-bold" })}
        >
          <FileDown aria-hidden /> Abrir PDF
        </a>
        <form action={acao} className="grid">
          <input type="hidden" name="emprestimo_id" value={emprestimoId} />
          <BotaoEnviar variant="outline" enviando="Guardando…" className="border-gold text-gold-ink">
            <Save aria-hidden /> Guardar cópia
          </BotaoEnviar>
        </form>
      </div>
      <MensagemForm estado={estado} />
    </section>
  );
}

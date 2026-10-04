"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  AreaTexto,
  BotaoEnviar,
  Campo,
  Entrada,
  ESTADO_INICIAL,
  MensagemForm,
} from "@/components/app/form";

import { salvarCliente } from "./actions";

export type ClienteInicial = {
  id: string;
  nome: string;
  cpf: string;
  whatsapp: string;
  endereco: string;
  observacoes: string;
  consentimento: boolean;
};

export function ClienteForm({ inicial, voltar }: { inicial?: ClienteInicial; voltar?: string }) {
  const [estado, acao] = useActionState(salvarCliente, ESTADO_INICIAL);
  const v = (campo: keyof ClienteInicial) => estado.valores[campo] ?? String(inicial?.[campo] ?? "");
  const e = estado.erros;

  return (
    // Remonta com o que foi digitado depois de um envio com erro
    <form key={JSON.stringify(estado.valores)} action={acao} className="grid gap-4" noValidate>
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      {voltar && <input type="hidden" name="voltar" value={voltar} />}

      <Campo id="nome" rotulo="Nome completo" erro={e.nome}>
        <Entrada id="nome" name="nome" autoComplete="off" defaultValue={v("nome")} erro={e.nome} required />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="cpf" rotulo="CPF" erro={e.cpf}>
          <Entrada id="cpf" name="cpf" inputMode="numeric" placeholder="000.000.000-00" defaultValue={v("cpf")} erro={e.cpf} required />
        </Campo>
        <Campo id="whatsapp" rotulo="WhatsApp" erro={e.whatsapp} dica="Com DDD. Usado nos botões de cobrança.">
          <Entrada id="whatsapp" name="whatsapp" type="tel" inputMode="tel" placeholder="(71) 90000-0000" defaultValue={v("whatsapp")} erro={e.whatsapp} />
        </Campo>
      </div>

      <Campo id="endereco" rotulo="Endereço" erro={e.endereco} dica="Rua, número, bairro e cidade. Usado nas visitas.">
        <Entrada id="endereco" name="endereco" autoComplete="off" defaultValue={v("endereco")} erro={e.endereco} />
      </Campo>

      <Campo id="observacoes" rotulo="Observações" erro={e.observacoes}>
        <AreaTexto id="observacoes" name="observacoes" defaultValue={v("observacoes")} erro={e.observacoes} />
      </Campo>

      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 rounded-xl border bg-card p-3">
          <input
            type="checkbox"
            name="consentimento"
            defaultChecked={estado.valores.consentimento === "on" || (inicial?.consentimento ?? false)}
            className="mt-1 size-5 accent-primary"
            aria-describedby={e.consentimento ? "consentimento-erro" : undefined}
          />
          <span className="text-sm">
            O cliente autorizou o uso dos dados dele para o contrato e a cobrança deste empréstimo (LGPD).
          </span>
        </label>
        {e.consentimento && (
          <p id="consentimento-erro" className="text-sm font-semibold text-late">
            {e.consentimento}
          </p>
        )}
      </div>

      <MensagemForm estado={estado} />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <BotaoEnviar>{inicial ? "Salvar alterações" : "Cadastrar cliente"}</BotaoEnviar>
        <Link
          href={inicial ? `/clientes/${inicial.id}` : "/clientes"}
          className="grid h-12 place-items-center rounded-lg px-4 font-bold text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

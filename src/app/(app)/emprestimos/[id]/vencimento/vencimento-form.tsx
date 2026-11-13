"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { AreaTexto, Campo, Entrada, MensagemForm, Selecao, useAcaoSemReset } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import { remarcarVencimentos, type ParcelaParaRemarcar, type Periodicidade } from "@/lib/finance";
import { formatCentavos, formatData } from "@/lib/format";

import { alterarVencimento } from "../../pagamentos-actions";

type Parcela = ParcelaParaRemarcar & { valor_centavos: number; pago_centavos: number };

type Props = {
  emprestimoId: string;
  /** Todas as parcelas do empréstimo, em ordem */
  parcelas: Parcela[];
  periodicidade: Periodicidade;
  liberadoEm: string;
  hoje: string;
};

const PASSO: Record<Periodicidade, string> = {
  mensal: "no mesmo dia, mês a mês",
  quinzenal: "de 15 em 15 dias",
  semanal: "de 7 em 7 dias",
};

export function VencimentoForm({ emprestimoId, parcelas, periodicidade, liberadoEm, hoje }: Props) {
  const { estado, aoEnviar, enviando } = useAcaoSemReset(alterarVencimento);
  const abertas = parcelas.filter((p) => p.status === "a_vencer" || p.status === "paga_parcial");

  const [parcelaId, setParcelaId] = useState(abertas[0].id);
  const alvo = abertas.find((p) => p.id === parcelaId) ?? abertas[0];
  const [novaData, setNovaData] = useState(alvo.vencimento);
  const [seguintes, setSeguintes] = useState(true);
  const [confirmando, setConfirmando] = useState(false);

  const temSeguintes = abertas.some((p) => p.numero > alvo.numero);
  const mudou = novaData !== alvo.vencimento;
  const r = remarcarVencimentos({ parcelas, parcelaId: alvo.id, novaData, seguintes, periodicidade, liberadoEm });
  const mudancas = r.ok ? r.mudancas : [];
  const erroData = mudou && !r.ok ? r.erro : estado.erros.nova_data;

  function trocarParcela(id: string) {
    const p = abertas.find((x) => x.id === id);
    setParcelaId(id);
    if (p) setNovaData(p.vencimento);
    setConfirmando(false);
  }

  return (
    <form onSubmit={aoEnviar} className="grid gap-5" noValidate>
      <input type="hidden" name="emprestimo_id" value={emprestimoId} />

      <Campo id="parcela_id" rotulo="Parcela" erro={estado.erros.parcela_id}>
        <Selecao id="parcela_id" name="parcela_id" value={alvo.id} onChange={(ev) => trocarParcela(ev.target.value)}>
          {abertas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.numero}ª · vence {formatData(p.vencimento)} · {formatCentavos(p.valor_centavos - p.pago_centavos)}
            </option>
          ))}
        </Selecao>
      </Campo>

      <Campo
        id="nova_data"
        rotulo="Nova data de vencimento"
        erro={erroData}
        dica={mudou && novaData < hoje ? "Essa data já passou: a parcela vai aparecer como atrasada." : undefined}
      >
        <Entrada
          id="nova_data"
          name="nova_data"
          type="date"
          min={liberadoEm}
          value={novaData}
          onChange={(ev) => {
            setNovaData(ev.target.value);
            setConfirmando(false);
          }}
          erro={erroData}
        />
      </Campo>

      {temSeguintes && (
        <label className="flex items-start gap-3 rounded-xl border bg-card p-3">
          <input
            type="checkbox"
            name="seguintes"
            checked={seguintes}
            onChange={(ev) => {
              setSeguintes(ev.target.checked);
              setConfirmando(false);
            }}
            className="mt-1 size-5 shrink-0 accent-primary"
          />
          <span className="text-sm">
            <b>Mudar também as parcelas seguintes</b>
            <span className="block text-muted-foreground">
              As que estão em aberto depois da {alvo.numero}ª passam a vencer {PASSO[periodicidade]} a partir da nova data.
            </span>
          </span>
        </label>
      )}

      <section className="rounded-2xl border bg-card" aria-live="polite">
        <h2 className="px-4 pt-4 text-lg font-extrabold">O que muda</h2>
        {mudancas.length === 0 ? (
          <p className="px-4 pt-1 pb-4 text-sm text-muted-foreground">
            {mudou ? "Corrija a data para ver as parcelas que mudam." : "Escolha a nova data para ver as parcelas que mudam."}
          </p>
        ) : (
          <>
            <ol className="num mt-2 divide-y border-t text-sm">
              {mudancas.map((m) => (
                <li key={m.parcela_id} className="grid grid-cols-[2.25rem_1fr] items-center gap-x-3 px-4 py-2.5">
                  <span className="font-bold text-muted-foreground">{m.numero}ª</span>
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="text-muted-foreground line-through">{formatData(m.antes)}</span>
                    <ArrowRight aria-label="para" className="size-4 text-muted-foreground" />
                    <b>{formatData(m.depois)}</b>
                  </span>
                </li>
              ))}
            </ol>
            <p className="border-t px-4 py-3 text-sm text-muted-foreground">
              Valores, juros e pagamentos continuam iguais. {mudancas.length === 1 ? "As outras parcelas não mudam." : ""}
            </p>
          </>
        )}
      </section>

      <Campo id="observacao" rotulo="Motivo (opcional)" erro={estado.erros.observacao} dica="Vai nas observações do empréstimo, junto com as datas.">
        <AreaTexto id="observacao" name="observacao" className="min-h-16" maxLength={500} defaultValue={estado.valores.observacao} placeholder="Ex.: cliente recebe o salário no dia 20" />
      </Campo>

      <MensagemForm estado={estado} />
      {!confirmando ? (
        <Button type="button" disabled={mudancas.length === 0} className="h-12 text-base font-bold" onClick={() => setConfirmando(true)}>
          Mudar vencimento
        </Button>
      ) : (
        <div className="grid gap-2 rounded-2xl border border-gold bg-accent p-4">
          <p className="text-sm font-semibold text-accent-foreground">
            {mudancas.length === 1
              ? `Confirma a ${mudancas[0].numero}ª parcela para ${formatData(mudancas[0].depois)}?`
              : `Confirma as novas datas das parcelas ${mudancas[0].numero}ª a ${mudancas[mudancas.length - 1].numero}ª (${mudancas.length} parcelas)?`}{" "}
            Nada muda nos valores.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" disabled={enviando} className="h-12 text-base font-bold">
              {enviando ? "Salvando…" : "Confirmar novas datas"}
            </Button>
            <Button type="button" variant="outline" className="h-12 font-bold" onClick={() => setConfirmando(false)}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

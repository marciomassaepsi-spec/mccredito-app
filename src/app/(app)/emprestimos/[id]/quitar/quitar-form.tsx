"use client";

import { useState } from "react";

import { CampoArquivo, useAcaoComArquivo } from "@/components/app/arquivo";
import { AreaTexto, Campo, Entrada, MensagemForm, Selecao } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import { formatCentavos, formatData } from "@/lib/format";
import { planoQuitacao, type ParcelaAberta } from "@/lib/pagamentos";

import { quitarEmprestimo } from "../../pagamentos-actions";

type Props = {
  emprestimoId: string;
  parcelas: ParcelaAberta[];
  taxaMensal: number;
  hoje: string;
  multa: number;
  mora: number;
};

export function QuitarForm({ emprestimoId, parcelas, taxaMensal, hoje, multa, mora }: Props) {
  const { estado, aoEnviar, enviando } = useAcaoComArquivo(quitarEmprestimo);
  const [data, setData] = useState(hoje);
  const [dispensar, setDispensar] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const plano = planoQuitacao(parcelas, taxaMensal, data || hoje, multa, mora, dispensar);
  const e = estado.erros;

  return (
    <form onSubmit={aoEnviar} className="grid gap-5" noValidate>
      <input type="hidden" name="emprestimo_id" value={emprestimoId} />

      <section className="grid gap-2 rounded-2xl bg-brand-deep p-5 text-white">
        <p className="text-sm font-bold text-white/75">Para quitar em {formatData(data || hoje)}</p>
        <p className="num font-heading text-3xl font-black">{formatCentavos(plano.totalCentavos)}</p>
        <dl className="num grid gap-1 border-t border-white/15 pt-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-white/80">Parcelas em aberto ({parcelas.length})</dt>
            <dd className="font-bold text-[#f0d45a]">{formatCentavos(plano.emAbertoCentavos)}</dd>
          </div>
          {plano.encargosCentavos > 0 && (
            <div className="flex justify-between">
              <dt className="text-white/80">Multa e mora das atrasadas</dt>
              <dd className="font-bold text-[#f0d45a]">+ {formatCentavos(plano.encargosCentavos)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-white/80">Desconto dos juros futuros</dt>
            <dd className="font-bold text-[#f0d45a]">− {formatCentavos(plano.descontoCentavos)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Campo id="pago_em" rotulo="Data da quitação" erro={e.pago_em}>
          <Entrada id="pago_em" name="pago_em" type="date" max={hoje} value={data} onChange={(ev) => setData(ev.target.value)} erro={e.pago_em} />
        </Campo>
        <Campo id="forma" rotulo="Forma" erro={e.forma}>
          <Selecao id="forma" name="forma" defaultValue="pix">
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
            <option value="outro">Outro</option>
          </Selecao>
        </Campo>
      </div>

      {plano.encargosCentavos > 0 || dispensar ? (
        <label className="flex items-start gap-3 rounded-xl border bg-card p-3">
          <input type="checkbox" name="dispensar" checked={dispensar} onChange={(ev) => setDispensar(ev.target.checked)} className="mt-1 size-5 accent-primary" />
          <span className="text-sm">Dispensar multa e mora das parcelas atrasadas</span>
        </label>
      ) : null}

      <details className="rounded-2xl border bg-card">
        <summary className="cursor-pointer px-4 py-3 font-bold">Ver parcela por parcela</summary>
        <ol className="num divide-y border-t text-sm">
          {plano.itens.map((i) => (
            <li key={i.parcela_id} className="flex justify-between gap-3 px-4 py-2">
              <span className="text-muted-foreground">
                {i.numero}ª · {formatData(i.vencimento)}
              </span>
              <span className="text-right">
                <b>{formatCentavos(i.valor + i.multa + i.mora - i.desconto)}</b>
                {i.desconto > 0 && <span className="block text-xs text-primary">desconto {formatCentavos(i.desconto)}</span>}
                {i.multa + i.mora > 0 && <span className="block text-xs text-late">encargos {formatCentavos(i.multa + i.mora)}</span>}
              </span>
            </li>
          ))}
        </ol>
      </details>

      <CampoArquivo rotulo="Comprovante (opcional)" erro={e.arquivo} />
      <Campo id="observacoes" rotulo="Observação (opcional)">
        <AreaTexto id="observacoes" name="observacoes" className="min-h-16" />
      </Campo>

      <MensagemForm estado={estado} />
      {!confirmando ? (
        <Button type="button" className="h-12 text-base font-bold" onClick={() => setConfirmando(true)}>
          Quitar por {formatCentavos(plano.totalCentavos)}
        </Button>
      ) : (
        <div className="grid gap-2 rounded-2xl border border-gold bg-accent p-4">
          <p className="text-sm font-semibold text-accent-foreground">
            Confirma que recebeu {formatCentavos(plano.totalCentavos)}?{" "}
            {parcelas.length === 1
              ? "A parcela em aberto será marcada como paga."
              : `As ${parcelas.length} parcelas em aberto serão marcadas como pagas.`}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" disabled={enviando} className="h-12 text-base font-bold">
              {enviando ? "Quitando…" : "Confirmar quitação"}
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

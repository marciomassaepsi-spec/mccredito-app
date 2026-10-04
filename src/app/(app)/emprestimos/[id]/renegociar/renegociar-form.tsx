"use client";

import { useMemo, useState } from "react";

import { AreaTexto, BotaoEnviar, Campo, Entrada, useAcaoSemReset, MensagemForm, Selecao } from "@/components/app/form";
import { montarParcelas, NOME_SISTEMA, umMesDepois } from "@/lib/emprestimos";
import type { Periodicidade, Sistema } from "@/lib/finance";
import { centavosParaTexto, formatCentavos, formatData, parsePercentual, parseReaisParaCentavos } from "@/lib/format";

import { renegociarEmprestimo } from "../../pagamentos-actions";

type Props = {
  emprestimoId: string;
  saldoCentavos: number;
  taxaAtual: string;
  sistemaAtual: Sistema;
  hoje: string;
};

export function RenegociarForm({ emprestimoId, saldoCentavos, taxaAtual, sistemaAtual, hoje }: Props) {
  const { estado, aoEnviar, enviando } = useAcaoSemReset(renegociarEmprestimo);
  const [valor, setValor] = useState(centavosParaTexto(saldoCentavos));
  const [taxa, setTaxa] = useState(taxaAtual);
  const [qtd, setQtd] = useState("6");
  const [sistema, setSistema] = useState<Sistema>(sistemaAtual);
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal");
  const [vencimento, setVencimento] = useState(umMesDepois(hoje));
  const e = estado.erros;

  const preview = useMemo(() => {
    const v = parseReaisParaCentavos(valor);
    const t = parsePercentual(taxa);
    const n = /^\d+$/.test(qtd) ? Number(qtd) : 0;
    if (!v || v <= 0 || t === null || t > 10 || n < 1 || n > 360 || !vencimento || vencimento < hoje) return null;
    const parcelas = montarParcelas({ sistema, valorCentavos: v, taxaMensal: t, qtdParcelas: n, primeiroVencimento: vencimento, periodicidade });
    return { parcelas, total: parcelas.reduce((s, p) => s + p.valor_centavos, 0) };
  }, [valor, taxa, qtd, sistema, vencimento, periodicidade, hoje]);

  return (
    <form onSubmit={aoEnviar} className="grid gap-4" noValidate>
      <input type="hidden" name="emprestimo_id" value={emprestimoId} />

      <Campo id="valor" rotulo="Novo valor (R$)" erro={e.valor} dica={`Sugestão: o valor para quitar hoje, ${formatCentavos(saldoCentavos)}. Pode ajustar se combinou outro valor.`}>
        <Entrada id="valor" name="valor" inputMode="decimal" value={valor} onChange={(ev) => setValor(ev.target.value)} erro={e.valor} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo id="taxa" rotulo="Taxa ao mês (%)" erro={e.taxa}>
          <Entrada id="taxa" name="taxa" inputMode="decimal" value={taxa} onChange={(ev) => setTaxa(ev.target.value)} erro={e.taxa} />
        </Campo>
        <Campo id="qtd_parcelas" rotulo="Parcelas" erro={e.qtd_parcelas}>
          <Entrada id="qtd_parcelas" name="qtd_parcelas" inputMode="numeric" value={qtd} onChange={(ev) => setQtd(ev.target.value)} erro={e.qtd_parcelas} />
        </Campo>
        <Campo id="sistema" rotulo="Sistema">
          <Selecao id="sistema" name="sistema" value={sistema} onChange={(ev) => setSistema(ev.target.value as Sistema)}>
            {(Object.keys(NOME_SISTEMA) as Sistema[]).map((s) => (
              <option key={s} value={s}>
                {NOME_SISTEMA[s]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo id="periodicidade" rotulo="Parcelas a cada">
          <Selecao id="periodicidade" name="periodicidade" value={periodicidade} onChange={(ev) => setPeriodicidade(ev.target.value as Periodicidade)}>
            <option value="mensal">Mês</option>
            <option value="quinzenal">15 dias</option>
            <option value="semanal">Semana</option>
          </Selecao>
        </Campo>
      </div>
      <Campo id="primeiro_vencimento" rotulo="1º vencimento" erro={e.primeiro_vencimento}>
        <Entrada id="primeiro_vencimento" name="primeiro_vencimento" type="date" min={hoje} value={vencimento} onChange={(ev) => setVencimento(ev.target.value)} erro={e.primeiro_vencimento} />
      </Campo>
      <Campo id="motivo" rotulo="Motivo da renegociação" erro={e.motivo}>
        <AreaTexto id="motivo" name="motivo" defaultValue={estado.valores.motivo ?? ""} className="min-h-16" erro={e.motivo} placeholder="Ex.: cliente perdeu o emprego e pediu parcelas menores" />
      </Campo>

      {preview && (
        <section className="rounded-2xl border bg-card">
          <p className="num px-4 pt-4 font-bold">
            {sistema === "sac"
              ? `${preview.parcelas.length} parcelas de ${formatCentavos(preview.parcelas[0].valor_centavos)} a ${formatCentavos(preview.parcelas[preview.parcelas.length - 1].valor_centavos)}`
              : `${preview.parcelas.length}x de ${formatCentavos(preview.parcelas[0].valor_centavos)}`}{" "}
            · total {formatCentavos(preview.total)}
          </p>
          <ol className="num mt-2 divide-y text-sm">
            {preview.parcelas.map((p) => (
              <li key={p.numero} className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">
                  {p.numero}ª · {formatData(p.vencimento)}
                </span>
                <span className="font-bold">{formatCentavos(p.valor_centavos)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
        O empréstimo atual fica marcado como renegociado e as parcelas em aberto dele deixam de ser cobradas. Os
        pagamentos já feitos continuam no histórico.
      </p>
      <MensagemForm estado={estado} />
      <BotaoEnviar pendente={enviando} enviando="Renegociando…">Confirmar renegociação</BotaoEnviar>
    </form>
  );
}

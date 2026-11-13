"use client";

import { useMemo, useState } from "react";

import { AreaTexto, BotaoEnviar, Campo, Entrada, MensagemForm, Selecao, useAcaoSemReset } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import { NOME_PERIODICIDADE, NOME_SISTEMA, umPeriodoDepois, type ModoCalculo } from "@/lib/emprestimos";
import type { Periodicidade, Sistema } from "@/lib/finance";
import { formatCentavos, formatData, formatPercentual, parsePercentual, parseReaisParaCentavos } from "@/lib/format";
import { observacaoRenegociacao, planejarRenegociacao, saldoParaRenegociar, valorDoNovoContrato, type ParcelaDoContrato } from "@/lib/renegociacao";

import { renegociarEmprestimo } from "../../pagamentos-actions";

type Props = {
  emprestimoId: string;
  /** Parcelas em aberto do contrato atual */
  parcelas: ParcelaDoContrato[];
  /** Juros de atraso por dia da configuração, em decimal (1% = 0.01) */
  jurosDiario: number;
  hoje: string;
  liberadoAntigo: string;
  inicial: { qtd: string; parcela: string; periodicidade: Periodicidade };
};

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-white/80">{rotulo}</dt>
      <dd className={`text-right font-bold ${forte ? "text-lg text-white" : "text-[#f0d45a]"}`}>{valor}</dd>
    </div>
  );
}

export function RenegociarForm({ emprestimoId, parcelas, jurosDiario, hoje, liberadoAntigo, inicial }: Props) {
  const { estado, aoEnviar, enviando } = useAcaoSemReset(renegociarEmprestimo);
  const [revisando, setRevisando] = useState(false);
  const [tentou, setTentou] = useState(false);

  const [dinheiroNovo, setDinheiroNovo] = useState("");
  const [somar, setSomar] = useState(false);
  const [modo, setModo] = useState<ModoCalculo>("parcela");
  const [parcela, setParcela] = useState(inicial.parcela);
  const [taxa, setTaxa] = useState("");
  const [qtd, setQtd] = useState(inicial.qtd);
  const [sistema, setSistema] = useState<Sistema>("price");
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>(inicial.periodicidade);
  const [data, setData] = useState(hoje);
  const [vencimento, setVencimento] = useState(umPeriodoDepois(hoje, inicial.periodicidade));
  const [vencimentoEditado, setVencimentoEditado] = useState(false);
  const [observacao, setObservacao] = useState("");

  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data) && data >= liberadoAntigo && data <= hoje;
  // Quanto falta é sempre o mesmo; os juros de atraso dependem da data da renegociação
  const saldo = useMemo(() => saldoParaRenegociar(parcelas, dataValida ? data : hoje, jurosDiario), [parcelas, data, dataValida, hoje, jurosDiario]);
  const somarEncargos = somar && saldo.encargosCentavos > 0;

  const novo = dinheiroNovo.trim() === "" ? 0 : parseReaisParaCentavos(dinheiroNovo);
  const taxaNum = modo === "taxa" ? parsePercentual(taxa) : null;
  const parcelaNum = modo === "parcela" ? parseReaisParaCentavos(parcela) : null;
  const n = /^\d+$/.test(qtd) ? Number(qtd) : null;
  const valorNovo = valorDoNovoContrato(saldo, somarEncargos, novo ?? 0);

  const erros: Record<string, string | undefined> = {
    dinheiro_novo: novo !== null && novo >= 0 ? undefined : "Digite quanto vai mandar, ex.: 500,00 (ou 0).",
    taxa: modo === "parcela" || (taxaNum !== null && taxaNum <= 10) ? undefined : "Digite a taxa, ex.: 9,99",
    parcela: modo === "taxa" || (parcelaNum !== null && parcelaNum > 0) ? undefined : "Digite a parcela, ex.: 250,00",
    qtd_parcelas: n && n >= 1 && n <= 360 ? undefined : "De 1 a 360.",
    liberado_em: dataValida ? undefined : `Entre ${formatData(liberadoAntigo)} e hoje.`,
    primeiro_vencimento: vencimento && vencimento >= data ? undefined : "Não pode ser antes da renegociação.",
  };
  const camposOk = Object.values(erros).every((e) => !e);

  // Conta rápida: o React Compiler já evita refazer à toa
  const resultado =
    !camposOk || n === null || novo === null
      ? null
      : planejarRenegociacao({
          saldo,
          somarEncargos,
          dinheiroNovoCentavos: novo,
          modo,
          sistema,
          taxaMensal: taxaNum,
          parcelaCentavos: parcelaNum,
          qtdParcelas: n,
          primeiroVencimento: vencimento,
          periodicidade,
        });
  const plano = resultado?.ok ? resultado.plano : null;
  const erroPlano = resultado && !resultado.ok ? resultado.erro : null;

  const erro = (campo: string) => estado.erros[campo] ?? (tentou ? erros[campo] : undefined);

  function mudarData(nova: string) {
    setData(nova);
    if (!vencimentoEditado && /^\d{4}-\d{2}-\d{2}$/.test(nova)) setVencimento(umPeriodoDepois(nova, periodicidade));
  }
  function mudarPeriodicidade(nova: Periodicidade) {
    setPeriodicidade(nova);
    if (!vencimentoEditado && /^\d{4}-\d{2}-\d{2}$/.test(data)) setVencimento(umPeriodoDepois(data, nova));
  }

  const resumoParcelas = (p: NonNullable<typeof plano>) =>
    p.sistema === "sac"
      ? `${p.parcelas.length} parcelas de ${formatCentavos(p.parcelas[0].valor_centavos)} a ${formatCentavos(p.parcelas[p.parcelas.length - 1].valor_centavos)}`
      : `${p.parcelas.length}x de ${formatCentavos(p.parcelas[0].valor_centavos)}`;

  return (
    <form onSubmit={aoEnviar} className="grid gap-5" noValidate>
      <input type="hidden" name="emprestimo_id" value={emprestimoId} />

      {/* Os campos ficam montados mesmo na revisão, para irem junto no envio */}
      <div className={revisando ? "hidden" : "grid gap-4"}>
        <section className="grid gap-2 rounded-2xl bg-brand-deep p-5 text-white">
          <p className="text-sm font-bold text-white/75">Quanto falta deste contrato</p>
          <p className="num font-heading text-[clamp(2rem,10vw,2.75rem)] leading-tight font-black">{formatCentavos(saldo.saldoCentavos)}</p>
          <p className="num text-sm text-white/80">
            {saldo.parcelasEmAberto} {saldo.parcelasEmAberto === 1 ? "parcela em aberto" : "parcelas em aberto"}, sem juros de atraso
          </p>
          {saldo.encargosCentavos > 0 && (
            <div className="grid gap-2 border-t border-white/15 pt-3">
              <p className="num text-sm">
                {saldo.atrasadas} {saldo.atrasadas === 1 ? "parcela atrasada" : "parcelas atrasadas"} em {formatData(data)}: juros de atraso{" "}
                {formatCentavos(saldo.encargosCentavos)} ({formatPercentual(jurosDiario, 3)} ao dia). Com eles, o saldo fica em{" "}
                {formatCentavos(saldo.saldoCentavos + saldo.encargosCentavos)}.
              </p>
              <label className="flex items-start gap-3 font-semibold">
                <input
                  type="checkbox"
                  name="somar_encargos"
                  className="mt-1 size-5 shrink-0 accent-[#f0d45a]"
                  checked={somar}
                  onChange={(ev) => setSomar(ev.target.checked)}
                />
                <span>Somar os juros de atraso ({formatCentavos(saldo.encargosCentavos)}) ao saldo</span>
              </label>
            </div>
          )}
        </section>

        <Campo id="dinheiro_novo" rotulo="Dinheiro novo para o cliente (R$)" erro={erro("dinheiro_novo")} dica="Quanto você vai mandar agora. Deixe em branco ou 0 se for só mudar as parcelas.">
          <Entrada
            id="dinheiro_novo"
            name="dinheiro_novo"
            inputMode="decimal"
            placeholder="0,00"
            value={dinheiroNovo}
            onChange={(ev) => setDinheiroNovo(ev.target.value)}
            erro={erro("dinheiro_novo")}
          />
        </Campo>

        <div className="grid gap-1 rounded-2xl border bg-card p-4">
          <p className="text-sm font-bold text-muted-foreground">Valor do novo contrato</p>
          <p className="num font-heading text-2xl font-black">{formatCentavos(valorNovo)}</p>
          <p className="num text-sm text-muted-foreground">
            saldo {formatCentavos(saldo.saldoCentavos)}
            {somarEncargos && ` + juros de atraso ${formatCentavos(saldo.encargosCentavos)}`} + dinheiro novo {formatCentavos(novo ?? 0)}
          </p>
        </div>

        <h2 className="-mb-1 text-lg font-extrabold">Parcelas novas</h2>
        <div className="grid grid-cols-2 gap-3">
          {modo === "parcela" ? (
            <Campo id="parcela" rotulo="Valor da parcela" erro={erro("parcela")}>
              <Entrada id="parcela" name="parcela" inputMode="decimal" placeholder="250,00" value={parcela} onChange={(ev) => setParcela(ev.target.value)} erro={erro("parcela")} />
            </Campo>
          ) : (
            <Campo id="taxa" rotulo="Taxa ao mês (%)" erro={erro("taxa")}>
              <Entrada id="taxa" name="taxa" inputMode="decimal" placeholder="9,99" value={taxa} onChange={(ev) => setTaxa(ev.target.value)} erro={erro("taxa")} />
            </Campo>
          )}
          <Campo id="qtd_parcelas" rotulo="Quantas parcelas" erro={erro("qtd_parcelas")}>
            <Entrada id="qtd_parcelas" name="qtd_parcelas" inputMode="numeric" value={qtd} onChange={(ev) => setQtd(ev.target.value)} erro={erro("qtd_parcelas")} />
          </Campo>
        </div>
        <input type="hidden" name="modo" value={modo} />
        <button
          type="button"
          className="-mt-2 justify-self-start text-sm font-bold text-primary"
          onClick={() => {
            setModo(modo === "parcela" ? "taxa" : "parcela");
            setSistema("price");
          }}
        >
          {modo === "parcela" ? "Prefiro informar a taxa" : "Sei o valor da parcela, não a taxa"}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Campo id="sistema" rotulo="Sistema">
            {modo === "parcela" && <input type="hidden" name="sistema" value="price" />}
            <Selecao
              id="sistema"
              name={modo === "parcela" ? undefined : "sistema"}
              value={modo === "parcela" ? "price" : sistema}
              disabled={modo === "parcela"}
              onChange={(ev) => setSistema(ev.target.value as Sistema)}
            >
              {(Object.keys(NOME_SISTEMA) as Sistema[]).map((s) => (
                <option key={s} value={s}>
                  {NOME_SISTEMA[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo id="periodicidade" rotulo="Parcelas a cada">
            <Selecao id="periodicidade" name="periodicidade" value={periodicidade} onChange={(ev) => mudarPeriodicidade(ev.target.value as Periodicidade)}>
              <option value="mensal">Mês</option>
              <option value="quinzenal">15 dias</option>
              <option value="semanal">Semana</option>
            </Selecao>
          </Campo>
          <Campo id="liberado_em" rotulo="Data da renegociação" erro={erro("liberado_em")}>
            <Entrada id="liberado_em" name="liberado_em" type="date" min={liberadoAntigo} max={hoje} value={data} onChange={(ev) => mudarData(ev.target.value)} erro={erro("liberado_em")} />
          </Campo>
          <Campo id="primeiro_vencimento" rotulo="1º vencimento" erro={erro("primeiro_vencimento")}>
            <Entrada
              id="primeiro_vencimento"
              name="primeiro_vencimento"
              type="date"
              min={data}
              value={vencimento}
              onChange={(ev) => {
                setVencimento(ev.target.value);
                setVencimentoEditado(true);
              }}
              erro={erro("primeiro_vencimento")}
            />
          </Campo>
        </div>

        {plano && (
          <p className="num rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">
            {resumoParcelas(plano)} · taxa {formatPercentual(plano.taxaMensal)} ao mês · total {formatCentavos(plano.totalCentavos)}
          </p>
        )}
        {erroPlano && (
          <p role="alert" className="rounded-xl bg-late-soft px-4 py-3 text-sm font-semibold text-late">
            {erroPlano}
          </p>
        )}

        <Campo id="observacao" rotulo="Observação (opcional)" erro={erro("observacao")} dica={plano ? `Vai nas observações depois de "${observacaoRenegociacao(plano)}".` : undefined}>
          <AreaTexto id="observacao" name="observacao" value={observacao} onChange={(ev) => setObservacao(ev.target.value)} className="min-h-16" erro={erro("observacao")} />
        </Campo>

        <Button
          type="button"
          className="h-12 text-base font-bold"
          onClick={() => {
            setTentou(true);
            setRevisando(true);
            window.scrollTo({ top: 0 });
          }}
        >
          Revisar renegociação
        </Button>
      </div>

      {revisando && (
        <div className="grid gap-4">
          {!plano ? (
            <>
              <p role="alert" className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">
                {erroPlano ?? "Faltam informações. Volte e confira os campos destacados."}
              </p>
              <Button type="button" variant="outline" className="h-12 text-base font-bold" onClick={() => setRevisando(false)}>
                Voltar e corrigir
              </Button>
            </>
          ) : (
            <>
              <section className="grid gap-3 rounded-2xl bg-brand-deep p-5 text-white">
                <p className="text-sm font-bold text-white/75">Confira antes de salvar</p>
                <div className="rounded-xl bg-gold px-4 py-3 text-[#2b2300]">
                  <p className="text-sm font-bold">O cliente recebe agora</p>
                  <p className="num font-heading text-[clamp(1.75rem,9vw,2.25rem)] leading-tight font-black">{formatCentavos(plano.dinheiroNovoCentavos)}</p>
                </div>
                <dl className="num grid gap-1.5 border-t border-white/15 pt-3 text-sm">
                  <Linha rotulo="Quanto faltava" valor={formatCentavos(plano.saldoCentavos)} />
                  {plano.encargosCentavos > 0 && <Linha rotulo="Juros de atraso somados" valor={formatCentavos(plano.encargosCentavos)} />}
                  <Linha rotulo="Dinheiro novo" valor={formatCentavos(plano.dinheiroNovoCentavos)} />
                  <Linha rotulo="Valor do novo contrato" valor={formatCentavos(plano.valorCentavos)} forte />
                  <Linha rotulo="Parcelas" valor={`${resumoParcelas(plano)} · ${NOME_PERIODICIDADE[periodicidade].toLowerCase()}`} />
                  <Linha rotulo={modo === "parcela" ? "Taxa (pela parcela)" : "Taxa"} valor={`${formatPercentual(plano.taxaMensal)} ao mês · ${NOME_SISTEMA[plano.sistema]}`} />
                  <Linha rotulo="Total a receber" valor={formatCentavos(plano.totalCentavos)} />
                  <Linha rotulo="Juros do novo contrato" valor={formatCentavos(plano.jurosCentavos)} />
                  <Linha rotulo="Data da renegociação" valor={formatData(data)} />
                </dl>
              </section>

              <section className="rounded-2xl border bg-card">
                <h2 className="px-4 pt-4 text-base font-extrabold">Parcelas novas</h2>
                <ol className="num mt-2 divide-y text-sm">
                  {plano.parcelas.map((p) => (
                    <li key={p.numero} className="flex justify-between gap-3 px-4 py-2">
                      <span className="text-muted-foreground">
                        {p.numero}ª · {formatData(p.vencimento)}
                      </span>
                      <span className="font-bold">{formatCentavos(p.valor_centavos)}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <p className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
                O empréstimo atual fica marcado como renegociado e as parcelas em aberto dele deixam de ser cobradas. Os
                pagamentos já feitos continuam no histórico.
              </p>
              <MensagemForm estado={estado} />
              <div className="grid gap-2 sm:grid-cols-2">
                <BotaoEnviar pendente={enviando} enviando="Renegociando…">
                  Confirmar renegociação
                </BotaoEnviar>
                <Button type="button" variant="outline" className="h-12 text-base font-bold" onClick={() => setRevisando(false)}>
                  Voltar e alterar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </form>
  );
}

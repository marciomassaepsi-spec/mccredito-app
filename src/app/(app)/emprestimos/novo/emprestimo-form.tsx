"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AreaTexto, BotaoEnviar, Campo, Entrada, useAcaoSemReset, MensagemForm, Selecao } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import { montarParcelas, NOME_PERIODICIDADE, NOME_SISTEMA, umMesDepois } from "@/lib/emprestimos";
import { cetMensal, mensalParaAnual, type Periodicidade, type Sistema } from "@/lib/finance";
import { formatCentavos, formatData, formatPercentual, parsePercentual, parseReaisParaCentavos } from "@/lib/format";

import { criarEmprestimo } from "../actions";

export type ClienteOpcao = { id: string; nome: string };

type Props = {
  clientes: ClienteOpcao[];
  hoje: string;
  inicial: {
    clienteId: string;
    valor: string;
    taxa: string;
    parcelas: string;
    sistema: Sistema;
  };
};

export function EmprestimoForm({ clientes, hoje, inicial }: Props) {
  const { estado, aoEnviar, enviando } = useAcaoSemReset(criarEmprestimo);
  const [revisando, setRevisando] = useState(false);
  // Depois da primeira tentativa de revisar, os erros dos campos ficam visíveis
  const [tentou, setTentou] = useState(false);

  const [clienteId, setClienteId] = useState(inicial.clienteId);
  const [valor, setValor] = useState(inicial.valor);
  const [taxa, setTaxa] = useState(inicial.taxa);
  const [qtd, setQtd] = useState(inicial.parcelas);
  const [sistema, setSistema] = useState<Sistema>(inicial.sistema);
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal");
  const [liberado, setLiberado] = useState(hoje);
  const [vencimento, setVencimento] = useState(umMesDepois(hoje));
  const [vencimentoEditado, setVencimentoEditado] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  const principal = parseReaisParaCentavos(valor);
  const taxaNum = parsePercentual(taxa);
  const n = /^\d+$/.test(qtd) ? Number(qtd) : null;

  const erros: Record<string, string | undefined> = {
    cliente_id: clienteId ? undefined : "Escolha o cliente.",
    valor: principal && principal > 0 ? undefined : "Digite o valor, ex.: 1.500,00",
    taxa: taxaNum !== null && taxaNum <= 10 ? undefined : "Digite a taxa, ex.: 9,99",
    qtd_parcelas: n && n >= 1 && n <= 360 ? undefined : "De 1 a 360.",
    primeiro_vencimento: vencimento && vencimento >= liberado ? undefined : "Não pode ser antes da liberação.",
  };
  const valido = Object.values(erros).every((e) => !e);

  const simulacao = useMemo(() => {
    if (!valido || principal === null || taxaNum === null || n === null) return null;
    const parcelas = montarParcelas({
      sistema,
      valorCentavos: principal,
      taxaMensal: taxaNum,
      qtdParcelas: n,
      primeiroVencimento: vencimento,
      periodicidade,
    });
    const total = parcelas.reduce((s, p) => s + p.valor_centavos, 0);
    const cet = cetMensal(principal, parcelas.map((p) => p.valor_centavos), periodicidade);
    return { parcelas, total, juros: total - principal, cet };
  }, [valido, principal, taxaNum, n, sistema, vencimento, periodicidade]);

  function mudarLiberacao(data: string) {
    setLiberado(data);
    if (!vencimentoEditado && data) setVencimento(umMesDepois(data));
  }

  const nomeCliente = clientes.find((c) => c.id === clienteId)?.nome ?? "";
  // Erros do servidor têm prioridade; os da tela só aparecem depois de tentar revisar
  const erro = (campo: string) => estado.erros[campo] ?? (tentou ? erros[campo] : undefined);

  return (
    <form onSubmit={aoEnviar} className="grid gap-5" noValidate>
      {/* Os campos ficam montados mesmo na revisão, para irem junto no envio */}
      <div className={revisando ? "hidden" : "grid gap-4"}>
        <Campo id="cliente_id" rotulo="Cliente" erro={erro("cliente_id")}>
          <Selecao id="cliente_id" name="cliente_id" value={clienteId} onChange={(e) => setClienteId(e.target.value)} erro={erro("cliente_id")}>
            <option value="">Escolha…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Link href="/clientes/novo?voltar=emprestimo" className="-mt-2 text-sm font-bold text-primary">
          + Cadastrar cliente novo
        </Link>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Campo id="valor" rotulo="Valor emprestado" erro={erro("valor")} className="col-span-2 sm:col-span-1">
            <Entrada id="valor" name="valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} erro={erro("valor")} />
          </Campo>
          <Campo id="taxa" rotulo="Taxa ao mês (%)" erro={erro("taxa")}>
            <Entrada id="taxa" name="taxa" inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} erro={erro("taxa")} />
          </Campo>
          <Campo id="qtd_parcelas" rotulo="Parcelas" erro={erro("qtd_parcelas")}>
            <Entrada id="qtd_parcelas" name="qtd_parcelas" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} erro={erro("qtd_parcelas")} />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo id="sistema" rotulo="Sistema">
            <Selecao id="sistema" name="sistema" value={sistema} onChange={(e) => setSistema(e.target.value as Sistema)}>
              {(Object.keys(NOME_SISTEMA) as Sistema[]).map((s) => (
                <option key={s} value={s}>
                  {NOME_SISTEMA[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo id="periodicidade" rotulo="Parcelas a cada">
            <Selecao id="periodicidade" name="periodicidade" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as Periodicidade)}>
              <option value="mensal">Mês</option>
              <option value="quinzenal">15 dias</option>
              <option value="semanal">Semana</option>
            </Selecao>
          </Campo>
          <Campo id="liberado_em" rotulo="Data da liberação" erro={erro("liberado_em")}>
            <Entrada id="liberado_em" name="liberado_em" type="date" value={liberado} onChange={(e) => mudarLiberacao(e.target.value)} />
          </Campo>
          <Campo id="primeiro_vencimento" rotulo="1º vencimento" erro={erro("primeiro_vencimento")}>
            <Entrada
              id="primeiro_vencimento"
              name="primeiro_vencimento"
              type="date"
              value={vencimento}
              min={liberado}
              onChange={(e) => {
                setVencimento(e.target.value);
                setVencimentoEditado(true);
              }}
              erro={erro("primeiro_vencimento")}
            />
          </Campo>
        </div>

        <Campo id="observacoes" rotulo="Observações (opcional)">
          <AreaTexto id="observacoes" name="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </Campo>

        {simulacao && (
          <p className="num rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">
            {sistema === "sac"
              ? `${n} parcelas de ${formatCentavos(simulacao.parcelas[0].valor_centavos)} a ${formatCentavos(simulacao.parcelas[simulacao.parcelas.length - 1].valor_centavos)}`
              : `${n}x de ${formatCentavos(simulacao.parcelas[0].valor_centavos)}`}{" "}
            · total {formatCentavos(simulacao.total)}
          </p>
        )}

        <Button
          type="button"
          className="h-12 text-base font-bold"
          onClick={() => {
            setTentou(true);
            setRevisando(true);
            window.scrollTo({ top: 0 });
          }}
        >
          Revisar empréstimo
        </Button>
      </div>

      {revisando && (
        <div className="grid gap-4">
          {!valido || !simulacao ? (
            <>
              <p role="alert" className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">
                Faltam informações. Volte e confira os campos destacados.
              </p>
              <Button type="button" variant="outline" className="h-12 text-base font-bold" onClick={() => setRevisando(false)}>
                Voltar e corrigir
              </Button>
            </>
          ) : (
            <>
              <section className="grid gap-3 rounded-2xl bg-brand-deep p-5 text-white">
                <p className="text-sm font-bold text-white/75">Confira antes de salvar</p>
                <p className="font-heading text-2xl font-black break-words">{nomeCliente}</p>
                <dl className="num grid gap-1.5 border-t border-white/15 pt-3 text-sm">
                  {(
                    [
                      ["Valor liberado", formatCentavos(principal ?? 0)],
                      ["Liberação", formatData(liberado)],
                      ["Taxa", `${formatPercentual(taxaNum ?? 0)} ao mês · ${NOME_SISTEMA[sistema]}`],
                      ["Parcelas", `${n} · ${NOME_PERIODICIDADE[periodicidade].toLowerCase()}`],
                      ["Total a receber", formatCentavos(simulacao.total)],
                      ["Total de juros", formatCentavos(simulacao.juros)],
                      ...(simulacao.cet !== null
                        ? [["CET", `${formatPercentual(simulacao.cet)} a.m. · ${formatPercentual(mensalParaAnual(simulacao.cet), 1)} a.a.`]]
                        : []),
                    ] as Array<[string, string]>
                  ).map(([rotulo, texto]) => (
                    <div key={rotulo} className="flex items-baseline justify-between gap-3">
                      <dt className="text-white/80">{rotulo}</dt>
                      <dd className="text-right font-bold text-[#f0d45a]">{texto}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-2xl border bg-card">
                <h2 className="px-4 pt-4 text-base font-extrabold">Parcelas</h2>
                <ol className="num mt-2 divide-y text-sm">
                  {simulacao.parcelas.map((p) => (
                    <li key={p.numero} className="flex justify-between gap-3 px-4 py-2">
                      <span className="text-muted-foreground">
                        {p.numero}ª · {formatData(p.vencimento)}
                      </span>
                      <span className="font-bold">{formatCentavos(p.valor_centavos)}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <MensagemForm estado={estado} />

              <div className="grid gap-2 sm:grid-cols-2">
                <BotaoEnviar pendente={enviando}>Confirmar e salvar</BotaoEnviar>
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

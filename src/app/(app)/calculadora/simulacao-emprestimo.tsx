"use client";

import { Copy, MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cetMensal, gerarCronograma, mensalParaAnual, type Sistema } from "@/lib/finance";
import {
  centavosParaTexto,
  formatCentavos,
  formatPercentual,
  parsePercentual,
  parseReaisParaCentavos,
} from "@/lib/format";

import { CampoNumero, lerInteiro } from "./campos";
import { Aviso, CartaoResultado, Destaque, Linhas, Vazio } from "./resumo";

const NOME_SISTEMA: Record<Sistema, string> = {
  price: "Tabela Price",
  sac: "SAC",
  simples: "Juros simples",
};

const EXPLICACAO: Record<Sistema, string> = {
  price: "Parcela fixa. Os juros de cada mês incidem sobre o que ainda falta pagar.",
  sac: "Amortização fixa. A primeira parcela é a maior e elas vão diminuindo.",
  simples: "Juros sempre sobre o valor emprestado, divididos em parcelas iguais.",
};

/** Valores digitados, compartilhados entre Price, SAC e Juros simples para comparar. */
export type EntradaEmprestimo = { valor: string; taxa: string; parcelas: string };

export const ENTRADA_INICIAL: EntradaEmprestimo = { valor: "1.500,00", taxa: "9,99", parcelas: "6" };

type Props = {
  sistema: Sistema;
  nomeEmpresa: string;
  entrada: EntradaEmprestimo;
  onChange: (entrada: EntradaEmprestimo) => void;
};

export function SimulacaoEmprestimo({ sistema, nomeEmpresa, entrada, onChange }: Props) {
  const { valor, taxa, parcelas } = entrada;
  const setValor = (v: string) => onChange({ ...entrada, valor: v });
  const setTaxa = (v: string) => onChange({ ...entrada, taxa: v });
  const setParcelas = (v: string) => onChange({ ...entrada, parcelas: v });

  const principal = parseReaisParaCentavos(valor);
  const taxaNum = parsePercentual(taxa);
  const n = lerInteiro(parcelas, 1, 360);

  const erros = {
    valor: principal === null || principal <= 0 ? "Digite um valor, ex.: 1.500,00" : null,
    taxa: taxaNum === null ? "Digite a taxa, ex.: 9,99" : null,
    parcelas: n === null ? "De 1 a 360 parcelas" : null,
  };

  const resultado = useMemo(() => {
    if (principal === null || principal <= 0 || taxaNum === null || n === null) return null;
    const cronograma = gerarCronograma(sistema, principal, taxaNum, n);
    const cet = cetMensal(principal, cronograma.linhas.map((l) => l.valorCentavos));
    return { cronograma, cet };
  }, [sistema, principal, taxaNum, n]);

  const textoResumo = useMemo(() => {
    if (!resultado || principal === null || taxaNum === null || n === null) return "";
    const { linhas, totalCentavos } = resultado.cronograma;
    const primeira = linhas[0].valorCentavos;
    const ultima = linhas[linhas.length - 1].valorCentavos;
    const parcelaTexto =
      sistema === "sac"
        ? `${n}x decrescentes: 1ª de ${formatCentavos(primeira)} e última de ${formatCentavos(ultima)}`
        : `${n}x de ${formatCentavos(primeira)}`;
    return [
      `*Simulação ${nomeEmpresa}*`,
      `Valor: ${formatCentavos(principal)}`,
      parcelaTexto,
      `Taxa: ${formatPercentual(taxaNum)} ao mês (${NOME_SISTEMA[sistema]})`,
      `Total a pagar: ${formatCentavos(totalCentavos)}`,
      "",
      "Simulação sem compromisso, sujeita a análise.",
    ].join("\n");
  }, [resultado, principal, taxaNum, n, sistema, nomeEmpresa]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoResumo);
      toast.success("Resumo copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto da tabela e copie manualmente.");
    }
  }

  const linkEmprestimo =
    principal !== null && taxaNum !== null && n !== null
      ? `/emprestimos/novo?${new URLSearchParams({
          valor: String(principal),
          taxa: taxa.replace(",", "."),
          parcelas: String(n),
          sistema,
        })}`
      : null;

  return (
    <div className="grid min-w-0 gap-5">
      <p className="text-sm text-muted-foreground">{EXPLICACAO[sistema]}</p>

      <div className="grid grid-cols-[1.5fr_1fr] gap-3 sm:grid-cols-[1.5fr_1fr_0.8fr]">
        <div className="col-span-2 sm:col-span-1">
          <CampoNumero id={`${sistema}-valor`} rotulo="Valor emprestado" prefixo="R$" valor={valor} onChange={setValor} erro={erros.valor} />
        </div>
        <CampoNumero id={`${sistema}-taxa`} rotulo="Taxa ao mês" sufixo="%" valor={taxa} onChange={setTaxa} erro={erros.taxa} />
        <CampoNumero id={`${sistema}-parcelas`} rotulo="Parcelas" sufixo="x" tipo="inteiro" valor={parcelas} onChange={setParcelas} erro={erros.parcelas} />
      </div>

      {!resultado ? (
        <Vazio>Preencha valor, taxa e parcelas para ver a simulação.</Vazio>
      ) : (
        <>
          <CartaoResultado>
            {sistema === "sac" ? (
              <Destaque legenda={`${n} parcelas decrescentes`}>
                {formatCentavos(resultado.cronograma.linhas[0].valorCentavos)}
                <span className="text-lg font-extrabold text-white/80">
                  {" "}
                  → {formatCentavos(resultado.cronograma.linhas.at(-1)?.valorCentavos ?? 0)}
                </span>
              </Destaque>
            ) : (
              <Destaque>
                {n}x <span className="text-lg font-extrabold text-white/80">de</span>{" "}
                {formatCentavos(resultado.cronograma.linhas[0].valorCentavos)}
              </Destaque>
            )}
            <Linhas
              itens={[
                ["Total a receber", formatCentavos(resultado.cronograma.totalCentavos)],
                ["Total de juros", formatCentavos(resultado.cronograma.totalJurosCentavos)],
                ...(resultado.cet !== null
                  ? ([
                      [
                        "CET",
                        `${formatPercentual(resultado.cet)} a.m. · ${formatPercentual(mensalParaAnual(resultado.cet), 1)} a.a.`,
                      ],
                    ] as Array<[string, string]>)
                  : []),
              ]}
            />
          </CartaoResultado>

          {sistema === "price" &&
            resultado.cronograma.linhas.length > 1 &&
            resultado.cronograma.linhas.at(-1)?.valorCentavos !== resultado.cronograma.linhas[0].valorCentavos && (
              <p className="text-xs text-muted-foreground">
                A última parcela sai com {formatCentavos(Math.abs(resultado.cronograma.linhas[0].valorCentavos - (resultado.cronograma.linhas.at(-1)?.valorCentavos ?? 0)))}{" "}
                de diferença para fechar o arredondamento dos centavos.
              </p>
            )}

          {sistema === "simples" && resultado.cet !== null && taxaNum !== null && resultado.cet > taxaNum + 0.0001 && (
            <Aviso>
              Em juros simples, o custo real para o cliente (CET) é {formatPercentual(resultado.cet)} ao mês, acima dos{" "}
              {formatPercentual(taxaNum)} anunciados, porque os juros não diminuem conforme ele paga.
            </Aviso>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            {linkEmprestimo && (
              <Link href={linkEmprestimo} className={buttonVariants({ className: "h-12 text-base font-bold" })}>
                <UserPlus aria-hidden /> Virar empréstimo
              </Link>
            )}
            <Button variant="outline" onClick={copiar} className="h-12 border-gold text-base font-bold text-gold-ink">
              <Copy aria-hidden /> Copiar resumo
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(textoResumo)}`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "secondary", className: "h-12 text-base font-bold" })}
            >
              <MessageCircle aria-hidden /> Enviar no WhatsApp
            </a>
          </div>

          <GraficoComposicao linhas={resultado.cronograma.linhas} />
          <TabelaAmortizacao linhas={resultado.cronograma.linhas} principal={principal ?? 0} />
        </>
      )}
    </div>
  );
}

type Linha = ReturnType<typeof gerarCronograma>["linhas"][number];

function GraficoComposicao({ linhas }: { linhas: Linha[] }) {
  const maior = Math.max(...linhas.map((l) => l.valorCentavos));
  return (
    <section className="min-w-0 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-extrabold">Do que é feita cada parcela</h2>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <i className="size-2.5 rounded-sm bg-gold" /> Juros
          </span>
          <span className="flex items-center gap-1">
            <i className="size-2.5 rounded-sm bg-primary" /> Amortização
          </span>
        </div>
      </div>
      <div className="mt-4 flex h-32 items-end gap-[2px]" aria-hidden>
        {linhas.map((l) => (
          <div
            key={l.numero}
            className="flex min-w-0 flex-1 flex-col justify-end"
            style={{ height: `${(l.valorCentavos / maior) * 100}%` }}
            title={`Parcela ${l.numero}: juros ${formatCentavos(l.jurosCentavos)}, amortização ${formatCentavos(l.amortizacaoCentavos)}`}
          >
            <div className="rounded-t-[3px] bg-gold" style={{ flexGrow: l.jurosCentavos }} />
            <div className="bg-primary" style={{ flexGrow: l.amortizacaoCentavos }} />
          </div>
        ))}
      </div>
      <div className="num mt-1 flex justify-between text-xs text-muted-foreground" aria-hidden>
        <span>1ª</span>
        <span>{linhas.length}ª</span>
      </div>
      <p className="sr-only">
        Na primeira parcela, {formatCentavos(linhas[0].jurosCentavos)} são juros; na última,{" "}
        {formatCentavos(linhas[linhas.length - 1].jurosCentavos)}.
      </p>
    </section>
  );
}

function TabelaAmortizacao({ linhas, principal }: { linhas: Linha[]; principal: number }) {
  return (
    <section className="min-w-0 rounded-2xl border bg-card">
      <h2 className="px-4 pt-4 text-base font-extrabold">Tabela de amortização</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="num w-full text-[13px] sm:text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-bold">Nº</th>
              <th className="px-1.5 py-2 text-right font-bold">Parcela</th>
              <th className="px-1.5 py-2 text-right font-bold">Juros</th>
              <th className="px-1.5 py-2 text-right font-bold"><abbr title="Amortização" className="no-underline">Amortiz.</abbr></th>
              <th className="px-3 py-2 text-right font-bold">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b text-muted-foreground">
              <td className="px-3 py-2">0</td>
              <td colSpan={3} className="px-1.5 py-2 text-right">
                valor liberado
              </td>
              <td className="px-3 py-2 text-right">{centavosParaTexto(principal)}</td>
            </tr>
            {linhas.map((l) => (
              <tr key={l.numero} className="border-b last:border-b-0">
                <td className="px-3 py-2">{l.numero}</td>
                <td className="px-1.5 py-2 text-right font-bold">{centavosParaTexto(l.valorCentavos)}</td>
                <td className="px-1.5 py-2 text-right text-gold-ink">{centavosParaTexto(l.jurosCentavos)}</td>
                <td className="px-1.5 py-2 text-right">{centavosParaTexto(l.amortizacaoCentavos)}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{centavosParaTexto(l.saldoCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

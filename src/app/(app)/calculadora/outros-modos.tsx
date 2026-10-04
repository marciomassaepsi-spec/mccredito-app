"use client";

import { useState } from "react";

import {
  anualParaMensal,
  atualizarAtraso,
  descobrirTaxa,
  mensalParaAnual,
  montanteComposto,
  montanteSimples,
} from "@/lib/finance";
import {
  formatCentavos,
  formatPercentual,
  parsePercentual,
  parseReaisParaCentavos,
  percentualParaTexto,
} from "@/lib/format";

import { CampoNumero, lerInteiro } from "./campos";
import { Aviso, CartaoResultado, Destaque, Linhas, Vazio } from "./resumo";

const ERRO_VALOR = "Digite um valor, ex.: 1.500,00";
const ERRO_TAXA = "Digite a taxa, ex.: 9,99";

function centavosPositivos(texto: string) {
  const c = parseReaisParaCentavos(texto);
  return c !== null && c > 0 ? c : null;
}

export function JurosCompostos() {
  const [valor, setValor] = useState("1.500,00");
  const [taxa, setTaxa] = useState("9,99");
  const [meses, setMeses] = useState("6");

  const p = centavosPositivos(valor);
  const i = parsePercentual(taxa);
  const n = lerInteiro(meses, 1, 600);
  const pronto = p !== null && i !== null && n !== null;
  const composto = pronto ? montanteComposto(p, i, n) : null;
  const simples = pronto ? montanteSimples(p, i, n) : null;

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">
        Quanto um valor vira depois de alguns meses sem nenhum pagamento, com juros sobre juros.
      </p>
      <div className="grid grid-cols-[1.5fr_1fr] gap-3 sm:grid-cols-[1.5fr_1fr_0.8fr]">
        <div className="col-span-2 sm:col-span-1">
          <CampoNumero id="comp-valor" rotulo="Valor" prefixo="R$" valor={valor} onChange={setValor} erro={p === null ? ERRO_VALOR : null} />
        </div>
        <CampoNumero id="comp-taxa" rotulo="Taxa ao mês" sufixo="%" valor={taxa} onChange={setTaxa} erro={i === null ? ERRO_TAXA : null} />
        <CampoNumero id="comp-meses" rotulo="Meses" tipo="inteiro" valor={meses} onChange={setMeses} erro={n === null ? "De 1 a 600" : null} />
      </div>
      {composto && simples ? (
        <CartaoResultado>
          <Destaque legenda={`Depois de ${n} ${n === 1 ? "mês" : "meses"}`}>
            {formatCentavos(composto.montanteCentavos)}
          </Destaque>
          <Linhas
            itens={[
              ["Juros compostos", formatCentavos(composto.jurosCentavos)],
              ["Em juros simples seria", formatCentavos(simples.montanteCentavos)],
              ["Diferença", formatCentavos(composto.montanteCentavos - simples.montanteCentavos)],
            ]}
          />
        </CartaoResultado>
      ) : (
        <Vazio>Preencha valor, taxa e meses.</Vazio>
      )}
    </div>
  );
}

export function DescobrirTaxa() {
  const [valor, setValor] = useState("1.500,00");
  const [parcela, setParcela] = useState("344,00");
  const [parcelas, setParcelas] = useState("6");

  const p = centavosPositivos(valor);
  const pmt = centavosPositivos(parcela);
  const n = lerInteiro(parcelas, 1, 360);
  const taxa = p !== null && pmt !== null && n !== null ? descobrirTaxa(p, pmt, n) : null;
  const pagaMenos = p !== null && pmt !== null && n !== null && pmt * n < p;

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">
        Sabe o valor e a parcela, mas não a taxa? Ela é calculada considerando parcelas fixas
        (Tabela Price).
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_1.3fr_0.8fr]">
        <div className="col-span-2 sm:col-span-1">
          <CampoNumero id="taxa-valor" rotulo="Valor emprestado" prefixo="R$" valor={valor} onChange={setValor} erro={p === null ? ERRO_VALOR : null} />
        </div>
        <CampoNumero id="taxa-parcela" rotulo="Valor da parcela" prefixo="R$" valor={parcela} onChange={setParcela} erro={pmt === null ? "Ex.: 344,00" : null} />
        <CampoNumero id="taxa-parcelas" rotulo="Parcelas" sufixo="x" tipo="inteiro" valor={parcelas} onChange={setParcelas} erro={n === null ? "De 1 a 360" : null} />
      </div>
      {pagaMenos ? (
        <Aviso>Com essas parcelas o cliente pagaria menos do que pegou emprestado. Confira os valores.</Aviso>
      ) : taxa !== null && p !== null && pmt !== null && n !== null ? (
        <CartaoResultado>
          <Destaque legenda="Taxa cobrada">
            {formatPercentual(taxa)} <span className="text-lg font-extrabold text-white/80">ao mês</span>
          </Destaque>
          <Linhas
            itens={[
              ["Equivale a", `${formatPercentual(mensalParaAnual(taxa), 1)} ao ano`],
              ["Total a receber", formatCentavos(pmt * n)],
              ["Total de juros", formatCentavos(pmt * n - p)],
            ]}
          />
        </CartaoResultado>
      ) : (
        <Vazio>Preencha valor, parcela e quantidade.</Vazio>
      )}
    </div>
  );
}

type AtrasoProps = {
  multaPadrao: number;
  moraPadrao: number;
  multaLimite: number;
  moraLimite: number;
};

export function AtualizarAtraso({ multaPadrao, moraPadrao, multaLimite, moraLimite }: AtrasoProps) {
  const [valor, setValor] = useState("229,61");
  const [dias, setDias] = useState("10");
  const [multa, setMulta] = useState(percentualParaTexto(multaPadrao, 3));
  const [mora, setMora] = useState(percentualParaTexto(moraPadrao, 3));

  const v = centavosPositivos(valor);
  const d = lerInteiro(dias, 0, 3650);
  const m = parsePercentual(multa);
  const j = parsePercentual(mora);
  const r = v !== null && d !== null && m !== null && j !== null ? atualizarAtraso(v, d, m, j) : null;

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">
        Multa cobrada uma vez sobre a parcela, mais juros de mora proporcionais aos dias de atraso.
        Os padrões vêm das Configurações.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <CampoNumero id="atraso-valor" rotulo="Valor da parcela" prefixo="R$" valor={valor} onChange={setValor} erro={v === null ? ERRO_VALOR : null} />
        <CampoNumero id="atraso-dias" rotulo="Dias de atraso" tipo="inteiro" valor={dias} onChange={setDias} erro={d === null ? "Ex.: 10" : null} />
        <CampoNumero id="atraso-multa" rotulo="Multa" sufixo="%" valor={multa} onChange={setMulta} erro={m === null ? "Ex.: 2" : null} />
        <CampoNumero id="atraso-mora" rotulo="Mora ao mês" sufixo="%" valor={mora} onChange={setMora} erro={j === null ? "Ex.: 1" : null} />
      </div>
      {m !== null && m > multaLimite + 1e-9 && (
        <Aviso>
          Multa acima de {formatPercentual(multaLimite)}. O Código de Defesa do Consumidor limita a
          multa por atraso a 2% em contratos com pessoa física.
        </Aviso>
      )}
      {j !== null && j > moraLimite + 1e-9 && (
        <Aviso>
          Mora acima de {formatPercentual(moraLimite)} ao mês, o padrão usado nos contratos. Confirme
          se o contrato do cliente prevê esse valor.
        </Aviso>
      )}
      {r ? (
        <CartaoResultado>
          <Destaque legenda={r.diasAtraso === 0 ? "Sem atraso" : `Valor atualizado com ${r.diasAtraso} ${r.diasAtraso === 1 ? "dia" : "dias"} de atraso`}>
            {formatCentavos(r.totalCentavos)}
          </Destaque>
          <Linhas
            itens={[
              ["Parcela", formatCentavos(r.valorOriginalCentavos)],
              ["Multa", formatCentavos(r.multaCentavos)],
              ["Juros de mora", formatCentavos(r.moraCentavos)],
            ]}
          />
        </CartaoResultado>
      ) : (
        <Vazio>Preencha os quatro campos.</Vazio>
      )}
    </div>
  );
}

export function ConverterTaxa() {
  const [mensal, setMensal] = useState("9,99");
  const [anual, setAnual] = useState(() => percentualParaTexto(mensalParaAnual(0.0999)));

  function mudarMensal(texto: string) {
    setMensal(texto);
    const t = parsePercentual(texto);
    if (t !== null) setAnual(percentualParaTexto(mensalParaAnual(t)));
  }

  function mudarAnual(texto: string) {
    setAnual(texto);
    const t = parsePercentual(texto);
    if (t !== null) setMensal(percentualParaTexto(anualParaMensal(t), 4));
  }

  const m = parsePercentual(mensal);

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">
        Digite em qualquer um dos campos. A conversão é composta: juros sobre juros a cada mês.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <CampoNumero id="conv-mensal" rotulo="Taxa ao mês" sufixo="%" valor={mensal} onChange={mudarMensal} erro={m === null ? ERRO_TAXA : null} />
        <CampoNumero id="conv-anual" rotulo="Taxa ao ano" sufixo="%" valor={anual} onChange={mudarAnual} erro={parsePercentual(anual) === null ? "Ex.: 213,84" : null} />
      </div>
      {m !== null ? (
        <CartaoResultado>
          <Destaque legenda={`${formatPercentual(m)} ao mês equivale a`}>
            {formatPercentual(mensalParaAnual(m))} <span className="text-lg font-extrabold text-white/80">ao ano</span>
          </Destaque>
          <Linhas
            itens={[
              ["Em 3 meses", formatPercentual((1 + m) ** 3 - 1)],
              ["Em 6 meses", formatPercentual((1 + m) ** 6 - 1)],
              ["Em 12 meses, sem juros sobre juros", formatPercentual(m * 12)],
            ]}
          />
        </CartaoResultado>
      ) : (
        <Vazio>Digite uma taxa.</Vazio>
      )}
    </div>
  );
}

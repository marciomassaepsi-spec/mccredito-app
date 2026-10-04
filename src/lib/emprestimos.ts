import {
  diasEntre,
  gerarCronograma,
  gerarVencimentos,
  taxaDoPeriodo,
  type Periodicidade,
  type Sistema,
} from "./finance";

/** Parcela pronta para gravar no banco (formato da função criar_emprestimo). */
export type ParcelaNova = {
  numero: number;
  vencimento: string;
  valor_centavos: number;
  juros_centavos: number;
  amortizacao_centavos: number;
  saldo_devedor_centavos: number;
};

/**
 * Monta o cronograma com datas. A taxa digitada é sempre ao mês; em empréstimos
 * quinzenais ou semanais ela é convertida para a taxa equivalente do período.
 */
export function montarParcelas(dados: {
  sistema: Sistema;
  valorCentavos: number;
  taxaMensal: number;
  qtdParcelas: number;
  primeiroVencimento: string;
  periodicidade: Periodicidade;
}): ParcelaNova[] {
  const taxa =
    dados.sistema === "simples"
      ? dados.taxaMensal / ({ mensal: 1, quinzenal: 2, semanal: 52 / 12 } as const)[dados.periodicidade]
      : taxaDoPeriodo(dados.taxaMensal, dados.periodicidade);
  const cronograma = gerarCronograma(dados.sistema, dados.valorCentavos, taxa, dados.qtdParcelas);
  const datas = gerarVencimentos(dados.primeiroVencimento, dados.qtdParcelas, dados.periodicidade);
  return cronograma.linhas.map((l, i) => ({
    numero: l.numero,
    vencimento: datas[i],
    valor_centavos: l.valorCentavos,
    juros_centavos: l.jurosCentavos,
    amortizacao_centavos: l.amortizacaoCentavos,
    saldo_devedor_centavos: l.saldoCentavos,
  }));
}

/** O que importa de uma parcela gravada para saber a situação dela. */
export type ParcelaGravada = {
  numero: number;
  vencimento: string;
  valor_centavos: number;
  pago_centavos: number;
  status: "a_vencer" | "paga" | "paga_parcial" | "cancelada";
  quitada_em: string | null;
};

export type Situacao = "paga" | "cancelada" | "atrasada" | "vence_hoje" | "a_vencer";

export type SituacaoParcela = {
  situacao: Situacao;
  /** Dias de atraso (0 se não está atrasada) */
  diasAtraso: number;
  /** Quanto falta pagar, sem multa e mora */
  emAbertoCentavos: number;
};

/** "Atrasada" e "vence hoje" não são gravadas no banco: saem da data. */
export function situacaoParcela(p: ParcelaGravada, hoje: string): SituacaoParcela {
  if (p.status === "paga") return { situacao: "paga", diasAtraso: 0, emAbertoCentavos: 0 };
  if (p.status === "cancelada") return { situacao: "cancelada", diasAtraso: 0, emAbertoCentavos: 0 };
  const emAberto = Math.max(0, p.valor_centavos - p.pago_centavos);
  const dias = diasEntre(p.vencimento, hoje);
  if (dias > 0) return { situacao: "atrasada", diasAtraso: dias, emAbertoCentavos: emAberto };
  if (dias === 0) return { situacao: "vence_hoje", diasAtraso: 0, emAbertoCentavos: emAberto };
  return { situacao: "a_vencer", diasAtraso: 0, emAbertoCentavos: emAberto };
}

export type ResumoEmprestimo<T extends ParcelaGravada = ParcelaGravada> = {
  pagas: number;
  total: number;
  atrasadas: number;
  maiorAtrasoDias: number;
  emAbertoCentavos: number;
  atrasadoCentavos: number;
  proxima: (T & SituacaoParcela) | null;
};

export function resumirParcelas<T extends ParcelaGravada>(parcelas: T[], hoje: string): ResumoEmprestimo<T> {
  const ordenadas = [...parcelas].sort((a, b) => a.numero - b.numero);
  let pagas = 0;
  let atrasadas = 0;
  let maiorAtrasoDias = 0;
  let emAberto = 0;
  let atrasado = 0;
  let proxima: ResumoEmprestimo<T>["proxima"] = null;

  for (const p of ordenadas) {
    const s = situacaoParcela(p, hoje);
    if (s.situacao === "paga") pagas++;
    emAberto += s.emAbertoCentavos;
    if (s.situacao === "atrasada") {
      atrasadas++;
      atrasado += s.emAbertoCentavos;
      maiorAtrasoDias = Math.max(maiorAtrasoDias, s.diasAtraso);
    }
    if (!proxima && s.emAbertoCentavos > 0) proxima = { ...p, ...s };
  }

  return {
    pagas,
    total: ordenadas.filter((p) => p.status !== "cancelada").length,
    atrasadas,
    maiorAtrasoDias,
    emAbertoCentavos: emAberto,
    atrasadoCentavos: atrasado,
    proxima,
  };
}

export type Pontualidade =
  | { tipo: "sem_historico" }
  | { tipo: "nota"; percentual: number; pagasEmDia: number; avaliadas: number; atrasadasAgora: number };

/**
 * Pontualidade do cliente: das parcelas que já venceram, quantas foram pagas
 * até o vencimento. Parcelas vencidas e ainda em aberto contam como atraso.
 */
export function calcularPontualidade(parcelas: ParcelaGravada[], hoje: string): Pontualidade {
  let avaliadas = 0;
  let emDia = 0;
  let atrasadasAgora = 0;
  for (const p of parcelas) {
    if (p.status === "cancelada") continue;
    if (p.status === "paga") {
      avaliadas++;
      if (p.quitada_em && p.quitada_em <= p.vencimento) emDia++;
    } else if (diasEntre(p.vencimento, hoje) > 0) {
      avaliadas++;
      atrasadasAgora++;
    }
  }
  if (avaliadas === 0) return { tipo: "sem_historico" };
  return {
    tipo: "nota",
    percentual: Math.round((emDia / avaliadas) * 100),
    pagasEmDia: emDia,
    avaliadas,
    atrasadasAgora,
  };
}

export const NOME_SITUACAO: Record<Situacao, string> = {
  paga: "Paga",
  cancelada: "Cancelada",
  atrasada: "Atrasada",
  vence_hoje: "Vence hoje",
  a_vencer: "A vencer",
};

export const NOME_SISTEMA: Record<Sistema, string> = {
  price: "Tabela Price",
  sac: "SAC",
  simples: "Juros simples",
};

export const NOME_PERIODICIDADE: Record<Periodicidade, string> = {
  mensal: "Mensal",
  quinzenal: "Quinzenal",
  semanal: "Semanal",
};

/** Mesma data no mês seguinte (31/01 → 28/02), para sugerir o 1º vencimento. */
export function umMesDepois(data: string): string {
  return gerarVencimentos(data, 2, "mensal")[1];
}

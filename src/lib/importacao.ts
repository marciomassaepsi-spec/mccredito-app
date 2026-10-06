/**
 * Importação de contratos que já estavam em andamento, a partir de uma
 * planilha (uma linha por contrato). Aqui ficam só funções puras: achar as
 * colunas, conferir cada linha e montar o cronograma. Ler o arquivo (Excel ou
 * CSV) fica em planilha.ts, e gravar fica na função SQL importar_contratos.
 */
import {
  montarParcelas,
  montarParcelasPelaParcela,
  NOME_PERIODICIDADE,
  NOME_SISTEMA,
  umMesDepois,
  type ParcelaNova,
} from "./emprestimos";
import { diasEntre, type Periodicidade, type Sistema } from "./finance";
import {
  cpfValido,
  formatCentavos,
  formatData,
  formatPercentual,
  normalizarTelefone,
  parsePercentual,
  parseReaisParaCentavos,
  percentualParaTexto,
  somarDiasISO,
} from "./format";

export const COLUNAS = [
  { chave: "nome", titulo: "Nome", dica: "Nome completo do cliente.", apelidos: ["cliente", "nome completo", "nome do cliente"] },
  { chave: "cpf", titulo: "CPF", dica: "Opcional, mas ajuda a não cadastrar o mesmo cliente duas vezes.", apelidos: [] },
  { chave: "whatsapp", titulo: "WhatsApp", dica: "Com DDD, ex.: (71) 91234-5678.", apelidos: ["telefone", "celular", "fone", "tel", "zap", "contato"] },
  { chave: "endereco", titulo: "Endereço", dica: "Opcional.", apelidos: [] },
  { chave: "valor", titulo: "Valor emprestado", dica: "Quanto o cliente recebeu, ex.: 1.500,00.", apelidos: ["valor", "emprestado", "valor liberado", "valor do emprestimo"] },
  { chave: "parcela", titulo: "Valor da parcela", dica: "O valor combinado de cada parcela, ex.: 344,00. Preencha este OU a taxa.", apelidos: ["parcela", "valor parcela", "valor das parcelas"] },
  { chave: "taxa", titulo: "Taxa ao mês (%)", dica: "Ex.: 9,99. Só se não souber o valor da parcela.", apelidos: ["taxa", "taxa ao mes", "juros", "juros ao mes", "taxa %", "juros %"] },
  { chave: "qtd", titulo: "Total de parcelas", dica: "Quantas parcelas o contrato tem no total, ex.: 6.", apelidos: ["parcelas", "qtd parcelas", "quantidade de parcelas", "n parcelas", "numero de parcelas"] },
  { chave: "pagas", titulo: "Parcelas pagas", dica: "Quantas o cliente já pagou, ex.: 2. Em branco = nenhuma.", apelidos: ["pagas", "ja pagas", "parcelas ja pagas", "qtd pagas"] },
  { chave: "liberado", titulo: "Data do empréstimo", dica: "Dia em que o dinheiro foi entregue, ex.: 05/07/2026.", apelidos: ["data", "data emprestimo", "data da liberacao", "liberacao", "liberado em", "inicio"] },
  { chave: "vencimento", titulo: "1º vencimento", dica: "Data da 1ª parcela. Em branco = um período depois do empréstimo.", apelidos: ["1o vencimento", "1 vencimento", "primeiro vencimento", "vencimento", "1a parcela", "primeira parcela"] },
  { chave: "frequencia", titulo: "Frequência", dica: "Mensal, Quinzenal ou Semanal. Em branco = Mensal.", apelidos: ["periodicidade", "parcelas a cada", "frequencia de pagamento"] },
  { chave: "sistema", titulo: "Sistema", dica: "Price, SAC ou Juros simples. Em branco = Price.", apelidos: ["sistema de amortizacao", "tipo de juros"] },
  { chave: "observacoes", titulo: "Observações", dica: "Opcional.", apelidos: ["obs", "observacao", "anotacoes"] },
] as const;

export type ChaveColuna = (typeof COLUNAS)[number]["chave"];
export type LinhaPlanilha = { linha: number; valores: Partial<Record<ChaveColuna, string>> };

/** "1º Vencimento", "TAXA AO MÊS (%)" → "1o vencimento", "taxa ao mes %" */
export function normalizarTitulo(texto: string): string {
  return texto
    .replace(/º/g, "o")
    .replace(/ª/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

const TITULOS = new Map<string, ChaveColuna>();
for (const c of COLUNAS) {
  for (const t of [c.titulo, c.chave, ...c.apelidos]) TITULOS.set(normalizarTitulo(t), c.chave);
}

const OBRIGATORIAS: ChaveColuna[] = ["nome", "valor", "qtd", "liberado"];

export type LeituraPlanilha =
  | { ok: true; linhas: LinhaPlanilha[]; ignoradas: string[] }
  | { ok: false; erro: string };

/**
 * Acha a linha de títulos (entre as 10 primeiras) e transforma as linhas
 * seguintes em objetos. As linhas são numeradas como no Excel (a 1ª é 1).
 */
export function lerLinhas(tabela: string[][]): LeituraPlanilha {
  let inicio = -1;
  let mapa: Array<ChaveColuna | null> = [];
  for (let i = 0; i < Math.min(tabela.length, 10); i++) {
    const tentativa = tabela[i].map((t) => TITULOS.get(normalizarTitulo(t)) ?? null);
    if (tentativa.filter(Boolean).length >= 3) {
      inicio = i;
      mapa = tentativa;
      break;
    }
  }
  if (inicio < 0) {
    return { ok: false, erro: "Não achei os títulos das colunas. Use a planilha modelo, com os títulos na primeira linha." };
  }

  const achadas = new Set(mapa.filter((c): c is ChaveColuna => c !== null));
  const faltando = OBRIGATORIAS.filter((c) => !achadas.has(c));
  if (!achadas.has("parcela") && !achadas.has("taxa")) faltando.push("parcela");
  if (faltando.length > 0) {
    const nomes = faltando.map((c) => (c === "parcela" ? "Valor da parcela (ou Taxa ao mês)" : tituloDa(c)));
    return { ok: false, erro: `Faltam colunas na planilha: ${nomes.join(", ")}.` };
  }

  const ignoradas = tabela[inicio].filter((t, i) => t.trim() !== "" && mapa[i] === null);
  const linhas: LinhaPlanilha[] = [];
  for (let i = inicio + 1; i < tabela.length; i++) {
    const valores: LinhaPlanilha["valores"] = {};
    mapa.forEach((chave, j) => {
      const v = (tabela[i][j] ?? "").trim();
      if (chave && v !== "" && valores[chave] === undefined) valores[chave] = v;
    });
    if (Object.keys(valores).length > 0) linhas.push({ linha: i + 1, valores });
  }
  return { ok: true, linhas, ignoradas };
}

function tituloDa(chave: ChaveColuna): string {
  return COLUNAS.find((c) => c.chave === chave)?.titulo ?? chave;
}

/** "05/07/2026", "5/7/26" ou "2026-07-05" → "2026-07-05". Null se não for uma data real. */
export function parseDataPlanilha(texto: string): string | null {
  const t = texto.trim();
  let a: number, m: number, d: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (r) {
    [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  } else {
    r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
    if (!r) return null;
    [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
    if (a < 100) a += 2000;
  }
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return null;
  if (a < 2000 || a > 2100) return null;
  return data.toISOString().slice(0, 10);
}

const FREQUENCIAS: Record<string, Periodicidade> = {
  mensal: "mensal", mes: "mensal", mensalmente: "mensal", "30 dias": "mensal",
  quinzenal: "quinzenal", quinzena: "quinzenal", "15 dias": "quinzenal", quinzenalmente: "quinzenal",
  semanal: "semanal", semana: "semanal", "7 dias": "semanal", semanalmente: "semanal",
};

const SISTEMAS: Record<string, Sistema> = {
  price: "price", "tabela price": "price", composto: "price", "juros compostos": "price",
  sac: "sac",
  simples: "simples", "juros simples": "simples",
};

/** Contrato pronto para gravar. */
export type ContratoImportado = {
  linha: number;
  cliente: { nome: string; cpf: string | null; whatsapp: string; endereco: string };
  valorCentavos: number;
  taxaMensal: number;
  sistema: Sistema;
  periodicidade: Periodicidade;
  liberado: string;
  primeiroVencimento: string;
  pagas: number;
  observacoes: string;
  parcelas: ParcelaNova[];
};

export type LinhaConferida = {
  linha: number;
  nome: string;
  erros: string[];
  avisos: string[];
  /** Resumo em uma linha, para a pessoa conferir antes de importar */
  resumo: string | null;
  contrato: ContratoImportado | null;
};

/** Confere uma linha da planilha e, se estiver tudo certo, monta o contrato. */
export function conferirLinha({ linha, valores: v }: LinhaPlanilha, hoje: string): LinhaConferida {
  const erros: string[] = [];
  const avisos: string[] = [];
  const nome = (v.nome ?? "").replace(/\s+/g, " ").trim();

  if (nome.length < 3) erros.push("Falta o nome do cliente.");
  if (nome.length > 120) erros.push("Nome muito longo.");

  let cpf: string | null = null;
  if (v.cpf) {
    let d = v.cpf.replace(/\D/g, "");
    // O Excel tira o zero da frente quando o CPF é guardado como número
    if (d.length >= 9 && d.length < 11) d = d.padStart(11, "0");
    if (cpfValido(d)) cpf = d;
    else erros.push(`CPF inválido (${v.cpf}).`);
  }

  let whatsapp = "";
  if (v.whatsapp) {
    const tel = normalizarTelefone(v.whatsapp);
    if (tel) whatsapp = tel;
    else erros.push(`WhatsApp inválido (${v.whatsapp}). Use o DDD, ex.: (71) 91234-5678.`);
  } else {
    avisos.push("Sem WhatsApp: não vai dar para cobrar pelo app até você cadastrar o número.");
  }

  const valor = v.valor ? parseReaisParaCentavos(v.valor) : null;
  if (!valor || valor <= 0) erros.push(v.valor ? `Valor emprestado inválido (${v.valor}).` : "Falta o valor emprestado.");

  const qtdLida = v.qtd && /^\d+$/.test(v.qtd.trim()) ? Number(v.qtd) : null;
  const qtd = qtdLida !== null && qtdLida >= 1 && qtdLida <= 360 ? qtdLida : null;
  if (qtd === null) erros.push(v.qtd ? `Total de parcelas inválido (${v.qtd}).` : "Falta o total de parcelas.");

  const pagas = !v.pagas ? 0 : /^\d+$/.test(v.pagas.trim()) ? Number(v.pagas) : null;
  if (pagas === null) erros.push(`Parcelas pagas inválido (${v.pagas}). Use um número, ex.: 2.`);
  else if (qtd !== null && pagas >= qtd) {
    erros.push("Todas as parcelas já foram pagas: o contrato terminou e não precisa ser importado.");
  }

  const periodicidade: Periodicidade | null = v.frequencia ? (FREQUENCIAS[normalizarTitulo(v.frequencia)] ?? null) : "mensal";
  if (!periodicidade) erros.push(`Frequência inválida (${v.frequencia}). Use Mensal, Quinzenal ou Semanal.`);

  let sistema: Sistema | null = v.sistema ? (SISTEMAS[normalizarTitulo(v.sistema)] ?? null) : "price";
  if (!sistema) erros.push(`Sistema inválido (${v.sistema}). Use Price, SAC ou Juros simples.`);

  const liberado = v.liberado ? parseDataPlanilha(v.liberado) : null;
  if (!liberado) erros.push(v.liberado ? `Data do empréstimo inválida (${v.liberado}). Use dd/mm/aaaa.` : "Falta a data do empréstimo.");

  let primeiroVencimento: string | null = null;
  if (v.vencimento) {
    primeiroVencimento = parseDataPlanilha(v.vencimento);
    if (!primeiroVencimento) erros.push(`1º vencimento inválido (${v.vencimento}). Use dd/mm/aaaa.`);
    else if (liberado && primeiroVencimento < liberado) erros.push("O 1º vencimento está antes da data do empréstimo.");
  } else if (liberado && periodicidade) {
    primeiroVencimento =
      periodicidade === "mensal" ? umMesDepois(liberado) : somarDiasISO(liberado, periodicidade === "quinzenal" ? 15 : 7);
  }

  const parcela = v.parcela ? parseReaisParaCentavos(v.parcela) : null;
  if (v.parcela && (!parcela || parcela <= 0)) erros.push(`Valor da parcela inválido (${v.parcela}).`);
  const taxaDigitada = v.taxa ? parsePercentual(v.taxa) : null;
  if (v.taxa && taxaDigitada === null) erros.push(`Taxa inválida (${v.taxa}). Use o número, ex.: 9,99.`);
  if (!v.parcela && !v.taxa) erros.push("Falta o valor da parcela (ou a taxa ao mês).");
  if (parcela && v.sistema && sistema !== "price") {
    erros.push("Com o valor da parcela, o sistema é Price (parcelas iguais). Deixe o Sistema em branco ou use a taxa.");
  }
  if (parcela) sistema = "price";

  if (erros.length > 0 || !valor || !qtd || pagas === null || !periodicidade || !sistema || !liberado || !primeiroVencimento) {
    return { linha, nome, erros, avisos, resumo: null, contrato: null };
  }

  let taxaMensal: number;
  let parcelas: ParcelaNova[];
  if (parcela) {
    const plano = montarParcelasPelaParcela({ valorCentavos: valor, parcelaCentavos: parcela, qtdParcelas: qtd, primeiroVencimento, periodicidade });
    if (!plano) {
      const motivo =
        parcela * qtd < valor
          ? `${qtd}x de ${formatCentavos(parcela)} dá menos que o valor emprestado.`
          : "A parcela está alta demais para esse valor.";
      return { linha, nome, erros: [`Confira os valores: ${motivo}`], avisos, resumo: null, contrato: null };
    }
    ({ taxaMensal, parcelas } = plano);
    if (taxaDigitada !== null && Math.abs(taxaDigitada - taxaMensal) > 0.001) {
      avisos.push(
        `A taxa da planilha (${formatPercentual(taxaDigitada)}) não bate com a parcela; usei a parcela, que dá ${formatPercentual(taxaMensal)} ao mês.`,
      );
    }
  } else {
    taxaMensal = taxaDigitada ?? 0;
    if (taxaMensal > 10) {
      return { linha, nome, erros: ["Taxa acima de 1000% ao mês. Confira."], avisos, resumo: null, contrato: null };
    }
    if (taxaMensal > 0 && taxaMensal < 0.005) {
      avisos.push(
        `Taxa de ${formatPercentual(taxaMensal)} ao mês. Se era ${formatPercentual(taxaMensal * 100)}, escreva ${percentualParaTexto(taxaMensal * 100)} na planilha.`,
      );
    }
    parcelas = montarParcelas({ sistema, valorCentavos: valor, taxaMensal, qtdParcelas: qtd, primeiroVencimento, periodicidade });
  }

  const abertas = parcelas.slice(pagas);
  const atrasadas = abertas.filter((p) => diasEntre(p.vencimento, hoje) > 0);
  if (atrasadas.length > 0) {
    avisos.push(
      atrasadas.length === 1
        ? `1 parcela em atraso (venceu em ${formatData(atrasadas[0].vencimento)}).`
        : `${atrasadas.length} parcelas em atraso, a mais antiga de ${formatData(atrasadas[0].vencimento)}.`,
    );
  }
  const adiantadas = parcelas.slice(0, pagas).filter((p) => p.vencimento > hoje).length;
  if (adiantadas > 0) avisos.push(`${adiantadas} das parcelas pagas ainda não venceram (pagas adiantado).`);

  const valores = new Set(parcelas.map((p) => p.valor_centavos));
  const descricaoParcelas =
    valores.size === 1 || (sistema === "price" && parcelas.length > 1)
      ? `${qtd}x de ${formatCentavos(parcelas[0].valor_centavos)}`
      : `${qtd} parcelas de ${formatCentavos(parcelas[0].valor_centavos)} a ${formatCentavos(parcelas[parcelas.length - 1].valor_centavos)}`;
  const proxima = abertas[0];
  const resumo = [
    `${formatCentavos(valor)} em ${descricaoParcelas}`,
    `${formatPercentual(taxaMensal)} ao mês`,
    periodicidade !== "mensal" ? NOME_PERIODICIDADE[periodicidade].toLowerCase() : null,
    sistema !== "price" ? NOME_SISTEMA[sistema] : null,
    `${pagas} de ${qtd} pagas`,
    `próxima ${formatData(proxima.vencimento)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    linha,
    nome,
    erros,
    avisos,
    resumo,
    contrato: {
      linha,
      cliente: { nome, cpf, whatsapp, endereco: (v.endereco ?? "").trim().slice(0, 300) },
      valorCentavos: valor,
      taxaMensal,
      sistema,
      periodicidade,
      liberado,
      primeiroVencimento,
      pagas,
      observacoes: (v.observacoes ?? "").trim().slice(0, 2000),
      parcelas,
    },
  };
}

/** Formato que a função SQL importar_contratos espera. */
export function paraFuncaoSQL(c: ContratoImportado) {
  return {
    linha: c.linha,
    cliente: c.cliente,
    emprestimo: {
      valor_centavos: c.valorCentavos,
      taxa_percentual: Math.round(c.taxaMensal * 100 * 10000) / 10000,
      sistema: c.sistema,
      qtd_parcelas: c.parcelas.length,
      periodicidade: c.periodicidade,
      liberado_em: c.liberado,
      primeiro_vencimento: c.primeiroVencimento,
      observacoes: c.observacoes,
    },
    parcelas: c.parcelas,
    ja_pagas: c.pagas,
  };
}

/** Lê um CSV (vírgula, ponto e vírgula ou tabulação), com aspas. */
export function lerCSV(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const contar = (c: string) => primeira.split(c).length - 1;
  const separador = [";", "\t", ","].reduce((melhor, c) => (contar(c) > contar(melhor) ? c : melhor), ";");

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"' && campo === "") aspas = true;
    else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

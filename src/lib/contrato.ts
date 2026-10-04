import { NOME_SISTEMA } from "./emprestimos";
import { cetMensal, type Periodicidade, type Sistema } from "./finance";
import { formatCentavos, formatCPF, formatData, formatPercentual } from "./format";
import { reaisPorExtenso } from "./extenso";
import { exibirChavePix } from "./pix";

/**
 * Modelo padrão. É um ponto de partida: revise com um advogado antes de usar.
 * Formatação: "# " título, "## " subtítulo, **negrito**, linha em branco separa
 * parágrafos, {{tabela_parcelas}} e {{assinaturas}} viram blocos próprios.
 */
export const MODELO_PADRAO = `# CONTRATO DE EMPRÉSTIMO PESSOAL

**CREDOR:** {{credor.nome}}, inscrito no CPF/CNPJ sob o nº {{credor.documento}}, com endereço em {{credor.cidade}}, doravante chamado CREDOR.

**DEVEDOR:** {{cliente.nome}}, inscrito no CPF sob o nº {{cliente.cpf}}, residente em {{cliente.endereco}}, doravante chamado DEVEDOR.

As partes acima celebram este contrato de empréstimo de dinheiro (mútuo), que se rege pelas cláusulas a seguir.

## Cláusula 1ª – Do valor

O CREDOR empresta ao DEVEDOR a quantia de **{{valor}}** ({{valor_extenso}}), entregue em {{data_liberacao}}, da qual o DEVEDOR dá plena quitação ao assinar este contrato.

## Cláusula 2ª – Dos juros e das parcelas

Sobre o valor emprestado incidem juros de {{taxa}} ao mês, calculados pelo sistema {{sistema}}. O DEVEDOR pagará {{parcelas}} parcelas {{periodicidade}}, que somam **{{total}}** ({{total_extenso}}), com custo efetivo total (CET) de {{cet}} ao mês, nos valores e datas abaixo:

{{tabela_parcelas}}

## Cláusula 3ª – Da forma de pagamento

Os pagamentos serão feitos por PIX para a chave {{pix}}, em nome de {{credor.nome}}, ou em dinheiro mediante recibo.

## Cláusula 4ª – Do atraso

A parcela paga depois do vencimento terá multa de {{multa}} sobre o valor em atraso e juros de mora de {{mora}} ao mês, calculados por dia de atraso.

O atraso de qualquer parcela por mais de 30 dias permite ao CREDOR considerar vencidas as parcelas seguintes e cobrar de uma vez o saldo devedor, com os encargos acima.

## Cláusula 5ª – Da quitação antecipada

O DEVEDOR pode quitar o saldo a qualquer tempo, total ou parcialmente, com redução proporcional dos juros das parcelas que ainda não venceram (art. 52, § 2º, do Código de Defesa do Consumidor).

## Cláusula 6ª – Dos dados pessoais

O DEVEDOR autoriza o uso dos dados informados neste contrato apenas para a sua execução e cobrança, nos termos da Lei nº 13.709/2018 (LGPD).

## Cláusula 7ª – Do foro

Fica eleito o foro da comarca de {{credor.cidade}} para resolver qualquer questão deste contrato.

E, por estarem de acordo, as partes assinam este contrato em duas vias de igual teor, junto com duas testemunhas.

{{credor.cidade}}, {{data_extenso}}.

{{assinaturas}}
`;

export type DadosContrato = {
  empresa: { nome: string; razaoSocial: string; documento: string; cidade: string; tipoChavePix: string; chavePix: string };
  cliente: { nome: string; cpf: string; endereco: string };
  emprestimo: {
    valorCentavos: number;
    taxaPercentual: number;
    sistema: Sistema;
    periodicidade: Periodicidade;
    liberadoEm: string;
    multaPercentual: number;
    moraPercentual: number;
  };
  parcelas: Array<{ numero: number; vencimento: string; valor_centavos: number }>;
  /** Data de emissão "aaaa-mm-dd" */
  hoje: string;
};

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function dataPorExtenso(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

function documento(doc: string) {
  if (doc.length === 11) return formatCPF(doc);
  if (doc.length === 14) return exibirChavePix("cnpj", doc);
  return doc;
}

const PLURAL_PERIODO: Record<Periodicidade, string> = {
  mensal: "mensais",
  quinzenal: "quinzenais",
  semanal: "semanais",
};

/** Lista de variáveis disponíveis, com descrição (mostrada no editor do modelo). */
export const VARIAVEIS: Array<[string, string]> = [
  ["credor.nome", "Seu nome completo ou razão social"],
  ["credor.documento", "Seu CPF ou CNPJ"],
  ["credor.cidade", "Sua cidade"],
  ["empresa.nome", "Nome da empresa (MC Créditos)"],
  ["cliente.nome", "Nome do cliente"],
  ["cliente.cpf", "CPF do cliente"],
  ["cliente.endereco", "Endereço do cliente"],
  ["valor", "Valor emprestado"],
  ["valor_extenso", "Valor emprestado por extenso"],
  ["data_liberacao", "Data em que o dinheiro foi entregue"],
  ["taxa", "Taxa de juros ao mês"],
  ["sistema", "Tabela Price, SAC ou juros simples"],
  ["parcelas", "Quantidade de parcelas"],
  ["periodicidade", "mensais, quinzenais ou semanais"],
  ["valor_parcela", "Valor da primeira parcela"],
  ["total", "Total a pagar"],
  ["total_extenso", "Total por extenso"],
  ["cet", "Custo efetivo total ao mês"],
  ["pix", "Sua chave PIX"],
  ["multa", "Multa por atraso"],
  ["mora", "Juros de mora ao mês"],
  ["data_extenso", "Data de hoje por extenso"],
  ["tabela_parcelas", "Tabela com todas as parcelas (sozinha na linha)"],
  ["assinaturas", "Linhas de assinatura e testemunhas (sozinha na linha)"],
];

export function montarVariaveis(d: DadosContrato): Record<string, string> {
  const total = d.parcelas.reduce((s, p) => s + p.valor_centavos, 0);
  const cet = cetMensal(d.emprestimo.valorCentavos, d.parcelas.map((p) => p.valor_centavos), d.emprestimo.periodicidade);
  const credor = d.empresa.razaoSocial || d.empresa.nome;
  return {
    "credor.nome": credor,
    "credor.documento": documento(d.empresa.documento) || "[preencha nas Configurações]",
    "credor.cidade": d.empresa.cidade || "[preencha nas Configurações]",
    "empresa.nome": d.empresa.nome,
    "cliente.nome": d.cliente.nome,
    "cliente.cpf": formatCPF(d.cliente.cpf),
    "cliente.endereco": d.cliente.endereco || "[endereço não cadastrado]",
    valor: formatCentavos(d.emprestimo.valorCentavos),
    valor_extenso: reaisPorExtenso(d.emprestimo.valorCentavos),
    data_liberacao: formatData(d.emprestimo.liberadoEm),
    taxa: formatPercentual(d.emprestimo.taxaPercentual / 100),
    sistema: NOME_SISTEMA[d.emprestimo.sistema],
    parcelas: String(d.parcelas.length),
    periodicidade: PLURAL_PERIODO[d.emprestimo.periodicidade],
    valor_parcela: formatCentavos(d.parcelas[0]?.valor_centavos ?? 0),
    total: formatCentavos(total),
    total_extenso: reaisPorExtenso(total),
    cet: cet === null ? "-" : formatPercentual(cet),
    pix: d.empresa.chavePix ? exibirChavePix(d.empresa.tipoChavePix, d.empresa.chavePix) : "[preencha nas Configurações]",
    multa: formatPercentual(d.emprestimo.multaPercentual / 100),
    mora: formatPercentual(d.emprestimo.moraPercentual / 100),
    data_extenso: dataPorExtenso(d.hoje),
  };
}

export type Bloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "tabela_parcelas" }
  | { tipo: "assinaturas" };

/** Troca as {{variaveis}} e quebra o texto em blocos. Variáveis desconhecidas são listadas. */
export function preencherModelo(modelo: string, variaveis: Record<string, string>) {
  const desconhecidas = new Set<string>();
  const texto = modelo.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (inteiro, nome: string) => {
    if (nome === "tabela_parcelas" || nome === "assinaturas") return inteiro;
    if (nome in variaveis) return variaveis[nome];
    desconhecidas.add(nome);
    return `[${nome}?]`;
  });

  const blocos: Bloco[] = [];
  let paragrafo: string[] = [];
  const fechar = () => {
    if (paragrafo.length) blocos.push({ tipo: "paragrafo", texto: paragrafo.join(" ") });
    paragrafo = [];
  };
  for (const linhaBruta of texto.replace(/\r\n/g, "\n").split("\n")) {
    const linha = linhaBruta.trim();
    if (linha === "") fechar();
    else if (/^\{\{\s*tabela_parcelas\s*\}\}$/.test(linha)) {
      fechar();
      blocos.push({ tipo: "tabela_parcelas" });
    } else if (/^\{\{\s*assinaturas\s*\}\}$/.test(linha)) {
      fechar();
      blocos.push({ tipo: "assinaturas" });
    } else if (linha.startsWith("## ")) {
      fechar();
      blocos.push({ tipo: "subtitulo", texto: linha.slice(3) });
    } else if (linha.startsWith("# ")) {
      fechar();
      blocos.push({ tipo: "titulo", texto: linha.slice(2) });
    } else paragrafo.push(linha);
  }
  fechar();
  return { blocos, desconhecidas: [...desconhecidas] };
}

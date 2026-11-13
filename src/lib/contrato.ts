import { NOME_SISTEMA } from "./emprestimos";
import { cetMensal, type Periodicidade, type Sistema } from "./finance";
import { formatCentavos, formatCNPJ, formatCPF, formatData, formatPercentual } from "./format";
import { reaisPorExtenso } from "./extenso";
import { exibirChavePix } from "./pix";

/**
 * Modelo padrão. É um ponto de partida: revise com um advogado antes de usar.
 * Formatação: "# " título, "## " subtítulo, **negrito**, linha em branco separa
 * parágrafos, {{tabela_parcelas}} e {{assinaturas}} viram blocos próprios.
 * {{renegociacao}} sozinha na linha some quando o empréstimo não é renegociação.
 */
export const MODELO_PADRAO = `# CONTRATO DE EMPRÉSTIMO PESSOAL

**CREDOR:** {{empresa.qualificacao}}, doravante chamada CREDOR.

**DEVEDOR:** {{cliente.nome}}, inscrito no CPF sob o nº {{cliente.cpf}}, residente em {{cliente.endereco}}, doravante chamado DEVEDOR.

As partes acima celebram este contrato de empréstimo de dinheiro (mútuo), que se rege pelas cláusulas a seguir.

## Cláusula 1ª – Do valor

O CREDOR empresta ao DEVEDOR a quantia de **{{valor}}** ({{valor_extenso}}), {{entrega}}.

{{renegociacao}}

## Cláusula 2ª – Dos juros e das parcelas

Sobre o valor emprestado incidem juros de {{taxa}} ao mês, calculados pelo sistema {{sistema}}. O DEVEDOR pagará {{parcelas}} parcelas {{periodicidade}}, que somam **{{total}}** ({{total_extenso}}), com custo efetivo total (CET) de {{cet}} ao mês, nos valores e datas abaixo:

{{tabela_parcelas}}

## Cláusula 3ª – Da forma de pagamento

Os pagamentos serão feitos por PIX para a chave {{pix}}, em nome de {{pix.titular}}, ou em dinheiro mediante recibo.

## Cláusula 4ª – Do atraso

A parcela paga depois do vencimento terá juros de {{juros_atraso_dia}} ao dia sobre o valor da parcela em atraso, contados por dia de atraso.

O atraso de qualquer parcela por mais de 30 dias permite ao CREDOR considerar vencidas as parcelas seguintes e cobrar de uma vez o saldo devedor, com os juros de atraso acima.

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

/**
 * Modelos padrão de versões anteriores, guardados para reconhecer quem salvou
 * o padrão sem mexer: esse modelo passa a usar o padrão atual sozinho.
 * Nunca edite estes textos; ao mudar o MODELO_PADRAO, acrescente o anterior aqui.
 */
const MODELOS_PADRAO_ANTERIORES = [
  // Até novembro de 2026: cláusula 4 com multa de 2% e juros de mora de 1% ao mês
  `# CONTRATO DE EMPRÉSTIMO PESSOAL

**CREDOR:** {{empresa.qualificacao}}, doravante chamada CREDOR.

**DEVEDOR:** {{cliente.nome}}, inscrito no CPF sob o nº {{cliente.cpf}}, residente em {{cliente.endereco}}, doravante chamado DEVEDOR.

As partes acima celebram este contrato de empréstimo de dinheiro (mútuo), que se rege pelas cláusulas a seguir.

## Cláusula 1ª – Do valor

O CREDOR empresta ao DEVEDOR a quantia de **{{valor}}** ({{valor_extenso}}), {{entrega}}.

{{renegociacao}}

## Cláusula 2ª – Dos juros e das parcelas

Sobre o valor emprestado incidem juros de {{taxa}} ao mês, calculados pelo sistema {{sistema}}. O DEVEDOR pagará {{parcelas}} parcelas {{periodicidade}}, que somam **{{total}}** ({{total_extenso}}), com custo efetivo total (CET) de {{cet}} ao mês, nos valores e datas abaixo:

{{tabela_parcelas}}

## Cláusula 3ª – Da forma de pagamento

Os pagamentos serão feitos por PIX para a chave {{pix}}, em nome de {{pix.titular}}, ou em dinheiro mediante recibo.

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
`,
  // Até novembro de 2026: a cláusula 1 sempre dizia que o valor todo foi entregue (sem renegociação)
  `# CONTRATO DE EMPRÉSTIMO PESSOAL

**CREDOR:** {{empresa.qualificacao}}, doravante chamada CREDOR.

**DEVEDOR:** {{cliente.nome}}, inscrito no CPF sob o nº {{cliente.cpf}}, residente em {{cliente.endereco}}, doravante chamado DEVEDOR.

As partes acima celebram este contrato de empréstimo de dinheiro (mútuo), que se rege pelas cláusulas a seguir.

## Cláusula 1ª – Do valor

O CREDOR empresta ao DEVEDOR a quantia de **{{valor}}** ({{valor_extenso}}), entregue em {{data_liberacao}}, da qual o DEVEDOR dá plena quitação ao assinar este contrato.

## Cláusula 2ª – Dos juros e das parcelas

Sobre o valor emprestado incidem juros de {{taxa}} ao mês, calculados pelo sistema {{sistema}}. O DEVEDOR pagará {{parcelas}} parcelas {{periodicidade}}, que somam **{{total}}** ({{total_extenso}}), com custo efetivo total (CET) de {{cet}} ao mês, nos valores e datas abaixo:

{{tabela_parcelas}}

## Cláusula 3ª – Da forma de pagamento

Os pagamentos serão feitos por PIX para a chave {{pix}}, em nome de {{pix.titular}}, ou em dinheiro mediante recibo.

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
`,
  // Até novembro de 2026: credor era a pessoa física (nome e CPF das Configurações)
  `# CONTRATO DE EMPRÉSTIMO PESSOAL

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
`,
];

function normalizarModelo(texto: string) {
  return texto.replace(/\r\n/g, "\n").trim();
}

/** Vazio, igual ao padrão atual ou igual a um padrão antigo: não é personalizado. */
export function ehModeloPadrao(modelo: string): boolean {
  const n = normalizarModelo(modelo);
  return n === "" || [MODELO_PADRAO, ...MODELOS_PADRAO_ANTERIORES].some((m) => normalizarModelo(m) === n);
}

/** O texto que vale para o contrato: o modelo salvo pelo dono ou, se não houver, o padrão atual. */
export function modeloEmUso(salvo: string): string {
  return ehModeloPadrao(salvo) ? MODELO_PADRAO : salvo.trim();
}

export type DadosContrato = {
  empresa: {
    /** Nome da empresa (credora), ex.: "MC Créditos" */
    nome: string;
    /** CNPJ da empresa, só dígitos; vazio vira linha em branco no contrato */
    cnpj: string;
    /** Nome do responsável, que representa a empresa; vazio omite a representação */
    razaoSocial: string;
    /** CPF (ou CNPJ) do responsável, só dígitos */
    documento: string;
    cidade: string;
    tipoChavePix: string;
    chavePix: string;
    /** Titular da chave PIX; vazio usa o responsável ou a empresa */
    nomeRecebedorPix: string;
  };
  cliente: { nome: string; cpf: string; endereco: string };
  emprestimo: {
    valorCentavos: number;
    taxaPercentual: number;
    sistema: Sistema;
    periodicidade: Periodicidade;
    liberadoEm: string;
    /** Juros por dia de atraso, em % (1 = 1% ao dia) */
    jurosAtrasoDiaPercentual: number;
  };
  parcelas: Array<{ numero: number; vencimento: string; valor_centavos: number }>;
  /** Só quando o empréstimo veio de uma renegociação */
  renegociacao?: {
    /** Data do contrato anterior (liberação) "aaaa-mm-dd" */
    contratoAnteriorEm: string;
    /** Saldo do contrato anterior que passou para este (com juros de atraso, se somados) */
    saldoAnteriorCentavos: number;
    /** Dinheiro entregue ao cliente na renegociação */
    dinheiroNovoCentavos: number;
  } | null;
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
  if (doc.length === 14) return formatCNPJ(doc);
  return doc;
}

/** Espaço para escrever à mão quando o dado não foi informado. */
export const LINHA_EM_BRANCO = "________________________";

/** CNPJ da empresa formatado, ou a linha em branco para preencher à mão. */
export function cnpjOuLinha(cnpj: string): string {
  return /^\d{14}$/.test(cnpj) ? formatCNPJ(cnpj) : LINHA_EM_BRANCO;
}

/**
 * Quem é o credor, pronto para o contrato:
 * "MC Créditos, inscrita no CNPJ sob o nº 11.222.333/0001-81, com sede em Salvador - BA,
 * neste ato representada por Fulano de Tal, CPF nº 529.982.247-25".
 * Sem responsável, o trecho "neste ato representada por" sai; o CPF só entra se for CPF.
 */
export function qualificacaoEmpresa(e: DadosContrato["empresa"]): string {
  let texto = `${e.nome}, inscrita no CNPJ sob o nº ${cnpjOuLinha(e.cnpj)}`;
  texto += `, com sede em ${e.cidade || "[preencha nas Configurações]"}`;
  const responsavel = e.razaoSocial.trim();
  if (responsavel) {
    texto += `, neste ato representada por ${responsavel}`;
    if (/^\d{11}$/.test(e.documento)) texto += `, CPF nº ${formatCPF(e.documento)}`;
  }
  return texto;
}

/**
 * Parágrafo da renegociação: "Este contrato substitui o contrato de 05/06/2026.
 * O valor de R$ 1.000,00 corresponde ao saldo anterior de R$ 500,00 somado a
 * R$ 500,00 entregues ao DEVEDOR em 12/11/2026…"
 */
export function textoRenegociacao(r: NonNullable<DadosContrato["renegociacao"]>, e: Pick<DadosContrato["emprestimo"], "valorCentavos" | "liberadoEm">): string {
  const inicio = `Este contrato substitui o contrato de ${formatData(r.contratoAnteriorEm)}, que fica encerrado.`;
  if (r.dinheiroNovoCentavos <= 0) {
    return `${inicio} O valor de ${formatCentavos(e.valorCentavos)} corresponde ao saldo anterior, que o DEVEDOR reconhece como devido; nenhum valor novo foi entregue.`;
  }
  return (
    `${inicio} O valor de ${formatCentavos(e.valorCentavos)} corresponde ao saldo anterior de ${formatCentavos(r.saldoAnteriorCentavos)}, ` +
    `que o DEVEDOR reconhece como devido, somado a ${formatCentavos(r.dinheiroNovoCentavos)} (${reaisPorExtenso(r.dinheiroNovoCentavos)}) ` +
    `entregues ao DEVEDOR em ${formatData(e.liberadoEm)}, dos quais ele dá plena quitação ao assinar este contrato.`
  );
}

const PLURAL_PERIODO: Record<Periodicidade, string> = {
  mensal: "mensais",
  quinzenal: "quinzenais",
  semanal: "semanais",
};

/** Lista de variáveis disponíveis, com descrição (mostrada no editor do modelo). */
export const VARIAVEIS: Array<[string, string]> = [
  ["empresa.qualificacao", "Empresa credora completa: nome, CNPJ, sede e quem a representa"],
  ["empresa.nome", "Nome da empresa (MC Créditos), que é o credor"],
  ["empresa.cnpj", "CNPJ da empresa (sem CNPJ: linha em branco para preencher à mão)"],
  ["responsavel.nome", "Nome do responsável, que assina pela empresa"],
  ["responsavel.documento", "CPF do responsável"],
  ["credor.nome", "Nome do credor (igual a empresa.nome)"],
  ["credor.documento", "CNPJ do credor (igual a empresa.cnpj)"],
  ["credor.cidade", "Cidade da empresa"],
  ["cliente.nome", "Nome do cliente"],
  ["cliente.cpf", "CPF do cliente"],
  ["cliente.endereco", "Endereço do cliente"],
  ["valor", "Valor emprestado"],
  ["valor_extenso", "Valor emprestado por extenso"],
  ["data_liberacao", "Data em que o dinheiro foi entregue"],
  ["entrega", "\"entregue em dd/mm/aaaa, da qual o DEVEDOR dá plena quitação…\" ou, numa renegociação, como o valor foi formado"],
  ["renegociacao", "Numa renegociação: parágrafo com o contrato substituído, o saldo anterior e o dinheiro novo (vazio nos outros empréstimos; sozinha na linha)"],
  ["taxa", "Taxa de juros ao mês"],
  ["sistema", "Tabela Price, SAC ou juros simples"],
  ["parcelas", "Quantidade de parcelas"],
  ["periodicidade", "mensais, quinzenais ou semanais"],
  ["valor_parcela", "Valor da primeira parcela"],
  ["total", "Total a pagar"],
  ["total_extenso", "Total por extenso"],
  ["cet", "Custo efetivo total ao mês"],
  ["pix", "Sua chave PIX"],
  ["pix.titular", "Nome do titular da chave PIX"],
  ["juros_atraso_dia", "Juros por dia de atraso (das Configurações), ex.: 1%"],
  ["multa", "Modelos antigos: multa por atraso, sempre 0% (não há multa)"],
  ["mora", "Modelos antigos: juros de atraso ao mês, a taxa diária × 30 (1% ao dia = 30%)"],
  ["data_extenso", "Data de hoje por extenso"],
  ["tabela_parcelas", "Tabela com todas as parcelas (sozinha na linha)"],
  ["assinaturas", "Linhas de assinatura e testemunhas (sozinha na linha)"],
];

export function montarVariaveis(d: DadosContrato): Record<string, string> {
  const total = d.parcelas.reduce((s, p) => s + p.valor_centavos, 0);
  const cet = cetMensal(d.emprestimo.valorCentavos, d.parcelas.map((p) => p.valor_centavos), d.emprestimo.periodicidade);
  const cnpj = cnpjOuLinha(d.empresa.cnpj);
  return {
    "empresa.qualificacao": qualificacaoEmpresa(d.empresa),
    "empresa.nome": d.empresa.nome,
    "empresa.cnpj": cnpj,
    "responsavel.nome": d.empresa.razaoSocial.trim() || "[preencha nas Configurações]",
    "responsavel.documento": documento(d.empresa.documento) || LINHA_EM_BRANCO,
    // O credor é a empresa (modelos antigos usam credor.*)
    "credor.nome": d.empresa.nome,
    "credor.documento": cnpj,
    "credor.cidade": d.empresa.cidade || "[preencha nas Configurações]",
    "cliente.nome": d.cliente.nome,
    "cliente.cpf": formatCPF(d.cliente.cpf),
    "cliente.endereco": d.cliente.endereco || "[endereço não cadastrado]",
    valor: formatCentavos(d.emprestimo.valorCentavos),
    valor_extenso: reaisPorExtenso(d.emprestimo.valorCentavos),
    data_liberacao: formatData(d.emprestimo.liberadoEm),
    entrega: d.renegociacao
      ? "formada pelo saldo do contrato anterior e pelo valor novo, como descrito no parágrafo abaixo"
      : `entregue em ${formatData(d.emprestimo.liberadoEm)}, da qual o DEVEDOR dá plena quitação ao assinar este contrato`,
    renegociacao: d.renegociacao ? textoRenegociacao(d.renegociacao, d.emprestimo) : "",
    taxa: formatPercentual(d.emprestimo.taxaPercentual / 100),
    sistema: NOME_SISTEMA[d.emprestimo.sistema],
    parcelas: String(d.parcelas.length),
    periodicidade: PLURAL_PERIODO[d.emprestimo.periodicidade],
    valor_parcela: formatCentavos(d.parcelas[0]?.valor_centavos ?? 0),
    total: formatCentavos(total),
    total_extenso: reaisPorExtenso(total),
    cet: cet === null ? "-" : formatPercentual(cet),
    pix: d.empresa.chavePix ? exibirChavePix(d.empresa.tipoChavePix, d.empresa.chavePix) : "[preencha nas Configurações]",
    "pix.titular": d.empresa.nomeRecebedorPix.trim() || d.empresa.razaoSocial.trim() || d.empresa.nome,
    juros_atraso_dia: formatPercentual(d.emprestimo.jurosAtrasoDiaPercentual / 100, 3),
    // Modelos personalizados antigos ainda podem usar {{multa}} e {{mora}}: não há
    // multa, e a mora ao mês "calculada por dia de atraso" equivale à taxa diária × 30
    multa: formatPercentual(0),
    mora: formatPercentual((d.emprestimo.jurosAtrasoDiaPercentual * 30) / 100, 3),
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

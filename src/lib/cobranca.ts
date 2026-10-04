import { situacaoParcela, type ParcelaGravada } from "./emprestimos";
import { atualizarAtraso, diasEntre } from "./finance";
import { formatCentavos, formatData } from "./format";

export type ModeloMensagem = {
  dias_relativos: number;
  titulo: string;
  texto: string;
  ativo: boolean;
};

/**
 * Escolhe o modelo da régua para uma parcela: o de maior "dias" que já foi
 * alcançado. Ex.: com modelos em -3, 0, 1, 7 e 15, uma parcela com 10 dias de
 * atraso usa o de 7; uma que vence em 2 dias usa o de -3.
 */
export function escolherModelo(modelos: ModeloMensagem[], diasRelativos: number): ModeloMensagem | null {
  const ativos = modelos.filter((m) => m.ativo).sort((a, b) => a.dias_relativos - b.dias_relativos);
  if (ativos.length === 0) return null;
  let escolhido = ativos[0];
  for (const m of ativos) if (m.dias_relativos <= diasRelativos) escolhido = m;
  return escolhido;
}

export const VARIAVEIS_MENSAGEM: Array<[string, string]> = [
  ["cliente.primeiro_nome", "Primeiro nome do cliente"],
  ["cliente.nome", "Nome completo do cliente"],
  ["parcela.numero", "Número da parcela"],
  ["parcela.total", "Total de parcelas do empréstimo"],
  ["parcela.valor", "Valor da parcela (sem multa e mora)"],
  ["parcela.valor_atualizado", "Valor com multa e mora"],
  ["parcela.vencimento", "Data de vencimento"],
  ["parcela.dias_atraso", "Dias de atraso"],
  ["empresa.nome", "Nome da empresa"],
  ["empresa.pix", "Sua chave PIX"],
];

export function preencherMensagem(texto: string, variaveis: Record<string, string>) {
  const desconhecidas = new Set<string>();
  const saida = texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_inteiro, nome: string) => {
    if (nome in variaveis) return variaveis[nome];
    desconhecidas.add(nome);
    return "";
  });
  return { texto: saida.replace(/[ \t]+/g, " ").trim(), desconhecidas: [...desconhecidas] };
}

export function primeiroNome(nome: string) {
  const p = nome.trim().split(/\s+/)[0] ?? "";
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

const SP = "America/Sao_Paulo";

/** "08:00" ≤ hora atual em São Paulo < "20:00" */
export function dentroDoHorario(agora: Date, inicio: string, fim: string): boolean {
  const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: SP, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(agora);
  return hhmm >= inicio.slice(0, 5) && hhmm < fim.slice(0, 5);
}

export type Contato = {
  cliente_id: string;
  parcela_id: string | null;
  tipo: "whatsapp" | "ligacao" | "visita" | "outro";
  resultado: "prometeu_pagar" | "nao_atendeu" | "negociando" | "pagou" | "recusou" | "outro";
  promessa_para: string | null;
  observacoes: string;
  criado_em: string;
};

export type EmprestimoCobranca = {
  id: string;
  clientes: { id: string; nome: string; whatsapp: string; endereco: string } | null;
  parcelas: Array<ParcelaGravada & { id: string }>;
};

export type ItemCobranca = {
  emprestimoId: string;
  cliente: { id: string; nome: string; whatsapp: string; endereco: string };
  parcela: ParcelaGravada & { id: string };
  totalParcelas: number;
  grupo: "atrasada" | "hoje" | "proximos";
  diasRelativos: number;
  emAbertoCentavos: number;
  multaCentavos: number;
  moraCentavos: number;
  /** Em aberto + multa + mora */
  devidoCentavos: number;
  ultimoContato: Contato | null;
  /** Promessa de pagamento ainda válida (não venceu ou vence hoje) */
  promessa: string | null;
  promessaVencida: boolean;
};

/**
 * Monta a fila de cobrança: atrasadas (mais dias primeiro, depois maior valor),
 * as que vencem hoje e as dos próximos `diasAFrente` dias.
 */
export function montarFila(
  emprestimos: EmprestimoCobranca[],
  contatos: Contato[],
  hoje: string,
  multa: number,
  mora: number,
  diasAFrente = 7,
): ItemCobranca[] {
  const contatosPorParcela = new Map<string, Contato[]>();
  const contatosPorCliente = new Map<string, Contato[]>();
  for (const c of [...contatos].sort((a, b) => b.criado_em.localeCompare(a.criado_em))) {
    if (c.parcela_id) contatosPorParcela.set(c.parcela_id, [...(contatosPorParcela.get(c.parcela_id) ?? []), c]);
    contatosPorCliente.set(c.cliente_id, [...(contatosPorCliente.get(c.cliente_id) ?? []), c]);
  }

  const itens: ItemCobranca[] = [];
  for (const e of emprestimos) {
    if (!e.clientes) continue;
    for (const p of e.parcelas) {
      const s = situacaoParcela(p, hoje);
      if (s.emAbertoCentavos <= 0) continue;
      const diasRelativos = diasEntre(p.vencimento, hoje);
      if (diasRelativos < -diasAFrente) continue;
      const grupo = s.situacao === "atrasada" ? "atrasada" : s.situacao === "vence_hoje" ? "hoje" : "proximos";
      const a = atualizarAtraso(s.emAbertoCentavos, s.diasAtraso, multa, mora);
      const daParcela = contatosPorParcela.get(p.id) ?? [];
      const ultimoContato = daParcela[0] ?? contatosPorCliente.get(e.clientes.id)?.[0] ?? null;
      const comPromessa = daParcela.find((c) => c.resultado === "prometeu_pagar" && c.promessa_para);
      itens.push({
        emprestimoId: e.id,
        cliente: e.clientes,
        parcela: p,
        totalParcelas: e.parcelas.filter((x) => x.status !== "cancelada").length,
        grupo,
        diasRelativos,
        emAbertoCentavos: s.emAbertoCentavos,
        multaCentavos: a.multaCentavos,
        moraCentavos: a.moraCentavos,
        devidoCentavos: a.totalCentavos,
        ultimoContato,
        promessa: comPromessa?.promessa_para ?? null,
        promessaVencida: Boolean(comPromessa?.promessa_para && comPromessa.promessa_para <= hoje),
      });
    }
  }

  return itens.sort((a, b) =>
    a.grupo !== b.grupo
      ? ["atrasada", "hoje", "proximos"].indexOf(a.grupo) - ["atrasada", "hoje", "proximos"].indexOf(b.grupo)
      : a.grupo === "proximos"
        ? a.diasRelativos - b.diasRelativos || b.devidoCentavos - a.devidoCentavos
        : b.diasRelativos - a.diasRelativos || b.devidoCentavos - a.devidoCentavos,
  );
}

/** Variáveis para a mensagem de um item da fila. */
export function variaveisDoItem(item: ItemCobranca, empresa: { nome: string; pix: string }): Record<string, string> {
  return {
    "cliente.primeiro_nome": primeiroNome(item.cliente.nome),
    "cliente.nome": item.cliente.nome,
    "parcela.numero": String(item.parcela.numero),
    "parcela.total": String(item.totalParcelas),
    "parcela.valor": formatCentavos(item.emAbertoCentavos),
    "parcela.valor_atualizado": formatCentavos(item.devidoCentavos),
    "parcela.vencimento": formatData(item.parcela.vencimento),
    "parcela.dias_atraso": String(Math.max(0, item.diasRelativos)),
    "empresa.nome": empresa.nome,
    "empresa.pix": empresa.pix || "(peça a chave PIX)",
  };
}

export const NOME_RESULTADO: Record<Contato["resultado"], string> = {
  prometeu_pagar: "Prometeu pagar",
  nao_atendeu: "Não atendeu",
  negociando: "Negociando",
  pagou: "Disse que pagou",
  recusou: "Recusou",
  outro: "Outro",
};

export const NOME_TIPO_CONTATO: Record<Contato["tipo"], string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  visita: "Visita",
  outro: "Outro",
};

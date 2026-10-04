import { formatCentavos, formatData } from "./format";

type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];
type Registro = Record<string, Json | undefined>;

export type EntradaAuditoria = {
  id: number;
  tabela: string;
  acao: string;
  dados_antes: Json | null;
  dados_depois: Json | null;
  feito_em: string;
};

const ROTULOS: Record<string, string> = {
  nome: "Nome", cpf: "CPF", whatsapp: "WhatsApp", endereco: "Endereço", observacoes: "Observações",
  status: "Situação", valor_centavos: "Valor", pago_centavos: "Pago", taxa_percentual: "Taxa (%)",
  qtd_parcelas: "Parcelas", vencimento: "Vencimento", quitada_em: "Quitada em", estornado: "Estornado",
  estorno_motivo: "Motivo do estorno", multa_percentual: "Multa (%)", mora_percentual_mes: "Mora ao mês (%)",
  chave_pix: "Chave PIX", tipo_chave_pix: "Tipo da chave", razao_social: "Responsável", documento_empresa: "CPF/CNPJ",
  cidade: "Cidade", nome_empresa: "Empresa", limite_contratos_ativos: "Limite de contratos",
  cobranca_hora_inicio: "Cobrar a partir de", cobranca_hora_fim: "Cobrar até", nome_recebedor_pix: "Titular do PIX",
  texto: "Texto", ativo: "Ligada", modelo_contrato: "Modelo de contrato", papel: "Acesso", promessa_para: "Promessa para",
  resultado: "Resultado", tipo: "Tipo", nome_arquivo: "Arquivo",
};

const VALORES: Record<string, string> = {
  ativo: "ativo", quitado: "quitado", renegociado: "renegociado", cancelado: "cancelado",
  a_vencer: "em aberto", paga: "paga", paga_parcial: "paga em parte", cancelada: "cancelada",
};

const IGNORAR = new Set(["id", "atualizado_em", "criado_em", "registrado_por", "enviado_por", "estornado_em"]);

function obj(v: Json | null): Registro {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Registro) : {};
}

export function formatarValor(campo: string, v: Json | undefined): string {
  if (v === null || v === undefined || v === "") return "vazio";
  if (campo.endsWith("_centavos") && typeof v === "number") return formatCentavos(v);
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && campo !== "texto") return formatData(v.slice(0, 10));
  if (typeof v === "string") return VALORES[v] ?? (v.length > 80 ? `${v.slice(0, 80)}…` : v);
  return String(v);
}

export type Descricao = { titulo: string; mudancas: Array<{ campo: string; antes: string; depois: string }> };

/** Transforma uma linha da auditoria em uma frase e na lista do que mudou. */
export function descreverEntrada(e: EntradaAuditoria): Descricao {
  const antes = obj(e.dados_antes);
  const depois = obj(e.dados_depois);
  const atual = e.acao === "excluiu" ? antes : depois;
  const dinheiro = (c: string) => (typeof atual[c] === "number" ? formatCentavos(atual[c] as number) : "");

  const mudancas =
    e.acao === "alterou"
      ? Object.keys({ ...antes, ...depois })
          .filter((k) => !IGNORAR.has(k) && JSON.stringify(antes[k]) !== JSON.stringify(depois[k]))
          .map((k) => ({ campo: ROTULOS[k] ?? k, antes: formatarValor(k, antes[k]), depois: formatarValor(k, depois[k]) }))
      : [];

  let titulo: string;
  switch (e.tabela) {
    case "clientes":
      titulo = { criou: "Cadastrou o cliente", alterou: "Alterou o cliente", excluiu: "Excluiu o cliente" }[e.acao] + ` ${atual.nome ?? ""}`;
      break;
    case "emprestimos":
      titulo =
        e.acao === "criou"
          ? `Lançou empréstimo de ${dinheiro("valor_centavos")}`
          : e.acao === "alterou" && antes.status !== depois.status
            ? `Empréstimo de ${dinheiro("valor_centavos")} ficou ${formatarValor("status", depois.status)}`
            : `${e.acao === "excluiu" ? "Excluiu" : "Alterou"} empréstimo de ${dinheiro("valor_centavos")}`;
      break;
    case "parcelas":
      titulo =
        e.acao === "alterou" && antes.status !== depois.status
          ? `Parcela ${atual.numero} ficou ${formatarValor("status", depois.status)}`
          : `${e.acao === "criou" ? "Criou" : e.acao === "excluiu" ? "Excluiu" : "Alterou"} a parcela ${atual.numero}`;
      break;
    case "pagamentos":
      titulo =
        e.acao === "criou"
          ? `Registrou pagamento de ${dinheiro("valor_centavos")}`
          : depois.estornado && !antes.estornado
            ? `Estornou pagamento de ${dinheiro("valor_centavos")}`
            : "Alterou um pagamento";
      break;
    case "contatos_cobranca":
      titulo = e.acao === "criou" ? "Registrou contato de cobrança" : e.acao === "excluiu" ? "Excluiu contato" : "Alterou contato";
      break;
    case "documentos":
      titulo = `${e.acao === "criou" ? "Guardou" : e.acao === "excluiu" ? "Apagou" : "Alterou"} o documento ${atual.nome_arquivo ?? ""}`;
      break;
    case "configuracoes":
      titulo = "Alterou as configurações";
      break;
    case "modelos_mensagem":
      titulo = `Alterou a mensagem "${atual.titulo ?? ""}"`;
      break;
    case "perfis":
      titulo = `${e.acao === "criou" ? "Criou" : "Alterou"} um acesso ao app`;
      break;
    default:
      titulo = `${e.acao} ${e.tabela}`;
  }
  return { titulo: titulo.trim(), mudancas };
}

/** Link para o registro, quando ele tem tela própria. */
export function linkDaEntrada(e: EntradaAuditoria): string | null {
  const r = e.acao === "excluiu" ? obj(e.dados_antes) : obj(e.dados_depois);
  if (e.tabela === "clientes" && r.id) return `/clientes/${r.id}`;
  if (e.tabela === "emprestimos" && r.id) return `/emprestimos/${r.id}`;
  if (e.tabela === "parcelas" && r.emprestimo_id) return `/emprestimos/${r.emprestimo_id}`;
  if (e.tabela === "documentos" && r.emprestimo_id) return `/emprestimos/${r.emprestimo_id}`;
  if (e.tabela === "documentos" && r.cliente_id) return `/clientes/${r.cliente_id}`;
  if (e.tabela === "contatos_cobranca" && r.cliente_id) return `/clientes/${r.cliente_id}`;
  return null;
}

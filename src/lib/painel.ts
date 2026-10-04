import { diasEntre } from "./finance";
import { recebidoDoPagamento } from "./pagamentos";

export type ParcelaAberta = {
  vencimento: string;
  valor_centavos: number;
  pago_centavos: number;
};

export type ParcelaPrevista = {
  vencimento: string;
  valor_centavos: number;
};

export type PagamentoPainel = {
  pago_em: string;
  valor_centavos: number;
  multa_centavos: number;
  mora_centavos: number;
  desconto_centavos: number;
  /** Para separar a parte de juros do valor pago */
  parcelas: { valor_centavos: number; juros_centavos: number } | null;
};

export const FAIXAS_ATRASO = [
  { rotulo: "1 a 15 dias", min: 1, max: 15 },
  { rotulo: "16 a 30 dias", min: 16, max: 30 },
  { rotulo: "31 a 60 dias", min: 31, max: 60 },
  { rotulo: "61 a 90 dias", min: 61, max: 90 },
  { rotulo: "Mais de 90 dias", min: 91, max: Infinity },
] as const;

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-10-05" → "2026-10" */
export const mesDe = (iso: string) => iso.slice(0, 7);

/** Os últimos `n` meses terminando no mês de `hoje`, do mais antigo ao atual. */
export function ultimosMeses(hoje: string, n: number): Array<{ chave: string; rotulo: string; inicio: string; fim: string }> {
  const [a, m] = hoje.split("-").map(Number);
  const meses = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    const ano = d.getUTCFullYear();
    const mes = d.getUTCMonth() + 1;
    const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const chave = `${ano}-${String(mes).padStart(2, "0")}`;
    meses.push({ chave, rotulo: `${NOMES_MES[mes - 1]}/${String(ano).slice(2)}`, inicio: `${chave}-01`, fim: `${chave}-${ultimo}` });
  }
  return meses;
}

/** Parte de juros (e encargos) de um pagamento: juros proporcionais da parcela + multa + mora − desconto. */
export function jurosDoPagamento(p: PagamentoPainel): number {
  const proporcao = p.parcelas && p.parcelas.valor_centavos > 0 ? p.parcelas.juros_centavos / p.parcelas.valor_centavos : 0;
  return Math.round(p.valor_centavos * proporcao) + p.multa_centavos + p.mora_centavos - p.desconto_centavos;
}

export type Indicadores = {
  carteiraCentavos: number;
  atrasadoCentavos: number;
  /** atrasado ÷ carteira, de 0 a 1 */
  inadimplencia: number;
  recebidoMesCentavos: number;
  previstoMesCentavos: number;
  jurosMesCentavos: number;
  ticketMedioCentavos: number;
  contratosAtivos: number;
  serie: Array<{ chave: string; rotulo: string; previsto: number; recebido: number }>;
  faixas: Array<{ rotulo: string; centavos: number; parcelas: number }>;
};

export function calcularIndicadores(dados: {
  hoje: string;
  /** Parcelas em aberto (a vencer ou pagas em parte) de empréstimos ativos */
  abertas: ParcelaAberta[];
  /** Parcelas não canceladas que vencem dentro da janela da série */
  previstas: ParcelaPrevista[];
  /** Pagamentos não estornados dentro da janela */
  pagamentos: PagamentoPainel[];
  /** Valor emprestado de cada empréstimo ativo */
  valoresAtivos: number[];
  meses?: number;
}): Indicadores {
  const { hoje } = dados;
  const mesAtual = mesDe(hoje);

  let carteira = 0;
  let atrasado = 0;
  const faixas = FAIXAS_ATRASO.map((f) => ({ rotulo: f.rotulo, centavos: 0, parcelas: 0 }));
  for (const p of dados.abertas) {
    const emAberto = Math.max(0, p.valor_centavos - p.pago_centavos);
    if (emAberto === 0) continue;
    carteira += emAberto;
    const dias = diasEntre(p.vencimento, hoje);
    if (dias > 0) {
      atrasado += emAberto;
      const i = FAIXAS_ATRASO.findIndex((f) => dias >= f.min && dias <= f.max);
      faixas[i].centavos += emAberto;
      faixas[i].parcelas += 1;
    }
  }

  const serie = ultimosMeses(hoje, dados.meses ?? 6).map((m) => ({ chave: m.chave, rotulo: m.rotulo, previsto: 0, recebido: 0 }));
  const porMes = new Map(serie.map((s) => [s.chave, s]));
  for (const p of dados.previstas) {
    const s = porMes.get(mesDe(p.vencimento));
    if (s) s.previsto += p.valor_centavos;
  }
  let jurosMes = 0;
  for (const p of dados.pagamentos) {
    const s = porMes.get(mesDe(p.pago_em));
    if (s) s.recebido += recebidoDoPagamento(p);
    if (mesDe(p.pago_em) === mesAtual) jurosMes += jurosDoPagamento(p);
  }

  const atual = porMes.get(mesAtual);
  const ativos = dados.valoresAtivos.length;
  return {
    carteiraCentavos: carteira,
    atrasadoCentavos: atrasado,
    inadimplencia: carteira > 0 ? atrasado / carteira : 0,
    recebidoMesCentavos: atual?.recebido ?? 0,
    previstoMesCentavos: atual?.previsto ?? 0,
    jurosMesCentavos: jurosMes,
    ticketMedioCentavos: ativos ? Math.round(dados.valoresAtivos.reduce((s, v) => s + v, 0) / ativos) : 0,
    contratosAtivos: ativos,
    serie,
    faixas,
  };
}

/** Marcas "redondas" para o eixo: 0, 2.000, 4.000… (em centavos) */
export function marcasEixo(maximoCentavos: number, quantidade = 4): number[] {
  if (maximoCentavos <= 0) return [0];
  const bruto = maximoCentavos / quantidade;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= bruto) ?? 10 * potencia;
  const marcas = [];
  for (let v = 0; v <= maximoCentavos + passo * 0.001; v += passo) marcas.push(Math.round(v));
  if (marcas[marcas.length - 1] < maximoCentavos) marcas.push(Math.round(marcas[marcas.length - 1] + passo));
  return marcas;
}

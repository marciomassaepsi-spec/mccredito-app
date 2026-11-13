import type { Periodicidade } from "./tipos";

function partes(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function somarDias(data: string, dias: number): string {
  const [a, m, d] = partes(data);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/**
 * Datas de vencimento a partir do primeiro.
 * Mensal mantém o mesmo dia do mês; quando o mês não tem esse dia (31 em
 * fevereiro, por exemplo), usa o último dia daquele mês.
 */
export function gerarVencimentos(
  primeiro: string,
  parcelas: number,
  periodicidade: Periodicidade,
): string[] {
  const datas: string[] = [];
  if (periodicidade === "mensal") {
    const [ano, mes, dia] = partes(primeiro);
    for (let i = 0; i < parcelas; i++) {
      const total = mes - 1 + i;
      const a = ano + Math.floor(total / 12);
      const m = (total % 12) + 1;
      datas.push(iso(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
    }
  } else {
    const passo = periodicidade === "quinzenal" ? 15 : 7;
    for (let i = 0; i < parcelas; i++) datas.push(somarDias(primeiro, i * passo));
  }
  return datas;
}

// ---------------------------------------------------------------------------
// Mudar a data de vencimento (sem mexer em valores)
// ---------------------------------------------------------------------------

/** O que a remarcação precisa saber de cada parcela do empréstimo. */
export type ParcelaParaRemarcar = {
  id: string;
  numero: number;
  vencimento: string;
  status: "a_vencer" | "paga_parcial" | "paga" | "cancelada";
};

export type MudancaVencimento = { parcela_id: string; numero: number; antes: string; depois: string };

export type ResultadoRemarcacao =
  | { ok: true; mudancas: MudancaVencimento[] }
  | { ok: false; campo: "parcela_id" | "nova_data"; erro: string };

const EM_ABERTO = new Set(["a_vencer", "paga_parcial"]);

function br(data: string): string {
  const [a, m, d] = partes(data);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

/**
 * Novas datas de vencimento quando o cliente pede para mudar o dia.
 * Só as datas mudam: valor, juros, amortização, saldo e pagamentos ficam iguais.
 *
 * Com `seguintes`, as parcelas em aberto depois da escolhida seguem a nova data
 * na frequência do contrato, contando pelo número da parcela (a 5ª fica dois
 * períodos depois da 3ª). No mensal vale o mesmo dia do mês, ou o último dia
 * quando o mês não tem esse dia, como em gerarVencimentos.
 * Sem `seguintes`, só a escolhida muda.
 *
 * Erros: parcela paga ou cancelada, data antes da liberação, nada mudou, ou
 * vencimentos fora de ordem (uma parcela vencendo antes da anterior).
 */
export function remarcarVencimentos(d: {
  parcelas: ParcelaParaRemarcar[];
  parcelaId: string;
  novaData: string;
  seguintes: boolean;
  periodicidade: Periodicidade;
  liberadoEm: string;
}): ResultadoRemarcacao {
  const ordenadas = [...d.parcelas].sort((a, b) => a.numero - b.numero);
  const alvo = ordenadas.find((p) => p.id === d.parcelaId);
  if (!alvo) return { ok: false, campo: "parcela_id", erro: "Escolha a parcela." };
  if (!EM_ABERTO.has(alvo.status)) {
    return { ok: false, campo: "parcela_id", erro: "Esta parcela já está paga ou cancelada; escolha uma em aberto." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.novaData)) return { ok: false, campo: "nova_data", erro: "Escolha a nova data." };
  if (d.novaData < d.liberadoEm) {
    return { ok: false, campo: "nova_data", erro: `A nova data não pode ser antes da liberação (${br(d.liberadoEm)}).` };
  }

  const novas = new Map<string, string>([[alvo.id, d.novaData]]);
  if (d.seguintes) {
    const depois = ordenadas.filter((p) => p.numero > alvo.numero && EM_ABERTO.has(p.status));
    const ultimo = depois.length ? depois[depois.length - 1].numero : alvo.numero;
    const datas = gerarVencimentos(d.novaData, ultimo - alvo.numero + 1, d.periodicidade);
    for (const p of depois) novas.set(p.id, datas[p.numero - alvo.numero]);
  }

  const mudancas = ordenadas
    .filter((p) => novas.has(p.id) && novas.get(p.id) !== p.vencimento)
    .map((p) => ({ parcela_id: p.id, numero: p.numero, antes: p.vencimento, depois: novas.get(p.id) as string }));
  if (mudancas.length === 0) return { ok: false, campo: "nova_data", erro: "Essa já é a data de vencimento desta parcela." };

  // Canceladas não contam; as demais precisam seguir em ordem de data
  const finais = ordenadas
    .filter((p) => p.status !== "cancelada")
    .map((p) => ({ numero: p.numero, vencimento: novas.get(p.id) ?? p.vencimento }));
  for (let i = 1; i < finais.length; i++) {
    const anterior = finais[i - 1];
    const atual = finais[i];
    if (atual.vencimento < anterior.vencimento) {
      const dica =
        !d.seguintes && anterior.numero === alvo.numero
          ? ` Escolha uma data até ${br(atual.vencimento)} ou marque "Mudar também as parcelas seguintes".`
          : "";
      return {
        ok: false,
        campo: "nova_data",
        erro: `Com essa data, a ${anterior.numero}ª parcela (${br(anterior.vencimento)}) ficaria depois da ${atual.numero}ª (${br(atual.vencimento)}). Os vencimentos precisam seguir a ordem das parcelas.${dica}`,
      };
    }
  }
  return { ok: true, mudancas };
}

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

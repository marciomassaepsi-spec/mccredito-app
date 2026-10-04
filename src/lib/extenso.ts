const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** 0 a 999 por extenso */
function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const d = Math.floor(resto / 10);
  const u = resto % 10;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c]);
  if (resto >= 10 && resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
  else {
    if (d) partes.push(DEZENAS[d]);
    if (u) partes.push(UNIDADES[u]);
  }
  return partes.join(" e ");
}

const ESCALAS: Array<[string, string]> = [
  ["", ""],
  ["mil", "mil"],
  ["milhão", "milhões"],
  ["bilhão", "bilhões"],
];

/** Inteiro por extenso, no padrão usado em contratos: 1.250 → "mil duzentos e cinquenta". */
export function inteiroPorExtenso(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`Número inválido: ${n}`);
  if (n === 0) return "zero";

  const grupos: number[] = [];
  for (let resto = n; resto > 0; resto = Math.floor(resto / 1000)) grupos.push(resto % 1000);
  if (grupos.length > ESCALAS.length) throw new RangeError("Número grande demais.");

  const partes: Array<{ texto: string; valor: number }> = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    const [singular, plural] = ESCALAS[i];
    let texto: string;
    if (i === 1) texto = g === 1 ? "mil" : `${ate999(g)} mil`;
    else if (i >= 2) texto = `${ate999(g)} ${g === 1 ? singular : plural}`;
    else texto = ate999(g);
    partes.push({ texto, valor: g });
  }

  // "e" antes do último grupo quando ele é menor que 100 ou é centena redonda
  return partes
    .map((p, idx) => {
      const ultimo = idx === partes.length - 1;
      if (idx > 0 && ultimo && (p.valor < 100 || p.valor % 100 === 0)) return `e ${p.texto}`;
      return p.texto;
    })
    .join(" ");
}

/** 137764 → "mil trezentos e setenta e sete reais e sessenta e quatro centavos" */
export function reaisPorExtenso(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0) throw new RangeError(`Valor inválido: ${centavos}`);
  const reais = Math.floor(centavos / 100);
  const cent = centavos % 100;
  const partes: string[] = [];
  if (reais > 0) {
    const milhaoRedondo = reais >= 1_000_000 && reais % 1_000_000 === 0;
    partes.push(`${inteiroPorExtenso(reais)}${milhaoRedondo ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  }
  if (cent > 0) partes.push(`${inteiroPorExtenso(cent)} ${cent === 1 ? "centavo" : "centavos"}`);
  return partes.length ? partes.join(" e ") : "zero real";
}

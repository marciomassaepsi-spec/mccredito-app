const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 137764 → "R$ 1.377,64". Dinheiro sempre circula em centavos inteiros. */
export function formatCentavos(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new Error(`Valor em centavos inválido: ${centavos}`);
  }
  // Intl usa espaço não separável depois de "R$"; trocamos por espaço comum
  // para o texto colado no WhatsApp ficar limpo.
  return brl.format(centavos / 100).replace(/ /g, " ");
}

/**
 * "1.377,64", "1377,64", "R$ 1.377,64" ou "1377.64" → 137764.
 * Devolve null quando o texto não é um valor válido.
 */
export function parseReaisParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (limpo === "") return null;

  let normalizado: string;
  if (limpo.includes(",")) {
    // Formato brasileiro: ponto separa milhar, vírgula separa centavos
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null;
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // "1.000" ou "12.500": ponto de milhar, sem centavos
    normalizado = limpo.replace(/\./g, "");
  } else {
    if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
    normalizado = limpo;
  }

  const [inteiro, frac = ""] = normalizado.split(".");
  const centavos = Number(inteiro) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

const SP = "America/Sao_Paulo";

/** Data de hoje no fuso de São Paulo, no formato ISO "aaaa-mm-dd". */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SP,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** "2026-10-04" → "04/10/2026" */
export function formatData(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** "Domingo, 4 de outubro" (para cabeçalhos) */
export function formatDataExtenso(agora: Date = new Date()): string {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: SP,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(agora);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "123.456.789-09" ou "12345678909" → "***.456.789-**" (CPF mascarado nas listas) */
export function mascararCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** Validação dos dígitos verificadores do CPF. */
export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10]);
}

/** "9,99", "9.99" ou "9,99%" → 0.0999. Devolve null quando não é um número. */
export function parsePercentual(texto: string): number | null {
  const limpo = texto.replace(/%|\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(limpo)) return null;
  return Number(limpo) / 100;
}

/** 0.0999 → "9,99%". Até `casas` casas decimais, sem zeros sobrando. */
export function formatPercentual(taxa: number, casas = 2): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(taxa * 100)}%`;
}

/** 0.0999 → "9,99" (para preencher campos) */
export function percentualParaTexto(taxa: number, casas = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: casas,
    useGrouping: false,
  }).format(taxa * 100);
}

/** 137764 → "1.377,64" (para preencher campos de dinheiro) */
export function centavosParaTexto(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(centavos / 100);
}

import { cnpjValido, cpfValido } from "./format";

export type TipoChavePix = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";

export const NOME_TIPO_CHAVE: Record<TipoChavePix, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  telefone: "Celular",
  email: "E-mail",
  aleatoria: "Chave aleatória",
};

export type ResultadoChave = { ok: true; chave: string } | { ok: false; erro: string };

/**
 * Normaliza a chave no formato que o PIX exige:
 * celular "+55DDNNNNNNNNN", CPF/CNPJ só dígitos, e-mail minúsculo,
 * aleatória no formato UUID minúsculo.
 */
export function normalizarChavePix(tipo: TipoChavePix, texto: string): ResultadoChave {
  const bruto = texto.trim();
  const digitos = bruto.replace(/\D/g, "");

  switch (tipo) {
    case "cpf":
      return cpfValido(digitos) ? { ok: true, chave: digitos } : { ok: false, erro: "CPF inválido." };
    case "cnpj":
      return cnpjValido(digitos) ? { ok: true, chave: digitos } : { ok: false, erro: "CNPJ inválido." };
    case "telefone": {
      // Aceita "71912345678", "(71) 91234-5678", "5571912345678", "+55 71 91234-5678"
      const nacional = digitos.length >= 12 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
      if (!/^[1-9]{2}9\d{8}$/.test(nacional)) {
        return { ok: false, erro: "Digite o celular com DDD, ex.: (71) 91234-5678." };
      }
      return { ok: true, chave: `+55${nacional}` };
    }
    case "email": {
      const email = bruto.toLowerCase();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 77
        ? { ok: true, chave: email }
        : { ok: false, erro: "E-mail inválido." };
    }
    case "aleatoria": {
      const chave = bruto.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(chave)
        ? { ok: true, chave }
        : { ok: false, erro: "A chave aleatória tem 32 letras e números separados por traços." };
    }
  }
}

/** Mostra a chave de um jeito fácil de ler: "+5571912345678" → "(71) 91234-5678". */
export function exibirChavePix(tipo: string, chave: string): string {
  if (tipo === "telefone") {
    const m = /^\+55(\d{2})(\d{5})(\d{4})$/.exec(chave);
    if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  }
  if (tipo === "cpf" && /^\d{11}$/.test(chave)) {
    return `${chave.slice(0, 3)}.${chave.slice(3, 6)}.${chave.slice(6, 9)}-${chave.slice(9)}`;
  }
  if (tipo === "cnpj" && /^\d{14}$/.test(chave)) {
    return `${chave.slice(0, 2)}.${chave.slice(2, 5)}.${chave.slice(5, 8)}/${chave.slice(8, 12)}-${chave.slice(12)}`;
  }
  return chave;
}

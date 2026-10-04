import { formatData } from "./format";

export type Tipo = "texto" | "dinheiro" | "data" | "numero" | "percentual";
export type Coluna<T> = { titulo: string; tipo: Tipo; valor: (linha: T) => string | number | null };
export type QualquerTabela = { aba: string; arquivo: string; colunas: Array<Coluna<never>>; linhas: unknown[] };

function celulaCSV(valor: string | number | null, tipo: Tipo): string {
  if (valor === null || valor === "") return "";
  let texto: string;
  if (tipo === "dinheiro" || tipo === "percentual") {
    texto = Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4, useGrouping: false });
  } else if (tipo === "data" && typeof valor === "string") texto = formatData(valor.slice(0, 10));
  else texto = String(valor);
  // Evita que o Excel execute fórmulas vindas de dados digitados (=, +, -, @)
  if (tipo === "texto" && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV no padrão do Excel em português: separador ";", vírgula decimal e BOM UTF-8. */
export function gerarCSV(tabela: QualquerTabela): string {
  const cabecalho = tabela.colunas.map((c) => celulaCSV(c.titulo, "texto")).join(";");
  const linhas = tabela.linhas.map((linha) =>
    tabela.colunas.map((c) => celulaCSV((c.valor as (l: unknown) => string | number | null)(linha), c.tipo)).join(";"),
  );
  return "﻿" + [cabecalho, ...linhas].join("\r\n") + "\r\n";
}


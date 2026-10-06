import "server-only";

import ExcelJS from "exceljs";

import { COLUNAS, lerCSV } from "./importacao";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const LIMITE_PLANILHA_BYTES = 4 * 1024 * 1024;

/** Valor de uma célula do Excel como texto, do jeito que a importação entende. */
function textoDaCelula(celula: ExcelJS.Cell): string {
  let valor: ExcelJS.CellValue = celula.value;
  if (valor && typeof valor === "object" && "result" in valor) valor = valor.result ?? null; // fórmula
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "number") {
    // Célula com formato de porcentagem guarda 9,99% como 0,0999
    const n = celula.numFmt?.includes("%") ? valor * 100 : valor;
    return String(Number(n.toFixed(6)));
  }
  if (typeof valor === "string") return valor;
  if (typeof valor === "boolean") return "";
  if (typeof valor === "object") {
    if ("richText" in valor) return valor.richText.map((t) => t.text).join("");
    if ("text" in valor && typeof valor.text === "string") return valor.text; // link
  }
  return "";
}

export type ArquivoLido = { ok: true; tabela: string[][] } | { ok: false; erro: string };

/** Lê a planilha enviada: Excel (.xlsx) ou CSV. */
export async function lerArquivoPlanilha(arquivo: File): Promise<ArquivoLido> {
  if (arquivo.size === 0) return { ok: false, erro: "Escolha a planilha." };
  if (arquivo.size > LIMITE_PLANILHA_BYTES) return { ok: false, erro: "A planilha passa de 4 MB. Mande só a aba dos contratos." };

  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".csv") || nome.endsWith(".txt") || arquivo.type === "text/csv") {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    // O Excel em português salva CSV em Windows-1252; o Google Planilhas, em UTF-8
    let texto = new TextDecoder("utf-8").decode(bytes);
    if (texto.includes("�")) texto = new TextDecoder("windows-1252").decode(bytes);
    return { ok: true, tabela: lerCSV(texto) };
  }
  if (nome.endsWith(".xls")) {
    return { ok: false, erro: "Esse é o formato antigo do Excel (.xls). Salve como .xlsx (Arquivo → Salvar como) e mande de novo." };
  }
  if (!nome.endsWith(".xlsx") && arquivo.type !== XLSX) {
    return { ok: false, erro: "Mande a planilha em Excel (.xlsx) ou CSV." };
  }

  const livro = new ExcelJS.Workbook();
  try {
    await livro.xlsx.load(await arquivo.arrayBuffer());
  } catch {
    return { ok: false, erro: "Não consegui abrir a planilha. Confira se é um arquivo do Excel (.xlsx)." };
  }

  // A aba "Contratos" da planilha modelo; se não houver, a primeira com conteúdo
  const aba =
    livro.worksheets.find((a) => a.name.trim().toLowerCase() === "contratos") ??
    livro.worksheets.find((a) => a.actualRowCount > 0);
  if (!aba) return { ok: false, erro: "A planilha está vazia." };

  const tabela: string[][] = [];
  aba.eachRow({ includeEmpty: true }, (linha, numero) => {
    const celulas: string[] = [];
    for (let c = 1; c <= aba.columnCount; c++) celulas.push(textoDaCelula(linha.getCell(c)));
    tabela[numero - 1] = celulas;
  });
  for (let i = 0; i < tabela.length; i++) tabela[i] ??= [];
  return { ok: true, tabela };
}

const VERDE = "FF145A41";
const DINHEIRO = new Set(["valor", "parcela"]);
const DATA = new Set(["liberado", "vencimento"]);
const TEXTO = new Set(["cpf", "whatsapp"]);

/** Planilha modelo para importar contratos, com explicação de cada coluna. */
export async function gerarModeloImportacao() {
  const livro = new ExcelJS.Workbook();
  livro.creator = "MC Créditos";

  const aba = livro.addWorksheet("Contratos", { views: [{ state: "frozen", ySplit: 1 }] });
  aba.columns = COLUNAS.map((c) => ({
    header: c.titulo,
    key: c.chave,
    width: Math.max(14, c.titulo.length + 4, c.chave === "nome" || c.chave === "endereco" || c.chave === "observacoes" ? 30 : 0),
    style: DINHEIRO.has(c.chave)
      ? { numFmt: "#,##0.00" }
      : DATA.has(c.chave)
        ? { numFmt: "dd/mm/yyyy" }
        : TEXTO.has(c.chave)
          ? { numFmt: "@" }
          : {},
  }));
  const titulos = aba.getRow(1);
  titulos.font = { bold: true, color: { argb: "FFFFFFFF" } };
  titulos.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
  titulos.height = 22;

  // Listas de escolha nas colunas Frequência e Sistema (até a linha 500)
  const letra = (chave: string) => aba.getColumn(chave).letter;
  for (let l = 2; l <= 500; l++) {
    aba.getCell(`${letra("frequencia")}${l}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Mensal,Quinzenal,Semanal"'],
    };
    aba.getCell(`${letra("sistema")}${l}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Price,SAC,Juros simples"'],
    };
  }

  const ajuda = livro.addWorksheet("Como preencher");
  ajuda.columns = [
    { header: "Coluna", key: "coluna", width: 22 },
    { header: "O que colocar", key: "dica", width: 80 },
  ];
  ajuda.getRow(1).font = { bold: true };
  for (const c of COLUNAS) ajuda.addRow({ coluna: c.titulo, dica: c.dica });
  ajuda.addRow({});
  for (const texto of [
    "Uma linha por contrato, na aba Contratos. Os títulos da primeira linha não podem mudar.",
    "Obrigatórios: Nome, Valor emprestado, Total de parcelas, Data do empréstimo e o Valor da parcela (ou a Taxa).",
    "Prefira o Valor da parcela: o app usa exatamente o valor combinado e calcula a taxa.",
    "As parcelas pagas entram como recebidas na data do vencimento de cada uma.",
    "Exemplo (fictício): Maria da Silva · 1.500,00 · parcela 344,00 · 6 parcelas · 2 pagas · 05/07/2026 · 1º vencimento 05/08/2026.",
    "Pode mandar a mesma planilha de novo: contratos que já foram importados não são duplicados.",
  ]) {
    ajuda.addRow({ coluna: "", dica: texto });
  }
  ajuda.getColumn("dica").alignment = { wrapText: true, vertical: "top" };

  return livro.xlsx.writeBuffer();
}

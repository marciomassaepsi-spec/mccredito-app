/** Estado da tela de importação (fica fora de actions.ts, que só pode exportar funções). */

export const MAX_LINHAS = 300;

export type LinhaPrevia = {
  linha: number;
  nome: string;
  erros: string[];
  avisos: string[];
  resumo: string | null;
};

export type ResultadoImportacao = {
  criados: number;
  clientesNovos: number;
  jaExistiam: number;
  erros: Array<{ linha: number; nome: string; mensagem: string }>;
};

export type EstadoImportacao = {
  etapa: "inicio" | "previa" | "concluido";
  erro: string | null;
  arquivo: string;
  colunasIgnoradas: string[];
  linhas: LinhaPrevia[];
  /** As linhas como vieram da planilha; o servidor confere tudo de novo ao importar */
  dados: string;
  resultado: ResultadoImportacao | null;
};

export const INICIO_IMPORTACAO: EstadoImportacao = {
  etapa: "inicio",
  erro: null,
  arquivo: "",
  colunasIgnoradas: [],
  linhas: [],
  dados: "",
  resultado: null,
};

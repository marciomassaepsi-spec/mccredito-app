import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

import { gerarCSV, type Coluna, type QualquerTabela } from "./csv";
import { formatCPF, formatData, formatTelefone } from "./format";
import type { Database } from "./supabase/database.types";

type Tabela<T> = { aba: string; arquivo: string; colunas: Coluna<T>[]; linhas: T[] };

const reais = (centavos: number | null | undefined) => (centavos == null ? null : centavos / 100);

const NOMES: Record<string, string> = {
  price: "Price", sac: "SAC", simples: "Juros simples",
  mensal: "Mensal", quinzenal: "Quinzenal", semanal: "Semanal",
  ativo: "Ativo", quitado: "Quitado", em_atraso: "Em atraso", renegociado: "Renegociado", cancelado: "Cancelado",
  a_vencer: "Em aberto", paga: "Paga", paga_parcial: "Paga em parte", cancelada: "Cancelada",
  pix: "PIX", dinheiro: "Dinheiro", transferencia: "Transferência", outro: "Outro",
  whatsapp: "WhatsApp", ligacao: "Ligação", visita: "Visita",
  prometeu_pagar: "Prometeu pagar", nao_atendeu: "Não atendeu", negociando: "Negociando", pagou: "Disse que pagou", recusou: "Recusou",
};
const nome = (v: string | null) => (v ? (NOMES[v] ?? v) : "");

export const TABELAS_EXPORTAVEIS = ["clientes", "emprestimos", "parcelas", "pagamentos", "contatos"] as const;
export type TabelaExportavel = (typeof TABELAS_EXPORTAVEIS)[number];

/** Lê tudo o que vai para a exportação. Respeita as regras de acesso de quem pediu. */
export async function carregarTabelas(supabase: SupabaseClient<Database>) {
  const [clientes, emprestimos, parcelas, pagamentos, contatos] = await Promise.all([
    supabase.from("clientes").select("id, nome, cpf, whatsapp, endereco, observacoes, consentimento_lgpd_em, criado_em").order("nome"),
    supabase
      .from("emprestimos")
      .select("id, valor_centavos, taxa_percentual, sistema, qtd_parcelas, periodicidade, liberado_em, primeiro_vencimento, status, renegociado_de, observacoes, clientes(nome, cpf)")
      .order("liberado_em"),
    supabase
      .from("parcelas")
      .select("emprestimo_id, numero, vencimento, valor_centavos, juros_centavos, amortizacao_centavos, saldo_devedor_centavos, pago_centavos, status, quitada_em, emprestimos(clientes(nome))")
      .order("vencimento"),
    supabase
      .from("pagamentos")
      .select("id, pago_em, valor_centavos, multa_centavos, mora_centavos, desconto_centavos, forma, estornado, estorno_motivo, observacoes, parcelas(numero, emprestimo_id, emprestimos(clientes(nome)))")
      .order("pago_em"),
    supabase
      .from("contatos_cobranca")
      .select("criado_em, tipo, resultado, promessa_para, observacoes, clientes(nome), parcelas(numero)")
      .order("criado_em"),
  ]);
  const erro = [clientes, emprestimos, parcelas, pagamentos, contatos].find((r) => r.error)?.error;
  if (erro) throw new Error(erro.message);

  const tabelas = {
    clientes: {
      aba: "Clientes",
      arquivo: "clientes",
      linhas: clientes.data ?? [],
      colunas: [
        { titulo: "Nome", tipo: "texto", valor: (c) => c.nome },
        { titulo: "CPF", tipo: "texto", valor: (c) => formatCPF(c.cpf) },
        { titulo: "WhatsApp", tipo: "texto", valor: (c) => (c.whatsapp ? formatTelefone(c.whatsapp) : "") },
        { titulo: "Endereço", tipo: "texto", valor: (c) => c.endereco },
        { titulo: "Observações", tipo: "texto", valor: (c) => c.observacoes },
        { titulo: "Autorização LGPD em", tipo: "data", valor: (c) => c.consentimento_lgpd_em?.slice(0, 10) ?? null },
        { titulo: "Cadastrado em", tipo: "data", valor: (c) => c.criado_em.slice(0, 10) },
        { titulo: "Código", tipo: "texto", valor: (c) => c.id },
      ],
    } satisfies Tabela<NonNullable<typeof clientes.data>[number]>,
    emprestimos: {
      aba: "Empréstimos",
      arquivo: "emprestimos",
      linhas: emprestimos.data ?? [],
      colunas: [
        { titulo: "Cliente", tipo: "texto", valor: (e) => e.clientes?.nome ?? "" },
        { titulo: "CPF", tipo: "texto", valor: (e) => (e.clientes ? formatCPF(e.clientes.cpf) : "") },
        { titulo: "Valor emprestado", tipo: "dinheiro", valor: (e) => reais(e.valor_centavos) },
        { titulo: "Taxa ao mês (%)", tipo: "percentual", valor: (e) => Number(e.taxa_percentual) },
        { titulo: "Sistema", tipo: "texto", valor: (e) => nome(e.sistema) },
        { titulo: "Parcelas", tipo: "numero", valor: (e) => e.qtd_parcelas },
        { titulo: "Periodicidade", tipo: "texto", valor: (e) => nome(e.periodicidade) },
        { titulo: "Liberado em", tipo: "data", valor: (e) => e.liberado_em },
        { titulo: "1º vencimento", tipo: "data", valor: (e) => e.primeiro_vencimento },
        { titulo: "Situação", tipo: "texto", valor: (e) => nome(e.status) },
        { titulo: "Observações", tipo: "texto", valor: (e) => e.observacoes },
        { titulo: "Código", tipo: "texto", valor: (e) => e.id },
        { titulo: "Renegociação de", tipo: "texto", valor: (e) => e.renegociado_de ?? "" },
      ],
    } satisfies Tabela<NonNullable<typeof emprestimos.data>[number]>,
    parcelas: {
      aba: "Parcelas",
      arquivo: "parcelas",
      linhas: parcelas.data ?? [],
      colunas: [
        { titulo: "Cliente", tipo: "texto", valor: (p) => p.emprestimos?.clientes?.nome ?? "" },
        { titulo: "Parcela", tipo: "numero", valor: (p) => p.numero },
        { titulo: "Vencimento", tipo: "data", valor: (p) => p.vencimento },
        { titulo: "Valor", tipo: "dinheiro", valor: (p) => reais(p.valor_centavos) },
        { titulo: "Juros", tipo: "dinheiro", valor: (p) => reais(p.juros_centavos) },
        { titulo: "Amortização", tipo: "dinheiro", valor: (p) => reais(p.amortizacao_centavos) },
        { titulo: "Saldo devedor", tipo: "dinheiro", valor: (p) => reais(p.saldo_devedor_centavos) },
        { titulo: "Pago", tipo: "dinheiro", valor: (p) => reais(p.pago_centavos) },
        { titulo: "Situação", tipo: "texto", valor: (p) => nome(p.status) },
        { titulo: "Quitada em", tipo: "data", valor: (p) => p.quitada_em },
        { titulo: "Código do empréstimo", tipo: "texto", valor: (p) => p.emprestimo_id },
      ],
    } satisfies Tabela<NonNullable<typeof parcelas.data>[number]>,
    pagamentos: {
      aba: "Pagamentos",
      arquivo: "pagamentos",
      linhas: pagamentos.data ?? [],
      colunas: [
        { titulo: "Data", tipo: "data", valor: (p) => p.pago_em },
        { titulo: "Cliente", tipo: "texto", valor: (p) => p.parcelas?.emprestimos?.clientes?.nome ?? "" },
        { titulo: "Parcela", tipo: "numero", valor: (p) => p.parcelas?.numero ?? null },
        { titulo: "Abatido da parcela", tipo: "dinheiro", valor: (p) => reais(p.valor_centavos) },
        { titulo: "Multa", tipo: "dinheiro", valor: (p) => reais(p.multa_centavos) },
        { titulo: "Mora", tipo: "dinheiro", valor: (p) => reais(p.mora_centavos) },
        { titulo: "Desconto", tipo: "dinheiro", valor: (p) => reais(p.desconto_centavos) },
        {
          titulo: "Recebido",
          tipo: "dinheiro",
          valor: (p) => reais(p.valor_centavos + p.multa_centavos + p.mora_centavos - p.desconto_centavos),
        },
        { titulo: "Forma", tipo: "texto", valor: (p) => nome(p.forma) },
        { titulo: "Estornado", tipo: "texto", valor: (p) => (p.estornado ? `Sim: ${p.estorno_motivo ?? ""}` : "Não") },
        { titulo: "Observações", tipo: "texto", valor: (p) => p.observacoes },
        { titulo: "Código do empréstimo", tipo: "texto", valor: (p) => p.parcelas?.emprestimo_id ?? "" },
      ],
    } satisfies Tabela<NonNullable<typeof pagamentos.data>[number]>,
    contatos: {
      aba: "Contatos",
      arquivo: "contatos-de-cobranca",
      linhas: contatos.data ?? [],
      colunas: [
        { titulo: "Data", tipo: "data", valor: (c) => c.criado_em.slice(0, 10) },
        { titulo: "Cliente", tipo: "texto", valor: (c) => c.clientes?.nome ?? "" },
        { titulo: "Parcela", tipo: "numero", valor: (c) => c.parcelas?.numero ?? null },
        { titulo: "Como", tipo: "texto", valor: (c) => nome(c.tipo) },
        { titulo: "Resultado", tipo: "texto", valor: (c) => nome(c.resultado) },
        { titulo: "Prometeu pagar em", tipo: "data", valor: (c) => c.promessa_para },
        { titulo: "Observações", tipo: "texto", valor: (c) => c.observacoes },
      ],
    } satisfies Tabela<NonNullable<typeof contatos.data>[number]>,
  };
  return tabelas;
}

function paraData(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

/** Uma planilha do Excel com uma aba por tabela, mais uma aba "Sobre" com a data do backup. */
export { gerarCSV };

export async function gerarBackupExcel(tabelas: Record<string, QualquerTabela>, info: { empresa: string; geradoEm: string }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = info.empresa;
  wb.created = new Date(info.geradoEm);

  const sobre = wb.addWorksheet("Sobre");
  sobre.columns = [{ width: 28 }, { width: 40 }];
  sobre.addRow([`Backup ${info.empresa}`]).font = { bold: true, size: 14 };
  sobre.addRow(["Gerado em", formatData(info.geradoEm.slice(0, 10))]);
  for (const t of Object.values(tabelas)) sobre.addRow([t.aba, `${t.linhas.length} linhas`]);
  sobre.addRow([]);
  sobre.addRow(["Atenção", "Contém dados pessoais (CPF, endereço). Guarde em local seguro."]).font = { bold: true };

  for (const t of Object.values(tabelas)) {
    const ws = wb.addWorksheet(t.aba, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = t.colunas.map((c) => ({
      header: c.titulo,
      width: c.tipo === "texto" ? 24 : 14,
      style: {
        numFmt: c.tipo === "dinheiro" ? '"R$" #,##0.00' : c.tipo === "data" ? "dd/mm/yyyy" : c.tipo === "percentual" ? "0.00##" : undefined,
      },
    }));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F7F5C" } };
    for (const linha of t.linhas) {
      ws.addRow(
        t.colunas.map((c) => {
          const v = (c.valor as (l: unknown) => string | number | null)(linha);
          if (v === null || v === "") return null;
          return c.tipo === "data" && typeof v === "string" ? paraData(v) : v;
        }),
      );
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.colunas.length } };
  }
  return wb.xlsx.writeBuffer();
}

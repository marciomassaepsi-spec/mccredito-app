/**
 * Gera supabase/seed.sql com dados FICTÍCIOS: 20 clientes e 40 empréstimos em
 * situações variadas (em dia, atrasados, quitados, pagamento parcial, cancelado).
 *
 * As datas são relativas a current_date, então o exemplo continua realista no
 * dia em que for carregado. Todos os ids começam com 5eed0000 para poderem ser
 * apagados com supabase/limpar-exemplos.sql.
 *
 *   npm run db:seed:gerar
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { montarParcelas } from "../src/lib/emprestimos";
import { atualizarAtraso, diasEntre, type Periodicidade, type Sistema } from "../src/lib/finance";

// Gerador pseudoaleatório com semente fixa: o arquivo sai igual toda vez
function mulberry32(semente: number) {
  let a = semente;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const aleatorio = mulberry32(20261005);
const entre = (min: number, max: number) => Math.floor(aleatorio() * (max - min + 1)) + min;
const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(aleatorio() * lista.length)];

let contador = 0;
const novoId = () => `5eed0000-0000-4000-8000-${(++contador).toString(16).padStart(12, "0")}`;

function gerarCPF(): string {
  const base = Array.from({ length: 9 }, () => entre(0, 9));
  const digito = (nums: number[]) => {
    const soma = nums.reduce((s, n, i) => s + n * (nums.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join("");
}

// Data de referência só para decidir o que já venceu; no SQL tudo vira current_date + N
const REFERENCIA = "2026-10-05";
function somarDias(iso: string, dias: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}
/** Mesmo dia, k meses antes (o dia 5 continua dia 5). */
function subtrairMeses(iso: string, k: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1 - k, d));
  return t.toISOString().slice(0, 10);
}
const sqlData = (iso: string) => {
  const n = diasEntre(REFERENCIA, iso);
  return n === 0 ? "current_date" : `current_date ${n > 0 ? "+" : "-"} ${Math.abs(n)}`;
};
const texto = (s: string) => `'${s.replace(/'/g, "''")}'`;

const NOMES = [
  "Josiane Ferreira dos Santos", "Carlos Eduardo Lima", "Marta Souza Oliveira", "Reginaldo Alves Pereira",
  "Ana Paula Conceição", "Edvaldo Nascimento", "Patrícia Ribeiro Costa", "Jorge Luiz Bonfim",
  "Cristiane Moura", "Antônio Carlos Brito", "Luciana Santana", "Gilberto Rocha Silva",
  "Fernanda Araújo", "Raimundo Nonato Cruz", "Sueli Barbosa", "Marcos Vinícius Teles",
  "Rosângela Pinheiro", "Wellington Dias Matos", "Daniela Carvalho", "Ivanildo Sena",
];
const RUAS = [
  "Rua das Hortênsias", "Rua Belo Horizonte", "Travessa São Jorge", "Rua da Paz", "Avenida Principal",
  "Rua Nova", "Rua do Sossego", "Ladeira do Sol", "Rua Santa Rita", "Rua Esperança",
];
const BAIRROS = ["Pituba", "Cabula", "Liberdade", "Itapuã", "Brotas", "Pernambués", "São Caetano", "Imbuí", "Periperi", "Stella Maris"];

type Cenario = "quitado" | "em_dia" | "atrasado" | "parcial" | "vence_hoje" | "cancelado" | "novo";
const CENARIOS: Cenario[] = [
  ...Array<Cenario>(6).fill("quitado"),
  ...Array<Cenario>(18).fill("em_dia"),
  ...Array<Cenario>(10).fill("atrasado"),
  ...Array<Cenario>(2).fill("parcial"),
  ...Array<Cenario>(2).fill("vence_hoje"),
  "cancelado",
  "novo",
];

const linhas: string[] = [];
const clientes = NOMES.map((nome, i) => {
  const id = novoId();
  const telefone = `7190000${String(1000 + i * 37).slice(-4)}`;
  const endereco = `${escolher(RUAS)}, ${entre(10, 980)} - ${escolher(BAIRROS)}, Salvador - BA`;
  linhas.push(
    `insert into clientes (id, nome, cpf, whatsapp, endereco, observacoes, consentimento_lgpd_em, criado_em) values (${texto(id)}, ${texto(nome)}, ${texto(gerarCPF())}, ${texto(telefone)}, ${texto(endereco)}, '', now(), now() - interval '${entre(30, 400)} days');`,
  );
  return id;
});

const VALORES = [50000, 80000, 100000, 120000, 150000, 200000, 250000, 300000, 500000];
const pagamentos: string[] = [];
const contatos: string[] = [];

CENARIOS.forEach((cenario, i) => {
  const clienteId = clientes[i % clientes.length];
  const emprestimoId = novoId();
  const sistema: Sistema = i % 9 === 0 ? "simples" : i % 13 === 0 ? "sac" : "price";
  const periodicidade: Periodicidade = i % 11 === 0 ? "quinzenal" : i % 17 === 0 ? "semanal" : "mensal";
  const qtd = escolher([3, 4, 5, 6, 6, 6, 8, 10, 12]);
  const taxaPercentual = escolher([8, 9, 9.99, 9.99, 10, 12]);
  const valor = escolher(VALORES);
  const passo = periodicidade === "mensal" ? 30 : periodicidade === "quinzenal" ? 15 : 7;

  // Quando foi liberado, para cair na situação desejada
  let diasAtras: number;
  if (cenario === "quitado") diasAtras = passo * qtd + entre(10, 60);
  else if (cenario === "novo") diasAtras = entre(1, 10);
  else if (cenario === "atrasado") diasAtras = passo * entre(1, Math.max(1, qtd - 1)) + entre(5, 140);
  else diasAtras = passo * entre(1, Math.max(1, qtd - 1)) + entre(1, passo - 2);

  let liberado = somarDias(REFERENCIA, -diasAtras);
  let primeiro = somarDias(liberado, passo);
  if (cenario === "vence_hoje") {
    // Encaixa uma parcela exatamente hoje
    const k = entre(1, qtd - 1);
    primeiro =
      periodicidade === "mensal" ? subtrairMeses(REFERENCIA, k) : somarDias(REFERENCIA, -passo * k);
    liberado = periodicidade === "mensal" ? subtrairMeses(primeiro, 1) : somarDias(primeiro, -passo);
  }

  const parcelas = montarParcelas({
    sistema,
    valorCentavos: valor,
    taxaMensal: taxaPercentual / 100,
    qtdParcelas: qtd,
    primeiroVencimento: primeiro,
    periodicidade,
  });

  const status = cenario === "quitado" ? "quitado" : cenario === "cancelado" ? "cancelado" : "ativo";
  linhas.push(
    `insert into emprestimos (id, cliente_id, valor_centavos, taxa_percentual, sistema, qtd_parcelas, periodicidade, liberado_em, primeiro_vencimento, status, observacoes) values (${texto(emprestimoId)}, ${texto(clienteId)}, ${valor}, ${taxaPercentual}, '${sistema}', ${qtd}, '${periodicidade}', ${sqlData(liberado)}, ${sqlData(primeiro)}, '${status}', ${texto(cenario === "cancelado" ? "Cancelado: cliente desistiu antes de receber." : "")});`,
  );

  const vencidas = parcelas.filter((p) => diasEntre(p.vencimento, REFERENCIA) > 0);
  // Nos atrasados, as últimas 1 a 3 parcelas vencidas ficam sem pagar
  const emAtraso = cenario === "atrasado" ? Math.min(vencidas.length, entre(1, 3)) : 0;

  parcelas.forEach((p, idx) => {
    const parcelaId = novoId();
    const venceu = diasEntre(p.vencimento, REFERENCIA) > 0;
    let statusParcela = "a_vencer";
    let pago = 0;
    let quitadaEm: string | null = null;

    const devePagar =
      cenario === "quitado" || (venceu && cenario !== "cancelado" && idx < vencidas.length - emAtraso);
    const parcial = cenario === "parcial" && venceu && idx === vencidas.length - 1;

    if (cenario === "cancelado") statusParcela = "cancelada";
    else if (parcial) {
      statusParcela = "paga_parcial";
      pago = Math.round(p.valor_centavos / 2);
    } else if (devePagar) {
      statusParcela = "paga";
      pago = p.valor_centavos;
      const atrasoDias = aleatorio() < 0.2 ? entre(1, 6) : 0;
      quitadaEm = somarDias(p.vencimento, atrasoDias > 0 ? atrasoDias : -entre(0, 2));
    }

    linhas.push(
      `insert into parcelas (id, emprestimo_id, numero, vencimento, valor_centavos, juros_centavos, amortizacao_centavos, saldo_devedor_centavos, pago_centavos, status, quitada_em) values (${texto(parcelaId)}, ${texto(emprestimoId)}, ${p.numero}, ${sqlData(p.vencimento)}, ${p.valor_centavos}, ${p.juros_centavos}, ${p.amortizacao_centavos}, ${p.saldo_devedor_centavos}, ${pago}, '${statusParcela}', ${quitadaEm ? sqlData(quitadaEm) : "null"});`,
    );

    if (pago > 0) {
      const dataPagamento = quitadaEm ?? somarDias(p.vencimento, 1);
      const atraso = atualizarAtraso(pago, diasEntre(p.vencimento, dataPagamento), 0.02, 0.01);
      pagamentos.push(
        `insert into pagamentos (id, parcela_id, valor_centavos, multa_centavos, mora_centavos, pago_em, forma) values (${texto(novoId())}, ${texto(parcelaId)}, ${pago}, ${atraso.multaCentavos}, ${atraso.moraCentavos}, ${sqlData(dataPagamento)}, '${escolher(["pix", "pix", "pix", "dinheiro", "transferencia"] as const)}');`,
      );
    }

    if (cenario === "atrasado" && venceu && statusParcela === "a_vencer" && aleatorio() < 0.7) {
      const resultado = escolher(["prometeu_pagar", "nao_atendeu", "negociando"] as const);
      const promessa = resultado === "prometeu_pagar" ? sqlData(somarDias(REFERENCIA, entre(-2, 5))) : "null";
      contatos.push(
        `insert into contatos_cobranca (id, cliente_id, parcela_id, tipo, resultado, promessa_para, observacoes, criado_em) values (${texto(novoId())}, ${texto(clienteId)}, ${texto(parcelaId)}, '${escolher(["whatsapp", "whatsapp", "ligacao", "visita"] as const)}', '${resultado}', ${promessa}, '', now() - interval '${entre(1, 6)} days');`,
      );
    }
  });
});

const sql = `-- DADOS DE EXEMPLO (fictícios) para testar o app MC Créditos.
-- Gerado por scripts/gerar-seed.ts. NÃO edite à mão.
--
-- Use só para experimentar. Para apagar tudo depois, rode supabase/limpar-exemplos.sql.
-- Nomes, CPFs e telefones são inventados (telefones na faixa (71) 90000-xxxx).

begin;

${linhas.join("\n")}

${pagamentos.join("\n")}

${contatos.join("\n")}

commit;
`;

writeFileSync(join(import.meta.dirname, "..", "supabase", "seed.sql"), sql);
console.log(
  `seed.sql: ${clientes.length} clientes, ${CENARIOS.length} empréstimos, ${pagamentos.length} pagamentos, ${contatos.length} contatos`,
);

import { describe, expect, it } from "vitest";

import {
  ehModeloPadrao,
  LINHA_EM_BRANCO,
  MODELO_PADRAO,
  modeloEmUso,
  montarVariaveis,
  preencherModelo,
  qualificacaoEmpresa,
  VARIAVEIS,
  type DadosContrato,
} from "./contrato";
import { gerarContratoPDF } from "./contrato-pdf";
import { inteiroPorExtenso, reaisPorExtenso } from "./extenso";
import { alocarRecebimento, encargosNaData, planoQuitacao, recebidoDoPagamento } from "./pagamentos";

describe("valor por extenso", () => {
  it.each([
    [1, "um"],
    [10, "dez"],
    [15, "quinze"],
    [21, "vinte e um"],
    [100, "cem"],
    [101, "cento e um"],
    [110, "cento e dez"],
    [344, "trezentos e quarenta e quatro"],
    [1000, "mil"],
    [1001, "mil e um"],
    [1100, "mil e cem"],
    [1250, "mil duzentos e cinquenta"],
    [1500, "mil e quinhentos"],
    [2065, "dois mil e sessenta e cinco"],
    [21000, "vinte e um mil"],
    [100000, "cem mil"],
    [1000000, "um milhão"],
    [2500300, "dois milhões quinhentos mil e trezentos"],
  ])("%i → %s", (n, texto) => {
    expect(inteiroPorExtenso(n)).toBe(texto);
  });

  it("reais e centavos", () => {
    expect(reaisPorExtenso(150000)).toBe("mil e quinhentos reais");
    expect(reaisPorExtenso(206585)).toBe("dois mil e sessenta e cinco reais e oitenta e cinco centavos");
    expect(reaisPorExtenso(100)).toBe("um real");
    expect(reaisPorExtenso(101)).toBe("um real e um centavo");
    expect(reaisPorExtenso(45)).toBe("quarenta e cinco centavos");
    expect(reaisPorExtenso(100000000)).toBe("um milhão de reais");
  });
});

const parcela = { id: "p1", numero: 1, vencimento: "2026-09-25", valor_centavos: 22961, pago_centavos: 0 };

describe("pagamento de parcela", () => {
  it("calcula multa e mora na data do pagamento", () => {
    expect(encargosNaData(parcela, "2026-10-05", 0.02, 0.01)).toEqual({
      emAbertoCentavos: 22961,
      diasAtraso: 10,
      multaCentavos: 459,
      moraCentavos: 77,
      devidoCentavos: 23497,
    });
    expect(encargosNaData(parcela, "2026-09-25", 0.02, 0.01).devidoCentavos).toBe(22961);
  });

  it("recebimento cobre primeiro multa e mora, depois a parcela", () => {
    const enc = encargosNaData(parcela, "2026-10-05", 0.02, 0.01);
    expect(alocarRecebimento(23497, enc, false)).toEqual({ ok: true, valor: 22961, multa: 459, mora: 77, parcial: false });
    expect(alocarRecebimento(10000, enc, false)).toEqual({ ok: true, valor: 9464, multa: 459, mora: 77, parcial: true });
    expect(alocarRecebimento(22961, enc, true)).toEqual({ ok: true, valor: 22961, multa: 0, mora: 0, parcial: false });
  });

  it("recusa receber mais que o devido ou menos que os encargos", () => {
    const enc = encargosNaData(parcela, "2026-10-05", 0.02, 0.01);
    expect(alocarRecebimento(23498, enc, false).ok).toBe(false);
    expect(alocarRecebimento(500, enc, false).ok).toBe(false);
    expect(alocarRecebimento(0, enc, false).ok).toBe(false);
  });

  it("parcela com pagamento parcial anterior cobra só o que falta", () => {
    const enc = encargosNaData({ ...parcela, pago_centavos: 20000 }, "2026-09-25", 0.02, 0.01);
    expect(enc.emAbertoCentavos).toBe(2961);
  });

  it("recebido = valor + multa + mora − desconto", () => {
    expect(recebidoDoPagamento({ valor_centavos: 22961, multa_centavos: 459, mora_centavos: 77, desconto_centavos: 0 })).toBe(23497);
    expect(recebidoDoPagamento({ valor_centavos: 22961, multa_centavos: 0, mora_centavos: 0, desconto_centavos: 1961 })).toBe(21000);
  });
});

describe("quitação antecipada", () => {
  // R$ 1.000 a 10% em 6x, parcela 1 paga; quitando 30 dias antes da 2ª
  const restantes = [22961, 22961, 22961, 22961, 22959].map((valor_centavos, i) => ({
    id: `p${i + 2}`,
    numero: i + 2,
    vencimento: ["2026-10-31", "2026-11-30", "2026-12-30", "2027-01-29", "2027-02-28"][i],
    valor_centavos,
    pago_centavos: 0,
  }));

  it("o total para quitar é o saldo devedor da tabela", () => {
    const plano = planoQuitacao(restantes, 0.1, "2026-10-01", 0.02, 0.01, false);
    expect(plano.emAbertoCentavos).toBe(114803);
    expect(plano.encargosCentavos).toBe(0);
    // cada parcela é arredondada separadamente: a soma pode diferir 1-2 centavos do saldo de 870,39
    expect(Math.abs(plano.totalCentavos - 87039)).toBeLessThanOrEqual(2);
    expect(plano.itens.map((i) => i.parcela_id)).toEqual(["p2", "p3", "p4", "p5", "p6"]);
  });

  it("parcela atrasada entra com multa e mora e sem desconto", () => {
    const plano = planoQuitacao([{ ...parcela }], 0.1, "2026-10-05", 0.02, 0.01, false);
    expect(plano.itens[0]).toMatchObject({ valor: 22961, multa: 459, mora: 77, desconto: 0 });
    expect(plano.totalCentavos).toBe(23497);
    expect(planoQuitacao([{ ...parcela }], 0.1, "2026-10-05", 0.02, 0.01, true).totalCentavos).toBe(22961);
  });
});

/** Cópia do modelo padrão publicado até a versão anterior (credor pessoa física). */
const MODELO_ANTIGO = `# CONTRATO DE EMPRÉSTIMO PESSOAL

**CREDOR:** {{credor.nome}}, inscrito no CPF/CNPJ sob o nº {{credor.documento}}, com endereço em {{credor.cidade}}, doravante chamado CREDOR.

**DEVEDOR:** {{cliente.nome}}, inscrito no CPF sob o nº {{cliente.cpf}}, residente em {{cliente.endereco}}, doravante chamado DEVEDOR.

As partes acima celebram este contrato de empréstimo de dinheiro (mútuo), que se rege pelas cláusulas a seguir.

## Cláusula 1ª – Do valor

O CREDOR empresta ao DEVEDOR a quantia de **{{valor}}** ({{valor_extenso}}), entregue em {{data_liberacao}}, da qual o DEVEDOR dá plena quitação ao assinar este contrato.

## Cláusula 2ª – Dos juros e das parcelas

Sobre o valor emprestado incidem juros de {{taxa}} ao mês, calculados pelo sistema {{sistema}}. O DEVEDOR pagará {{parcelas}} parcelas {{periodicidade}}, que somam **{{total}}** ({{total_extenso}}), com custo efetivo total (CET) de {{cet}} ao mês, nos valores e datas abaixo:

{{tabela_parcelas}}

## Cláusula 3ª – Da forma de pagamento

Os pagamentos serão feitos por PIX para a chave {{pix}}, em nome de {{credor.nome}}, ou em dinheiro mediante recibo.

## Cláusula 4ª – Do atraso

A parcela paga depois do vencimento terá multa de {{multa}} sobre o valor em atraso e juros de mora de {{mora}} ao mês, calculados por dia de atraso.

O atraso de qualquer parcela por mais de 30 dias permite ao CREDOR considerar vencidas as parcelas seguintes e cobrar de uma vez o saldo devedor, com os encargos acima.

## Cláusula 5ª – Da quitação antecipada

O DEVEDOR pode quitar o saldo a qualquer tempo, total ou parcialmente, com redução proporcional dos juros das parcelas que ainda não venceram (art. 52, § 2º, do Código de Defesa do Consumidor).

## Cláusula 6ª – Dos dados pessoais

O DEVEDOR autoriza o uso dos dados informados neste contrato apenas para a sua execução e cobrança, nos termos da Lei nº 13.709/2018 (LGPD).

## Cláusula 7ª – Do foro

Fica eleito o foro da comarca de {{credor.cidade}} para resolver qualquer questão deste contrato.

E, por estarem de acordo, as partes assinam este contrato em duas vias de igual teor, junto com duas testemunhas.

{{credor.cidade}}, {{data_extenso}}.

{{assinaturas}}
`;

const dados: DadosContrato = {
  empresa: {
    nome: "MC Créditos",
    cnpj: "11222333000181",
    razaoSocial: "Fulano de Tal",
    documento: "52998224725",
    cidade: "Salvador - BA",
    tipoChavePix: "telefone",
    chavePix: "+5571912345678",
    nomeRecebedorPix: "Fulano de Tal",
  },
  cliente: { nome: "Josiane Ferreira", cpf: "11144477735", endereco: "Rua Nova, 10 - Pituba, Salvador - BA" },
  emprestimo: {
    valorCentavos: 150000,
    taxaPercentual: 9.99,
    sistema: "price",
    periodicidade: "mensal",
    liberadoEm: "2026-10-05",
    multaPercentual: 2,
    moraPercentual: 1,
  },
  parcelas: [34431, 34431, 34431, 34431, 34431, 34430].map((valor_centavos, i) => ({
    numero: i + 1,
    vencimento: `2026-${String(11 + i).padStart(2, "0")}-05`.replace("2026-13", "2027-01").replace("2026-14", "2027-02").replace("2026-15", "2027-03").replace("2026-16", "2027-04"),
    valor_centavos,
  })),
  hoje: "2026-10-05",
};

describe("contrato", () => {
  it("preenche todas as variáveis do modelo padrão", () => {
    const vars = montarVariaveis(dados);
    const { blocos, desconhecidas } = preencherModelo(MODELO_PADRAO, vars);
    expect(desconhecidas).toEqual([]);
    const texto = blocos.map((b) => ("texto" in b ? b.texto : `<${b.tipo}>`)).join("\n");
    expect(texto).toContain("**R$ 1.500,00** (mil e quinhentos reais)");
    expect(texto).toContain("6 parcelas mensais");
    expect(texto).toContain("**R$ 2.065,85** (dois mil e sessenta e cinco reais e oitenta e cinco centavos)");
    expect(texto).toContain(
      "**CREDOR:** MC Créditos, inscrita no CNPJ sob o nº 11.222.333/0001-81, com sede em Salvador - BA, neste ato representada por Fulano de Tal, CPF nº 529.982.247-25, doravante chamada CREDOR.",
    );
    expect(texto).toContain("chave (71) 91234-5678, em nome de Fulano de Tal,");
    expect(texto).toContain("chave (71) 91234-5678");
    expect(texto).toContain("Salvador - BA, 5 de outubro de 2026.");
    expect(blocos.filter((b) => b.tipo === "tabela_parcelas")).toHaveLength(1);
    expect(blocos.filter((b) => b.tipo === "assinaturas")).toHaveLength(1);
  });

  it("toda variável documentada existe", () => {
    const vars = montarVariaveis(dados);
    for (const [nome] of VARIAVEIS) {
      if (nome === "tabela_parcelas" || nome === "assinaturas") continue;
      expect(vars, nome).toHaveProperty([nome]);
    }
  });

  it("sem CNPJ, deixa a linha em branco para preencher à mão", () => {
    const semCnpj = { ...dados, empresa: { ...dados.empresa, cnpj: "" } };
    const vars = montarVariaveis(semCnpj);
    expect(vars["empresa.cnpj"]).toBe(LINHA_EM_BRANCO);
    expect(vars["credor.documento"]).toBe(LINHA_EM_BRANCO);
    expect(LINHA_EM_BRANCO).toMatch(/^_{20,}$/);
    const texto = preencherModelo(MODELO_PADRAO, vars)
      .blocos.map((b) => ("texto" in b ? b.texto : ""))
      .join("\n");
    expect(texto).toContain(`MC Créditos, inscrita no CNPJ sob o nº ${LINHA_EM_BRANCO}, com sede em Salvador - BA, neste ato representada por Fulano de Tal`);
  });

  it("sem responsável, omite a representação", () => {
    const empresa = { ...dados.empresa, razaoSocial: "  " };
    expect(qualificacaoEmpresa(empresa)).toBe("MC Créditos, inscrita no CNPJ sob o nº 11.222.333/0001-81, com sede em Salvador - BA");
    // Titular do PIX vazio cai para o responsável e, sem ele, para a empresa
    expect(montarVariaveis({ ...dados, empresa: { ...empresa, nomeRecebedorPix: "" } })["pix.titular"]).toBe("MC Créditos");
  });

  it("CPF do representante só entra quando é um CPF", () => {
    const empresa = { ...dados.empresa, documento: "11222333000181" };
    expect(qualificacaoEmpresa(empresa)).toBe(
      "MC Créditos, inscrita no CNPJ sob o nº 11.222.333/0001-81, com sede em Salvador - BA, neste ato representada por Fulano de Tal",
    );
  });

  it("credor é a empresa, também em modelos antigos que usam credor.*", () => {
    const vars = montarVariaveis(dados);
    expect(vars["credor.nome"]).toBe("MC Créditos");
    expect(vars["empresa.nome"]).toBe("MC Créditos");
    expect(vars["credor.documento"]).toBe("11.222.333/0001-81");
    expect(vars["empresa.cnpj"]).toBe("11.222.333/0001-81");
    expect(vars["responsavel.nome"]).toBe("Fulano de Tal");
    expect(vars["responsavel.documento"]).toBe("529.982.247-25");
  });

  it("modelo salvo igual ao padrão antigo passa a usar o novo; personalizado fica como está", () => {
    const antigo = MODELO_ANTIGO.replace(/\n/g, "\r\n");
    expect(ehModeloPadrao(antigo)).toBe(true);
    expect(modeloEmUso(antigo)).toBe(MODELO_PADRAO);
    expect(ehModeloPadrao("")).toBe(true);
    expect(ehModeloPadrao(`  ${MODELO_PADRAO}  `)).toBe(true);
    const personalizado = MODELO_ANTIGO.replace("Cláusula 7ª – Do foro", "Cláusula 7ª – Do foro escolhido");
    expect(ehModeloPadrao(personalizado)).toBe(false);
    expect(modeloEmUso(personalizado)).toBe(personalizado.trim());
    // O texto do dono continua igual, mas o credor dele agora é a empresa
    const texto = preencherModelo(personalizado, montarVariaveis(dados))
      .blocos.map((b) => ("texto" in b ? b.texto : ""))
      .join("\n");
    expect(texto).toContain("**CREDOR:** MC Créditos, inscrito no CPF/CNPJ sob o nº 11.222.333/0001-81, com endereço em Salvador - BA");
  });

  it("empréstimo normal: cláusula 1 diz que o valor foi entregue e o parágrafo da renegociação some", () => {
    const { blocos } = preencherModelo(MODELO_PADRAO, montarVariaveis(dados));
    const textos = blocos.map((b) => ("texto" in b ? b.texto : ""));
    expect(textos).toContain(
      "O CREDOR empresta ao DEVEDOR a quantia de **R$ 1.500,00** (mil e quinhentos reais), entregue em 05/10/2026, da qual o DEVEDOR dá plena quitação ao assinar este contrato.",
    );
    expect(textos.some((t) => t.includes("substitui"))).toBe(false);
    expect(blocos.some((b) => "texto" in b && b.texto.trim() === "")).toBe(false);
  });

  it("renegociação: cláusula 1 explica saldo anterior e dinheiro novo", () => {
    const reneg: DadosContrato = {
      ...dados,
      emprestimo: { ...dados.emprestimo, valorCentavos: 100000, taxaPercentual: 12.978, liberadoEm: "2026-11-12" },
      renegociacao: { contratoAnteriorEm: "2026-06-20", saldoAnteriorCentavos: 50000, dinheiroNovoCentavos: 50000 },
    };
    const { blocos, desconhecidas } = preencherModelo(MODELO_PADRAO, montarVariaveis(reneg));
    expect(desconhecidas).toEqual([]);
    const textos = blocos.map((b) => ("texto" in b ? b.texto : ""));
    expect(textos).toContain(
      "O CREDOR empresta ao DEVEDOR a quantia de **R$ 1.000,00** (mil reais), formada pelo saldo do contrato anterior e pelo valor novo, como descrito no parágrafo abaixo.",
    );
    expect(textos).toContain(
      "Este contrato substitui o contrato de 20/06/2026, que fica encerrado. O valor de R$ 1.000,00 corresponde ao saldo anterior de R$ 500,00, que o DEVEDOR reconhece como devido, somado a R$ 500,00 (quinhentos reais) entregues ao DEVEDOR em 12/11/2026, dos quais ele dá plena quitação ao assinar este contrato.",
    );
    // Sem dinheiro novo
    const semNovo = montarVariaveis({ ...reneg, renegociacao: { contratoAnteriorEm: "2026-06-20", saldoAnteriorCentavos: 100000, dinheiroNovoCentavos: 0 } });
    expect(semNovo.renegociacao).toBe(
      "Este contrato substitui o contrato de 20/06/2026, que fica encerrado. O valor de R$ 1.000,00 corresponde ao saldo anterior, que o DEVEDOR reconhece como devido; nenhum valor novo foi entregue.",
    );
    expect(montarVariaveis(dados).renegociacao).toBe("");
  });

  it("modelo salvo igual ao padrão de antes da renegociação passa a usar o novo", () => {
    const anterior = MODELO_PADRAO.replace(
      "{{entrega}}.\n\n{{renegociacao}}\n",
      "entregue em {{data_liberacao}}, da qual o DEVEDOR dá plena quitação ao assinar este contrato.\n",
    );
    expect(anterior).not.toBe(MODELO_PADRAO);
    expect(ehModeloPadrao(anterior)).toBe(true);
    expect(modeloEmUso(anterior)).toBe(MODELO_PADRAO);
    expect(modeloEmUso(`${anterior}\nCláusula extra do dono.`)).not.toBe(MODELO_PADRAO);
  });

  it("aponta variável digitada errado", () => {
    expect(preencherModelo("Olá {{cliente.nme}}", montarVariaveis(dados)).desconhecidas).toEqual(["cliente.nme"]);
  });

  it("gera um PDF válido", async () => {
    const { blocos } = preencherModelo(MODELO_PADRAO, montarVariaveis(dados));
    const pdf = await gerarContratoPDF(blocos, dados);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });
});

import {
  arredondar,
  totalizar,
  validarEntrada,
  type Cronograma,
  type LinhaCronograma,
  type Sistema,
} from "./tipos";

/** Valor da parcela fixa da Tabela Price, sem arredondar. */
export function parcelaPrice(principal: number, taxa: number, parcelas: number): number {
  if (taxa === 0) return principal / parcelas;
  return (principal * taxa) / (1 - (1 + taxa) ** -parcelas);
}

/**
 * Tabela Price: parcela fixa. Juros de cada mês sobre o saldo devedor.
 * A última parcela absorve a sobra do arredondamento para o saldo fechar em zero.
 *
 * @param taxa taxa por período em decimal (10% = 0.1)
 */
export function tabelaPrice(principalCentavos: number, taxa: number, parcelas: number): Cronograma {
  validarEntrada(principalCentavos, taxa, parcelas);
  const parcela = arredondar(parcelaPrice(principalCentavos, taxa, parcelas));
  const linhas: LinhaCronograma[] = [];
  let saldo = principalCentavos;

  for (let numero = 1; numero <= parcelas; numero++) {
    const juros = arredondar(saldo * taxa);
    const ultima = numero === parcelas;
    const amortizacao = ultima ? saldo : Math.min(parcela - juros, saldo);
    saldo -= amortizacao;
    linhas.push({
      numero,
      valorCentavos: amortizacao + juros,
      jurosCentavos: juros,
      amortizacaoCentavos: amortizacao,
      saldoCentavos: saldo,
    });
  }
  return totalizar(linhas);
}

/** SAC: amortização constante, juros sobre o saldo, parcelas decrescentes. */
export function tabelaSAC(principalCentavos: number, taxa: number, parcelas: number): Cronograma {
  validarEntrada(principalCentavos, taxa, parcelas);
  const amortizacaoBase = Math.floor(principalCentavos / parcelas);
  const linhas: LinhaCronograma[] = [];
  let saldo = principalCentavos;

  for (let numero = 1; numero <= parcelas; numero++) {
    const juros = arredondar(saldo * taxa);
    const amortizacao = numero === parcelas ? saldo : amortizacaoBase;
    saldo -= amortizacao;
    linhas.push({
      numero,
      valorCentavos: amortizacao + juros,
      jurosCentavos: juros,
      amortizacaoCentavos: amortizacao,
      saldoCentavos: saldo,
    });
  }
  return totalizar(linhas);
}

/**
 * Juros simples: juros calculados sempre sobre o valor emprestado
 * (total de juros = valor × taxa × parcelas), divididos em parcelas iguais.
 * Centavos que sobram da divisão vão para a última parcela.
 */
export function tabelaJurosSimples(
  principalCentavos: number,
  taxa: number,
  parcelas: number,
): Cronograma {
  validarEntrada(principalCentavos, taxa, parcelas);
  const jurosTotal = arredondar(principalCentavos * taxa * parcelas);
  const jurosBase = Math.floor(jurosTotal / parcelas);
  const amortizacaoBase = Math.floor(principalCentavos / parcelas);
  const linhas: LinhaCronograma[] = [];
  let saldo = principalCentavos;
  let jurosRestante = jurosTotal;

  for (let numero = 1; numero <= parcelas; numero++) {
    const ultima = numero === parcelas;
    const juros = ultima ? jurosRestante : jurosBase;
    const amortizacao = ultima ? saldo : amortizacaoBase;
    saldo -= amortizacao;
    jurosRestante -= juros;
    linhas.push({
      numero,
      valorCentavos: amortizacao + juros,
      jurosCentavos: juros,
      amortizacaoCentavos: amortizacao,
      saldoCentavos: saldo,
    });
  }
  return totalizar(linhas);
}

export function gerarCronograma(
  sistema: Sistema,
  principalCentavos: number,
  taxa: number,
  parcelas: number,
): Cronograma {
  switch (sistema) {
    case "price":
      return tabelaPrice(principalCentavos, taxa, parcelas);
    case "sac":
      return tabelaSAC(principalCentavos, taxa, parcelas);
    case "simples":
      return tabelaJurosSimples(principalCentavos, taxa, parcelas);
  }
}

/** Juros compostos sem parcelas: quanto um valor vira depois de n períodos. */
export function montanteComposto(principalCentavos: number, taxa: number, periodos: number) {
  validarEntrada(principalCentavos, taxa, Math.max(1, periodos));
  const montante = arredondar(principalCentavos * (1 + taxa) ** periodos);
  return { montanteCentavos: montante, jurosCentavos: montante - principalCentavos };
}

/** Juros simples sem parcelas: valor × taxa × períodos. */
export function montanteSimples(principalCentavos: number, taxa: number, periodos: number) {
  validarEntrada(principalCentavos, taxa, Math.max(1, periodos));
  const juros = arredondar(principalCentavos * taxa * periodos);
  return { montanteCentavos: principalCentavos + juros, jurosCentavos: juros };
}

"use client";

import { BotaoEnviar, Campo, Entrada, useAcaoSemReset, MensagemForm, Selecao } from "@/components/app/form";
import { NOME_TIPO_CHAVE, type TipoChavePix } from "@/lib/pix";

import { salvarConfiguracoes } from "./actions";

export type ConfigInicial = {
  nome_empresa: string;
  razao_social: string;
  documento_empresa: string;
  cidade: string;
  tipo_chave_pix: string;
  chave_pix: string;
  nome_recebedor_pix: string;
  multa_percentual: string;
  mora_percentual_mes: string;
  cobranca_hora_inicio: string;
  cobranca_hora_fim: string;
  limite_contratos_ativos: string;
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-2xl border bg-card p-4">
      <legend className="px-1 text-lg font-extrabold">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function ConfigForm({ inicial }: { inicial: ConfigInicial }) {
  const { estado, aoEnviar, enviando } = useAcaoSemReset(salvarConfiguracoes);
  const v = (campo: keyof ConfigInicial) => estado.valores[campo] ?? inicial[campo];
  const e = estado.erros;

  return (
    // A chave muda a cada envio com erro: o formulário remonta com o que foi digitado
    <form onSubmit={aoEnviar} className="grid gap-5" noValidate>
      <Secao titulo="Empresa">
        <Campo id="nome_empresa" rotulo="Nome da empresa" erro={e.nome_empresa}>
          <Entrada id="nome_empresa" name="nome_empresa" defaultValue={v("nome_empresa")} erro={e.nome_empresa} />
        </Campo>
        <Campo id="razao_social" rotulo="Nome completo do responsável ou razão social" erro={e.razao_social} dica="Aparece no contrato como credor.">
          <Entrada id="razao_social" name="razao_social" defaultValue={v("razao_social")} erro={e.razao_social} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="documento_empresa" rotulo="CPF ou CNPJ" erro={e.documento_empresa}>
            <Entrada id="documento_empresa" name="documento_empresa" inputMode="numeric" defaultValue={v("documento_empresa")} erro={e.documento_empresa} />
          </Campo>
          <Campo id="cidade" rotulo="Cidade" erro={e.cidade} dica="Ex.: Salvador - BA">
            <Entrada id="cidade" name="cidade" defaultValue={v("cidade")} erro={e.cidade} />
          </Campo>
        </div>
      </Secao>

      <Secao titulo="PIX para receber">
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <Campo id="tipo_chave_pix" rotulo="Tipo da chave" erro={e.tipo_chave_pix}>
            <Selecao id="tipo_chave_pix" name="tipo_chave_pix" defaultValue={v("tipo_chave_pix")} erro={e.tipo_chave_pix}>
              <option value="">Escolha…</option>
              {(Object.keys(NOME_TIPO_CHAVE) as TipoChavePix[]).map((t) => (
                <option key={t} value={t}>
                  {NOME_TIPO_CHAVE[t]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo id="chave_pix" rotulo="Chave" erro={e.chave_pix} dica="Celular com DDD, ex.: (71) 91234-5678">
            <Entrada id="chave_pix" name="chave_pix" defaultValue={v("chave_pix")} erro={e.chave_pix} />
          </Campo>
        </div>
        <Campo id="nome_recebedor_pix" rotulo="Nome do titular da chave" erro={e.nome_recebedor_pix} dica="Se ficar vazio, usa o nome do responsável.">
          <Entrada id="nome_recebedor_pix" name="nome_recebedor_pix" defaultValue={v("nome_recebedor_pix")} erro={e.nome_recebedor_pix} />
        </Campo>
      </Secao>

      <Secao titulo="Atraso e cobrança">
        <div className="grid grid-cols-2 gap-4">
          <Campo id="multa_percentual" rotulo="Multa por atraso (%)" erro={e.multa_percentual} dica="Limite legal: 2%">
            <Entrada id="multa_percentual" name="multa_percentual" inputMode="decimal" defaultValue={v("multa_percentual")} erro={e.multa_percentual} />
          </Campo>
          <Campo id="mora_percentual_mes" rotulo="Mora ao mês (%)" erro={e.mora_percentual_mes} dica="Cobrada por dia de atraso">
            <Entrada id="mora_percentual_mes" name="mora_percentual_mes" inputMode="decimal" defaultValue={v("mora_percentual_mes")} erro={e.mora_percentual_mes} />
          </Campo>
          <Campo id="cobranca_hora_inicio" rotulo="Cobrar a partir de" erro={e.cobranca_hora_inicio}>
            <Entrada id="cobranca_hora_inicio" name="cobranca_hora_inicio" type="time" defaultValue={v("cobranca_hora_inicio")} erro={e.cobranca_hora_inicio} />
          </Campo>
          <Campo id="cobranca_hora_fim" rotulo="Até" erro={e.cobranca_hora_fim}>
            <Entrada id="cobranca_hora_fim" name="cobranca_hora_fim" type="time" defaultValue={v("cobranca_hora_fim")} erro={e.cobranca_hora_fim} />
          </Campo>
        </div>
        <Campo id="limite_contratos_ativos" rotulo="Limite de contratos ativos" erro={e.limite_contratos_ativos}>
          <Entrada id="limite_contratos_ativos" name="limite_contratos_ativos" inputMode="numeric" defaultValue={v("limite_contratos_ativos")} erro={e.limite_contratos_ativos} />
        </Campo>
      </Secao>

      <MensagemForm estado={estado} />
      <BotaoEnviar pendente={enviando}>Salvar configurações</BotaoEnviar>
    </form>
  );
}

"use client";

import { useState } from "react";

import { CampoArquivo, useAcaoComArquivo } from "@/components/app/arquivo";
import { AreaTexto, Campo, Entrada, MensagemForm, Selecao } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import { centavosParaTexto, formatCentavos, formatData, formatPercentual, parseReaisParaCentavos } from "@/lib/format";
import { alocarRecebimento, detalheAtraso, encargosNaData, type ParcelaAberta } from "@/lib/pagamentos";

import { registrarPagamento } from "../../pagamentos-actions";

type Props = {
  emprestimoId: string;
  parcela: ParcelaAberta;
  totalParcelas: number;
  hoje: string;
  /** Juros de atraso por dia, em decimal (1% = 0.01) */
  jurosDiario: number;
};

export function ReceberForm({ emprestimoId, parcela, totalParcelas, hoje, jurosDiario }: Props) {
  const { estado, aoEnviar, enviando } = useAcaoComArquivo(registrarPagamento);
  const [data, setData] = useState(hoje);
  const [dispensar, setDispensar] = useState(false);
  const [recebidoEditado, setRecebidoEditado] = useState<string | null>(null);

  const encargos = encargosNaData(parcela, data || hoje, jurosDiario);
  const devido = dispensar ? encargos.emAbertoCentavos : encargos.devidoCentavos;
  const recebidoTexto = recebidoEditado ?? centavosParaTexto(devido);
  const recebido = parseReaisParaCentavos(recebidoTexto) ?? 0;
  const alocacao = alocarRecebimento(recebido, encargos, dispensar);
  const e = estado.erros;

  return (
    <form onSubmit={aoEnviar} className="grid gap-5" noValidate>
      <input type="hidden" name="emprestimo_id" value={emprestimoId} />
      <input type="hidden" name="parcela_id" value={parcela.id} />

      <section className="grid gap-2 rounded-2xl bg-brand-deep p-5 text-white">
        <p className="text-sm font-bold text-white/75">
          Parcela {parcela.numero} de {totalParcelas} · vence {formatData(parcela.vencimento)}
        </p>
        <p className="num font-heading text-3xl font-black">{formatCentavos(devido)}</p>
        {encargos.diasAtraso > 0 && !dispensar && (
          <p className="num -mt-1 text-sm text-white/80">
            {detalheAtraso({
              valorCentavos: encargos.emAbertoCentavos,
              jurosCentavos: encargos.jurosCentavos,
              diasAtraso: encargos.diasAtraso,
              pagoEmParte: parcela.pago_centavos > 0,
            })}
          </p>
        )}
        <dl className="num grid gap-1 border-t border-white/15 pt-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-white/80">{parcela.pago_centavos > 0 ? "Falta da parcela (já pago em parte)" : "Valor da parcela"}</dt>
            <dd className="font-bold text-[#f0d45a]">{formatCentavos(encargos.emAbertoCentavos)}</dd>
          </div>
          {encargos.diasAtraso > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-white/80">
                Juros de atraso ({formatPercentual(jurosDiario, 3)} ao dia × {encargos.diasAtraso} {encargos.diasAtraso === 1 ? "dia" : "dias"})
              </dt>
              <dd className={`font-bold whitespace-nowrap ${dispensar ? "text-white/50 line-through" : "text-[#f0d45a]"}`}>
                {formatCentavos(encargos.jurosCentavos)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Campo id="pago_em" rotulo="Data do pagamento" erro={e.pago_em}>
          <Entrada
            id="pago_em"
            name="pago_em"
            type="date"
            max={hoje}
            value={data}
            onChange={(ev) => {
              setData(ev.target.value);
              setRecebidoEditado(null);
            }}
            erro={e.pago_em}
          />
        </Campo>
        <Campo id="forma" rotulo="Forma" erro={e.forma}>
          <Selecao id="forma" name="forma" defaultValue={estado.valores.forma ?? "pix"} erro={e.forma}>
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
            <option value="outro">Outro</option>
          </Selecao>
        </Campo>
      </div>

      {encargos.diasAtraso > 0 && (
        <label className="flex items-start gap-3 rounded-xl border bg-card p-3">
          <input
            type="checkbox"
            name="dispensar"
            checked={dispensar}
            onChange={(ev) => {
              setDispensar(ev.target.checked);
              setRecebidoEditado(null);
            }}
            className="mt-1 size-5 accent-primary"
          />
          <span className="text-sm">Dispensar os juros de atraso desta vez</span>
        </label>
      )}

      <Campo
        id="recebido"
        rotulo="Valor recebido (R$)"
        erro={e.recebido ?? (recebidoEditado !== null && !alocacao.ok ? alocacao.erro : undefined)}
        dica={
          alocacao.ok && alocacao.parcial
            ? `Pagamento parcial: ficam faltando ${formatCentavos(encargos.emAbertoCentavos - alocacao.valor)} nesta parcela.`
            : "Pode receber menos que o total: vira pagamento parcial."
        }
      >
        <Entrada id="recebido" name="recebido" inputMode="decimal" value={recebidoTexto} onChange={(ev) => setRecebidoEditado(ev.target.value)} erro={e.recebido} />
      </Campo>

      <CampoArquivo rotulo="Comprovante (opcional)" erro={e.arquivo} />

      <Campo id="observacoes" rotulo="Observação (opcional)">
        <AreaTexto id="observacoes" name="observacoes" defaultValue={estado.valores.observacoes ?? ""} className="min-h-16" />
      </Campo>

      <MensagemForm estado={estado} />
      <Button type="submit" disabled={enviando || !alocacao.ok} className="h-12 text-base font-bold">
        {enviando ? "Registrando…" : `Registrar ${alocacao.ok && alocacao.parcial ? "pagamento parcial" : "pagamento"}`}
      </Button>
    </form>
  );
}

"use client";

import { Copy, HandCoins, MessageCircle, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AreaTexto, BotaoEnviar, Campo, Entrada, ESTADO_INICIAL, useAcaoSemReset, MensagemForm, Selecao } from "@/components/app/form";
import { Selo } from "@/components/app/selo";
import { buttonVariants } from "@/components/ui/button";
import { NOME_RESULTADO, NOME_TIPO_CONTATO, type ItemCobranca } from "@/lib/cobranca";
import { formatCentavos, formatData, linkWhatsApp } from "@/lib/format";
import { cn } from "cn";

import { registrarContato } from "./actions";

type Props = {
  item: ItemCobranca;
  mensagem: string;
  chavePix: string;
  noHorario: boolean;
  horario: string;
  hoje: string;
};

export function CartaoCobranca({ item, mensagem, chavePix, noHorario, horario, hoje }: Props) {
  const [contatoAberto, setContatoAberto] = useState(false);
  const whatsapp = item.cliente.whatsapp ? linkWhatsApp(item.cliente.whatsapp, mensagem) : null;

  async function copiarChave() {
    if (!chavePix) {
      toast.error("Cadastre a chave PIX nas Configurações.");
      return;
    }
    try {
      await navigator.clipboard.writeText(chavePix);
      toast.success("Chave PIX copiada");
    } catch {
      toast.error(`Não deu para copiar. A chave é ${chavePix}`);
    }
  }

  const selo =
    item.grupo === "atrasada" ? (
      <Selo tom="atraso">
        {item.diasRelativos} {item.diasRelativos === 1 ? "dia" : "dias"} de atraso
      </Selo>
    ) : item.grupo === "hoje" ? (
      <Selo tom="hoje">Vence hoje</Selo>
    ) : (
      <Selo tom="neutro">Vence {formatData(item.parcela.vencimento).slice(0, 5)}</Selo>
    );

  return (
    <article className="grid gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/clientes/${item.cliente.id}`} className="font-bold break-words hover:underline">
            {item.cliente.nome}
          </Link>
          <p className="num text-sm text-muted-foreground">
            Parcela {item.parcela.numero} de {item.totalParcelas} · venc. {formatData(item.parcela.vencimento)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num font-heading text-xl font-black whitespace-nowrap">{formatCentavos(item.devidoCentavos)}</p>
          {item.devidoCentavos > item.emAbertoCentavos && (
            <p className="num text-xs whitespace-nowrap text-muted-foreground">parcela {formatCentavos(item.emAbertoCentavos)}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selo}
        {item.parcela.status === "paga_parcial" && <Selo tom="info">Pago em parte</Selo>}
        {item.promessa && (
          <Selo tom={item.promessaVencida ? "hoje" : "ok"}>
            {item.promessa === hoje ? "Prometeu para hoje" : item.promessaVencida ? `Promessa de ${formatData(item.promessa).slice(0, 5)} não cumprida` : `Prometeu para ${formatData(item.promessa).slice(0, 5)}`}
          </Selo>
        )}
      </div>

      {item.ultimoContato && (
        <p className="text-xs text-muted-foreground">
          Último contato: {NOME_TIPO_CONTATO[item.ultimoContato.tipo]} em {formatData(item.ultimoContato.criado_em.slice(0, 10))},{" "}
          {NOME_RESULTADO[item.ultimoContato.resultado].toLowerCase()}
          {item.ultimoContato.observacoes && ` · ${item.ultimoContato.observacoes}`}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {whatsapp && noHorario ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            onClick={() => setContatoAberto(true)}
            className={buttonVariants({ className: "h-12 flex-col gap-0 text-xs font-bold" })}
          >
            <MessageCircle aria-hidden /> WhatsApp
          </a>
        ) : (
          <span
            title={!whatsapp ? "Cliente sem WhatsApp cadastrado" : `Fora do horário de cobrança (${horario})`}
            className={buttonVariants({ className: "pointer-events-none h-12 flex-col gap-0 text-xs font-bold opacity-45" })}
          >
            <MessageCircle aria-hidden /> {!whatsapp ? "Sem número" : "Fora do horário"}
          </span>
        )}
        <button type="button" onClick={copiarChave} className={buttonVariants({ variant: "outline", className: "h-12 flex-col gap-0 border-gold text-xs font-bold text-gold-ink" })}>
          <Copy aria-hidden /> Chave PIX
        </button>
        <button
          type="button"
          onClick={() => setContatoAberto((a) => !a)}
          aria-expanded={contatoAberto}
          className={buttonVariants({ variant: "secondary", className: "h-12 flex-col gap-0 text-xs font-bold" })}
        >
          <NotebookPen aria-hidden /> Contato
        </button>
      </div>

      {contatoAberto && <ContatoForm item={item} hoje={hoje} setAberto={setContatoAberto} />}

      <div className="flex justify-between gap-3 text-sm font-bold">
        <Link href={`/emprestimos/${item.emprestimoId}`} className="text-muted-foreground hover:text-foreground">
          Ver empréstimo
        </Link>
        <Link href={`/emprestimos/${item.emprestimoId}/receber?parcela=${item.parcela.id}`} className="flex items-center gap-1 text-primary">
          <HandCoins className="size-4" aria-hidden /> Receber
        </Link>
      </div>
    </article>
  );
}

function ContatoForm({ item, hoje, setAberto }: { item: ItemCobranca; hoje: string; setAberto: (aberto: boolean) => void }) {
  const { estado, aoEnviar, enviando } = useAcaoSemReset(registrarContato);
  const [resultado, setResultado] = useState(estado.valores.resultado ?? "");

  useEffect(() => {
    if (estado.ok) {
      toast.success("Contato registrado");
      setAberto(false);
    }
  }, [estado, setAberto]);

  const id = item.parcela.id;
  return (
    <form onSubmit={aoEnviar} className="grid gap-3 rounded-xl bg-muted/60 p-3">
      <input type="hidden" name="cliente_id" value={item.cliente.id} />
      <input type="hidden" name="parcela_id" value={item.parcela.id} />
      <div className="grid grid-cols-2 gap-3">
        <Campo id={`tipo-${id}`} rotulo="Como">
          <Selecao id={`tipo-${id}`} name="tipo" defaultValue="whatsapp">
            <option value="whatsapp">WhatsApp</option>
            <option value="ligacao">Ligação</option>
            <option value="visita">Visita</option>
            <option value="outro">Outro</option>
          </Selecao>
        </Campo>
        <Campo id={`resultado-${id}`} rotulo="O que aconteceu" erro={estado.erros.resultado}>
          <Selecao id={`resultado-${id}`} name="resultado" value={resultado} onChange={(e) => setResultado(e.target.value)} erro={estado.erros.resultado}>
            <option value="">Escolha…</option>
            {Object.entries(NOME_RESULTADO).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>
      <div className={cn("grid gap-3", resultado === "prometeu_pagar" ? "" : "hidden")}>
        <Campo id={`promessa-${id}`} rotulo="Prometeu pagar em" erro={estado.erros.promessa_para}>
          <Entrada id={`promessa-${id}`} name="promessa_para" type="date" min={hoje} defaultValue={estado.valores.promessa_para ?? ""} erro={estado.erros.promessa_para} />
        </Campo>
      </div>
      <Campo id={`obs-${id}`} rotulo="Observação (opcional)">
        <AreaTexto id={`obs-${id}`} name="observacoes" defaultValue={estado.valores.observacoes ?? ""} className="min-h-14" />
      </Campo>
      <MensagemForm estado={estado.ok ? ESTADO_INICIAL : estado} />
      <BotaoEnviar pendente={enviando} className="h-11">Salvar contato</BotaoEnviar>
    </form>
  );
}

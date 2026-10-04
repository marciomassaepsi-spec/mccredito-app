import { MapPinned } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { dentroDoHorario, escolherModelo, montarFila, preencherMensagem, variaveisDoItem } from "@/lib/cobranca";
import { formatCentavos, formatDataExtenso, hojeISO, somarDiasISO } from "@/lib/format";
import { exibirChavePix } from "@/lib/pix";
import { requireUser } from "@/lib/supabase/server";

import { Fila } from "./fila";

export const metadata: Metadata = { title: "Cobrança" };

export default async function CobrancaPage() {
  const { supabase } = await requireUser();
  const hoje = hojeISO();
  const desde = somarDiasISO(hoje, -90);

  const [{ data: emprestimos, error }, { data: contatos }, { data: modelos }, { data: config }] = await Promise.all([
    supabase
      .from("emprestimos")
      .select("id, clientes(id, nome, whatsapp, endereco), parcelas(id, numero, vencimento, valor_centavos, pago_centavos, status, quitada_em)")
      .eq("status", "ativo"),
    supabase
      .from("contatos_cobranca")
      .select("cliente_id, parcela_id, tipo, resultado, promessa_para, observacoes, criado_em")
      .gte("criado_em", desde),
    supabase.from("modelos_mensagem").select("dias_relativos, titulo, texto, ativo"),
    supabase
      .from("configuracoes")
      .select("nome_empresa, tipo_chave_pix, chave_pix, multa_percentual, mora_percentual_mes, cobranca_hora_inicio, cobranca_hora_fim")
      .maybeSingle(),
  ]);

  const multa = Number(config?.multa_percentual ?? 2) / 100;
  const mora = Number(config?.mora_percentual_mes ?? 1) / 100;
  const chavePix = config?.chave_pix ? exibirChavePix(config.tipo_chave_pix, config.chave_pix) : "";
  const fila = montarFila(emprestimos ?? [], contatos ?? [], hoje, multa, mora);

  const comMensagem = fila.map((item) => {
    const modelo = escolherModelo(modelos ?? [], item.diasRelativos);
    const vars = variaveisDoItem(item, { nome: config?.nome_empresa ?? "MC Créditos", pix: chavePix });
    return { item, mensagem: modelo ? preencherMensagem(modelo.texto, vars).texto : "" };
  });

  const atrasadas = comMensagem.filter((x) => x.item.grupo === "atrasada");
  const deHoje = comMensagem.filter((x) => x.item.grupo === "hoje");
  const proximas = comMensagem.filter((x) => x.item.grupo === "proximos");
  const promessas = comMensagem.filter((x) => x.item.promessaVencida);
  const soma = (l: typeof comMensagem) => l.reduce((s, x) => s + x.item.devidoCentavos, 0);

  const inicio = config?.cobranca_hora_inicio ?? "08:00";
  const fim = config?.cobranca_hora_fim ?? "20:00";

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-bold text-gold-ink">{formatDataExtenso()}</p>
        <h1 className="text-3xl font-black italic text-brand-deep">Cobrança de hoje</h1>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-late-soft p-3 text-late">
          <p className="text-xs font-bold">Atrasadas</p>
          <p className="num font-heading text-2xl font-black">{atrasadas.length}</p>
          <p className="num text-xs font-semibold">{formatCentavos(soma(atrasadas))}</p>
        </div>
        <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
          <p className="text-xs font-bold">Vencem hoje</p>
          <p className="num font-heading text-2xl font-black">{deHoje.length}</p>
          <p className="num text-xs font-semibold">{formatCentavos(soma(deHoje))}</p>
        </div>
        <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
          <p className="text-xs font-bold">Próx. 7 dias</p>
          <p className="num font-heading text-2xl font-black">{proximas.length}</p>
          <p className="num text-xs font-semibold">{formatCentavos(soma(proximas))}</p>
        </div>
      </section>

      {atrasadas.some((x) => x.item.cliente.endereco) && (
        <Link href="/cobranca/visitas" className={buttonVariants({ variant: "outline", className: "h-12 border-input bg-card font-bold" })}>
          <MapPinned aria-hidden /> Visitas do dia
        </Link>
      )}

      {error && <p className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">Não foi possível carregar a cobrança.</p>}

      {!error && fila.length === 0 && (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-10 text-center text-muted-foreground">
          Nada para cobrar hoje nem nos próximos 7 dias.
        </p>
      )}

      {!config?.chave_pix && fila.length > 0 && (
        <p className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
          Cadastre sua chave PIX nas{" "}
          <Link href="/configuracoes" className="underline">
            Configurações
          </Link>{" "}
          para ela ir nas mensagens.
        </p>
      )}

      <Fila
        grupos={[
          { titulo: "Promessas para hoje ou não cumpridas", itens: promessas },
          { titulo: "Atrasadas", itens: atrasadas.filter((x) => !x.item.promessaVencida) },
          { titulo: "Vencem hoje", itens: deHoje.filter((x) => !x.item.promessaVencida) },
          { titulo: "Próximos 7 dias", itens: proximas },
        ]}
        chavePix={chavePix}
        inicio={inicio}
        fim={fim}
        noHorarioInicial={dentroDoHorario(new Date(), inicio, fim)}
        hoje={hoje}
      />
    </div>
  );
}

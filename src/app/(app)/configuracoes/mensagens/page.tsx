import type { Metadata } from "next";
import Link from "next/link";

import { VARIAVEIS_MENSAGEM } from "@/lib/cobranca";
import { exibirChavePix } from "@/lib/pix";
import { requireUser } from "@/lib/supabase/server";

import { MensagensForm } from "./mensagens-form";

export const metadata: Metadata = { title: "Mensagens de cobrança" };

export default async function MensagensPage() {
  const { supabase } = await requireUser();
  const [{ data: modelos }, { data: config }, { data: perfil }] = await Promise.all([
    supabase.from("modelos_mensagem").select("dias_relativos, titulo, texto, ativo").order("dias_relativos"),
    supabase.from("configuracoes").select("nome_empresa, tipo_chave_pix, chave_pix").maybeSingle(),
    supabase.from("perfis").select("papel").maybeSingle(),
  ]);

  const exemplo: Record<string, string> = {
    "cliente.primeiro_nome": "Josiane",
    "cliente.nome": "Josiane Ferreira dos Santos",
    "parcela.numero": "3",
    "parcela.total": "6",
    "parcela.valor": "R$ 344,31",
    "parcela.valor_atualizado": "R$ 352,80",
    "parcela.vencimento": "05/10/2026",
    "parcela.dias_atraso": "12",
    "empresa.nome": config?.nome_empresa ?? "MC Créditos",
    "empresa.pix": config?.chave_pix ? exibirChavePix(config.tipo_chave_pix, config.chave_pix) : "(sua chave PIX)",
  };

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href="/configuracoes" className="text-sm font-bold text-primary">
          ← Configurações
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Mensagens de cobrança</h1>
        <p className="text-muted-foreground">
          O botão de WhatsApp da cobrança usa a mensagem do dia certo. Uma parcela com 10 dias de atraso, por exemplo, usa a
          de 7 dias.
        </p>
      </section>

      <p className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
        Mantenha o tom respeitoso. O Código de Defesa do Consumidor (art. 42) proíbe expor o cliente ao ridículo,
        ameaçar ou constranger na cobrança.
      </p>

      {perfil?.papel === "admin" || perfil?.papel === "operador" ? (
        <MensagensForm modelos={modelos ?? []} exemplo={exemplo} />
      ) : (
        <p className="text-muted-foreground">Seu usuário não pode alterar as mensagens.</p>
      )}

      <section className="grid gap-2 rounded-2xl border bg-card p-4">
        <h2 className="text-lg font-extrabold">Variáveis</h2>
        <dl className="grid gap-2 text-sm">
          {VARIAVEIS_MENSAGEM.map(([nome, descricao]) => (
            <div key={nome}>
              <dt>
                <code className="rounded bg-muted px-1.5 py-0.5 font-bold break-all">{`{{${nome}}}`}</code>
              </dt>
              <dd className="text-muted-foreground">{descricao}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

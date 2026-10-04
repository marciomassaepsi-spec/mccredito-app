import type { Metadata } from "next";
import Link from "next/link";

import { formatCPF } from "@/lib/format";
import { exibirChavePix } from "@/lib/pix";
import { requireUser } from "@/lib/supabase/server";

import { ConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Configurações" };

/** 2.000 → "2"; 1.5 → "1,5" */
function numeroParaTexto(valor: number | string) {
  return String(Number(valor)).replace(".", ",");
}

function formatDocumento(doc: string) {
  if (doc.length === 11) return formatCPF(doc);
  if (doc.length === 14) return exibirChavePix("cnpj", doc);
  return doc;
}

export default async function ConfiguracoesPage() {
  const { supabase, email } = await requireUser();
  const [{ data: config }, { data: perfil, error: erroPerfil }] = await Promise.all([
    supabase.from("configuracoes").select("*").maybeSingle(),
    supabase.from("perfis").select("papel").maybeSingle(),
  ]);

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-black italic text-brand-deep">Configurações</h1>

      {!perfil && !erroPerfil && (
        <p role="alert" className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">
          Seu usuário entrou, mas não tem perfil de acesso. Veja “Dúvidas comuns” no README.
        </p>
      )}

      <section className="rounded-2xl border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Conectado como</p>
        <p className="font-bold break-all">{email}</p>
        <p className="text-sm text-muted-foreground">{perfil?.papel === "admin" ? "Dono, acesso total" : (perfil?.papel ?? "")}</p>
      </section>

      {config && perfil?.papel === "admin" && (
        <ConfigForm
          inicial={{
            nome_empresa: config.nome_empresa,
            razao_social: config.razao_social,
            documento_empresa: formatDocumento(config.documento_empresa),
            cidade: config.cidade,
            tipo_chave_pix: config.tipo_chave_pix,
            chave_pix: exibirChavePix(config.tipo_chave_pix, config.chave_pix),
            nome_recebedor_pix: config.nome_recebedor_pix,
            multa_percentual: numeroParaTexto(config.multa_percentual),
            mora_percentual_mes: numeroParaTexto(config.mora_percentual_mes),
            cobranca_hora_inicio: config.cobranca_hora_inicio.slice(0, 5),
            cobranca_hora_fim: config.cobranca_hora_fim.slice(0, 5),
            limite_contratos_ativos: String(config.limite_contratos_ativos),
          }}
        />
      )}

      <Link
        href="/configuracoes/contrato"
        className="flex items-center justify-between rounded-2xl border bg-card px-4 py-4 font-bold outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span>
          Modelo de contrato
          <span className="block text-sm font-normal text-muted-foreground">Texto usado no PDF de cada empréstimo</span>
        </span>
        <span aria-hidden className="text-primary">
          →
        </span>
      </Link>

      {config && perfil && perfil.papel !== "admin" && (
        <p className="text-muted-foreground">Só o dono pode alterar as configurações.</p>
      )}
    </div>
  );
}

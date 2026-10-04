import type { Metadata } from "next";

import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configurações" };

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="num text-right font-bold">{valor || "não preenchido"}</dd>
    </div>
  );
}

function pct(valor: number | string) {
  const texto = String(valor).replace(".", ",");
  return `${texto.includes(",") ? texto.replace(/,?0+$/, "") : texto}%`;
}

export default async function ConfiguracoesPage() {
  const { supabase, email } = await requireUser();
  const [{ data: config }, { data: perfil, error: erroPerfil }] = await Promise.all([
    supabase.from("configuracoes").select("*").single(),
    supabase.from("perfis").select("papel").maybeSingle(),
  ]);

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-black italic text-brand-deep">Configurações</h1>

      {!perfil && !erroPerfil && (
        <p role="alert" className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">
          Seu usuário entrou, mas não tem perfil de acesso. Veja “Primeiro acesso” no README.
        </p>
      )}

      <section className="rounded-2xl border bg-card px-5 py-2">
        <h2 className="pt-3 text-lg font-extrabold">Conta</h2>
        <dl>
          <Linha rotulo="E-mail" valor={email} />
          <Linha rotulo="Acesso" valor={perfil?.papel === "admin" ? "Dono (acesso total)" : (perfil?.papel ?? "")} />
        </dl>
      </section>

      {config && (
        <>
          <section className="rounded-2xl border bg-card px-5 py-2">
            <h2 className="pt-3 text-lg font-extrabold">Empresa</h2>
            <dl>
              <Linha rotulo="Nome" valor={config.nome_empresa} />
              <Linha rotulo="CPF ou CNPJ" valor={config.documento_empresa} />
              <Linha rotulo="Cidade" valor={config.cidade} />
              <Linha rotulo="Chave PIX" valor={config.chave_pix} />
            </dl>
          </section>
          <section className="rounded-2xl border bg-card px-5 py-2">
            <h2 className="pt-3 text-lg font-extrabold">Atraso e cobrança</h2>
            <dl>
              <Linha rotulo="Multa por atraso" valor={pct(config.multa_percentual)} />
              <Linha rotulo="Juros de mora" valor={`${pct(config.mora_percentual_mes)} ao mês`} />
              <Linha
                rotulo="Horário para cobrar"
                valor={`${config.cobranca_hora_inicio.slice(0, 5)} às ${config.cobranca_hora_fim.slice(0, 5)}`}
              />
              <Linha rotulo="Limite de contratos ativos" valor={String(config.limite_contratos_ativos)} />
            </dl>
          </section>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        A edição destes campos chega junto com a cobrança, na fase 6.
      </p>
    </div>
  );
}

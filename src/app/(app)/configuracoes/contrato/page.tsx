import type { Metadata } from "next";
import Link from "next/link";

import { MODELO_PADRAO, VARIAVEIS } from "@/lib/contrato";
import { requireUser } from "@/lib/supabase/server";

import { ModeloForm } from "./modelo-form";

export const metadata: Metadata = { title: "Modelo de contrato" };

export default async function ModeloContratoPage() {
  const { supabase } = await requireUser();
  const [{ data: config }, { data: perfil }] = await Promise.all([
    supabase.from("configuracoes").select("modelo_contrato").maybeSingle(),
    supabase.from("perfis").select("papel").maybeSingle(),
  ]);
  const personalizado = Boolean(config?.modelo_contrato.trim());

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href="/configuracoes" className="text-sm font-bold text-primary">
          ← Configurações
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Modelo de contrato</h1>
        <p className="text-muted-foreground">
          Este texto vira o PDF de cada empréstimo. As palavras entre chaves duplas são trocadas pelos dados reais.
        </p>
      </section>

      <p className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
        O modelo padrão é um ponto de partida. Antes de usar com clientes, peça para um advogado revisar.
      </p>

      {perfil?.papel === "admin" ? (
        <ModeloForm modelo={config?.modelo_contrato.trim() || MODELO_PADRAO} personalizado={personalizado} />
      ) : (
        <p className="text-muted-foreground">Só o dono pode alterar o modelo.</p>
      )}

      <section className="grid gap-3 rounded-2xl border bg-card p-4">
        <h2 className="text-lg font-extrabold">Como escrever</h2>
        <ul className="grid gap-1 text-sm">
          <li>
            <code className="font-bold"># Título</code> no começo da linha vira o título.
          </li>
          <li>
            <code className="font-bold">## Cláusula</code> vira um subtítulo verde.
          </li>
          <li>
            <code className="font-bold">**texto**</code> fica em negrito.
          </li>
          <li>Uma linha em branco separa os parágrafos.</li>
        </ul>
        <h2 className="pt-2 text-lg font-extrabold">Variáveis</h2>
        <dl className="grid gap-2 text-sm">
          {VARIAVEIS.map(([nome, descricao]) => (
            <div key={nome} className="grid gap-0.5">
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

import { Search, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Selo } from "@/components/app/selo";
import { buttonVariants } from "@/components/ui/button";
import { resumirParcelas } from "@/lib/emprestimos";
import { formatCentavos, formatTelefone, hojeISO, mascararCPF } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clientes" };

/** Deixa só letras, números e espaços: o termo vai num filtro do PostgREST. */
function limparBusca(texto: string) {
  return texto.normalize("NFC").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { q } = await searchParams;
  const busca = limparBusca(typeof q === "string" ? q : "");
  const { supabase } = await requireUser();

  let consulta = supabase
    .from("clientes")
    .select(
      "id, nome, cpf, whatsapp, emprestimos(status, parcelas(numero, vencimento, valor_centavos, pago_centavos, status, quitada_em))",
    )
    .order("nome")
    .limit(300);

  if (busca) {
    const digitos = busca.replace(/\D/g, "");
    consulta =
      digitos.length >= 3 && digitos.length === busca.replace(/\s/g, "").length
        ? consulta.or(`cpf.ilike.%${digitos}%,whatsapp.ilike.%${digitos}%`)
        : consulta.ilike("nome", `%${busca}%`);
  }

  const { data: clientes, error } = await consulta;
  const hoje = hojeISO();

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black italic text-brand-deep">Clientes</h1>
        <Link href="/clientes/novo" className={buttonVariants({ className: "h-11 px-4 font-bold" })}>
          <UserPlus aria-hidden /> Novo
        </Link>
      </div>

      <form role="search" className="relative">
        <label htmlFor="q" className="sr-only">
          Buscar por nome, CPF ou telefone
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={busca}
          placeholder="Nome, CPF ou telefone"
          className="h-12 w-full rounded-xl border border-input bg-card pr-3 pl-10 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </form>

      {error && <p className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">Não foi possível carregar os clientes.</p>}

      {clientes && clientes.length === 0 && (
        <div className="grid gap-3 rounded-2xl border border-dashed bg-card px-5 py-8 text-center">
          <p className="font-bold">{busca ? `Nenhum cliente encontrado para “${busca}”.` : "Nenhum cliente cadastrado ainda."}</p>
          <p className="text-sm text-muted-foreground">
            {busca ? "Tente parte do nome, ou só os números do CPF ou do telefone." : "Cadastre o primeiro para lançar um empréstimo."}
          </p>
        </div>
      )}

      <ul className="grid gap-2">
        {clientes?.map((c) => {
          const ativos = c.emprestimos.filter((e) => e.status === "ativo");
          const resumo = resumirParcelas(ativos.flatMap((e) => e.parcelas), hoje);
          return (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.id}`}
                className="grid gap-1 rounded-2xl border bg-card px-4 py-3 outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-bold break-words">{c.nome}</span>
                  {resumo.atrasadas > 0 ? (
                    <Selo tom="atraso">{resumo.maiorAtrasoDias} dias de atraso</Selo>
                  ) : ativos.length > 0 ? (
                    <Selo tom="ok">Em dia</Selo>
                  ) : (
                    <Selo tom="neutro">Sem empréstimo ativo</Selo>
                  )}
                </div>
                <div className="num flex flex-wrap justify-between gap-x-3 text-sm text-muted-foreground">
                  <span>
                    {mascararCPF(c.cpf)}
                    {c.whatsapp && ` · ${formatTelefone(c.whatsapp)}`}
                  </span>
                  {resumo.emAbertoCentavos > 0 && <span>{formatCentavos(resumo.emAbertoCentavos)} em aberto</span>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

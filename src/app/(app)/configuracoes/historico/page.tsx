import type { Metadata } from "next";
import Link from "next/link";

import { descreverEntrada, linkDaEntrada } from "@/lib/auditoria";
import { formatData } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Histórico de alterações" };

const POR_PAGINA = 50;

const FILTROS = [
  { id: "", rotulo: "Tudo" },
  { id: "pagamentos", rotulo: "Pagamentos" },
  { id: "emprestimos", rotulo: "Empréstimos" },
  { id: "clientes", rotulo: "Clientes" },
  { id: "configuracoes", rotulo: "Configurações" },
] as const;

function hora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function diaSP(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function HistoricoPage({ searchParams }: PageProps<"/configuracoes/historico">) {
  const { antes, tabela } = await searchParams;
  const filtro = FILTROS.some((f) => f.id === tabela) ? (tabela as string) : "";
  const cursor = typeof antes === "string" && /^\d+$/.test(antes) ? Number(antes) : null;
  const { supabase, userId } = await requireUser();

  const { data: perfil } = await supabase.from("perfis").select("papel").maybeSingle();
  if (perfil?.papel !== "admin") {
    return <p className="text-muted-foreground">Só o dono pode ver o histórico.</p>;
  }

  let consulta = supabase
    .from("auditoria")
    .select("id, tabela, acao, dados_antes, dados_depois, usuario_id, feito_em")
    .order("id", { ascending: false })
    .limit(POR_PAGINA + 1);
  // As parcelas criadas junto com cada empréstimo só repetiriam o lançamento
  consulta = filtro ? consulta.eq("tabela", filtro) : consulta.or("tabela.neq.parcelas,acao.neq.criou");
  if (cursor) consulta = consulta.lt("id", cursor);

  const { data, error } = await consulta;
  const entradas = (data ?? []).slice(0, POR_PAGINA);
  const temMais = (data?.length ?? 0) > POR_PAGINA;

  // Cabeçalho de dia antes da primeira alteração de cada data
  const comDia = entradas.map((e, i) => ({
    e,
    dia: diaSP(e.feito_em),
    novoDia: i === 0 || diaSP(e.feito_em) !== diaSP(entradas[i - 1].feito_em),
  }));
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(filtro ? { tabela: filtro } : {}), ...extra });
    const s = p.toString();
    return `/configuracoes/historico${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href="/configuracoes" className="text-sm font-bold text-primary">
          ← Configurações
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Histórico de alterações</h1>
        <p className="text-muted-foreground">Tudo o que foi criado, alterado ou apagado no app, do mais recente para o mais antigo.</p>
      </section>

      <nav aria-label="Filtrar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/configuracoes/historico?tabela=${f.id}` : "/configuracoes/historico"}
            aria-current={filtro === f.id ? "page" : undefined}
            className={`flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap ${filtro === f.id ? "border-gold bg-gold text-[#2b2300]" : "bg-card text-muted-foreground"}`}
          >
            {f.rotulo}
          </Link>
        ))}
      </nav>

      {error && <p className="rounded-xl bg-late-soft px-4 py-3 font-semibold text-late">Não foi possível carregar o histórico.</p>}
      {!error && entradas.length === 0 && (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">Nada registrado ainda.</p>
      )}

      <ol className="grid gap-2">
        {comDia.map(({ e, dia, novoDia }) => {
          const d = descreverEntrada(e);
          const link = linkDaEntrada(e);
          const quem = !e.usuario_id ? "Sistema" : e.usuario_id === userId ? "Você" : "Outro usuário";
          return (
            <li key={e.id} className="grid gap-2">
              {novoDia && <h2 className="pt-2 text-sm font-extrabold text-muted-foreground">{formatData(dia)}</h2>}
              <div className="grid gap-1 rounded-2xl border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-bold break-words">{d.titulo}</p>
                  <span className="num shrink-0 text-sm text-muted-foreground">{hora(e.feito_em)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {quem}
                  {link && (
                    <>
                      {" · "}
                      <Link href={link} className="font-bold text-primary">
                        abrir
                      </Link>
                    </>
                  )}
                </p>
                {d.mudancas.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary">
                      {d.mudancas.length} {d.mudancas.length === 1 ? "mudança" : "mudanças"}
                    </summary>
                    <dl className="mt-1 grid gap-1">
                      {d.mudancas.map((m) => (
                        <div key={m.campo} className="grid gap-0.5">
                          <dt className="font-semibold">{m.campo}</dt>
                          <dd className="break-words text-muted-foreground">
                            <span className="line-through">{m.antes}</span> → <span className="text-foreground">{m.depois}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {temMais && (
        <Link href={qs({ antes: String(entradas[entradas.length - 1].id) })} className="justify-self-center py-2 font-bold text-primary">
          Ver mais antigos
        </Link>
      )}
    </div>
  );
}

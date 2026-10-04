import { DatabaseBackup, FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Exportar e backup" };

const PLANILHAS = [
  { tabela: "clientes", rotulo: "Clientes", descricao: "Nome, CPF, WhatsApp e endereço" },
  { tabela: "emprestimos", rotulo: "Empréstimos", descricao: "Valor, taxa, parcelas e situação" },
  { tabela: "parcelas", rotulo: "Parcelas", descricao: "Vencimentos, juros e o que já foi pago" },
  { tabela: "pagamentos", rotulo: "Pagamentos", descricao: "Recebimentos, multa, mora e estornos" },
  { tabela: "contatos", rotulo: "Contatos de cobrança", descricao: "Ligações, mensagens e promessas" },
] as const;

export default async function ExportarPage() {
  const { supabase } = await requireUser();
  const { data: perfil } = await supabase.from("perfis").select("papel").maybeSingle();
  const admin = perfil?.papel === "admin";

  return (
    <div className="grid gap-5">
      <section className="grid gap-1">
        <Link href="/configuracoes" className="text-sm font-bold text-primary">
          ← Configurações
        </Link>
        <h1 className="text-3xl font-black italic text-brand-deep">Exportar e backup</h1>
      </section>

      {!admin ? (
        <p className="text-muted-foreground">Só o dono pode exportar os dados.</p>
      ) : (
        <>
          <section className="grid gap-3 rounded-2xl bg-brand-deep p-5 text-white">
            <DatabaseBackup className="size-8 text-[#f0d45a]" aria-hidden />
            <h2 className="text-xl font-black">Backup completo</h2>
            <p className="text-sm text-white/85">
              Uma planilha do Excel com tudo: clientes, empréstimos, parcelas, pagamentos e contatos, cada um numa aba.
              O plano gratuito do Supabase não guarda cópias para você baixar, então faça isso toda semana e guarde o
              arquivo num lugar seguro (Google Drive, por exemplo).
            </p>
            <a href="/exportar/backup" download className={buttonVariants({ variant: "secondary", className: "h-12 text-base font-bold" })}>
              Baixar backup (Excel)
            </a>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-extrabold">Planilhas separadas (CSV)</h2>
            <p className="text-sm text-muted-foreground">Abrem no Excel ou no Google Planilhas, já com vírgula nos centavos.</p>
            <ul className="grid gap-2">
              {PLANILHAS.map((p) => (
                <li key={p.tabela}>
                  <a
                    href={`/exportar/${p.tabela}`}
                    download
                    className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <FileSpreadsheet className="size-6 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">
                      <span className="block font-bold">{p.rotulo}</span>
                      <span className="block text-sm text-muted-foreground">{p.descricao}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <p className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
            Os arquivos têm CPF e endereço dos clientes. Não envie para outras pessoas e apague cópias que não usar mais
            (LGPD).
          </p>
        </>
      )}
    </div>
  );
}

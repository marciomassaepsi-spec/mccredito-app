import { FilePlus2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmBreve } from "@/components/app/em-breve";
import { formatCentavos } from "@/lib/format";

export const metadata: Metadata = { title: "Novo empréstimo" };

const SISTEMAS: Record<string, string> = { price: "Tabela Price", sac: "SAC", simples: "Juros simples" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function NovoEmprestimoPage({ searchParams }: PageProps<"/emprestimos/novo">) {
  const q = await searchParams;
  const valor = Number(texto(q.valor));
  const taxa = Number(texto(q.taxa));
  const parcelas = Number(texto(q.parcelas));
  const sistema = SISTEMAS[texto(q.sistema)];
  const temSimulacao = Number.isSafeInteger(valor) && valor > 0 && taxa >= 0 && parcelas > 0 && sistema;

  return (
    <div className="grid gap-5">
      <EmBreve
        titulo="Novo empréstimo"
        fase={4}
        Icone={FilePlus2}
        descricao="Aqui você vai escolher o cliente, conferir as datas e salvar. As parcelas são geradas sozinhas."
        itens={
          temSimulacao
            ? [
                `Valor: ${formatCentavos(valor)}`,
                `Taxa: ${String(taxa).replace(".", ",")}% ao mês (${sistema})`,
                `Parcelas: ${parcelas}`,
              ]
            : ["Faça uma simulação na Calculadora e toque em “Virar empréstimo”."]
        }
      />
      <Link href="/calculadora" className="font-bold text-primary underline-offset-4 hover:underline">
        Voltar para a calculadora
      </Link>
    </div>
  );
}

import { FileText, ImageIcon, Trash2 } from "lucide-react";

import { apagarDocumento } from "@/app/(app)/emprestimos/pagamentos-actions";
import { linkArquivo } from "@/lib/arquivos";
import { formatData } from "@/lib/format";

import { EnviarDocumentoForm } from "./enviar-documento-form";

export const NOME_TIPO_DOCUMENTO = {
  contrato: "Contrato",
  promissoria: "Nota promissória",
  documento_cliente: "Documento do cliente",
  comprovante: "Comprovante",
  outro: "Outro",
} as const;

type Documento = {
  id: string;
  tipo: keyof typeof NOME_TIPO_DOCUMENTO;
  nome_arquivo: string;
  caminho: string;
  criado_em: string;
};

type Props = {
  documentos: Documento[];
  emprestimoId?: string;
  clienteId?: string;
  podeApagar: boolean;
  voltar: string;
};

export function Documentos({ documentos, emprestimoId, clienteId, podeApagar, voltar }: Props) {
  return (
    <section className="grid gap-3 rounded-2xl border bg-card p-4">
      <h2 className="text-lg font-extrabold">Documentos</h2>
      {documentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento guardado.</p>
      ) : (
        <ul className="grid gap-1">
          {documentos.map((d) => {
            const Icone = d.caminho.endsWith(".pdf") ? FileText : ImageIcon;
            return (
              <li key={d.id} className="flex items-center gap-2">
                <a
                  href={linkArquivo(d.caminho)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Icone className="size-5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{NOME_TIPO_DOCUMENTO[d.tipo]}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.nome_arquivo} · {formatData(d.criado_em.slice(0, 10))}
                    </span>
                  </span>
                </a>
                {podeApagar && (
                  <form action={apagarDocumento}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="voltar" value={voltar} />
                    <button
                      type="submit"
                      aria-label={`Apagar ${NOME_TIPO_DOCUMENTO[d.tipo]}`}
                      className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-late-soft hover:text-late"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <EnviarDocumentoForm emprestimoId={emprestimoId} clienteId={clienteId} />
    </section>
  );
}

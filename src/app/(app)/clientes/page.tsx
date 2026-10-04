import { Users } from "lucide-react";
import type { Metadata } from "next";

import { EmBreve } from "@/components/app/em-breve";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <EmBreve
      titulo="Clientes"
      fase={4}
      Icone={Users}
      descricao="Cadastro de clientes e empréstimos, com as parcelas geradas sozinhas."
      itens={[
        "Busca por nome, CPF ou telefone",
        "Ficha com histórico, total em aberto e pontualidade",
        "Novo empréstimo com resumo antes de salvar",
        "Contratos e documentos guardados (fase 5)",
      ]}
    />
  );
}

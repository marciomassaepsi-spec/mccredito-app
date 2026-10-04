import { Megaphone } from "lucide-react";
import type { Metadata } from "next";

import { EmBreve } from "@/components/app/em-breve";

export const metadata: Metadata = { title: "Cobrança" };

export default function CobrancaPage() {
  return (
    <EmBreve
      titulo="Cobrança de hoje"
      fase={6}
      Icone={Megaphone}
      descricao="A tela que vai abrir todo dia, com quem precisa ser cobrado primeiro."
      itens={[
        "Atrasadas, que vencem hoje e nos próximos 7 dias",
        "Botão de WhatsApp com a mensagem pronta",
        "PIX copia-e-cola com o valor certo, já com multa e mora",
        "Registro de contato e promessa de pagamento",
        "Visitas do dia com link para o Google Maps",
      ]}
    />
  );
}

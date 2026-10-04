import { Calculator } from "lucide-react";
import type { Metadata } from "next";

import { EmBreve } from "@/components/app/em-breve";

export const metadata: Metadata = { title: "Calculadora" };

export default function CalculadoraPage() {
  return (
    <EmBreve
      titulo="Calculadora"
      fase={3}
      Icone={Calculator}
      descricao="Simulações rápidas, sem precisar cadastrar nada."
      itens={[
        "Juros simples e compostos",
        "Parcela fixa (Price) e amortização constante (SAC)",
        "Descobrir a taxa a partir do valor da parcela",
        "Atualizar parcela atrasada com multa e mora",
        "Converter taxa mensal em anual",
      ]}
    />
  );
}

"use client";

import { useEffect, useState } from "react";

import { dentroDoHorario, type ItemCobranca } from "@/lib/cobranca";

import { CartaoCobranca } from "./cartao-cobranca";

type Props = {
  grupos: Array<{ titulo: string; itens: Array<{ item: ItemCobranca; mensagem: string }> }>;
  chavePix: string;
  inicio: string;
  fim: string;
  noHorarioInicial: boolean;
  hoje: string;
};

/** A checagem do horário roda no celular e se atualiza a cada minuto. */
export function Fila({ grupos, chavePix, inicio, fim, noHorarioInicial, hoje }: Props) {
  const [noHorario, setNoHorario] = useState(noHorarioInicial);
  useEffect(() => {
    const checar = () => setNoHorario(dentroDoHorario(new Date(), inicio, fim));
    checar();
    const t = setInterval(checar, 60_000);
    return () => clearInterval(t);
  }, [inicio, fim]);

  const horario = `${inicio.slice(0, 5)} às ${fim.slice(0, 5)}`;

  return (
    <div className="grid gap-6">
      {!noHorario && (
        <p role="status" className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
          Fora do horário de cobrança ({horario}). Os botões de WhatsApp voltam a funcionar no horário. Você pode mudar
          isso nas Configurações.
        </p>
      )}
      {grupos.map((g) =>
        g.itens.length === 0 ? null : (
          <section key={g.titulo} className="grid gap-3">
            <h2 className="text-lg font-extrabold">
              {g.titulo} <span className="text-muted-foreground">({g.itens.length})</span>
            </h2>
            {g.itens.map(({ item, mensagem }) => (
              <CartaoCobranca
                key={item.parcela.id}
                item={item}
                mensagem={mensagem}
                chavePix={chavePix}
                noHorario={noHorario}
                horario={horario}
                hoje={hoje}
              />
            ))}
          </section>
        ),
      )}
    </div>
  );
}

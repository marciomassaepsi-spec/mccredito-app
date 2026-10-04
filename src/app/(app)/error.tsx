"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid gap-4 py-8">
      <h1 className="text-2xl font-black italic text-brand-deep">Algo deu errado nesta tela</h1>
      <p className="text-muted-foreground">
        Pode ser a internet ou o banco de dados fora do ar por um instante. Seus dados não foram perdidos.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground">Código do erro: {error.digest}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button className="h-12 text-base font-bold" onClick={reset}>
          Tentar de novo
        </Button>
        <Link href="/" className="grid h-12 place-items-center rounded-lg font-bold text-muted-foreground hover:text-foreground">
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}

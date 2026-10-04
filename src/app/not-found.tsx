import Link from "next/link";

import { Logo } from "@/components/app/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <Logo width={120} className="border" />
      <h1 className="text-3xl font-black italic text-brand-deep">Página não encontrada</h1>
      <p className="text-muted-foreground">
        O endereço pode estar errado, ou o registro foi apagado. Volte para o início e procure por lá.
      </p>
      <Link href="/" className={buttonVariants({ className: "h-12 px-5 text-base font-bold" })}>
        Voltar para o início
      </Link>
    </main>
  );
}

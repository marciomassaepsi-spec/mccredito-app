import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

import { BottomNav } from "@/components/app/bottom-nav";
import { Logo } from "@/components/app/logo";
import { requireUser } from "@/lib/supabase/server";

import { sair } from "../login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();

  return (
    <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-primary pt-[env(safe-area-inset-top)] text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Início">
            <Logo width={76} priority className="px-1.5 py-0.5" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/configuracoes"
              aria-label="Configurações"
              className="grid size-11 place-items-center rounded-full outline-none hover:bg-white/10 focus-visible:bg-white/15"
            >
              <Settings className="size-5" aria-hidden />
            </Link>
            <form action={sair}>
              <button
                type="submit"
                aria-label="Sair"
                className="grid size-11 place-items-center rounded-full outline-none hover:bg-white/10 focus-visible:bg-white/15"
              >
                <LogOut className="size-5" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}

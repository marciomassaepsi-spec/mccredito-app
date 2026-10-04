"use client";

import { Calculator, House, Megaphone, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

const ITENS = [
  { href: "/", rotulo: "Início", Icone: House },
  { href: "/cobranca", rotulo: "Cobrança", Icone: Megaphone },
  { href: "/calculadora", rotulo: "Calculadora", Icone: Calculator },
  { href: "/clientes", rotulo: "Clientes", Icone: Users },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {ITENS.map(({ href, rotulo, Icone }) => {
          const ativo =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href) || (href === "/clientes" && pathname.startsWith("/emprestimos"));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground outline-none focus-visible:bg-secondary",
                  ativo && "text-primary",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-12 place-items-center rounded-full transition-colors",
                    ativo && "bg-secondary",
                  )}
                >
                  <Icone className="size-5" aria-hidden />
                </span>
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

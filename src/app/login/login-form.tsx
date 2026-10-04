"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { entrar, type LoginState } from "./actions";

const inicial: LoginState = { erro: null, email: "" };

export function LoginForm() {
  const [estado, acao, enviando] = useActionState(entrar, inicial);

  return (
    <form action={acao} className="grid gap-5" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="email" className="text-base">
          E-mail
        </Label>
        <Input
          key={estado.email}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={estado.email}
          required
          className="h-12 bg-white text-base"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="senha" className="text-base">
          Senha
        </Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 bg-white text-base"
        />
      </div>

      {estado.erro && (
        <p role="alert" className="rounded-lg bg-late-soft px-3 py-2 text-sm font-semibold text-late">
          {estado.erro}
        </p>
      )}

      <Button type="submit" disabled={enviando} className="h-12 text-base font-bold">
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

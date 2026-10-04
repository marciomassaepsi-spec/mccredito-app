/** Aparece enquanto a tela busca os dados (celular com internet lenta). */
export default function Carregando() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
    </div>
  );
}

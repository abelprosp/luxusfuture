export function ApiError({ message }: { message: string }) {
  return (
    <article className="rounded-2xl border border-red-400/60 bg-red-400/10 p-6">
      <h3 className="text-lg font-semibold text-red-200">Erro ao falar com a API</h3>
      <p className="mt-3 text-sm text-red-50/70">{message}</p>
      <p className="mt-6 text-xs text-[var(--muted)]">
        Confira se o servidor Go está ligado (<code>http://localhost:8080</code>) e valide{' '}
        <code>NEXT_PUBLIC_API_URL</code> quando rodar Next em outro host.
      </p>
    </article>
  );
}

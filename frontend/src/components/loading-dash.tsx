/** Fallback enquanto RSC espera dados da API (SSR). */
export function CarregandoPainel() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-[var(--card)] p-12 text-[var(--muted)]">
      <span
        className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"
        aria-hidden
      />
      <p className="text-sm font-medium text-[var(--foreground)]">Carregando...</p>
      <p className="max-w-md text-center text-xs leading-relaxed">
        Conectando ao backend. Se esta tela não sair em alguns segundos, confira se a API está
        rodando na porta <span className="font-mono text-[var(--foreground)]">8080</span> e se o{' '}
        <span className="font-mono">.env</span> do frontend tem{' '}
        <span className="font-mono">API_INTERNAL_URL=http://127.0.0.1:8080</span>
        &nbsp;(evita travamento típico de <span className="font-mono">localhost</span> no Windows).
      </p>
    </div>
  );
}

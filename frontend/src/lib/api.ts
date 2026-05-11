const DEFAULT_BROWSER = "http://localhost:8080";

/** No SSR, usar 127.0.0.1 evita timeouts longos quando `localhost` resolve para ::1. */
function apiBaseURL(): string {
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window !== "undefined") {
    return pub || DEFAULT_BROWSER;
  }
  const internal = process.env.API_INTERNAL_URL?.trim();
  if (internal) return internal;

  let base = pub || "http://127.0.0.1:8080";
  try {
    const u = new URL(base);
    if (u.hostname.toLowerCase() === "localhost") {
      u.hostname = "127.0.0.1";
      base = u.origin;
    }
  } catch {
    base = "http://127.0.0.1:8080";
  }
  return base.replace(/\/$/, "");
}

export const DEFAULT_ORGANIZACAO =
  process.env.NEXT_PUBLIC_ORGANIZACAO_ID ?? "00000000-0000-0000-0000-000000000001";

/** Base usada no navegador (ex.: upload). */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, "") || DEFAULT_BROWSER;

export function resolveOrganizacao(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  if (typeof window !== "undefined") {
    try {
      const o = localStorage.getItem("luxus_org_id");
      if (o?.trim()) return o.trim();
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_ORGANIZACAO;
}

function bearerHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const t = localStorage.getItem("luxus_token");
    if (t?.trim()) return { Authorization: `Bearer ${t.trim()}` };
  } catch {
    /* ignore */
  }
  return {};
}

/** Cabeçalhos padrão para fetch no browser (org + JWT). */
export function defaultHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "X-Organization-ID": resolveOrganizacao(),
  };
  const b = bearerHeader();
  if (b.Authorization) h.Authorization = b.Authorization;
  return h;
}

type FetchOpts = RequestInit & { organizacao?: string; timeoutMs?: number };

export async function apiFetch(path: string, opts: FetchOpts = {}) {
  const { organizacao, headers, timeoutMs = 15_000, signal: _ignoredSignal, ...rest } = opts;
  const hdrs = new Headers(headers ?? {});
  const org = resolveOrganizacao(organizacao);
  hdrs.set("X-Organization-ID", org);
  const auth = bearerHeader();
  if (auth.Authorization) hdrs.set("Authorization", auth.Authorization);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBaseURL()}${path}`, {
      cache: "no-store",
      ...rest,
      signal: ctrl.signal,
      headers: hdrs,
    });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      throw new Error(
        typeof body === "object" && body && "error" in body
          ? String((body as { error?: string }).error ?? res.statusText)
          : res.statusText,
      );
    }
    return body;
  } catch (e: unknown) {
    if ((e as Error).name === "AbortError") {
      throw new Error(
        `Timeout ou conexão com a API (${apiBaseURL()}). Verifique se o backend está ativo.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

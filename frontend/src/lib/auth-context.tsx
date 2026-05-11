"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";

export const LS_TOKEN = "luxus_token";
export const LS_ORG = "luxus_org_id";

export type UsuarioMe = {
  id: string;
  nome: string;
  email: string;
  organizacao_id: string;
};

export type OrganizacaoMe = {
  id: string;
  nome: string;
  documento?: string | null;
  criado_em?: string;
};

type AuthCtx = {
  token: string | null;
  user: UsuarioMe | null;
  organizacao: OrganizacaoMe | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: {
    email: string;
    password: string;
    nome: string;
    empresa_nome: string;
    empresa_documento?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_TOKEN);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UsuarioMe | null>(null);
  const [organizacao, setOrganizacao] = useState<OrganizacaoMe | null>(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((t: string, orgId: string) => {
    localStorage.setItem(LS_TOKEN, t);
    localStorage.setItem(LS_ORG, orgId);
    setToken(t);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_ORG);
    setToken(null);
    setUser(null);
    setOrganizacao(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const t = readToken();
    if (!t) {
      clearSession();
      return;
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${t}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      clearSession();
      return;
    }
    const data = (await res.json()) as {
      usuario: UsuarioMe;
      organizacao: OrganizacaoMe;
    };
    setUser(data.usuario);
    setOrganizacao(data.organizacao);
    localStorage.setItem(LS_ORG, data.usuario.organizacao_id);
    setToken(t);
  }, [clearSession]);

  useEffect(() => {
    const t = readToken();
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });
        if (!alive) return;
        if (!res.ok) {
          clearSession();
          return;
        }
        const data = (await res.json()) as {
          usuario: UsuarioMe;
          organizacao: OrganizacaoMe;
        };
        setUser(data.usuario);
        setOrganizacao(data.organizacao);
        localStorage.setItem(LS_ORG, data.usuario.organizacao_id);
      } catch {
        clearSession();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const raw = await res.text();
      let body: unknown = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = null;
      }
      if (!res.ok) {
        const msg =
          typeof body === "object" && body && "error" in body
            ? String((body as { error?: string }).error)
            : res.statusText;
        throw new Error(msg);
      }
      const data = body as {
        token: string;
        usuario: UsuarioMe;
        organizacao: OrganizacaoMe;
      };
      persistSession(data.token, data.usuario.organizacao_id);
      setUser(data.usuario);
      setOrganizacao(data.organizacao);
      router.push("/");
      router.refresh();
    },
    [persistSession, router],
  );

  const register = useCallback(
    async (p: {
      email: string;
      password: string;
      nome: string;
      empresa_nome: string;
      empresa_documento?: string;
    }) => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: p.email.trim(),
          password: p.password,
          nome: p.nome.trim(),
          empresa_nome: p.empresa_nome.trim(),
          empresa_documento: p.empresa_documento?.trim() || undefined,
        }),
      });
      const raw = await res.text();
      let body: unknown = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = null;
      }
      if (!res.ok) {
        const msg =
          typeof body === "object" && body && "error" in body
            ? String((body as { error?: string }).error)
            : res.statusText;
        throw new Error(msg);
      }
      const data = body as {
        token: string;
        usuario: UsuarioMe;
        organizacao: OrganizacaoMe;
      };
      persistSession(data.token, data.usuario.organizacao_id);
      setUser(data.usuario);
      setOrganizacao(data.organizacao);
      router.push("/");
      router.refresh();
    },
    [persistSession, router],
  );

  const logout = useCallback(() => {
    clearSession();
    router.push("/login");
    router.refresh();
  }, [clearSession, router]);

  const value = useMemo(
    () => ({
      token,
      user,
      organizacao,
      loading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [token, user, organizacao, loading, login, register, logout, refreshMe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth deve estar dentro de AuthProvider");
  return v;
}

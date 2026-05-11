"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

function initialsFromUser(nome: string | undefined, email: string | undefined) {
  const n = nome?.trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "—";
}

export function TopHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const initials = initialsFromUser(user?.nome, user?.email);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-end gap-4 border-b border-luxus-border bg-luxus-bg/80 px-8 py-4 backdrop-blur-md">
      <div className="relative mr-auto max-w-xl flex-1">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-luxus-muted" />
        <input
          type="search"
          placeholder="Buscar..."
          className="w-full rounded-full border border-luxus-border bg-white py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition placeholder:text-luxus-muted focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          readOnly
          onFocus={(e) => {
            e.preventDefault();
            alert("Busca global: será conectada a faturas, clientes e linhas.");
          }}
        />
      </div>

      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-luxus-border bg-white text-luxus-primary shadow-sm transition hover:bg-luxus-bg"
        aria-label="Notificações"
        onClick={() => alert("Notificações: sem itens no MVP.")}
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="flex items-center gap-2">
        {!loading && user && (
          <span className="hidden max-w-[180px] truncate text-right text-sm text-luxus-primary sm:block" title={user.email}>
            {user.nome}
          </span>
        )}
        <Link
          href="/configuracoes"
          className="flex h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-luxus-primary shadow-md ring-2 ring-luxus-border transition hover:opacity-90"
          aria-label="Configurações e perfil da organização"
        >
          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
            {loading ? "…" : initials}
          </span>
        </Link>
        {!loading && !user && (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-sm font-medium text-luxus-primary underline"
          >
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Wallet,
  Building2,
  Package,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

import { LuxusLogo } from "@/components/brand/luxus-logo";
import { TopHeader } from "@/components/layout/top-header";
import { useAuth } from "@/lib/auth-context";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faturas", label: "Faturas", icon: FileText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/operadoras", label: "Operadoras", icon: Building2 },
  { href: "/estoque", label: "Gestão de Estoque", icon: Package },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const authRoutes = ["/login", "/cadastro"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, organizacao, logout } = useAuth();

  if (authRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return <>{children}</>;
  }

  const greetingName = user?.nome?.split(/\s+/)[0] ?? "Utilizador";

  return (
    <div className="flex min-h-screen luxus-scrollbar">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-luxus-border bg-white px-5 py-8 shadow-soft">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="text-luxus-primary flex h-12 w-12 shrink-0 items-center justify-center">
              <LuxusLogo className="h-10 w-10" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-luxus-primary">Luxus Telefonia</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-snug text-luxus-muted">
                Olá, {greetingName}! {organizacao?.nome ? `${organizacao.nome} · ` : ""}
                Gestão de telefonia e faturas.
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 luxus-scrollbar overflow-y-auto pr-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-luxus-bg text-luxus-primary-dark shadow-sm"
                    : "text-luxus-muted hover:bg-luxus-bg hover:text-luxus-primary"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}

          <button
            type="button"
            className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-luxus-muted transition hover:bg-red-50 hover:text-red-600"
            onClick={() => logout()}
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            Sair
          </button>
        </nav>

        <div className="mt-auto rounded-2xl bg-luxus-primary px-4 py-5 text-white shadow-card">
          <p className="text-sm font-medium leading-snug">Precisa de ajuda?</p>
          <p className="mt-1 text-xs text-white/80">Suporte 24/7 disponível</p>
          <button
            type="button"
            className="mt-3 w-full rounded-xl bg-white py-2.5 text-xs font-semibold text-luxus-primary shadow-sm transition hover:bg-luxus-bg"
            onClick={() => alert("Abrir chamado: integração com sistema de tickets em breve.")}
          >
            Abrir chamado
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-[280px]">
        <TopHeader />
        <div className="flex flex-1 flex-col px-8 pb-6 pt-2">
          <div className="flex-1">{children}</div>
          <footer className="mt-10 py-6 text-center text-xs text-luxus-muted">
            © 2026 Luxus Telefonia. Todos os direitos reservados.
          </footer>
        </div>
      </div>
    </div>
  );
}

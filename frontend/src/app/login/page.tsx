"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { LuxusLogo } from "@/components/brand/luxus-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(ev.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    try {
      await login(email, password);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-luxus-bg to-white px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <LuxusLogo className="h-14 w-14 text-luxus-primary" />
        <h1 className="text-2xl font-bold text-luxus-primary">Luxus Telefonia</h1>
        <p className="text-center text-sm text-luxus-muted">Entre para gerir faturas e clientes.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-luxus-border bg-white p-8 shadow-card"
      >
        <div>
          <label className="text-xs font-semibold text-luxus-primary">E-mail</label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Senha</label>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
        {msg && <p className="text-center text-sm text-red-600">{msg}</p>}
        <p className="text-center text-sm text-luxus-muted">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-luxus-primary hover:underline">
            Criar organização
          </Link>
        </p>
        <p className="text-center text-xs text-luxus-muted">
          Conta demo: <code className="rounded bg-luxus-bg px-1">admin@luxus.demo</code> /{" "}
          <code className="rounded bg-luxus-bg px-1">LuxusDemo2024!</code>
        </p>
      </form>
    </div>
  );
}

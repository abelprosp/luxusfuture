"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { LuxusLogo } from "@/components/brand/luxus-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function CadastroPage() {
  const { register } = useAuth();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(ev.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const nome = String(fd.get("nome") ?? "").trim();
    const empresa_nome = String(fd.get("empresa_nome") ?? "").trim();
    const empresa_documento = String(fd.get("empresa_documento") ?? "").trim();
    if (password.length < 8) {
      setMsg("A senha deve ter pelo menos 8 caracteres.");
      setLoading(false);
      return;
    }
    try {
      await register({
        email,
        password,
        nome,
        empresa_nome,
        empresa_documento: empresa_documento || undefined,
      });
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
        <h1 className="text-2xl font-bold text-luxus-primary">Nova organização</h1>
        <p className="text-center text-sm text-luxus-muted">Crie a empresa e o primeiro utilizador.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-3 rounded-2xl border border-luxus-border bg-white p-8 shadow-card"
      >
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Razão social / Empresa</label>
          <input
            name="empresa_nome"
            required
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">CNPJ (opcional)</label>
          <input
            name="empresa_documento"
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">O seu nome</label>
          <input
            name="nome"
            required
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">E-mail (login)</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Senha (mín. 8 caracteres)</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "A criar…" : "Criar e entrar"}
        </Button>
        {msg && <p className="text-center text-sm text-red-600">{msg}</p>}
        <p className="text-center text-sm text-luxus-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-luxus-primary hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}

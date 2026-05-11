"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { API_BASE_URL, defaultHeaders } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function EmpresaForm() {
  const { token, organizacao, refreshMe, loading: authLoading } = useAuth();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");

  useEffect(() => {
    if (organizacao) {
      setNome(organizacao.nome);
      setDoc(organizacao.documento ?? "");
    }
  }, [organizacao]);

  if (!authLoading && !token) {
    return (
      <p className="text-sm text-luxus-muted">
        <a href="/login" className="font-semibold text-luxus-primary underline">
          Inicie sessão
        </a>{" "}
        para editar o perfil da empresa.
      </p>
    );
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!token) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/organizacao/perfil`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...defaultHeaders(),
        },
        body: JSON.stringify({
          nome: nome.trim(),
          documento: doc.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((body as { error?: string }).error ?? res.statusText));
      await refreshMe();
      setMsg("Dados guardados.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return <p className="text-sm text-luxus-muted">A carregar…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-luxus-muted">Razão social</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-luxus-muted">CNPJ / documento</label>
        <input
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "A guardar…" : "Guardar alterações"}
      </Button>
      {msg && (
        <p className={`text-sm font-medium ${msg.includes("guardados") ? "text-emerald-600" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { API_BASE_URL, defaultHeaders } from "@/lib/api";

export function OperadorasForm() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(ev.currentTarget);
    const nome = String(fd.get("nome") ?? "").trim();
    const codigo = String(fd.get("codigo") ?? "").trim();
    if (!nome) {
      setMsg("Informe o nome da operadora.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/operadoras`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...defaultHeaders(),
        },
        body: JSON.stringify({
          nome,
          ...(codigo ? { codigo } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((body as { error?: string }).error ?? res.statusText));
      ev.currentTarget.reset();
      setMsg("Operadora cadastrada com sucesso.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Nome</label>
          <input
            name="nome"
            required
            maxLength={120}
            placeholder="Ex.: Vivo Empresas"
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Código (opcional)</label>
          <input
            name="codigo"
            maxLength={32}
            placeholder="Ex.: VIVO-01"
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Cadastrar operadora"}
      </Button>
      {msg && (
        <p className={`text-sm font-medium ${msg.includes("sucesso") ? "text-emerald-600" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </form>
  );
}

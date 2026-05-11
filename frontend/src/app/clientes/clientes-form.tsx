"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { API_BASE_URL, defaultHeaders } from "@/lib/api";

type Operadora = { id: string; nome: string };

export function ClientesForm() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [ops, setOps] = useState<Operadora[]>([]);
  const [opsLoading, setOpsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/api/v1/operadoras`, {
      headers: defaultHeaders(),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setOps(Array.isArray(d.operadoras) ? d.operadoras : []);
      })
      .catch(() => {
        if (!alive) return;
        setOps([]);
      })
      .finally(() => {
        if (alive) setOpsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(ev.currentTarget);
    const nome = String(fd.get("nome") ?? "").trim();
    const documento = String(fd.get("documento") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const valorMensalRaw = String(fd.get("valor_mensal_acordado") ?? "").trim();
    const operadoraId = String(fd.get("operadora_id") ?? "").trim();
    const linhaNumero = String(fd.get("linha_numero") ?? "").trim();

    const valorMensalAcordado = Number(valorMensalRaw.replace(",", "."));
    if (!nome || !documento) {
      setMsg("Nome e documento são obrigatórios.");
      setLoading(false);
      return;
    }
    if (!operadoraId) {
      setMsg("Selecione a operadora.");
      setLoading(false);
      return;
    }
    if (!linhaNumero) {
      setMsg("Informe o número da linha (mesmo formato usado na fatura / TXT).");
      setLoading(false);
      return;
    }
    if (valorMensalRaw === "" || Number.isNaN(valorMensalAcordado) || valorMensalAcordado < 0) {
      setMsg("Informe o valor mensal acordado (R$) com um número válido.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...defaultHeaders(),
        },
        body: JSON.stringify({
          nome,
          documento,
          email: email || undefined,
          valor_mensal_acordado: valorMensalAcordado,
          operadora_id: operadoraId,
          linha_numero: linhaNumero,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(body.error ?? res.statusText));
      ev.currentTarget.reset();
      setMsg("Cliente cadastrado com sucesso.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <p className="text-sm text-luxus-muted">
        Para comparar com o arquivo TXT da operadora, é obrigatório o valor acordado, a operadora e o número da linha.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Razão social / Nome</label>
          <input
            name="nome"
            required
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">CNPJ / CPF</label>
          <input
            name="documento"
            required
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">E-mail</label>
          <input
            type="email"
            name="email"
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Operadora</label>
          <select
            name="operadora_id"
            required
            disabled={opsLoading || ops.length === 0}
            className="mt-1 w-full rounded-xl border border-luxus-border bg-white px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15 disabled:opacity-60"
          >
            <option value="">{opsLoading ? "Carregando..." : ops.length === 0 ? "Nenhuma operadora" : "Selecione..."}</option>
            {ops.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Número da linha</label>
          <input
            name="linha_numero"
            required
            placeholder="Ex.: 5511999999999"
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-luxus-primary">Valor mensal acordado (R$)</label>
          <input
            name="valor_mensal_acordado"
            type="text"
            inputMode="decimal"
            required
            placeholder="ex.: 199,90"
            className="mt-1 w-full rounded-xl border border-luxus-border px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
          />
        </div>
      </div>
      <Button type="submit" disabled={loading || opsLoading || ops.length === 0}>
        {loading ? "Salvando..." : "Cadastrar cliente"}
      </Button>
      {msg && (
        <p className={`text-sm font-medium ${msg.includes("sucesso") ? "text-emerald-600" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </form>
  );
}

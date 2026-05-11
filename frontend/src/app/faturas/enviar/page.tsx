"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LuxusCard } from "@/components/ui/luxus-card";
import { API_BASE_URL, defaultHeaders } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

type CliOpt = { id: string; nome: string };
type OpOpt = { id: string; nome: string };

export default function FaturasEnviarPage() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<CliOpt[]>([]);
  const [operadoras, setOperadoras] = useState<OpOpt[]>([]);
  const [cadastroLoading, setCadastroLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const hdr = defaultHeaders();
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/clientes`, { headers: hdr }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/v1/operadoras`, { headers: hdr }).then((r) => r.json()),
    ])
      .then(([dCli, dOp]) => {
        if (!alive) return;
        const clist = Array.isArray(dCli.clientes) ? dCli.clientes : [];
        setClientes(clist.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })));
        const olist = Array.isArray(dOp.operadoras) ? dOp.operadoras : [];
        setOperadoras(olist.map((o: { id: string; nome: string }) => ({ id: o.id, nome: o.nome })));
      })
      .catch(() => {
        if (alive) {
          setClientes([]);
          setOperadoras([]);
        }
      })
      .finally(() => {
        if (alive) setCadastroLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const form = event.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    const mesReferencia =
      (form.querySelector('input[name="mes_referencia"]') as HTMLInputElement)?.value ?? "";
    const operadoraRaw =
      (form.querySelector('select[name="operadora_id"]') as HTMLSelectElement)?.value ?? "";
    const clienteId =
      (form.querySelector('select[name="cliente_id"]') as HTMLSelectElement)?.value ?? "";

    if (!file) {
      setStatus("Selecione um arquivo antes de enviar.");
      setLoading(false);
      return;
    }
    if (!operadoraRaw.trim()) {
      setStatus("Selecione a operadora do arquivo.");
      setLoading(false);
      return;
    }

    const body = new FormData();
    body.append("arquivo", file);
    if (mesReferencia) body.append("mes_referencia", mesReferencia);
    if (operadoraRaw.trim()) body.append("operadora_id", operadoraRaw.trim());
    if (clienteId.trim()) body.append("cliente_id", clienteId.trim());

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/faturas`, {
        method: "POST",
        headers: defaultHeaders(),
        body,
      });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      if (!res.ok) {
        throw new Error(
          typeof json === "object" && json && "error" in json
            ? String((json as { error?: string }).error ?? res.statusText)
            : res.statusText,
        );
      }
      const fatura =
        typeof json === "object" && json !== null && "fatura" in json
          ? (json as { fatura?: { id: string } }).fatura
          : undefined;
      setStatus(
        `Upload aceito.${fatura?.id ? ` ID ${fatura.id}` : ""} Acompanhe na lista de faturas.`,
      );
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/faturas"
        className="inline-flex items-center gap-2 text-sm font-semibold text-luxus-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para faturas
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Novo upload</h1>
        <p className="mt-1 max-w-2xl text-sm text-luxus-muted">
          Aceitamos export TXT Telefônica/Vivo (060B+110D), CSV simples ou PDF (OCR futuro).
        </p>
      </div>

      <LuxusCard>
        <form className="space-y-6" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-luxus-primary">Referência mensal</label>
            <input
              type="month"
              name="mes_referencia"
              className="w-full max-w-xs rounded-xl border border-luxus-border bg-white px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-luxus-primary">Operadora</label>
            <p className="text-xs text-luxus-muted">
              Cadastre operadoras em <Link href="/operadoras" className="font-semibold underline">Operadoras</Link>{" "}
              se a lista estiver vazia.
            </p>
            <select
              name="operadora_id"
              required
              disabled={cadastroLoading || operadoras.length === 0}
              className="w-full max-w-xl rounded-xl border border-luxus-border bg-white px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15 disabled:opacity-60"
              defaultValue=""
            >
              <option value="">
                {cadastroLoading
                  ? "Carregando..."
                  : operadoras.length === 0
                    ? "Nenhuma operadora — cadastre uma primeiro"
                    : "Selecione a operadora"}
              </option>
              {operadoras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-luxus-primary">Cliente (opcional)</label>
            <p className="text-xs text-luxus-muted">
              Ao escolher um cliente, a fatura aparece como disponível na lista de clientes e no filtro por cliente.
            </p>
            <select
              name="cliente_id"
              className="w-full max-w-xl rounded-xl border border-luxus-border bg-white px-3 py-2 text-sm outline-none focus:border-luxus-primary focus:ring-2 focus:ring-luxus-primary/15"
              defaultValue=""
            >
              <option value="">Sem vínculo</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-luxus-border bg-luxus-bg/50 px-8 py-10 text-center transition hover:border-luxus-primary hover:bg-white">
            <span className="text-sm font-semibold text-luxus-primary">
              CSV, PDF ou TXT — arraste ou clique
            </span>
            <span className="text-xs text-luxus-muted">Até 50 MB</span>
            <input required type="file" name="arquivo" accept=".csv,.pdf,.txt" className="hidden" />
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading || cadastroLoading || operadoras.length === 0}>
              {loading ? "Enviando..." : "Enviar para processamento"}
            </Button>
            <Link
              href="/faturas"
              className="rounded-xl border border-luxus-border px-4 py-2.5 text-sm font-semibold text-luxus-primary hover:bg-luxus-bg"
            >
              Cancelar
            </Link>
          </div>

          {status && (
            <p
              className={`text-sm font-medium ${status.startsWith("Upload") ? "text-emerald-600" : "text-red-600"}`}
            >
              {status}
            </p>
          )}
        </form>
      </LuxusCard>
    </div>
  );
}

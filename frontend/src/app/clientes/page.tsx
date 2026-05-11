import Link from "next/link";

import { ClientesForm } from "./clientes-form";
import { LuxusCard } from "@/components/ui/luxus-card";
import { apiFetch } from "@/lib/api";

type Cli = {
  id: string;
  nome: string;
  documento: string;
  email?: string | null;
  faturas_total?: number;
};

async function Tabela() {
  try {
    const r = await apiFetch("/api/v1/clientes") as { clientes: Cli[] };
    const list = r.clientes ?? [];
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-luxus-border bg-luxus-bg">
            <tr>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Empresa</th>
              <th className="px-4 py-3 font-semibold text-luxus-primary">CNPJ</th>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Contato</th>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Fatura na base</th>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Situação</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-luxus-muted">
                  Nenhum cliente. Use o formulário acima.
                </td>
              </tr>
            )}
            {list.map((c) => (
              <tr key={c.id} className="border-b border-luxus-border last:border-0">
                <td className="px-4 py-3 font-medium">{c.nome}</td>
                <td className="px-4 py-3 text-luxus-muted">{c.documento}</td>
                <td className="px-4 py-3 text-luxus-muted">{c.email ?? "—"}</td>
                <td className="px-4 py-3">
                  {(c.faturas_total ?? 0) > 0 ? (
                    <Link
                      href={`/faturas?cliente_id=${encodeURIComponent(c.id)}`}
                      className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      Disponível ({c.faturas_total})
                    </Link>
                  ) : (
                    <span className="text-xs text-luxus-muted">Envie vinculando o cliente</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Ativo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (e) {
    return <p className="p-4 text-sm text-red-600">{(e as Error).message}</p>;
  }
}

export default async function ClientesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Clientes</h1>
        <p className="mt-1 text-sm text-luxus-muted">Cadastro corporativo e vínculo com linhas.</p>
      </div>

      <LuxusCard>
        <h2 className="mb-4 text-lg font-semibold text-luxus-primary">Novo cliente</h2>
        <ClientesForm />
      </LuxusCard>

      <LuxusCard className="overflow-hidden p-0">
        <div className="border-b border-luxus-border px-6 py-4">
          <h2 className="text-lg font-semibold text-luxus-primary">Clientes cadastrados</h2>
        </div>
        <Tabela />
      </LuxusCard>
    </div>
  );
}

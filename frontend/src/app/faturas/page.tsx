import Link from "next/link";

import { LuxusCard } from "@/components/ui/luxus-card";
import { apiFetch } from "@/lib/api";
import { FaturaExcluirButton } from "./fatura-excluir-button";
import { FileUp } from "lucide-react";

type Fatura = {
  id: string;
  organizacao_id: string;
  nome_arquivo: string;
  status: string;
  mes_referencia: string;
  total_declarado?: number | null;
};

async function ListaFaturas({ clienteId }: { clienteId?: string }) {
  try {
    const q = clienteId ? `?cliente_id=${encodeURIComponent(clienteId)}` : "";
    const raw = (await apiFetch(`/api/v1/faturas${q}`)) as { faturas: Fatura[] };
    const list = raw.faturas ?? [];
    return (
      <LuxusCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-luxus-border bg-luxus-bg">
            <tr>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Arquivo</th>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Referência</th>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Status</th>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Total declarado</th>
              <th className="px-4 py-3 font-semibold text-luxus-primary">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-luxus-muted">
                  Nenhuma fatura ainda. Envie pela opção Novo upload.
                </td>
              </tr>
            )}
            {list.map((f) => (
              <tr key={f.id} className="border-b border-luxus-border last:border-0">
                <td className="px-4 py-3 font-medium">{f.nome_arquivo}</td>
                <td className="px-4 py-3 text-luxus-muted">
                  {new Date(f.mes_referencia).toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 capitalize">{f.status}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {typeof f.total_declarado === "number"
                    ? f.total_declarado.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/relatorios?fatura=${f.id}`}
                      className="text-xs font-semibold text-luxus-primary hover:underline"
                    >
                      Economia
                    </Link>
                    <FaturaExcluirButton
                      faturaId={f.id}
                      organizacaoId={f.organizacao_id}
                      nomeArquivo={f.nome_arquivo}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </LuxusCard>
    );
  } catch (e) {
    return (
      <LuxusCard className="border-red-200 bg-red-50 text-red-800">
        {(e as Error).message}
      </LuxusCard>
    );
  }
}

export default async function FaturasPage({
  searchParams,
}: {
  searchParams?: { cliente_id?: string };
}) {
  const clienteId = searchParams?.cliente_id?.trim() || undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Faturas</h1>
          <p className="mt-1 text-sm text-luxus-muted">Upload, parsing e auditoria automática.</p>
          {clienteId ? (
            <p className="mt-2 text-sm font-medium text-luxus-primary">
              Filtrando faturas vinculadas a este cliente.{" "}
              <Link href="/faturas" className="font-semibold underline">
                Ver todas
              </Link>
            </p>
          ) : null}
        </div>
        <Link
          href="/faturas/enviar"
          className="flex items-center gap-2 rounded-xl bg-luxus-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-luxus-primary-dark"
        >
          <FileUp className="h-5 w-5" />
          Novo upload
        </Link>
      </div>

      <ListaFaturas clienteId={clienteId} />
    </div>
  );
}

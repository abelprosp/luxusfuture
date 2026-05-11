import { LuxusCard } from "@/components/ui/luxus-card";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

async function ResumoLinhas() {
  try {
    const r = await apiFetch("/api/v1/estoque/resumo") as {
      por_status: Array<{ status: string; total: number }>;
      total_linhas: number;
    };
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LuxusCard>
          <p className="text-sm text-luxus-muted">Total de linhas / chips</p>
          <p className="mt-2 text-3xl font-bold text-luxus-primary">{r.total_linhas}</p>
        </LuxusCard>
        {(r.por_status ?? []).map((row) => (
          <LuxusCard key={row.status}>
            <p className="text-sm capitalize text-luxus-muted">{row.status}</p>
            <p className="mt-2 text-3xl font-bold text-luxus-primary">{row.total}</p>
          </LuxusCard>
        ))}
      </div>
    );
  } catch (e) {
    return <LuxusCard className="border-red-200 text-red-700">{(e as Error).message}</LuxusCard>;
  }
}

export default async function EstoquePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Gestão de estoque</h1>
        <p className="mt-1 text-sm text-luxus-muted">
          Controle de chips e vínculos a clientes conforme registros na base de linhas.
        </p>
      </div>

      <ResumoLinhas />

      <LuxusCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-luxus-primary">Aparelhos e acessórios</h2>
          <Link href="/relatorios" className="text-xs font-semibold text-luxus-primary hover:underline">
            Inventário físico — em desenvolvimento
          </Link>
        </div>
        <p className="mt-3 text-sm text-luxus-muted">
          Futuramente você poderá importar IMEI/aparelhos e cruzá-los com as linhas corporativas. O modelo de
          dados já prevê ICCID e cliente na tabela `linhas`.
        </p>
      </LuxusCard>
    </div>
  );
}

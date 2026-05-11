import { LuxusCard } from "@/components/ui/luxus-card";
import { apiFetch } from "@/lib/api";

import { OperadorasForm } from "./operadoras-form";

const logoPlaceholder = (
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-luxus-bg text-xs font-bold text-luxus-primary">
    OP
  </div>
);

async function Lista() {
  try {
    const r = await apiFetch("/api/v1/operadoras") as { operadoras: Array<{ id: string; nome: string; codigo?: string }> };
    const list = r.operadoras ?? [];
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {list.length === 0 && (
          <p className="text-sm text-luxus-muted">Nenhuma operadora cadastrada para esta organização.</p>
        )}
        {list.map((o) => (
          <LuxusCard key={o.id} className="flex flex-row items-center gap-4">
            {logoPlaceholder}
            <div>
              <p className="font-semibold text-luxus-primary">{o.nome}</p>
              <p className="text-xs text-luxus-muted">Código: {o.codigo ?? "—"}</p>
            </div>
          </LuxusCard>
        ))}
      </div>
    );
  } catch (e) {
    return <p className="text-red-600">{(e as Error).message}</p>;
  }
}

export default async function OperadorasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Operadoras</h1>
        <p className="mt-1 text-sm text-luxus-muted">Planos, tarifários e vínculos com faturamento.</p>
      </div>

      <LuxusCard>
        <h2 className="mb-4 text-lg font-semibold text-luxus-primary">Nova operadora</h2>
        <OperadorasForm />
      </LuxusCard>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-luxus-primary">Cadastradas</h2>
        <Lista />
      </div>
    </div>
  );
}

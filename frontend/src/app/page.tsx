import { Suspense } from "react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { LuxusCard } from "@/components/ui/luxus-card";
import { loadDashboardBundle } from "@/lib/dashboard-load";

function PainelSkeleton() {
  return (
    <LuxusCard>
      <p className="text-center text-sm text-luxus-muted">Carregando dados do dashboard...</p>
    </LuxusCard>
  );
}

async function DashContent() {
  try {
    const { metricas, operadoras, clientesRecentes, estoque } = await loadDashboardBundle();

    return (
      <DashboardView
        metricas={metricas}
        operadoras={operadoras}
        clientesRecentes={clientesRecentes}
        estoque={estoque}
      />
    );
  } catch (e) {
    const msg = (e as Error).message;
    return (
      <LuxusCard className="border-red-200 bg-red-50">
        <p className="font-semibold text-red-800">Não foi possível carregar o dashboard.</p>
        <p className="mt-2 text-sm text-red-700">{msg}</p>
        <p className="mt-4 text-xs text-red-600/90">
          Verifique se a API Go está ligada ({process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080"}) com a versão atual (rota opcional{' '}
          <code className="rounded bg-white px-1">/api/v1/dashboard/metricas</code>). Se aparecer apenas &quot;Not
          Found&quot;, recompile e reinicie o backend.
        </p>
      </LuxusCard>
    );
  }
}

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-luxus-muted">Visão geral da sua operação de telefonia.</p>
      </div>

      <Suspense fallback={<PainelSkeleton />}>
        <DashContent />
      </Suspense>
    </div>
  );
}

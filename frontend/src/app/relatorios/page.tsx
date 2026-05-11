import Link from "next/link";
import { Suspense } from "react";

import { LuxusCard } from "@/components/ui/luxus-card";
import { apiFetch } from "@/lib/api";

async function EconomiaGlobo() {
  try {
    const r = await apiFetch("/api/v1/resumo/economia") as {
      total_economia_estimada: number;
      refaturamentos_registrados: number;
    };
    return (
      <LuxusCard className="border-luxus-primary/30 bg-emerald-50/50">
        <p className="text-sm font-medium text-luxus-primary">Economia identificada (acumulada)</p>
        <p className="mt-3 text-3xl font-bold text-luxus-primary">
          {(r.total_economia_estimada ?? 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        <p className="mt-2 text-xs text-luxus-muted">{r.refaturamentos_registrados ?? 0} ocorrências</p>
      </LuxusCard>
    );
  } catch {
    return null;
  }
}

async function UltimaDetalhes({ fatId }: { fatId?: string }) {
  if (!fatId) {
    const f = await apiFetch("/api/v1/faturas") as { faturas: Array<{ id: string; status: string }> };
    fatId =
      (f.faturas ?? []).find((x) => x.status === "analisada")?.id ??
      (f.faturas ?? [])[0]?.id ??
      "";
  }
  if (!fatId) {
    return <p className="text-sm text-luxus-muted">Envie e processe uma fatura para ver o detalhe.</p>;
  }
  try {
    const d = await apiFetch(`/api/v1/faturas/${fatId}/economia`) as {
      refaturamentos: Array<{ id: string; regra: string; motivo: string; economia_estimada: number }>;
    };
    const list = d.refaturamentos ?? [];
    if (list.length === 0)
      return <p className="text-sm text-luxus-muted">Esta fatura não gerou inconsistências automatizadas.</p>;
    return (
      <div className="overflow-x-auto rounded-xl border border-luxus-border">
        <table className="w-full text-sm">
          <thead className="bg-luxus-bg">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-luxus-primary">Regra</th>
              <th className="px-4 py-2 text-left font-semibold text-luxus-primary">Detalhe</th>
              <th className="px-4 py-2 text-right font-semibold text-luxus-primary">Economia</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-luxus-border">
                <td className="px-4 py-2 text-xs uppercase text-luxus-muted">{r.regra}</td>
                <td className="px-4 py-2 text-luxus-muted">{r.motivo}</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-700">
                  {(r.economia_estimada ?? 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch {
    return (
      <p className="text-sm text-luxus-muted">Detalhes indisponíveis até a análise concluir nesta fatura.</p>
    );
  }
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams?: { fatura?: string };
}) {
  const sp = searchParams ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Relatórios</h1>
          <p className="mt-1 text-sm text-luxus-muted">Auditoria de faturamento e foco econômico.</p>
        </div>
        <Link href="/faturas" className="text-sm font-semibold text-luxus-primary hover:underline">
          Ir para faturas
        </Link>
      </div>

      <Suspense fallback={<LuxusCard>Carregando resumo...</LuxusCard>}>
        <EconomiaGlobo />
      </Suspense>

      <LuxusCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-luxus-primary">Refaturamentos recentes</h2>
          {sp.fatura ? (
            <span className="text-xs font-mono text-luxus-muted">Fatura {sp.fatura}</span>
          ) : null}
        </div>
        <Suspense fallback={<p className="text-sm text-luxus-muted">Carregando detalhes…</p>}>
          <UltimaDetalhes fatId={sp.fatura} />
        </Suspense>
      </LuxusCard>

      <LuxusCard>
        <h2 className="text-lg font-semibold text-luxus-primary">Exportações</h2>
        <p className="mt-2 text-sm text-luxus-muted">PDF/XLS com governança e log de conciliações — próxima versão.</p>
        <p className="mt-4 text-xs text-luxus-muted">
          Geração de PDF/XLS agendável entra na próxima sprint (fila de jobs no backend Go).
        </p>
      </LuxusCard>
    </div>
  );
}

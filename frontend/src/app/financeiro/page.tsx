import Link from "next/link";

import { LuxusCard } from "@/components/ui/luxus-card";
import { apiFetch } from "@/lib/api";
import { ArrowRight, CreditCard } from "lucide-react";

async function Snapshot() {
  try {
    const m = await apiFetch("/api/v1/dashboard/metricas") as {
      faturas_em_aberto: { quantidade: number; valor_total: number };
      recebimentos_mes: number;
    };
    const aberto = m.faturas_em_aberto?.valor_total ?? 0;
    const rec = m.recebimentos_mes ?? 0;
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <LuxusCard>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-luxus-muted">Contas em aberto (faturas)</p>
              <p className="mt-1 text-2xl font-bold text-luxus-primary">
                {aberto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="mt-2 text-xs text-luxus-muted">{m.faturas_em_aberto?.quantidade ?? 0} faturas pendentes de conclusão</p>
            </div>
          </div>
        </LuxusCard>
        <LuxusCard>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-luxus-muted">Recebimentos reconhecidos (mês)</p>
              <p className="mt-1 text-2xl font-bold text-luxus-primary">
                {rec.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="mt-2 text-xs text-luxus-muted">Baseado em faturas já analisadas no mês atual</p>
            </div>
          </div>
        </LuxusCard>
      </div>
    );
  } catch {
    return null;
  }
}

export default async function FinanceiroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Financeiro</h1>
        <p className="mt-1 text-sm text-luxus-muted">Fluxo vinculado a faturas e refaturamentos.</p>
      </div>

      <Snapshot />

      <LuxusCard>
        <h2 className="text-lg font-semibold text-luxus-primary">Contas a pagar</h2>
        <p className="mt-2 text-sm text-luxus-muted">
          Módulo completo em evolução. Por ora, registre valores manualmente nos lançamentos operacionais
          ou pela operadora.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-luxus-muted">
          Novo lançamento <ArrowRight className="h-4 w-4" /> (API contábil planejada)
        </span>
      </LuxusCard>

      <LuxusCard>
        <h2 className="text-lg font-semibold text-luxus-primary">Contas a receber</h2>
        <p className="mt-2 text-sm text-luxus-muted">
          Resumo alinhado às cobranças identificadas nas faturas importadas e às inconformidades geradas pelo
          motor de auditoria.
        </p>
        <Link href="/relatorios" className="mt-4 inline-flex text-sm font-semibold text-luxus-primary hover:underline">
          Ver relatórios de economia
        </Link>
      </LuxusCard>

      <LuxusCard>
        <h2 className="text-lg font-semibold text-luxus-primary">Fluxo de caixa projetado</h2>
        <p className="mt-2 text-sm text-luxus-muted">
          Gráficos de projeção e conciliação bancária entram na próxima fase junto aos extratos Pix/boleto.
        </p>
      </LuxusCard>
    </div>
  );
}

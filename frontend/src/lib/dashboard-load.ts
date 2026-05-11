import { apiFetch } from "@/lib/api";
import type { DashboardMetricas } from "@/components/dashboard/dashboard-view";

async function fetchOrNull<T>(path: string): Promise<T | null> {
  try {
    return (await apiFetch(path)) as T;
  } catch {
    return null;
  }
}

function mesISOFromMesReferencia(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function ultimosMesesISO(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  const anchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(anchor);
    t.setUTCMonth(t.getUTCMonth() - i);
    out.push(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Agrega KPIs e séries quando `/dashboard/metricas` não existe (API antiga). */
export async function buildDashboardMetricasFallback(
  operadoras: Array<{ id: string; nome: string }>,
): Promise<DashboardMetricas> {
  const econ = await fetchOrNull<{
    total_economia_estimada?: number;
    refaturamentos_registrados?: number;
  }>("/api/v1/resumo/economia");

  const fats = await fetchOrNull<{
    faturas?: Array<{
      status: string;
      total_declarado?: number | null;
      criado_em?: string;
      mes_referencia?: string;
      operadora_id?: string;
    }>;
  }>("/api/v1/faturas");

  const clientesResp = await fetchOrNull<{ clientes?: unknown[] }>("/api/v1/clientes");

  const lista = fats?.faturas ?? [];

  const startMonth = new Date();
  startMonth.setUTCDate(1);
  startMonth.setUTCHours(0, 0, 0, 0);

  const startPrevMonth = new Date(startMonth);
  startPrevMonth.setUTCMonth(startPrevMonth.getUTCMonth() - 1);

  let recebimentosMes = 0;
  let recebimentosMesAnterior = 0;

  type AggRow = { status: string; quantidade: number; valor_total: number };
  const aggMap = new Map<string, AggRow>();

  let abertoQtd = 0;
  let abertoValor = 0;

  const abertoStatuses = new Set(["recebida", "processando", "erro"]);

  const mesesBucket = ultimosMesesISO(6);
  const valorPorMes = new Map<string, number>();
  for (const key of mesesBucket) valorPorMes.set(key, 0);

  const valorPorOp = new Map<string, number>();
  const opNome = new Map(operadoras.map((o) => [o.id, o.nome]));

  for (const f of lista) {
    const st = String(f.status || "");
    const val = typeof f.total_declarado === "number" ? f.total_declarado : 0;

    const prev = aggMap.get(st) ?? { status: st, quantidade: 0, valor_total: 0 };
    prev.quantidade += 1;
    prev.valor_total += val;
    aggMap.set(st, prev);

    if (abertoStatuses.has(st)) {
      abertoQtd += 1;
      abertoValor += val;
    }

    if (st === "analisada") {
      if (f.mes_referencia) {
        const mk = mesISOFromMesReferencia(f.mes_referencia);
        if (mk && valorPorMes.has(mk)) {
          valorPorMes.set(mk, (valorPorMes.get(mk) ?? 0) + val);
        }
      }
      const oid = f.operadora_id ?? "__sem__";
      valorPorOp.set(oid, (valorPorOp.get(oid) ?? 0) + val);

      if (f.criado_em) {
        const d = new Date(f.criado_em);
        if (!Number.isNaN(d.getTime())) {
          if (d >= startMonth) recebimentosMes += val;
          else if (d >= startPrevMonth && d < startMonth) recebimentosMesAnterior += val;
        }
      }
    }
  }

  const faturamento_mensal = mesesBucket.map((mes) => ({
    mes,
    valor_total: valorPorMes.get(mes) ?? 0,
  }));

  const top_operadoras = Array.from(valorPorOp.entries())
    .map(([opId, valor_total]) => ({
      operadora_id: opId === "__sem__" ? undefined : opId,
      nome:
        opId === "__sem__"
          ? "Faturas sem operadora definida"
          : (opNome.get(opId) ?? `Operadora ${opId.slice(0, 8)}…`),
      valor_total,
    }))
    .sort((a, b) => b.valor_total - a.valor_total);

  const faturas_por_status = Array.from(aggMap.values()).sort((a, b) =>
    a.status.localeCompare(b.status),
  );

  const clientList = clientesResp?.clientes ?? [];
  const cliAtivos = clientList.length;
  let cliNovos = 0;
  for (const _c of clientList) {
    const c = _c as { criado_em?: string };
    if (c.criado_em) {
      const d = new Date(c.criado_em);
      if (!Number.isNaN(d.getTime()) && d >= startMonth) cliNovos += 1;
    }
  }

  let variacao_recebimentos_pct: number | undefined;
  if (recebimentosMesAnterior > 1e-9) {
    variacao_recebimentos_pct = ((recebimentosMes - recebimentosMesAnterior) / recebimentosMesAnterior) * 100;
  }

  return {
    faturas_em_aberto: { quantidade: abertoQtd, valor_total: abertoValor },
    faturas_por_status,
    clientes_ativos: cliAtivos,
    clientes_novos_mes: cliNovos,
    recebimentos_mes: recebimentosMes,
    economia_identificada: {
      total: econ?.total_economia_estimada ?? 0,
      refaturamentos_count: econ?.refaturamentos_registrados ?? 0,
    },
    faturamento_mensal,
    top_operadoras,
    ...(variacao_recebimentos_pct !== undefined ? { variacao_recebimentos_pct } : {}),
  };
}

export async function loadDashboardBundle(): Promise<{
  metricas: DashboardMetricas;
  operadoras: Array<{ id: string; nome: string }>;
  clientesRecentes: Array<{ id: string; nome: string; documento: string }>;
  estoque: { por_status: Array<{ status: string; total: number }>; total_linhas: number };
}> {
  const [metricasPrimeiro, opsRaw, cliRaw, estRaw] = await Promise.all([
    fetchOrNull<DashboardMetricas>("/api/v1/dashboard/metricas"),
    fetchOrNull<{ operadoras: Array<{ id: string; nome: string }> }>("/api/v1/operadoras"),
    fetchOrNull<{ clientes: Array<{ id: string; nome: string; documento: string }> }>("/api/v1/clientes"),
    fetchOrNull<{
      por_status: Array<{ status: string; total: number }>;
      total_linhas: number;
    }>("/api/v1/estoque/resumo"),
  ]);

  const operadoras = opsRaw?.operadoras ?? [];

  let metricas = metricasPrimeiro;
  if (!metricas) {
    metricas = await buildDashboardMetricasFallback(operadoras);
  }

  return {
    metricas,
    operadoras,
    clientesRecentes: cliRaw?.clientes ?? [],
    estoque:
      estRaw ?? {
        por_status: [],
        total_linhas: 0,
      },
  };
}

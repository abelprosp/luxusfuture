"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, FileText, Users } from "lucide-react";

import { LuxusCard } from "@/components/ui/luxus-card";

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesLabelPt(yyyyMm: string): string {
  const [ys, ms] = yyyyMm.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m) return yyyyMm;
  const d = new Date(Date.UTC(y, m - 1, 1));
  const s = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return s.replace(/\.$/, "");
}

/** Métricas alinhadas à API `/api/v1/dashboard/metricas` (campos extras opcionais para versões antigas). */
export type DashboardMetricas = {
  faturas_em_aberto: { quantidade: number; valor_total: number };
  faturas_por_status: { status: string; quantidade: number; valor_total: number }[];
  clientes_ativos: number;
  clientes_novos_mes: number;
  recebimentos_mes: number;
  economia_identificada: { total: number; refaturamentos_count: number };
  faturamento_mensal?: { mes: string; valor_total: number }[];
  top_operadoras?: { nome: string; valor_total: number; operadora_id?: string }[];
  variacao_recebimentos_pct?: number;
};

const STATUS_LEGENDA: Record<string, string> = {
  recebida: "Recebida",
  processando: "Em processamento",
  analisada: "Analisada",
  erro: "Com erro",
};

const STATUS_COR: Record<string, string> = {
  recebida: "#94a3b8",
  processando: "#f97316",
  analisada: "#22c55e",
  erro: "#ef4444",
};

function corStatus(status: string) {
  return STATUS_COR[status] ?? "#64748b";
}

type Op = { id: string; nome: string };
type Cli = { id: string; nome: string; documento: string };
type EstoqueRes = { por_status: { status: string; total: number }[]; total_linhas: number };

const STATUS_LINHA_LEGENDA: Record<string, string> = {
  ativo: "Ativo",
  cancelado: "Cancelado",
  disponivel: "Disponível",
  suspenso: "Suspenso",
};

type DonutDatum = {
  name: string;
  key: string;
  value: number;
  valorBrl: number;
  fill: string;
};

export function DashboardView({
  metricas,
  operadoras: _operadoras,
  clientesRecentes,
  estoque,
}: {
  metricas: DashboardMetricas;
  operadoras: Op[];
  clientesRecentes: Cli[];
  estoque: EstoqueRes;
}) {
  void _operadoras;

  const abertaQ = Number(metricas.faturas_em_aberto.quantidade ?? 0);
  const abertaV = Number(metricas.faturas_em_aberto.valor_total ?? 0);

  const donutRows = metricas.faturas_por_status ?? [];
  const donutData: DonutDatum[] = donutRows.map((row) => ({
    name: STATUS_LEGENDA[row.status] ?? row.status,
    key: row.status,
    value: Number(row.quantidade ?? 0),
    valorBrl: Number(row.valor_total ?? 0),
    fill: corStatus(row.status),
  }));
  const donutTotal = donutData.reduce((s, x) => s + x.value, 0);

  const serieFat = metricas.faturamento_mensal ?? [];
  const lineData = serieFat.map(({ mes, valor_total }) => ({
    name: mesLabelPt(mes),
    mes,
    v: Number(valor_total ?? 0),
  }));

  let fatTituloValor = 0;
  if (lineData.length > 0) {
    const nonzero = lineData.filter((row) => row.v > 0);
    if (nonzero.length > 0) {
      fatTituloValor = nonzero.reduce((m, row) => (row.v > m.v ? row : m), nonzero[0]).v;
    } else {
      fatTituloValor = lineData[lineData.length - 1]?.v ?? 0;
    }
  }

  const topOpsRaw = metricas.top_operadoras ?? [];
  const topOps = topOpsRaw.filter((o) => o.valor_total > 0);
  const maxOpValor = Math.max(...topOps.map((o) => o.valor_total), 1);

  const pctVar = metricas.variacao_recebimentos_pct;
  const erroRow = donutRows.find((r) => r.status === "erro");

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <LuxusCard className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-luxus-muted">Faturas em aberto</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{abertaQ.toLocaleString("pt-BR")}</p>
              <p className="mt-1 text-lg font-semibold text-luxus-primary">{brl(abertaV)}</p>
              <p className="mt-3 text-xs text-luxus-muted">
                Pendências nos status recebida, processando ou erro.
              </p>
            </div>
            <div className="rounded-2xl bg-luxus-bg p-3 text-luxus-primary">
              <FileText className="h-7 w-7" strokeWidth={1.5} />
            </div>
          </div>
        </LuxusCard>

        <LuxusCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-luxus-muted">Clientes cadastrados</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {Number(metricas.clientes_ativos).toLocaleString("pt-BR")}
              </p>
              <p className="mt-2 text-sm text-luxus-muted">
                Novos este mês: {Number(metricas.clientes_novos_mes).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="rounded-2xl bg-luxus-bg p-3 text-luxus-primary">
              <Users className="h-7 w-7" strokeWidth={1.5} />
            </div>
          </div>
        </LuxusCard>

        <LuxusCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-luxus-muted">Recebimentos (mês)</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-luxus-primary">
                {brl(metricas.recebimentos_mes)}
              </p>
              {typeof pctVar === "number" && (
                <p className={`mt-2 text-sm font-medium ${pctVar >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {pctVar >= 0 ? "+" : ""}
                  {pctVar.toFixed(1)}% vs mês anterior
                </p>
              )}
              {typeof pctVar !== "number" && (
                <p className="mt-2 text-xs text-luxus-muted">
                  Comparação com o mês anterior só aparece quando há base no período anterior.
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-luxus-bg p-3 text-luxus-primary">
              <DollarSign className="h-7 w-7" strokeWidth={1.5} />
            </div>
          </div>
        </LuxusCard>

        <LuxusCard className="border-luxus-primary/20 bg-gradient-to-br from-luxus-primary to-luxus-primary-dark text-white shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/85">Economia identificada</p>
              <p className="mt-2 text-2xl font-bold">{brl(metricas.economia_identificada.total)}</p>
              <p className="mt-2 text-xs text-white/70">
                {metricas.economia_identificada.refaturamentos_count} ocorrência(s) de refaturamento
              </p>
            </div>
            <div className="rounded-full bg-white/15 p-3">
              <DollarSign className="h-7 w-7 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </LuxusCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <LuxusCard className="xl:col-span-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-luxus-muted">Faturamento declarado</p>
              <p className="text-2xl font-bold text-luxus-primary">{brl(fatTituloValor)}</p>
              <p className="mt-1 text-xs text-luxus-muted">
                Maior volume mensal (faturas analisadas, por mês de referência · últimos 6 meses, UTC).
              </p>
            </div>
          </div>
          <div className="h-[260px] w-full min-h-[200px] min-w-0">
            {lineData.length === 0 ? (
              <p className="text-sm text-luxus-muted">Sem série mensal disponível nesta sessão da API.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fatFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5D7365" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#5D7365" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(v) => brl(typeof v === "number" ? v : Number(v ?? 0))}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e8e8e4" }}
                  />
                  <Area type="monotone" dataKey="v" stroke="#5D7365" strokeWidth={2.5} fill="url(#fatFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </LuxusCard>

        <LuxusCard className="xl:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-luxus-primary">Faturas por status</p>
          </div>
          {donutTotal <= 0 ? (
            <p className="text-sm text-luxus-muted">Nenhuma fatura na base para esta organização.</p>
          ) : (
            <>
              <div className="relative mx-auto h-[220px] w-full min-h-[220px] min-w-0 max-w-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {donutData.map((entry) => (
                        <Cell key={`${entry.key}-${entry.name}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const v = typeof value === "number" ? value : Number(value);
                        const pl = (item?.payload ?? item) as DonutDatum | undefined;
                        const brlExtras =
                          typeof pl?.valorBrl === "number"
                            ? ` · ${brl(pl.valorBrl)} total declarado`
                            : "";
                        return [`${v} fatura(s)${brlExtras}`, "Quantidade"];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
                  <p className="text-2xl font-bold text-luxus-primary">{donutTotal}</p>
                  <p className="text-xs text-luxus-muted">Total</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {donutData.map((d) => {
                  const pct = donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0;
                  return (
                    <li key={d.key} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                        {d.name}
                      </span>
                      <span className="font-medium text-luxus-muted">
                        {d.value} ({pct}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </LuxusCard>

        <LuxusCard className="xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold text-luxus-primary">Faturamento por operadora</p>
          </div>
          {topOps.length === 0 ? (
            <p className="text-sm text-luxus-muted">
              Nenhum total analisado por operadora. Associe a operadora na importação e conclua a análise.
            </p>
          ) : (
            <ul className="space-y-4">
              {topOps.map((o) => (
                <li key={o.operadora_id ?? o.nome}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{o.nome}</span>
                    <span className="text-luxus-muted">{brl(o.valor_total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-luxus-bg">
                    <div
                      className="h-full rounded-full bg-luxus-primary transition-all"
                      style={{ width: `${Math.min(100, (o.valor_total / maxOpValor) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </LuxusCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <LuxusCard>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold text-luxus-primary">Clientes recentes</p>
            <Link href="/clientes" className="text-xs font-semibold text-luxus-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="space-y-3">
            {(clientesRecentes.length ? clientesRecentes : []).slice(0, 5).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 border-b border-luxus-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold">{c.nome}</p>
                  <p className="text-xs text-luxus-muted">{c.documento}</p>
                </div>
              </li>
            ))}
            {clientesRecentes.length === 0 && (
              <li className="text-sm text-luxus-muted">Nenhum cliente cadastrado ainda.</li>
            )}
          </ul>
        </LuxusCard>

        <LuxusCard>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold text-luxus-primary">Resumo financeiro (faturas)</p>
            <Link href="/financeiro" className="text-xs font-semibold text-luxus-primary hover:underline">
              Financeiro
            </Link>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between border-b border-luxus-border pb-2">
              <span className="text-luxus-muted">Valor em pendência (aberto)</span>
              <span className="font-semibold">{brl(abertaV)}</span>
            </li>
            <li className="flex justify-between border-b border-luxus-border pb-2">
              <span className="text-luxus-muted">Quantidade em pendência</span>
              <span className="font-semibold">{abertaQ.toLocaleString("pt-BR")}</span>
            </li>
            <li className="flex justify-between border-b border-luxus-border pb-2">
              <span className="text-luxus-muted">Recebidos no mês (analisadas)</span>
              <span className="font-semibold">{brl(metricas.recebimentos_mes)}</span>
            </li>
            <li className="flex justify-between pt-1">
              <span className={erroRow ? "font-medium text-red-600" : "text-luxus-muted"}>
                Valor declarado em faturas com erro
              </span>
              <span className={`font-semibold ${erroRow ? "text-red-600" : ""}`}>
                {brl(erroRow?.valor_total ?? 0)}
              </span>
            </li>
          </ul>
        </LuxusCard>

        <LuxusCard>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold text-luxus-primary">Linhas cadastradas</p>
            <Link href="/estoque" className="text-xs font-semibold text-luxus-primary hover:underline">
              Ver estoque
            </Link>
          </div>
          {estoque.total_linhas <= 0 && !(estoque.por_status ?? []).length ? (
            <p className="text-sm text-luxus-muted">Nenhuma linha cadastrada.</p>
          ) : (
            <ul className="space-y-3">
              {(estoque.por_status ?? []).map((row) => (
                <li key={row.status} className="flex justify-between text-sm">
                  <span className="text-luxus-muted">{STATUS_LINHA_LEGENDA[row.status] ?? row.status}</span>
                  <span className="font-semibold">{Number(row.total).toLocaleString("pt-BR")}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-luxus-border pt-3 text-sm font-semibold text-luxus-primary">
                <span>Total</span>
                <span>{estoque.total_linhas.toLocaleString("pt-BR")}</span>
              </li>
            </ul>
          )}
        </LuxusCard>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { API_BASE_URL, defaultHeaders } from "@/lib/api";

export function FaturaExcluirButton({
  faturaId,
  organizacaoId,
  nomeArquivo,
}: {
  faturaId: string;
  /** Mesma organização retornada na listagem; evita 404 por header ≠ SSR. */
  organizacaoId?: string;
  nomeArquivo: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    const ok = window.confirm(
      `Excluir a fatura "${nomeArquivo}"? Os dados da análise serão apagados e não será possível desfazer.`,
    );
    if (!ok) return;
    setLoading(true);
    try {
      const base = defaultHeaders();
      const org = (organizacaoId ?? base["X-Organization-ID"]).trim();
      const qs = new URLSearchParams({ organizacao_id: org });
      const res = await fetch(
        `${API_BASE_URL}/api/v1/faturas/${encodeURIComponent(faturaId)}?${qs.toString()}`,
        {
          method: "DELETE",
          headers: { ...base, "X-Organization-ID": org },
        },
      );
      if (!res.ok) {
        const raw = await res.text();
        let msg = res.statusText;
        if (raw) {
          try {
            const b = JSON.parse(raw) as { error?: string };
            if (b.error) msg = b.error;
          } catch {
            msg = raw;
          }
        }
        if (res.status === 404) {
          msg =
            (msg || "Fatura não encontrada.") +
            " Atualize a página se a lista estiver desatualizada.";
        }
        if (res.status === 403) {
          msg =
            msg ||
            "A organização da requisição não confere com a fatura. Alinhe NEXT_PUBLIC_ORGANIZACAO_ID com ORGANIZACAO_DEMO_ID do backend.";
        }
        throw new Error(msg);
      }
      router.refresh();
    } catch (e) {
      setLoading(false);
      window.alert((e as Error).message);
      return;
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? "Excluindo…" : "Excluir"}
    </button>
  );
}

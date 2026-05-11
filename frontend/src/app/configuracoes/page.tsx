import { LuxusCard } from "@/components/ui/luxus-card";

import { EmpresaForm } from "./empresa-form";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-luxus-primary">Configurações</h1>
        <p className="mt-1 text-sm text-luxus-muted">Preferências da organização e integrações.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LuxusCard>
          <h2 className="text-lg font-semibold text-luxus-primary">Organização</h2>
          <p className="mt-2 text-sm text-luxus-muted">Razão social e documento (CNPJ) da empresa associada à sua conta.</p>
          <EmpresaForm />
        </LuxusCard>

        <LuxusCard>
          <h2 className="text-lg font-semibold text-luxus-primary">API &amp; integrações</h2>
          <p className="mt-2 text-sm text-luxus-muted">
            Webhooks de fatura, SFTP da operadora e fila Kafka/Rabbit para processamento em massa.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-luxus-muted">
            <li>URL base documentada em <code className="rounded bg-luxus-bg px-1">/api/v1</code></li>
            <li>Cabeçalho <code className="rounded bg-luxus-bg px-1">X-Organization-ID</code></li>
            <li>Chaves de API (roadmap)</li>
          </ul>
        </LuxusCard>

        <LuxusCard className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-luxus-primary">Notificações</h2>
          <p className="mt-2 text-sm text-luxus-muted">
            E-mail e push quando uma fatura terminar a análise ou quando surgir refaturamento acima de limiar.
          </p>
        </LuxusCard>
      </div>
    </div>
  );
}

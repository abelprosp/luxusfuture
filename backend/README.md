# API — Gestão e Auditoria de Telefonia

Backend em Go (Gin) com PostgreSQL.

## Variáveis

Copie `.env.example` para `.env` e ajuste `DATABASE_URL` e pastas locais.

## Banco de dados

Com Docker:

```powershell
docker compose up -d
```

Aplique a migração inicial (requer cliente `psql` ou usar container):

```powershell
Get-Content db/migrations/001_initial.up.sql -Raw | docker compose exec -T postgres psql -U telefonia -d telefonia
```

(Execute a partir da raiz do repositório, onde está `docker-compose.yml`.)

## Executar API

```powershell
cd backend
go run ./cmd/server
```

Endpoints principais (`X-Organization-ID` opcional; padrão: organização demo da migração):

- `GET /health`
- `GET /api/v1/dashboard/metricas`
- `GET /api/v1/operadoras`
- `GET /api/v1/clientes` • `POST /api/v1/clientes` (JSON: `nome`, `documento`, `email?`)
- `GET /api/v1/estoque/resumo`
- `GET /api/v1/faturas`
- `POST /api/v1/faturas` — multipart: `arquivo`, `mes_referencia` (YYYY-MM opcional), `operadora_id` (UUID opcional)
- `GET /api/v1/faturas/:id/economia`
- `GET /api/v1/resumo/economia`

## MVP de análise

- **TXT Telefônica/Vivo**: arquivo posicional com registros `060B` + `110D` (número XX-XXXXX-XXXX, plano, valor `NNN.NNA`), como o `faturaexemplo.txt` enviado pela operadora.
  - Extrai total em linha `059A` + `IS` quando presente.
  - Regras específicas: duplicidade do mesmo número cobrado mais de uma vez; tarifa divergente quando a mesma denominação de plano tem preço majoritário claro e há linhas bem fora do padrão.
- CSV com colunas `descrição` e `valor` (vírgula ou ponto-e-vírgula).
- PDF retorna erro informativo até integração OCR.
- Regras CSV: duplicidades (mesma descrição + valor), divergência de mensalidade frente ao plano cadastrado em `planos_tarifas`.

-- MVP: Gestão e Auditoria de Telefonia
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(18),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operadoras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacao_id UUID REFERENCES organizacoes(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    codigo VARCHAR(32),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(18) NOT NULL,
    email VARCHAR(255),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organizacao_id, documento)
);

CREATE TABLE linhas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    operadora_id UUID NOT NULL REFERENCES operadoras(id) ON DELETE RESTRICT,
    numero VARCHAR(32) NOT NULL,
    iccid VARCHAR(64),
    status VARCHAR(24) NOT NULL DEFAULT 'ativo'
        CHECK (status IN ('ativo', 'cancelado', 'disponivel', 'suspenso')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE planos_tarifas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operadora_id UUID NOT NULL REFERENCES operadoras(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    codigo VARCHAR(64),
    valor_mensal NUMERIC(14, 2),
    minuto_excedente NUMERIC(10, 4),
    dados_gb_inclusos NUMERIC(10, 2),
    vigencia_inicio DATE,
    vigencia_fim DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE faturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    operadora_id UUID REFERENCES operadoras(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    linha_id UUID REFERENCES linhas(id) ON DELETE SET NULL,
    mes_referencia DATE NOT NULL,
    tipo_arquivo VARCHAR(16) NOT NULL CHECK (tipo_arquivo IN ('csv', 'pdf', 'outro')),
    nome_arquivo VARCHAR(512) NOT NULL,
    caminho_armazenamento TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'recebida'
        CHECK (status IN ('recebida', 'processando', 'analisada', 'erro')),
    total_declarado NUMERIC(14, 2),
    mensagem_erro TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processado_em TIMESTAMPTZ
);

CREATE TABLE itens_fatura (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fatura_id UUID NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    servico_codigo VARCHAR(64),
    quantidade NUMERIC(14, 4) DEFAULT 1,
    valor_unitario NUMERIC(14, 4),
    valor_total NUMERIC(14, 2) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_itens_fatura_fatura ON itens_fatura(fatura_id);

CREATE TABLE refaturamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fatura_id UUID NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
    item_fatura_id UUID REFERENCES itens_fatura(id) ON DELETE SET NULL,
    regra VARCHAR(64) NOT NULL,
        -- tarifa_divergente | duplicidade | comparacao_operadora | outro
    motivo TEXT NOT NULL,
    valor_original NUMERIC(14, 2) NOT NULL,
    valor_sugerido NUMERIC(14, 2) NOT NULL,
    economia_estimada NUMERIC(14, 2) NOT NULL GENERATED ALWAYS AS (valor_original - valor_sugerido) STORED,
    resolvido BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refaturamentos_fatura ON refaturamentos(fatura_id);

-- Dados demo (uma organização)
INSERT INTO organizacoes (id, nome, documento) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Demo Corp', '00000000000100');

INSERT INTO operadoras (id, organizacao_id, nome, codigo) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Operadora Demo', 'OP-DEMO');

INSERT INTO planos_tarifas (operadora_id, nome, codigo, valor_mensal, minuto_excedente, dados_gb_inclusos, vigencia_inicio)
VALUES ('00000000-0000-0000-0000-000000000010', 'Plano Corporativo', 'CORP-001', 199.90, 0.45, 50, DATE '2024-01-01');

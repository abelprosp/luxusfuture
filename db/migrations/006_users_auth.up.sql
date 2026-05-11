CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    senha_hash TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (email)
);

CREATE INDEX idx_usuarios_organizacao ON usuarios(organizacao_id);

-- Demo: senha = LuxusDemo2024!
INSERT INTO usuarios (organizacao_id, email, nome, senha_hash)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@luxus.demo',
    'Administrador',
    '$2a$10$U3NgnNOsUhs8VNM6Ec4ZnexRy6wvI8vYnST5mmH1amCsf5avrCtm2'
);

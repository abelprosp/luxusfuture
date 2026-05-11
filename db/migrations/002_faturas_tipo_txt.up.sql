ALTER TABLE faturas DROP CONSTRAINT IF EXISTS faturas_tipo_arquivo_check;
ALTER TABLE faturas ADD CONSTRAINT faturas_tipo_arquivo_check
  CHECK (tipo_arquivo IN ('csv', 'pdf', 'outro', 'txt'));

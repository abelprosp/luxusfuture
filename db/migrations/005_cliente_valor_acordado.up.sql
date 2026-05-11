ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS valor_mensal_acordado NUMERIC(14, 2);

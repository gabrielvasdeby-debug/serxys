-- Adiciona coluna category na tabela services (tipo de equipamento)
ALTER TABLE services
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Outro';

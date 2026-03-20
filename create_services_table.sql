-- Habilitar extensão de UUID (Necessário para o ID automático)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Serviços
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    default_value DECIMAL(10,2) DEFAULT 0.00,
    estimated_time TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS (Desabilitado para permitir acesso inicial)
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;

-- Garantir acesso ao schema public (opcional mas recomendado)
GRANT ALL ON TABLE public.services TO anon;
GRANT ALL ON TABLE public.services TO authenticated;
GRANT ALL ON TABLE public.services TO service_role;

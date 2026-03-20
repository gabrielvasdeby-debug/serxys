-- Tabela de Garantias (Corrigida para compatibilidade de tipos)
CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    os_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    os_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    equipment TEXT NOT NULL,
    service_performed TEXT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    duration_days INTEGER NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Ativa', -- 'Ativa' ou 'Expirada'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS
ALTER TABLE public.warranties DISABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE public.warranties TO anon;
GRANT ALL ON TABLE public.warranties TO authenticated;
GRANT ALL ON TABLE public.warranties TO service_role;

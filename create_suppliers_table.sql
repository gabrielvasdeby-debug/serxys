-- Tabela de Fornecedores Atualizada
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    supply_type TEXT, -- NOVO CAMPO: Tipo de suprimento/peças
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Garantir que a coluna supply_type existe (caso a tabela já tenha sido criada)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'supply_type') THEN
        ALTER TABLE public.suppliers ADD COLUMN supply_type TEXT;
    END IF;
END $$;

-- Adicionar colunas de integração na tabela de transações (Caixa)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'supplier_id') THEN
        ALTER TABLE public.transactions ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'product_name') THEN
        ALTER TABLE public.transactions ADD COLUMN product_name TEXT;
    END IF;
END $$;

-- RLS
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE public.suppliers TO anon;
GRANT ALL ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO service_role;

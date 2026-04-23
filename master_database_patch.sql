-- =====================================================
-- SERVYX - MASTER DATABASE PATCH (PATCH FINAL)
-- =====================================================

-- 1. Extensões Necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Configurações da Empresa (Garante campos modernos)
CREATE TABLE IF NOT EXISTS public.company_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name TEXT,
    cnpj TEXT,
    whatsapp TEXT,
    phone TEXT,
    email TEXT,
    street TEXT,
    number TEXT,
    neighborhood TEXT,
    complement TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    logo_url TEXT,
    public_slug TEXT DEFAULT 'servyx',
    slug_history JSONB DEFAULT '[]',
    mensagem_acompanhamento_os TEXT DEFAULT 'Olá, {cliente} 👋\n\nJá está disponível o acompanhamento da sua Ordem de Serviço nº {os}.\nVocê pode visualizar todas as atualizações em tempo real pelo link abaixo:\n\n{link}\n\n{empresa}\nAgradecemos pela confiança em nossos serviços.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Atualização da Tabela de Produtos (Marca, Modelo e Estoque Mínimo)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='brand') THEN
        ALTER TABLE public.products ADD COLUMN brand TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='model') THEN
        ALTER TABLE public.products ADD COLUMN model TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_stock') THEN
        ALTER TABLE public.products ADD COLUMN min_stock INTEGER DEFAULT 5;
    END IF;
END $$;

-- 4. Tabela de Despesas (Garante Recorrência e Status)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    category TEXT,
    supplier TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    is_recurring BOOLEAN DEFAULT false,
    recurring_period TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Vendas (Garante Histórico do PDV)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number SERIAL,
    date TEXT,
    time TEXT,
    items JSONB DEFAULT '[]',
    total NUMERIC DEFAULT 0,
    payment_method TEXT,
    customer_name TEXT,
    user_id TEXT,
    user_name TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Receitas Manuais (Incomes)
CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Desativar RLS para facilitar integração inicial
ALTER TABLE public.company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes DISABLE ROW LEVEL SECURITY;

COMMENT ON DATABASE postgres IS 'Database atualizado com sucesso pelo Antigravity.';

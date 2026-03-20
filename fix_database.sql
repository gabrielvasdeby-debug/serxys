-- =====================================================
-- SERVYX - Complemento de Schema Supabase
-- Execute este SQL no Supabase SQL Editor para corrigir as tabelas faltantes
-- =====================================================

-- 1. Garante que a extensão de UUID está ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA: sales (Vendas para Analytics)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC DEFAULT 0,
  payment_method TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA: product_history (Histórico de Movimentação)
CREATE TABLE IF NOT EXISTS public.product_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  quantity INTEGER NOT NULL,
  reason TEXT, -- 'venda', 'os', 'ajuste', 'inicial'
  reference_id TEXT, -- ID da OS ou Transação
  date TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA: expenses (Despesas do Financeiro)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  category TEXT,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabelas Adicionais para o Caixa caso não existam
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

-- 6. Adiciona campos de auxílio caso não existam em cash_sessions
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_sessions' AND column_name='opened_by_name') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN opened_by_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_sessions' AND column_name='closed_by_name') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN closed_by_name TEXT;
  END IF;
END $$;

-- =====================================================
-- CORREÇÃO: ADICIONAR COLUNAS DE VENDAS
-- Execute este SQL no seu Supabase SQL Editor
-- =====================================================

-- 1. Garante que a tabela sales existe
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number INTEGER DEFAULT 0,
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

-- 2. Adiciona as colunas individualmente caso a tabela já exista mas esteja incompleta
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='sale_number') THEN
    ALTER TABLE public.sales ADD COLUMN sale_number INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='customer_name') THEN
    ALTER TABLE public.sales ADD COLUMN customer_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='time') THEN
    ALTER TABLE public.sales ADD COLUMN time TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='user_name') THEN
    ALTER TABLE public.sales ADD COLUMN user_name TEXT;
  END IF;

END $$;

-- 3. Desabilita RLS para facilitar integração inicial
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- 4. Notificação de sucesso
COMMENT ON TABLE public.sales IS 'Tabela de vendas atualizada com sucesso pelo Antigravity.';

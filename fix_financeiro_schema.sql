-- =====================================================
-- SERVYX - Correção do Schema Financeiro (Incomes & Expenses)
-- Execute este SQL no seu Supabase SQL Editor para corrigir a criação de novas contas
-- =====================================================

-- 1. Cria a tabela de 'incomes' (Contas a Receber Manuais) caso não exista
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adiciona as colunas ausentes na tabela 'expenses' (Contas a Pagar)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='status') THEN
    ALTER TABLE public.expenses ADD COLUMN status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='is_recurring') THEN
    ALTER TABLE public.expenses ADD COLUMN is_recurring BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='recurring_period') THEN
    ALTER TABLE public.expenses ADD COLUMN recurring_period TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='updated_at') THEN
    ALTER TABLE public.expenses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 3. Libera o Row Level Security para as novas tabelas
ALTER TABLE public.incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

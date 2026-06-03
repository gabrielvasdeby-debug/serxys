-- =====================================================
-- SERVYX - Campos Adicionais para Caixa
-- Execute este SQL no Supabase SQL Editor para atualizar a tabela cash_sessions
-- =====================================================

DO $$ 
BEGIN 
  -- total_entries
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_sessions' AND column_name='total_entries') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN total_entries NUMERIC DEFAULT 0;
  END IF;

  -- total_exits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_sessions' AND column_name='total_exits') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN total_exits NUMERIC DEFAULT 0;
  END IF;

  -- difference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_sessions' AND column_name='difference') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN difference NUMERIC DEFAULT 0;
  END IF;

  -- expected_balance
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_sessions' AND column_name='expected_balance') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN expected_balance NUMERIC DEFAULT 0;
  END IF;

  -- opened_by_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_sessions' AND column_name='opened_by_name') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN opened_by_name TEXT;
  END IF;

  -- closed_by_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_sessions' AND column_name='closed_by_name') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN closed_by_name TEXT;
  END IF;
END $$;

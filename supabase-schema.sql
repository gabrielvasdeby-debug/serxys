-- =====================================================
-- SERVYX - Schema Supabase
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Habilita UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: customers (Clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY DEFAULT (extract(epoch from now())::bigint::text),
  name TEXT NOT NULL,
  birth_date TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  document TEXT,
  address JSONB DEFAULT '{}',
  notes TEXT,
  devices JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: orders (Ordens de Serviço)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT (extract(epoch from now())::bigint::text),
  os_number INTEGER NOT NULL,
  customer_id TEXT REFERENCES public.customers(id),
  equipment JSONB DEFAULT '{}',
  checklist JSONB DEFAULT '{}',
  checklist_notes TEXT,
  defect TEXT,
  technician_notes TEXT,
  service TEXT,
  financials JSONB DEFAULT '{}',
  signatures JSONB DEFAULT '{}',
  status TEXT DEFAULT 'Entrada Registrada',
  priority TEXT DEFAULT 'Média',
  history JSONB DEFAULT '[]',
  completion_data JSONB,
  products_used JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: products (Produtos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image TEXT,
  category TEXT,
  description TEXT,
  barcode TEXT,
  price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: transactions (Transações do Caixa)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  description TEXT,
  value NUMERIC NOT NULL,
  payment_method TEXT,
  date TEXT,
  time TEXT,
  os_id TEXT,
  user_id TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: cash_sessions (Sessões de Caixa)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TEXT NOT NULL,
  opening_balance NUMERIC DEFAULT 0,
  closing_balance NUMERIC,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_by TEXT,
  closed_by TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- =====================================================
-- TABELA: receivables (Contas a Receber)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.receivables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT,
  value NUMERIC NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  customer_name TEXT,
  os_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: payables (Contas a Pagar)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT,
  value NUMERIC NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  supplier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: agenda (Agenda)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.agenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  time TEXT,
  duration INTEGER DEFAULT 60,
  technician_id TEXT,
  order_id TEXT,
  status TEXT DEFAULT 'agendado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: app_settings (Configurações do Sistema)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração inicial do contador de OS
INSERT INTO public.app_settings (key, value)
VALUES ('os_settings', '{"nextOsNumber": 1, "checklistItems": ["Tela", "Touch", "Câmera", "Áudio", "Microfone", "Botões", "WiFi", "Bluetooth", "Carregamento"]}')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- POLITICAS DE ACESSO (Row Level Security)
-- Deixa aberto por enquanto para testes, configure depois
-- =====================================================
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;

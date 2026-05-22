-- =====================================================
-- OTIMIZAÇÃO: CRIAR ÍNDICES PARA FILTROS POR EMPRESA (company_id)
-- Execute este SQL no Supabase SQL Editor para reduzir o consumo de CPU e RAM
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON public.orders(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_company_id ON public.cash_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON public.sales(company_id);
CREATE INDEX IF NOT EXISTS idx_receivables_company_id ON public.receivables(company_id);
CREATE INDEX IF NOT EXISTS idx_payables_company_id ON public.payables(company_id);
CREATE INDEX IF NOT EXISTS idx_agenda_company_id ON public.agenda(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- Analisar as tabelas para atualizar as estatísticas do planejador de consultas
ANALYZE public.customers;
ANALYZE public.orders;
ANALYZE public.products;
ANALYZE public.transactions;
ANALYZE public.cash_sessions;
ANALYZE public.sales;
ANALYZE public.receivables;
ANALYZE public.payables;
ANALYZE public.agenda;
ANALYZE public.profiles;

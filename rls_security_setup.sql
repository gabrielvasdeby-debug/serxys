-- ======================================================
-- BLINDAGEM DE SEGURANÇA SERVYX SaaS (LGPD READY) - v3 (Recursion Fix)
-- ======================================================
-- ESTE SCRIPT DEVE SER EXECUTADO NO SQL EDITOR DO SUPABASE
-- ======================================================

-- 1. ADICIONAR COLUNAS DE EMPRESA (GARANTIR QUE EXISTEM)
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS services ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS cash_sessions ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS incomes ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS expenses ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS agenda ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS product_history ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS warranties ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS dismissed_notifications ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS company_settings ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS app_settings ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. FUNÇÃO PARA QUEBRAR RECURSÃO (SECURITY DEFINER)
-- Esta função busca o company_id do usuário sem disparar o RLS recursivamente
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM profiles WHERE user_id::text = auth.uid()::text LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. HABILITAR RLS (ROW LEVEL SECURITY)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;

-- 4. REMOVER POLÍTICAS ANTIGAS (EVITAR CONFLITOS)
DROP POLICY IF EXISTS "Isolamento por Empresa - Orders" ON orders;
DROP POLICY IF EXISTS "Isolamento por Empresa - Customers" ON customers;
DROP POLICY IF EXISTS "Isolamento por Empresa - Products" ON products;
DROP POLICY IF EXISTS "Isolamento por Empresa - Incomes" ON incomes;
DROP POLICY IF EXISTS "Isolamento por Empresa - Expenses" ON expenses;
DROP POLICY IF EXISTS "Configurações Privadas - Company" ON company_settings;
DROP POLICY IF EXISTS "Configurações Privadas - App" ON app_settings;
DROP POLICY IF EXISTS "Acesso aos Perfis da Empresa" ON profiles;
DROP POLICY IF EXISTS "Acesso Público Portal do Cliente" ON orders;

-- 5. NOVAS POLÍTICAS USANDO A FUNÇÃO get_my_company_id()

-- PROFILES: O usuário pode ver o seu próprio perfil OU perfis da mesma empresa
CREATE POLICY "Acesso aos Perfis da Empresa" ON profiles
FOR ALL USING (
  user_id::text = auth.uid()::text 
  OR 
  company_id::text = get_my_company_id()::text
);

-- ORDERS
CREATE POLICY "Isolamento por Empresa - Orders" ON orders
FOR ALL USING (company_id::text = get_my_company_id()::text);

-- CUSTOMERS
CREATE POLICY "Isolamento por Empresa - Customers" ON customers
FOR ALL USING (company_id::text = get_my_company_id()::text);

-- PRODUCTS
CREATE POLICY "Isolamento por Empresa - Products" ON products
FOR ALL USING (company_id::text = get_my_company_id()::text);

-- FINANCEIRO / CAIXA (Exemplos)
CREATE POLICY "Isolamento por Empresa - Incomes" ON incomes
FOR ALL USING (company_id::text = get_my_company_id()::text);

CREATE POLICY "Isolamento por Empresa - Expenses" ON expenses
FOR ALL USING (company_id::text = get_my_company_id()::text);

-- CONFIGURAÇÕES (Usa o ID da empresa como filtro principal)
CREATE POLICY "Configurações Privadas - Company" ON company_settings
FOR ALL USING (id::text = get_my_company_id()::text);

CREATE POLICY "Configurações Privadas - App" ON app_settings
FOR ALL USING (company_id::text = get_my_company_id()::text);

-- ACESSO PÚBLICO (PORTAL DO CLIENTE)
CREATE POLICY "Acesso Público Portal do Cliente" ON orders
FOR SELECT USING (true);

-- ======================================================
-- ORIENTAÇÕES:
-- 1. Rode este script v3 no SQL Editor.
-- 2. Ele criará a função 'get_my_company_id' que resolve a recursão.
-- 3. A partir daqui, o erro de recursão infinita deve desaparecer.
-- ======================================================

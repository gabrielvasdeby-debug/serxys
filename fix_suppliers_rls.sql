-- ======================================================
-- CORREÇÃO DE RLS: FORNECEDORES (Suppliers)
-- Execute este script no SQL Editor do Supabase
-- ======================================================

-- 1. Adiciona política de isolamento por empresa para fornecedores
-- Isso permite visualizar/inserir/editar/deletar apenas dados da sua própria conta
DROP POLICY IF EXISTS "Isolamento por Empresa - Suppliers" ON suppliers;

CREATE POLICY "Isolamento por Empresa - Suppliers" ON suppliers
FOR ALL USING (company_id::text = get_my_company_id()::text);

-- 2. Garante que o RLS está habilitado para a tabela
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 3. Garante permissões de nível de tabela
GRANT ALL ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO service_role;

-- 4. Opcional: Se for necessário permitir que o e-mail seja nulo (correção comum)
ALTER TABLE public.suppliers ALTER COLUMN email DROP NOT NULL;

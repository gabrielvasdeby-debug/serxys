-- Script de Correção de Segurança para Garantias (warranties)
-- Execute este script no SQL Editor do Supabase para liberar o acesso baseado em empresa.

-- 1. Garantir que a coluna company_id existe (reforço)
ALTER TABLE IF EXISTS public.warranties ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Garantir que o RLS está habilitado
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Isolamento por Empresa - Warranties" ON public.warranties;
DROP POLICY IF EXISTS "Acesso Público Certificado Garantia" ON public.warranties;

-- 4. Criar política de isolamento por empresa (CRUD completo)
CREATE POLICY "Isolamento por Empresa - Warranties" ON public.warranties
FOR ALL USING (company_id::text = get_my_company_id()::text);

-- 5. Criar política de acesso público para visualização (Consultar pelo os_id no portal)
CREATE POLICY "Acesso Público Certificado Garantia" ON public.warranties
FOR SELECT USING (true);

-- 6. Garantir permissões de acesso
GRANT ALL ON TABLE public.warranties TO anon;
GRANT ALL ON TABLE public.warranties TO authenticated;
GRANT ALL ON TABLE public.warranties TO service_role;

-- =====================================================
-- CORREÇÃO DE DUPLICIDADE EM APP_SETTINGS E ORDERS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Limpar a tabela app_settings
-- Remove duplicatas mantendo apenas o registro mais recente para cada chave
DELETE FROM public.app_settings 
WHERE id NOT IN (
    SELECT id FROM (
        SELECT DISTINCT ON (key) id 
        FROM public.app_settings 
        ORDER BY key, updated_at DESC
    ) t
);

-- Adiciona a restrição UNIQUE na coluna 'key' para evitar que isso aconteça novamente
-- Caso já exista, o script apenas segue em frente
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_key_key') THEN
        ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_key_key UNIQUE (key);
    END IF;
END $$;

-- 2. Corrigir as OS duplicadas (Número 1)
-- Identifica a OS mais recente que está com número 1 e a renomeia para 2
UPDATE public.orders 
SET os_number = 2 
WHERE id = (
    SELECT id 
    FROM public.orders 
    WHERE os_number = 1 
    ORDER BY created_at DESC 
    LIMIT 1
) 
AND (SELECT count(*) FROM public.orders WHERE os_number = 1) > 1;

-- 3. Sincronizar o contador para a próxima numeração livre (3)
-- Isso garante que a próxima OS criada comece do 3, sem furos ou duplicatas
INSERT INTO public.app_settings (key, value, updated_at)
VALUES (
    'os_settings', 
    '{"nextOsNumber": 3}',
    NOW()
)
ON CONFLICT (key) 
DO UPDATE SET 
    value = jsonb_set(COALESCE(public.app_settings.value, '{}')::jsonb, '{nextOsNumber}', '3'::jsonb),
    updated_at = NOW();

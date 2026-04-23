-- Execute este SQL no Supabase SQL Editor para dar suporte à nova funcionalidade de permissões customizadas e PIN por perfil.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pin TEXT;

-- Comentários das novas colunas para documentação:
COMMENT ON COLUMN public.profiles.permissions IS 'Lista de IDs dos módulos que este perfil tem permissão de acessar (ex: ["clientes", "nova_os"]).';
COMMENT ON COLUMN public.profiles.pin IS 'Senha (PIN) opcional de 4 dígitos para proteger o acesso a este perfil.';

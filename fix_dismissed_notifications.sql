-- Consertar tabela de notificações dispensadas
-- Remover a restrição de UUID e adicionar os campos faltantes

ALTER TABLE dismissed_notifications DROP CONSTRAINT IF EXISTS dismissed_notifications_entity_id_fkey;
ALTER TABLE dismissed_notifications ALTER COLUMN entity_id TYPE TEXT;

-- Adicionar company_id se não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dismissed_notifications' AND column_name='company_id') THEN
    ALTER TABLE dismissed_notifications ADD COLUMN company_id UUID;
  END IF;
END $$;

-- Recriar a restrição UNIQUE para incluir company_id
ALTER TABLE dismissed_notifications DROP CONSTRAINT IF EXISTS dismissed_notifications_user_id_type_entity_id_period_key;
ALTER TABLE dismissed_notifications ADD CONSTRAINT dismissed_notifications_unique_v2 UNIQUE(user_id, company_id, type, entity_id, period);

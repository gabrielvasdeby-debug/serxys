-- Script Completo para Criar Tabela de Notificações Dispensadas
-- Este script cria a tabela com os tipos de dados corretos e políticas de segurança

DROP TABLE IF EXISTS dismissed_notifications;

CREATE TABLE dismissed_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  type TEXT NOT NULL, -- 'BIRTHDAY', 'FOLLOW_UP', 'OS_SIGNED'
  entity_id TEXT NOT NULL, -- ID do cliente ou da OS (em formato TEXT para compatibilidade)
  period TEXT DEFAULT '', -- Diferenciador (ex: ano ou data específica)
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garante que o mesmo usuário não veja o mesmo alerta repetido
  UNIQUE(user_id, company_id, type, entity_id, period)
);

-- Habilitar RLS
ALTER TABLE dismissed_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Usuários podem ler suas próprias dispensas" 
ON dismissed_notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias dispensas" 
ON dismissed_notifications FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias dispensas" 
ON dismissed_notifications FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

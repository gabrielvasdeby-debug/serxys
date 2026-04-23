-- Criar tabela de notificações dispensadas
CREATE TABLE IF NOT EXISTS dismissed_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'BIRTHDAY', 'FOLLOW_UP'
  entity_id UUID NOT NULL, -- ID do cliente (para aniversário) ou OS (para pós-venda)
  period TEXT, -- Para aniversário: '2024'; para pós-venda: '2024-04-06'
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que não duplique a mesma notificação para o mesmo período
  UNIQUE(user_id, type, entity_id, period)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE dismissed_notifications ENABLE ROW LEVEL SECURITY;

-- Política para usuários lerem e criarem suas próprias dispensas
CREATE POLICY "Usuários podem ler suas próprias dispensas" 
ON dismissed_notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias dispensas" 
ON dismissed_notifications FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

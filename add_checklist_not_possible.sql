-- Adiciona coluna checklist_not_possible na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS checklist_not_possible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS entry_photos JSONB DEFAULT '[]';

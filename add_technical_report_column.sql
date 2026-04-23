
-- Adiciona colunas faltantes na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS technical_report JSONB,
ADD COLUMN IF NOT EXISTS is_visual_checklist BOOLEAN DEFAULT FALSE;

-- Garante que outras colunas importantes existam
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'checklist_not_possible') THEN
        ALTER TABLE public.orders ADD COLUMN checklist_not_possible BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'entry_photos') THEN
        ALTER TABLE public.orders ADD COLUMN entry_photos JSONB DEFAULT '[]';
    END IF;
END $$;

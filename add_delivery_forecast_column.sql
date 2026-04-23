ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_forecast TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.delivery_forecast IS 'Data e hora prevista para a entrega do equipamento ao cliente.';

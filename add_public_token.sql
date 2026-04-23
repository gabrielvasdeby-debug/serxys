-- Add public_token to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_token TEXT DEFAULT md5(random()::text);

-- Update existing orders with a random token
UPDATE public.orders SET public_token = md5(random()::text) WHERE public_token IS NULL;

-- Make it unique and indexed
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_token ON public.orders(public_token);

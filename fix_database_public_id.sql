-- ==========================================================
-- SERVYX DATABASE REPAIR: RESTORE PUBLIC PORTAL (V5)
-- ==========================================================

-- 1. ADICIONAR COLUNA public_id CASO NÃO EXISTA
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();

-- 2. GARANTIR QUE TODOS TENHAM UM public_id (Apenas se estiver nulo)
-- Não tentamos mais copiar o ID para cá, pois o ID não é um UUID válido
UPDATE public.orders SET public_id = gen_random_uuid() WHERE public_id IS NULL;

-- 3. GARANTIR QUE A COLUNA public_expires_at EXISTE
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_expires_at TIMESTAMPTZ;

-- 4. RE-CRIAR ÍNDICES
DROP INDEX IF EXISTS idx_orders_public_id;
CREATE INDEX idx_orders_public_id ON public.orders(public_id);

-- 5. LIMPAR FUNÇÕES ANTIGAS
DROP FUNCTION IF EXISTS public.get_public_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_public_order(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_order_public_id(text, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_public_customer(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_public_customer(text) CASCADE;
DROP FUNCTION IF EXISTS public.public_sign_order(uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.public_sign_order(text, text, jsonb) CASCADE;

-- 6. FUNÇÃO get_public_order (Agora aceita TEXT para suportar IDs numéricos e UUIDs)
CREATE OR REPLACE FUNCTION public.get_public_order(p_public_id text)
RETURNS TABLE (
    id text,
    company_id uuid,
    os_number int,
    status text,
    equipment jsonb,
    defect text,
    service text,
    financials jsonb,
    signatures jsonb,
    budget jsonb,
    technical_report jsonb,
    completion_data jsonb,
    history jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    customer_id uuid,
    public_id uuid,
    public_expires_at timestamptz,
    access_status text
) 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    o.id::text, o.company_id, o.os_number, o.status, o.equipment,
    o.defect, o.service, o.financials, o.signatures, 
    o.budget, o.technical_report, o.completion_data, 
    o.history, o.created_at, o.updated_at,
    o.customer_id, o.public_id, o.public_expires_at,
    CASE 
      WHEN o.public_expires_at IS NOT NULL AND o.public_expires_at < now() THEN 'EXPIRED'
      ELSE 'SUCCESS'
    END as access_status
  FROM public.orders o 
  WHERE o.public_id::text = p_public_id OR o.id::text = p_public_id;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNÇÃO get_order_public_id
CREATE OR REPLACE FUNCTION public.get_order_public_id(p_slug text, p_os_number int)
RETURNS TABLE (p_id text) 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY 
  SELECT o.id::text 
  FROM public.orders o
  JOIN public.company_settings c ON c.id = o.company_id
  WHERE c.public_slug = p_slug AND o.os_number = p_os_number;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNÇÃO get_public_customer
CREATE OR REPLACE FUNCTION public.get_public_customer(p_public_id text)
RETURNS TABLE (name text, whatsapp text, phone text, email text, address jsonb, document text) 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY 
  SELECT c.name, c.whatsapp, c.phone, c.email, c.address, c.document 
  FROM public.customers c
  JOIN public.orders o ON o.customer_id = c.id
  WHERE o.public_id::text = p_public_id OR o.id::text = p_public_id;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNÇÃO public_sign_order
CREATE OR REPLACE FUNCTION public.public_sign_order(p_public_id text, p_signature text, p_history_event jsonb)
RETURNS void 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  UPDATE public.orders 
  SET 
    signatures = jsonb_set(COALESCE(signatures, '{}'::jsonb), '{client}', to_jsonb(p_signature)),
    history = COALESCE(history, '[]'::jsonb) || p_history_event,
    updated_at = now()
  WHERE public_id::text = p_public_id OR id::text = p_public_id;
END;
$$ LANGUAGE plpgsql;

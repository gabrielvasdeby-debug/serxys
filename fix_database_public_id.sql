-- ==========================================================
-- SERVYX DATABASE REPAIR: RESTORE PUBLIC PORTAL
-- ==========================================================
-- ESTE SCRIPT CORRIGE O ERRO "column orders.public_id does not exist"
-- E RESTAURA O FUNCIONAMENTO DO PORTAL DO CLIENTE.
-- ==========================================================

-- 1. ADICIONAR COLUNA public_id CASO NÃO EXISTA
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();

-- 2. POPULAR public_id COM O ID ATUAL PARA QUEM ESTÁ VAZIO (Compatibilidade)
UPDATE public.orders SET public_id = id WHERE public_id IS NULL;

-- 3. GARANTIR QUE A COLUNA public_expires_at EXISTE
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_expires_at TIMESTAMPTZ;

-- 4. RE-CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_orders_public_id ON public.orders(public_id);

-- 5. ATUALIZAR FUNÇÃO get_public_order
CREATE OR REPLACE FUNCTION get_public_order(p_public_id uuid)
RETURNS TABLE (
    id uuid, company_id uuid, os_number int, status text, equipment jsonb,
    defect text, service text, financials jsonb, signatures jsonb, 
    budget jsonb, technical_report jsonb, completion_data jsonb, 
    history jsonb, created_at timestamptz, updated_at timestamptz,
    customer_id uuid, public_id uuid, public_expires_at timestamptz,
    access_status text
) 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    o.id, o.company_id, o.os_number, o.status, o.equipment,
    o.defect, o.service, o.financials, o.signatures, 
    o.budget, o.technical_report, o.completion_data, 
    o.history, o.created_at, o.updated_at,
    o.customer_id, o.public_id, o.public_expires_at,
    CASE 
      WHEN o.public_expires_at < now() THEN 'EXPIRED'
      ELSE 'SUCCESS'
    END as access_status
  FROM public.orders o 
  WHERE o.public_id = p_public_id OR o.id = p_public_id;
END;
$$ LANGUAGE plpgsql;

-- 6. ATUALIZAR FUNÇÃO get_order_public_id
CREATE OR REPLACE FUNCTION get_order_public_id(p_slug text, p_os_number int)
RETURNS TABLE (p_id uuid) 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY 
  SELECT o.id 
  FROM public.orders o
  JOIN public.company_settings c ON c.id = o.company_id
  WHERE c.public_slug = p_slug AND o.os_number = p_os_number;
END;
$$ LANGUAGE plpgsql;

-- 7. ATUALIZAR FUNÇÃO get_public_customer
CREATE OR REPLACE FUNCTION get_public_customer(p_public_id uuid)
RETURNS TABLE (
    name text, whatsapp text, phone text, email text, address text
) 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY 
  SELECT c.name, c.whatsapp, c.phone, c.email, c.address 
  FROM public.customers c
  JOIN public.orders o ON o.customer_id = c.id
  WHERE o.public_id = p_public_id OR o.id = p_public_id;
END;
$$ LANGUAGE plpgsql;

-- 8. ATUALIZAR FUNÇÃO public_sign_order
CREATE OR REPLACE FUNCTION public_sign_order(p_public_id uuid, p_signature text, p_history_event jsonb)
RETURNS void 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  UPDATE public.orders 
  SET 
    signatures = jsonb_set(COALESCE(signatures, '{}'::jsonb), '{client}', to_jsonb(p_signature)),
    history = COALESCE(history, '[]'::jsonb) || p_history_event,
    updated_at = now()
  WHERE public_id = p_public_id OR id = p_public_id;
END;
$$ LANGUAGE plpgsql;


-- ==========================================================
-- SERVYX ROBUSTNESS PATCH V7: ANTI-SPAM & LIFE CYCLE
-- ==========================================================

-- 1. INFRAESTRUTURA DE PERFORMANCE E CONTROLE
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_public_id ON public.orders(public_id);
CREATE INDEX IF NOT EXISTS idx_rpc_logs_created_at ON public.rpc_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rpc_logs_public_id ON public.rpc_access_logs(public_id);

-- 2. FUNÇÃO DE LIMPEZA DE LOGS (Autolimpante)
CREATE OR REPLACE FUNCTION clean_old_rpc_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rpc_access_logs WHERE created_at < (now() - interval '30 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO PARA REGERAR LINK (INVALIDAÇÃO INSTANTÂNEA)
CREATE OR REPLACE FUNCTION regenerate_order_link(p_order_id uuid)
RETURNS uuid 
SET search_path = public
SECURITY DEFINER AS $$
DECLARE
    v_new_public_id uuid := gen_random_uuid();
BEGIN
  -- Somente usurios autenticados podem regerar
  IF auth.role() != 'authenticated' THEN RETURN NULL; END IF;

  UPDATE public.orders SET public_id = v_new_public_id WHERE id = p_order_id;
  RETURN v_new_public_id;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNÇÃO INTERNA DE RATE LIMITING
CREATE OR REPLACE FUNCTION check_rpc_spam(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INT;
BEGIN
  SELECT count(*) INTO v_count 
  FROM public.rpc_access_logs 
  WHERE public_id = p_id AND created_at > (now() - interval '5 minutes');
  
  -- Se houver mais de 15 acessos em 5 min para o mesmo ID, bloqueia
  RETURN v_count > 15;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPCs ATUALIZADAS COM ANTI-SPAM E EXPIRAÇÃO

-- A. BUSCAR OS
CREATE OR REPLACE FUNCTION get_public_order(p_public_id uuid)
RETURNS TABLE (
    id uuid, company_id uuid, os_number int, status text, equipment jsonb,
    defect text, service text, financials jsonb, signatures jsonb, 
    budget jsonb, technical_report jsonb, completion_data jsonb, 
    history jsonb, created_at timestamptz, updated_at timestamptz,
    customer_id uuid, public_id uuid, public_expires_at timestamptz
) 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  -- 1. Validar Expiraão e Spam
  IF EXISTS (SELECT 1 FROM public.orders WHERE public_id = p_public_id AND (public_expires_at < now())) THEN 
    RETURN; 
  END IF;
  
  IF check_rpc_spam(p_public_id) THEN 
    RETURN; 
  END IF;

  -- 2. Logar Acesso
  PERFORM log_rpc_access(p_public_id, 'FETCH_ORDER');
  
  RETURN QUERY SELECT * FROM public.orders WHERE orders.public_id = p_public_id;
END;
$$ LANGUAGE plpgsql;

-- B. BUSCAR CLIENTE
CREATE OR REPLACE FUNCTION get_public_customer(p_public_id uuid)
RETURNS TABLE (
    name text, whatsapp text, phone text, email text, address jsonb, document text
) 
SET search_path = public
SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE public_id = p_public_id AND (public_expires_at < now())) THEN RETURN; END IF;
  IF check_rpc_spam(p_public_id) THEN RETURN; END IF;

  RETURN QUERY 
  SELECT c.name, c.whatsapp, c.phone, c.email, c.address, c.document 
  FROM public.customers c
  JOIN public.orders o ON o.customer_id = c.id
  WHERE o.public_id = p_public_id;
END;
$$ LANGUAGE plpgsql;

-- C. ASSINAR OS (BLOQUEIO DE EXPIRADOS)
CREATE OR REPLACE FUNCTION public_sign_order(p_public_id uuid, p_signature text, p_history_event jsonb)
RETURNS void 
SET search_path = public
SECURITY DEFINER AS $$
DECLARE
    v_status text;
    v_expires timestamptz;
BEGIN
  SELECT status, public_expires_at INTO v_status, v_expires FROM public.orders WHERE public_id = p_public_id;
  
  IF v_status IS NULL OR (v_expires < now()) OR check_rpc_spam(p_public_id) THEN RETURN; END IF;
  IF v_status IN ('Reparo Concluído', 'Equipamento Retirado', 'Orçamento Cancelado', 'Sem Reparo') THEN RETURN; END IF;

  UPDATE public.orders 
  SET 
    signatures = jsonb_set(signatures, '{client}', to_jsonb(p_signature)),
    history = history || p_history_event,
    updated_at = now()
  WHERE public_id = p_public_id;

  PERFORM log_rpc_access(p_public_id, 'SIGNATURE');
END;
$$ LANGUAGE plpgsql;

-- D. APROVAR ORÇAMENTO
CREATE OR REPLACE FUNCTION public_approve_budget(p_public_id uuid, p_budget jsonb, p_history_event jsonb)
RETURNS void 
SET search_path = public
SECURITY DEFINER AS $$
DECLARE
    v_status text;
    v_budget_status text;
    v_expires timestamptz;
BEGIN
  SELECT status, (budget->>'status'), public_expires_at INTO v_status, v_budget_status, v_expires 
  FROM public.orders WHERE public_id = p_public_id;
  
  IF v_status IS NULL OR (v_expires < now()) OR check_rpc_spam(p_public_id) THEN RETURN; END IF;
  IF v_status IN ('Reparo Concluído', 'Equipamento Retirado') OR v_budget_status = 'Aprovado' THEN RETURN; END IF;

  UPDATE public.orders 
  SET 
    budget = p_budget,
    status = 'Em Manutenção',
    history = history || p_history_event,
    updated_at = now()
  WHERE public_id = p_public_id;

  PERFORM log_rpc_access(p_public_id, 'BUDGET_APPROVE');
END;
$$ LANGUAGE plpgsql;

create or replace function public.fetch_caixa_data(p_company_id text)
returns jsonb
language plpgsql
as $$
declare
  v_products jsonb;
  v_customers jsonb;
  v_cash_sessions jsonb;
  v_sales jsonb;
  v_transactions jsonb;
begin
  select jsonb_agg(to_jsonb(p)) into v_products
  from public.products p where p.company_id = p_company_id;

  select jsonb_agg(to_jsonb(c)) into v_customers
  from public.customers c where c.company_id = p_company_id;

  select jsonb_agg(to_jsonb(cs)) into v_cash_sessions
  from public.cash_sessions cs where cs.company_id = p_company_id;

  select jsonb_agg(to_jsonb(s)) into v_sales
  from public.sales s where s.company_id = p_company_id;

  select jsonb_agg(to_jsonb(t)) into v_transactions
  from public.transactions t where t.company_id = p_company_id;

  return jsonb_build_object(
    'products', coalesce(v_products, '[]'::jsonb),
    'customers', coalesce(v_customers, '[]'::jsonb),
    'cash_sessions', coalesce(v_cash_sessions, '[]'::jsonb),
    'sales', coalesce(v_sales, '[]'::jsonb),
    'transactions', coalesce(v_transactions, '[]'::jsonb)
  );
end;
$$;

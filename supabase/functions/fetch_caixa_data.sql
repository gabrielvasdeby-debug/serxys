-- Remove TODAS as versões antigas da função para evitar conflito (ambiguidade)
DROP FUNCTION IF EXISTS public.fetch_caixa_data(text, date);
DROP FUNCTION IF EXISTS public.fetch_caixa_data(uuid, date);
DROP FUNCTION IF EXISTS public.fetch_caixa_data(text, text);
DROP FUNCTION IF EXISTS public.fetch_caixa_data(uuid, text);

-- Cria a versão final e correta
create or replace function public.fetch_caixa_data(p_company_id uuid, p_date text)
returns jsonb
language sql
stable
parallel safe
as $$
  select jsonb_build_object(
    'products', coalesce(
      (select jsonb_agg(to_jsonb(p) order by p.name)
       from public.products p
       where p.company_id = p_company_id
       limit 500),
      '[]'::jsonb
    ),
    'customers', coalesce(
      (select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
       from public.customers c
       where c.company_id = p_company_id
       limit 1000),
      '[]'::jsonb
    ),
    'cash_sessions', coalesce(
      (select jsonb_agg(to_jsonb(cs) order by cs.opened_at desc)
       from public.cash_sessions cs
       where cs.company_id = p_company_id and cs.date::text = p_date),
      '[]'::jsonb
    ),
    'sales', coalesce(
      (select jsonb_agg(to_jsonb(s) order by s.created_at desc)
       from public.sales s
       where s.company_id = p_company_id and s.date::text = p_date),
      '[]'::jsonb
    ),
    'transactions', coalesce(
      (select jsonb_agg(to_jsonb(t) order by t.created_at desc)
       from public.transactions t
       where t.company_id = p_company_id and t.date::text = p_date),
      '[]'::jsonb
    )
  );
$$;

grant execute on function public.fetch_caixa_data(uuid, text) to authenticated;
grant execute on function public.fetch_caixa_data(uuid, text) to service_role;

// app/hooks/useCaixaData.ts
import useSWR from 'swr';
import { supabase } from '../supabase';
import type { CaixaData } from '../types';

const fetchDirect = async (companyId: string, date: string): Promise<CaixaData> => {
  const [productsRes, customersRes, sessionsRes, salesRes, transactionsRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, stock, category, min_stock, barcode, brand, model, image')
      .eq('company_id', companyId)
      .limit(500),
    supabase
      .from('customers')
      .select('id, name')
      .eq('company_id', companyId)
      .limit(1000),
    supabase
      .from('cash_sessions')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', date)
      .order('opened_at', { ascending: false }),
    supabase
      .from('sales')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', date)
      .order('created_at', { ascending: false }),
    supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', date)
      .order('created_at', { ascending: false }),
  ]);

  // Map transactions to camelCase for compatibility with CaixaModule
  const mappedTransactions = (transactionsRes.data || []).map((t: any) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    value: Number(t.value),
    paymentMethod: t.payment_method,
    date: t.date,
    time: t.time,
    osId: t.os_id,
    userId: t.user_id,
    createdAt: t.created_at,
  }));

  // Map cash_sessions to camelCase for compatibility with CaixaModule
  const mappedSessions = (sessionsRes.data || []).map((s: any) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    initialValue: s.opening_balance,
    openingTime: s.opened_at ? new Date(s.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    openingUser: s.opened_by,
    openingUserName: s.opened_by_name || '',
    closingTime: s.closed_at ? new Date(s.closed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    closingUserName: s.closed_by_name || '',
    finalValue: s.closing_balance,
    company_id: s.company_id,
  }));

  // Map sales to camelCase for compatibility with CaixaModule
  const mappedSales = (salesRes.data || []).map((s: any) => ({
    id: s.id,
    saleNumber: s.sale_number,
    date: s.date,
    time: s.time,
    items: s.items || [],
    total: Number(s.total),
    paymentMethod: s.payment_method,
    customerName: s.customer_name,
    company_id: s.company_id,
    userId: s.user_id,
    sessionId: s.session_id,
    createdAt: s.created_at,
  }));

  // Map products to camelCase for compatibility
  const mappedProducts = (productsRes.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category,
    minStock: p.min_stock,
    barcode: p.barcode,
    brand: p.brand,
    model: p.model,
    image: p.image,
  }));

  return {
    products: mappedProducts,
    customers: customersRes.data || [],
    cash_sessions: mappedSessions,
    sales: mappedSales,
    transactions: mappedTransactions,
  };
};

const fetchViaRPC = async (companyId: string, date: string): Promise<CaixaData> => {
  const { data, error } = await supabase
    .rpc('fetch_caixa_data', { p_company_id: companyId, p_date: date })
    .single();
  if (error) throw error;
  return data as CaixaData;
};

const fetcher = async ([companyId, date]: [string, string]): Promise<CaixaData> => {
  try {
    // Tenta usar a RPC nativa do banco (1 única requisição, muito mais rápido)
    return await fetchViaRPC(companyId, date);
  } catch (rpcError) {
    console.warn('RPC fetch_caixa_data falhou, usando fallback com queries diretas:', rpcError);
    return await fetchDirect(companyId, date);
  }
};

export const useCaixaData = (companyId: string, date: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    companyId && date ? [companyId, date] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 30000,
    }
  );
  return { data, error, isLoading, mutate };
};

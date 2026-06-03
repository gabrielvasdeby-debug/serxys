// app/hooks/useCaixaData.ts
import { useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from '../supabase';
import type { CaixaData } from '../types';

export const useCaixaData = (companyId: string, date: string) => {
  // 1. DADOS ESTÁTICOS PESADOS (Produtos e Clientes) - Cacheados por 5 minutos
  const { data: staticData, isLoading: loadingStatic } = useSWR(
    companyId ? ['caixa_static', companyId] : null,
    async () => {
      const [productsRes, customersRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, price, stock, category, min_stock, barcode, brand, model')
          .eq('company_id', companyId)
          .limit(500),
        supabase
          .from('customers')
          .select('id, name')
          .eq('company_id', companyId)
          .limit(1000)
      ]);

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
      }));

      return {
        products: mappedProducts,
        customers: customersRes.data || []
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 300000, // 5 minutos de cache - não baixa de novo ao trocar de data
    }
  );

  // 2. DADOS DIÁRIOS LEVES (Caixa, Vendas, Transações) - Cacheados por 30s
  const { data: dailyData, isLoading: loadingDaily, mutate } = useSWR(
    companyId && date ? ['caixa_daily', companyId, date] : null,
    async () => {
      const [sessionsRes, salesRes, transactionsRes] = await Promise.all([
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
        total_entries: s.total_entries ? Number(s.total_entries) : 0,
        total_exits: s.total_exits ? Number(s.total_exits) : 0,
        difference: s.difference ? Number(s.difference) : 0,
        expected_balance: s.expected_balance ? Number(s.expected_balance) : 0,
      }));

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

      return {
        cash_sessions: mappedSessions,
        sales: mappedSales,
        transactions: mappedTransactions,
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 30000,
    }
  );

  const combinedData = useMemo(() => {
    if (!staticData || !dailyData) return undefined;
    return { ...staticData, ...dailyData };
  }, [staticData, dailyData]);

  return {
    data: combinedData,
    error: null,
    isLoading: loadingStatic || loadingDaily,
    mutate
  };
};

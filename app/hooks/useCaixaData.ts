// app/hooks/useCaixaData.ts
import useSWR from 'swr';
import { supabase } from '../supabase';
import type { CaixaData } from '../types';

const fetcher = async (companyId: string, date: string): Promise<CaixaData> => {
  const { data, error } = await supabase
    .rpc('fetch_caixa_data', { p_company_id: companyId, p_date: date })
    .single();
  if (error) throw error;
  return data as CaixaData;
};

export const useCaixaData = (companyId: string, date: string) => {
  const { data, error, isLoading, mutate } = useSWR([companyId, date], fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
  return { data, error, isLoading, mutate };
};

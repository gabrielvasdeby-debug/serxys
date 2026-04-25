'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  ArrowLeft, Calendar, TrendingUp, TrendingDown, 
  Target, Wrench, Package, ListChecks, Filter,
  ChevronDown, Download, RefreshCw
} from 'lucide-react';
import { supabase } from '../supabase';
import { subDays, format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RelatoriosModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
    company_id: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
  customers: any[];
}

type Period = 'today' | 'week' | 'month' | 'custom';

export default function RelatoriosModule({ profile, onBack, onShowToast, customers }: RelatoriosModuleProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Security check - redundancy
  if (profile.type !== 'ADM' && profile.role !== 'ADM') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
        <p className="text-zinc-500 mb-8 text-sm">Esta área é restrita para Administradores.</p>
        <button onClick={onBack} className="bg-white/5 px-8 py-3 rounded-xl border border-white/5 text-white font-bold text-xs uppercase tracking-widest transition-colors hover:bg-white/10">Voltar</button>
      </div>
    );
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, salesRes, transRes, expensesRes] = await Promise.all([
        supabase.from('orders').select('*').eq('company_id', profile.company_id),
        supabase.from('sales').select('*').eq('company_id', profile.company_id),
        supabase.from('transactions').select('*').eq('company_id', profile.company_id),
        supabase.from('expenses').select('*').eq('company_id', profile.company_id)
      ]);

      setOrders(ordersRes.data || []);
      setSales(salesRes.data || []);
      setTransactions(transRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      onShowToast('Erro ao carregar dados dos relatórios');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    try {
      if (filteredData.fOrders.length === 0 && filteredData.fSales.length === 0) {
        onShowToast('Não há dados para exportar neste período');
        return;
      }

      let csv = 'Tipo;ID/Numero;Data;Cliente;Valor;Status\n';
      
      // Add Orders
      filteredData.fOrders.forEach(o => {
        csv += `Ordem Servico;${o.osNumber};${o.created_at};${customers.find(c => c.id === o.customerId)?.name || 'N/A'};${o.financials?.totalValue || 0};${o.status}\n`;
      });

      // Add Sales
      filteredData.fSales.forEach(s => {
        csv += `Venda Direta;${s.id.substring(0,8)};${s.created_at};${customers.find(c => c.id === s.customerId)?.name || 'Balcao'};${s.total || 0};Pago\n`;
      });

      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_servyx_${period}_${format(new Date(), 'dd_MM_yyyy')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast('Relatório exportado com sucesso!');
    } catch (err) {
      onShowToast('Erro ao exportar relatório');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const dateInterval = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'custom':
        start = startOfDay(parseISO(dateRange.start));
        end = endOfDay(parseISO(dateRange.end));
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start, end };
  }, [period, dateRange]);

  const filteredData = useMemo(() => {
    const { start, end } = dateInterval;

    const fOrders = orders.filter(o => {
      const d = parseISO(o.created_at);
      return isWithinInterval(d, { start, end });
    });

    const fSales = sales.filter(s => {
      const d = parseISO(s.date);
      return isWithinInterval(d, { start, end });
    });

    const fTransactions = transactions.filter(t => {
      const d = parseISO(t.date || t.created_at);
      return isWithinInterval(d, { start, end });
    });

    // Filter expenses within period
    const fExpenses = expenses.filter(ex => {
      const dateStr = ex.due_date || ex.date || ex.created_at;
      if (!dateStr) return false;
      try {
        const d = parseISO(dateStr);
        return isWithinInterval(d, { start, end });
      } catch { return false; }
    });

    return { fOrders, fSales, fTransactions, fExpenses };
  }, [orders, sales, transactions, expenses, dateInterval]);

  // 1. Billing Data (Linha 1) - Daily Revenue in period
  const billingChartData = useMemo(() => {
    const dailyData: Record<string, number> = {};
    const { start, end } = dateInterval;
    
    // Initialize all days in period with 0
    let current = new Date(start);
    while (current <= end) {
      dailyData[format(current, 'dd/MM')] = 0;
      current.setDate(current.getDate() + 1);
      if (Object.keys(dailyData).length > 31) break; // Limit to 31 nodes
    }

    filteredData.fTransactions
      .filter(t => t.type === 'entrada')
      .forEach(t => {
        const d = format(parseISO(t.date || t.created_at), 'dd/MM');
        if (dailyData[d] !== undefined) {
          dailyData[d] += Number(t.value || 0);
        }
      });

    return Object.entries(dailyData).map(([name, total]) => ({ name, total }));
  }, [filteredData, dateInterval]);

  // 2. OS by Status (Linha 2 - Left)
  const osStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredData.fOrders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    const colors = ['#00E676', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899'];
    return Object.entries(statusCounts).map(([name, value], i) => ({ 
      name, 
      value,
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // 3. Most Performed Services (Linha 2 - Right)
  const mostServicesData = useMemo(() => {
    const serviceStats: Record<string, { count: number, totalValue: number }> = {};
    
    filteredData.fOrders.forEach(o => {
      const service = o.service || 'Não especificado';
      if (!serviceStats[service]) serviceStats[service] = { count: 0, totalValue: 0 };
      
      serviceStats[service].count += 1;
      
      // Encontrar todas as transações de entrada vinculadas a esta OS
      const relatedTransactions = filteredData.fTransactions.filter(t => 
        t.type === 'entrada' && t.os_id === o.id
      );
      
      const totalPaid = relatedTransactions.reduce((acc, t) => acc + Number(t.value || 0), 0);
      serviceStats[service].totalValue += totalPaid;
    });

    return Object.entries(serviceStats)
      .map(([name, stats]) => ({ 
        name, 
        count: stats.count, 
        totalValue: stats.totalValue 
      }))
      .sort((a, b) => b.totalValue - a.totalValue) // Ordenar por faturamento
      .slice(0, 5);
  }, [filteredData]);

  // 4. Most Sold Products (Linha 3 - Bottom)
  const mostProductsData = useMemo(() => {
    const productCounts: Record<string, { quantity: number, total: number }> = {};
    
    return Object.entries(productCounts)
      .map(([name, stats]) => ({ name, quantity: stats.quantity, total: stats.total }))
      .sort((a, b) => b.total - a.total) // Ordenar por faturamento
      .slice(0, 6);
  }, [filteredData]);

  // 5. Customer Origin Distribution
  const acquisitionData = useMemo(() => {
    const originCounts: Record<string, number> = {};
    const revenueByOrigin: Record<string, number> = {};
    
    filteredData.fOrders.forEach(o => {
      const origin = o.customer_origin_snapshot || 'Desconhecido';
      originCounts[origin] = (originCounts[origin] || 0) + 1;
      
      const total = Number(o.financials?.totalValue || 0);
      revenueByOrigin[origin] = (revenueByOrigin[origin] || 0) + total;
    });

    const colors = ['#00E676', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];
    
    const distribution = Object.entries(originCounts).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);

    const revenue = Object.entries(revenueByOrigin).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);

    return { distribution, revenue };
  }, [filteredData]);

  // 6. Recurrence Analysis
  const recurrenceStats = useMemo(() => {
    const customerOsCount: Record<string, number> = {};
    
    // We look at ALL orders to determine if a customer is recurring, 
    // but we only count those that occurred in the filtered period as "Returning"
    orders.forEach(o => {
      customerOsCount[o.customerId] = (customerOsCount[o.customerId] || 0) + 1;
    });

    let newClients = 0;
    let recurringClients = 0;
    const uniqueClientsInPeriod = new Set();

    filteredData.fOrders.forEach(o => {
      if (uniqueClientsInPeriod.has(o.customerId)) return;
      uniqueClientsInPeriod.add(o.customerId);

      // If they have more than 1 OS total in history, they are recurring
      if (customerOsCount[o.customerId] > 1) {
        recurringClients++;
      } else {
        newClients++;
      }
    });

    const total = newClients + recurringClients;
    const rate = total > 0 ? (recurringClients / total) * 100 : 0;

    return {
      newClients,
      recurringClients,
      total,
      rate,
      chartData: [
        { name: 'Novos', value: newClients, color: '#3b82f6' },
        { name: 'Recorrentes', value: recurringClients, color: '#00E676' }
      ]
    };
  }, [filteredData, orders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-[#00E676]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#00E676] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em]">Gerando Relatórios</p>
      </div>
    );
  }

  const totals = {
    revenue: filteredData.fTransactions.filter(t => t.type === 'entrada').reduce((acc, t) => acc + Number(t.value), 0),
    expenses: (
      filteredData.fTransactions.filter(t => t.type === 'saida').reduce((acc, t) => acc + Number(t.value), 0) +
      filteredData.fExpenses.filter(ex => ex.status === 'paid' || ex.paid).reduce((acc, ex) => acc + Number(ex.amount || ex.value || 0), 0)
    ),
    osCount: filteredData.fOrders.length,
    salesCount: filteredData.fSales.length
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-zinc-900 p-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
              <ArrowLeft size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Relatórios Analíticos</h1>
              <p className="text-sm text-zinc-500 font-medium">Insights e desempenho do sistema</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center">
                {(['today', 'week', 'month', 'custom'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      period === p 
                        ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' 
                        : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Personalizado'}
                  </button>
                ))}
             </div>
              <button 
                 onClick={handleExportCSV}
                 className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-[#00E676] transition-colors"
                 title="Exportar CSV"
              >
                <Download size={20} />
              </button>
              <button 
                 onClick={() => { setIsRefreshing(true); fetchData(); }} 
                 className={`p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={20} />
              </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8 pb-20">
        
        {/* Date Range Picker (Only for Custom) */}
        <AnimatePresence>
          {period === 'custom' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-wrap items-center gap-4 overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Início</span>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-black/40 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00E676]" 
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Fim</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-black/40 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00E676]" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Totals Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Faturamento', value: totals.revenue, icon: TrendingUp, color: 'text-emerald-400', isCurrency: true },
            { label: 'Despesas', value: totals.expenses, icon: TrendingDown, color: 'text-red-400', isCurrency: true },
            { label: 'Ordens de Serviço', value: totals.osCount, icon: ListChecks, color: 'text-blue-400' },
            { label: 'Vendas Diretas', value: totals.salesCount, icon: Package, color: 'text-purple-400' }
          ].map((card, i) => (
            <motion.div 
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl hover:bg-zinc-900/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-zinc-950/50 ${card.color}`}>
                  <card.icon size={20} />
                </div>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">{card.label}</p>
              <h3 className="text-2xl font-bold tracking-tight">
                {card.isCurrency ? card.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : card.value}
              </h3>
            </motion.div>
          ))}
        </div>

        {/* Line 1: Faturamento Full Width */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-[2.5rem]"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold">Desempenho de Faturamento</h3>
              <p className="text-sm text-zinc-500">Fluxo de caixa de entradas por dia</p>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-2xl">
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={billingChartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E676" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '16px' }}
                  itemStyle={{ color: '#00E676' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#00E676" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Line 2: OS Status & Services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* OS by Status */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-[2.5rem]"
          >
            <h3 className="text-lg font-bold mb-6">Ordens de Serviço por Status</h3>
            <div className="h-[300px] w-full flex flex-col md:flex-row items-center gap-8">
              <div className="h-full w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={osStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {osStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {osStatusData.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-zinc-400 font-medium group-hover:text-white transition-colors">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Most Performed Services */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-[2.5rem]"
          >
            <h3 className="text-lg font-bold mb-6">Serviços mais Realizados</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostServicesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1f2937" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100}
                    tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                    formatter={(value: any, name: any, props: any) => {
                      if (name === 'totalValue') {
                        return [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Faturamento'];
                      }
                      return [value, name];
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Bar 
                    dataKey="totalValue" 
                    fill="#3b82f6" 
                    radius={[0, 10, 10, 0]}
                    barSize={20}
                    animationDuration={1200}
                  >
                    {mostServicesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#4f46e5', '#6366f1', '#818cf8', '#9333ea'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Line 3: Most Sold Products */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-[2.5rem]"
        >
          <h3 className="text-lg font-bold mb-8">Produtos mais Vendidos</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostProductsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 10 }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '16px' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'total') {
                      return [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Faturamento'];
                    }
                    return [value, name];
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="total" 
                  fill="#00E676" 
                  radius={[10, 10, 0, 0]} 
                  barSize={40}
                  animationDuration={1500}
                >
                   {mostProductsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#00E676' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* CRM Section: Acquisition & Recurrence */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Acquisition Channels */}
           <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 bg-[#111111] border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Target size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-1">Origem & Aquisição</h3>
              <p className="text-xs text-zinc-500 mb-8 uppercase tracking-widest font-bold">De onde vêm seus clientes e quanto geram</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Volume por Canal</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={acquisitionData.distribution}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {acquisitionData.distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {acquisitionData.distribution.slice(0, 4).map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[9px] font-bold text-zinc-400 uppercase truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Receita por Canal</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={acquisitionData.revenue} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" hide />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                          formatter={(val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                           {acquisitionData.revenue.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {acquisitionData.revenue.slice(0, 3).map(item => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">{item.name}</span>
                        <span className="text-[10px] font-black text-[#00E676]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recurrence Stats */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] border border-zinc-800 p-8 rounded-[2.5rem] flex flex-col"
          >
            <h3 className="text-xl font-bold mb-1">Recorrência</h3>
            <p className="text-xs text-zinc-500 mb-8 uppercase tracking-widest font-bold">Retenção de Clientes</p>
            
            <div className="flex-1 flex flex-col justify-between">
              <div className="text-center py-6">
                <div className="text-5xl font-black text-[#00E676] tracking-tighter mb-1">
                  {recurrenceStats.rate.toFixed(1)}%
                </div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Taxa de Retorno</p>
              </div>

              <div className="h-[140px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={recurrenceStats.chartData}
                      innerRadius={45}
                      outerRadius={55}
                      paddingAngle={8}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {recurrenceStats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{recurrenceStats.newClients}</div>
                  <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Novos</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-[#00E676]">{recurrenceStats.recurringClients}</div>
                  <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Recorrentes</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      </main>
    </div>
  );
}

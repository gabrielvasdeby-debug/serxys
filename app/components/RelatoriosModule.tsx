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
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
}

type Period = 'today' | 'week' | 'month' | 'custom';

export default function RelatoriosModule({ profile, onBack, onShowToast }: RelatoriosModuleProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
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
      const [ordersRes, salesRes, transRes] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('transactions').select('*')
      ]);

      setOrders(ordersRes.data || []);
      setSales(salesRes.data || []);
      setTransactions(transRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      onShowToast('Erro ao carregar dados dos relatórios');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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

    return { fOrders, fSales, fTransactions };
  }, [orders, sales, transactions, dateInterval]);

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
    const serviceCounts: Record<string, number> = {};
    filteredData.fOrders.forEach(o => {
      const service = o.service || 'Não especificado';
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });

    return Object.entries(serviceCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  // 4. Most Sold Products (Linha 3 - Bottom)
  const mostProductsData = useMemo(() => {
    const productCounts: Record<string, { quantity: number, total: number }> = {};
    
    filteredData.fSales.forEach(s => {
      const items = s.items || [];
      items.forEach((item: any) => {
        const name = item.productName || 'Produto Desconhecido';
        if (!productCounts[name]) productCounts[name] = { quantity: 0, total: 0 };
        productCounts[name].quantity += Number(item.quantity || 0);
        productCounts[name].total += Number(item.total || 0);
      });
    });

    return Object.entries(productCounts)
      .map(([name, stats]) => ({ name, quantity: stats.quantity, total: stats.total }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [filteredData]);

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
    expenses: filteredData.fTransactions.filter(t => t.type === 'saida').reduce((acc, t) => acc + Number(t.value), 0),
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
                {card.isCurrency ? totals.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : card.value}
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
                  />
                  <Bar 
                    dataKey="value" 
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
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 10 }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '16px' }}
                />
                <Bar 
                  dataKey="quantity" 
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

      </main>
    </div>
  );
}

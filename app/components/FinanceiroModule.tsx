'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Filter, 
  Plus, 
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  History,
  ChartPie,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Hash,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Receivable {
  id: string;
  osId: string;
  osNumber: number;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  supplier?: string;
}

interface FinanceiroModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
}

type Tab = 'RECEBER' | 'PAGAR' | 'RESUMO';
type Period = 'today' | 'week' | 'month' | 'custom';

export default function FinanceiroModuleView({ profile, onBack, onShowToast }: FinanceiroModuleProps) {
  const [activeTab, setActiveTab] = useState<Tab>('RESUMO');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [period, setPeriod] = useState<Period>('month');

  // Bloqueio de acesso para não-ADM
  if (profile.type !== 'ADM' && profile.role !== 'ADM') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={40} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
        <p className="text-zinc-500 max-w-md mb-8">Esta área é restrita para o perfil Administrador. Por favor, entre em contato com o suporte se acreditar que isso é um erro.</p>
        <button onClick={onBack} className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-xl border border-white/5 transition-colors font-bold uppercase tracking-widest text-xs">Voltar</button>
      </div>
    );
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Receivables from Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const processedReceivables = ordersData
        .filter(order => {
          const financials = order.financials || { total: 0, paid: 0 };
          return (financials.total || 0) > (financials.paid || 0);
        })
        .map(order => ({
          id: order.id,
          osId: order.id,
          osNumber: order.os_number,
          customerName: order.customers?.name || 'Cliente não identificado',
          totalAmount: order.financials?.total || 0,
          paidAmount: order.financials?.paid || 0,
          remainingAmount: (order.financials?.total || 0) - (order.financials?.paid || 0),
          dueDate: order.created_at,
          status: order.status
        }));

      setReceivables(processedReceivables);

      // Fetch Expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (expensesError) {
        // If table doesn't exist, use empty array (or local storage for fallback)
        console.warn('Expenses table might not exist yet');
        setExpenses([]);
      } else {
        setExpenses(expensesData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      onShowToast('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newExpense = {
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
      category: formData.get('category') as string,
      supplier: formData.get('supplier') as string
    };

    try {
      const { data, error } = await supabase.from('expenses').insert({
        id: crypto.randomUUID(),
        ...newExpense
      }).select().single();
      if (error) throw error;
      setExpenses([data, ...expenses]);
      setIsExpenseModalOpen(false);
      onShowToast('Despesa cadastrada com sucesso');
    } catch (err) {
      onShowToast('Erro ao salvar despesa');
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    const formData = new FormData(e.currentTarget);
    const paymentAmount = parseFloat(formData.get('paymentAmount') as string);
    const markAsPaid = formData.get('markAsPaid') === 'on';

    const newPaidAmount = selectedReceivable.paidAmount + paymentAmount;
    const isFullyPaid = markAsPaid || newPaidAmount >= selectedReceivable.totalAmount;

    try {
      const { error } = await supabase.from('orders').update({
        financials: {
          total: selectedReceivable.totalAmount,
          paid: newPaidAmount
        },
        status: isFullyPaid ? 'Concluída' : selectedReceivable.status
      }).eq('id', selectedReceivable.osId);

      if (error) throw error;

      onShowToast('Pagamento registrado com sucesso');
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      onShowToast('Erro ao registrar pagamento');
    }
  };

  const getFilteredTotals = () => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'month':
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
    }

    const periodExpenses = expenses.filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start, end });
    }).reduce((acc, curr) => acc + curr.amount, 0);

    // Sum of paid amounts in orders created in this period
    // Ideally we would have a 'payments' table, but using orders for now
    const periodRevenue = receivables
      .filter(r => {
        const d = parseISO(r.dueDate);
        return isWithinInterval(d, { start, end });
      })
      .reduce((acc, curr) => acc + curr.paidAmount, 0);

    return { revenue: periodRevenue, expenses: periodExpenses, profit: periodRevenue - periodExpenses };
  };

  const stats = getFilteredTotals();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Header Glassmorphism */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-zinc-900 p-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
              <ArrowLeft size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Módulo Financeiro</h1>
              <p className="text-sm text-zinc-500 font-medium">Controle total da saúde do seu negócio</p>
            </div>
          </div>
          <div className="flex bg-[#121212] p-1 rounded-2xl border border-zinc-800/50">
            <button 
              onClick={() => setActiveTab('RESUMO')} 
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${activeTab === 'RESUMO' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-white'}`}
            >
              Resumo
            </button>
            <button 
              onClick={() => setActiveTab('RECEBER')} 
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${activeTab === 'RECEBER' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-white'}`}
            >
              Receber
            </button>
            <button 
              onClick={() => setActiveTab('PAGAR')} 
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${activeTab === 'PAGAR' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-white'}`}
            >
              Pagar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'RESUMO' && (
            <motion.div 
              key="resumo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Period Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {(['today', 'week', 'month', 'custom'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-5 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                      period === p 
                        ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]' 
                        : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'
                    }`}
                  >
                    {p === 'today' ? 'Hoje' : p === 'week' ? 'Esta Semana' : p === 'month' ? 'Este Mês' : 'Personalizado'}
                  </button>
                ))}
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                      <TrendingUp size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded-lg">Entradas</span>
                  </div>
                  <h3 className="text-zinc-400 text-sm font-medium mb-1">Total Recebido</h3>
                  <p className="text-3xl font-bold text-white tracking-tight">R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                      <TrendingDown size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/5 px-2 py-1 rounded-lg">Saídas</span>
                  </div>
                  <h3 className="text-zinc-400 text-sm font-medium mb-1">Total Gasto</h3>
                  <p className="text-3xl font-bold text-white tracking-tight">R$ {stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-[#00E676]/5 p-8 rounded-[32px] border border-[#00E676]/20 ring-1 ring-[#00E676]/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#00E676]/20 text-[#00E676] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,230,118,0.2)]">
                      <DollarSign size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-[#00E676] uppercase tracking-widest bg-[#00E676]/10 px-2 py-1 rounded-lg">Resultado</span>
                  </div>
                  <h3 className="text-[#00E676]/70 text-sm font-medium mb-1">Lucro Líquido</h3>
                  <p className="text-3xl font-bold text-white tracking-tight">R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Charts Placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-8 rounded-[32px] border border-white/5 h-80 flex flex-col items-center justify-center text-center">
                   <ChartPie size={48} className="text-zinc-700 mb-4" />
                   <h4 className="text-white font-bold mb-2">Distribuição de Receita</h4>
                   <p className="text-zinc-500 text-sm max-w-xs">Gráficos de análise serão exibidos aqui conforme os dados acumularem.</p>
                </div>
                <div className="glass-panel p-8 rounded-[32px] border border-white/5 h-80 flex flex-col items-center justify-center text-center">
                   <History size={48} className="text-zinc-700 mb-4" />
                   <h4 className="text-white font-bold mb-2">Evolução Diária</h4>
                   <p className="text-zinc-500 text-sm max-w-xs">Acompanhamento do desempenho financeiro ao longo do período selecionado.</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'RECEBER' && (
            <motion.div 
              key="receber"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ArrowUpRight className="text-emerald-500" /> Contas a Receber (OS)
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input type="text" placeholder="Filtrar por nome ou OS..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#00E676]/30 transition-all w-64" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {receivables.length === 0 ? (
                  <div className="p-20 text-center glass-panel border-white/5 rounded-[32px]">
                    <CheckCircle2 size={48} className="text-[#00E676]/20 mx-auto mb-4" />
                    <p className="text-zinc-400">Tudo em dia! Nenhuma OS com pagamento pendente.</p>
                  </div>
                ) : (
                  receivables.map(r => (
                    <div key={r.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-[#00E676]/20 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <Hash size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter">#{r.osNumber}</span>
                            <h4 className="font-bold text-white text-lg">{r.customerName}</h4>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                            <span>Status OS: {r.status}</span>
                            <span>Abertura: {format(parseISO(r.dueDate), 'dd/MM/yy', { locale: ptBR })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-10">
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">Total OS</p>
                          <p className="font-bold text-white">R$ {r.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest mb-1">Pago</p>
                          <p className="font-bold text-emerald-500">R$ {r.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-1">Restante</p>
                          <p className="font-black text-amber-500 text-lg">R$ {r.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <button 
                          onClick={() => { setSelectedReceivable(r); setIsPaymentModalOpen(true); }}
                          className="bg-zinc-800 hover:bg-[#00E676] hover:text-black p-3 rounded-xl transition-all shadow-lg group-hover:scale-110"
                        >
                          <CreditCard size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'PAGAR' && (
            <motion.div 
              key="pagar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ArrowDownRight className="text-red-500" /> Contas a Pagar (Despesas)
                </h2>
                <button 
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="bg-[#00E676] hover:bg-[#00C853] text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#00E676]/20 active:scale-95"
                >
                  <Plus size={18} /> Cadastrar Despesa
                </button>
              </div>

              <div className="glass-panel overflow-hidden border-white/5 rounded-[32px]">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Data</th>
                      <th className="px-8 py-4">Descrição</th>
                      <th className="px-8 py-4">Categoria</th>
                      <th className="px-8 py-4">Fornecedor</th>
                      <th className="px-8 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-zinc-500">Nenhuma despesa cadastrada.</td>
                      </tr>
                    ) : (
                      expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-8 py-5 text-sm font-medium text-zinc-400">{format(parseISO(exp.date), 'dd/MM/yyyy')}</td>
                          <td className="px-8 py-5 text-sm font-bold text-white">{exp.description}</td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded text-zinc-400">{exp.category}</span>
                          </td>
                          <td className="px-8 py-5 text-sm text-zinc-400">{exp.supplier || '-'}</td>
                          <td className="px-8 py-5 text-sm font-bold text-red-400 text-right">R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Expense Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-900 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Nova Despesa</h2>
                  <p className="text-sm text-zinc-500">Registre uma saída financeira</p>
                </div>
                <button onClick={() => setIsExpenseModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Descrição</label>
                  <input name="description" required className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all" placeholder="Ex: Aluguel da Loja" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input type="number" step="0.01" name="amount" required className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all" placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Data</label>
                    <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all [color-scheme:dark]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Categoria</label>
                    <select name="category" className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all">
                      <option value="Operacional">Operacional</option>
                      <option value="Produtos">Produtos</option>
                      <option value="Salários">Salários</option>
                      <option value="Infraestrutura">Infraestrutura</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Fornecedor</label>
                    <input name="supplier" className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all" placeholder="Opcional" />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 px-4 py-3 border border-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-800 transition-colors font-bold uppercase tracking-widest text-[10px]">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-[#00E676] text-black rounded-xl hover:bg-[#00C853] transition-colors font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-[#00E676]/20">Salvar Despesa</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Update Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedReceivable && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-900 text-center">
                <h2 className="text-xl font-bold text-white mb-1">Registrar Pagamento</h2>
                <p className="text-sm text-emerald-500 font-bold">OS #{selectedReceivable.osNumber}</p>
              </div>

              <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-zinc-500 font-bold uppercase">Restante</span>
                    <span className="text-xl font-black text-[#00E676]">R$ {selectedReceivable.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="paymentAmount" 
                    required 
                    defaultValue={selectedReceivable.remainingAmount.toFixed(2)}
                    className="w-full bg-black/40 border border-zinc-800 rounded-2xl px-4 py-4 text-center text-3xl font-bold text-white focus:outline-none focus:border-[#00E676] transition-all"
                  />
                  <p className="text-[10px] text-zinc-600 text-center mt-3 uppercase tracking-widest">Digite o valor recebido agora</p>
                </div>

                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border border-transparent active:border-[#00E676]/30">
                  <input type="checkbox" name="markAsPaid" className="w-5 h-5 accent-[#00E676]" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Marcar OS como Paga</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">Isso conclui o financeiro desta OS</p>
                  </div>
                </label>

                <div className="pt-2 flex flex-col gap-3">
                  <button type="submit" className="w-full bg-[#00E676] text-black font-extrabold py-4 rounded-2xl hover:bg-[#00C853] transition-all shadow-lg shadow-[#00E676]/20 uppercase tracking-widest text-xs">Confirmar Recebimento</button>
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="w-full text-zinc-500 hover:text-white transition-colors font-bold text-xs uppercase tracking-widest py-2">Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

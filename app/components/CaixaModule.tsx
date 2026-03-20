import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Minus, ShoppingCart, 
  Calendar, Clock, CreditCard, Banknote, QrCode, ArrowUpRight, 
  ArrowDownLeft, CheckCircle2, X, Search, Trash2,
  TrendingUp, TrendingDown, Wallet, History, Save,
  ShieldAlert, AlertCircle, Barcode, FileDown
} from 'lucide-react';
import { supabase } from '../supabase';
import { generateCashReportPDF } from '../utils/pdfGenerator';

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  description: string;
  value: number;
  paymentMethod: 'Dinheiro' | 'PIX' | 'Cartão' | 'Transferência';
  category?: string;
  date: string; // ISO format YYYY-MM-DD
  time: string; // HH:mm
  osId?: string;
  userId: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  date: string;
  status: 'open' | 'closed';
  openingTime: string;
  openingUser: string;
  openingUserName: string;
  initialValue: number;
  closingTime?: string;
  closingUser?: string;
  closingUserName?: string;
  finalValue?: number;
  expectedValue?: number;
  difference?: number;
  totalEntries?: number;
  totalExits?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  minStock?: number;
  barcode?: string;
}

interface ClosingData {
  finalValue: number;
  expectedValue: number;
  difference: number;
  closingTime: string;
  totalEntries: number;
  totalExits: number;
}

interface TransactionData {
  type: 'entrada' | 'saida';
  description: string;
  value: number;
  paymentMethod?: string;
  date: string;
  time: string;
  supplierId?: string;
  productName?: string;
}

interface SaleData {
  items: { productId: string, productName: string, quantity: number, price: number, total: number }[];
  total: number;
  paymentMethod: string;
}

interface CaixaModuleProps {
  profile: {
    id: string;
    name: string;
    type: string;
    photo: string;
    [key: string]: string | number | boolean | undefined | null;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export interface Totals {
  initial: number;
  entries: number;
  entriesByType: Record<string, number>;
  exits: number;
  balance: number;
  cashInHand: number;
}

export default function CaixaModule({ profile, onBack, onShowToast }: CaixaModuleProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<'entrada' | 'saida'>('entrada');
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [availableSuppliers, setAvailableSuppliers] = useState<{ id: string, company_name: string }[]>([]);

  useEffect(() => {
    setLoading(true);

    const fetchData = async () => {
      // 1. Fetch current session for the selected date
      const { data: sessionData, error: sessionFetchError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('date', selectedDate)
        .maybeSingle();
      
      if (sessionFetchError) {
        console.error('Error fetching session:', sessionFetchError);
      }

      if (sessionData) {
        setCurrentSession({
          id: sessionData.id,
          date: sessionData.date,
          status: sessionData.status,
          openingTime: sessionData.opened_at ? new Date(sessionData.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
          openingUser: sessionData.opened_by,
          openingUserName: sessionData.opened_by_name || 'Usuário',
          initialValue: sessionData.opening_balance,
          closingTime: sessionData.closed_at ? new Date(sessionData.closed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
          finalValue: sessionData.closing_balance
        } as CashSession);
      } else {
        setCurrentSession(null);
      }

      // 2. Fetch transactions
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });
      
      if (transData) {
        setTransactions(transData.map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          value: t.value,
          paymentMethod: t.payment_method,
          date: t.date,
          time: t.time,
          osId: t.os_id,
          userId: t.user_id,
          createdAt: t.created_at
        })) as Transaction[]);
      }

      // 3. Fetch products
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) {
        setProducts(prodData.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          category: p.category,
          minStock: p.min_stock,
          barcode: p.barcode
        })) as Product[]);
      }

      // 4. Fetch suppliers
      const { data: supData } = await supabase.from('suppliers').select('id, company_name').order('company_name');
      if (supData) {
        setAvailableSuppliers(supData);
      }

      // 4. Fetch all sessions
      const { data: allSessions } = await supabase.from('cash_sessions').select('*').order('date', { ascending: false });
      if (allSessions) {
        setSessions(allSessions.map(s => ({
          id: s.id,
          date: s.date,
          status: s.status,
          openingTime: s.opened_at,
          initialValue: s.opening_balance,
          finalValue: s.closing_balance
        })) as CashSession[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedDate]);

  const totals = useMemo<Totals>(() => {
    const initial = currentSession?.initialValue || 0;
    
    const entriesByType = transactions
      .filter(t => t.type === 'entrada')
      .reduce((acc, t) => {
        const method = t.paymentMethod;
        acc[method] = (acc[method] || 0) + t.value;
        acc.total += t.value;
        return acc;
      }, { total: 0 } as Record<string, number>);

    const exits = transactions
      .filter(t => t.type === 'saida')
      .reduce((acc, t) => acc + t.value, 0);

    const cashEntries = entriesByType['Dinheiro'] || 0;
    const cashExits = transactions
      .filter(t => t.type === 'saida' && t.paymentMethod === 'Dinheiro')
      .reduce((acc, t) => acc + t.value, 0);

    return {
      initial,
      entries: entriesByType.total,
      entriesByType,
      exits,
      balance: entriesByType.total - exits, // Saldo Geral: Entradas - Saídas
      cashInHand: initial + cashEntries - cashExits // Dinheiro em Caixa: Troco + Entradas Dinheiro - Saídas Dinheiro
    };
  }, [transactions, currentSession]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesPayment = filterPayment === 'all' || t.paymentMethod === filterPayment;
      return matchesType && matchesPayment;
    });
  }, [transactions, filterType, filterPayment]);

  const handleOpenCash = async (initialValue: number, date: string) => {
    try {
      const { data: openSessions, error: openError } = await supabase
        .from('cash_sessions')
        .select('id, date')
        .eq('status', 'open');

      if (openError) throw openError;

      if (openSessions && openSessions.length > 0) {
        const openDate = openSessions[0].date;
        const [y, m, d] = openDate.split('-');
        onShowToast(`Existe um caixa aberto em ${d}/${m}/${y}. Feche-o antes de abrir um novo.`);
        return;
      }

      // Check if session already exists for this specific date
      const { data: existingSession, error: checkError } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('date', date)
        .maybeSingle(); // Use maybeSingle to avoid error if 0 results

      if (checkError) throw checkError;

      if (existingSession) {
        onShowToast('Já existe um registro de caixa para esta data');
        return;
      }

      const { data, error: insertError } = await supabase.from('cash_sessions').insert({
        id: crypto.randomUUID(), // Provide manual UUID to satisfy not-null constraint
        date: date,
        status: 'open',
        opening_balance: initialValue,
        opened_by: profile.id,
        opened_at: new Date().toISOString()
      }).select().single();

      if (insertError) throw insertError;

      if (data) {
        setCurrentSession({
          id: data.id,
          date: data.date,
          status: data.status,
          openingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          openingUser: data.opened_by,
          openingUserName: profile.name,
          initialValue: data.opening_balance
        } as CashSession);

        setSelectedDate(date);
        onShowToast('Caixa aberto com sucesso');
        setIsOpeningModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error opening cash:', error);
      const msg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      onShowToast(`Erro ao abrir caixa: ${msg}`);
    }
  };

  const handleCloseCash = async (closingData: ClosingData) => {
    if (!currentSession) return;
    try {
      const { error } = await supabase.from('cash_sessions').update({
        status: 'closed',
        closing_balance: closingData.finalValue,
        closed_by: profile.id,
        closed_at: new Date().toISOString()
      }).eq('id', currentSession.id);

      if (error) throw error;

      onShowToast('Caixa fechado com sucesso');
      setCurrentSession(prev => prev ? { ...prev, status: 'closed' } : null);
      setIsClosingModalOpen(false);
    } catch (error) {
      console.error('Error closing cash:', error);
      onShowToast('Erro ao fechar caixa');
    }
  };

  const handleExportPastSession = async (session: CashSession) => {
    try {
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('date', session.date);
      
      const trans = (transData || []).map(t => ({
        id: t.id,
        type: t.type,
        description: t.description,
        value: t.value,
        paymentMethod: t.payment_method,
        date: t.date,
        time: t.time
      })) as Transaction[];
      
      const initial = session.initialValue || 0;
      const entriesByType = trans
        .filter(t => t.type === 'entrada')
        .reduce((acc, t) => {
          const method = t.paymentMethod;
          acc[method] = (acc[method] || 0) + t.value;
          acc.total += t.value;
          return acc;
        }, { total: 0 } as Record<string, number>);

      const exits = trans
        .filter(t => t.type === 'saida')
        .reduce((acc, t) => acc + t.value, 0);

      const cashEntries = entriesByType['Dinheiro'] || 0;
      const cashExits = trans
        .filter(t => t.type === 'saida' && t.paymentMethod === 'Dinheiro')
        .reduce((acc, t) => acc + t.value, 0);

      const pastTotals: Totals = {
        initial,
        entries: entriesByType.total,
        entriesByType,
        exits,
        balance: entriesByType.total - exits,
        cashInHand: initial + cashEntries - cashExits
      };

      generateCashReportPDF(session, trans, pastTotals);
    } catch (error) {
      console.error('Error exporting session:', error);
      onShowToast('Erro ao exportar relatório');
    }
  };

  const handleReopenCash = async (session: CashSession) => {
    if (profile.type !== 'ADM') {
      onShowToast('Apenas administradores podem reabrir o caixa');
      return;
    }
    try {
      const { error } = await supabase.from('cash_sessions').update({
        status: 'open',
        closed_at: null,
        closed_by: null
      }).eq('id', session.id);

      if (error) throw error;
      
      setCurrentSession(prev => prev ? { ...prev, status: 'open' } : null);
      onShowToast('Caixa reaberto');
    } catch (error) {
      console.error('Error reopening cash:', error);
      onShowToast('Erro ao reabrir caixa');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (currentSession?.status === 'closed') {
      onShowToast('Não é possível excluir transações de um caixa fechado');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Transação',
      message: 'Deseja realmente excluir esta transação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          if (error) throw error;

          setTransactions(prev => prev.filter(t => t.id !== id));
          onShowToast('Transação excluída');
        } catch (error) {
          console.error(error);
          onShowToast('Erro ao excluir transação');
        }
        setConfirmModal(null);
      }
    });
  };

  const canAction = currentSession?.status === 'open';
  const isTechnician = profile.type === 'Técnico';

  if (isTechnician) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <ShieldAlert size={64} className="text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-zinc-400">Técnicos não possuem acesso ao módulo financeiro.</p>
          <button onClick={onBack} className="text-blue-500 hover:underline">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <header className="bg-[#141414] border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-zinc-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Caixa Diário</h1>
                {currentSession && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${currentSession.status === 'open' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {currentSession.status === 'open' ? 'Aberto' : 'Fechado'}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#0A0A0A] border border-zinc-800 rounded-xl px-3 py-1.5 gap-2">
              <Calendar size={16} className="text-zinc-500" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-zinc-300 focus:outline-none"
              />
            </div>
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
              title="Histórico de Caixas"
            >
              <History size={20} />
            </button>
            {currentSession?.status === 'open' && (profile.type === 'ADM' || profile.type === 'Financeiro') && (
              <button 
                onClick={() => setIsClosingModalOpen(true)}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                Fechar Caixa
              </button>
            )}
            {!currentSession && (profile.type === 'ADM' || profile.type === 'Financeiro' || profile.type === 'Atendente') && (
              <button 
                onClick={() => setIsOpeningModalOpen(true)}
                className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Plus size={18} />
                Abrir Caixa
              </button>
            )}
            {currentSession?.status === 'closed' && profile.type === 'ADM' && (
              <button 
                onClick={() => handleReopenCash(currentSession)}
                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <History size={18} />
                Reabrir Caixa
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 overflow-x-hidden">
        {currentSession?.status === 'open' && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Abertura</p>
                <p className="text-sm font-bold text-emerald-500">{currentSession.openingTime}</p>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Responsável</p>
                <p className="text-sm font-bold text-zinc-300">{currentSession.openingUserName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Troco Inicial</p>
                <p className="text-sm font-bold text-zinc-300 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentSession.initialValue)}</p>
              </div>
            </div>
          </div>
        )}

        {!canAction && (
          <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-3xl text-center space-y-4">
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <h2 className="text-xl font-bold">Caixa {currentSession?.status === 'closed' ? 'Fechado' : 'Não Iniciado'}</h2>
            <div className="text-zinc-400 max-w-md mx-auto">
              {currentSession?.status === 'closed' ? (
                <div className="flex flex-col items-center gap-4">
                  <p>O caixa de hoje já foi encerrado. Nenhuma nova movimentação pode ser realizada.</p>
                  <button 
                    onClick={() => generateCashReportPDF(currentSession, transactions, totals)}
                    className="bg-zinc-800 text-white font-bold px-8 py-3 rounded-xl hover:bg-zinc-700 transition-all flex items-center gap-2"
                  >
                    <FileDown size={20} />
                    Exportar Relatório em PDF
                  </button>
                </div>
              ) : (
                <p>É necessário abrir o caixa para iniciar as movimentações do dia.</p>
              )}
            </div>
            {currentSession?.status !== 'closed' && !currentSession && (profile.type === 'ADM' || profile.type === 'Financeiro' || profile.type === 'Atendente') && (
              <button 
                onClick={() => setIsOpeningModalOpen(true)}
                className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-emerald-600 transition-all"
              >
                Abrir Caixa Agora
              </button>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${!canAction ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Col 1: Troco e Entradas */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1A1A1A] border border-zinc-800 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Troco Inicial</p>
                <Banknote size={16} className="text-zinc-500" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-300">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.initial)}
              </h2>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1A1A1A] border border-zinc-800 p-6 rounded-3xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Entradas Totais</p>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold text-emerald-500">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entries)}
              </h2>
              
              <div className="pt-4 border-t border-zinc-800 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Dinheiro</span>
                  <span className="font-bold text-zinc-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entriesByType['Dinheiro'] || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">PIX</span>
                  <span className="font-bold text-zinc-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entriesByType['PIX'] || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Cartão</span>
                  <span className="font-bold text-zinc-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entriesByType['Cartão'] || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Outros</span>
                  <span className="font-bold text-zinc-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entriesByType['Transferência'] || 0)}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Col 2: Saídas e Saldo Geral */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1A1A1A] border border-zinc-800 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Saídas Totais</p>
                <TrendingDown size={16} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-500">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.exits)}
              </h2>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1A1A1A] border border-zinc-800 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Saldo (Entradas - Saídas)</p>
                <Wallet size={16} className="text-zinc-400" />
              </div>
              <h2 className={`text-3xl font-bold ${totals.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.balance)}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-2 font-medium uppercase tracking-tighter">Faturamento líquido do dia</p>
            </motion.div>
          </div>

          {/* Col 3: Dinheiro em Caixa (Destaque) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-emerald-500 border-2 border-emerald-400 p-8 rounded-[2rem] relative overflow-hidden flex flex-col justify-center shadow-2xl shadow-emerald-500/20"
          >
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <Banknote size={120} className="text-black" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-black text-emerald-950 uppercase tracking-[0.2em] mb-2">Dinheiro em Caixa</p>
              <h2 className="text-5xl font-black text-black tracking-tighter">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.cashInHand)}
              </h2>
              <div className="mt-6 pt-6 border-t border-black/10 space-y-1">
                <p className="text-[10px] font-bold text-emerald-900 uppercase">Valor físico real</p>
                <p className="text-[10px] text-emerald-900/60 leading-tight">
                  Troco Inicial + Entradas Dinheiro - Saídas Dinheiro
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${!canAction ? 'opacity-50 pointer-events-none' : ''}`}>
          <button 
            onClick={() => {
              setTransactionModalType('entrada');
              setIsTransactionModalOpen(true);
            }}
            className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} />
            Nova Entrada
          </button>
          <button 
            onClick={() => {
              setTransactionModalType('saida');
              setIsTransactionModalOpen(true);
            }}
            className="flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20"
          >
            <Minus size={20} />
            Nova Saída
          </button>
          <button 
            onClick={() => setIsQuickSaleOpen(true)}
            className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
          >
            <ShoppingCart size={20} />
            Venda Rápida
          </button>
        </div>

        {/* Transactions List */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <History size={20} className="text-zinc-400" />
              <h3 className="font-bold text-lg">Transações de Hoje</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Todas
                </button>
                <button 
                  onClick={() => setFilterType('entrada')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'entrada' ? 'bg-emerald-500/20 text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Entradas
                </button>
                <button 
                  onClick={() => setFilterType('saida')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'saida' ? 'bg-red-500/20 text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Saídas
                </button>
              </div>
              <select 
                value={filterPayment}
                onChange={e => setFilterPayment(e.target.value)}
                className="bg-[#0A0A0A] border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-400 focus:outline-none focus:border-zinc-600"
              >
                <option value="all">Todos Pagamentos</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="Cartão">Cartão</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0A0A0A]/50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  <th className="px-6 py-4">Horário</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Pagamento</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                        <Clock size={14} />
                        {t.time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {t.type === 'entrada' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{t.description}</p>
                          {t.osId && <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">OS #{t.osId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                        {t.paymentMethod === 'Dinheiro' && <Banknote size={14} />}
                        {t.paymentMethod === 'PIX' && <QrCode size={14} />}
                        {t.paymentMethod === 'Cartão' && <CreditCard size={14} />}
                        {t.paymentMethod === 'Transferência' && <TrendingUp size={14} />}
                        {t.paymentMethod}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className={`text-sm font-bold ${t.type === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.type === 'entrada' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {canAction && (
                        <button 
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center gap-3">
                        <History size={40} className="opacity-20" />
                        <p>Nenhuma transação encontrada para hoje.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Opening Modal */}
      <AnimatePresence>
        {isOpeningModalOpen && (
          <OpeningModal 
            onClose={() => setIsOpeningModalOpen(false)}
            onConfirm={handleOpenCash}
            initialDate={selectedDate}
          />
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <HistoryModal 
            sessions={sessions}
            onClose={() => setIsHistoryOpen(false)}
            onReopen={handleReopenCash}
            isAdmin={profile.type === 'ADM'}
            onSelectDate={setSelectedDate}
            onExport={handleExportPastSession}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTransactionModalOpen && (
          <TransactionModal 
            type={transactionModalType}
            selectedDate={selectedDate}
            suppliers={availableSuppliers}
            onClose={() => setIsTransactionModalOpen(false)}
            onShowToast={onShowToast}
            onSave={async (data) => {
              try {
                const { data: newTrans, error } = await supabase.from('transactions').insert({
                  id: crypto.randomUUID(),
                  type: data.type,
                  description: data.description,
                  value: data.value,
                  payment_method: data.paymentMethod,
                  date: data.date,
                  time: data.time,
                  user_id: profile.id,
                  session_id: currentSession?.id,
                  supplier_id: data.supplierId,
                  product_name: data.productName
                }).select().single();

                if (error) throw error;

                if (newTrans) {
                  setTransactions(prev => [{
                    id: newTrans.id,
                    type: newTrans.type,
                    description: newTrans.description,
                    value: newTrans.value,
                    paymentMethod: newTrans.payment_method,
                    date: newTrans.date,
                    time: newTrans.time,
                    createdAt: newTrans.created_at
                  } as Transaction, ...prev]);
                }

                onShowToast(`${transactionModalType === 'entrada' ? 'Entrada' : 'Saída'} registrada`);
                setIsTransactionModalOpen(false);
              } catch (error) {
                console.error('Error saving transaction:', error);
                onShowToast('Erro ao salvar transação');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Quick Sale Modal */}
      <AnimatePresence>
        {isQuickSaleOpen && (
          <QuickSaleModal 
            products={products}
            onClose={() => setIsQuickSaleOpen(false)}
            onShowToast={onShowToast}
            onSave={async (saleData) => {
              try {
                // 1. Create Transaction
                const description = saleData.items.length === 1 
                  ? `Venda Rápida: ${saleData.items[0].productName}`
                  : `Venda Rápida: ${saleData.items.length} itens`;

                const { data: trans, error: transError } = await supabase.from('transactions').insert({
                  id: crypto.randomUUID(),
                  type: 'entrada',
                  description,
                  value: saleData.total,
                  payment_method: saleData.paymentMethod,
                  date: selectedDate,
                  time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  user_id: profile.id,
                  session_id: currentSession?.id
                }).select().single();

                if (transError) throw transError;

                // 2. Create Sale Record for Product Analytics
                const { error: saleError } = await supabase.from('sales').insert({
                  id: crypto.randomUUID(),
                  date: selectedDate,
                  items: saleData.items, // Nested JSON array
                  total: saleData.total,
                  payment_method: saleData.paymentMethod,
                  user_id: profile.id,
                  created_at: new Date().toISOString()
                });

                if (saleError) {
                  const errorTrace = `ERRO SUPABASE (Sales Table): [${saleError.code}] ${saleError.message} | Detalhes: ${saleError.details} | Dica: ${saleError.hint}`;
                  console.error(errorTrace);
                  onShowToast('Atenção: A venda foi registrada no caixa, mas houve erro nas estatísticas (Tabela "sales" pode não existir).');
                }

                // 3. Update Stocks and Add History
                for (const item of saleData.items) {
                  const product = products.find(p => p.id === item.productId);
                  if (product) {
                    await supabase.from('products')
                      .update({ stock: Math.max(0, product.stock - item.quantity) })
                      .eq('id', item.productId);
                  }

                  await supabase.from('product_history').insert({
                    id: crypto.randomUUID(),
                    product_id: item.productId,
                    type: 'saida',
                    quantity: item.quantity,
                    reason: 'venda',
                    date: selectedDate,
                    user_id: profile.id
                  });
                }

                // Update local state
                if (trans) {
                  setTransactions(prev => [{
                    id: trans.id,
                    type: trans.type,
                    description: trans.description,
                    value: trans.value,
                    paymentMethod: trans.payment_method,
                    date: trans.date,
                    time: trans.time,
                    createdAt: trans.created_at
                  } as Transaction, ...prev]);
                }
                
                onShowToast('Venda finalizada com sucesso');
                setIsQuickSaleOpen(false);
              } catch (error) {
                console.error('Error saving sale:', error);
                onShowToast('Erro ao processar venda');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Cash Closing Modal */}
      <AnimatePresence>
        {isClosingModalOpen && (
          <CashClosingModal 
            totals={totals}
            transactions={transactions}
            session={currentSession!}
            onClose={() => setIsClosingModalOpen(false)}
            onConfirm={handleCloseCash}
          />
        )}
      </AnimatePresence>
      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1A] border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-zinc-400 text-sm mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OpeningModal({ onClose, onConfirm, initialDate }: { onClose: () => void, onConfirm: (val: number, date: string) => void, initialDate?: string }) {
  const [value, setValue] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-emerald-500/10">
          <h2 className="text-xl font-bold text-emerald-500 flex items-center gap-2">
            <Plus size={24} />
            Abertura de Caixa
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Data do Caixa</label>
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Troco Inicial em Dinheiro</label>
            <input 
              autoFocus
              type="number" 
              step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white text-2xl font-bold focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <button 
            onClick={() => onConfirm(parseFloat(value) || 0, date)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl text-lg transition-all shadow-lg shadow-emerald-500/20"
          >
            Confirmar Abertura
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HistoryModal({ sessions, onClose, onReopen, isAdmin, onSelectDate, onExport }: { sessions: CashSession[], onClose: () => void, onReopen: (s: CashSession) => void, isAdmin: boolean, onSelectDate: (date: string) => void, onExport: (s: CashSession) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History size={24} className="text-zinc-400" />
            Histórico de Caixas
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0A0A0A]/50 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Inicial</th>
                <th className="px-6 py-4 text-right">Entradas</th>
                <th className="px-6 py-4 text-right">Saídas</th>
                <th className="px-6 py-4 text-right">Saldo Final</th>
                <th className="px-6 py-4 text-right">Diferença</th>
                {isAdmin && <th className="px-6 py-4 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {s.status === 'open' ? 'Aberto' : 'Fechado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-zinc-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.initialValue)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-emerald-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.totalEntries || 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-red-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.totalExits || 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.finalValue || 0)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-bold ${(s.difference || 0) === 0 ? 'text-zinc-500' : (s.difference || 0) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.difference || 0)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 flex items-center gap-2">
                      <button 
                        onClick={() => {
                          onSelectDate(s.date);
                          onClose();
                        }}
                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                        title="Visualizar este dia"
                      >
                        <Search size={16} />
                      </button>
                      {s.status === 'closed' && (
                        <>
                          <button 
                            onClick={() => onExport(s)}
                            className="p-2 text-zinc-400 hover:bg-zinc-400/10 rounded-lg transition-all"
                            title="Exportar PDF"
                          >
                            <FileDown size={16} />
                          </button>
                          <button 
                            onClick={() => onReopen(s)}
                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Reabrir Caixa"
                          >
                            <History size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CashClosingModal({ totals, transactions, session, onClose, onConfirm }: { totals: Totals, transactions: Transaction[], session: CashSession, onClose: () => void, onConfirm: (data: ClosingData) => void }) {
  const [countedValue, setCountedValue] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [closingData, setClosingData] = useState<ClosingData | null>(null);
  
  const expectedValue = totals.cashInHand;
  const difference = (parseFloat(countedValue.replace(',', '.')) || 0) - expectedValue;

  const handleConfirm = () => {
    if (!countedValue) {
      return;
    }

    const data = {
      totalEntries: totals.entries,
      totalExits: totals.exits,
      expectedValue: expectedValue,
      finalValue: parseFloat(countedValue.replace(',', '.')),
      difference: difference,
      closingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setClosingData(data);
    onConfirm(data);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Caixa Fechado!</h2>
            <p className="text-zinc-400">O fechamento foi registrado com sucesso.</p>
          </div>

          <div className="space-y-3 pt-4">
            <button 
              onClick={() => generateCashReportPDF({ ...session, ...closingData, status: 'closed' } as CashSession, transactions, totals)}
              className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"
            >
              <FileDown size={20} />
              Exportar Relatório em PDF
            </button>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all"
            >
              Concluir
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 size={24} className="text-emerald-500" />
            Fechamento de Caixa
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black tracking-tight">SERVYX OS</h3>
            <p className="text-zinc-500 font-medium">Conferência de Fechamento</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-y border-zinc-800 py-6">
            <div className="text-center p-4 bg-zinc-900/50 rounded-2xl">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Troco Inicial</p>
              <p className="text-lg font-bold text-zinc-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.initial)}</p>
            </div>
            <div className="text-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Entradas (Faturamento)</p>
              <p className="text-lg font-bold text-emerald-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entries)}</p>
            </div>
            <div className="text-center p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Saídas</p>
              <p className="text-lg font-bold text-red-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.exits)}</p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl text-center">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Dinheiro Esperado em Caixa</p>
            <p className="text-4xl font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expectedValue)}</p>
            <p className="text-[10px] text-zinc-500 mt-2 font-medium">Cálculo: Troco Inicial + Entradas Dinheiro - Saídas Dinheiro</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Valor Contado no Caixa (R$)</label>
              <input 
                autoFocus
                type="number" 
                step="0.01"
                value={countedValue}
                onChange={e => setCountedValue(e.target.value)}
                placeholder="0,00"
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-4 text-white text-3xl font-black focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            <div className={`p-6 rounded-2xl border flex items-center justify-between ${difference === 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">Diferença</p>
                <p className={`text-2xl font-black ${difference === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(difference)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${difference === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {difference === 0 ? 'Caixa conferido com sucesso' : 'Diferença encontrada no caixa'}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleConfirm}
            className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl hover:bg-zinc-200 transition-all shadow-xl"
          >
            Confirmar Fechamento
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TransactionModal({ 
  type, 
  selectedDate, 
  suppliers = [],
  onClose, 
  onSave, 
  onShowToast 
}: { 
  type: 'entrada' | 'saida', 
  selectedDate: string, 
  suppliers?: { id: string, company_name: string }[],
  onClose: () => void, 
  onSave: (data: TransactionData) => void, 
  onShowToast: (msg: string) => void 
}) {
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Cartão' | 'Transferência'>('Dinheiro');
  const [outflowType, setOutflowType] = useState<'common' | 'purchase'>('common');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [productName, setProductName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'saida' && outflowType === 'purchase') {
      if (!selectedSupplierId) {
        onShowToast('Selecione um fornecedor');
        return;
      }
      if (!productName) {
        onShowToast('Informe o nome do produto');
        return;
      }
    } else if (!description) {
      onShowToast('Por favor, insira uma descrição');
      return;
    }

    if (!value || parseFloat(value.replace(',', '.')) <= 0) {
      onShowToast('Por favor, insira um valor válido');
      return;
    }

    const finalDescription = type === 'saida' && outflowType === 'purchase' 
      ? `Compra: ${productName} (${suppliers.find(s => s.id === selectedSupplierId)?.company_name})`
      : description;

    onSave({
      type,
      description: finalDescription,
      value: parseFloat(value.replace(',', '.')),
      paymentMethod,
      date: selectedDate,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      supplierId: outflowType === 'purchase' ? selectedSupplierId : undefined,
      productName: outflowType === 'purchase' ? productName : undefined
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className={`p-6 border-b border-zinc-800 flex items-center justify-between ${type === 'entrada' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${type === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
            {type === 'entrada' ? <Plus size={24} /> : <Minus size={24} />}
            Nova {type === 'entrada' ? 'Entrada' : 'Saída'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {type === 'saida' && (
            <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-zinc-800">
              <button 
                type="button" 
                onClick={() => setOutflowType('common')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${outflowType === 'common' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              >
                SAÍDA COMUM
              </button>
              <button 
                type="button" 
                onClick={() => setOutflowType('purchase')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${outflowType === 'purchase' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'}`}
              >
                COMPRA DE PRODUTO
              </button>
            </div>
          )}

          {type === 'saida' && outflowType === 'purchase' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Fornecedor</label>
                <select 
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="">Selecione um fornecedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.company_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Produto Comprado</label>
                <input 
                  type="text" 
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="Ex: 10 Telas iPhone 11, Lote de cabos..."
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Descrição</label>
              <input 
                autoFocus
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Aluguel, Luz, Vale funcionário..."
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white text-2xl font-bold focus:outline-none focus:border-zinc-600 transition-colors font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Forma de Pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Dinheiro', 'PIX', 'Cartão', 'Transferência'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[11px] font-bold transition-all transition-all ${
                    paymentMethod === method 
                    ? 'bg-zinc-800 border-zinc-600 text-white' 
                    : 'bg-[#0A0A0A] border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  {method === 'Dinheiro' && <Banknote size={14} />}
                  {method === 'PIX' && <QrCode size={14} />}
                  {method === 'Cartão' && <CreditCard size={14} />}
                  {method === 'Transferência' && <TrendingUp size={14} />}
                  {method}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg mt-2 ${
              type === 'entrada' 
              ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-emerald-500/20' 
              : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
            }`}
          >
            Confirmar {type === 'entrada' ? 'Entrada' : 'Saída'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function QuickSaleModal({ products, onClose, onSave, onShowToast }: { products: Product[], onClose: () => void, onSave: (data: SaleData) => void, onShowToast: (msg: string) => void }) {
  const [items, setItems] = useState<{ productId: string, productName: string, quantity: number, price: number, total: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Cartão' | 'Transferência'>('Dinheiro');
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const total = items.reduce((acc, item) => acc + item.total, 0);

  useEffect(() => {
    // Keep focus on barcode input
    const focusInterval = setInterval(() => {
      if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current && !search) {
        barcodeInputRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [search]);

  const handleAddProduct = (p: Product) => {
    const existingItemIndex = items.findIndex(item => item.productId === p.id);
    if (existingItemIndex > -1) {
      const newItems = [...items];
      newItems[existingItemIndex].quantity += 1;
      newItems[existingItemIndex].total = newItems[existingItemIndex].quantity * newItems[existingItemIndex].price;
      setItems(newItems);
    } else {
      setItems([...items, {
        productId: p.id,
        productName: p.name,
        quantity: 1,
        price: p.price,
        total: p.price
      }]);
    }
    setSearch('');
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;

    const product = products.find(p => p.barcode === barcode);
    if (product) {
      handleAddProduct(product);
      setBarcode('');
    } else {
      onShowToast('Produto não encontrado');
      setBarcode('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    newItems[index].total = newItems[index].quantity * newItems[index].price;
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      onShowToast('Adicione pelo menos um produto');
      return;
    }

    onSave({
      items,
      total,
      paymentMethod
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-blue-600/10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-blue-500 flex items-center gap-2">
              <ShoppingCart size={24} />
              Venda Rápida
            </h2>
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
              <input 
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="Bipar produto..."
                className="bg-blue-500/10 border border-blue-500/30 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-48 transition-all"
              />
            </form>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Side: Product Selection */}
          <div className="flex-1 p-6 border-r border-zinc-800 overflow-y-auto custom-scrollbar space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar por nome ou código..."
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  className="bg-[#0A0A0A] border border-zinc-800 hover:border-blue-500/50 p-4 rounded-2xl text-left transition-all group"
                >
                  <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{p.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-zinc-500">Estoque: {p.stock}</span>
                    <span className="text-sm font-bold text-emerald-500">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                    </span>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-zinc-500">
                  Nenhum produto encontrado.
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Sale Items */}
          <div className="w-full md:w-[400px] bg-zinc-900/30 p-6 flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Itens da Venda</h3>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-600 space-y-2">
                  <ShoppingCart size={32} opacity={0.2} />
                  <p className="text-sm">Nenhum item adicionado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="bg-[#0A0A0A] border border-zinc-800 p-3 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-white leading-tight">{item.productName}</p>
                        <button 
                          onClick={() => handleRemoveItem(index)}
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1">
                          <button 
                            onClick={() => handleUpdateQuantity(index, -1)}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(index, 1)}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-emerald-500">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6 pt-6 border-t border-zinc-800">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Dinheiro', 'PIX', 'Cartão', 'Transferência'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        paymentMethod === method 
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
                        : 'bg-[#0A0A0A] border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {method === 'Dinheiro' && <Banknote size={14} />}
                      {method === 'PIX' && <QrCode size={14} />}
                      {method === 'Cartão' && <CreditCard size={14} />}
                      {method === 'Transferência' && <TrendingUp size={14} />}
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                </span>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={items.length === 0}
                className="w-full py-4 bg-white text-black font-black rounded-2xl text-lg hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Finalizar Venda
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


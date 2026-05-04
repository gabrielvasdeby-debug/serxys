import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Minus, ShoppingCart, 
  Calendar, Clock, CreditCard, Banknote, QrCode, ArrowUpRight, 
  ArrowDownLeft, CheckCircle2, X, Search, Trash2,
  TrendingUp, TrendingDown, Wallet, History, Save,
  ShieldAlert, AlertCircle, Barcode, FileDown, Printer, ShoppingBag, ChevronRight, Check,
  Calculator, ChevronUp, ChevronDown, ChevronLeft, HelpCircle, Loader2, Home
} from 'lucide-react';
import { supabase } from '../supabase';
import { generateCashReportPDF } from '../utils/pdfGenerator';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { capFirst } from '../utils/capFirst';
import CountryCodePicker, { countries, Country } from './CountryCodePicker';
import { formatPhone } from '../utils/formatPhone';
import InfoTooltip from './InfoTooltip';
import { Product } from '../types';

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  description: string;
  value: number;
  paymentMethod: 'Dinheiro' | 'PIX' | 'Débito' | 'Crédito' | 'Link';
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
  items: { productId: string, productName: string, productBrand?: string, productModel?: string, quantity: number, price: number, total: number }[];
  total: number;
  paymentMethod: string;
  customerName?: string;
  saleNumber?: number;
}

export interface Sale {
  id: string;
  saleNumber: number;
  date: string;
  time: string;
  items: { productId: string, productName: string, productBrand?: string, productModel?: string, quantity: number, price: number, total: number }[];
  total: number;
  paymentMethod: string;
  customerName?: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

interface CaixaModuleProps {
  profile: {
    id: string;
    name: string;
    type: string;
    photo: string;
    [key: string]: string | number | boolean | undefined | null | string[];
  };
  companySettings?: any;
  onBack: () => void;
  onShowToast: (message: string) => void;
  onUpdateChecklist?: () => void;
  initialView?: string;
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
}

export interface Totals {
  initial: number;
  entries: number;
  entriesByType: Record<string, number>;
  exits: number;
  balance: number;
  cashInHand: number;
}

export default function CaixaModule({ profile, companySettings, onBack, onShowToast, onUpdateChecklist, initialView, onLogActivity }: CaixaModuleProps) {
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [availableSuppliers, setAvailableSuppliers] = useState<{ id: string, company_name: string }[]>([]);
  const [customers, setCustomers] = useState<{id: string, name: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'fluxo' | 'vendas'>('fluxo');
  const [sales, setSales] = useState<Sale[]>([]);
  useEffect(() => {
    if (initialView === 'PDV' && currentSession?.status === 'open') {
      setIsQuickSaleOpen(true);
    }
  }, [initialView, currentSession?.status]);

  const [searchSale, setSearchSale] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSalesLoading, setIsSalesLoading] = useState(false);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [tourStepTimer, setTourStepTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showEntriesTooltip, setShowEntriesTooltip] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setLoading(true);

    const fetchData = async () => {
      // FASE 1: Dispara open session + dados secundários em paralelo
      const [
        openSessionsResult,
        productsResult,
        suppliersResult,
        customersResult,
        allSessionsResult,
      ] = await Promise.all([
        supabase.from('cash_sessions').select('*').eq('company_id', profile.company_id).eq('status', 'open').order('opened_at', { ascending: false }).limit(1),
        supabase.from('products').select('*').eq('company_id', profile.company_id),
        supabase.from('suppliers').select('id, company_name').eq('company_id', profile.company_id).order('company_name'),
        supabase.from('customers').select('id, name').eq('company_id', profile.company_id).order('name'),
        supabase.from('cash_sessions').select('*').eq('company_id', profile.company_id).order('date', { ascending: false }).limit(50),
      ]);

      // Processa dados secundários (não bloqueiam o render)
      if (productsResult.data) setProducts(productsResult.data.map(p => ({
        id: p.id, name: p.name, price: p.price, stock: p.stock,
        category: p.category, minStock: p.min_stock, barcode: p.barcode,
        brand: p.brand, model: p.model, image: p.image
      })) as Product[]);
      if (suppliersResult.data) setAvailableSuppliers(suppliersResult.data);
      if (customersResult.data) setCustomers(customersResult.data);
      if (allSessionsResult.data) {
        setSessions(allSessionsResult.data.map(s => ({
          id: s.id, date: s.date, status: s.status,
          openingTime: s.opened_at ? new Date(s.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---',
          openingUser: s.opened_by, openingUserName: s.opened_by_name || 'Sistema',
          closingTime: s.closed_at ? new Date(s.closed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---',
          closingUser: s.closed_by, closingUserName: s.closed_by_name || 'Sistema',
          initialValue: s.opening_balance, finalValue: s.closing_balance || 0,
          expectedValue: s.expected_balance || 0, totalEntries: s.total_entries || 0,
          totalExits: s.total_exits || 0, difference: s.difference || 0
        }) as CashSession));
      }

      // Determina a data correta
      const openSession = openSessionsResult.data && openSessionsResult.data.length > 0 ? openSessionsResult.data[0] : null;
      let dateToFetch = selectedDate;
      const isDefaultToday = selectedDate === today;
      if (openSession && isDefaultToday) {
        dateToFetch = openSession.date;
        setSelectedDate(dateToFetch);
      }

      // FASE 2: Busca sessão da data + vendas em paralelo
      const [sessionForDateResult, salesResult] = await Promise.all([
        supabase.from('cash_sessions').select('*').eq('company_id', profile.company_id).eq('date', dateToFetch).order('status', { ascending: false }).limit(1),
        supabase.from('sales').select('*').eq('company_id', profile.company_id).eq('date', dateToFetch).order('created_at', { ascending: false }),
      ]);

      const sessionData = sessionForDateResult.data && sessionForDateResult.data.length > 0 ? sessionForDateResult.data[0] : null;

      if (sessionData) {
        setCurrentSession({
          id: sessionData.id, date: sessionData.date, status: sessionData.status,
          openingTime: sessionData.opened_at ? new Date(sessionData.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
          openingUser: sessionData.opened_by, openingUserName: sessionData.opened_by_name || 'Usuário',
          initialValue: sessionData.opening_balance,
          closingTime: sessionData.closed_at ? new Date(sessionData.closed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
          finalValue: sessionData.closing_balance
        } as CashSession);
      } else {
        setCurrentSession(null);
      }

      if (salesResult.data) {
        setSales(salesResult.data.map(s => ({
          id: s.id, saleNumber: s.sale_number, date: s.date,
          time: s.time || new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          items: s.items, total: s.total, paymentMethod: s.payment_method,
          customerName: s.customer_name, userId: s.user_id,
          userName: s.user_name, createdAt: s.created_at
        })) as Sale[]);
      }

      // FASE 3: Busca transações (depende do sessionData)
      const transQuery = sessionData
        ? supabase.from('transactions').select('*').eq('company_id', profile.company_id).eq('session_id', sessionData.id).order('created_at', { ascending: false })
        : supabase.from('transactions').select('*').eq('company_id', profile.company_id).eq('date', dateToFetch).order('created_at', { ascending: false });

      const { data: transData } = await transQuery;

      if (transData) {
        setTransactions(transData.map(t => ({
          id: t.id, type: t.type, description: t.description, value: t.value,
          paymentMethod: t.payment_method, date: t.date, time: t.time,
          osId: t.os_id, userId: t.user_id, createdAt: t.created_at
        })) as Transaction[]);
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
      balance: entriesByType.total - exits,
      cashInHand: initial + cashEntries - cashExits
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
      const { data: sessionsForDate, error: existingErr } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('date', date)
        .order('opened_at', { ascending: false });

      if (existingErr) throw existingErr;

      const existingForDate = sessionsForDate && sessionsForDate.length > 0
        ? (sessionsForDate.find(s => s.status === 'open') || sessionsForDate[0])
        : null;

      if (existingForDate) {
        if (existingForDate.status === 'open') {
          setCurrentSession({
            id: existingForDate.id,
            date: existingForDate.date,
            status: 'open',
            openingTime: existingForDate.opened_at ? new Date(existingForDate.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            openingUser: existingForDate.opened_by,
            openingUserName: existingForDate.opened_by_name || profile.name as string,
            initialValue: existingForDate.opening_balance
          } as CashSession);
          setSelectedDate(date);
          setIsOpeningModalOpen(false);
          onShowToast('Caixa carregado.');
          return;
        }
      }

      const { data: staleOpen } = await supabase
        .from('cash_sessions')
        .select('id, date')
        .eq('company_id', profile.company_id)
        .eq('status', 'open')
        .neq('date', date);

      if (staleOpen && staleOpen.length > 0) {
        await supabase
          .from('cash_sessions')
          .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: profile.id })
          .in('id', staleOpen.map(s => s.id));
      }

      const { data, error: insertError } = await supabase.from('cash_sessions').insert({
        id: crypto.randomUUID(),
        company_id: profile.company_id,
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
          status: 'open',
          openingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          openingUser: data.opened_by,
          openingUserName: profile.name as string,
          initialValue: data.opening_balance
        } as CashSession);
        setSelectedDate(date);
        setTransactions([]);
        onShowToast('Caixa aberto com sucesso');
        setIsOpeningModalOpen(false);
        onLogActivity?.('CAIXA', 'ABRIU CAIXA', {
          date,
          initialValue,
          description: `Abriu o caixa do dia ${date} com saldo inicial de R$ ${initialValue.toFixed(2)}`
        });
        if (onUpdateChecklist) onUpdateChecklist();

        const tourStep = localStorage.getItem('servyx_tour_step');
        if (tourStep === '4') {
          const timer = setTimeout(() => {
            localStorage.setItem('servyx_tour_step', '5');
            onShowToast('Tour: Vamos ver a Venda Rápida agora!');
          }, 3000);
          setTourStepTimer(timer);
        }
      }
    } catch (error: any) {
      console.error('Erro ao abrir caixa:', error);
      onShowToast(`Erro ao abrir caixa: ${error.message}`);
    }
  };

  useEffect(() => {
    return () => {
      if (tourStepTimer) clearTimeout(tourStepTimer);
    };
  }, [tourStepTimer]);

  const handleCloseCash = async (closingData: ClosingData) => {
    if (!currentSession) return;
    try {
      const updatePayload: Record<string, unknown> = {
        status: 'closed',
        closing_balance: closingData.finalValue,
        closed_by: profile.id,
        closed_at: new Date().toISOString(),
      };

      try {
        const { error: testError } = await supabase.from('cash_sessions').update({
          ...updatePayload,
          total_entries: totals.entries,
          total_exits: totals.exits,
          difference: closingData.difference
        }).eq('id', currentSession.id);

        if (testError) throw testError;
      } catch {
        const { error: fallbackError } = await supabase.from('cash_sessions').update(updatePayload).eq('id', currentSession.id);
        if (fallbackError) throw fallbackError;
      }

      onShowToast('Caixa fechado com sucesso');
      onLogActivity?.('CAIXA', 'FECHOU CAIXA', {
        date: currentSession.date,
        finalValue: closingData.finalValue,
        difference: closingData.difference,
        description: `Fechou o caixa do dia ${currentSession.date}. Saldo final: R$ ${closingData.finalValue.toFixed(2)}`
      });
      setCurrentSession(prev => prev ? { ...prev, status: 'closed', finalValue: closingData.finalValue } : null);
      setIsClosingModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao fechar caixa:', error);
      onShowToast(`Erro ao fechar caixa: ${error?.message || 'Verifique o console'}`);
    }
  };

  const handleExportPastSession = async (session: CashSession) => {
    try {
      const { data: transData } = await supabase.from('transactions').select('*').eq('date', session.date);
      const trans = (transData || []).map(t => ({
        id: t.id,
        type: t.type,
        description: t.description,
        value: Number(t.value),
        paymentMethod: t.payment_method,
        date: t.date,
        time: t.time
      })) as Transaction[];

      const pastTotals: Totals = {
        initial: session.initialValue,
        entries: trans.filter(t => t.type === 'entrada').reduce((acc, t) => acc + t.value, 0),
        entriesByType: trans.filter(t => t.type === 'entrada').reduce((acc, t) => {
          const method = t.paymentMethod || 'Dinheiro';
          acc[method] = (acc[method] || 0) + t.value;
          return acc;
        }, {} as Record<string, number>),
        exits: trans.filter(t => t.type === 'saida').reduce((acc, t) => acc + t.value, 0),
        balance: 0,
        cashInHand: 0
      };
      pastTotals.balance = pastTotals.entries - pastTotals.exits;
      pastTotals.cashInHand = pastTotals.initial + (pastTotals.entriesByType['Dinheiro'] || 0) - trans.filter(t => t.type === 'saida' && t.paymentMethod === 'Dinheiro').reduce((acc, t) => acc + t.value, 0);

      generateCashReportPDF(session, trans, pastTotals, companySettings);
    } catch (error: any) {
      console.error('Erro na exportação:', error);
      onShowToast('Erro ao exportar relatório');
    }
  };

  const handleReopenCash = async (session: CashSession) => {
    if (profile.type !== 'ADM') {
      onShowToast('Apenas administradores podem reabrir o caixa');
      return;
    }
    try {
      const updatePayload = {
        status: 'open',
        closed_at: null,
        closed_by: null,
        closing_balance: null
      };

      try {
        const { error: testError } = await supabase.from('cash_sessions').update({
          ...updatePayload,
          total_entries: null,
          total_exits: null,
          difference: null
        }).eq('id', session.id);
        
        if (testError) throw testError;
      } catch {
        const { error: fallbackError } = await supabase.from('cash_sessions').update(updatePayload).eq('id', session.id);
        if (fallbackError) throw fallbackError;
      }

      setCurrentSession(prev => prev ? { ...prev, status: 'open' } : null);
      onShowToast('Caixa reaberto');
    } catch (error: any) {
      console.error('Erro ao reabrir:', error);
      onShowToast(`Erro ao reabrir: ${error?.message || 'Verifique o console'}`);
    }
  };

  const handleReprintSale = (sale: Sale) => {
    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (!printWin) return;
    const company = companySettings?.name || 'Sua Empresa';
    const dateStr = new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR');
    const saleNumStr = String(sale.saleNumber).padStart(8, '0');
    const itemsHtml = (sale.items || []).map(i => {
      const brandModel = (i.productBrand || i.productModel) ? ` (${i.productBrand || ''} ${i.productModel || ''})`.trim() : '';
      return `<tr><td style="padding:2px 0">${i.productName}${brandModel}</td><td style="text-align:center">${i.quantity}x</td><td style="text-align:right">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(i.price)}</td><td style="text-align:right">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(i.total)}</td></tr>`;
    }).join('');

    printWin.document.write(`
      <html><head><title>2ª Via - Cupom ${saleNumStr}</title><style>
        body{font-family:monospace;font-size:12px;width:72mm;margin:0 auto;padding:4px;color:#000}
        .header{text-align:center;margin-bottom:8px}
        h2{margin:0;font-size:16px;text-transform:uppercase}
        p{margin:2px 0;font-size:10px}
        .dashed{border-top:1px dashed #000;margin:8px 0}
        table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px}
        .total-row{font-weight:bold;font-size:14px;display:flex;justify-content:space-between;margin:4px 0}
        .footer{text-align:center;font-size:9px;margin-top:15px;line-height:1.4}
        .id-row{text-align:center;font-weight:bold;font-size:11px;margin:4px 0}
        .reprint-banner{text-align:center;font-size:9px;font-weight:bold;border:1px dashed #000;padding:2px;margin:4px 0}
      </style></head><body>
        <div class="header">
          ${companySettings?.logoUrl ? `<img src="${companySettings.logoUrl}" style="max-width:120px;max-height:50px;margin:0 auto 10px;display:block;filter:grayscale(1) contrast(1.5)" />` : ''}
          <h2>${company}</h2>
          ${companySettings?.cnpj ? `<p>CNPJ: ${companySettings.cnpj}</p>` : ''}
          <p>${companySettings?.street || ''}, ${companySettings?.number || ''}</p>
          <p>${companySettings?.neighborhood || ''} - ${companySettings?.city || ''}/${companySettings?.state || ''}</p>
          ${(companySettings?.phone || companySettings?.whatsapp) ? `<p>Contato: ${companySettings.phone || ''} ${companySettings.whatsapp || ''}</p>` : ''}
        </div>
        <div class="dashed"></div>
        <div class="reprint-banner">*** 2ª VIA DO CUPOM ***</div>
        <div class="id-row">VENDA Nº: ${saleNumStr}</div>
        <p style="text-align:center;font-weight:bold;font-size:11px;margin:2px 0">CLIENTE: ${sale.customerName || 'Cliente Balcão'}</p>
        <p style="text-align:center">DATA: ${dateStr} - HORA: ${sale.time}</p>
        <div class="dashed"></div>
        <table>
          <thead><tr>
            <th style="text-align:left">DESCRIÇÃO</th><th>QTD</th><th style="text-align:right">UNIT</th><th style="text-align:right">TOTAL</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="dashed"></div>
        <div class="total-row"><span>VALOR TOTAL:</span><span>${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(sale.total)}</span></div>
        <p style="text-align:right;font-weight:bold">PAGAMENTO: ${sale.paymentMethod}</p>
        <div class="dashed"></div>
        <div class="footer"><p>Obrigado pela preferência!</p><p>Volte Sempre</p><p style="margin-top:8px;font-size:8px">Sistema de Gestão SERVYX</p></div>
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 500);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (currentSession?.status === 'closed') {
      onShowToast('Módulo bloqueado (Caixa Fechado)');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Transação',
      message: 'Deseja realmente excluir esta transação?',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          if (error) throw error;
          setTransactions(prev => prev.filter(t => t.id !== id));
          onShowToast('Transação excluída');
        } catch (error) {
          onShowToast('Erro ao excluir');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (currentSession?.status === 'closed') {
      onShowToast('Módulo bloqueado (Caixa Fechado)');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Venda',
      message: `Deseja realmente cancelar a venda #${String(sale.saleNumber).padStart(8, '0')}? Os produtos retornarão ao estoque.`,
      onConfirm: async () => {
        try {
          // 1. Devolver produtos ao estoque
          for (const item of sale.items) {
            const { data: prodData } = await supabase.from('products').select('stock').eq('id', item.productId).single();
            if (prodData) {
              const newStock = Math.max(0, prodData.stock + item.quantity);
              await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', item.productId);
              
              // Registrar no histórico do produto
              await supabase.from('product_history').insert({
                product_id: item.productId,
                company_id: profile.company_id,
                type: 'entrada',
                quantity: item.quantity,
                reason: 'cancelamento',
                description: `Venda #${String(sale.saleNumber).padStart(8, '0')} cancelada`,
                date: selectedDate,
                user_id: profile.id
              });
            }
          }

          // 2. Excluir a transação financeira associada (pela descrição)
          const saleDescription = `Venda #${String(sale.saleNumber).padStart(8, '0')}`;
          const { data: transToDelete } = await supabase
            .from('transactions')
            .select('id')
            .eq('company_id', profile.company_id)
            .ilike('description', `%${saleDescription}%`)
            .eq('date', sale.date)
            .single();

          if (transToDelete) {
            await supabase.from('transactions').delete().eq('id', transToDelete.id);
            setTransactions(prev => prev.filter(t => t.id !== transToDelete.id));
          }

          // 3. Excluir a venda
          const { error: saleError } = await supabase.from('sales').delete().eq('id', sale.id);
          if (saleError) throw saleError;

          setSales(prev => prev.filter(s => s.id !== sale.id));
          setSelectedSale(null);
          onShowToast('Venda cancelada e produtos devolvidos ao estoque');
          
          onLogActivity?.('CAIXA', 'CANCELOU VENDA', {
            saleNumber: sale.saleNumber,
            total: sale.total,
            description: `Cancelou venda #${sale.saleNumber} e retornou itens ao estoque`
          });

          // Atualizar lista de produtos local se necessário (o ideal seria dar um refetch ou atualizar localmente)
          const { data: updatedProducts } = await supabase.from('products').select('*').eq('company_id', profile.company_id);
          if (updatedProducts) {
             setProducts(updatedProducts.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                stock: p.stock,
                category: p.category,
                minStock: p.min_stock,
                barcode: p.barcode,
                brand: p.brand,
                model: p.model,
                image: p.image
            })));
          }

        } catch (error: any) {
          console.error('Erro ao cancelar venda:', error);
          onShowToast(`Erro ao cancelar: ${error.message}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const canAction = currentSession?.status === 'open';

  if (profile.type === 'Técnico') {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <ShieldAlert size={64} className="text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <button onClick={onBack} className="text-blue-500 hover:underline">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen bg-[#1A1A1A] text-white flex flex-col font-sans md:overflow-hidden">
      <header className="bg-[#111111] border-b border-zinc-700/80 p-3 sm:p-4 sticky top-0 z-20 backdrop-blur-3xl shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 overflow-x-hidden">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={onBack} className="p-2 sm:px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl sm:rounded-2xl transition-all active:scale-95 group shrink-0 flex items-center gap-2">
              <ChevronLeft className="w-6 h-6 sm:w-4 sm:h-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300 hidden sm:inline">Sair do Caixa</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black tracking-tight truncate">Caixa Diário</h1>
                {currentSession && (
                  <span className={`px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-widest shrink-0 ${currentSession.status === 'open' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                    {currentSession.status === 'open' ? 'Ativo' : 'Encerrado'}
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button 
              onClick={() => {
                if (canAction) {
                  onShowToast("Encerre o caixa de hoje para navegar entre datas.");
                  return;
                }
                setIsCalendarOpen(true);
              }}
              className="p-2 sm:px-6 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-xl sm:rounded-2xl text-zinc-400 hover:text-white transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
            >
              <Calendar size={14} />
              <span className="hidden sm:inline">Ver Datas</span>
            </button>
            {canAction && (
              <button 
                onClick={() => setIsClosingModalOpen(true)} 
                className="px-3 py-2 sm:px-6 sm:py-3 bg-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-100 border border-zinc-700 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 shrink-0"
              >
                <X size={14} strokeWidth={3} />
                <span>Fechar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-4 overflow-y-auto md:overflow-hidden min-h-0 pb-20 md:pb-4">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-[#00E676]/20 border-t-[#00E676] rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Dados...</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-4 md:overflow-hidden min-h-0">
            {!canAction && (
              <div className="bg-[#1A1A1A] border border-zinc-700/40 rounded-[24px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-zinc-700 bg-zinc-800`}>
                    {currentSession?.status === 'closed' ? <ShieldAlert className="text-zinc-500" size={24} /> : <AlertCircle className="text-zinc-500" size={24} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100 flex items-center gap-2">
                       {currentSession?.status === 'closed' ? 'Caixa Encerrado' : (selectedDate === today ? 'INICIAR NOVO CAIXA DIARIO' : 'Caixa Não Iniciado')}
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-500 border border-zinc-700`}>
                         {selectedDate === today ? 'Hoje' : format(parseISO(selectedDate), 'dd/MM/yyyy')}
                       </span>
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1 leading-relaxed truncate">
                      {currentSession?.status === 'closed' ? `Encerrado às ${currentSession.closingTime} por ${currentSession.closingUserName}` : (selectedDate === today ? 'Deseja abrir o caixa para realizar vendas e lançamentos hoje?' : 'Não existem lançamentos para esta data.')}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    {currentSession?.status === 'closed' && profile.type === 'ADM' && (
                      <button 
                        onClick={() => handleReopenCash(currentSession)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-800 text-zinc-400 font-black border border-zinc-700 rounded-xl uppercase text-[9px] tracking-widest transition-all"
                      >
                        <Calculator size={12} />
                        Reabrir
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setIsOpeningModalOpen(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white text-black font-black rounded-xl uppercase text-[9px] tracking-widest transition-all shadow-sm"
                    >
                      <Plus size={12} strokeWidth={3} />
                      {currentSession?.status === 'closed' ? 'INICIAR NOVO CAIXA DIARIO' : 'Abrir Caixa'}
                    </button>

                    {currentSession && (
                      <button 
                        onClick={() => handleExportPastSession(currentSession)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold border border-zinc-700/50 rounded-xl uppercase text-[9px] tracking-widest transition-all"
                      >
                        <FileDown size={12} />
                        Exportar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                <div className={`bg-[#111111] border border-zinc-700/60 px-3 py-3 rounded-[20px] relative overflow-hidden group shadow-sm`}>
                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform text-emerald-500"><Banknote size={35} /></div>
                   <p className="text-[7px] font-black text-zinc-500 uppercase tracking-[0.1em] mb-1">Dinheiro em Caixa</p>
                   <h2 className={`text-lg sm:text-xl font-black ${totals.cashInHand >= 0 ? 'text-white' : 'text-red-500'} tracking-tighter`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.cashInHand)}
                   </h2>
                </div>
               <div className="bg-[#111111] border border-zinc-700/60 px-3 py-3 rounded-[20px] group relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform text-emerald-500"><TrendingUp size={30} /></div>
                  <p className="text-[7px] font-black text-zinc-500 uppercase tracking-[0.1em] mb-1">Total Entradas</p>
                  <h2 className="text-lg sm:text-xl font-black text-emerald-500 tracking-tighter">
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entries)}
                  </h2>
               </div>
               <div className="bg-[#111111] border border-zinc-700/60 px-3 py-3 rounded-[20px] group relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform text-red-500"><TrendingDown size={30} /></div>
                  <p className="text-[7px] font-black text-zinc-500 uppercase tracking-[0.1em] mb-1">Total Saídas</p>
                  <h2 className="text-lg sm:text-xl font-black text-red-500 tracking-tighter">
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.exits)}
                  </h2>
               </div>
                <div className={`bg-[#111111] border border-zinc-700/60 px-3 py-3 rounded-[20px] group relative overflow-hidden shadow-sm`}>
                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform text-blue-500"><Calculator size={30} /></div>
                   <p className="text-[7px] font-black text-zinc-500 uppercase tracking-[0.1em] mb-1">Saldo Líquido</p>
                   <h2 className={`text-lg sm:text-xl font-black ${totals.balance >= 0 ? 'text-blue-500' : 'text-red-500'} tracking-tighter`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.balance)}
                   </h2>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 md:overflow-hidden min-h-0">
               
               <div className="w-full lg:w-[380px] shrink-0 md:overflow-y-auto custom-scrollbar pr-1 min-h-0 pb-4 flex flex-col gap-5">
                  <div className="space-y-4 shrink-0">
                     <div className="flex items-center gap-2 px-1">
                        <div className="w-1 h-3 bg-zinc-800 rounded-full"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Painel de Ações</h3>
                     </div>
                     {canAction ? (
                        <>
                           <button 
                             onClick={() => setIsQuickSaleOpen(true)}
                             className="w-full h-20 md:h-24 bg-zinc-900 border border-blue-500/30 hover:border-blue-500/50 text-zinc-400 rounded-xl md:rounded-2xl transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1 group relative overflow-hidden shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.05)]"
                           >
                              <div className="absolute inset-0 bg-blue-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <ShoppingCart size={22} className="text-blue-500/50 group-hover:text-blue-400 transition-all" strokeWidth={2.5} />
                              <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-blue-500/50 group-hover:text-blue-400 transition-colors">Nova Venda</span>
                           </button>
                           
                           <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => { setTransactionModalType('entrada'); setIsTransactionModalOpen(true); }} className="flex h-16 bg-zinc-900 border border-emerald-500/30 hover:border-emerald-500/50 text-zinc-400 rounded-xl transition-all active:scale-[0.98] items-center justify-center gap-2 group shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                 <Plus size={18} strokeWidth={3} className="text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 group-hover:text-emerald-400">Entrada</span>
                              </button>
                              <button onClick={() => { setTransactionModalType('saida'); setIsTransactionModalOpen(true); }} className="flex h-16 bg-zinc-900 border border-red-500/30 hover:border-red-500/50 text-zinc-400 rounded-xl transition-all active:scale-[0.98] items-center justify-center gap-2 group shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                                 <Minus size={18} strokeWidth={3} className="text-red-500/50 group-hover:text-red-400 transition-colors" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-red-500/50 group-hover:text-red-400">Retirada</span>
                              </button>
                           </div>
                        </>
                     ) : (
                        <div className="bg-[#111111] border border-zinc-700/40 rounded-[28px] p-6 text-center border-dashed">
                           <ShieldAlert className="mx-auto text-zinc-500 mb-2" size={32} />
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ações Bloqueadas</p>
                           <p className="text-[9px] font-bold text-zinc-600 uppercase mt-1">Abra ou reabra o caixa para registrar novas operações.</p>
                        </div>
                     )}
                  </div>

                  <div className="bg-[#111111] border border-zinc-700/40 rounded-[32px] p-6 space-y-6 shadow-2xl shrink-0">
                     <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4 relative">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Entradas por Método</span>
                        <div className="relative group/info">
                           <button 
                             onMouseEnter={() => setShowEntriesTooltip(true)}
                             onMouseLeave={() => setShowEntriesTooltip(false)}
                             onClick={() => setShowEntriesTooltip(!showEntriesTooltip)}
                             className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-blue-400 hover:border-blue-400/50 transition-all text-[11px] font-black"
                           >
                             i
                           </button>
                           <AnimatePresence>
                              {showEntriesTooltip && (
                                 <motion.div 
                                   initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                   animate={{ opacity: 1, y: 0, scale: 1 }}
                                   exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                   className="absolute bottom-full right-0 mb-3 w-72 p-4 bg-zinc-800 border border-zinc-700 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] backdrop-blur-xl pointer-events-none"
                                 >
                                    <div className="flex gap-3">
                                       <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-700">
                                          <HelpCircle size={14} className="text-zinc-400" />
                                       </div>
                                       <div className="space-y-2">
                                          <p className="text-[11px] text-zinc-300 font-bold leading-relaxed">
                                            As "Entradas por Método" são um resumo detalhado de como o dinheiro entrou na sua empresa, separado pela forma de pagamento utilizada.
                                          </p>
                                          <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                            Em vez de ver apenas o valor total, este painel quebra os valores para você saber exatamente quanto recebeu em cada categoria.
                                          </p>
                                       </div>
                                    </div>
                                    <div className="absolute top-full right-1.5 -mt-1 border-4 border-transparent border-t-zinc-800"></div>
                                 </motion.div>
                              )}
                           </AnimatePresence>
                        </div>
                     </div>
                     <div className="space-y-4">
                        {Object.keys(totals.entriesByType).filter(k => k !== 'total' && totals.entriesByType[k] > 0).map((method) => {
                           const config: Record<string, { label: string, color: string, barColor: string }> = {
                             'Dinheiro': { label: 'Dinheiro', color: 'text-zinc-300', barColor: 'bg-zinc-600' },
                             'PIX': { label: 'PIX', color: 'text-zinc-300', barColor: 'bg-zinc-700' },
                             'Débito': { label: 'Débito', color: 'text-zinc-300', barColor: 'bg-zinc-800' },
                             'Crédito': { label: 'Crédito', color: 'text-zinc-300', barColor: 'bg-zinc-800' },
                             'Link': { label: 'Link de Pagamento', color: 'text-zinc-300', barColor: 'bg-zinc-800' },
                           };
                           const { label, color, barColor } = config[method] || { label: method, color: 'text-zinc-400', barColor: 'bg-zinc-700' };
                           const val = totals.entriesByType[method] || 0;
                           const percent = Math.min(100, totals.entries > 0 ? (val / totals.entries) * 100 : 0);
                           return (
                             <div key={method} className="space-y-2">
                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter">{label}</span>
                                   <span className={`text-[12px] font-black ${color}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}</span>
                                </div>
                                <div className="h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                                   <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className={`h-full ${barColor}`} />
                                </div>
                             </div>
                           );
                        })}
                     </div>
                  </div>
               </div>

               <div className="flex-1 flex flex-col gap-4 md:overflow-hidden min-h-0 mb-10 md:mb-0">
                  <div className="flex items-center gap-2 px-1 shrink-0">
                     <div className="w-1 h-3 bg-zinc-700 rounded-full"></div>
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Histórico de Atividades</h3>
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3 shrink-0">
                     <div className="flex w-full sm:w-auto gap-2 p-1 bg-zinc-800/40 border border-zinc-700/50 rounded-2xl">
                        <button onClick={() => setActiveTab('fluxo')} className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'fluxo' ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-400 hover:text-zinc-300'}`}>Lançamentos</button>
                        <button onClick={() => setActiveTab('vendas')} className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'vendas' ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-400 hover:text-zinc-300'}`}>Vendas PDV</button>
                     </div>
                     {activeTab === 'fluxo' && (
                        <div className="hidden sm:flex gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800">
                           {['all', 'entrada', 'saida'].map(type => (
                             <button 
                               key={type} 
                               onClick={() => setFilterType(type as any)} 
                               className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                 filterType === type 
                                   ? (type === 'entrada' ? 'bg-emerald-500 text-black' : type === 'saida' ? 'bg-red-500 text-white' : 'bg-zinc-100 text-black') 
                                   : 'text-zinc-400 hover:text-zinc-400'
                               }`}
                             >
                               {type === 'all' ? 'Ver Tudo' : type === 'entrada' ? 'Entradas' : 'Saídas'}
                             </button>
                           ))}
                        </div>
                     )}
                  </div>

                  {activeTab === 'fluxo' ? (
                    <div className="flex-1 bg-[#111111] border border-zinc-700/50 rounded-[32px] md:overflow-hidden shadow-sm flex flex-col min-h-0">
                       <div className="divide-y divide-zinc-900/40 md:overflow-y-auto flex-1 custom-scrollbar">
                          {filteredTransactions.map((t) => (
                             <div key={t.id} className="p-3 flex items-center gap-4 hover:bg-white/[0.01] transition-colors group">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-zinc-800 shadow-inner bg-zinc-900 ${t.type === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                                   {t.type === 'entrada' ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownLeft size={18} strokeWidth={2.5} />}
                                </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                     <p className="text-xs font-black text-white uppercase truncate tracking-tight min-w-0 flex-1">{t.description}</p>
                                     <span className={`text-sm font-black tracking-tighter shrink-0 whitespace-nowrap ${t.type === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>{t.type === 'entrada' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                     <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={10} className="text-zinc-600" /> {t.time}</span>
                                     <span className="text-[9px] font-black text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-lg border border-zinc-700/40 uppercase tracking-tighter shadow-sm">{t.paymentMethod}</span>
                                     {t.osId && <span className="text-[9px] font-black text-blue-500/40 uppercase tracking-widest pl-3 border-l border-zinc-700/50">OS {t.osId}</span>}
                                  </div>
                               </div>
                               {canAction && (<button onClick={() => handleDeleteTransaction(t.id)} className="p-2 text-zinc-600 hover:text-zinc-400 transition-all sm:opacity-0 sm:group-hover:opacity-100 active:scale-95"><Trash2 size={18} /></button>)}
                            </div>
                          ))}
                          {filteredTransactions.length === 0 && (
                            <div className="flex-1 py-12 text-center flex flex-col items-center justify-center gap-4 grayscale opacity-10"><TrendingUp size={48} /><p className="text-xs font-black uppercase tracking-[0.5em]">Nenhum registro</p></div>
                          )}
                       </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col gap-4 md:overflow-hidden min-h-0">
                       <div className="relative group shrink-0">
                          <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#00E676] transition-colors" />
                          <input type="text" placeholder="Buscar venda ou cliente..." value={searchSale} onChange={e => setSearchSale(e.target.value)} className="w-full bg-[#111111] border-2 border-zinc-800 rounded-[32px] pl-16 pr-8 py-5 text-sm font-black text-white focus:outline-none focus:border-[#00E676]/10 shadow-2xl transition-all placeholder:text-zinc-900 uppercase" />
                       </div>
                       <div className="flex-1 bg-[#111111] border border-zinc-700/50 rounded-[32px] md:overflow-hidden shadow-2xl flex flex-col min-h-0">
                          <div className="hidden sm:block md:overflow-auto flex-1 custom-scrollbar">
                             <table className="w-full border-collapse">
                                <thead className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
                                   <tr>
                                      <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Nº Registro</th>
                                      <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Destino / Comprador</th>
                                      <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Hora</th>
                                      <th className="px-4 py-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Valor Total</th>
                                       <th className="px-2 py-3"></th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900/50">
                                   {sales.filter(s => { const search = searchSale.toLowerCase(); const numStr = `venda #${String(s.saleNumber).padStart(8, '0')}`.toLowerCase(); return numStr.includes(search) || (s.customerName || '').toLowerCase().includes(search); }).map((s) => (
                                      <tr key={s.id} onClick={() => setSelectedSale(s)} className="hover:bg-white/[0.02] cursor-pointer transition-colors group">
                                         <td className="px-4 py-3"><span className="text-xs font-black text-white/40 group-hover:text-[#00E676] transition-colors tracking-tighter block">ID: {String(s.saleNumber).padStart(8, '0')}</span></td>
                                         <td className="px-4 py-3"><div className="flex flex-col"><span className="text-xs font-black text-white uppercase truncate max-w-[200px] leading-none mb-1">{s.customerName || 'Venda Direta'}</span><span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">{s.paymentMethod}</span></div></td>
                                         <td className="px-4 py-3 text-zinc-400 font-black text-[10px] uppercase">{s.time}</td>
                                         <td className="px-4 py-3 text-right"><span className="text-lg font-black text-emerald-500 drop-shadow-[0_0_10px_rgba(0,230,118,0.15)]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.total)}</span></td>
                                          <td className="px-2 py-3"><button title="2a Via" onClick={e => { e.stopPropagation(); handleReprintSale(s); }} className="p-2 rounded-lg text-zinc-500 hover:text-[#00E676] hover:bg-[#00E676]/10 transition-all opacity-0 group-hover:opacity-100 active:scale-95"><Printer size={15} strokeWidth={1.5} /></button></td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                          
                          {/* Versão Mobile (Cards) */}
                          <div className="sm:hidden overflow-y-auto flex-1 custom-scrollbar flex flex-col gap-2 p-3 bg-[#1A1A1A]">
                             {sales.filter(s => { const search = searchSale.toLowerCase(); const numStr = `venda #${String(s.saleNumber).padStart(8, '0')}`.toLowerCase(); return numStr.includes(search) || (s.customerName || '').toLowerCase().includes(search); }).map((s) => (
                                <div key={s.id} onClick={() => setSelectedSale(s)} className="bg-[#141414] border border-zinc-700/80 rounded-xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform">
                                   <div className="flex justify-between items-start">
                                      <div className="flex flex-col">
                                         <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">ID: {String(s.saleNumber).padStart(8, '0')}</span>
                                         <span className="text-sm font-black text-white uppercase leading-tight">{s.customerName || 'Venda Direta'}</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 bg-black px-2 py-1 rounded-md border border-zinc-700/50"><Clock size={10}/> {s.time}</span>
                                   </div>
                                   
                                   <div className="flex justify-between items-end mt-1 pt-3 border-t border-zinc-700/40">
                                      <div className="flex flex-col gap-1">
                                         <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Pagamento</span>
                                         <span className="text-[10px] font-black text-emerald-500/60 bg-emerald-500/5 px-2 py-0.5 rounded-sm self-start border border-emerald-500/10">{s.paymentMethod}</span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                         <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Total</span>
                                         <span className="text-lg font-black text-emerald-500 tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.total)}</span>
                                      </div>
                                   </div>
                                </div>
                             ))}
                             {sales.filter(s => { const search = searchSale.toLowerCase(); const numStr = `venda #${String(s.saleNumber).padStart(8, '0')}`.toLowerCase(); return numStr.includes(search) || (s.customerName || '').toLowerCase().includes(search); }).length === 0 && (
                                <div className="flex-1 py-12 text-center flex flex-col items-center justify-center gap-4 grayscale opacity-10">
                                   <ShoppingCart size={40} />
                                   <p className="text-xs font-black uppercase tracking-[0.2em]">Nenhuma venda encontrada</p>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                  )}
               </div>
              {/* Botão de Exportação PDF no final da tela */}
              {!loading && (transactions.length > 0 || currentSession) && (
                <div className="mt-6 mb-8 w-full shrink-0">
                  <div className="bg-[#111111] border border-zinc-700/60 rounded-2xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                        <FileDown size={18} className="text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-black text-zinc-300 uppercase tracking-widest leading-none truncate mb-1">Relatório Diário</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                          {transactions.filter(t => t.type === 'entrada').length} entradas · {transactions.filter(t => t.type === 'saida').length} saídas
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!currentSession) {
                          onShowToast('Nenhuma sessão ativa para exportar.');
                          return;
                        }
                        generateCashReportPDF(currentSession, transactions, totals, companySettings);
                        onShowToast('Gerando PDF...');
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-zinc-100 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shrink-0 shadow-lg"
                    >
                      <FileDown size={15} strokeWidth={2.5} />
                      Exportar Relatório PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {isOpeningModalOpen && (
          <OpeningModal 
            onClose={() => setIsOpeningModalOpen(false)}
            onConfirm={handleOpenCash}
            initialDate={selectedDate}
          />
        )}
        {isClosingModalOpen && (
          <CashClosingModal 
            totals={totals}
            transactions={transactions}
            session={currentSession!}
            onClose={() => setIsClosingModalOpen(false)}
            onConfirm={handleCloseCash}
          />
        )}
        {isTransactionModalOpen && (
          <TransactionModal 
            type={transactionModalType}
            selectedDate={selectedDate}
            suppliers={availableSuppliers}
            onClose={() => setIsTransactionModalOpen(false)}
            onShowToast={onShowToast}
            setShowQuickSupplier={setShowQuickSupplier}
            onSave={async (data) => {
              try {
                const { data: newTrans, error } = await supabase.from('transactions').insert({
                  id: crypto.randomUUID(),
                  company_id: profile.company_id,
                  type: data.type,
                  description: data.description,
                  value: data.value,
                  payment_method: data.paymentMethod,
                  date: data.date,
                  time: data.time,
                  user_id: profile.id,
                  session_id: currentSession?.id || null,
                  supplier_id: data.supplierId || null,
                  product_name: data.type === 'saida' && data.supplierId ? data.description : (data.productName || null)
                }).select().single();

                if (error) throw error;
                if (!newTrans) throw new Error("Falha ao registrar transação no banco.");

                setTransactions(prev => [{
                  id: newTrans.id,
                  type: newTrans.type,
                  description: newTrans.description,
                  value: newTrans.value,
                  paymentMethod: newTrans.payment_method,
                  date: newTrans.date,
                  time: newTrans.time,
                  osId: newTrans.os_id,
                  userId: newTrans.user_id,
                  createdAt: newTrans.created_at
                } as Transaction, ...prev]);

                onShowToast('Lançamento realizado');
                setIsTransactionModalOpen(false);
              } catch (e: any) { 
                console.error('ERRO AO SALVAR TRANSAÇÃO:', e);
                onShowToast(`Erro ao salvar: ${e.message || 'Verifique o console'}`); 
              }
            }}
          />
        )}
        {isQuickSaleOpen && (
          <QuickSaleModal 
            products={products}
            customers={customers}
            companySettings={companySettings}
            selectedDate={selectedDate}
            onClose={() => setIsQuickSaleOpen(false)}
            onShowToast={onShowToast}
            onNewCustomer={(newCust) => setCustomers(prev => [...prev, newCust])}
            onSave={async (saleData) => {
              try {
                const now = new Date();
                const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                const { data: lastSale } = await supabase
                  .from('sales')
                  .select('sale_number')
                  .eq('company_id', profile.company_id)
                  .order('sale_number', { ascending: false })
                  .limit(1);
                
                const nextNumber = (lastSale && lastSale.length > 0) ? (lastSale[0].sale_number + 1) : 1;
                const saleId = crypto.randomUUID();

                const { data: newSale, error: saleError } = await supabase.from('sales').insert({
                  id: saleId,
                  company_id: profile.company_id,
                  sale_number: nextNumber,
                  date: selectedDate,
                  time,
                  items: saleData.items,
                  total: saleData.total,
                  payment_method: saleData.paymentMethod,
                  customer_name: saleData.customerName,
                  user_id: profile.id,
                  user_name: profile.name,
                  session_id: currentSession?.id
                }).select().single();

                if (saleError) throw saleError;

                const { data: trans, error: transError } = await supabase.from('transactions').insert({
                  id: crypto.randomUUID(),
                  company_id: profile.company_id,
                  type: 'entrada',
                  description: `Venda #${String(nextNumber).padStart(8, '0')}${saleData.customerName ? ` - ${saleData.customerName}` : ''}`,
                  value: saleData.total,
                  payment_method: saleData.paymentMethod,
                  date: selectedDate,
                  time,
                  user_id: profile.id,
                  session_id: currentSession?.id || null,
                  os_id: null
                }).select().single();

                if (transError) throw transError;
                if (!trans) throw new Error("Falha ao registrar transação financeira.");

                setTransactions(prev => [{
                  id: trans.id,
                  type: trans.type,
                  description: trans.description,
                  value: trans.value,
                  paymentMethod: trans.payment_method,
                  date: trans.date,
                  time: trans.time,
                  osId: trans.os_id,
                  userId: trans.user_id,
                  createdAt: trans.created_at
                } as Transaction, ...prev]);

                for (const item of saleData.items) {
                  const prod = products.find(p => p.id === item.productId);
                  if (prod) {
                    const newStock = Math.max(0, prod.stock - item.quantity);
                    await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', prod.id);
                    
                    // Notificar se o estoque zerou ou atingiu o mínimo
                    if (newStock <= 0) {
                      onShowToast(`⚠️ ALERTA: O produto ${prod.name} ESGOTOU!`);
                    } else if (newStock <= prod.minStock) {
                      onShowToast(`📢 AVISO: O produto ${prod.name} está com estoque baixo (${newStock} un).`);
                    }

                    await supabase.from('product_history').insert({
                      product_id: prod.id,
                      company_id: profile.company_id,
                      type: 'saida',
                      quantity: item.quantity,
                      reason: 'venda',
                      date: selectedDate,
                      user_id: profile.id,
                      created_at: new Date().toISOString()
                    });
                  }
                }

                setProducts(prev => prev.map(p => {
                  const sold = saleData.items.find(i => i.productId === p.id);
                  if (sold) {
                    return { ...p, stock: Math.max(0, p.stock - sold.quantity) };
                  }
                  return p;
                }));
                
                let saleObj: Sale | undefined = undefined;
                if (newSale) {
                  saleObj = {
                    id: newSale.id,
                    saleNumber: newSale.sale_number,
                    date: newSale.date,
                    time: newSale.time,
                    items: newSale.items,
                    total: newSale.total,
                    paymentMethod: newSale.payment_method,
                    customerName: newSale.customer_name,
                    userId: newSale.user_id,
                    userName: newSale.user_name,
                    createdAt: newSale.created_at
                  };
                  setSales(prev => [saleObj!, ...prev]);
                }

                onShowToast('Venda finalizada');
                onLogActivity?.('CAIXA', 'REALIZOU VENDA', {
                  saleId,
                  saleNumber: nextNumber,
                  saleNumberFormatted: String(nextNumber).padStart(8, '0'),
                  customerName: saleData.customerName,
                  total: saleData.total,
                  paymentMethod: saleData.paymentMethod,
                  itemCount: saleData.items.length,
                  description: `Venda #${String(nextNumber).padStart(8, '0')} para ${saleData.customerName || 'Balcão'} — R$ ${saleData.total.toFixed(2)} (${saleData.paymentMethod})`
                });
                return saleObj;
              } catch (e: any) { 
                console.error('Erro na venda:', e);
                onShowToast(`Erro na venda: ${e.message}`); 
                throw e;
              }
            }}
          />
        )}
        {selectedSale && (
          <SaleDetailModal 
            sale={selectedSale}
            onClose={() => setSelectedSale(null)}
            onReprint={handleReprintSale}
            onDelete={handleDeleteSale}
            canAction={canAction}
          />
        )}
        {isCalendarOpen && (
          <CalendarModal 
            sessions={sessions}
            selectedDate={selectedDate}
            onClose={() => setIsCalendarOpen(false)}
            onSelectDate={setSelectedDate}
          />
        )}
        {confirmModal && confirmModal.isOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1A1A] border border-zinc-700 rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl">
               <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 size={30} /></div>
               <h3 className="text-xl font-black text-white mb-2">{confirmModal.title}</h3>
               <p className="text-zinc-500 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
               <div className="flex gap-3">
                 <button onClick={() => setConfirmModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-black text-xs uppercase transition-all">Cancelar</button>
                 <button onClick={confirmModal.onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-lg shadow-red-500/20">Excluir</button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
      
      {/* Global Modals for CaixaModule */}
      {showQuickSupplier && (
        <QuickSupplierModal 
          onClose={() => setShowQuickSupplier(false)} 
          onSave={async (newSup: any) => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const supplierData = { ...newSup };
              if (session?.user?.id) {
                supplierData.user_id = session.user.id;
              }

              const supplierRecord = { 
                ...supplierData,
                company_id: profile.company_id 
              };
              const { data, error } = await supabase.from('suppliers').insert(supplierRecord).select().single();
              if (error) {
                console.error('Erro ao cadastrar fornecedor:', error);
                onShowToast(`Erro: ${error.message}`);
              } else {
                onShowToast('Fornecedor cadastrado!');
                setAvailableSuppliers(prev => [...prev, data]);
                setShowQuickSupplier(false);
              }
            } catch (err: any) {
              onShowToast('Erro inesperado ao salvar');
            }
          }}
        />
      )}
    </div>
  );
}

// Sub-components with persistent styles

function OpeningModal({ onClose, onConfirm, initialDate }: { onClose: () => void, onConfirm: (val: number, date: string) => Promise<void>, initialDate?: string }) {
  const [value, setValue] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [isOpening, setIsOpening] = useState(false);

  const handleConfirm = async () => {
    setIsOpening(true);
    try {
      await onConfirm(parseFloat(value) || 0, date);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#141414] border border-zinc-700 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-700 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">Abertura de Caixa</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data do Turno</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-2xl px-4 py-4 text-white font-black text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Troco Inicial (Dinheiro)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-black">R$</span>
              <input autoFocus type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" className="w-full bg-black border border-zinc-700 rounded-2xl pl-12 pr-4 py-5 text-white text-3xl font-black focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <button 
            disabled={isOpening}
            onClick={handleConfirm} 
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isOpening ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Abrindo...
              </>
            ) : 'Abrir caixa'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}


function TransactionModal({ type, selectedDate, suppliers, onClose, onShowToast, onSave, setShowQuickSupplier }: { type: 'entrada' | 'saida', selectedDate: string, suppliers: any[], onClose: () => void, onShowToast: (m: string) => void, onSave: (d: TransactionData) => Promise<void>, setShowQuickSupplier: (v: boolean) => void }) {
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Débito' | 'Crédito' | 'Link'>('Dinheiro');
  const [supplierId, setSupplierId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) return;
    setIsSaving(true);
    try {
      await onSave({ 
        type, 
        description, 
        value: numVal, 
        paymentMethod, 
        date: selectedDate, 
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 
        supplierId 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#1A1A1A] border border-zinc-700/80 rounded-xl w-full max-w-sm overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
        <div className={`p-4 sm:p-5 border-b border-zinc-700/50 flex items-center justify-between ${type === 'entrada' ? 'bg-emerald-500/[0.03]' : 'bg-red-500/[0.03]'}`}>
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type === 'entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {type === 'entrada' ? <Plus size={16} /> : <Minus size={16} />}
             </div>
             <h2 className={`text-sm sm:text-base font-black uppercase tracking-tight ${type === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>{type === 'entrada' ? 'Nova Entrada' : 'Nova Saída (Retirada)'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Valor da Operação</label>
            <div className="relative group">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-zinc-600">R$</span>
               <input autoFocus type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" className={`w-full bg-[#111111] border border-zinc-700/50 rounded-lg pl-12 pr-4 py-3 sm:py-4 text-white text-2xl sm:text-3xl font-black focus:outline-none transition-all placeholder:text-zinc-700 ${type === 'entrada' ? 'focus:border-emerald-500/50' : 'focus:border-red-500/50'}`} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Descrição / Motivo</label>
            <input type="text" value={description} onChange={e => setDescription(capFirst(e.target.value))} placeholder="Ex: Pagamento Fornecedor" className={`w-full bg-[#111111] border border-zinc-700/50 rounded-lg px-4 py-3 text-white text-[11px] font-bold focus:outline-none transition-all uppercase placeholder:text-zinc-700 ${type === 'entrada' ? 'focus:border-emerald-500/50' : 'focus:border-red-500/50'}`} />
          </div>

          {type === 'saida' && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Destinatário / Fornecedor</label>
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                   <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full h-12 bg-[#111111] border border-zinc-700/50 rounded-lg px-4 text-white text-[11px] font-bold focus:outline-none focus:border-red-500/50 appearance-none uppercase transition-all">
                     <option value="">Nenhum</option>
                     {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <History size={14} />
                   </div>
                </div>
                <button 
                  type="button"
                  title="Cadastrar Novo Fornecedor"
                  onClick={() => {
                    onShowToast('Abrindo cadastro de fornecedor...');
                    setShowQuickSupplier(true);
                  }}
                  className="w-12 h-12 bg-zinc-800 border border-zinc-700 hover:border-red-500/50 text-white hover:text-red-500 rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-lg group"
                >
                  <Plus size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
              Método de Repasse
              <InfoTooltip position="top" content="Apenas saídas em 'Dinheiro' afetam o saldo físico da gaveta. Saídas em PIX ou Cartão representam repasses diretos pela conta bancária." className="ml-0.5" />
            </label>
            <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
              {['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Link'].map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-2.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all active:scale-95 ${paymentMethod === m ? 'bg-white text-black border-white shadow-lg' : 'bg-[#111111] text-zinc-400 border-zinc-700/60 hover:border-zinc-600'}`}>{m}</button>
              ))}
            </div>
          </div>
          
          <button 
            disabled={!value || parseFloat(value) <= 0 || !description || isSaving}
            onClick={handleSave} 
            className={`w-full py-4 font-black rounded-xl text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${!value || parseFloat(value) <= 0 || !description || isSaving ? 'opacity-20 grayscale cursor-not-allowed text-zinc-600' : 'active:scale-95 shadow-xl'} ${type === 'entrada' ? 'bg-[#00E676] text-black shadow-emerald-500/20' : 'bg-red-500 text-white shadow-red-500/20'}`}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (type === 'entrada' ? 'Confirmar Entrada' : 'Confirmar Retirada')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CashClosingModal({ totals, session, onClose, onConfirm }: { totals: Totals, session: CashSession, onClose: () => void, onConfirm: (d: ClosingData) => Promise<void>, transactions: any[] }) {
  const [finalValue, setFinalValue] = useState(totals.cashInHand.toFixed(2));
  const [isClosing, setIsClosing] = useState(false);
  const expectedValue = totals.cashInHand;
  const finalNum = parseFloat(finalValue) || 0;
  const difference = finalNum - expectedValue;

  const handleConfirm = async () => {
    setIsClosing(true);
    try {
      await onConfirm({ 
        finalValue: finalNum,
        expectedValue, 
        difference,
        closingTime: new Date().toISOString(),
        totalEntries: totals.entries,
        totalExits: totals.exits
      });
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#141414] border border-zinc-700 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl my-4">
        <div className="p-6 border-b border-zinc-700 flex items-center justify-between bg-red-500/5">
          <h2 className="text-xl font-black tracking-tight text-red-500">Fechamento de Caixa</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">

          {/* Summary of totals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-center">
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Entradas</p>
              <p className="text-sm font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entries)}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-center">
              <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Saídas</p>
              <p className="text-sm font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.exits)}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl text-center">
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Saldo</p>
              <p className="text-sm font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.balance)}</p>
            </div>
          </div>

          {/* Payment method breakdown */}
          <div className="bg-black/40 border border-zinc-700/50 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3">Entradas por Método</p>
            {['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Link'].map(m => (
              <div key={m} className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400">{m}</span>
                <span className={`text-[11px] font-black ${(totals.entriesByType[m] || 0) > 0 ? 'text-white' : 'text-zinc-500'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.entriesByType[m] || 0)}
                </span>
              </div>
            ))}
          </div>

          {/* Cash in hand reconciliation */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dinheiro Real no Caixa (contar notas)</label>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={finalValue}
              onChange={e => setFinalValue(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-4 py-4 text-white text-2xl font-black focus:outline-none focus:border-red-500"
            />
            {finalValue !== '' && (
              <p className={`text-xs font-bold ${difference === 0 ? 'text-emerald-500' : difference > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {difference === 0 ? '✓ Sem diferença' : difference > 0 ? `Sobra de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(difference)}` : `Falta de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(difference))}`}
              </p>
            )}
          </div>

          <button 
            disabled={isClosing}
            onClick={handleConfirm} 
            className="w-full py-5 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isClosing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Fechando...
              </>
            ) : 'Confirmar e Fechar Período'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function QuickSaleModal({ products, customers, companySettings, selectedDate, onClose, onShowToast, onSave, onNewCustomer }: {
  products: Product[],
  customers: {id: string, name: string}[],
  companySettings: any,
  selectedDate: string,
  onClose: () => void,
  onShowToast: (m: string) => void,
  onSave: (d: SaleData) => Promise<Sale | void>,
  onNewCustomer: (c: { id: string, name: string }) => void
}) {
  const [selectedItems, setSelectedItems] = useState<{ productId: string, productName: string, productBrand?: string, productModel?: string, quantity: number, price: number }[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Débito' | 'Crédito' | 'Link'>('Dinheiro');
  const [saleComplete, setSaleComplete] = useState<SaleData | null>(null);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [saleTime] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [scannerFlash, setScannerFlash] = useState<'idle' | 'found' | 'notfound'>('idle');
  const [lastScanned, setLastScanned] = useState('');
  const [scannerDetected, setScannerDetected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Barcode scanner listener — leitoras digitam muito rápido + Enter
  useEffect(() => {
    if (saleComplete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se o foco estiver em um input de texto do modal (busca manual)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim();
        barcodeBuffer.current = '';
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        if (!code) return;

        // Busca por barcode exato, depois por nome
        const found = products.find(p => p.barcode === code) ||
                      products.find(p => p.name.toLowerCase().includes(code.toLowerCase()));
        if (found) {
          const inCart = selectedItems.find(i => i.productId === found.id)?.quantity || 0;
          if (found.stock <= inCart) {
            onShowToast(`⚠️ Estoque insuficiente para "${found.name}" (${found.stock} disponíveis)`);
            setScannerFlash('notfound');
            setTimeout(() => setScannerFlash('idle'), 1200);
            return;
          }
          setSelectedItems(prev => {
            const exists = prev.find(i => i.productId === found.id);
            if (exists) return prev.map(i => i.productId === found.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { productId: found.id, productName: found.name, productBrand: found.brand, productModel: found.model, quantity: 1, price: found.price || 0 }];
          });
          setScannerDetected(true);
          setLastScanned(found.name);
          setScannerFlash('found');
          setTimeout(() => setScannerFlash('idle'), 1200);
        } else {
          setLastScanned(code);
          setScannerFlash('notfound');
          setTimeout(() => setScannerFlash('idle'), 1200);
        }
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        // Se demorar mais de 100ms entre teclas, limpa o buffer (não é scanner)
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, saleComplete]);

  const [currentTab, setCurrentTab] = useState<'products' | 'cart'>('products');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.barcode && p.barcode.includes(search))
  );

  const total = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const addItem = (product: Product) => {
    const inCart = selectedItems.find(i => i.productId === product.id)?.quantity || 0;
    
    if (product.stock <= inCart) {
      onShowToast(`⚠️ Estoque insuficiente para "${product.name}" (${product.stock} disponíveis)`);
      return;
    }

    setSelectedItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, productName: product.name, productBrand: product.brand, productModel: product.model, quantity: 1, price: product.price || 0 }];
    });
  };

  const removeItem = (idx: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFinalize = async () => {
    if (selectedItems.length === 0 || isSaving) return;
    const saleData: SaleData = {
      items: selectedItems.map(i => ({ ...i, total: i.price * i.quantity })),
      total,
      paymentMethod,
      customerName: customerName.trim() || undefined
    };
    setIsSaving(true);
    try {
      const result = await onSave(saleData);
      if (result && (result as Sale).saleNumber) {
        setSaleComplete({
          ...saleData,
          saleNumber: (result as Sale).saleNumber
        });
      } else {
        setSaleComplete(saleData);
      }
    } catch (e) {
      // Error handled by parent toast
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintReceipt = () => {
    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (!printWin) return;
    const company = companySettings?.name || 'Sua Empresa';
    const dateStr = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const saleNumStr = saleComplete?.saleNumber ? String(saleComplete.saleNumber).padStart(8, '0') : '';
    const saleId = `VENDA #${saleNumStr || 'DRAFT'}`;
    const itemsHtml = (saleComplete?.items || []).map(i => {
      const brandModel = (i.productBrand || i.productModel) ? ` (${i.productBrand || ''} ${i.productModel || ''})`.trim() : '';
      return `<tr><td style="padding:2px 0">${i.productName}${brandModel}</td><td style="text-align:center">${i.quantity}x</td><td style="text-align:right">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(i.price)}</td><td style="text-align:right">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(i.total)}</td></tr>`;
    }).join('');

    printWin.document.write(`
      <html><head><title>Cupom de Venda</title><style>
        body{font-family:monospace;font-size:12px;width:72mm;margin:0 auto;padding:4px;color:#000}
        .header{text-align:center;margin-bottom:8px}
        h2{margin:0;font-size:16px;text-transform:uppercase}
        p{margin:2px 0;font-size:10px}
        .dashed{border-top:1px dashed #000;margin:8px 0}
        table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px}
        .total-row{font-weight:bold;font-size:14px;display:flex;justify-content:space-between;margin:4px 0}
        .footer{text-align:center;font-size:9px;margin-top:15px;line-height:1.4}
        .id-row{text-align:center;font-weight:bold;font-size:11px;margin:4px 0}
      </style></head><body>
        <div class="header">
          ${companySettings?.logoUrl ? `<img src="${companySettings.logoUrl}" style="max-width:120px;max-height:50px;margin:0 auto 10px;display:block;filter:grayscale(1) contrast(1.5);object-contain" />` : ''}
          <h2>${company}</h2>
          ${companySettings?.cnpj ? `<p>CNPJ: ${companySettings.cnpj}</p>` : ''}
          <p>${companySettings?.street || ''}, ${companySettings?.number || ''}</p>
          <p>${companySettings?.neighborhood || ''} - ${companySettings?.city || ''}/${companySettings?.state || ''}</p>
          ${(companySettings?.phone || companySettings?.whatsapp) ? `<p>Contato: ${companySettings.phone || ''} ${companySettings.whatsapp || ''}</p>` : ''}
        </div>

        <div class="dashed"></div>
        <p style="text-align:center;font-weight:bold">*** CUPOM DE VENDA (SIMPLIFICADO) ***</p>
        <div class="id-row">VENDA Nº: ${saleId}</div>
        <p style="text-align:center;font-weight:bold;font-size:11px;margin:2px 0">CLIENTE: ${saleComplete?.customerName || 'Cliente Balcão'}</p>
        <p style="text-align:center">DATA: ${dateStr} - HORA: ${saleTime}</p>
        <div class="dashed"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left">DESCRIÇÃO</th>
              <th>QTD</th>
              <th style="text-align:right">UNIT</th>
              <th style="text-align:right">TOTAL</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="dashed"></div>
        <div class="total-row">
          <span>VALOR TOTAL:</span>
          <span>${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(saleComplete?.total||0)}</span>
        </div>
        <p style="text-align:right;font-weight:bold">PAGAMENTO: ${saleComplete?.paymentMethod}</p>
        
        <div class="dashed"></div>
        <div class="footer">
          <p>Obrigado pela preferência!</p>
          <p>Volte Sempre</p>
          <p style="margin-top:8px;font-size:8px">Sistema de Gestão SERVYX</p>
        </div>
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { 
      printWin.print(); 
      printWin.close(); 
    }, 500);
  };

  // ── High-Density Precision POS View Hooks ──
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search for instant use
    if (!saleComplete) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [saleComplete]);

  // ── Success View ──
  if (saleComplete) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#141414] border border-zinc-700 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl">
          <div className="p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-[#00E676]/10 border border-[#00E676]/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-[#00E676]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Venda Concluída!</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Nº {String(saleComplete.saleNumber).padStart(8, '0')}</p>
            </div>

            <div className="bg-black/40 border border-zinc-700 rounded-3xl p-5 text-left space-y-2">
              <div className="flex justify-between border-b border-zinc-700/50 pb-2 mb-2">
                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total</span>
                 <span className="text-lg font-black text-[#00E676]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saleComplete.total)}</span>
              </div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">{saleComplete.paymentMethod}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handlePrintReceipt}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all"
              >
                <Printer size={16} />
                Imprimir Cupom
              </button>
              <button
                onClick={onClose}
                className="w-full bg-[#00E676] hover:bg-[#00E676]/90 text-black font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 backdrop-blur-sm overflow-hidden p-0 md:p-1.5">
       <motion.div 
         initial={{ opacity: 0, scale: 0.99 }} 
         animate={{ opacity: 1, scale: 1 }} 
         className="bg-[#1A1A1A] w-full h-full md:max-w-[1600px] md:h-[97vh] md:rounded-xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col md:border border-zinc-700/50"
       >
          {/* Top Bar - Responsive Stack */}
          <div className="h-auto md:h-14 py-3 md:py-0 border-b border-zinc-700/50 bg-[#111111] flex flex-col md:flex-row items-center px-4 shrink-0 justify-between gap-3 sm:gap-4">
             <div className="flex w-full md:w-auto items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-2.5">
                   <Barcode size={20} className="text-[#00E676]" />
                   <h2 className="text-[10px] sm:text-[11px] font-black text-zinc-400 uppercase tracking-widest">PDV TERMINAL</h2>
                </div>
                <button 
                  onClick={onClose}
                  className="flex md:hidden items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg"
                >
                   <X size={14} strokeWidth={3} />
                   <span className="text-[9px] font-black uppercase tracking-widest">Sair</span>
                </button>
             </div>

             <div className="w-full md:max-w-xl flex gap-px bg-[#1A1A1A] p-px rounded-xl overflow-hidden border border-zinc-700/50 shadow-inner">
                <div className="flex-1 relative bg-[#111111]">
                   <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                   <input 
                     ref={searchInputRef}
                     type="text" 
                     placeholder="ESCANEIE OU BUSCA RÁPIDA..." 
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full bg-transparent pl-10 pr-4 py-2.5 text-[12px] font-bold text-white focus:outline-none placeholder:text-zinc-600"
                   />
                </div>
                <button className="bg-zinc-800 hover:bg-zinc-700 text-white font-black px-5 text-[9px] uppercase tracking-widest transition-colors shrink-0">PROCESSAR</button>
             </div>

             <button onClick={onClose} className="hidden md:flex w-10 h-10 items-center justify-center text-zinc-400 hover:text-white transition-all ml-auto hover:bg-zinc-800/50 rounded-lg"><X size={20} /></button>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-px bg-zinc-800/50">
             
             {/* Cart Column (70/30 Density) */}
             <div className="flex-1 flex flex-col bg-[#1A1A1A] overflow-hidden h-[45vh] md:h-full">
                <div className="px-4 py-3 border-b border-zinc-700/50 bg-[#111111] flex items-center justify-between shrink-0">
                   <div className="flex items-center gap-2">
                      <ShoppingCart size={16} className="text-zinc-400" />
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ITENS LANÇADOS</span>
                   </div>
                   <span className="text-[9px] font-black text-[#00E676] px-2 py-0.5 rounded bg-[#00E676]/5 border border-[#00E676]/20 uppercase">{selectedItems.length} UN</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col divide-y divide-zinc-900/50">
                   {selectedItems.map((item, idx) => (
                     <div key={idx} className="flex gap-4 items-center p-2.5 hover:bg-zinc-800/30 transition-colors group">
                        {/* Quantity Control */}
                        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shrink-0 shadow-inner">
                           <button 
                             onClick={() => {
                               const product = products.find(p => p.id === item.productId);
                               if (product && item.quantity >= product.stock) {
                                 onShowToast(`⚠️ Apenas ${product.stock} unidades disponíveis no estoque.`);
                                 return;
                               }
                               setSelectedItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it));
                             }}
                             className="w-8 h-6 flex items-center justify-center hover:bg-zinc-800 text-zinc-500 hover:text-[#00E676] transition-colors border-b border-zinc-800/50"
                           >
                             <ChevronUp size={12} strokeWidth={3} />
                           </button>
                           <div className="w-8 h-7 flex items-center justify-center text-[11px] font-black text-white">{item.quantity}</div>
                           <button 
                             onClick={() => {
                               if (item.quantity > 1) {
                                 setSelectedItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity - 1 } : it));
                               } else {
                                 removeItem(idx);
                               }
                             }}
                             className="w-8 h-6 flex items-center justify-center hover:bg-zinc-800 text-zinc-500 hover:text-red-500 transition-colors"
                           >
                             <ChevronDown size={12} strokeWidth={3} />
                           </button>
                        </div>

                        <div className="flex-1 min-w-0 pr-4">
                           <div className="flex flex-wrap items-baseline gap-x-2">
                             <p className="text-[12px] font-black text-zinc-300 uppercase truncate leading-none group-hover:text-white transition-colors">{item.productName}</p>
                             {(item.productBrand || item.productModel) && (
                               <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                                 {item.productBrand} {item.productModel}
                               </span>
                             )}
                           </div>
                           <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mt-1">REF: {idx+1} • UNIT: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</p>
                        </div>
                        <div className="text-right flex items-center gap-6 shrink-0">
                           <p className="text-[13px] font-black text-[#00E676]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</p>
                           <button onClick={() => removeItem(idx)} className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                        </div>
                     </div>
                   ))}
                   {selectedItems.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-5 grayscale">
                         <ShoppingCart size={40} />
                         <p className="text-[10px] font-black uppercase tracking-[0.5em] mt-2">Pronto para itens</p>
                      </div>
                   )}
                </div>

                {/* Instant Search Dropdown Overlay */}
                <AnimatePresence>
                   {search.length >= 1 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute top-28 md:top-14 left-4 right-4 md:right-1/2 md:mr-4 bg-[#111111] border border-zinc-700/80 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[300] flex flex-col max-h-[60vh] overflow-hidden"
                      >
                         <div className="flex-1 overflow-y-auto p-1 custom-scrollbar flex flex-col divide-y divide-zinc-900/40">
                            {filteredProducts.map(p => (
                               <button 
                                 key={p.id} 
                                 onClick={() => { addItem(p); setSearch(''); searchInputRef.current?.focus(); }}
                                 className="w-full flex items-center justify-between p-3.5 hover:bg-[#00E676]/5 transition-all group"
                               >
                                  <div className="flex items-center gap-4">
                                     <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-[#00E676] border border-zinc-800 shrink-0 overflow-hidden relative">
                                        {p.image ? (
                                           <img src={p.image} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                           <Plus size={16} />
                                        )}
                                     </div>
                                     <div className="text-left font-black">
                                        <p className="text-[12px] text-zinc-100 uppercase leading-none mb-1 group-hover:text-white">
                                          {p.name}
                                          {(p.brand || p.model) && (
                                            <span className="text-zinc-500 font-bold ml-1.5 text-[9px] tracking-tight">({p.brand} {p.model})</span>
                                          )}
                                        </p>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">ESTOQUE: {p.stock || 0} UNIDADES</p>
                                     </div>
                                  </div>
                                  <p className="text-[13px] font-black text-[#00E676] pr-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0)}</p>
                               </button>
                            ))}
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>

             {/* Right Column (Controls) */}
             <div className="flex-1 bg-[#1A1A1A] flex flex-col p-4 md:p-6 lg:p-8 justify-between gap-3 overflow-y-auto custom-scrollbar">
                
                <div className="w-full max-w-lg mx-auto space-y-4 flex-1 flex flex-col justify-start">
                   
                   <div className="grid grid-cols-1 gap-5">
                      {/* Customer Selection Block */}
                      <div className="space-y-2">
                         <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5 group/label relative">
                               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">IDENTIFICAR CLIENTE</span>
                               <button 
                                 onMouseEnter={() => setShowTooltip(true)} 
                                 onMouseLeave={() => setShowTooltip(false)}
                                 onClick={() => setShowTooltip(!showTooltip)}
                                 className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-blue-400 hover:border-blue-400/50 transition-all text-[10px] font-bold"
                               >
                                 i
                               </button>
                               <AnimatePresence>
                                  {showTooltip && (
                                     <motion.div 
                                       initial={{ opacity: 0, y: -5 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       exit={{ opacity: 0, y: -5 }}
                                       className="absolute top-full left-0 mt-3 w-72 p-4 bg-zinc-800 border border-zinc-700 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[999] pointer-events-none backdrop-blur-xl"
                                     >
                                        <div className="flex gap-3">
                                           <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                                              <CheckCircle2 size={14} className="text-blue-400" />
                                           </div>
                                           <p className="text-[11px] text-zinc-300 font-bold leading-relaxed">
                                             Dica: Ao identificar o cliente, o nome dele será impresso automaticamente no cupom de venda e nos relatórios financeiros.
                                           </p>
                                        </div>
                                        <div className="absolute bottom-full left-4 -mb-1 border-4 border-transparent border-b-zinc-800"></div>
                                     </motion.div>
                                  )}
                               </AnimatePresence>
                            </div>
                            <button 
                              onClick={() => setShowQuickCustomer(true)}
                              className="text-[9px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
                            >
                               <Plus size={10} strokeWidth={3} />
                               Novo Cliente
                            </button>
                         </div>
                         <div className="relative group">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500/50" />
                            <input 
                              type="text" 
                              placeholder="BUSCAR NOME OU CPF/CNPJ..."
                              value={customerName}
                              onChange={e => {
                                setCustomerName(e.target.value);
                                if (!e.target.value) setSelectedCustomerId('');
                              }}
                              className="w-full bg-[#111111] border border-zinc-700/50 rounded-xl pl-11 pr-4 py-3 text-[11px] font-black text-white focus:outline-none focus:border-[#00E676]/50 transition-all uppercase placeholder:text-zinc-700 shadow-inner"
                            />
                            {customerName.length >= 2 && !selectedCustomerId && (
                               <div className="absolute left-0 right-0 top-full mt-1 bg-[#111111] border border-zinc-700/50 rounded-xl overflow-hidden shadow-2xl z-[200] max-h-32 overflow-y-auto divide-y divide-zinc-800/50 custom-scrollbar">
                                  {customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).map(c => (
                                    <button key={c.id} onClick={() => { setCustomerName(c.name); setSelectedCustomerId(c.id); }} className="w-full text-left px-5 py-3 hover:bg-[#00E676]/5 text-[11px] font-bold text-zinc-500 hover:text-white uppercase transition-colors">{c.name}</button>
                                  ))}
                               </div>
                            )}
                            {selectedCustomerId && <Check size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#00E676]" />}
                         </div>
                      </div>

                      {/* Payment Grid Block */}
                      <div className="space-y-1">
                         <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">MÉTODO RECEBIMENTO</span>
                         <div className="grid grid-cols-2 gap-2">
                            {['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Link'].map(m => (
                              <button 
                                key={m} 
                                onClick={() => setPaymentMethod(m as any)} 
                                className={`py-3.5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest border transition-all active:scale-[0.98] ${paymentMethod === m ? 'bg-white text-black border-white shadow-lg' : 'bg-[#111111] text-zinc-400 border-zinc-700/60 hover:border-zinc-600'}`}
                              >
                                {m}
                              </button>
                            ))}
                         </div>
                      </div>
                   </div>

                   {/* Totalization View (Precision) */}
                   <div className="bg-[#111111] border border-zinc-700/50 rounded-xl py-4 sm:py-6 flex flex-col items-center justify-center text-center shadow-inner group border-t border-t-[#00E676]/20">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] sm:tracking-[0.5em] mb-1 sm:mb-2">TOTAL EM CAIXA</span>
                      <span className="text-3xl sm:text-4xl font-black text-[#00E676] tracking-tighter drop-shadow-[0_0_15px_rgba(0,230,118,0.2)]">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                      </span>
                      <div className="mt-3 sm:mt-4 px-4 py-1 bg-[#1A1A1A] rounded-full border border-zinc-700/50 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                         FORMA: {paymentMethod}
                      </div>
                   </div>
                </div>

                {/* Confirm Action Button */}
                 <button 
                   onClick={handleFinalize} 
                   disabled={selectedItems.length === 0 || isSaving}
                   className="w-full h-16 sm:h-14 bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B24A] shadow-[0_15px_30px_rgba(0,230,118,0.3)] hover:shadow-[#00E676]/40 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-600 rounded-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-4 text-black font-black uppercase tracking-widest sm:tracking-[0.4em] text-[15px] sm:text-[10px] group mb-2"
                 >
                   {isSaving ? (
                     <>
                       <Loader2 size={28} className="animate-spin" />
                       REALIZANDO VENDA...
                     </>
                   ) : (
                     <>
                       <Printer size={28} className="group-hover:scale-110 transition-transform" />
                       CONFIRMAR VENDA
                     </>
                   )}
                 </button>
                
             </div>
          </div>
       </motion.div>
       
       <AnimatePresence>
          {showQuickCustomer && (
             <QuickCustomerModal 
               onClose={() => setShowQuickCustomer(false)}
               onSave={async (data) => {
                 try {
                   const now = new Date().toISOString();
                   const customerId = crypto.randomUUID();
                   const { error } = await supabase.from('customers').insert({
                     id: customerId,
                     name: data.name,
                     whatsapp: data.whatsapp,
                     phone: data.whatsapp,
                     document: data.document,
                     devices: [],
                     created_at: now,
                     updated_at: now
                   });
                   
                   if (error) throw error;
                   
                   onNewCustomer({ id: customerId, name: data.name });
                   setCustomerName(data.name);
                   setSelectedCustomerId(customerId);
                   setShowQuickCustomer(false);
                   onShowToast('Cliente cadastrado com sucesso');
                 } catch (err: any) {
                   onShowToast(`Erro: ${err.message || 'Erro ao salvar cliente'}`);
                 }
               }}
             />
          )}
       </AnimatePresence>
    </div>
  );
}

function SaleDetailModal({ sale, onClose, onReprint, onDelete, canAction }: { sale: Sale, onClose: () => void, onReprint: (sale: Sale) => void, onDelete: (sale: Sale) => void, canAction: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-[#141414] border border-zinc-700 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-700 flex items-center justify-between bg-zinc-800/40">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00E676]/10 flex items-center justify-center text-[#00E676]">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Venda #{String(sale.saleNumber).padStart(8, '0')}</h2>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{format(parseISO(sale.date), 'dd/MM/yyyy')} às {sale.time}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 border border-zinc-700/50 p-4 rounded-2xl">
                 <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Cliente</p>
                 <p className="text-xs font-bold text-white">{sale.customerName || 'Cliente Balcão'}</p>
              </div>
              <div className="bg-black/40 border border-zinc-700/50 p-4 rounded-2xl">
                 <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Operador</p>
                 <p className="text-xs font-bold text-white">{sale.userName || 'Usuário'}</p>
              </div>
           </div>

           <div className="space-y-3">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Produtos Vendidos</p>
              <div className="bg-black/40 border border-zinc-700/50 rounded-2xl overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-zinc-800/50">
                       <tr>
                          <th className="px-4 py-3 text-[8px] font-black text-zinc-500 uppercase">Item</th>
                          <th className="px-4 py-3 text-[8px] font-black text-zinc-500 uppercase text-center">Qtd</th>
                          <th className="px-4 py-3 text-[8px] font-black text-zinc-500 uppercase text-right">Unit</th>
                          <th className="px-4 py-3 text-[8px] font-black text-zinc-500 uppercase text-right">Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/20">
                       {sale.items.map((item, idx) => (
                         <tr key={idx}>
                            <td className="px-4 py-3">
                               <p className="text-[11px] font-bold text-white leading-tight">{item.productName}</p>
                               {(item.productBrand || item.productModel) && (
                                 <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                   {item.productBrand} {item.productModel}
                                 </p>
                               )}
                            </td>
                            <td className="px-4 py-3 text-[11px] font-medium text-zinc-400 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-zinc-400 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</td>
                            <td className="px-4 py-3 text-[11px] font-black text-white text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <div className="p-6 bg-zinc-800/40 border-t border-zinc-700 flex items-center justify-between">
           <div className="flex-1 flex items-center gap-3">
              {canAction && (
                <button
                  onClick={() => onDelete(sale)}
                  className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black rounded-xl border border-red-500/20 transition-all active:scale-95 group"
                  title="Estornar/Cancelar Venda"
                >
                  <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
                </button>
              )}
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Forma de Pagamento</span>
                 <span className="text-xs font-black text-blue-400 uppercase tracking-tighter">{sale.paymentMethod}</span>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button
                onClick={() => onReprint(sale)}
                title="Reimprimir cupom"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-[#00E676]/10 border border-white/[0.06] hover:border-[#00E676]/30 rounded-xl text-zinc-400 hover:text-[#00E676] text-[10px] font-black uppercase tracking-widest transition-all group"
              >
                <Printer size={14} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">2ª Via</span>
              </button>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Valor Total</span>
                <span className="text-xl font-black text-[#00E676]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total)}</span>
              </div>
           </div>
        </div>
      </motion.div>

    </div>
  );
}

function QuickSupplierModal({ onClose, onSave }: { onClose: () => void, onSave: (d: any) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState('');

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#101010] border border-zinc-700 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">Novo Fornecedor</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Empresa *</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Empresa" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Responsável *</label>
            <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="Nome do Contato" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Telefone/WA *</label>
            <input type="text" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
          <button 
            disabled={!name || !phone || !contact}
            onClick={() => onSave({ company_name: name, contact_name: contact, phone })}
            className="w-full py-4 bg-[#00E676] disabled:opacity-20 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10"
          >
            Salvar Fornecedor
          </button>
        </div>
      </motion.div>
    </div>
  );
}
function QuickCustomerModal({ onClose, onSave }: { onClose: () => void, onSave: (d: any) => void }) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [document, setDocument] = useState('');
  const [country, setCountry] = useState<Country>(countries[0]);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#101010] border border-zinc-700 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Plus className="text-blue-500" size={24} />
            Novo Cliente
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Nome Completo *</label>
            <input 
              autoFocus 
              type="text" 
              value={name} 
              onChange={e => setName(capFirst(e.target.value))} 
              placeholder="Nome do Cliente" 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 text-[13px] font-bold text-white focus:outline-none focus:border-blue-500/50 shadow-inner" 
            />
          </div>
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Telefone / WhatsApp *</label>
              <div className="flex gap-2">
                <CountryCodePicker selectedCountry={country} onSelect={setCountry} />
                <input 
                  type="text" 
                  value={whatsapp} 
                  onChange={e => setWhatsapp(formatPhone(e.target.value))} 
                  placeholder="(00) 00000-0000" 
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 text-[13px] font-bold text-white focus:outline-none focus:border-blue-500/50 shadow-inner" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">CPF ou CNPJ</label>
              <input 
                type="text" 
                value={document} 
                onChange={e => setDocument(e.target.value)} 
                placeholder="000.000.000-00" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 text-[13px] font-bold text-white focus:outline-none focus:border-blue-500/50 shadow-inner" 
              />
            </div>
          </div>
          <button 
            disabled={!name.trim() || !whatsapp.trim()}
            onClick={() => onSave({ 
              name, 
              whatsapp: `${country.dialCode} ${whatsapp}`, 
              document 
            })}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white font-black rounded-[20px] text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/10 active:scale-95"
          >
            Cadastrar Cliente
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CalendarModal({ sessions, selectedDate, onClose, onSelectDate }: { sessions: CashSession[], selectedDate: string, onClose: () => void, onSelectDate: (d: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate + 'T12:00:00'));
  
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()); i++) days.push(i);

  const sessionDates = new Set(sessions.map(s => s.date));
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#101010] border border-zinc-700 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500"><Calendar size={20} /></div>
              <div>
                 <h2 className="text-sm font-black uppercase tracking-widest text-white">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
                 <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Selecione uma data para ver o caixa</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6">
           <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"><ChevronUp size={20} className="-rotate-90" /></button>
              <div className="flex gap-1.5 p-1 bg-zinc-800/50 rounded-xl">
                 <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Hoje</button>
              </div>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"><ChevronUp size={20} className="rotate-90" /></button>
           </div>

           <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-[9px] font-black text-zinc-500 text-center py-2">{d}</div>
              ))}
              {days.map((day, i) => {
                if (day === null) return <div key={i} />;
                
                const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const dStr = d.toISOString().split('T')[0];
                const isSelected = dStr === selectedDate;
                const isToday = dStr === today;
                const hasSession = sessionDates.has(dStr);

                return (
                  <button
                    key={i}
                    onClick={() => {
                      onSelectDate(dStr);
                      onClose();
                    }}
                    className={`
                      relative group h-10 rounded-xl flex flex-col items-center justify-center transition-all
                      ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-zinc-800 text-zinc-400'}
                      ${isToday && !isSelected ? 'border border-blue-500/30' : ''}
                    `}
                  >
                    <span className={`text-[11px] font-black ${isSelected ? 'text-white' : ''}`}>{day}</span>
                    {hasSession && (
                      <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500 opacity-60'}`}></div>
                    )}
                  </button>
                );
              })}
           </div>
        </div>

        <div className="p-4 bg-black/40 border-t border-zinc-800 flex items-center justify-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-[8px] font-black text-zinc-400 uppercase">Com Movimento</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full border border-blue-500/30"></div>
              <span className="text-[8px] font-black text-zinc-400 uppercase">Hoje</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronLeft,
  Hash,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  customerDocument?: string;
}

interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  description: string;
  value: number;
  paymentMethod: string;
  date: string;
  time: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  supplier?: string;
  is_recurring?: boolean;
  recurring_period?: 'monthly' | 'weekly' | 'yearly';
  status?: 'PAID' | 'PENDING';
}

import { Order } from '../types';
import { Customer } from './ClientesModule';

interface FinanceiroModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    company_id: string;
    type?: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
  companySettings: any;
  orders: Order[];
  customers: Customer[];
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
}

type Tab = 'RECEBER' | 'PAGAR' | 'RESUMO' | 'EXTRATO';
type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function FinanceiroModuleView({ profile, onBack, onShowToast, companySettings, orders, customers, onLogActivity }: FinanceiroModuleProps) {
  const [activeTab, setActiveTab] = useState<Tab>('EXTRATO');
  const [extratoFilter, setExtratoFilter] = useState<'ALL' | 'ENTRADAS' | 'SAIDAS'>('ALL');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [receivablesSearch, setReceivablesSearch] = useState('');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState<string>(format(new Date(), 'yyyy-MM'));

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

  const currentPeriodDates = useMemo(() => {
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
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'custom':
        start = parseISO(customStartDate || format(startOfMonth(now), 'yyyy-MM-dd'));
        end = endOfDay(parseISO(customEndDate || format(endOfMonth(now), 'yyyy-MM-dd')));
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
    }

    return { start, end };
  }, [period, customStartDate, customEndDate]);

  useEffect(() => {
    fetchData();
  }, [orders, customers, currentPeriodDates, expenseMonthFilter]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const expenseFilterStart = parseISO(`${expenseMonthFilter}-01`);
      const expenseFilterEnd = endOfMonth(expenseFilterStart);

      // Usamos a maior janela entre o extrato/resumo e a aba de contas a pagar para trazer tudo num request
      const globalStart = new Date(Math.min(currentPeriodDates.start.getTime(), expenseFilterStart.getTime()));
      const globalEnd = new Date(Math.max(currentPeriodDates.end.getTime(), expenseFilterEnd.getTime()));

      const startIso = globalStart.toISOString();
      const endIso = globalEnd.toISOString();
      const startDay = format(globalStart, 'yyyy-MM-dd');
      const endDay = format(globalEnd, 'yyyy-MM-dd');
      // Use props orders instead of fetching
      const processedReceivables = (orders || [])
        .filter(order => {
          const fin = order.financials || {};
          const total = fin.totalValue || (fin as any).total || 0;
          
          // Excluir status inválidos ou não aprovados de contas a receber
          const invalidStatuses = ['Orçamento Cancelado', 'Orçamento Recusado', 'Sem Reparo', 'Orçamento em Elaboração'];
          if (invalidStatuses.includes(order.status)) {
            return false;
          }
          
          return total > 0; // Show all orders with a value
        })
        .map(order => {
          const fin = order.financials || {};
          const total = fin.totalValue || (fin as any).total || 0;
          const paid = fin.amountPaid || (fin as any).paid || 0;
          const customer = customers.find(c => c.id === order.customerId);
          return {
            id: order.id,
            osId: order.id,
            osNumber: order.osNumber || (order as any).os_number || 0,
            customerName: customer?.name || 'Cliente não identificado',
            customerDocument: customer?.document || '',
            totalAmount: total,
            paidAmount: paid,
            remainingAmount: total - paid,
            dueDate: order.createdAt || (order as any).created_at,
            status: order.status
          } as Receivable;
        });

      // Fetch Manual Incomes
      const { data: incomesData } = await supabase
        .from('incomes')
        .select('id, description, amount, date')
        .eq('company_id', profile.company_id)
        .gte('date', startDay)
        .lte('date', endDay)
        .order('date', { ascending: false });
      
      const manualReceivables = (incomesData || [])
        .filter(inc => inc.id) // Show all manual incomes
        .map(inc => ({
          id: inc.id,
          osId: inc.id,
          osNumber: 0,
          customerName: `[Receita] ${inc.description}`,
          totalAmount: inc.amount,
          paidAmount: 0,
          remainingAmount: inc.amount,
          dueDate: inc.date,
          status: 'Manual'
        }));

      setReceivables([...processedReceivables, ...manualReceivables]);

      // Fetch Expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id, description, amount, date, due_date, status, paid, category, supplier, is_recurring')
        .eq('company_id', profile.company_id)
        .gte('date', startDay) // Consider due_date logic locally, but limit base rows
        .lte('date', endDay)
        .order('date', { ascending: false });

      if (expensesError) {
        console.warn('Expenses table might not exist yet');
        setExpenses([]);
      } else {
        const exps = expensesData || [];
        setExpenses(exps);

        // Auto-process recurring expenses
        const recurringTemplates = exps.filter(e => e.is_recurring);
        const currentMonthStr = format(new Date(), 'yyyy-MM');
        const missingRecurring: any[] = [];

        for (const template of recurringTemplates) {
          const templateMonth = format(parseISO(template.date), 'yyyy-MM');
          if (templateMonth < currentMonthStr) {
            const alreadyExists = exps.some(e => 
              e.description === template.description && 
              e.amount === template.amount &&
              format(parseISO(e.date), 'yyyy-MM') === currentMonthStr
            );

            if (!alreadyExists) {
              const newDate = new Date();
              const originalDay = parseISO(template.date).getDate();
              newDate.setDate(originalDay);
              
              missingRecurring.push({
                id: crypto.randomUUID(),
                description: template.description,
                amount: template.amount,
                date: format(newDate, 'yyyy-MM-dd'),
                category: template.category,
                supplier: template.supplier,
                is_recurring: true
              });
            }
          }
        }

        if (missingRecurring.length > 0) {
          const { error: insertError } = await supabase.from('expenses').insert(missingRecurring.map(r => ({ ...r, company_id: profile.company_id })));
          if (!insertError) {
            setExpenses(prev => [...missingRecurring, ...prev]);
            onShowToast(`${missingRecurring.length} despesas recorrentes geradas para este mês`);
          }
        }
      }

      // Fetch All Transactions (from cashier/caixa)
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('id, type, description, value, date, os_id')
        .eq('company_id', profile.company_id)
        .gte('date', startDay)
        .lte('date', endDay)
        .order('date', { ascending: false });
      
      if (transError) {
        console.warn('Transactions table error:', transError);
      } else {
        setTransactions((transData || []).map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          value: t.value || 0,
          paymentMethod: t.payment_method,
          date: t.date,
          time: t.time
        })));
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
      supplier: formData.get('supplier') as string,
      is_recurring: formData.get('is_recurring') === 'on',
      recurring_period: formData.get('is_recurring') === 'on' ? 'monthly' : undefined,
      status: 'PENDING'
    };

    try {
      const expenseToSave: any = {
        id: crypto.randomUUID(),
        company_id: profile.company_id,
        description: newExpense.description,
        amount: newExpense.amount,
        date: newExpense.date,
        category: newExpense.category,
        supplier: newExpense.supplier,
        status: newExpense.status
      };

      if (newExpense.is_recurring) {
        expenseToSave.is_recurring = true;
        expenseToSave.recurring_period = 'monthly';
      }

      const { data, error } = await supabase.from('expenses').insert(expenseToSave).select().single();
      
      if (error) throw error;
      
      onLogActivity?.('FINANCEIRO', 'CRIOU DESPESA', {
        expenseId: data.id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        supplier: data.supplier,
        logDescription: `Cadastrou nova despesa: ${data.description} (R$ ${data.amount.toFixed(2)})`
      });
      
      setExpenses([data, ...expenses]);
      onShowToast('Despesa cadastrada com sucesso');
      setIsExpenseModalOpen(false);
    } catch (err: any) {
      onShowToast('Erro ao salvar despesa: ' + err.message);
    }
  };

  const handleAddIncome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;

    try {
      const { data, error } = await supabase.from('incomes').insert({
        amount,
        date,
        status: 'PENDING'
      }).select().single();

      if (error) {
         onShowToast('Não foi possível salvar: verifique a tabela "incomes".');
         return;
      }

      onLogActivity?.('FINANCEIRO', 'CRIOU RECEITA', {
        incomeId: data.id,
        description: data.description,
        amount: data.amount,
        logDescription: `Cadastrou nova receita manual: ${data.description} (R$ ${data.amount.toFixed(2)})`
      });

      const newReceivable: Receivable = {
        id: data.id,
        osId: data.id,
        osNumber: 0,
        customerName: `[Receita] ${data.description}`,
        totalAmount: data.amount,
        paidAmount: 0,
        remainingAmount: data.amount,
        dueDate: data.date,
        status: 'Manual'
      };

      setReceivables([newReceivable, ...receivables]);
      setIsIncomeModalOpen(false);
      onShowToast('Receita cadastrada com sucesso');
    } catch (err: any) {
      onShowToast('Erro ao salvar: ' + err.message);
    }
  };

  const handleToggleExpensePaid = async (expense: Expense) => {
    const newStatus = expense.status === 'PENDING' ? 'PAID' : 'PENDING';
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', expense.id)
      if (error) throw error;

      onLogActivity?.('FINANCEIRO', 'ALTEROU STATUS DESPESA', {
        expenseId: expense.id,
        description: expense.description,
        status: newStatus,
        logDescription: `Marcou despesa "${expense.description}" como ${newStatus === 'PAID' ? 'Paga' : 'Pendente'}`
      });

      setExpenses(expenses.map(e => e.id === expense.id ? { ...e, status: newStatus } : e));
      onShowToast(`Despesa marcada como ${newStatus === 'PAID' ? 'paga' : 'pendente'}`);
    } catch (err: any) {
      console.error('Error updating status:', err);
      const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      onShowToast('Erro ao atualizar status: ' + errorMsg);
    }
  };

  const handleToggleReceivableStatus = async (r: Receivable) => {
    const isNowPaid = r.remainingAmount > 0;
    try {
      if (r.status === 'Manual') {
        const { error } = await supabase
          .from('incomes')
          .update({ status: isNowPaid ? 'PAID' : 'PENDING' })
          .eq('id', r.id)
          .eq('company_id', profile.company_id);
        
        if (error) throw error;

        setReceivables(receivables.map(item => 
          item.id === r.id ? { 
            ...item, 
            paidAmount: isNowPaid ? item.totalAmount : 0,
            remainingAmount: isNowPaid ? 0 : item.totalAmount 
          } : item
        ));
      } else {
        const order = orders.find(o => o.id === r.osId);
        const { error } = await supabase.from('orders').update({
          financials: {
            ...order?.financials,
            amountPaid: isNowPaid ? r.totalAmount : 0,
            paymentStatus: isNowPaid ? 'Pago' : 'Pendente',
            paymentType: 'Manual/Toggle'
          }
        }).eq('id', r.osId).eq('company_id', profile.company_id);

        if (error) throw error;

        onLogActivity?.('FINANCEIRO', 'ALTEROU STATUS RECEBIMENTO', {
          receivableId: r.id,
          customerName: r.customerName,
          status: isNowPaid ? 'Pago' : 'Pendente',
          logDescription: `Marcou recebimento de "${r.customerName}" como ${isNowPaid ? 'Recebido' : 'Pendente'}`
        });
      }
      onShowToast(`Recebimento marcado como ${isNowPaid ? 'recebido' : 'pendente'}`);
    } catch (err: any) {
      console.error('Error updating receivable status:', err);
      onShowToast('Erro ao atualizar status: ' + err.message);
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
      if (selectedReceivable.status === 'Manual') {
        // Update incomes table
        const { error: incError } = await supabase
          .from('incomes')
          .update({ 
            status: isFullyPaid ? 'PAID' : 'PENDING'
          })
          .eq('id', selectedReceivable.osId)
          .eq('company_id', profile.company_id);
        
        if (incError) throw incError;
      } else {
        // Update orders table
        const { error: orderError } = await supabase.from('orders').update({
          financials: {
            totalValue: selectedReceivable.totalAmount,
            amountPaid: newPaidAmount,
            paymentStatus: isFullyPaid ? 'Pago' : 'Pendente',
            paymentType: 'Manual/Financeiro'
          },
          status: isFullyPaid ? 'Concluída' : selectedReceivable.status
        }).eq('id', selectedReceivable.osId).eq('company_id', profile.company_id);

        if (orderError) throw orderError;
      }

      // Record the transaction in the global history (transactions)
      const now = new Date();
      await supabase.from('transactions').insert({
        id: crypto.randomUUID(),
        company_id: profile.company_id,
        type: 'entrada',
        description: selectedReceivable.status === 'Manual' 
          ? `[Recebimento] ${selectedReceivable.customerName.replace('[Receita] ', '')}`
          : `[Pagamento OS] ${selectedReceivable.customerName} (OS ${selectedReceivable.osNumber})`,
        value: paymentAmount,
        payment_method: 'Manual/Financeiro', 
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm'),
        user_id: profile.id
      });

      onShowToast('Pagamento registrado com sucesso');
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error registering payment:', err);
      onShowToast('Erro ao registrar pagamento: ' + err.message);
    }
  };


  const handleExportPDF = () => {
    // 1. Get filtered list
    const { start, end } = currentPeriodDates;

    const list = [
      ...transactions.map(t => ({ ...t, source: 'caixa' })),
      ...expenses.filter(e => e.status === 'PAID').map(e => ({ 
        id: e.id, type: 'saida', description: e.description, value: e.amount, 
        paymentMethod: e.category, date: e.date, time: '00:00', source: 'financeiro' 
      }))
    ]
    .filter(m => {
      try { return isWithinInterval(parseISO(m.date), { start, end }); } 
      catch { return false; }
    })
    .sort((a, b) => new Date(a.date).getTime() - b.date.localeCompare(a.date));

    if (list.length === 0) {
      onShowToast('Nenhum dado para exportar no período selecionado.');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Styled
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(companySettings?.name || 'SERVYX', 15, 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (companySettings?.cnpj) {
      doc.text(`CNPJ: ${companySettings.cnpj}`, 15, 28);
    }
    
    doc.setTextColor(100, 100, 100);
    doc.text('EXTRATO FINANCEIRO DETALHADO', 15, 34);

    const periodStr = `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`;
    doc.setTextColor(0, 0, 0);
    doc.text(`Período: ${periodStr}`, pageWidth - 15, 25, { align: 'right' });
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 15, 33, { align: 'right' });

    // Calculate Summary Data
    let totalServicos = 0;
    let totalVendas = 0;
    let totalOutros = 0;
    
    let totalDinheiro = 0;
    let totalCartao = 0;
    let totalPix = 0;
    let totalLink = 0;

    list.forEach(item => {
      if (item.type === 'entrada') {
        const desc = item.description || '';
        const method = (item.paymentMethod || '').toLowerCase();
        const value = Number(item.value || 0);

        // Origin
        if (desc.toLowerCase().includes('venda')) totalVendas += value;
        else if (desc.toLowerCase().includes('os')) totalServicos += value;
        else totalOutros += value;

        // Payment Method
        if (method.includes('pix')) totalPix += value;
        else if (method.includes('dinheiro')) totalDinheiro += value;
        else if (method.includes('debito') || method.includes('crédito') || method.includes('credito') || method.includes('cartão')) totalCartao += value;
        else if (method.includes('link')) totalLink += value;
      }
    });

    const totalFaturamento = stats.revenue;
    const totalGasto = stats.expenses;
    const lucro = totalFaturamento - totalGasto;

    // Table
    const tableData = list.map(item => [
      format(parseISO(item.date), 'dd/MM/yyyy'),
      item.type === 'entrada' ? 'ENTRADA' : 'SAÍDA',
      item.description || '',
      item.paymentMethod || '-',
      `R$ ${Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['DATA', 'TIPO', 'DESCRIÇÃO', 'MÉTODO', 'VALOR']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 230, 118], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        3: { cellWidth: 30 },
        4: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'ENTRADA') data.cell.styles.textColor = [0, 150, 0];
          else if (data.cell.raw === 'SAÍDA') data.cell.styles.textColor = [200, 0, 0];
        }
      }
    });

    // Summary Section
    const lastTable = (doc as any).lastAutoTable;
    let finalY = lastTable ? lastTable.finalY + 10 : 70;
    
    // Check if we need to add a new page for the summary
    if (finalY + 80 > doc.internal.pageSize.height) {
      doc.addPage();
      finalY = 20;
    }

    // Advanced Summary layout
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, finalY, pageWidth - 30, 80, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO FINANCEIRO DETALHADO', 20, finalY + 8);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, finalY + 12, pageWidth - 20, finalY + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Left Column: Receipts by Category
    doc.setFont('helvetica', 'bold');
    doc.text('ORIGEM DAS ENTRADAS', 20, finalY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text('Prestação de Serviços:', 20, finalY + 26);
    doc.text(`R$ ${totalServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 95, finalY + 26, { align: 'right' });
    doc.text('Vendas Formais:', 20, finalY + 32);
    doc.text(`R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 95, finalY + 32, { align: 'right' });
    doc.text('Outros / Manuais:', 20, finalY + 38);
    doc.text(`R$ ${totalOutros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 95, finalY + 38, { align: 'right' });

    // Middle Column: Receipts by Payment Method
    doc.setFont('helvetica', 'bold');
    doc.text('MEIOS DE PAGAMENTO', 110, finalY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text('PIX:', 110, finalY + 26);
    doc.text(`R$ ${totalPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 26, { align: 'right' });
    doc.text('Dinheiro:', 110, finalY + 32);
    doc.text(`R$ ${totalDinheiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 32, { align: 'right' });
    doc.text('Cartão (Créd/Déb):', 110, finalY + 38);
    doc.text(`R$ ${totalCartao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 38, { align: 'right' });
    doc.text('Pagamentos via Link:', 110, finalY + 44);
    doc.text(`R$ ${totalLink.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 44, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(20, finalY + 52, pageWidth - 20, finalY + 52);

    // Bottom Row: Final Totals
    doc.setFontSize(9);
    
    // Revenue
    doc.setTextColor(0, 150, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Faturamento:', 20, finalY + 62);
    doc.text(`R$ ${totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 75, finalY + 62, { align: 'right' });

    // Expenses
    doc.setTextColor(200, 0, 0);
    doc.text('Gasto Total:', 90, finalY + 62);
    doc.text(`R$ ${totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 135, finalY + 62, { align: 'right' });

    // Profit
    if (lucro >= 0) {
      doc.setTextColor(0, 120, 0); // Darker Green
    } else {
      doc.setTextColor(200, 0, 0);
    }
    doc.setFontSize(9);
    doc.text('Lucro:', 150, finalY + 62);
    doc.text(`R$ ${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 62, { align: 'right' });

    doc.save(`extrato_${companySettings?.name || 'servyx'}_${format(start, 'yyyyMMdd')}.pdf`);
    onShowToast('PDF gerado com sucesso!');
  };

  // currentPeriodDates was moved to the top of the component
  const getFilteredTotals = () => {
    const { start, end } = currentPeriodDates;

    const periodExpenses = expenses.filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start, end });
    });

    const periodTransactions = transactions.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start, end });
    });

    // Filtro do contas a receber aplicando período (Stage 1)
    const periodReceivables = receivables.filter(r => {
      try {
        const d = parseISO(r.dueDate);
        return isWithinInterval(d, { start, end });
      } catch {
        return false;
      }
    });

    // Faturamento bruto segmentado (Stage 2)
    let osRevenue = 0;
    let salesRevenue = 0;
    let avulsoRevenue = 0;

    periodTransactions.filter(t => t.type === 'entrada').forEach(t => {
      const descLower = t.description?.toLowerCase() || '';
      const isOs = !!t.osId || descLower.includes('os') || descLower.includes('pagamento os');
      const isSale = descLower.startsWith('venda #') || descLower.includes('venda #');

      if (isOs) {
        osRevenue += t.value || 0;
      } else if (isSale) {
        salesRevenue += t.value || 0;
      } else {
        avulsoRevenue += t.value || 0;
      }
    });

    const totalRevenue = osRevenue + salesRevenue + avulsoRevenue;

    // Despesas segmentadas (OPEX vs COGS) (Stage 3)
    let opexExpenses = 0;
    let cogsExpenses = 0;

    // 1. Categorias das duplicatas pagas
    periodExpenses.filter(e => e.status !== 'PENDING').forEach(e => {
      if (e.category === 'Produtos') {
        cogsExpenses += e.amount || 0;
      } else {
        opexExpenses += e.amount || 0;
      }
    });

    // 2. Transações de saída categorizadas
    periodTransactions.filter(t => t.type === 'saida').forEach(t => {
      const descLower = t.description?.toLowerCase() || '';
      const technicalKeywords = [
        'peça', 'peca', 'estoque', 'fornecedor', 'compra', 'bateria', 'tela', 
        'componente', 'insumo', 'suprimento', 'suprimentos', 'luva', 'luvas', 
        'capa', 'capinha', 'película', 'pelicula', 'cabo', 'carregador', 'conector', 
        'dock', 'placa', 'ci', 'adesivo', 'adesiva', 'acessório', 'acessorio', 'notebook'
      ];
      const nonExpenseKeywords = ['sangria', 'retirada', 'transferência', 'transferencia', 'depósito', 'deposito', 'fechamento', 'troco'];
      
      const isTechnical = technicalKeywords.some(kw => descLower.includes(kw));
      const isNonExpense = nonExpenseKeywords.some(kw => descLower.includes(kw));

      if (isTechnical) {
        cogsExpenses += t.value || 0;
      } else if (!isNonExpense) {
        opexExpenses += t.value || 0;
      }
    });

    const totalGasto = opexExpenses + cogsExpenses;

    const pendingExpensesTotal = periodExpenses.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
    const pendingReceivablesTotal = periodReceivables.reduce((acc, curr) => acc + curr.remainingAmount, 0);

    return { 
      revenue: totalRevenue, 
      osRevenue,
      salesRevenue,
      avulsoRevenue,
      expenses: totalGasto, 
      opexExpenses,
      cogsExpenses,
      operatingResult: totalRevenue - opexExpenses,
      pendingExpenses: pendingExpensesTotal, 
      pendingReceivables: pendingReceivablesTotal,
      profit: totalRevenue - opexExpenses - cogsExpenses,
    };
  };
  const stats = getFilteredTotals();

  const chartData = useMemo(() => {
    // 1. Pie Data: Revenue vs Expense
    const pieData = [
      { name: 'Entradas', value: stats.revenue, color: '#00E676' },
      { name: 'Saídas', value: stats.expenses, color: '#f87171' }
    ].filter(d => d.value > 0);

    // 2. Area Data: Daily evolution
    const { start, end } = currentPeriodDates;

    const days = eachDayOfInterval({ start, end });
    const areaData = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dailyRevenue = transactions
        .filter(t => t.type === 'entrada' && t.date === dateStr)
        .reduce((sum, t) => sum + t.value, 0);
      
      const dailyExpenses = expenses
        .filter(e => e.status === 'PAID' && e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        date: format(day, 'dd/MM'),
        dateFull: dateStr,
        receita: dailyRevenue,
        despesa: dailyExpenses
      };
    });

    return { pieData, areaData };
  }, [stats, transactions, expenses, currentPeriodDates]);

  const expenseMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach(e => {
      if (e.date) months.add(format(parseISO(e.date), 'yyyy-MM'));
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const expenseTotals = useMemo(() => {
    const filtered = expenseMonthFilter === 'all' 
      ? expenses 
      : expenses.filter(e => e.date && format(parseISO(e.date), 'yyyy-MM') === expenseMonthFilter);
    const total = filtered.reduce((acc, curr) => acc + curr.amount, 0);
    const paid = filtered.filter(e => e.status !== 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
    const pending = filtered.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
    return { total, paid, pending };
  }, [expenses, expenseMonthFilter]);


  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Header Glassmorphism */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-zinc-900 p-4 sm:p-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={onBack} className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
              <ChevronLeft size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Financeiro</h1>
              <p className="text-[10px] sm:text-sm text-zinc-500 font-medium truncate">Saúde financeira do negócio</p>
            </div>
          </div>
          
          {/* Tabs Floating Island */}
          <div className="hidden md:flex w-full sm:w-auto bg-[#0a0a0a]/80 backdrop-blur-xl p-1.5 rounded-[20px] border border-white/5 shadow-2xl">
            <div className="flex w-full overflow-x-auto custom-scrollbar sm:scrollbar-hide shrink-0 gap-1.5">
              <button 
                onClick={() => setActiveTab('EXTRATO')} 
                className={`relative flex-1 sm:flex-none px-5 sm:px-8 py-3 sm:py-2.5 rounded-2xl text-[10px] sm:text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap overflow-hidden group ${activeTab === 'EXTRATO' ? 'text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                {activeTab === 'EXTRATO' && <div className="absolute inset-0 bg-gradient-to-r from-[#00E676] to-emerald-400 opacity-100" />}
                <span className="relative z-10">Fluxo de Caixa</span>
              </button>
              <button 
                onClick={() => setActiveTab('RECEBER')} 
                className={`relative flex-1 sm:flex-none px-5 sm:px-8 py-3 sm:py-2.5 rounded-2xl text-[10px] sm:text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap overflow-hidden group ${activeTab === 'RECEBER' ? 'text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                {activeTab === 'RECEBER' && <div className="absolute inset-0 bg-gradient-to-r from-[#00E676] to-emerald-400 opacity-100" />}
                <span className="relative z-10">Receber</span>
              </button>
              <button 
                onClick={() => setActiveTab('PAGAR')} 
                className={`relative flex-1 sm:flex-none px-5 sm:px-8 py-3 sm:py-2.5 rounded-2xl text-[10px] sm:text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap overflow-hidden group ${activeTab === 'PAGAR' ? 'text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                {activeTab === 'PAGAR' && <div className="absolute inset-0 bg-gradient-to-r from-[#00E676] to-emerald-400 opacity-100" />}
                <span className="relative z-10">Pagar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Faturamento Bruto */}
          <div 
            onClick={() => { setActiveTab('EXTRATO'); setExtratoFilter('ENTRADAS'); }}
            className={`cursor-pointer relative overflow-hidden p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] border transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] ${activeTab === 'EXTRATO' && extratoFilter === 'ENTRADAS' ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]' : 'bg-gradient-to-br from-white/[0.03] to-transparent border-white/5 hover:border-emerald-500/30'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center ring-1 ring-emerald-500/20">
                  <TrendingUp size={16} />
                </div>
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Faturamento</span>
              </div>
              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Faturamento Bruto</h3>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight truncate mt-1">R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <div className="mt-3 pt-3 border-t border-white/5 space-y-1 text-[10px] text-zinc-400 font-medium">
                <div className="flex justify-between items-center group/item"><span className="transition-colors group-hover/item:text-white">OS:</span><span className="text-white font-bold">R$ {stats.osRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between items-center group/item"><span className="transition-colors group-hover/item:text-white">Vendas:</span><span className="text-white font-bold">R$ {stats.salesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between items-center group/item"><span className="transition-colors group-hover/item:text-white">Avulsos:</span><span className="text-white font-bold">R$ {stats.avulsoRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          </div>

          {/* Custos Técnicos (COGS) */}
          <div 
            onClick={() => { setActiveTab('EXTRATO'); setExtratoFilter('SAIDAS'); }}
            className={`cursor-pointer relative overflow-hidden p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] border transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] ${activeTab === 'EXTRATO' && extratoFilter === 'SAIDAS' ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_30px_-10px_rgba(239,68,68,0.2)]' : 'bg-gradient-to-br from-white/[0.03] to-transparent border-white/5 hover:border-red-500/30'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center ring-1 ring-red-500/20">
                  <TrendingDown size={16} />
                </div>
                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">COGS</span>
              </div>
              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Custos Técnicos</h3>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight truncate mt-1">R$ {stats.cogsExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-2 leading-relaxed">Peças, componentes e insumos consumidos nos reparos.</p>
            </div>
          </div>

          {/* Despesas Operacionais (OPEX) */}
          <div 
            onClick={() => setActiveTab('PAGAR')}
            className={`cursor-pointer relative overflow-hidden p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] border transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] ${activeTab === 'PAGAR' ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]' : 'bg-gradient-to-br from-white/[0.03] to-transparent border-white/5 hover:border-amber-500/30'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center ring-1 ring-amber-500/20">
                  <TrendingDown size={16} />
                </div>
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">OPEX</span>
              </div>
              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Despesas Operacionais</h3>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight truncate mt-1">R$ {stats.opexExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-2 leading-relaxed">Aluguel, energia, salários e infraestrutura.</p>
            </div>
          </div>

          {/* Resultado Operacional */}
          <div 
            className={`relative overflow-hidden p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] border transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] bg-gradient-to-br from-white/[0.03] to-transparent border-white/5 hover:border-blue-500/30 group`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center ring-1 ring-blue-500/20">
                  <DollarSign size={16} />
                </div>
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Operacional</span>
              </div>
              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Resultado Operacional</h3>
              <p className={`text-xl sm:text-2xl font-black tracking-tight truncate mt-1 ${stats.operatingResult >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                R$ {stats.operatingResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-zinc-500 font-medium mt-2 leading-relaxed">Faturamento Bruto menos despesas operacionais.</p>
            </div>
          </div>

          {/* Resultado Líquido */}
          <div 
            onClick={() => { setActiveTab('EXTRATO'); setExtratoFilter('ALL'); }}
            className={`cursor-pointer relative overflow-hidden p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] border transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] ${stats.profit >= 0 ? 'bg-gradient-to-br from-[#00E676]/10 to-transparent border-[#00E676]/40 shadow-[0_0_40px_-10px_rgba(0,230,118,0.15)]' : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/40 shadow-[0_0_40px_-10px_rgba(239,68,68,0.15)]'}`}
          >
            <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl rounded-full ${stats.profit >= 0 ? 'bg-[#00E676]/20' : 'bg-red-500/20'}`} />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ring-1 shadow-lg ${stats.profit >= 0 ? 'bg-[#00E676]/20 text-[#00E676] ring-[#00E676]/30' : 'bg-red-500/20 text-red-400 ring-red-500/30'}`}>
                  <DollarSign size={16} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${stats.profit >= 0 ? 'text-[#00E676] bg-[#00E676]/10 border-[#00E676]/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>Líquido</span>
              </div>
              <div className="mt-auto">
                <h3 className={`text-[10px] font-bold uppercase tracking-widest ${stats.profit >= 0 ? 'text-[#00E676]/80' : 'text-red-400/80'}`}>Resultado Líquido</h3>
                <p className={`text-2xl sm:text-3xl font-black tracking-tight truncate mt-1 drop-shadow-sm ${stats.profit >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                  R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Capital de Giro e Previsões (A Receber / A Pagar) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Card A Receber */}
          <div 
            onClick={() => setActiveTab('RECEBER')}
            className={`cursor-pointer relative overflow-hidden p-5 rounded-[24px] border transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] ${activeTab === 'RECEBER' ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]' : 'bg-gradient-to-br from-white/[0.03] to-transparent border-white/5 hover:border-blue-500/30'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center ring-1 ring-blue-500/20">
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">A Receber no Período</h4>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">OS e receitas pendentes</p>
                  </div>
                </div>
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Previsão</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-blue-400 tracking-tight">R$ {stats.pendingReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Card A Pagar */}
          <div 
            onClick={() => setActiveTab('PAGAR')}
            className={`cursor-pointer relative overflow-hidden p-5 rounded-[24px] border transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] ${activeTab === 'PAGAR' ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]' : 'bg-gradient-to-br from-white/[0.03] to-transparent border-white/5 hover:border-amber-500/30'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center ring-1 ring-amber-500/20">
                    <History size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">A Pagar no Período</h4>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Despesas pendentes</p>
                  </div>
                </div>
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Pendências</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">R$ {stats.pendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Period Filters - Global */}
        {/* Period Filters - Global */}
        <div className="flex flex-col gap-3 w-full mx-auto max-w-4xl">
          <div className="bg-[#0a0a0a]/80 backdrop-blur-md p-1.5 rounded-[20px] border border-white/5 flex w-full items-center gap-1.5 shadow-xl">
            {(['today', 'week', 'month', 'year', 'custom'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`relative flex-1 px-2 sm:px-5 py-3 sm:py-2.5 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest transition-all text-center whitespace-nowrap overflow-hidden group ${
                  period === p 
                    ? 'text-black shadow-lg shadow-emerald-500/20' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {period === p && <div className="absolute inset-0 bg-gradient-to-r from-[#00E676] to-emerald-400 opacity-100" />}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'year' ? 'Ano' : (
                    <>
                      <Calendar size={12} className={period === p ? "text-black" : "text-zinc-500 group-hover:text-white"} />
                      <span className="hidden sm:inline">Personalizado</span>
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
          
          <AnimatePresence>
            {period === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full overflow-hidden"
              >
                <div className="flex items-center justify-center w-full gap-2 bg-[#141414] border border-zinc-800/50 rounded-2xl p-2 shadow-sm">
                  <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-2.5 py-2 flex-1 sm:flex-none">
                    <Calendar size={14} className="text-[#00E676] shrink-0" />
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={e => setCustomStartDate(e.target.value)} 
                      className="bg-transparent text-[11px] sm:text-xs text-white font-bold focus:outline-none w-full sm:w-[120px]"
                    />
                  </div>
                  <span className="text-zinc-600 font-bold text-[10px] uppercase shrink-0">até</span>
                  <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-2.5 py-2 flex-1 sm:flex-none">
                    <Calendar size={14} className="text-red-400 shrink-0" />
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={e => setCustomEndDate(e.target.value)} 
                      className="bg-transparent text-[11px] sm:text-xs text-white font-bold focus:outline-none w-full sm:w-[120px]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {/* Removida aba RESUMO isolada para unificar no Fluxo de Caixa */}
          
          {activeTab === 'EXTRATO' && (
            <motion.div 
              key="extrato"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <History className="text-[#00E676]" size={20} /> <span className="hidden sm:inline">Fluxo de Caixa Unificado</span><span className="sm:hidden">Fluxo</span>
                    </h2>
                    <button 
                      onClick={handleExportPDF}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all group"
                    >
                      <Plus size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Exportar PDF
                    </button>
                  </div>
                </div>
                <div className="hidden sm:block text-xs text-zinc-500 font-medium bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  Mostrando entradas e saídas do período
                </div>
              </div>

              <div className="bg-[#0a0a0a]/80 backdrop-blur-xl overflow-hidden border border-white/5 rounded-[32px] shadow-2xl">
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-left">
                  <thead className="bg-white/5 text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Data</th>
                      <th className="px-8 py-4">Tipo</th>
                      <th className="px-8 py-4">Descrição</th>
                      <th className="px-8 py-4">Método/Categoria</th>
                      <th className="px-8 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-sm">
                    {(() => {
                      const { start, end } = currentPeriodDates;

                      const list = [
                        ...transactions.map(t => ({ ...t, source: 'caixa' })),
                        ...expenses.filter(e => e.status === 'PAID').map(e => ({ 
                          id: e.id, 
                          type: 'saida', 
                          description: e.description, 
                          value: e.amount, 
                          paymentMethod: e.category, 
                          date: e.date, 
                          time: '00:00',
                          source: 'financeiro' 
                        }))
                      ]
                      .filter(m => {
                        try {
                          if (extratoFilter === 'ENTRADAS' && m.type !== 'entrada') return false;
                          if (extratoFilter === 'SAIDAS' && m.type !== 'saida') return false;
                          return isWithinInterval(parseISO(m.date), { start, end });
                        } catch { return false; }
                      })
                      .sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')).getTime() - new Date(a.date + 'T' + (a.time || '00:00')).getTime());

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="py-20 text-center text-zinc-500">Nenhuma movimentação encontrada neste período.</td>
                          </tr>
                        );
                      }

                      return list.map((m: any) => (
                        <tr key={m.id} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="px-8 py-5 text-zinc-400 font-medium whitespace-nowrap">
                            {format(parseISO(m.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${m.type === 'entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {m.type === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="px-8 py-5 font-bold text-white capitalize">
                            {m.description}
                            {m.source === 'caixa' && <span className="ml-2 text-[9px] text-zinc-600 font-normal uppercase tracking-widest">Caixa</span>}
                          </td>
                          <td className="px-8 py-5 text-zinc-500 text-xs">
                            {m.paymentMethod}
                          </td>
                          <td className={`px-8 py-5 text-right font-black ${m.type === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {m.type === 'entrada' ? '+' : '-'} R$ {m.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>

                {/* Mobile Card Layout */}
                <div className="md:hidden bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-[24px] shadow-2xl mt-4 overflow-hidden divide-y divide-white/5">
                  {(() => {
                    const { start, end } = currentPeriodDates;

                    const list = [
                      ...transactions.map(t => ({ ...t, source: 'caixa' })),
                      ...expenses.filter(e => e.status === 'PAID').map(e => ({ 
                        id: e.id, type: 'saida', description: e.description, value: e.amount, 
                        paymentMethod: e.category, date: e.date, time: '00:00', source: 'financeiro' 
                      }))
                    ]
                    .filter(m => {
                      try { 
                        if (extratoFilter === 'ENTRADAS' && m.type !== 'entrada') return false;
                        if (extratoFilter === 'SAIDAS' && m.type !== 'saida') return false;
                        return isWithinInterval(parseISO(m.date), { start, end }); 
                      } 
                      catch { return false; }
                    })
                    .sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')).getTime() - new Date(a.date + 'T' + (a.time || '00:00')).getTime());

                    if (list.length === 0) {
                      return <div className="p-8 text-center text-zinc-500 text-sm">Nenhuma movimentação encontrada.</div>;
                    }

                    return list.map((m: any) => (
                      <div key={m.id} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-zinc-900 border border-zinc-800/50 ${m.type === 'entrada' ? 'text-[#00E676]' : 'text-red-400'}`}>
                          {m.type === 'entrada' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{m.description}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 font-medium uppercase tracking-widest truncate">{m.paymentMethod} {m.source === 'caixa' && '• Caixa'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-black ${m.type === 'entrada' ? 'text-[#00E676]' : 'text-red-400'}`}>
                            {m.type === 'entrada' ? '+' : '-'} R$ {m.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{format(parseISO(m.date), 'dd/MM/yyyy')}</p>
                        </div>
                      </div>
                    ));
                  })()}
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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <ArrowUpRight className="text-emerald-500" /> <span className="hidden sm:inline">Contas a Receber</span><span className="sm:hidden text-lg">A Receber</span>
                  </h2>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                      type="text" 
                      placeholder="Filtrar clientes..." 
                      className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-3 sm:py-2 text-sm focus:outline-none focus:border-[#00E676]/30 transition-all w-full sm:w-64"
                      value={receivablesSearch}
                      onChange={(e) => setReceivablesSearch(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setIsIncomeModalOpen(true)}
                    className="bg-[#00E676] hover:bg-[#00C853] text-black font-bold px-6 py-3 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00E676]/20 active:scale-95 text-xs uppercase tracking-widest"
                  >
                    <Plus size={18} /> <span className="sm:hidden">Nova Receita</span><span className="hidden sm:inline">Cadastrar Receita</span>
                  </button>
                </div>
              </div>

              {/* Receivables Dash */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#141414] border border-zinc-800/50 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total a Receber</p>
                  <p className="text-xl font-black text-white">R$ {receivables.filter(r => r.remainingAmount > 0).reduce((acc, r) => acc + r.totalAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#141414] border border-zinc-800/50 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Recebido</p>
                  <p className="text-xl font-black text-emerald-500">R$ {receivables.filter(r => r.remainingAmount > 0).reduce((acc, r) => acc + r.paidAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#141414] border border-zinc-800/50 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Pendente</p>
                  <p className="text-xl font-black text-amber-500">R$ {receivables.filter(r => r.remainingAmount > 0).reduce((acc, r) => acc + r.remainingAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="bg-[#0a0a0a]/80 backdrop-blur-xl overflow-hidden border border-white/5 rounded-[32px] shadow-2xl">
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-left">
                  <thead className="bg-white/5 text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Vencimento</th>
                      <th className="px-8 py-4">Ref/OS</th>
                      <th className="px-8 py-4">Cliente</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Saldo</th>
                      <th className="px-8 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {(() => {
                      const sortedReceivables = [...receivables]
                        .filter(r => {
                          if (r.remainingAmount <= 0) return false;
                          const search = receivablesSearch.toLowerCase();
                          return r.customerName.toLowerCase().includes(search) || 
                                 r.osNumber.toString().includes(search) ||
                                 (r.customerDocument && r.customerDocument.includes(search));
                        })
                        .sort((a, b) => {
                          // Priority 1: Status (Pending first)
                          const isAPending = a.remainingAmount > 0;
                          const isBPending = b.remainingAmount > 0;
                          if (isAPending && !isBPending) return -1;
                          if (!isAPending && isBPending) return 1;
                          
                          // Priority 2: Date
                          const dateA = new Date(a.dueDate).getTime();
                          const dateB = new Date(b.dueDate).getTime();
                          return isAPending ? dateA - dateB : dateB - dateA;
                        });

                      if (sortedReceivables.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="px-8 py-20 text-center text-zinc-500 font-medium">
                              {receivablesSearch ? `Nenhum resultado para "${receivablesSearch}"` : 'Tudo em dia! Nenhuma conta a receber pendente.'}
                            </td>
                          </tr>
                        );
                      }

                      return sortedReceivables.map(r => (
                        <tr key={r.id} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="px-8 py-5 text-sm font-medium text-zinc-400">
                            {format(parseISO(r.dueDate), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-8 py-5">
                            {r.osNumber > 0 ? (
                              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter">OS {String(r.osNumber).padStart(4, '0')}</span>
                            ) : (
                              <span className="text-[10px] font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase tracking-tighter">Manual</span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-white max-w-[200px] truncate">{r.customerName}</td>
                          <td className="px-8 py-5">
                            <div 
                              onClick={() => handleToggleReceivableStatus(r)}
                              className="flex items-center gap-3 cursor-pointer group w-fit bg-[#0A0A0A]/80 hover:bg-[#1A1A1A] p-1.5 pr-3 rounded-full border border-zinc-800 transition-colors"
                              title={r.remainingAmount > 0 ? 'Marcar como RECEBIDO' : 'Marcar como PENDENTE'}
                            >
                              <div className={`relative inline-flex h-5 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${r.remainingAmount > 0 ? 'bg-zinc-700' : 'bg-[#00E676]'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${r.remainingAmount > 0 ? '-translate-x-2' : 'translate-x-2'}`} />
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${r.remainingAmount > 0 ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-[#00E676]'}`}>
                                {r.remainingAmount > 0 ? 'Pendente' : 'Recebido'}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <div className="flex flex-col items-end">
                                <span className={`text-sm font-bold ${r.remainingAmount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  R$ {r.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {r.paidAmount > 0 && r.remainingAmount > 0 && (
                                   <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Total R$ {r.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                )}
                             </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <button 
                              onClick={() => { setSelectedReceivable(r); setIsPaymentModalOpen(true); }}
                              className="p-2.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-[#00E676] hover:text-black transition-all"
                            >
                              <CreditCard size={16} />
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>

                {/* Mobile Cards for Receivables */}
                <div className="md:hidden bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-[24px] shadow-2xl mt-4 overflow-hidden divide-y divide-white/5">
                  {(() => {
                    const filtered = receivables.filter(r => {
                      if (r.remainingAmount <= 0) return false;
                      const search = receivablesSearch.toLowerCase();
                      return r.customerName.toLowerCase().includes(search) || 
                             r.osNumber.toString().includes(search);
                    });

                    if (filtered.length === 0) {
                      return <div className="p-8 text-center text-zinc-500 text-sm">Nenhum recebimento encontrado.</div>;
                    }

                    return filtered.map(r => (
                      <div key={r.id} className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-zinc-900 border border-zinc-800/50 ${r.remainingAmount > 0 ? 'text-amber-500' : 'text-[#00E676]'}`}>
                             <ArrowUpRight size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                               <p className="text-sm font-bold text-white truncate">{r.customerName}</p>
                               <span className="text-[10px] text-zinc-500 font-medium shrink-0">{format(parseISO(r.dueDate), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                               <div className="flex items-center gap-2">
                                 {r.osNumber > 0 ? (
                                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-widest">OS {String(r.osNumber).padStart(4, '0')}</span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-widest">Manual</span>
                                  )}
                               </div>
                               <div className="text-right shrink-0">
                                  <p className={`text-sm font-black ${r.remainingAmount > 0 ? 'text-amber-500' : 'text-[#00E676]'}`}>
                                    R$ {r.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  {r.paidAmount > 0 && r.remainingAmount > 0 && (
                                     <p className="text-[9px] text-zinc-500 font-medium mt-0.5">Total R$ {r.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  )}
                               </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1 pt-3 border-t border-zinc-800/50">
                           <button 
                             onClick={() => handleToggleReceivableStatus(r)}
                             className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${r.remainingAmount > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20' : 'bg-[#00E676]/10 border-[#00E676]/20 text-[#00E676] hover:bg-[#00E676]/20'}`}
                           >
                             {r.remainingAmount > 0 ? 'Marcar Recebido' : 'Marcar Pendente'}
                           </button>
                           {r.remainingAmount > 0 && (
                             <button 
                               onClick={() => { setSelectedReceivable(r); setIsPaymentModalOpen(true); }}
                               className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                             >
                               <CreditCard size={14} /> Pagar
                             </button>
                           )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <ArrowDownRight className="text-red-500" /> <span className="hidden sm:inline">Contas a Pagar</span><span className="sm:hidden text-lg">A Pagar</span>
                  </h2>
                  <div className="relative group">
                    <select 
                      value={expenseMonthFilter}
                      onChange={(e) => setExpenseMonthFilter(e.target.value)}
                      className="appearance-none bg-zinc-900 border-2 border-zinc-700 text-sm font-black uppercase tracking-widest rounded-xl pl-4 pr-10 py-3 text-white focus:outline-none focus:border-amber-500 transition-all cursor-pointer shadow-xl ring-1 ring-black/5"
                    >
                      <option value="all" className="bg-[#141414] text-white">Todos os Meses</option>
                      {expenseMonths.map(m => (
                        <option key={m} value={m} className="bg-[#141414] text-white capitalize">{format(parseISO(m + '-01'), "MMMM yyyy", { locale: ptBR })}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-white transition-colors">
                      <Calendar size={16} />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="bg-[#00E676] hover:bg-[#00C853] text-black font-bold px-6 py-3 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00E676]/20 active:scale-95 text-xs uppercase tracking-widest"
                >
                  <Plus size={18} /> <span className="sm:hidden">Nova Despesa</span><span className="hidden sm:inline">Cadastrar Despesa</span>
                </button>
              </div>

              {/* Expense Dash */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#141414] border border-zinc-800/50 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total em Contas</p>
                  <p className="text-xl font-black text-white">R$ {expenseTotals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#141414] border border-zinc-800/50 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Pago</p>
                  <p className="text-xl font-black text-emerald-500">R$ {expenseTotals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#141414] border border-zinc-800/50 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">A Pagar</p>
                  <p className="text-xl font-black text-amber-500">R$ {expenseTotals.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="bg-[#0a0a0a]/80 backdrop-blur-xl overflow-hidden border border-white/5 rounded-[32px] shadow-2xl">
                {/* Desktop Table View - Grouped by Month */}
                <div className="hidden md:block">
                  {(() => {
                    const filteredList = expenseMonthFilter === 'all' 
                      ? expenses 
                      : expenses.filter(e => e.date && format(parseISO(e.date), 'yyyy-MM') === expenseMonthFilter);
                    
                    const sortedExpenses = [...filteredList].sort((a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    );

                    if (sortedExpenses.length === 0) {
                      return (
                        <div className="px-8 py-20 text-center text-zinc-500">Nenhuma despesa cadastrada.</div>
                      );
                    }

                    // Group by year-month
                    const groups: Record<string, Expense[]> = {};
                    sortedExpenses.forEach(exp => {
                      const key = format(parseISO(exp.date), 'yyyy-MM');
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(exp);
                    });

                    return Object.entries(groups)
                      .sort(([a], [b]) => b.localeCompare(a)) // most recent first
                      .map(([monthKey, exps]) => {
                        const monthLabel = format(parseISO(monthKey + '-01'), "MMMM 'de' yyyy", { locale: ptBR });
                        const monthTotal = exps.reduce((acc, e) => acc + e.amount, 0);
                        const monthPaid = exps.filter(e => e.status !== 'PENDING').reduce((acc, e) => acc + e.amount, 0);
                        const monthPending = exps.filter(e => e.status === 'PENDING').reduce((acc, e) => acc + e.amount, 0);
                        const sortedExps = [...exps].sort((a, b) => {
                          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                          return new Date(a.date).getTime() - new Date(b.date).getTime();
                        });

                        return (
                          <div key={monthKey}>
                            {/* Month Header */}
                            <div className="px-8 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
                              <div className="flex items-center gap-3">
                                <Calendar size={14} className="text-[#00E676]" />
                                <span className="text-xs font-black uppercase tracking-widest text-zinc-300 capitalize">{monthLabel}</span>
                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{exps.length} {exps.length === 1 ? 'despesa' : 'despesas'}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[10px] font-bold">
                                {monthPaid > 0 && <span className="text-emerald-500">✓ Pago: R$ {monthPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                                {monthPending > 0 && <span className="text-amber-400">● Pendente: R$ {monthPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                                <span className="text-zinc-500">Total: R$ {monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            <table className="w-full text-left">
                              <tbody className="divide-y divide-white/[0.03]">
                                {sortedExps.map(exp => (
                                  <tr key={exp.id} className="hover:bg-white/[0.03] transition-colors group">
                                    <td className="px-8 py-4 text-sm font-medium text-zinc-400 w-32">{format(parseISO(exp.date), 'dd/MM/yyyy')}</td>
                                    <td className="px-8 py-4 text-sm font-bold text-white">{exp.description}</td>
                                    <td className="px-8 py-4">
                                      <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800/80 border border-white/5 px-2 py-1 rounded-full text-zinc-400">{exp.category}</span>
                                    </td>
                                    <td className="px-8 py-4 text-sm text-zinc-400">
                                      <div className="flex items-center gap-2">
                                        {exp.supplier || '-'}
                                        {exp.is_recurring && (
                                          <div className="p-1 bg-[#00E676]/10 text-[#00E676] rounded-md" title="Despesa Recorrente">
                                            <History size={12} />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div
                                        onClick={() => handleToggleExpensePaid(exp)}
                                        className="flex items-center gap-3 cursor-pointer group w-fit bg-[#0A0A0A]/80 hover:bg-[#1A1A1A] p-1.5 pr-3 rounded-full border border-zinc-800 transition-colors"
                                        title={exp.status === 'PENDING' ? 'Marcar como PAGO' : 'Marcar como PENDENTE'}
                                      >
                                        <div className={`relative inline-flex h-5 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${exp.status === 'PENDING' ? 'bg-zinc-700' : 'bg-[#00E676]'}`}>
                                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${exp.status === 'PENDING' ? '-translate-x-2' : 'translate-x-2'}`} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${exp.status === 'PENDING' ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-[#00E676]'}`}>
                                          {exp.status === 'PENDING' ? 'Pendente' : 'Pago'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={`px-8 py-4 text-sm font-bold text-right ${exp.status === 'PENDING' ? 'text-amber-500' : 'text-red-400'}`}>
                                      R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      });
                  })()}
                </div>

                {/* Mobile Card View - Grouped by Month */}
                <div className="md:hidden">
                  {(() => {
                    const filteredList = expenseMonthFilter === 'all' 
                      ? expenses 
                      : expenses.filter(e => e.date && format(parseISO(e.date), 'yyyy-MM') === expenseMonthFilter);
                    
                    if (filteredList.length === 0) {
                      return <div className="p-8 text-center text-zinc-500 text-sm">Nenhuma despesa para exibir.</div>;
                    }

                    // Group by year-month
                    const groups: Record<string, Expense[]> = {};
                    [...filteredList]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .forEach(exp => {
                        const key = format(parseISO(exp.date), 'yyyy-MM');
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(exp);
                      });

                    return Object.entries(groups)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([monthKey, exps]) => {
                        const monthLabel = format(parseISO(monthKey + '-01'), "MMMM 'de' yyyy", { locale: ptBR });
                        const monthPaid = exps.filter(e => e.status !== 'PENDING').reduce((acc, e) => acc + e.amount, 0);
                        const monthPending = exps.filter(e => e.status === 'PENDING').reduce((acc, e) => acc + e.amount, 0);
                        const sortedExps = [...exps].sort((a, b) => {
                          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                          return new Date(a.date).getTime() - new Date(b.date).getTime();
                        });

                        return (
                          <div key={monthKey}>
                            {/* Month Header Mobile */}
                            <div className="px-4 py-3 bg-white/[0.03] border-b border-white/5 sticky top-0 backdrop-blur-xl z-10">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar size={12} className="text-[#00E676]" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 capitalize">{monthLabel}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[9px] font-bold">
                                  {monthPaid > 0 && <span className="text-emerald-500">✓ R$ {monthPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                                  {monthPending > 0 && <span className="text-amber-400">● R$ {monthPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="divide-y divide-white/5">
                              {sortedExps.map(exp => (
                                <div key={exp.id} className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-zinc-900 border border-zinc-800/50 ${exp.status === 'PENDING' ? 'text-amber-500' : 'text-red-400'}`}>
                                      <ArrowDownRight size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-white truncate">{exp.description}</p>
                                        <span className="text-[10px] text-zinc-500 font-medium shrink-0">{format(parseISO(exp.date), 'dd/MM')}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-2 mt-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-widest truncate">{exp.category}</span>
                                          {exp.supplier && <span className="text-[9px] text-zinc-500 truncate">• {exp.supplier}</span>}
                                        </div>
                                        <p className={`text-sm font-black shrink-0 ${exp.status === 'PENDING' ? 'text-amber-500' : 'text-red-400'}`}>
                                          R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-1 pt-3 border-t border-zinc-800/50">
                                    <button
                                      onClick={() => handleToggleExpensePaid(exp)}
                                      className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${exp.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20' : 'bg-[#00E676]/10 border-[#00E676]/20 text-[#00E676] hover:bg-[#00E676]/20'}`}
                                    >
                                      {exp.status === 'PENDING' ? 'Marcar Pago' : 'Marcar Pendente'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Expense Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-[#141414] border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden pb-6 sm:pb-0"
            >
              <div className="p-6 sm:p-8 border-b border-zinc-900 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-white">Nova Despesa</h2>
                  <p className="text-sm text-zinc-500">Registre uma saída financeira</p>
                </div>
                <button onClick={() => setIsExpenseModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Descrição</label>
                  <input name="description" required className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all" placeholder="Ex: Aluguel da Loja" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input type="number" step="0.01" name="amount" required className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all" placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Data</label>
                    <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all [color-scheme:dark]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="bg-white/5 border border-zinc-800/50 rounded-[2rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">Despesa Recorrente</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Repetir automaticamente</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" name="is_recurring" className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E676] peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-zinc-500 italic leading-snug">Ao ativar, esta despesa será replicada nos meses seguintes. Ideal para aluguel, internet, salários e contas fixas.</p>
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
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-[#141414] border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden pb-6 sm:pb-0"
            >
              <div className="p-6 sm:p-8 border-b border-zinc-900 text-center">
                <h2 className="text-xl font-bold text-white mb-1">Registrar Pagamento</h2>
                <p className="text-sm text-emerald-500 font-bold">OS {selectedReceivable.osNumber}</p>
              </div>

              <form onSubmit={handleRegisterPayment} className="p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-zinc-500 font-bold uppercase">Restante</span>
                    <span className="text-base sm:text-xl font-black text-[#00E676]">R$ {selectedReceivable.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="paymentAmount" 
                    required 
                    defaultValue={selectedReceivable.remainingAmount.toFixed(2)}
                    className="w-full bg-black/40 border border-zinc-800 rounded-2xl px-4 py-4 text-center text-2xl sm:text-3xl font-bold text-white focus:outline-none focus:border-[#00E676] transition-all"
                  />
                  <p className="text-[10px] text-zinc-600 text-center mt-3 uppercase tracking-widest">Digite o valor recebido agora</p>
                </div>

                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border border-transparent active:border-[#00E676]/30">
                  <input type="checkbox" name="markAsPaid" className="w-5 h-5 accent-[#00E676]" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Concluir OS</p>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">Isso encerra o financeiro</p>
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

      {/* Income Modal */}
      <AnimatePresence>
        {isIncomeModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-[#141414] border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden pb-6 sm:pb-0"
            >
              <div className="p-6 sm:p-8 border-b border-zinc-900 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Nova Receita</h2>
                  <p className="text-sm text-zinc-500 text-ellipsis overflow-hidden">Registre uma receita futura</p>
                </div>
                <button onClick={() => setIsIncomeModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddIncome} className="p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Descrição</label>
                  <input name="description" required className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all" placeholder="Ex: Venda de carcaça" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Valor Estimado (R$)</label>
                    <input type="number" step="0.01" name="amount" required className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all" placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Data de Previsão</label>
                    <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676]/30 transition-all [color-scheme:dark]" />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setIsIncomeModalOpen(false)} className="flex-1 px-4 py-3 border border-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-800 transition-colors font-bold uppercase tracking-widest text-[10px]">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-[#00E676] text-black rounded-xl hover:bg-[#00C853] transition-colors font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-[#00E676]/20">Salvar Receita</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

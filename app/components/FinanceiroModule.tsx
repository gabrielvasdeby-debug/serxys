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
  ArrowLeft,
  Hash,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [receivablesSearch, setReceivablesSearch] = useState('');

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
  }, [orders, customers]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Use props orders instead of fetching
      const processedReceivables = (orders || [])
        .filter(order => {
          const fin = order.financials || {};
          const total = fin.totalValue || (fin as any).total || 0;
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
        .select('*')
        .eq('company_id', profile.company_id)
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
        .select('*')
        .eq('company_id', profile.company_id)
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
        .select('*')
        .eq('company_id', profile.company_id)
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
    const now = new Date();
    let start: Date, end: Date;
    switch (period) {
      case 'today': start = startOfDay(now); end = endOfDay(now); break;
      case 'week': start = startOfWeek(now); end = endOfWeek(now); break;
      case 'month': start = startOfMonth(now); end = endOfMonth(now); break;
      case 'year': start = startOfYear(now); end = endOfYear(now); break;
      default: start = startOfMonth(now); end = endOfMonth(now); break;
    }

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
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
    }

    const periodExpenses = expenses.filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start, end });
    });

    const periodTransactions = transactions.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start, end });
    });

    const paidExpensesTotal = periodExpenses.filter(e => e.status !== 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
    const pendingExpensesTotal = periodExpenses.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);

    const transactionsEntryTotal = periodTransactions.filter(t => t.type === 'entrada').reduce((acc, curr) => acc + curr.value, 0);
    const transactionsExitTotal = periodTransactions.filter(t => t.type === 'saida').reduce((acc, curr) => acc + curr.value, 0);

    // Total Revenue is Entries from Transactions (Sales/OS Payments)
    const totalRevenue = transactionsEntryTotal;
    // Total Expense is Exits from Transactions + Paid Expenses from bills
    const totalGasto = transactionsExitTotal + paidExpensesTotal;

    const pendingReceivablesTotal = receivables.reduce((acc, curr) => acc + curr.remainingAmount, 0);

    return { 
      revenue: totalRevenue, 
      expenses: totalGasto, 
      pendingExpenses: pendingExpensesTotal, 
      pendingReceivables: pendingReceivablesTotal,
      profit: totalRevenue - totalGasto,
      transactionSubtotal: {
        entries: transactionsEntryTotal,
        exits: transactionsExitTotal,
        billExits: paidExpensesTotal
      }
    };
  };
  const stats = getFilteredTotals();

  const chartData = useMemo(() => {
    // 1. Pie Data: Revenue vs Expense
    const pieData = [
      { name: 'Entradas', value: stats.revenue, color: '#00E676' },
      { name: 'Saídas', value: stats.expenses, color: '#f87171' }
    ].filter(d => d.value > 0);

    // 2. Area Data: Daily evolution of Revenue
    const now = new Date();
    let start: Date, end: Date;
    switch (period) {
      case 'today': start = startOfDay(now); end = endOfDay(now); break;
      case 'week': start = startOfWeek(now); end = endOfWeek(now); break;
      case 'month': start = startOfMonth(now); end = endOfMonth(now); break;
      case 'year': start = startOfYear(now); end = endOfYear(now); break;
      default: start = startOfMonth(now); end = endOfMonth(now); break;
    }

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
  }, [stats, transactions, expenses, period]);

  const expenseTotals = useMemo(() => {
    const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const paid = expenses.filter(e => e.status !== 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
    const pending = expenses.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
    return { total, paid, pending };
  }, [expenses]);


  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Header Glassmorphism */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-zinc-900 p-4 sm:p-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={onBack} className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
              <ArrowLeft size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Financeiro</h1>
              <p className="text-[10px] sm:text-sm text-zinc-500 font-medium truncate">Saúde financeira do negócio</p>
            </div>
          </div>
          
          <div className="flex flex-wrap bg-[#121212] p-1 rounded-2xl border border-zinc-800/50">
            <div className="flex shrink-0 gap-1">
              <button 
                onClick={() => setActiveTab('EXTRATO')} 
                className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all uppercase tracking-widest whitespace-nowrap ${activeTab === 'EXTRATO' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                Fluxo de Caixa
              </button>
              <button 
                onClick={() => setActiveTab('RECEBER')} 
                className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all uppercase tracking-widest whitespace-nowrap ${activeTab === 'RECEBER' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                Receber
              </button>
              <button 
                onClick={() => setActiveTab('PAGAR')} 
                className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all uppercase tracking-widest whitespace-nowrap ${activeTab === 'PAGAR' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                Pagar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
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
              {/* Period Filters */}
              <div className="flex flex-wrap items-center gap-2 pb-4">
                {(['today', 'week', 'month', 'year', 'custom'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-5 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                      period === p 
                        ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]' 
                        : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'
                    }`}
                  >
                    {p === 'today' ? 'Hoje' : p === 'week' ? 'Esta Semana' : p === 'month' ? 'Este Mês' : p === 'year' ? 'Este Ano' : 'Personalizado'}
                  </button>
                ))}
              </div>

              {/* Stat Cards from Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="glass-panel p-6 rounded-[32px] border border-white/5 hover:border-emerald-500/20 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded-lg">Entradas</span>
                  </div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Recebido</h3>
                  <p className="text-xl font-bold text-white tracking-tight">R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="glass-panel p-6 rounded-[32px] border border-white/5 hover:border-red-500/20 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                      <TrendingDown size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest bg-red-500/5 px-2 py-1 rounded-lg">Saídas</span>
                  </div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Pago</h3>
                  <p className="text-xl font-bold text-white tracking-tight">R$ {stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="glass-panel p-6 rounded-[32px] border border-white/5 hover:border-amber-500/20 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                      <History size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/5 px-2 py-1 rounded-lg">Pendência</span>
                  </div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">A Pagar</h3>
                  <p className="text-xl font-bold text-white tracking-tight">R$ {stats.pendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="glass-panel p-6 rounded-[32px] border border-white/5 hover:border-blue-500/20 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                      <ArrowUpRight size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/5 px-2 py-1 rounded-lg">Futuras</span>
                  </div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">A Receber</h3>
                  <p className="text-xl font-bold text-white tracking-tight">R$ {((stats as any).pendingReceivables || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-[#00E676]/5 p-6 rounded-[32px] border border-[#00E676]/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#00E676]/10 blur-3xl -mr-12 -mt-12 rounded-full group-hover:bg-[#00E676]/20 transition-all" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-[#00E676]/20 text-[#00E676] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.2)]">
                        <DollarSign size={20} />
                      </div>
                      <span className="text-[9px] font-bold text-[#00E676] uppercase tracking-widest bg-[#00E676]/10 px-2 py-1 rounded-lg">Saldo</span>
                    </div>
                    <h3 className="text-[#00E676]/70 text-[10px] font-bold uppercase tracking-widest mb-1">Lucro Líquido</h3>
                    <p className={`text-xl font-black tracking-tight ${stats.profit >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                      R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

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

              <div className="glass-panel overflow-hidden border-white/5 rounded-[32px]">
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
                      const now = new Date();
                      let start: Date, end: Date;
                      switch (period) {
                        case 'today': start = startOfDay(now); end = endOfDay(now); break;
                        case 'week': start = startOfWeek(now); end = endOfWeek(now); break;
                        case 'month': start = startOfMonth(now); end = endOfMonth(now); break;
                        case 'year': start = startOfYear(now); end = endOfYear(now); break;
                        default: start = startOfMonth(now); end = endOfMonth(now); break;
                      }

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
                        <tr key={m.id} className="hover:bg-white/5 transition-colors group">
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
                <div className="md:hidden divide-y divide-zinc-900">
                  {(() => {
                    const now = new Date();
                    let start: Date, end: Date;
                    switch (period) {
                      case 'today': start = startOfDay(now); end = endOfDay(now); break;
                      case 'week': start = startOfWeek(now); end = endOfWeek(now); break;
                      case 'month': start = startOfMonth(now); end = endOfMonth(now); break;
                      case 'year': start = startOfYear(now); end = endOfYear(now); break;
                      default: start = startOfMonth(now); end = endOfMonth(now); break;
                    }

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
                    .sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')).getTime() - new Date(a.date + 'T' + (a.time || '00:00')).getTime());

                    if (list.length === 0) {
                      return <div className="p-12 text-center text-zinc-500 text-sm">Nenhuma movimentação encontrada.</div>;
                    }

                    return list.map((m: any) => (
                      <div key={m.id} className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-bold">{format(parseISO(m.date), 'dd/MM/yyyy')}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${m.type === 'entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {m.type === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-tight capitalize">{m.description}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-medium">{m.paymentMethod} {m.source === 'caixa' && '• Caixa'}</p>
                        </div>
                        <div className={`text-lg font-black text-right ${m.type === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.type === 'entrada' ? '+' : '-'} R$ {m.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  <p className="text-xl font-black text-white">R$ {receivables.reduce((acc, r) => acc + r.totalAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#141414] border border-zinc-800/50 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Recebido</p>
                  <p className="text-xl font-black text-emerald-500">R$ {receivables.reduce((acc, r) => acc + r.paidAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#141414] border border-zinc-800/50 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Pendente</p>
                  <p className="text-xl font-black text-amber-500">R$ {receivables.reduce((acc, r) => acc + r.remainingAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="glass-panel overflow-hidden border-white/5 rounded-[32px]">
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
                        <tr key={r.id} className="hover:bg-white/5 transition-colors group">
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
                <div className="md:hidden divide-y divide-zinc-900">
                  {(() => {
                    const filtered = receivables.filter(r => {
                      const search = receivablesSearch.toLowerCase();
                      return r.customerName.toLowerCase().includes(search) || 
                             r.osNumber.toString().includes(search);
                    });

                    if (filtered.length === 0) {
                      return <div className="p-12 text-center text-zinc-500 text-sm">Nenhum recebimento encontrado.</div>;
                    }

                    return filtered.map(r => (
                      <div key={r.id} className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-bold">{format(parseISO(r.dueDate), 'dd/MM/yyyy')}</span>
                          {r.osNumber > 0 ? (
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter">OS {String(r.osNumber).padStart(4, '0')}</span>
                          ) : (
                            <span className="text-[9px] font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase tracking-tighter">Manual</span>
                          )}
                        </div>
                        
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white line-clamp-1">{r.customerName}</p>
                            <div className="mt-2" onClick={() => handleToggleReceivableStatus(r)}>
                              <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${r.remainingAmount > 0 ? 'text-amber-500' : 'text-[#00E676]'}`}>
                                {r.remainingAmount > 0 ? '● Pendente' : '● Recebido'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-base font-black ${r.remainingAmount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              R$ {r.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {r.paidAmount > 0 && r.remainingAmount > 0 && (
                               <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Total R$ {r.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => { setSelectedReceivable(r); setIsPaymentModalOpen(true); }}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-[#00E676] text-zinc-400 hover:text-black rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest border border-zinc-700/50"
                        >
                          <CreditCard size={14} /> Registrar Pagamento
                        </button>
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
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ArrowDownRight className="text-red-500" /> <span className="hidden sm:inline">Contas a Pagar</span><span className="sm:hidden text-lg">A Pagar</span>
                </h2>
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

              <div className="glass-panel overflow-hidden border-white/5 rounded-[32px]">
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-left">
                  <thead className="bg-white/5 text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Data</th>
                      <th className="px-8 py-4">Descrição</th>
                      <th className="px-8 py-4">Categoria</th>
                      <th className="px-8 py-4">Fornecedor</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {(() => {
                      const sortedExpenses = [...expenses].sort((a, b) => {
                        // Priority 1: Status (PENDING first)
                        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                        
                        // Priority 2: Date
                        // If PENDING: Ascending (older due first)
                        // If PAID: Descending (recent first)
                        const dateA = new Date(a.date).getTime();
                        const dateB = new Date(b.date).getTime();
                        
                        if (a.status === 'PENDING') {
                          return dateA - dateB;
                        } else {
                          return dateB - dateA;
                        }
                      });

                      if (sortedExpenses.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center text-zinc-500">Nenhuma despesa cadastrada.</td>
                          </tr>
                        );
                      }

                      return sortedExpenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-8 py-5 text-sm font-medium text-zinc-400">{format(parseISO(exp.date), 'dd/MM/yyyy')}</td>
                          <td className="px-8 py-5 text-sm font-bold text-white">{exp.description}</td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded text-zinc-400">{exp.category}</span>
                          </td>
                           <td className="px-8 py-5 text-sm text-zinc-400">
                            <div className="flex items-center gap-2">
                              {exp.supplier || '-'}
                              {exp.is_recurring && (
                                <div className="p-1 bg-[#00E676]/10 text-[#00E676] rounded-md" title="Despesa Recorrente">
                                  <History size={12} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5">
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
                          <td className={`px-8 py-5 text-sm font-bold text-right ${exp.status === 'PENDING' ? 'text-amber-500' : 'text-red-400'}`}>
                            R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>

                {/* Mobile Card View for Expenses */}
                <div className="md:hidden divide-y divide-zinc-900">
                  {(() => {
                    const sortedExpenses = [...expenses].sort((a, b) => {
                      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                      const dateA = new Date(a.date).getTime();
                      const dateB = new Date(b.date).getTime();
                      return a.status === 'PENDING' ? dateA - dateB : dateB - dateA;
                    });

                    if (sortedExpenses.length === 0) {
                      return <div className="p-12 text-center text-zinc-500 text-sm">Nenhuma despesa para exibir.</div>;
                    }

                    return sortedExpenses.map(exp => (
                      <div key={exp.id} className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-bold">{format(parseISO(exp.date), 'dd/MM/yyyy')}</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{exp.category}</span>
                        </div>
                        
                        <div>
                          <p className="text-sm font-bold text-white line-clamp-1">{exp.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                             <div 
                                onClick={() => handleToggleExpensePaid(exp)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${exp.status === 'PENDING' ? 'text-amber-500' : 'text-[#00E676]'}`}>
                                  {exp.status === 'PENDING' ? '● Pendente' : '● Pago'}
                                </span>
                              </div>
                              {exp.supplier && <span className="text-[9px] text-zinc-600 uppercase tracking-widest italic">• {exp.supplier}</span>}
                          </div>
                        </div>

                        <div className={`text-lg font-black text-right ${exp.status === 'PENDING' ? 'text-amber-500' : 'text-red-400'}`}>
                          R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ));
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden"
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
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

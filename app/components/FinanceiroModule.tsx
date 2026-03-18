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
  MoreVertical,
  Trash2,
  Edit2,
  X,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Receivable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'Pendente' | 'Recebido';
  customerName?: string;
  osNumber?: string;
  receivedAt?: string;
  createdAt: string;
}

interface FinanceiroModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
    [key: string]: unknown;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export default function FinanceiroModule({ profile, onBack, onShowToast }: FinanceiroModuleProps) {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'receivables'), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReceivables(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receivable)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalPending = receivables
    .filter(r => r.status === 'Pendente')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalReceived = receivables
    .filter(r => r.status === 'Recebido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleAddReceivable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string),
      dueDate: formData.get('dueDate') as string,
      status: 'Pendente',
      customerName: formData.get('customerName') as string,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'receivables'), data);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error adding receivable:', err);
    }
  };

  const handleMarkAsReceived = async (id: string) => {
    try {
      await updateDoc(doc(db, 'receivables', id), {
        status: 'Recebido',
        receivedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating receivable:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">Gestão de contas a receber e fluxo de caixa</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm"
        >
          <Plus size={20} />
          Novo Lançamento
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pendente</span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total a Receber</p>
          <p className="text-2xl font-bold text-slate-900">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle2 size={24} />
            </div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Recebido</span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total Recebido</p>
          <p className="text-2xl font-bold text-slate-900">R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-slate-800 text-slate-400 rounded-lg">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo</span>
          </div>
          <p className="text-sm text-slate-400 mb-1">Saldo Projetado</p>
          <p className="text-2xl font-bold">R$ {(totalPending + totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Contas a Receber</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-9 pr-4 py-1.5 text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-bold">Vencimento</th>
                <th className="px-6 py-3 font-bold">Descrição</th>
                <th className="px-6 py-3 font-bold">Cliente</th>
                <th className="px-6 py-3 font-bold text-right">Valor</th>
                <th className="px-6 py-3 font-bold text-center">Status</th>
                <th className="px-6 py-3 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receivables.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(parseISO(item.dueDate), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.description}</p>
                    {item.osNumber && <span className="text-[10px] text-emerald-600 font-bold">OS: {item.osNumber}</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.customerName || '-'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                    R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                      item.status === 'Recebido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status === 'Pendente' && (
                      <button 
                        onClick={() => handleMarkAsReceived(item.id)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold text-xs"
                      >
                        Receber
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Novo Recebimento</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddReceivable} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <input 
                    name="description" 
                    required 
                    className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ex: Mensalidade de Manutenção"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente (Opcional)</label>
                  <input 
                    name="customerName" 
                    className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Nome do cliente"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="amount" 
                      required 
                      className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
                    <input 
                      type="date" 
                      name="dueDate" 
                      required 
                      className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

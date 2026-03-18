'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/app/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Order, OrderStatus } from '@/app/components/OrdemServicoModule';
import { 
  Smartphone, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Package, 
  Wrench, 
  ShieldCheck, 
  Inbox, 
  FileText, 
  Search,
  LogOut,
  History
} from 'lucide-react';
import { motion } from 'motion/react';

const STATUS_CONFIG: Record<OrderStatus, { icon: React.ElementType, color: string, bg: string, label: string }> = {
  'Entrada Registrada': { icon: Inbox, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Entrada Registrada' },
  'Orçamento em Elaboração': { icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Orçamento em Elaboração' },
  'Em Análise Técnica': { icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Em Análise Técnica' },
  'Aguardando Aprovação': { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Aguardando Aprovação' },
  'Aguardando Peça': { icon: Package, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Aguardando Peça' },
  'Em Manutenção': { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Em Manutenção' },
  'Reparo Concluído': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Reparo Concluído' },
  'Equipamento Retirado': { icon: LogOut, color: 'text-zinc-400', bg: 'bg-zinc-400/10', label: 'Equipamento Retirado' },
  'Orçamento Cancelado': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Orçamento Cancelado' },
  'Sem Reparo': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Sem Reparo' },
  'Garantia': { icon: ShieldCheck, color: 'text-teal-400', bg: 'bg-teal-400/10', label: 'Garantia' }
};

const STATUS_STEPS: OrderStatus[] = [
  'Entrada Registrada',
  'Em Análise Técnica',
  'Aguardando Aprovação',
  'Em Manutenção',
  'Reparo Concluído',
  'Equipamento Retirado'
];

export default function TrackingPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        setError(null);
      } else {
        setError('Ordem de Serviço não encontrada.');
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching order:', err);
      setError('Erro ao carregar informações. Por favor, tente novamente mais tarde.');
      setLoading(false);
    });

    return () => unsub();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00E676] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 animate-pulse">Carregando informações da OS...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141414] border border-zinc-800 rounded-3xl p-8 text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado</h1>
          <p className="text-zinc-400 mb-6">{error || 'Não foi possível encontrar esta Ordem de Serviço.'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-[#00E676] text-black font-bold py-3 rounded-xl hover:bg-[#00C853] transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[order.status];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center border border-zinc-800">
              <div className="w-5 h-5 border-2 border-[#00E676] rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-[#00E676] rounded-sm"></div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SERVYX <span className="text-[#00E676]">OS</span></h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Acompanhamento de Reparo</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-medium">OS Número</p>
            <p className="text-lg font-mono font-bold text-[#00E676]">#{order.osNumber.toString().padStart(4, '0')}</p>
          </div>
        </div>

        {/* Main Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
        >
          <div className={`absolute top-0 right-0 w-32 h-32 ${currentStatusConfig.bg} opacity-20 blur-3xl -mr-16 -mt-16 rounded-full`}></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl ${currentStatusConfig.bg} flex items-center justify-center ${currentStatusConfig.color}`}>
                <StatusIcon size={32} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Status Atual</p>
                <h2 className={`text-2xl font-bold ${currentStatusConfig.color}`}>{order.status}</h2>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Última Atualização</p>
              <p className="text-sm font-medium">{new Date(order.updatedAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* Visual Progress Steps */}
          <div className="mt-12 relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-zinc-800"></div>
            <div className="flex justify-between relative z-10">
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = STATUS_STEPS.indexOf(order.status) >= idx || 
                                   (order.status === 'Reparo Concluído' && idx <= 4) ||
                                   (order.status === 'Equipamento Retirado' && idx <= 5);
                const isCurrent = order.status === step;
                
                return (
                  <div key={step} className="flex flex-col items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isCompleted ? 'bg-[#00E676] text-black shadow-[0_0_15px_rgba(0,230,118,0.3)]' : 'bg-zinc-800 text-zinc-600'
                    } ${isCurrent ? 'ring-4 ring-[#00E676]/20' : ''}`}>
                      {isCompleted ? <Check size={20} strokeWidth={3} /> : <div className="w-2 h-2 bg-current rounded-full"></div>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter text-center max-w-[60px] ${
                      isCompleted ? 'text-white' : 'text-zinc-600'
                    }`}>
                      {step.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equipment Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#141414] border border-zinc-800 rounded-3xl p-6"
          >
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Smartphone size={16} className="text-[#00E676]" />
              Equipamento
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Aparelho</p>
                <p className="text-lg font-semibold">{order.equipment.brand} {order.equipment.model}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cor</p>
                  <p className="text-sm">{order.equipment.color || 'Não informada'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Serial/IMEI</p>
                  <p className="text-sm font-mono">{order.equipment.serial || '---'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Service Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#141414] border border-zinc-800 rounded-3xl p-6"
          >
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Wrench size={16} className="text-[#00E676]" />
              Serviço
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Defeito Relatado</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{order.defect}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Data de Entrada</p>
                <p className="text-sm">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* History */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#141414] border border-zinc-800 rounded-3xl p-6"
        >
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <History size={16} className="text-[#00E676]" />
            Histórico de Atualizações
          </h3>
          <div className="space-y-6">
            {order.history.slice().reverse().map((event, idx) => (
              <div key={idx} className="flex gap-4 relative">
                {idx !== order.history.length - 1 && (
                  <div className="absolute left-[7px] top-4 bottom-[-24px] w-0.5 bg-zinc-800"></div>
                )}
                <div className="w-4 h-4 rounded-full bg-zinc-800 border-2 border-zinc-700 mt-1 relative z-10"></div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-1">
                    {new Date(event.date).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-zinc-200">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer Info */}
        <div className="text-center pt-8 pb-12">
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">SERVYX OS • Gestão Inteligente</p>
          <p className="text-zinc-500 text-xs">Em caso de dúvidas, entre em contato com a assistência.</p>
        </div>
      </div>
    </div>
  );
}

function Check({ size, strokeWidth }: { size: number, strokeWidth: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

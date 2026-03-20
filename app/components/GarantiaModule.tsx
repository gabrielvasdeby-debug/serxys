import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Search, ShieldCheck, ShieldAlert, Filter, 
  Calendar, User, Smartphone, FileText, CheckCircle2, XCircle, 
  Eye, Printer, MessageCircle, Clock, Save, ChevronDown
} from 'lucide-react';
import { supabase } from '../supabase';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Warranty {
  id: string;
  os_id: string;
  os_number: string;
  client_name: string;
  equipment: string;
  service_performed: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  notes: string;
  status: 'Ativa' | 'Expirada';
  created_at: string;
}

interface GarantiaModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export default function GarantiaModule({ profile, onBack, onShowToast }: GarantiaModuleProps) {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'ATIVA' | 'EXPIRADA'>('TODAS');
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .order('end_date', { ascending: false });

      if (error) throw error;

      if (data) {
        const now = new Date();
        const updatedWarranties = data.map(w => {
          const isExpired = isBefore(parseISO(w.end_date), now);
          return {
            ...w,
            status: isExpired ? 'Expirada' : 'Ativa'
          };
        });
        setWarranties(updatedWarranties);
      }
    } catch (error: any) {
      console.error('Error fetching warranties:', error);
      onShowToast('Erro ao carregar garantias');
    } finally {
      setLoading(false);
    }
  };

  const filteredWarranties = useMemo(() => {
    return warranties.filter(w => {
      const matchesSearch = 
        w.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.os_number.toString().includes(searchQuery) ||
        w.equipment.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'TODAS' || 
        (statusFilter === 'ATIVA' && w.status === 'Ativa') ||
        (statusFilter === 'EXPIRADA' && w.status === 'Expirada');

      return matchesSearch && matchesStatus;
    });
  }, [warranties, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      active: warranties.filter(w => w.status === 'Ativa').length,
      expired: warranties.filter(w => w.status === 'Expirada').length,
      total: warranties.length
    };
  }, [warranties]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#141414]/80 backdrop-blur-md border-b border-zinc-800 p-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="text-[#00E676]" size={24} />
                Controle de Garantias
              </h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Gestão pós-venda SERVYX</p>
            </div>
          </div>

          <div className="flex flex-1 max-w-2xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por OS ou nome do cliente..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all"
              />
            </div>
            <div className="relative group">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 pr-10 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-[#00E676] transition-all cursor-pointer"
              >
                <option value="TODAS">Todos Status</option>
                <option value="ATIVA">Ativas</option>
                <option value="EXPIRADA">Expiradas</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#141414] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-[#00E676]/10 text-[#00E676] rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Garantias Ativas</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#141414] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Expiradas</p>
              <p className="text-2xl font-bold">{stats.expired}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#141414] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Registrado</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </motion.div>
        </div>

        {/* Warranties List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em]">Listagem Detalhada</h2>
            <p className="text-xs text-zinc-500">{filteredWarranties.length} resultados encontrados</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode='popLayout'>
              {filteredWarranties.map((warranty, index) => (
                <motion.div
                  key={warranty.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => setSelectedWarranty(warranty)}
                  className="bg-[#141414] border border-zinc-800 hover:border-[#00E676]/50 rounded-2xl p-5 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.98]"
                >
                  <div className={`absolute top-0 right-0 w-1 h-full ${warranty.status === 'Ativa' ? 'bg-[#00E676]' : 'bg-red-500'}`} />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OS #{warranty.os_number}</span>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#00E676] transition-colors truncate max-w-[180px]">
                        {warranty.client_name}
                      </h3>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter ${
                      warranty.status === 'Ativa' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {warranty.status}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Smartphone size={14} className="text-zinc-600" />
                      <span className="truncate">{warranty.equipment}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Wrench size={14} className="text-zinc-600" />
                      <span className="truncate">{warranty.service_performed}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Clock size={14} className="text-zinc-600" />
                      <span>Expira em: <strong className="text-zinc-200">{format(parseISO(warranty.end_date), 'dd/MM/yyyy')}</strong></span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                      <Calendar size={12} />
                      Gerada em {format(parseISO(warranty.created_at), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-[#00E676] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={18} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredWarranties.length === 0 && !loading && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center bg-[#141414] border border-zinc-800 border-dashed rounded-3xl">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-lg font-medium text-white">Nenhuma garantia encontrada</h3>
                <p className="text-zinc-500 text-sm">Tente mudar os filtros ou o termo de busca</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedWarranty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${selectedWarranty.status === 'Ativa' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-red-500/10 text-red-500'}`}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Garantia OS #{selectedWarranty.os_number}</h2>
                    <p className={`text-xs font-bold uppercase tracking-widest ${selectedWarranty.status === 'Ativa' ? 'text-[#00E676]' : 'text-red-500'}`}>
                      {selectedWarranty.status === 'Ativa' ? 'Status: Válida' : 'Status: Finalizada'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWarranty(null)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto max-h-[70vh] space-y-8">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cliente</p>
                    <p className="text-white font-medium flex items-center gap-2">
                       <User size={14} className="text-zinc-600" />
                       {selectedWarranty.client_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Aparelho</p>
                    <p className="text-white font-medium flex items-center gap-2">
                       <Smartphone size={14} className="text-zinc-600" />
                       {selectedWarranty.equipment}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Serviço Realizado</p>
                    <p className="text-white font-medium flex items-center gap-2">
                       <FileText size={14} className="text-zinc-600" />
                       {selectedWarranty.service_performed}
                    </p>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6 grid grid-cols-2 gap-4 text-center">
                  <div className="space-y-1 border-r border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Início</p>
                    <p className="text-white text-lg font-bold">{format(parseISO(selectedWarranty.start_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Expiração</p>
                    <p className={`text-lg font-bold ${selectedWarranty.status === 'Ativa' ? 'text-[#00E676]' : 'text-red-500'}`}>
                      {format(parseISO(selectedWarranty.end_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 text-[10px] text-zinc-500">
                    Duração contratual: {selectedWarranty.duration_days} dias
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Observações Adicionais</p>
                  <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-5 text-sm text-zinc-300 leading-relaxed italic">
                    {selectedWarranty.notes || 'Nenhuma observação registrada para esta garantia.'}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-[#0A0A0A] flex flex-wrap gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 min-w-[140px] py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Printer size={18} />
                  Imprimir Comprovante
                </button>
                <button 
                  className="flex-1 min-w-[140px] py-3.5 bg-[#00E676] hover:bg-[#00C853] text-black rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00E676]/20 active:scale-95"
                >
                  <MessageCircle size={18} />
                  Enviar via WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .fixed { display: none !important; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function Wrench({ size, className }: { size: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

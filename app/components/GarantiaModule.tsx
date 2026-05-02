import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, ShieldCheck, ShieldAlert, Filter, 
  Calendar, User, Smartphone, FileText, CheckCircle2, XCircle, 
  Eye, Printer, MessageCircle, Clock, Save, ChevronDown, Wrench, X
} from 'lucide-react';
import { supabase } from '../supabase';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WarrantyPrintTemplate from './WarrantyPrintTemplate';
import WarrantyThermalTemplate from './WarrantyThermalTemplate';

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
    type?: string;
    [key: string]: unknown;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
  companySettings: any;
  osSettings?: any;
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
}

export default function GarantiaModule({ profile, onBack, onShowToast, companySettings, osSettings, onLogActivity }: GarantiaModuleProps) {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'ATIVA' | 'EXPIRADA'>('TODAS');
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Warranty>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [relatedOrder, setRelatedOrder] = useState<any>(null);

  const selectedWarrantyData = useMemo(() => {
    if (!selectedWarranty) return null;

    const order = {
      id: selectedWarranty.id,
      companyId: companySettings.id,
      osNumber: parseInt(selectedWarranty.os_number) || 0,
      customerId: relatedOrder?.customerId || '',
      signatures: relatedOrder?.signatures || { client: null, technician: null },
      equipment: {
        brand: relatedOrder?.equipment?.brand || selectedWarranty.equipment.split(' ')[0] || '',
        model: relatedOrder?.equipment?.model || selectedWarranty.equipment.split(' ').slice(1).join(' ') || '',
        type: relatedOrder?.equipment?.type || 'Equipamento',
        serial: relatedOrder?.equipment?.serial || '',
        color: relatedOrder?.equipment?.color || '',
        passwordType: relatedOrder?.equipment?.passwordType || 'none',
        passwordValue: relatedOrder?.equipment?.passwordValue || ''
      },
      defect: relatedOrder?.defect || '',
      service: selectedWarranty.service_performed,
      checklist: relatedOrder?.checklist || {},
      checklistNotes: relatedOrder?.checklistNotes || '',
      technicianNotes: selectedWarranty.notes || '',
      financials: relatedOrder?.financials || {
         totalValue: 0,
         paymentType: 'Outro',
         paymentStatus: 'Total',
         amountPaid: 0
      },
      status: relatedOrder?.status || 'Equipamento Retirado',
      priority: relatedOrder?.priority || 'Média',
      history: relatedOrder?.history || [],
      completionData: {
         servicesPerformed: selectedWarranty.service_performed,
         exitChecklist: relatedOrder?.completion_data?.exitChecklist || {},
         supplier: relatedOrder?.completion_data?.supplier || '',
         partsUsed: relatedOrder?.completion_data?.partsUsed || '',
         warrantyDays: selectedWarranty.duration_days || 90,
         signatures: relatedOrder?.completion_data?.signatures || null,
         technicianObservations: selectedWarranty.notes || relatedOrder?.completion_data?.technicianObservations || ''
      },
      createdAt: selectedWarranty.created_at || new Date().toISOString(),
      updatedAt: selectedWarranty.start_date || new Date().toISOString()
    };

    const customer = {
      id: '',
      name: selectedWarranty.client_name,
      phone: '',
      email: '',
      document: '',
      address: '',
      createdAt: ''
    };

    return { order, customer };
  }, [selectedWarranty, companySettings, relatedOrder]);

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('company_id', profile.company_id)
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

  useEffect(() => {
    if (selectedWarranty?.os_id) {
      fetchRelatedOrder(selectedWarranty.os_id);
    } else {
      setRelatedOrder(null);
    }
  }, [selectedWarranty]);

  const fetchRelatedOrder = async (osId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', osId)
        .single();
      
      if (data) {
        setRelatedOrder(data);
      }
    } catch (err) {
      console.error('Error fetching related order:', err);
    }
  };

  const handleUpdateWarranty = async () => {
    if (!selectedWarranty || !editForm.id) return;
    setIsSaving(true);
    
    try {
      const now = new Date();
      const newEndDate = addDays(parseISO(editForm.start_date || selectedWarranty.start_date), editForm.duration_days || selectedWarranty.duration_days);
      const formattedEndDate = format(newEndDate, 'yyyy-MM-dd');
      const isExpired = isBefore(newEndDate, now);

      const updates = {
        client_name: editForm.client_name,
        equipment: editForm.equipment,
        service_performed: editForm.service_performed,
        start_date: editForm.start_date,
        end_date: formattedEndDate,
        duration_days: editForm.duration_days,
        notes: editForm.notes,
        status: isExpired ? 'Expirada' : 'Ativa',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('warranties')
        .update(updates)
        .eq('id', editForm.id)
        .eq('company_id', profile.company_id);

      if (error) throw error;
      
      onLogActivity?.('GARANTIA', 'EDITOU GARANTIA', {
        warrantyId: editForm.id,
        osNumber: selectedWarranty.os_number,
        clientName: editForm.client_name,
        startDate: editForm.start_date,
        endDate: formattedEndDate,
        description: `Atualizou os termos de garantia da OS #${selectedWarranty.os_number} para ${editForm.client_name}`
      });

      onShowToast('Garantia atualizada com sucesso!');
      setIsEditing(false);
      fetchWarranties();
      
      // Update selected warranty with current data
      setSelectedWarranty(prev => prev ? { ...prev, ...updates } as Warranty : null);
    } catch (err: any) {
      console.error('Update error:', err);
      onShowToast('Erro ao atualizar garantia');
    } finally {
      setIsSaving(false);
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
      <header className="bg-[#141414]/90 backdrop-blur-xl border-b border-zinc-800/80 p-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className="p-2.5 hover:bg-zinc-800 rounded-md transition-all text-zinc-400 active:scale-90"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  <ShieldCheck className="text-[#00E676]" size={22} />
                  Garantias
                </h1>
                <p className="hidden sm:block text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Gestão pós-venda SERVYX</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
               <div className="hidden sm:flex bg-zinc-900/50 border border-zinc-800 rounded-sm px-3 py-1.5 items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{stats.active} Ativas</span>
               </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00E676] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por OS ou cliente..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-md pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full appearance-none bg-[#0A0A0A] border border-zinc-800 rounded-md px-5 pr-12 py-3 text-sm font-bold text-zinc-300 focus:outline-none focus:border-[#00E676] transition-all cursor-pointer outline-none"
                >
                  <option value="TODAS">Todos</option>
                  <option value="ATIVA">Ativas</option>
                  <option value="EXPIRADA">Expiradas</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#141414] border border-zinc-800 rounded-md p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4"
          >
            <div className="w-10 h-10 bg-[#00E676]/10 text-[#00E676] rounded-sm flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Ativas</p>
              <p className="text-xl font-black text-white leading-none">{stats.active}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#141414] border border-zinc-800 rounded-md p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4"
          >
            <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-sm flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Expiradas</p>
              <p className="text-xl font-black text-white leading-none">{stats.expired}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden sm:flex bg-[#141414] border border-zinc-800 rounded-md p-4 items-center sm:items-start gap-2 sm:gap-4"
          >
            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-sm flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Total</p>
              <p className="text-xl font-black text-white leading-none">{stats.total}</p>
            </div>
          </motion.div>
        </div>

        {/* Warranties List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em]">Listagem Detalhada</h2>
            <p className="text-xs text-zinc-500">{filteredWarranties.length} resultados</p>
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
                  onClick={() => {
                    setSelectedWarranty(warranty);
                    setIsEditing(false);
                    setEditForm(warranty);
                  }}
                  className="bg-[#141414] border border-zinc-800 hover:border-[#00E676]/50 rounded-md p-5 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.98]"
                >
                  <div className={`absolute top-0 right-0 w-1 h-full ${warranty.status === 'Ativa' ? 'bg-[#00E676]' : 'bg-red-500'}`} />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OS {warranty.os_number}</span>
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

                  <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center text-[#00E676] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black uppercase tracking-widest">Ver Detalhes</span>
                    <Eye size={18} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredWarranties.length === 0 && !loading && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center bg-[#141414] border border-zinc-800 border-dashed rounded-md">
                <ShieldAlert size={32} className="text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium text-white">Nenhum registro</h3>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Detail Modal Slim & Premium */}
      <AnimatePresence>
        {selectedWarranty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="bg-[#141414] border border-zinc-800 rounded-[32px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
            >
              <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-sm ${selectedWarranty.status === 'Ativa' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-red-500/10 text-red-500'}`}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight leading-none">OS {selectedWarranty.os_number}</h2>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${selectedWarranty.status === 'Ativa' ? 'text-[#00E676]' : 'text-red-500'}`}>
                      {selectedWarranty.status === 'Ativa' ? 'Garantia Ativa' : 'Garantia Expirada'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`p-2.5 rounded-md transition-all ${isEditing ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    title={isEditing ? "Cancelar Edição" : "Editar Garantia"}
                  >
                    {isEditing ? <X size={20} /> : <Wrench size={20} />}
                  </button>
                  <button 
                    onClick={() => setSelectedWarranty(null)}
                    className="p-2.5 hover:bg-zinc-800 rounded-md transition-all text-zinc-500 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto max-h-[70vh] space-y-6">
                {isEditing ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cliente</label>
                        <input 
                          type="text"
                          value={editForm.client_name || ''}
                          onChange={e => setEditForm({ ...editForm, client_name: e.target.value })}
                          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Equipamento</label>
                        <input 
                          type="text"
                          value={editForm.equipment || ''}
                          onChange={e => setEditForm({ ...editForm, equipment: e.target.value })}
                          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Serviço Realizado</label>
                      <textarea 
                        rows={2}
                        value={editForm.service_performed || ''}
                        onChange={e => setEditForm({ ...editForm, service_performed: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Início</label>
                        <input 
                          type="date"
                          value={editForm.start_date || ''}
                          onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Duração (Dias)</label>
                        <input 
                          type="number"
                          value={editForm.duration_days || ''}
                          onChange={e => setEditForm({ ...editForm, duration_days: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Vencimento Calculado</label>
                      <div className="w-full bg-black/40 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm font-bold text-[#00E676]">
                        {format(addDays(parseISO(editForm.start_date || selectedWarranty.start_date), editForm.duration_days || 0), 'dd/MM/yyyy')}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Observações</label>
                      <textarea 
                        rows={3}
                        value={editForm.notes || ''}
                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8 custom-scrollbar rounded-xl border border-zinc-800">
                    <div className="bg-white shadow-2xl mx-auto w-full max-w-[794px] min-h-[500px]">
                      {selectedWarrantyData && (
                        <WarrantyPrintTemplate
                          order={selectedWarrantyData.order}
                          customer={selectedWarrantyData.customer}
                          companySettings={companySettings}
                          osSettings={osSettings}
                          isPreview={true}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons REFINED SLIM */}
              <div className="p-4 sm:p-5 border-t border-zinc-800 bg-[#141414] flex flex-col sm:flex-row gap-3">
                {isEditing ? (
                  <button 
                    onClick={handleUpdateWarranty}
                    disabled={isSaving}
                    className="w-full h-[54px] sm:h-[48px] bg-[#00E676] hover:bg-[#00C853] text-black rounded-sm transition-all flex items-center justify-center gap-2 px-6 group shadow-lg font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={18} className="shrink-0" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <div className="flex flex-1 gap-2.5">
                      <button 
                        onClick={() => {
                           const originalTitle = document.title;
                           const osNumber = selectedWarranty.os_number.toString().padStart(4, '0');
                           const companyName = companySettings.name || 'Servyx';
                           document.title = `${companyName.toUpperCase().replace(/\s+/g, '_')}_Garantia_${osNumber}`;
                           document.body.classList.remove('print-a4', 'print-thermal', 'print-warranty-thermal');
                           document.body.classList.add('print-warranty');
                           window.print();
                           setTimeout(() => { document.title = originalTitle; }, 100);
                        }}
                        className="flex-1 h-[54px] sm:h-[48px] bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-sm transition-all border border-zinc-700/50 flex items-center justify-center gap-2"
                      >
                        <Printer size={18} className="text-zinc-400" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">A4</span>
                      </button>
                      <button 
                        onClick={() => {
                           const originalTitle = document.title;
                           const osNumber = selectedWarranty.os_number.toString().padStart(4, '0');
                           const companyName = companySettings.name || 'Servyx';
                           document.title = `${companyName.toUpperCase().replace(/\s+/g, '_')}_Garantia_${osNumber}`;
                           document.body.classList.remove('print-a4', 'print-thermal', 'print-warranty');
                           document.body.classList.add('print-warranty-thermal');
                           window.print();
                           setTimeout(() => { document.title = originalTitle; }, 100);
                        }}
                        className="flex-1 h-[54px] sm:h-[48px] bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-sm transition-all border border-zinc-700/50 flex items-center justify-center gap-2"
                      >
                        <Printer size={18} className="text-[#00E676]" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Térmica</span>
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => {
                        const portalUrl = companySettings.publicSlug 
                          ? `${window.location.origin}/${companySettings.publicSlug}/${selectedWarranty.os_id}`
                          : `${window.location.origin}/os/${selectedWarranty.os_id}`;

                        const template = osSettings?.whatsappMessages?.['Garantia'] || 
                          `Olá {nome_cliente}! 👋\n\nAqui está o seu comprovante e termo de garantia digital da OS {numero_os}.\n\nLink do documento:\n👉 {link_os}\n\nGuarde este link para sua segurança.`;
                        
                        const message = template
                          .replace(/\[nome_cliente\]/g, selectedWarranty.client_name)
                          .replace(/{cliente}/g, selectedWarranty.client_name)
                          .replace(/\[numero_os\]/g, selectedWarranty.os_number.toString().padStart(4, '0'))
                          .replace(/{os}/g, selectedWarranty.os_number.toString().padStart(4, '0'))
                          .replace(/\[equipamento\]/g, selectedWarranty.equipment)
                          .replace(/\[status\]/g, selectedWarranty.status)
                          .replace(/\[link_os\]/g, portalUrl)
                          .replace(/{link}/g, portalUrl)
                          .replace(/\[nome_assistencia\]/g, companySettings.name || 'Servyx')
                          .replace(/{empresa}/g, companySettings.name || 'Servyx');

                        let decodedPhone = "55"; // In a real scenario we'd get this from the related order/customer
                        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                        const link = document.createElement('a');
                        link.href = whatsappUrl;
                        link.target = 'wa';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="w-full sm:flex-[1.2] h-[54px] sm:h-[48px] bg-[#00E676] hover:bg-[#00C853] text-black rounded-sm transition-all flex items-center justify-center gap-2 px-6 group shadow-lg"
                    >
                      <MessageCircle size={18} className="shrink-0" />
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-center">Enviar WhatsApp</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedWarrantyData && (
        typeof document !== 'undefined' && createPortal(
          <>
            <div className="print-warranty-container">
              <WarrantyPrintTemplate 
                order={selectedWarrantyData.order as any}
                customer={selectedWarrantyData.customer as any}
                companySettings={companySettings}
                osSettings={osSettings}
              />
            </div>
            <div className="warranty-thermal-container">
              <WarrantyThermalTemplate 
                order={selectedWarrantyData.order as any}
                customer={selectedWarrantyData.customer as any}
                companySettings={companySettings}
                osSettings={osSettings}
              />
            </div>
          </>,
          document.body
        )
      )}

      <style jsx global>{`
        @media print {
          body.print-warranty, body.print-warranty-thermal {
            visibility: hidden !important;
            background: white !important;
          }
          body.print-warranty .print-warranty-container,
          body.print-warranty .print-warranty-container *,
          body.print-warranty-thermal .warranty-thermal-container,
          body.print-warranty-thermal .warranty-thermal-container * {
            visibility: visible !important;
          }
          .print-warranty-container, .warranty-thermal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
          }
          .print-warranty-container { width: 100% !important; }
          .warranty-thermal-container { width: 80mm !important; }
        }
      `}</style>
    </div>
  );
}

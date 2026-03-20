'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Search, Edit2, Trash2, ArrowLeft, 
  Clock, DollarSign, FileText, X, Save, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

interface Service {
  id: string;
  name: string;
  description: string;
  default_value: number;
  estimated_time?: string;
}

interface ServicosModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export default function ServicosModule({ profile, onBack, onShowToast }: ServicosModuleProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Partial<Service> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('SUPABASE ERROR (Services):', error.message, error.details, error.hint);
        throw error;
      }
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      onShowToast('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService?.name) return;

    try {
      const isEditing = !!selectedService.id;
      const { data: { session } } = await supabase.auth.getSession();
      
      const serviceData = {
        name: selectedService.name,
        description: selectedService.description || '',
        default_value: Number(selectedService.default_value || 0),
        estimated_time: selectedService.estimated_time || '',
        user_id: session?.user?.id,
        updated_at: new Date().toISOString()
      };

      let error;
      if (isEditing) {
        ({ error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', selectedService.id));
      } else {
        ({ error } = await supabase
          .from('services')
          .insert({ ...serviceData, id: crypto.randomUUID() }));
      }

      if (error) throw error;

      onShowToast(`Serviço ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving service:', err);
      onShowToast('Erro ao salvar serviço');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      
      onShowToast('Serviço excluído com sucesso');
      fetchData();
    } catch (err) {
      console.error('Error deleting service:', err);
      onShowToast('Erro ao excluir serviço');
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h1 className="text-2xl font-bold tracking-tight">Gestão de Serviços</h1>
              <p className="text-sm text-zinc-500 font-medium">Catálogo padrão da assistência</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00E676] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar serviços..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#00E676] transition-all"
              />
            </div>
            <button 
              onClick={() => { setSelectedService({}); setIsModalOpen(true); }}
              className="px-6 py-3 bg-[#00E676] hover:bg-[#00C853] text-black font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#00E676]/20 active:scale-[0.98]"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Serviço</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00E676] border-t-transparent"></div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-900 rounded-[2.5rem]">
            <Wrench size={48} className="mb-4 opacity-20" />
            <p className="text-lg">Nenhum serviço encontrado</p>
            <button 
              onClick={() => { setSelectedService({}); setIsModalOpen(true); }}
              className="mt-4 text-[#00E676] hover:underline text-sm font-bold uppercase tracking-wider"
            >
              Cadastrar o primeiro serviço
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {filteredServices.map((service) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-zinc-900/40 border border-zinc-800/80 p-6 rounded-[2rem] hover:bg-zinc-900/60 transition-all hover:border-zinc-700/50"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-zinc-950 rounded-2xl text-[#00E676]">
                    <Wrench size={20} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setSelectedService(service); setIsModalOpen(true); }}
                      className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(service.id)}
                      className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-2 group-hover:text-[#00E676] transition-colors line-clamp-1">{service.name}</h3>
                <p className="text-sm text-zinc-500 mb-6 line-clamp-2 min-h-[2.5rem] leading-relaxed italic">{service.description || 'Sem descrição'}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest mb-1">Valor Padrão</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {Number(service.default_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  {service.estimated_time && (
                    <div className="flex items-center gap-2 text-zinc-400 bg-black/30 px-3 py-1.5 rounded-full text-xs font-medium">
                      <Clock size={14} />
                      {service.estimated_time}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Cadastro/Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#111111] border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#00E676]/10 text-[#00E676] rounded-2xl flex items-center justify-center">
                    <Wrench size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedService?.id ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Informações Básicas</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Nome do Serviço</label>
                  <input 
                    type="text" 
                    required
                    value={selectedService?.name || ''}
                    onChange={e => setSelectedService(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-[#00E676] transition-all"
                    placeholder="Ex: Troca de Tela iPhone 11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Descrição</label>
                  <textarea 
                    value={selectedService?.description || ''}
                    onChange={e => setSelectedService(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-[#00E676] transition-all resize-none h-24"
                    placeholder="Detalhes adicionais sobre o serviço..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Valor Padrão</label>
                    <div className="relative group">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400" size={18} />
                      <input 
                        type="number"
                        step="0.01" 
                        required
                        value={selectedService?.default_value || ''}
                        onChange={e => setSelectedService(prev => ({ ...prev, default_value: Number(e.target.value) }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Tempo Médio</label>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400" size={18} />
                      <input 
                        type="text" 
                        value={selectedService?.estimated_time || ''}
                        onChange={e => setSelectedService(prev => ({ ...prev, estimated_time: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="Ex: 40 min"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold rounded-2xl transition-all border border-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[#00E676] hover:bg-[#00C853] text-black font-bold rounded-2xl transition-all shadow-lg shadow-[#00E676]/20 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Salvar Serviço
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

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, Plus, Search, Edit2, Trash2, ArrowLeft, 
  Clock, DollarSign, X, Save,
  Smartphone, Laptop, Monitor, Gamepad2, Tablet, HelpCircle, Printer, Headphones, Watch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { capFirst } from '../utils/capFirst';

const DEVICE_CATEGORIES = [
  { value: 'Smartphone',  label: 'Smartphone',          icon: Smartphone },
  { value: 'Notebook',    label: 'Notebook',             icon: Laptop },
  { value: 'Computador',  label: 'Computador',           icon: Monitor },
  { value: 'Tablet',      label: 'Tablet',               icon: Tablet },
  { value: 'Videogame',   label: 'Videogame',            icon: Gamepad2 },
  { value: 'Controle',    label: 'Controle de Videogame', icon: Gamepad2 },
  { value: 'Impressora',  label: 'Impressora',           icon: Printer },
  { value: 'Áudio',       label: 'Áudio/Fone',           icon: Headphones },
  { value: 'Smartwatch',  label: 'Smartwatch',           icon: Watch },
  { value: 'Outro',       label: 'Outro',                icon: HelpCircle },
];

interface Service {
  id: string;
  name: string;
  description: string;
  default_value: number;
  estimated_time?: string;
  category?: string;
}

interface ServicosModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
    company_id: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
}

function CategoryIcon({ category, size = 18 }: { category?: string; size?: number }) {
  const found = DEVICE_CATEGORIES.find(c => c.value === category);
  const Icon = found?.icon ?? Wrench;
  return <Icon size={size} />;
}

export default function ServicosModule({ profile, onBack, onShowToast, onLogActivity }: ServicosModuleProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Partial<Service> | null>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  const isAdmin = profile.type === 'ADM';

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');
      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      onShowToast('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
        category: selectedService.category || 'Outro',
        user_id: session?.user?.id,
        company_id: profile.company_id,
        updated_at: new Date().toISOString()
      };

      let error;
      if (isEditing) {
        ({ error } = await supabase.from('services').update(serviceData).eq('id', selectedService.id).eq('company_id', profile.company_id));
      } else {
        ({ error } = await supabase.from('services').insert({ ...serviceData, id: crypto.randomUUID() }));
      }
      if (error) throw error;
      
      onLogActivity?.('SERVICOS', isEditing ? 'EDITOU SERVIÇO' : 'CRIOU SERVIÇO', {
        serviceId: isEditing ? selectedService.id : 'NOVO',
        serviceName: selectedService.name,
        price: selectedService.default_value,
        category: selectedService.category,
        description: isEditing ? `Atualizou o serviço ${selectedService.name}` : `Cadastrou o novo serviço ${selectedService.name}`
      });

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
      const { error } = await supabase.from('services').delete().eq('id', id).eq('company_id', profile.company_id);
      if (error) throw error;
      
      onLogActivity?.('SERVICOS', 'EXCLUIU SERVIÇO', {
        serviceId: id,
        description: `Removeu o serviço (ID: ${id}) do catálogo`
      });

      onShowToast('Serviço excluído com sucesso');
      fetchData();
    } catch (err) {
      console.error('Error deleting service:', err);
      onShowToast('Erro ao excluir serviço');
    }
  };

  // Categories that actually have services
  const availableCategories = useMemo(() => {
    const cats = new Set(services.map(s => s.category || 'Outro'));
    return ['Todas', ...DEVICE_CATEGORIES.map(c => c.value).filter(v => cats.has(v))];
  }, [services]);

  const filteredServices = useMemo(() => services.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Todas' || (s.category || 'Outro') === selectedCategory;
    return matchSearch && matchCat;
  }), [services, searchTerm, selectedCategory]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Service[]> = {};
    filteredServices.forEach(s => {
      const cat = s.category || 'Outro';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    // Sort groups by DEVICE_CATEGORIES order
    return DEVICE_CATEGORIES
      .map(c => ({ ...c, services: map[c.value] || [] }))
      .filter(g => g.services.length > 0);
  }, [filteredServices]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-zinc-900 p-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
              <ArrowLeft size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
            </button>
            <div className="relative group/title">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Gestão de Serviços</h1>
                <button 
                  onMouseEnter={() => setShowInfoTooltip(true)}
                  onMouseLeave={() => setShowInfoTooltip(false)}
                  onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                  className="w-5 h-5 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-blue-400 hover:border-blue-400/50 transition-all text-[11px] font-black shrink-0"
                >
                  i
                </button>
                <AnimatePresence>
                  {showInfoTooltip && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute top-full left-0 mt-3 w-80 p-4 bg-zinc-900 border border-zinc-800 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] backdrop-blur-xl pointer-events-none"
                    >
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                          <HelpCircle size={14} className="text-blue-400" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] text-zinc-300 font-bold leading-relaxed">
                            Otimize seu atendimento vinculando serviços por categoria. Ao selecionar um equipamento em uma nova OS, o sistema preenche automaticamente os preços e observações padrão, garantindo agilidade e padronização.
                          </p>
                        </div>
                      </div>
                      <div className="absolute bottom-full left-6 -mb-1 border-4 border-transparent border-b-zinc-800"></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
            {isAdmin && (
              <button
                onClick={() => { setSelectedService({ category: 'Smartphone' }); setIsModalOpen(true); }}
                className="px-6 py-3 bg-[#00E676] hover:bg-[#00C853] text-black font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#00E676]/20 active:scale-[0.98]"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Novo Serviço</span>
              </button>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        <div className="max-w-7xl mx-auto mt-4 flex flex-wrap gap-2 pb-1">
          {availableCategories.map(cat => {
            const found = DEVICE_CATEGORIES.find(c => c.value === cat);
            const Icon = found?.icon;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-[#00E676] border-[#00E676] text-black shadow-lg shadow-[#00E676]/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {Icon && <Icon size={13} />}
                {cat === 'Todas' ? 'Todas' : found?.label ?? cat}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-10 pb-20">
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00E676] border-t-transparent" />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-900 rounded-[2.5rem]">
            <Wrench size={48} className="mb-4 opacity-20" />
            <p className="text-lg">Nenhum serviço encontrado</p>
            {isAdmin && (
              <button
                onClick={() => { setSelectedService({ category: 'Smartphone' }); setIsModalOpen(true); }}
                className="mt-4 text-[#00E676] hover:underline text-sm font-bold uppercase tracking-wider"
              >
                Cadastrar o primeiro serviço
              </button>
            )}
          </div>
        ) : (
          // Grouped by category
          grouped.map(group => (
            <div key={group.value}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-2xl bg-[#00E676]/10 text-[#00E676] flex items-center justify-center">
                  <group.icon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{group.label}</h2>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
                    {group.services.length} serviço{group.services.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex-1 h-px bg-zinc-800/60 ml-2" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.services.map(service => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-[1.75rem] hover:bg-zinc-900/60 transition-all hover:border-zinc-700/50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 bg-zinc-950 rounded-xl text-[#00E676]">
                        <CategoryIcon category={service.category} size={18} />
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setSelectedService(service); setIsModalOpen(true); }}
                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-base font-bold mb-1 group-hover:text-[#00E676] transition-colors line-clamp-1">{service.name}</h3>
                    {service.description && (
                      <p className="text-xs text-zinc-500 mb-3 line-clamp-2 leading-relaxed">{service.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest block">Valor Padrão</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {Number(service.default_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      {service.estimated_time && (
                        <div className="flex items-center gap-1.5 text-zinc-400 bg-black/30 px-3 py-1.5 rounded-full text-xs font-medium">
                          <Clock size={12} />
                          {service.estimated_time}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
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
              className="relative w-full max-w-lg max-h-[90vh] bg-[#111111] border border-zinc-800 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-7 border-b border-zinc-800/50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#00E676]/10 text-[#00E676] rounded-2xl flex items-center justify-center">
                    <CategoryIcon category={selectedService?.category} size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedService?.id ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Informações do Serviço</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <form onSubmit={handleSave} className="p-7 space-y-6">
                  {/* Category selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Tipo de Equipamento</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {DEVICE_CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setSelectedService(prev => ({ ...prev, category: cat.value }))}
                          title={cat.label}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-xs font-semibold ${
                            selectedService?.category === cat.value
                              ? 'bg-[#00E676]/15 border-[#00E676] text-[#00E676]'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                          }`}
                        >
                          <cat.icon size={14} />
                          <span className="text-[8px] leading-tight text-center truncate w-full">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Nome do Serviço</label>
                    <input
                      type="text"
                      required
                      value={selectedService?.name || ''}
                      onChange={e => setSelectedService(prev => ({ ...prev, name: capFirst(e.target.value) }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all"
                      placeholder="Ex: Troca de Tela iPhone 11"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">OBSERVAÇÕES DO SERVIÇO</label>
                    <textarea
                      value={selectedService?.description || ''}
                      onChange={e => setSelectedService(prev => ({ ...prev, description: capFirst(e.target.value) }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none h-24"
                      placeholder="Detalhes e riscos sobre o serviço..."
                    />
                    <p className="text-[9px] text-zinc-600 font-medium ml-1 flex items-center gap-1.5 uppercase tracking-widest">
                      <HelpCircle size={10} />
                      Dica: Descreva os riscos envolvidos ou cuidados especiais neste serviço.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Valor Padrão</label>
                      <div className="relative group">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400" size={16} />
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={selectedService?.default_value || ''}
                          onChange={e => setSelectedService(prev => ({ ...prev, default_value: Number(e.target.value) }))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Tempo Médio</label>
                      <div className="relative group">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400" size={16} />
                        <input
                          type="text"
                          value={selectedService?.estimated_time || ''}
                          onChange={e => setSelectedService(prev => ({ ...prev, estimated_time: e.target.value }))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                          placeholder="Ex: 40 min"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 sticky bottom-0 bg-[#111111] py-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold rounded-2xl transition-all border border-zinc-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-[#00E676] hover:bg-[#00C853] text-black font-bold rounded-2xl transition-all shadow-lg shadow-[#00E676]/20 flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      Salvar Serviço
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
 

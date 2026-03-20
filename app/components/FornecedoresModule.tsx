'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Edit2, Trash2, ArrowLeft, 
  Phone, Mail, MapPin, FileText, X, Save, 
  Calendar, ShoppingCart, Filter,
  MessageCircle, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Supplier {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  supply_type?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

interface Purchase {
  id: string;
  date: string;
  product_name: string;
  value: number;
  payment_method: string;
}

interface FornecedoresModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export default function FornecedoresModule({ profile, onBack, onShowToast }: FornecedoresModuleProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Partial<Supplier> | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [dateRange, setDateRange] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), 
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd') 
  });

  const isAdmin = profile.type === 'ADM' || profile.role === 'ADM';

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('company_name');
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      onShowToast('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, date, product_name, value, payment_method')
        .eq('supplier_id', supplierId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setPurchases(data || []);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      onShowToast('Erro ao carregar histórico de compras');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!selectedSupplier?.company_name || !selectedSupplier?.contact_name || !selectedSupplier?.phone || !selectedSupplier?.email) {
      onShowToast('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const isEditing = !!selectedSupplier.id;
      const { data: { session } } = await supabase.auth.getSession();
      
      const supplierData = {
        company_name: selectedSupplier.company_name,
        contact_name: selectedSupplier.contact_name,
        phone: selectedSupplier.phone,
        email: selectedSupplier.email,
        supply_type: selectedSupplier.supply_type || '',
        address: selectedSupplier.address || '',
        notes: selectedSupplier.notes || '',
        user_id: session?.user?.id,
        updated_at: new Date().toISOString()
      };

      let error;
      if (isEditing) {
        ({ error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', selectedSupplier.id));
      } else {
        ({ error } = await supabase
          .from('suppliers')
          .insert({ ...supplierData, id: crypto.randomUUID() }));
      }

      if (error) throw error;

      onShowToast(`Fornecedor ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving supplier:', err);
      onShowToast('Erro ao salvar fornecedor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      
      onShowToast('Fornecedor excluído com sucesso');
      fetchData();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      onShowToast('Erro ao excluir fornecedor');
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.supply_type && s.supply_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPurchases = purchases.filter(p => {
    const pDate = parseISO(p.date);
    return isWithinInterval(pDate, { 
      start: parseISO(dateRange.start), 
      end: parseISO(dateRange.end) 
    });
  });

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
              <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
              <p className="text-sm text-zinc-500 font-medium">Gestão de parceiros e compras</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00E676] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Nome, contato ou tipo de suprimento..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#00E676] transition-all"
              />
            </div>
            {isAdmin && (
              <button 
                onClick={() => { setSelectedSupplier({}); setIsModalOpen(true); }}
                className="px-6 py-3 bg-[#00E676] hover:bg-[#00C853] text-black font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#00E676]/20 active:scale-[0.98]"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Novo Fornecedor</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00E676] border-t-transparent"></div>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-900 rounded-[2.5rem]">
            <Truck size={48} className="mb-4 opacity-20" />
            <p className="text-lg">Nenhum fornecedor encontrado</p>
            {isAdmin && (
              <button 
                onClick={() => { setSelectedSupplier({}); setIsModalOpen(true); }}
                className="mt-4 text-[#00E676] hover:underline text-sm font-bold uppercase tracking-wider"
              >
                Cadastrar o primeiro fornecedor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {filteredSuppliers.map((supplier) => (
              <motion.div 
                key={supplier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-zinc-900/40 border border-zinc-800/80 p-6 rounded-[2.5rem] hover:bg-zinc-900/60 transition-all hover:border-zinc-700/50 relative overflow-hidden backdrop-blur-sm shadow-xl"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-[#00E676]/10 text-[#00E676] rounded-2xl flex items-center justify-center">
                    <Truck size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openWhatsApp(supplier.phone)}
                      className="p-2.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all"
                      title="Chamar no WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedSupplier(supplier); setIsModalOpen(true); }}
                        className="p-2.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-1 truncate group-hover:text-[#00E676] transition-colors">{supplier.company_name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-zinc-400">{supplier.contact_name}</span>
                  {supplier.supply_type && (
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-zinc-700">
                      {supplier.supply_type}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <Phone size={14} className="text-zinc-600" />
                    {supplier.phone}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <Mail size={14} className="text-zinc-600" />
                    <span className="truncate italic">{supplier.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-zinc-800/50">
                  <button 
                    onClick={() => { setViewingSupplier(supplier); fetchPurchases(supplier.id); setIsDetailsOpen(true); }}
                    className="flex-1 py-3 bg-[#0A0A0A] hover:bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-widest rounded-xl transition-all border border-zinc-800 hover:text-white"
                  >
                    Ver Detalhes
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete(supplier.id)}
                      className="p-3 bg-red-500/5 text-red-500/50 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/10"
                    >
                      <Trash2 size={16} />
                    </button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#0F0F0F] border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#00E676]/10 text-[#00E676] rounded-2xl flex items-center justify-center font-bold">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedSupplier?.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Informações de Parceria</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Empresa *</label>
                  <input type="text" required value={selectedSupplier?.company_name || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, company_name: e.target.value }))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#00E676] transition-all" placeholder="Nome da Distribuidora" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome do Contato *</label>
                    <input type="text" required value={selectedSupplier?.contact_name || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, contact_name: e.target.value }))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#00E676] transition-all" placeholder="Responsável" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Tipo de Suprimento</label>
                    <input type="text" value={selectedSupplier?.supply_type || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, supply_type: e.target.value }))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500 transition-all" placeholder="Ex: Telas, Peças, Acessórios" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone/WA *</label>
                    <input type="text" required value={selectedSupplier?.phone || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#00E676] transition-all" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail *</label>
                    <input type="email" required value={selectedSupplier?.email || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, email: e.target.value }))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#00E676] transition-all text-sm" placeholder="email@fornecedor.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Endereço</label>
                  <input type="text" value={selectedSupplier?.address || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, address: e.target.value }))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#00E676] transition-all" placeholder="Rua, Número, Bairro..." />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold rounded-2xl transition-all border border-zinc-800">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-[#00E676] hover:bg-[#00C853] text-black font-black rounded-2xl transition-all shadow-lg shadow-[#00E676]/20 flex items-center justify-center gap-2 tracking-wider"><Save size={20} /> SALVAR</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detalhes/Histórico */}
      <AnimatePresence>
        {isDetailsOpen && viewingSupplier && (
          <div className="fixed inset-0 z-[60] flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailsOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl h-full bg-[#0A0A0A] border-l border-zinc-800 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-900 bg-zinc-900/40 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#00E676]/10 text-[#00E676] rounded-2xl flex items-center justify-center">
                    <Truck size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{viewingSupplier.company_name}</h2>
                    <p className="text-xs text-zinc-500 flex items-center gap-2">
                       <Layers size={14} className="text-[#00E676]" />
                       {viewingSupplier.supply_type || 'Suprimentos Diversos'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsDetailsOpen(false)} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-2xl transition-all"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* Dados do Fornecedor */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00E676]">Dados Cadastrais</h3>
                    <button 
                      onClick={() => openWhatsApp(viewingSupplier.phone)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#00E676] hover:bg-[#00C853] text-black font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[#00E676]/10"
                    >
                      <MessageCircle size={16} /> Chamar WhatsApp
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-6 bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Responsável</span>
                      <p className="text-zinc-200 font-bold">{viewingSupplier.contact_name}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Contato</span>
                      <p className="text-zinc-200 font-bold">{viewingSupplier.phone}</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">E-mail Comercial</span>
                      <p className="text-zinc-300 font-medium italic">{viewingSupplier.email}</p>
                    </div>
                    {viewingSupplier.address && (
                      <div className="space-y-1 col-span-2">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Endereço</span>
                        <p className="text-zinc-400 text-sm">{viewingSupplier.address}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Histórico de Compras */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Histórico de Compras</h3>
                      <p className="text-[10px] text-zinc-600 mt-1 uppercase font-bold tracking-widest">{filteredPurchases.length} compras registradas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl text-xs border border-zinc-800">
                        <Filter size={14} className="text-zinc-600" />
                        <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent border-none focus:ring-0 text-white font-bold text-[10px] [color-scheme:dark]" />
                        <span className="text-zinc-700 font-black">—</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent border-none focus:ring-0 text-white font-bold text-[10px] [color-scheme:dark]" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredPurchases.length === 0 ? (
                      <div className="py-16 flex flex-col items-center justify-center bg-zinc-900/20 border-2 border-dashed border-zinc-900 rounded-[2rem]">
                        <ShoppingCart size={32} className="text-zinc-800 mb-3" />
                        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Sem compras neste período</p>
                      </div>
                    ) : (
                      <div className="border border-zinc-900 rounded-[2rem] overflow-hidden bg-zinc-900/10">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-zinc-900/50 border-b border-zinc-800">
                              <th className="px-6 py-4 font-black text-zinc-600 uppercase tracking-widest text-[9px]">Data</th>
                              <th className="px-6 py-4 font-black text-zinc-600 uppercase tracking-widest text-[9px]">Produto</th>
                              <th className="px-6 py-4 font-black text-zinc-600 uppercase tracking-widest text-[9px]">Pagamento</th>
                              <th className="px-6 py-4 font-black text-zinc-600 uppercase tracking-widest text-[9px] text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/50">
                            {filteredPurchases.map((purchase) => (
                              <tr key={purchase.id} className="hover:bg-zinc-900/40 transition-colors">
                                <td className="px-6 py-4 text-zinc-500 font-bold">{format(parseISO(purchase.date), 'dd/MM/yy')}</td>
                                <td className="px-6 py-4 text-zinc-200 font-black tracking-tight">{purchase.product_name || 'Diversos'}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 bg-zinc-950 text-zinc-500 text-[9px] font-black uppercase tracking-widest rounded border border-zinc-800">{purchase.payment_method}</span>
                                </td>
                                <td className="px-6 py-4 text-right text-[#00E676] font-black">
                                  {Number(purchase.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

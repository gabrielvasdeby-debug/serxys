'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Edit2, Trash2, ArrowLeft, 
  Phone, Mail, MapPin, FileText, X, Save, 
  Calendar, ShoppingCart, Filter,
  MessageCircle, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { formatPhone } from '../utils/formatPhone';
import { capFirst } from '../utils/capFirst';
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
    company_id: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
}

export default function FornecedoresModule({ profile, onBack, onShowToast, onLogActivity }: FornecedoresModuleProps) {
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
        .eq('company_id', profile.company_id)
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
        .eq('company_id', profile.company_id)
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
    if (!selectedSupplier?.company_name || !selectedSupplier?.contact_name || !selectedSupplier?.phone) {
      onShowToast('Preencha os campos obrigatórios (Empresa, Contato e Telefone)');
      return;
    }

    try {
      const isEditing = !!selectedSupplier.id;
      const { data: { session } } = await supabase.auth.getSession();
      
      const supplierData: any = {
        company_name: selectedSupplier.company_name,
        contact_name: selectedSupplier.contact_name,
        phone: selectedSupplier.phone,
        company_id: profile.company_id
      };

      if (selectedSupplier.email?.trim()) supplierData.email = selectedSupplier.email.trim();
      if (selectedSupplier.supply_type?.trim()) supplierData.supply_type = selectedSupplier.supply_type.trim();
      if (selectedSupplier.address?.trim()) supplierData.address = selectedSupplier.address.trim();
      
      if (session?.user?.id) {
        supplierData.user_id = session.user.id;
      }

      let error;
      if (isEditing) {
        ({ error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', selectedSupplier.id)
          .eq('company_id', profile.company_id));
      } else {
        supplierData.user_id = session?.user?.id || profile.id;
        ({ error } = await supabase
          .from('suppliers')
          .insert(supplierData));
      }

      if (error) throw error;

      onLogActivity?.('FORNECEDORES', isEditing ? 'EDITOU FORNECEDOR' : 'CRIOU FORNECEDOR', {
        supplierId: isEditing ? selectedSupplier.id : 'NOVO',
        companyName: selectedSupplier.company_name,
        contactName: selectedSupplier.contact_name,
        description: isEditing ? `Atualizou os dados do fornecedor ${selectedSupplier.company_name}` : `Cadastrou o novo fornecedor ${selectedSupplier.company_name}`
      });

      onShowToast(`Fornecedor ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving supplier:', err);
      onShowToast('Erro ao salvar fornecedor: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id).eq('company_id', profile.company_id);
      if (error) throw error;
      
      onLogActivity?.('FORNECEDORES', 'EXCLUIU FORNECEDOR', {
        supplierId: id,
        description: `Removeu o fornecedor (ID: ${id}) da base de dados`
      });

      onShowToast('Fornecedor excluído com sucesso');
      fetchData();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      onShowToast('Erro ao excluir fornecedor');
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    let decodedPhone = cleanPhone;
    if (!decodedPhone.startsWith('55')) decodedPhone = `55${decodedPhone}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${decodedPhone}`;
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = 'wa';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-[#00E676]/30">
      {/* Header compact and industrial */}
      <header className="bg-black/80 backdrop-blur-md border-b border-zinc-900 px-4 py-4 md:px-8 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-sm hover:border-zinc-600 transition-all group">
              <ArrowLeft size={18} className="text-zinc-400 group-hover:text-white" />
            </button>
            <div>
              <h1 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                <Truck size={20} className="text-[#00E676]" />
                FORNECEDORES
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest hidden sm:block">Parceiros de Suprimentos</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative group flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#00E676] transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Pesquisar parceiro..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#141414] border border-zinc-800 rounded-sm pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#00E676] transition-all placeholder:text-zinc-700"
              />
            </div>
            {isAdmin && (
              <button 
                onClick={() => { setSelectedSupplier({}); setIsModalOpen(true); }}
                className="px-4 py-2 bg-[#00E676] hover:bg-[#00C853] text-black font-black uppercase text-[10px] tracking-widest rounded-sm flex items-center gap-2 transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(0,230,118,0.1)] shrink-0"
              >
                <Plus size={16} />
                <span className="hidden xs:inline">ADICIONAR</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-24">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00E676] border-t-transparent"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 animate-pulse">Sincronizando Banco de Dados</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-900 rounded-sm">
            <Truck size={40} className="mb-4 opacity-10" />
            <p className="text-xs font-black uppercase tracking-widest text-zinc-700">Nenhum fornecedor catalogado</p>
            {isAdmin && (
              <button 
                onClick={() => { setSelectedSupplier({}); setIsModalOpen(true); }}
                className="mt-6 text-[#00E676] hover:bg-[#00E676]/10 px-4 py-2 border border-[#00E676]/20 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] transition-all"
              >
                Cadastrar Primeiro Parceiro
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24">
            {filteredSuppliers.map((supplier) => (
              <motion.div 
                key={supplier.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group bg-[#111111] border border-zinc-800 rounded-sm p-4 hover:border-[#00E676]/50 transition-all shadow-lg relative flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-sm flex items-center justify-center text-zinc-500 group-hover:text-[#00E676] group-hover:border-[#00E676]/30 transition-all">
                    <Truck size={20} />
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openWhatsApp(supplier.phone)}
                      className="p-2 bg-[#25D366]/5 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-sm transition-all"
                      title="WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedSupplier(supplier); setIsModalOpen(true); }}
                        className="p-2 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white rounded-sm transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-black uppercase tracking-tight truncate leading-none mb-1.5">{supplier.company_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 truncate">{supplier.contact_name}</span>
                    {supplier.supply_type && (
                      <span className="px-1.5 py-0.5 bg-black border border-zinc-800 text-zinc-600 text-[8px] font-black uppercase tracking-widest rounded-sm shrink-0">
                        {supplier.supply_type}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                    <Phone size={12} className="text-zinc-700" />
                    {supplier.phone}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium overflow-hidden">
                    <Mail size={12} className="text-zinc-700" />
                    <span className="truncate italic opacity-60 text-[10px]">{supplier.email || 'sem e-mail'}</span>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <button 
                    onClick={() => { setViewingSupplier(supplier); fetchPurchases(supplier.id); setIsDetailsOpen(true); }}
                    className="flex-1 py-2 bg-[#1A1A1A] hover:bg-[#00E676] text-zinc-500 hover:text-black text-[9px] font-black uppercase tracking-widest rounded-sm transition-all border border-zinc-800 hover:border-[#00E676]"
                  >
                    Detalhamento
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete(supplier.id)}
                      className="p-2 bg-zinc-900 text-zinc-700 hover:bg-red-600 hover:text-white rounded-sm transition-all border border-zinc-800 hover:border-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 xs:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/95 sm:bg-black/80 sm:backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg bg-[#0F0F0F] border border-zinc-800 h-full sm:h-auto overflow-y-auto sm:rounded-sm shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00E676]/10 text-[#00E676] rounded-sm flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">{selectedSupplier?.id ? 'Editar Parceiro' : 'Cadastro de Fornecedor'}</h2>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Preencha os dados de suprimentos</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-sm transition-all"><X size={18} /></button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Nome Fantasia / Empresa *</label>
                    <input type="text" required value={selectedSupplier?.company_name || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, company_name: capFirst(e.target.value) }))} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00E676] transition-all" placeholder="Ex: Master Peças LTDA" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Responsável / Contato *</label>
                    <input type="text" required value={selectedSupplier?.contact_name || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, contact_name: capFirst(e.target.value) }))} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00E676] transition-all" placeholder="Nome do vendedor" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Telefone WhatsApp *</label>
                    <input type="text" required value={selectedSupplier?.phone || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, phone: formatPhone(e.target.value) }))} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00E676] transition-all" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Tipo de Suprimento</label>
                    <input type="text" value={selectedSupplier?.supply_type || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, supply_type: capFirst(e.target.value) }))} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-400 transition-all" placeholder="Ex: Telas, Carcaças" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">E-mail Comercial</label>
                  <input type="email" value={selectedSupplier?.email || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, email: e.target.value }))} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00E676] transition-all" placeholder="email@fornecedor.com.br" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Endereço Fiscal / Sede</label>
                  <textarea rows={2} value={selectedSupplier?.address || ''} onChange={e => setSelectedSupplier(prev => ({ ...prev, address: capFirst(e.target.value) }))} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00E676] transition-all resize-none" placeholder="Endereço completo para consulta..." />
                </div>

                <div className="flex gap-2 pt-4 mt-auto">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-black uppercase text-[10px] tracking-widest rounded-sm transition-all border border-zinc-800">CANCELAR</button>
                  <button type="submit" className="flex-1 py-3 bg-[#00E676] hover:bg-[#00C853] text-black font-black uppercase text-[10px] tracking-widest rounded-sm transition-all shadow-[0_0_20px_rgba(0,230,118,0.2)] flex items-center justify-center gap-2">SALVAR PARCEIRO</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailsOpen && viewingSupplier && (
          <div className="fixed inset-0 z-[60] flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailsOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-2xl h-full bg-[#0A0A0A] border-l border-zinc-900 shadow-2xl flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-zinc-900 bg-black/40 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-900 border border-[#00E676]/20 text-[#00E676] rounded-sm flex items-center justify-center">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-tight truncate max-w-[180px] sm:max-w-none">{viewingSupplier.company_name}</h2>
                    <p className="text-[9px] text-[#00E676] flex items-center gap-1 uppercase font-black tracking-widest">
                       <Layers size={10} />
                       {viewingSupplier.supply_type || 'SUPRIMENTOS'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsDetailsOpen(false)} className="p-2 sm:p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-sm transition-all border border-zinc-800">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar bg-[#0A0A0A]">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                       <FileText size={12} className="text-[#00E676]" /> FICHA DE PARCEIRO
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
                    <div className="bg-[#0A0A0A] p-4 flex flex-col gap-1">
                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em]">Responsável Direto</span>
                      <p className="text-xs font-bold text-zinc-300 uppercase">{viewingSupplier.contact_name}</p>
                    </div>
                    <div className="bg-[#0A0A0A] p-4 flex flex-col gap-1 border-l-0 sm:border-l border-zinc-800">
                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em]">Ramal / WhatsApp</span>
                      <div className="flex items-center justify-between group">
                        <p className="text-xs font-black text-[#00E676]">{viewingSupplier.phone}</p>
                        <button onClick={() => openWhatsApp(viewingSupplier.phone)} className="p-1.5 bg-[#00E676]/10 text-[#00E676] hover:bg-[#00E676] hover:text-black rounded-sm transition-all">
                          <MessageCircle size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] p-4 flex flex-col gap-1 col-span-1 sm:col-span-2 border-t border-zinc-800">
                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em]">Correio Eletrônico</span>
                      <p className="text-xs font-medium italic text-zinc-500 break-all">{viewingSupplier.email || '—'}</p>
                    </div>
                    {viewingSupplier.address && (
                      <div className="bg-[#0A0A0A] p-4 flex flex-col gap-1 col-span-1 sm:col-span-2 border-t border-zinc-800">
                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em]">Endereço de Coleta / Sede</span>
                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">{viewingSupplier.address}</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                       <ShoppingCart size={12} className="text-[#00E676]" /> Histórico de Orçamentos
                    </h3>
                    
                    <div className="flex items-center w-full sm:w-auto">
                      <div className="flex flex-col xs:flex-row items-stretch xs:items-center bg-black border border-zinc-800 rounded-sm divide-y xs:divide-y-0 xs:divide-x divide-zinc-800 overflow-hidden w-full sm:w-auto">
                        <div className="flex items-center px-3 py-2 gap-3 min-w-[140px]">
                          <span className="text-[8px] font-black text-zinc-600 uppercase shrink-0">De:</span>
                          <input 
                            type="date" 
                            value={dateRange.start} 
                            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} 
                            className="bg-transparent border-none focus:ring-0 text-zinc-300 font-bold text-[11px] [color-scheme:dark] p-0 w-full" 
                          />
                        </div>
                        <div className="flex items-center px-3 py-2 gap-3 min-w-[140px]">
                          <span className="text-[8px] font-black text-zinc-600 uppercase shrink-0">Até:</span>
                          <input 
                            type="date" 
                            value={dateRange.end} 
                            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} 
                            className="bg-transparent border-none focus:ring-0 text-zinc-300 font-bold text-[11px] [color-scheme:dark] p-0 w-full" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-h-[200px] bg-[#0F0F0F] border border-zinc-900 rounded-sm overflow-hidden flex flex-col">
                    {filteredPurchases.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center transition-all opacity-40">
                        <ShoppingCart size={24} className="text-zinc-800 mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700">Sem registros para o período</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0">
                        <table className="w-full text-left min-w-[380px]">
                          <thead>
                            <tr className="bg-black/40 border-b border-zinc-900">
                              <th className="pl-6 pr-3 py-3 font-black text-zinc-700 uppercase tracking-widest text-[8px] w-36">Data</th>
                              <th className="px-3 py-3 font-black text-zinc-700 uppercase tracking-widest text-[8px]">Item / Detalhes</th>
                              <th className="pl-3 pr-6 py-3 font-black text-zinc-700 uppercase tracking-widest text-[8px] text-right w-28">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/40">
                            {filteredPurchases.map((purchase) => (
                              <tr key={purchase.id} className="hover:bg-zinc-800/20 transition-colors">
                                <td className="pl-6 pr-3 py-4 text-zinc-300 font-bold text-[10px] whitespace-nowrap">
                                  <div className="flex items-center gap-2.5">
                                    <Calendar size={12} className="text-zinc-700 shrink-0" />
                                    <span>{format(parseISO(purchase.date), 'dd/MM/yyyy')}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-4">
                                  <div className="text-[10px] font-bold text-zinc-200 uppercase truncate max-w-[140px] sm:max-w-xs">{purchase.product_name || 'Generic Supply'}</div>
                                  <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mt-1">{purchase.payment_method}</div>
                                </td>
                                <td className="pl-3 pr-6 py-4 text-right text-[#00E676] font-black text-[11px] whitespace-nowrap">
                                  {Number(purchase.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  {filteredPurchases.length > 0 && (
                     <div className="flex justify-between items-center px-4 py-3 bg-black/40 border border-zinc-900 rounded-sm">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Soma Total do Período</span>
                        <span className="text-sm font-black text-[#00E676]">
                           {filteredPurchases.reduce((acc, p) => acc + Number(p.value), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                     </div>
                  )}
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

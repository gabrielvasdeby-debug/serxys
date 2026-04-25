import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Search, Plus, Edit2, Trash2, Eye, 
  Smartphone, Laptop, Monitor, Gamepad2, Tablet, Box,
  MapPin, Phone, Mail, FileText, Calendar, AlertCircle, Loader2, MessageCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import { formatPhone } from '../utils/formatPhone';
import { formatDocument } from '../utils/formatDocument';
import { applyMaskWithCursor } from '../utils/maskUtils';
import CountryCodePicker, { countries, Country } from './CountryCodePicker';
import { capFirst } from '../utils/capFirst';

export type DeviceType = 'Celular' | 'Smartphone' | 'Notebook' | 'Computador' | 'Videogame' | 'Tablet' | 'Outro';

export interface Device {
  id: string;
  type: DeviceType;
  brand: string;
  model: string;
  serialNumber: string;
  color: string;
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  birthDate?: string;
  phone: string;
  whatsapp: string;
  email: string;
  document: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notes: string;
  customer_origin?: string;
  createdAt: string;
  devices: Device[];
}

interface ClientesModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
    [key: string]: unknown;
  };
  onBack: () => void;
  onShowToast: (msg: string) => void;
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

type ViewState = 'LIST' | 'FORM' | 'PROFILE' | 'DEVICE_FORM';

export default function ClientesModule({ profile, onBack, onShowToast, onLogActivity, customers, setCustomers }: ClientesModuleProps) {
  const [view, setView] = useState<ViewState>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDevice, setIsSavingDevice] = useState(false);

  const canEdit = profile.type === 'ADM' || profile.type === 'Atendente';

  const handleCreateCustomer = () => {
    if (!canEdit) {
      onShowToast('Acesso negado');
      return;
    }
    setEditingCustomer(null);
    setView('FORM');
  };

  const handleEditCustomer = (customer: Customer) => {
    if (!canEdit) {
      onShowToast('Acesso negado');
      return;
    }
    setEditingCustomer(customer);
    setView('FORM');
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!canEdit) {
      onShowToast('Acesso negado');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Cliente',
      message: 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('customers').delete().eq('id', id);
          if (error) throw error;
          
          setCustomers(customers.filter(c => c.id !== id));
          onShowToast('Cliente excluído com sucesso');
          onLogActivity?.('CLIENTES', 'EXCLUIU CLIENTE', {
            customerId: id,
            description: `Excluiu o cadastro do cliente do sistema`
          });
          if (view === 'PROFILE' && selectedCustomer?.id === id) {
            setView('LIST');
          }
        } catch (error) {
          console.error('Error deleting customer:', error);
          onShowToast('Erro ao excluir cliente no servidor');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setView('PROFILE');
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'devices'>) => {
    setIsSaving(true);
    try {
      if (editingCustomer) {
        const { error } = await supabase.from('customers').update({
          name: customerData.name,
          birth_date: customerData.birthDate || null,
          phone: customerData.phone,
          whatsapp: customerData.whatsapp,
          email: customerData.email,
          document: customerData.document,
          address: customerData.address,
          notes: customerData.notes,
          customer_origin: customerData.customer_origin || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editingCustomer.id).eq('company_id', profile.company_id);
        if (error) throw error;
        
        const updatedCustomer = { ...editingCustomer, ...customerData };
        setCustomers(customers.map(c => c.id === editingCustomer.id ? updatedCustomer : c));
        onShowToast('Cliente atualizado com sucesso');
        onLogActivity?.('CLIENTES', 'EDITOU CLIENTE', {
          customerId: editingCustomer.id,
          customerName: customerData.name,
          customerDocument: customerData.document,
          customerPhone: customerData.whatsapp || customerData.phone,
          description: `Editou informações do cliente ${customerData.name}`
        });
        if (selectedCustomer?.id === editingCustomer.id) {
          setSelectedCustomer(updatedCustomer);
        }
      } else {
        const customerId = crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('customers').insert({
          id: customerId,
          company_id: profile.company_id,
          name: customerData.name,
          birth_date: customerData.birthDate || null,
          phone: customerData.phone,
          whatsapp: customerData.whatsapp,
          email: customerData.email,
          document: customerData.document,
          address: customerData.address,
          notes: customerData.notes,
          customer_origin: customerData.customer_origin || null,
          devices: [],
          created_at: now,
          updated_at: now,
        });
        if (error) throw error;
        
        const newCustomer: Customer = {
          ...customerData,
          id: customerId,
          createdAt: now,
          devices: []
        };
        setCustomers([...customers, newCustomer]);
        onShowToast('Cliente cadastrado com sucesso');
        onLogActivity?.('CLIENTES', 'CRIOU CLIENTE', {
          customerId: customerId,
          customerName: customerData.name,
          customerDocument: customerData.document,
          customerPhone: customerData.whatsapp || customerData.phone,
          description: `Cadastrou o novo cliente ${customerData.name}`
        });
      }
      setView(selectedCustomer ? 'PROFILE' : 'LIST');
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const errorMsg = error?.message || (typeof error === 'string' ? error : 'Erro desconhecido');
      const errorDetails = error?.details || '';
      onShowToast(`Erro ao salvar cliente: ${errorMsg} ${errorDetails}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDevice = () => {
    if (!canEdit) {
      onShowToast('Acesso negado');
      return;
    }
    setEditingDevice(null);
    setView('DEVICE_FORM');
  };

  const handleEditDevice = (device: Device) => {
    if (!canEdit) {
      onShowToast('Acesso negado');
      return;
    }
    setEditingDevice(device);
    setView('DEVICE_FORM');
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!canEdit) {
      onShowToast('Acesso negado');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Aparelho',
      message: 'Tem certeza que deseja excluir este aparelho?',
      onConfirm: async () => {
        try {
          const updatedDevices = selectedCustomer!.devices.filter(d => d.id !== deviceId);
          const updatedCustomer = { ...selectedCustomer!, devices: updatedDevices };
          
          const { error } = await supabase.from('customers').update({
            devices: updatedDevices,
            updated_at: new Date().toISOString(),
          }).eq('id', updatedCustomer.id).eq('company_id', profile.company_id);
          if (error) throw error;

          setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
          setSelectedCustomer(updatedCustomer);
          onShowToast('Aparelho excluído com sucesso');
        } catch (error) {
          console.error('Error deleting device:', error);
          onShowToast('Erro ao excluir aparelho no servidor');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleSaveDevice = async (deviceData: Omit<Device, 'id'>) => {
    setIsSavingDevice(true);
    try {
      let updatedDevices;
      if (editingDevice) {
        updatedDevices = selectedCustomer!.devices.map(d => 
          d.id === editingDevice.id ? { ...d, ...deviceData } : d
        );
        onShowToast('Aparelho atualizado com sucesso');
      } else {
        const newDevice: Device = {
          ...deviceData,
          id: crypto.randomUUID()
        };
        updatedDevices = [...selectedCustomer!.devices, newDevice];
        onShowToast('Aparelho cadastrado com sucesso');
      }
      
      const updatedCustomer = { ...selectedCustomer!, devices: updatedDevices };
      
      const { error } = await supabase.from('customers').update({
        devices: updatedDevices,
        updated_at: new Date().toISOString(),
      }).eq('id', updatedCustomer.id).eq('company_id', profile.company_id);
      if (error) throw error;

      setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      setSelectedCustomer(updatedCustomer);
      setView('PROFILE');
    } catch (error) {
      console.error('Error saving device:', error);
      onShowToast('Erro ao salvar aparelho no servidor');
    } finally {
      setIsSavingDevice(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.includes(query) ||
      c.whatsapp.includes(query)
    );
  }, [customers, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#141414]/95 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-4">
          <button
            onClick={() => {
              if (view === 'FORM' || view === 'PROFILE') setView('LIST');
              else if (view === 'DEVICE_FORM') setView('PROFILE');
              else onBack();
            }}
            className="p-2.5 hover:bg-white/5 rounded-sm transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold tracking-tight">
              {view === 'LIST' && 'Clientes'}
              {view === 'FORM' && (editingCustomer ? 'Editar Cliente' : 'Novo Cliente')}
              {view === 'PROFILE' && 'Perfil do Cliente'}
              {view === 'DEVICE_FORM' && (editingDevice ? 'Editar Aparelho' : 'Novo Aparelho')}
            </h1>
            <p className="text-[10px] text-[#00E676] font-semibold tracking-[0.2em] uppercase leading-none mt-0.5">Módulo CRM</p>
          </div>
          {view === 'LIST' && (
            <button
              onClick={handleCreateCustomer}
              className="flex items-center gap-2 bg-[#00E676] hover:bg-[#00C853] active:scale-95 text-black px-5 py-2.5 rounded-md font-bold text-sm transition-all shrink-0 shadow-lg shadow-[#00E676]/20"
            >
              <Plus size={16} />
              Novo Cliente
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-5 py-8 pb-24">
        {view === 'LIST' && (
          <div className="space-y-6">

            {/* Search bar row */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-semibold text-sm">{customers.length}</span>
                <span className="text-zinc-600 text-sm">cliente{customers.length !== 1 ? 's' : ''} cadastrado{customers.length !== 1 ? 's' : ''}</span>
                {searchQuery && (
                  <span className="text-zinc-500 text-xs ml-1">· {filteredCustomers.length} resultado{filteredCustomers.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-md pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all placeholder:text-zinc-600"
                  placeholder="Buscar por nome, telefone..."
                />
              </div>
            </div>

            {/* Customer Cards */}
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-md flex items-center justify-center text-zinc-600 mb-5 border border-zinc-800">
                  <Search size={32} />
                </div>
                <p className="text-zinc-300 font-semibold text-lg mb-1">Nenhum cliente encontrado</p>
                <p className="text-zinc-600 text-sm">Tente ajustar a busca ou cadastre um novo cliente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCustomers.map((customer, idx) => {
                  const initials = customer.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                  return (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className="group relative bg-[#181818] hover:bg-[#1E1E1E] border border-zinc-800/60 hover:border-zinc-700 rounded-md p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-black/40"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-md bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate text-sm">{customer.name}</p>
                          {customer.email && <p className="text-xs text-zinc-500 truncate mt-0.5">{customer.email}</p>}
                        </div>
                      </div>

                      {/* Info row */}
                      <div className="space-y-1.5 mb-4">
                        {(customer.whatsapp || customer.phone) && (
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Phone size={12} className="shrink-0" />
                            <span className="text-xs truncate">{customer.whatsapp || customer.phone}</span>
                          </div>
                        )}
                        {customer.address?.city && (
                          <div className="flex items-center gap-2 text-zinc-400">
                            <MapPin size={12} className="shrink-0" />
                            <span className="text-xs truncate">{customer.address.city}{customer.address.state ? `, ${customer.address.state}` : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                        <span className="text-[10px] text-zinc-600 font-medium">{new Date(customer.createdAt).toLocaleDateString('pt-BR')}</span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-2.5 py-0.5 rounded-full">
                          <Smartphone size={10} />
                          {customer.devices.length} aparelho{customer.devices.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={e => { e.stopPropagation(); handleEditCustomer(customer); }}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-sm text-zinc-400 hover:text-[#00E676] transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteCustomer(customer.id); }}
                          className="p-1.5 bg-zinc-800 hover:bg-red-500/20 rounded-sm text-zinc-400 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'FORM' && (
          <CustomerForm 
            initialData={editingCustomer} 
            onSave={handleSaveCustomer} 
            onCancel={() => setView(selectedCustomer ? 'PROFILE' : 'LIST')}
            onShowToast={onShowToast}
            isSaving={isSaving}
          />
        )}

        {view === 'PROFILE' && selectedCustomer && (() => {
          const initials = selectedCustomer.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
          return (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="relative rounded-md overflow-hidden border border-white/5 bg-gradient-to-br from-[#00E676]/8 via-[#181818] to-[#141414]">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">{selectedCustomer.name}</h2>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {selectedCustomer.document && (
                          <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                            <FileText size={11} /> {selectedCustomer.document}
                          </span>
                        )}
                        {selectedCustomer.birthDate && (
                          <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                            <Calendar size={11} /> Nasc: {new Date(selectedCustomer.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                          <Calendar size={11} /> desde {new Date(selectedCustomer.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEditCustomer(selectedCustomer)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-md text-sm font-semibold transition-all"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-md text-sm font-semibold transition-all"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </div>

                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/20 border border-white/5 rounded-md p-4 text-center">
                      <div className="text-2xl font-black text-[#00E676]">{selectedCustomer.devices.length}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Aparelhos</div>
                    </div>
                    <div className="bg-black/20 border border-white/5 rounded-md p-4 text-center">
                      <div className="text-sm font-bold text-white truncate">{selectedCustomer.address?.city || '—'}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Cidade</div>
                    </div>
                    <div className="bg-black/20 border border-white/5 rounded-md p-4 text-center">
                      <div className="text-sm font-bold text-white">{new Date(selectedCustomer.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Cadastro</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact */}
                <div className="bg-[#181818] border border-zinc-800/60 rounded-md p-6 space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Contato</h3>
                  {[
                    { icon: <Smartphone size={15} />, label: 'WhatsApp', value: selectedCustomer.whatsapp },
                    { icon: <Phone size={15} />, label: 'Telefone', value: selectedCustomer.phone },
                    { icon: <Mail size={15} />, label: 'Email', value: selectedCustomer.email },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-sm bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-400">
                        {row.icon}
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">{row.label}</p>
                        <p className="text-sm text-white font-medium">{row.value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Address + Notes */}
                <div className="bg-[#181818] border border-zinc-800/60 rounded-md p-6 space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Endereço &amp; Observações</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-sm bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 text-zinc-400">
                      <MapPin size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">Endereço</p>
                      <p className="text-sm text-white font-medium leading-relaxed">
                        {selectedCustomer.address?.street ? (
                          <>
                            {selectedCustomer.address.street}{selectedCustomer.address.number ? `, ${selectedCustomer.address.number}` : ''}<br />
                            {selectedCustomer.address.neighborhood && <>{selectedCustomer.address.neighborhood} — </>}
                            {selectedCustomer.address.city}{selectedCustomer.address.state ? `/${selectedCustomer.address.state}` : ''}<br />
                            {selectedCustomer.address.zipCode && <span className="text-zinc-500 text-xs">CEP {selectedCustomer.address.zipCode}</span>}
                          </>
                        ) : '—'}
                      </p>
                    </div>
                  </div>
                  {selectedCustomer.notes && (
                    <div className="flex items-start gap-3 pt-3 border-t border-zinc-800/60">
                      <div className="w-9 h-9 rounded-sm bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 text-zinc-400">
                        <AlertCircle size={15} />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">Observações</p>
                        <p className="text-sm text-white">{selectedCustomer.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Devices Section */}
              <div className="bg-[#181818] border border-zinc-800/60 rounded-md overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-800/60 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-white">Aparelhos do Cliente</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Dispositivos vinculados a este cliente</p>
                  </div>
                  <button
                    onClick={handleAddDevice}
                    className="flex items-center gap-2 bg-[#00E676]/10 hover:bg-[#00E676]/20 border border-[#00E676]/20 text-[#00E676] px-4 py-2.5 rounded-md text-sm font-bold transition-all shrink-0"
                  >
                    <Plus size={15} />
                    Adicionar Aparelho
                  </button>
                </div>

                {selectedCustomer.devices.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-md flex items-center justify-center text-zinc-600 mb-4 border border-zinc-800/60" style={{ backgroundColor: `#00E67610` }}>
                      <Box size={28} style={{ color: '#00E676', opacity: 0.6 }} />
                    </div>
                    <p className="text-zinc-400 font-semibold mb-1">Nenhum aparelho cadastrado</p>
                    <p className="text-zinc-600 text-sm">Adicione um dispositivo para este cliente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {selectedCustomer.devices.map(device => (
                      <div key={device.id} className="bg-[#111111] border border-zinc-800/60 hover:border-zinc-700 rounded-md p-5 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-md flex items-center justify-center" style={{ backgroundColor: `#00E67618` }}>
                              <span style={{ color: '#00E676' }}>
                                {device.type === 'Smartphone' && <Smartphone size={20} />}
                                {device.type === 'Notebook' && <Laptop size={20} />}
                                {device.type === 'Computador' && <Monitor size={20} />}
                                {device.type === 'Videogame' && <Gamepad2 size={20} />}
                                {device.type === 'Tablet' && <Tablet size={20} />}
                                {device.type === 'Outro' && <Box size={20} />}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{device.brand} {device.model}</p>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">{device.type}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditDevice(device)} className="p-1.5 text-zinc-500 hover:text-[#00E676] hover:bg-zinc-800 rounded-sm transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDeleteDevice(device.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-sm transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs border-t border-zinc-800/60 pt-3 mt-3">
                          <div className="flex justify-between">
                            <span className="text-zinc-600">IMEI/Serial</span>
                            <span className="text-zinc-300 font-mono">{device.serialNumber || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-600">Cor</span>
                            <span className="text-zinc-300">{device.color || '—'}</span>
                          </div>
                          {device.notes && (
                            <div className="pt-2 mt-1 border-t border-zinc-800/40">
                              <span className="text-zinc-600 block mb-0.5">Obs.</span>
                              <span className="text-zinc-400 line-clamp-2">{device.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {view === 'DEVICE_FORM' && (
          <DeviceForm
            initialData={editingDevice}
            onSave={handleSaveDevice}
            onCancel={() => setView('PROFILE')}
            isSaving={isSavingDevice}
          />
        )}

        {/* Confirm Modal */}
        <AnimatePresence>
          {confirmModal && confirmModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1A1A1A] border border-zinc-800 rounded-md p-6 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
                <p className="text-zinc-400 text-sm mb-6">{confirmModal.message}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-sm font-bold transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-components for Form ---

function CustomerForm({ initialData, onSave, onCancel, onShowToast, isSaving }: { initialData: Customer | null, onSave: (data: Omit<Customer, 'id' | 'devices' | 'createdAt'>) => void, onCancel: () => void, onShowToast: (msg: string) => void, isSaving: boolean }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    birthDate: initialData?.birthDate || '',
    phone: initialData?.phone || '',
    whatsapp: initialData?.whatsapp || '',
    email: initialData?.email || '',
    document: initialData?.document || '',
    notes: initialData?.notes || '',
    address: {
      street: initialData?.address.street || '',
      number: initialData?.address.number || '',
      neighborhood: initialData?.address.neighborhood || '',
      city: initialData?.address.city || '',
      state: initialData?.address.state || '',
      zipCode: initialData?.address.zipCode || ''
    },
    customer_origin: initialData?.customer_origin || ''
  });

  const [whatsappCountry, setWhatsappCountry] = useState<Country>(countries[0]);
  const [phoneCountry, setPhoneCountry] = useState<Country>(countries[0]);

  // Pre-fill countries if editing and data exists
  useEffect(() => {
    if (initialData) {
      if (initialData.whatsapp?.startsWith('+')) {
        const dial = initialData.whatsapp.split(' ')[0];
        const country = countries.find(c => c.dialCode === dial);
        if (country) {
          setWhatsappCountry(country);
          setFormData(prev => ({ ...prev, whatsapp: initialData.whatsapp.replace(dial, '').trim() }));
        }
      }
      if (initialData.phone?.startsWith('+')) {
        const dial = initialData.phone.split(' ')[0];
        const country = countries.find(c => c.dialCode === dial);
        if (country) {
          setPhoneCountry(country);
          setFormData(prev => ({ ...prev, phone: initialData.phone.replace(dial, '').trim() }));
        }
      }
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine country code with number before saving
    const finalData = {
      ...formData,
      whatsapp: formData.whatsapp ? `${whatsappCountry.dialCode} ${formData.whatsapp}` : '',
      phone: formData.phone ? `${phoneCountry.dialCode} ${formData.phone}` : ''
    };
    
    onSave(finalData);
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    
    let brasilApiData = null;
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      if (response.ok) {
        brasilApiData = await response.json();
      }
    } catch (e) {
      console.warn('BrasilAPI fallback needed:', e);
    }

    try {
      if (brasilApiData) {
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            street: brasilApiData.street || prev.address.street,
            neighborhood: brasilApiData.neighborhood || prev.address.neighborhood,
            city: brasilApiData.city || prev.address.city,
            state: brasilApiData.state || prev.address.state
          }
        }));
        return;
      }

      // Fallback para ViaCEP
      const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const viaCepData = await viaCepResponse.json();
      
      if (viaCepData.erro) {
        onShowToast('CEP não encontrado. Verifique o número informado.');
      } else {
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            street: viaCepData.logradouro || prev.address.street,
            neighborhood: viaCepData.bairro || prev.address.neighborhood,
            city: viaCepData.localidade || prev.address.city,
            state: viaCepData.uf || prev.address.state
          }
        }));
      }
    } catch (error) {
      console.error('CEP lookup error:', error);
      onShowToast('Erro ao consultar o CEP. Verifique sua conexão.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let finalValue = value;
    const capFields = ['name', 'address.street', 'address.neighborhood', 'address.city', 'notes'];
    
    if (capFields.includes(name)) {
      finalValue = capFirst(value);
    } else if (name === 'whatsapp' || name === 'phone') {
      finalValue = applyMaskWithCursor(e.target as HTMLInputElement, 'phone');
    } else if (name === 'document') {
      finalValue = applyMaskWithCursor(e.target as HTMLInputElement, 'document');
    }

    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: finalValue } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const originOptions = ['Google', 'Instagram', 'Facebook', 'WhatsApp', 'Indicação', 'Passou na loja', 'Cliente antigo'];

  return (
    <div className="max-w-3xl mx-auto bg-[#1A1A1A] border border-zinc-800 rounded-md p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section>
          <h3 className="text-sm font-bold text-[#00E676] uppercase tracking-wider mb-4">Informações Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Nome Completo *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Data de Nascimento</label>
              <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">WhatsApp</label>
              <div className="flex gap-2">
                <CountryCodePicker selectedCountry={whatsappCountry} onSelect={setWhatsappCountry} />
                <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="(00) 00000-0000" className="flex-1 bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Telefone</label>
              <div className="flex gap-2">
                <CountryCodePicker selectedCountry={phoneCountry} onSelect={setPhoneCountry} />
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 0000-0000" className="flex-1 bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">CPF ou CNPJ</label>
              <input type="tel" name="document" value={formData.document} onChange={handleChange} placeholder="000.000.000-00" className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Origem do Cliente</label>
              <select 
                name="customer_origin" 
                value={formData.customer_origin} 
                onChange={(e) => setFormData(prev => ({ ...prev, customer_origin: e.target.value }))}
                className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all appearance-none"
              >
                <option value="">Selecione a origem</option>
                {originOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Address */}
        <section>
          <h3 className="text-sm font-bold text-[#00E676] uppercase tracking-wider mb-4">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">CEP</label>
              <input type="text" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} onBlur={handleCepBlur} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Rua</label>
              <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Número</label>
              <input type="text" name="address.number" value={formData.address.number} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Bairro</label>
              <input type="text" name="address.neighborhood" value={formData.address.neighborhood} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Cidade</label>
              <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Estado</label>
              <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-sm font-bold text-[#00E676] uppercase tracking-wider mb-4">Observações</h3>
          <div className="space-y-1.5">
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all resize-none" placeholder="Informações adicionais sobre o cliente..."></textarea>
          </div>
        </section>

        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button type="button" onClick={onCancel} disabled={isSaving} className="flex-1 bg-[#222222] hover:bg-zinc-800 text-white font-medium py-3.5 rounded-sm transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className="flex-1 bg-[#00E676] hover:bg-[#00C853] text-black font-bold py-3.5 rounded-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Cliente'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeviceForm({ initialData, onSave, onCancel, isSaving }: { initialData: Device | null, onSave: (data: Omit<Device, 'id' | 'createdAt'>) => void, onCancel: () => void, isSaving: boolean }) {
  const [formData, setFormData] = useState({
        type: initialData?.type || 'Smartphone',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    serialNumber: initialData?.serialNumber || '',
    color: initialData?.color || '',
    notes: initialData?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, type: formData.type as DeviceType });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const capFields = ['brand', 'model', 'color', 'notes'];
    const finalValue = capFields.includes(name) ? capFirst(value) : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#1A1A1A] border border-zinc-800 rounded-md p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-sm font-bold text-[#00E676] uppercase tracking-wider mb-4">Detalhes do Aparelho</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Tipo de Aparelho *</label>
            <div className="relative">
              <select name="type" required value={formData.type} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all appearance-none">
                <option value="Smartphone">Smartphone</option>
                <option value="Notebook">Notebook</option>
                <option value="Computador">Computador</option>
                <option value="Videogame">Videogame</option>
                <option value="Tablet">Tablet</option>
                <option value="Outro">Outro</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Marca *</label>
            <input required type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" placeholder="Ex: Samsung, Apple" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Modelo *</label>
            <input required type="text" name="model" value={formData.model} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" placeholder="Ex: Galaxy S21, iPhone 13" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Cor</label>
            <input type="text" name="color" value={formData.color} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">IMEI ou Número de Série</label>
            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all font-mono" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Observações sobre o aparelho</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full bg-[#222222] border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all resize-none" placeholder="Ex: Tela trincada, botão volume falhando..."></textarea>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button type="button" onClick={onCancel} disabled={isSaving} className="flex-1 bg-[#222222] hover:bg-zinc-800 text-white font-medium py-3.5 rounded-sm transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className="flex-1 bg-[#00E676] hover:bg-[#00C853] text-black font-bold py-3.5 rounded-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Aparelho'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

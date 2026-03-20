import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Search, Plus, Edit2, Trash2, Eye, 
  Smartphone, Laptop, Monitor, Gamepad2, Tablet, Box,
  MapPin, Phone, Mail, FileText, Calendar, AlertCircle
} from 'lucide-react';
import { supabase } from '../supabase';

export type DeviceType = 'Celular' | 'Notebook' | 'Computador' | 'Videogame' | 'Tablet' | 'Outro';

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
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

type ViewState = 'LIST' | 'FORM' | 'PROFILE' | 'DEVICE_FORM';

export default function ClientesModule({ profile, onBack, onShowToast, customers, setCustomers }: ClientesModuleProps) {
  const [view, setView] = useState<ViewState>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

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
          updated_at: new Date().toISOString(),
        }).eq('id', editingCustomer.id);
        if (error) throw error;
        
        const updatedCustomer = { ...editingCustomer, ...customerData };
        setCustomers(customers.map(c => c.id === editingCustomer.id ? updatedCustomer : c));
        onShowToast('Cliente atualizado com sucesso');
        if (selectedCustomer?.id === editingCustomer.id) {
          setSelectedCustomer(updatedCustomer);
        }
      } else {
        const customerId = Date.now().toString();
        const now = new Date().toISOString();
        const { error } = await supabase.from('customers').insert({
          id: customerId,
          name: customerData.name,
          birth_date: customerData.birthDate || null,
          phone: customerData.phone,
          whatsapp: customerData.whatsapp,
          email: customerData.email,
          document: customerData.document,
          address: customerData.address,
          notes: customerData.notes,
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
      }
      setView(selectedCustomer ? 'PROFILE' : 'LIST');
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const errorMsg = error?.message || (typeof error === 'string' ? error : 'Erro desconhecido');
      const errorDetails = error?.details || '';
      onShowToast(`Erro ao salvar cliente: ${errorMsg} ${errorDetails}`);
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
          }).eq('id', updatedCustomer.id);
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
          id: Date.now().toString()
        };
        updatedDevices = [...selectedCustomer!.devices, newDevice];
        onShowToast('Aparelho cadastrado com sucesso');
      }
      
      const updatedCustomer = { ...selectedCustomer!, devices: updatedDevices };
      
      const { error } = await supabase.from('customers').update({
        devices: updatedDevices,
        updated_at: new Date().toISOString(),
      }).eq('id', updatedCustomer.id);
      if (error) throw error;

      setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      setSelectedCustomer(updatedCustomer);
      setView('PROFILE');
    } catch (error) {
      console.error('Error saving device:', error);
      onShowToast('Erro ao salvar aparelho no servidor');
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
    <div className="min-h-screen flex flex-col bg-[#121212] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#1A1A1A] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => {
              if (view === 'FORM' || view === 'PROFILE') setView('LIST');
              else if (view === 'DEVICE_FORM') setView('PROFILE');
              else onBack();
            }} 
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {view === 'LIST' && 'Clientes'}
              {view === 'FORM' && (editingCustomer ? 'Editar Cliente' : 'Novo Cliente')}
              {view === 'PROFILE' && 'Perfil do Cliente'}
              {view === 'DEVICE_FORM' && (editingDevice ? 'Editar Aparelho' : 'Novo Aparelho')}
            </h1>
            <p className="text-[10px] text-[#00E676] font-medium tracking-wider uppercase leading-none mt-0.5">
              Módulo CRM
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 pb-24">
        {view === 'LIST' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
                  <Search size={18} />
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all placeholder:text-zinc-600" 
                  placeholder="Buscar por nome ou telefone..." 
                />
              </div>
              <button 
                onClick={handleCreateCustomer}
                className="flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black px-6 py-3 rounded-2xl font-bold transition-colors shrink-0"
              >
                <Plus size={18} />
                Novo Cliente
              </button>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-3xl overflow-hidden">
              {filteredCustomers.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center text-zinc-500 mb-4">
                    <Search size={24} />
                  </div>
                  <p className="text-zinc-400 font-medium">Nenhum cliente encontrado.</p>
                  <p className="text-sm text-zinc-500 mt-1">Tente buscar por outro termo ou cadastre um novo cliente.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                        <th className="p-4 font-medium">Nome do Cliente</th>
                        <th className="p-4 font-medium">Telefone</th>
                        <th className="p-4 font-medium text-center">Aparelhos</th>
                        <th className="p-4 font-medium">Data Cadastro</th>
                        <th className="p-4 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredCustomers.map(customer => (
                        <tr key={customer.id} className="hover:bg-zinc-800/20 transition-colors group">
                          <td className="p-4">
                            <div className="font-medium text-white">{customer.name}</div>
                            {customer.email && <div className="text-xs text-zinc-500 mt-0.5">{customer.email}</div>}
                          </td>
                          <td className="p-4 text-zinc-300">{customer.phone}</td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center bg-zinc-800 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full">
                              {customer.devices.length}
                            </span>
                          </td>
                          <td className="p-4 text-zinc-400 text-sm">
                            {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleViewCustomer(customer)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Visualizar">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => handleEditCustomer(customer)} className="p-2 text-zinc-400 hover:text-[#00E676] hover:bg-zinc-800 rounded-lg transition-colors" title="Editar">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeleteCustomer(customer.id)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors" title="Excluir">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'FORM' && (
          <CustomerForm 
            initialData={editingCustomer} 
            onSave={handleSaveCustomer} 
            onCancel={() => setView(selectedCustomer ? 'PROFILE' : 'LIST')} 
          />
        )}

        {view === 'PROFILE' && selectedCustomer && (
          <div className="space-y-6">
            {/* Customer Info Card */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedCustomer.name}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-[#00E676]" />
                      Cadastrado em {new Date(selectedCustomer.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    {selectedCustomer.document && (
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} className="text-[#00E676]" />
                        {selectedCustomer.document}
                      </div>
                    )}
                    {selectedCustomer.birthDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-[#00E676]" />
                        Nasc: {new Date(selectedCustomer.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditCustomer(selectedCustomer)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <Edit2 size={14} />
                    Editar
                  </button>
                  <button onClick={() => handleDeleteCustomer(selectedCustomer.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-colors">
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Contato</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 shrink-0">
                      <Smartphone size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-0.5">WhatsApp</p>
                      <p className="text-white font-medium">{selectedCustomer.whatsapp || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 shrink-0">
                      <Phone size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-0.5">Telefone</p>
                      <p className="text-white font-medium">{selectedCustomer.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 shrink-0">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-0.5">Email</p>
                      <p className="text-white font-medium">{selectedCustomer.email || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Endereço & Observações</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-0.5">Endereço Completo</p>
                      <p className="text-white font-medium text-sm leading-relaxed">
                        {selectedCustomer.address.street ? (
                          <>
                            {selectedCustomer.address.street}, {selectedCustomer.address.number}<br/>
                            {selectedCustomer.address.neighborhood} - {selectedCustomer.address.city}/{selectedCustomer.address.state}<br/>
                            CEP: {selectedCustomer.address.zipCode}
                          </>
                        ) : '-'}
                      </p>
                    </div>
                  </div>
                  {selectedCustomer.notes && (
                    <div className="flex items-start gap-3 mt-4">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 shrink-0">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400 mb-0.5">Observações</p>
                        <p className="text-white text-sm">{selectedCustomer.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Devices Section */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Aparelhos do Cliente</h3>
                  <p className="text-sm text-zinc-400">Gerencie os dispositivos vinculados a este cliente.</p>
                </div>
                <button 
                  onClick={handleAddDevice}
                  className="flex items-center gap-2 bg-[#222222] hover:bg-zinc-800 border border-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0"
                >
                  <Plus size={16} className="text-[#00E676]" />
                  Adicionar Aparelho
                </button>
              </div>

              {selectedCustomer.devices.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center text-zinc-500 mb-4">
                    <Box size={24} />
                  </div>
                  <p className="text-zinc-400 font-medium">Nenhum aparelho cadastrado.</p>
                  <p className="text-sm text-zinc-500 mt-1">Clique em &quot;Adicionar Aparelho&quot; para registrar um dispositivo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {selectedCustomer.devices.map(device => (
                    <div key={device.id} className="bg-[#222222] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-[#00E676]">
                            {device.type === 'Celular' && <Smartphone size={20} />}
                            {device.type === 'Notebook' && <Laptop size={20} />}
                            {device.type === 'Computador' && <Monitor size={20} />}
                            {device.type === 'Videogame' && <Gamepad2 size={20} />}
                            {device.type === 'Tablet' && <Tablet size={20} />}
                            {device.type === 'Outro' && <Box size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-white">{device.brand} {device.model}</p>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">{device.type}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditDevice(device)} className="p-1.5 text-zinc-400 hover:text-[#00E676] hover:bg-zinc-800 rounded-lg transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteDevice(device.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">IMEI/Serial:</span>
                          <span className="text-zinc-300 font-mono text-xs">{device.serialNumber || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Cor:</span>
                          <span className="text-zinc-300">{device.color || '-'}</span>
                        </div>
                        {device.notes && (
                          <div className="pt-2 mt-2 border-t border-zinc-800/50">
                            <span className="text-zinc-500 block mb-1">Obs:</span>
                            <span className="text-zinc-300 text-xs line-clamp-2">{device.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'DEVICE_FORM' && (
          <DeviceForm 
            initialData={editingDevice} 
            onSave={handleSaveDevice} 
            onCancel={() => setView('PROFILE')} 
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
                className="bg-[#1A1A1A] border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
                <p className="text-zinc-400 text-sm mb-6">{confirmModal.message}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors"
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

function CustomerForm({ initialData, onSave, onCancel }: { initialData: Customer | null, onSave: (data: Omit<Customer, 'id' | 'devices' | 'createdAt'>) => void, onCancel: () => void }) {
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
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-[#1A1A1A] border border-zinc-800 rounded-3xl p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section>
          <h3 className="text-sm font-bold text-[#00E676] uppercase tracking-wider mb-4">Informações Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Nome Completo *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Data de Nascimento</label>
              <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">WhatsApp</label>
              <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Telefone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">CPF ou CNPJ</label>
              <input type="text" name="document" value={formData.document} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
          </div>
        </section>

        {/* Address */}
        <section>
          <h3 className="text-sm font-bold text-[#00E676] uppercase tracking-wider mb-4">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">CEP</label>
              <input type="text" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Rua</label>
              <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Número</label>
              <input type="text" name="address.number" value={formData.address.number} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Bairro</label>
              <input type="text" name="address.neighborhood" value={formData.address.neighborhood} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Cidade</label>
              <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Estado</label>
              <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
            </div>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-sm font-bold text-[#00E676] uppercase tracking-wider mb-4">Observações</h3>
          <div className="space-y-1.5">
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all resize-none" placeholder="Informações adicionais sobre o cliente..."></textarea>
          </div>
        </section>

        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button type="button" onClick={onCancel} className="flex-1 bg-[#222222] hover:bg-zinc-800 text-white font-medium py-3.5 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" className="flex-1 bg-[#00E676] hover:bg-[#00C853] text-black font-bold py-3.5 rounded-xl transition-colors">
            Salvar Cliente
          </button>
        </div>
      </form>
    </div>
  );
}

function DeviceForm({ initialData, onSave, onCancel }: { initialData: Device | null, onSave: (data: Omit<Device, 'id' | 'createdAt'>) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    type: initialData?.type || 'Celular',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    serialNumber: initialData?.serialNumber || '',
    color: initialData?.color || '',
    notes: initialData?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#1A1A1A] border border-zinc-800 rounded-3xl p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-sm font-bold text-[#00E676] uppercase tracking-wider mb-4">Detalhes do Aparelho</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Tipo de Aparelho *</label>
            <div className="relative">
              <select name="type" required value={formData.type} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all appearance-none">
                <option value="Celular">Celular</option>
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
            <input required type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" placeholder="Ex: Samsung, Apple" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Modelo *</label>
            <input required type="text" name="model" value={formData.model} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" placeholder="Ex: Galaxy S21, iPhone 13" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Cor</label>
            <input type="text" name="color" value={formData.color} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">IMEI ou Número de Série</label>
            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all font-mono" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Observações sobre o aparelho</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full bg-[#222222] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all resize-none" placeholder="Ex: Tela trincada, botão volume falhando..."></textarea>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button type="button" onClick={onCancel} className="flex-1 bg-[#222222] hover:bg-zinc-800 text-white font-medium py-3.5 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" className="flex-1 bg-[#00E676] hover:bg-[#00C853] text-black font-bold py-3.5 rounded-xl transition-colors">
            Salvar Aparelho
          </button>
        </div>
      </form>
    </div>
  );
}

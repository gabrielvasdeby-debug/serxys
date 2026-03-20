import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  ArrowLeft, Search, Plus, User, Smartphone, 
  CheckCircle2, AlertCircle, AlertTriangle, Save, Printer, MessageCircle,
  Check, X, Banknote, FileText, PenTool, Grid, Eye, Trash2
} from 'lucide-react';
import { Customer, DeviceType } from './ClientesModule';
import { Transaction } from './CaixaModule';
import PatternLock from './PatternLock';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../supabase';
import OrderPrintTemplate from './OrderPrintTemplate';
import ThermalReceiptTemplate from './ThermalReceiptTemplate';
import VisualController from './VisualController';
import { Order, OrderStatus, OrderPriority, OrderCompletionData } from '../types';
// Removed firebase imports to use Supabase instead.


interface OrdemServicoModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
    [key: string]: unknown;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  osSettings: any;
  setOsSettings: (v: any) => void | Promise<void>;
  companySettings: any;
  initialOrder?: Order | null;
}

// Signature Pad Component
const SignaturePad = ({ title, onSave, onClear }: { title: string, onSave: (dataUrl: string) => void, onClear: () => void }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsConfirmed(false);
    setHasDrawing(false);
    onClear();
  };

  const redo = () => {
    sigCanvas.current?.clear();
    setIsConfirmed(false);
    setHasDrawing(false);
    onClear();
  };

  const confirm = () => {
    if (sigCanvas.current?.isEmpty()) {
      return;
    }
    const dataUrl = sigCanvas.current?.getCanvas().toDataURL('image/png');
    if (dataUrl) {
      setIsConfirmed(true);
      onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">{title}</label>
        {isConfirmed && (
          <span className="text-xs text-[#00E676] flex items-center gap-1 font-medium">
            <CheckCircle2 size={14} /> Assinatura Confirmada
          </span>
        )}
      </div>
      
      {!isConfirmed ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <PenTool size={18} />
          Adicionar Assinatura
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <PenTool size={18} />
            Ver / Editar Assinatura
          </button>
          <button
            onClick={clear}
            className="py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-medium flex items-center justify-center transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={`bg-white border-2 rounded-2xl overflow-hidden relative transition-colors ${isConfirmed ? 'border-[#00E676]' : 'border-zinc-700'}`}>
                {!hasDrawing && !isConfirmed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                    <span className="text-zinc-500 text-lg font-medium select-none">Assine aqui</span>
                  </div>
                )}
                
                <div className={isConfirmed ? 'pointer-events-none opacity-80' : ''}>
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{
                      className: "w-full h-[200px] cursor-crosshair touch-none"
                    }}
                    onBegin={() => setHasDrawing(true)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-6">
                <button 
                  onClick={clear}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Limpar
                </button>
                <button 
                  onClick={redo}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Refazer
                </button>
                <button 
                  onClick={() => {
                    confirm();
                    setIsOpen(false);
                  }}
                  disabled={isConfirmed || !hasDrawing}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                    isConfirmed || !hasDrawing
                      ? 'bg-[#00E676]/20 text-[#00E676]/50 cursor-not-allowed' 
                      : 'bg-[#00E676] hover:bg-[#00C853] text-black'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



export default function OrdemServicoModule({
  profile,
  onBack,
  onShowToast,
  customers,
  setCustomers,
  orders,
  setOrders,
  osSettings,
  setOsSettings,
  companySettings,
  initialOrder
}: OrdemServicoModuleProps) {
  const [step, setStep] = useState<'CLIENT' | 'DETAILS'>('CLIENT');
  
  // Client Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  
  // New Customer Form State (Full)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    birthDate: '',
    phone: '',
    whatsapp: '',
    email: '',
    document: '',
    notes: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  // OS Form State
  const [equipment, setEquipment] = useState<Order['equipment']>({
    type: '',
    brand: '',
    model: '',
    serial: '',
    color: '',
    passwordType: 'none',
    passwordValue: ''
  });
  
  const [checklist, setChecklist] = useState<Order['checklist']>({});
  const [checklistNotes, setChecklistNotes] = useState('');
  const [defect, setDefect] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [service, setService] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('Média');
  const [showVisualChecklist, setShowVisualChecklist] = useState(false);
  
  const [financials, setFinancials] = useState<Order['financials']>({
    totalValue: 0,
    paymentType: '',
    paymentStatus: 'Pendente',
    amountPaid: 0
  });

  const [signatures, setSignatures] = useState<Order['signatures']>({
    technician: null,
    client: null
  });

  const [availableServices, setAvailableServices] = useState<{ id: string, name: string, default_value: number, description: string }[]>([]);

  const [currentCashSession, setCurrentCashSession] = useState<{ id: string; [key: string]: unknown } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Listen for current cash session
  useEffect(() => {
    const fetchSession = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('date', today)
        .eq('status', 'open')
        .single();
      
      if (data) {
        setCurrentCashSession({ id: data.id, ...data });
      } else {
        setCurrentCashSession(null);
      }
    };

    fetchSession();

    // Fetch available services
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, default_value, description')
        .order('name');
      
      if (error) {
        console.error('SUPABASE ERROR (OS Fetch Services):', error.message, error.details, error.hint);
      }
      if (data) {
        setAvailableServices(data);
      }
    };
    fetchServices();
  }, []);

  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);

  // Populate state if editing
  useEffect(() => {
    if (initialOrder) {
      setStep('DETAILS');
      const customer = customers.find(c => c.id === initialOrder.customerId);
      if (customer) setSelectedCustomer(customer);
      
      setEquipment(initialOrder.equipment);
      setChecklist(initialOrder.checklist);
      setChecklistNotes(initialOrder.checklistNotes || '');
      setDefect(initialOrder.defect);
      setTechnicianNotes(initialOrder.technicianNotes || '');
      setService(initialOrder.service || '');
      setPriority(initialOrder.priority);
      setFinancials(initialOrder.financials);
      setSignatures(initialOrder.signatures);
    }
  }, [initialOrder, customers]);
  const [isPatternModalReadOnly, setIsPatternModalReadOnly] = useState(false);

  const [whatsappPrompt, setWhatsappPrompt] = useState<{ isOpen: boolean; newStatus: string; orderId?: string }>({ isOpen: false, newStatus: '' });
  const [whatsappModal, setWhatsappModal] = useState<{ isOpen: boolean; message: string; customerPhone: string }>({ isOpen: false, message: '', customerPhone: '' });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.document && c.document.includes(searchQuery)) ||
    (c.whatsapp && c.whatsapp.includes(searchQuery))
  );

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) {
      onShowToast('Nome do cliente é obrigatório');
      return;
    }
    
    try {
      const customerId = Date.now().toString();
      const now = new Date().toISOString();
      const customerToAdd = {
        id: customerId,
        name: newCustomer.name,
        birth_date: newCustomer.birthDate || null,
        phone: newCustomer.phone,
        whatsapp: newCustomer.whatsapp,
        email: newCustomer.email,
        document: newCustomer.document,
        address: newCustomer.address,
        notes: newCustomer.notes,
        devices: [],
        created_at: now,
        updated_at: now
      };
      
      const { error } = await supabase.from('customers').insert(customerToAdd);
      if (error) throw error;
      
      const customerForState: Customer = {
        ...newCustomer,
        id: customerId,
        devices: [],
        createdAt: now
      };

      setCustomers([...customers, customerForState]);
      setSelectedCustomer(customerForState);
      setIsCreatingCustomer(false);
      setStep('DETAILS');
      onShowToast('Cliente cadastrado com sucesso');
    } catch (error: any) {
      console.error('Error creating customer:', error);
      onShowToast(`Erro ao cadastrar cliente: ${error.message || ''}`);
    }
  };

  const handleSaveOS = async (providedId?: string) => {
    if (!selectedCustomer) {
      onShowToast('Selecione um cliente');
      return;
    }
    if (!equipment.type || !equipment.brand || !equipment.model) {
      onShowToast('Preencha os dados básicos do aparelho');
      return;
    }
    if (!signatures.client) {
      onShowToast('É necessário coletar a assinatura do cliente.');
      return;
    }

    // Check if cash session is open if there's a payment
    if (financials.amountPaid > 0 && !initialOrder) {
      if (!currentCashSession) {
        onShowToast('É necessário abrir o caixa para registrar pagamentos.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const orderId = initialOrder?.id || providedId || Date.now().toString();
      const now = new Date().toISOString();
      
      const osData: any = {
        company_id: companySettings.id || 'main',
        customer_id: selectedCustomer.id,
        equipment,
        checklist,
        checklist_notes: checklistNotes,
        defect,
        technician_notes: technicianNotes,
        service,
        financials,
        signatures,
        priority,
        updated_at: now
      };

      if (initialOrder) {
        osData.status = initialOrder.status;
        osData.history = [
          ...initialOrder.history,
          {
            date: now,
            user: profile.name,
            description: 'Ordem de Serviço editada'
          }
        ];

        const { error: osError } = await supabase.from('orders').update(osData).eq('id', initialOrder.id);
        if (osError) throw osError;

        const updatedOrder: Order = {
          ...initialOrder,
          customerId: selectedCustomer.id,
          equipment,
          checklist,
          checklistNotes,
          defect,
          technicianNotes,
          service,
          financials,
          signatures,
          priority,
          updatedAt: now,
          history: osData.history
        };

        setOrders(orders.map(o => o.id === initialOrder.id ? updatedOrder : o));
        onShowToast(`OS #${initialOrder.osNumber} atualizada com sucesso`);
        onBack();
        return;
      } else {
        osData.id = orderId;
        osData.os_number = osSettings.nextOsNumber;
        osData.status = 'Entrada Registrada';
        osData.created_at = now;
        osData.history = [{
          date: now,
          user: profile.name,
          description: 'Ordem de Serviço criada'
        }];

        const { error: osError } = await supabase.from('orders').insert(osData);
        if (osError) throw osError;
      }

      // Add device to customer if it's new
      const deviceExists = selectedCustomer.devices?.some(d => 
        d.brand === equipment.brand && 
        d.model === equipment.model && 
        (d.serialNumber === equipment.serial || (!d.serialNumber && !equipment.serial))
      );

      let updatedCustomer = selectedCustomer;
      if (!deviceExists) {
        const newDevice = {
          id: Date.now().toString(),
          type: equipment.type as DeviceType,
          brand: equipment.brand,
          model: equipment.model,
          serialNumber: equipment.serial,
          color: equipment.color,
          notes: ''
        };
        
        updatedCustomer = {
          ...selectedCustomer,
          devices: [...(selectedCustomer.devices || []), newDevice]
        };
        
        await supabase.from('customers').update({ 
          devices: updatedCustomer.devices,
          updated_at: now
        }).eq('id', updatedCustomer.id);
        
        setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      }

      // Record transaction in Caixa if there's a payment
      if (financials.paymentStatus !== 'Pendente' && financials.amountPaid > 0) {
        await supabase.from('transactions').insert({
          id: crypto.randomUUID(),
          type: 'entrada',
          description: `Pagamento OS #${osSettings.nextOsNumber} - ${selectedCustomer.name}`,
          value: financials.amountPaid,
          payment_method: (['Dinheiro', 'PIX', 'Cartão', 'Transferência'].includes(financials.paymentType) ? financials.paymentType : 'Dinheiro'),
          date: now.split('T')[0],
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          os_id: osSettings.nextOsNumber.toString(),
          user_id: profile.id,
          session_id: currentCashSession?.id
        });
      }

      // Create Receivable if there is a balance
      const balance = financials.totalValue - (financials.amountPaid || 0);
      if (balance > 0) {
        await supabase.from('receivables').insert({
          id: crypto.randomUUID(),
          description: `Saldo OS #${osSettings.nextOsNumber} - ${equipment.type} ${equipment.brand}`,
          value: balance,
          due_date: now.split('T')[0],
          status: 'pendente',
          customer_name: selectedCustomer.name,
          os_id: orderId
        });
      }

      const orderForState: Order = {
        id: orderId,
        osNumber: osSettings.nextOsNumber,
        customerId: selectedCustomer.id,
        equipment,
        checklist,
        checklistNotes,
        defect,
        technicianNotes,
        service,
        financials,
        signatures,
        status: 'Entrada Registrada',
        priority,
        history: [{
          date: now,
          user: profile.name,
          description: 'Ordem de Serviço criada'
        }],
        createdAt: now,
        updatedAt: now
      } as any;

      setOrders([...orders, orderForState]);
      setOsSettings({ ...osSettings, nextOsNumber: osSettings.nextOsNumber + 1 });
      onShowToast(`OS #${osSettings.nextOsNumber} criada com sucesso`);
      onBack();
      
      // Removed automatic whatsapp prompt here
    } catch (error: any) {
      console.error('Error saving OS:', error);
      onShowToast(`Erro ao criar OS: ${error.message || ''}`);
    }
  };

  const handleWhatsappPromptResponse = (send: boolean) => {
    if (send && whatsappPrompt.orderId && selectedCustomer) {
      const order = orders.find(o => o.id === whatsappPrompt.orderId);
      if (order) {
        if (!selectedCustomer.whatsapp) {
          onShowToast('Cliente sem número de WhatsApp cadastrado');
          return;
        }

        const template = osSettings.whatsappMessages?.[whatsappPrompt.newStatus] || 
          `Olá [nome_cliente], o status da sua OS #[numero_os] foi atualizado para: [status].`;
        
        const portalUrl = `${window.location.origin}/${companySettings.publicSlug}/${order.osNumber}`;
        
        const message = template
          .replace(/\[nome_cliente\]/g, selectedCustomer.name)
          .replace(/\[numero_os\]/g, order.osNumber.toString().padStart(4, '0'))
          .replace(/\[status\]/g, whatsappPrompt.newStatus)
          .replace(/\[marca\]/g, order.equipment.brand)
          .replace(/\[modelo\]/g, order.equipment.model)
          .replace(/\[defeito\]/g, order.defect)
          .replace(/\[data_entrada\]/g, new Date(order.createdAt).toLocaleDateString('pt-BR'))
          .replace(/\[nome_assistencia\]/g, companySettings.name)
          .replace(/\[link_os\]/g, portalUrl);

        setWhatsappModal({
          isOpen: true,
          message,
          customerPhone: selectedCustomer.whatsapp
        });
      } else {
        // stay on screen
      }
    } else {
      // stay on screen
    }
    setWhatsappPrompt({ isOpen: false, newStatus: '' });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col print:bg-white print:text-black print:block">
      {/* Main App Content - Hidden on Print */}
      <div className="print:hidden flex flex-col flex-1">
        {/* Header */}
        <header className="bg-[#141414] border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={step === 'DETAILS' ? () => setStep('CLIENT') : onBack}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-zinc-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Nova Ordem de Serviço
                <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md">
                  #{osSettings.nextOsNumber.toString().padStart(4, '0')}
                </span>
              </h1>
              <p className="text-xs text-zinc-500">Preencha os dados para registrar o serviço</p>
            </div>
          </div>
          
          {step === 'DETAILS' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  document.body.classList.add('print-a4');
                  document.body.classList.remove('print-thermal');
                  window.print();
                }}
                className="bg-[#1A1A1A] hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors border border-zinc-700"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">A4</span>
              </button>
              <button 
                onClick={() => {
                  document.body.classList.add('print-thermal');
                  document.body.classList.remove('print-a4');
                  window.print();
                }}
                className="bg-[#1A1A1A] hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors border border-zinc-700"
              >
                <Printer size={16} className="text-orange-400" />
                <span className="hidden sm:inline">Cupom</span>
              </button>
              <button 
                onClick={() => handleSaveOS()}
                className="bg-[#00E676] hover:bg-[#00C853] text-black px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-[#00E676]/20 active:scale-[0.98]"
              >
                <Save size={18} />
                Salvar OS
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          {step === 'CLIENT' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <User size={20} className="text-[#00E676]" />
                    Selecionar Cliente
                  </h2>
                  <button
                    onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                    className="text-sm text-[#00E676] hover:text-[#00C853] font-medium flex items-center gap-1"
                  >
                    {isCreatingCustomer ? 'Cancelar' : (
                      <>
                        <Plus size={16} />
                        Novo Cliente
                      </>
                    )}
                  </button>
                </div>

                {isCreatingCustomer ? (
                  <form onSubmit={handleCreateCustomer} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={newCustomer.name}
                          onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: João da Silva"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">WhatsApp</label>
                        <input
                          type="text"
                          value={newCustomer.whatsapp}
                          onChange={e => setNewCustomer({...newCustomer, whatsapp: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Telefone</label>
                        <input
                          type="text"
                          value={newCustomer.phone}
                          onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="(00) 0000-0000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">CPF ou CNPJ</label>
                        <input
                          type="text"
                          value={newCustomer.document}
                          onChange={e => setNewCustomer({...newCustomer, document: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">E-mail</label>
                        <input
                          type="email"
                          value={newCustomer.email}
                          onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Data de Nascimento</label>
                        <input
                          type="date"
                          value={newCustomer.birthDate}
                          onChange={e => setNewCustomer({...newCustomer, birthDate: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-6">
                      <h3 className="text-sm font-medium text-white mb-4">Endereço</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-400">CEP</label>
                          <input
                            type="text"
                            value={newCustomer.address.zipCode}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, zipCode: e.target.value}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="00000-000"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-xs font-medium text-zinc-400">Rua</label>
                          <input
                            type="text"
                            value={newCustomer.address.street}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, street: e.target.value}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="Nome da rua"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-400">Número</label>
                          <input
                            type="text"
                            value={newCustomer.address.number}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, number: e.target.value}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-400">Bairro</label>
                          <input
                            type="text"
                            value={newCustomer.address.neighborhood}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, neighborhood: e.target.value}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="Bairro"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-400">Cidade</label>
                          <input
                            type="text"
                            value={newCustomer.address.city}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, city: e.target.value}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="Cidade"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-400">Observações</label>
                      <textarea
                        value={newCustomer.notes}
                        onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                        rows={3}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors resize-none"
                        placeholder="Informações adicionais..."
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="bg-[#00E676] hover:bg-[#00C853] text-black px-6 py-2.5 rounded-xl font-medium text-sm transition-colors"
                      >
                        Cadastrar e Continuar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome, CPF ou WhatsApp..."
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-sm">
                          Nenhum cliente encontrado.
                        </div>
                      ) : (
                        filteredCustomers.map(customer => (
                          <div 
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setStep('DETAILS');
                            }}
                            className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-[#00E676]/50 transition-colors group"
                          >
                            <div>
                              <h3 className="font-medium text-white group-hover:text-[#00E676] transition-colors">{customer.name}</h3>
                              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                {customer.whatsapp && <span>WA: {customer.whatsapp}</span>}
                                {customer.document && <span>Doc: {customer.document}</span>}
                              </div>
                            </div>
                            <ArrowLeft size={18} className="text-zinc-600 rotate-180 group-hover:text-[#00E676] transition-colors" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 'DETAILS' && selectedCustomer && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Selected Client Summary */}
              <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[#00E676] font-bold">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-white">{selectedCustomer.name}</h3>
                    <p className="text-xs text-zinc-500">{selectedCustomer.whatsapp || selectedCustomer.phone || 'Sem contato'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setStep('CLIENT')}
                  className="text-xs text-zinc-400 hover:text-white underline underline-offset-2"
                >
                  Trocar Cliente
                </button>
              </div>

              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Equipment Details */}
                  
                  {/* Equipment Details */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Smartphone size={20} className="text-[#00E676]" />
                        Dados do Aparelho
                      </h2>
                      {selectedCustomer.devices && selectedCustomer.devices.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Selecionar existente:</span>
                          <select 
                            onChange={(e) => {
                              if (e.target.value === 'new') {
                                setEquipment({
                                  type: '', brand: '', model: '', serial: '', color: '', passwordType: 'none', passwordValue: ''
                                });
                              } else {
                                const device = selectedCustomer.devices.find(d => d.id === e.target.value);
                                if (device) {
                                  setEquipment({
                                    type: device.type,
                                    brand: device.brand,
                                    model: device.model,
                                    serial: device.serialNumber || '',
                                    color: device.color || '',
                                    passwordType: 'none',
                                    passwordValue: ''
                                  });

                                  // Set dynamic checklist based on type
                                  const items = osSettings.checklistByCategory?.[device.type];
                                  if (items) {
                                    const newChecklist: Record<string, 'works' | 'broken' | 'untested'> = {};
                                    items.forEach((item: string) => {
                                      newChecklist[item] = 'untested';
                                    });
                                    setChecklist(newChecklist);
                                  } else {
                                    const initialChecklist: Record<string, 'works' | 'broken' | 'untested'> = {};
                                    (osSettings.checklistByCategory?.['Outro'] || osSettings.checklistItems).forEach((item: string) => {
                                      initialChecklist[item] = 'untested';
                                    });
                                    setChecklist(initialChecklist);
                                  }
                                }
                              }
                            }}
                            className="bg-[#0A0A0A] border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00E676]"
                          >
                            <option value="new">+ Novo Aparelho</option>
                            {selectedCustomer.devices.map(d => (
                              <option key={d.id} value={d.id}>{d.brand} {d.model}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Tipo de Aparelho *</label>
                        <select
                          value={equipment.type}
                          onChange={e => {
                            const newType = e.target.value;
                            setEquipment({...equipment, type: newType});
                            
                            // Set dynamic checklist based on type
                            const items = osSettings.checklistByCategory?.[newType];
                            if (items) {
                              const newChecklist: Record<string, 'works' | 'broken' | 'untested'> = {};
                              items.forEach((item: string) => {
                                newChecklist[item] = 'untested';
                              });
                              setChecklist(newChecklist);
                            } else {
                              // Fallback
                              const initialChecklist: Record<string, 'works' | 'broken' | 'untested'> = {};
                              (osSettings.checklistByCategory?.['Outro'] || osSettings.checklistItems).forEach((item: string) => {
                                initialChecklist[item] = 'untested';
                              });
                              setChecklist(initialChecklist);
                            }
                          }}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                        >
                          <option value="">Selecione...</option>
                          <option value="Celular">Celular / Smartphone</option>
                          <option value="Tablet">Tablet</option>
                          <option value="Notebook">Notebook</option>
                          <option value="Computador">Computador</option>
                          <option value="Videogame">Videogame</option>
                          <option value="Controle">Controle de Videogame</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Marca *</label>
                        <input
                          type="text"
                          value={equipment.brand}
                          onChange={e => setEquipment({...equipment, brand: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: Apple, Samsung"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Modelo *</label>
                        <input
                          type="text"
                          value={equipment.model}
                          onChange={e => setEquipment({...equipment, model: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: iPhone 13 Pro"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Cor</label>
                        <input
                          type="text"
                          value={equipment.color}
                          onChange={e => setEquipment({...equipment, color: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: Preto"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium text-zinc-400">IMEI / Número de Série</label>
                        <input
                          type="text"
                          value={equipment.serial}
                          onChange={e => setEquipment({...equipment, serial: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors font-mono"
                          placeholder="Digite o IMEI ou Serial"
                        />
                      </div>
                    </div>

                    {/* Password Section (Hidden for Controllers) */}
                    {equipment.type !== 'Controle' && (
                      <div className="space-y-4 mb-8 bg-[#141414] border border-zinc-800 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <PenTool size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Senha / Padrão</h3>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="pwdType" 
                              checked={equipment.passwordType === 'none'}
                              onChange={() => setEquipment({...equipment, passwordType: 'none', passwordValue: ''})}
                              className="text-[#00E676] focus:ring-[#00E676] bg-zinc-800 border-zinc-700"
                            />
                            <span className="text-sm text-zinc-300">Nenhum</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="pwdType" 
                              checked={equipment.passwordType === 'text'}
                              onChange={() => setEquipment({...equipment, passwordType: 'text', passwordValue: ''})}
                              className="text-[#00E676] focus:ring-[#00E676] bg-zinc-800 border-zinc-700"
                            />
                            <span className="text-sm text-zinc-300">Texto/PIN</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="pwdType" 
                              checked={equipment.passwordType === 'pattern'}
                              onChange={() => {
                                setEquipment({...equipment, passwordType: 'pattern', passwordValue: ''});
                                setIsPatternModalReadOnly(false);
                                setIsPatternModalOpen(true);
                              }}
                              className="text-[#00E676] focus:ring-[#00E676] bg-zinc-800 border-zinc-700"
                            />
                            <span className="text-sm text-zinc-300">Padrão (Desenho)</span>
                          </label>
                        </div>

                        {equipment.passwordType === 'text' && (
                          <input
                            type="text"
                            value={equipment.passwordValue}
                            onChange={e => setEquipment({...equipment, passwordValue: e.target.value})}
                            className="w-full max-w-xs bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="Digite a senha ou PIN"
                          />
                        )}
                        
                        {equipment.passwordType === 'pattern' && (
                          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 w-fit flex flex-col items-start gap-3">
                            <p className="text-xs text-zinc-500">
                              {equipment.passwordValue ? 'Senha padrão cadastrada.' : 'Nenhum padrão definido.'}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setIsPatternModalReadOnly(false);
                                  setIsPatternModalOpen(true);
                                }}
                                className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
                              >
                                <Grid size={16} className="text-[#00E676]" />
                                {equipment.passwordValue ? 'Alterar Padrão' : 'Definir Padrão'}
                              </button>
                              {equipment.passwordValue && (
                                <button
                                  onClick={() => {
                                    setIsPatternModalReadOnly(true);
                                    setIsPatternModalOpen(true);
                                  }}
                                  className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
                                >
                                  <Eye size={16} className="text-blue-400" />
                                  Ver Padrão
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Pattern Lock Modal */}
                  <PatternLock 
                    key={isPatternModalOpen ? 'open' : 'closed'}
                    isOpen={isPatternModalOpen}
                    onClose={() => setIsPatternModalOpen(false)}
                    onSave={(pattern) => setEquipment({ ...equipment, passwordValue: pattern })}
                    initialPattern={equipment.passwordValue}
                    readOnly={isPatternModalReadOnly}
                  />

                  {/* Checklist */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Checklist de Entrada</h3>
                        </div>
                      </div>
                      
                      {equipment.type === 'Controle' && (
                        <button 
                          onClick={() => setShowVisualChecklist(!showVisualChecklist)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                            showVisualChecklist 
                              ? 'bg-[#00E676] text-black border-[#00E676]' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                          }`}
                        >
                          <Grid size={16} />
                          {showVisualChecklist ? 'Lista Padrão' : 'Checklist Visual'}
                        </button>
                      )}
                    </div>

                    {showVisualChecklist && equipment.type === 'Controle' ? (
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-3xl p-6 mb-8 overflow-hidden">
                        <VisualController 
                          checklist={checklist} 
                          onChange={(item, status) => setChecklist(prev => ({ ...prev, [item]: status }))} 
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-lg font-semibold flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-[#00E676]" />
                            Checklist de Entrada
                          </h2>
                          <button 
                            onClick={() => {
                              const newChecklist = {...checklist};
                              Object.keys(newChecklist).forEach(k => newChecklist[k] = 'untested');
                              setChecklist(newChecklist);
                            }}
                            className="text-xs text-zinc-500 hover:text-white"
                          >
                            Limpar
                          </button>
                        </div>

                        {Object.keys(checklist).length === 0 ? (
                          <div className="text-center py-6 bg-[#0A0A0A] rounded-xl border border-zinc-800 border-dashed">
                            <p className="text-sm text-zinc-500">Nenhum item de checklist configurado.</p>
                            <p className="text-xs text-zinc-600 mt-1">Selecione um aparelho ou configure em Ajustes.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {Object.keys(checklist).map(item => (
                              <div key={item} className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                                <span className="text-sm text-zinc-300">{item}</span>
                                <div className="flex items-center gap-1 bg-[#141414] rounded-lg p-1 border border-zinc-800">
                                  <button
                                    onClick={() => setChecklist({...checklist, [item]: 'works'})}
                                    className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'works' ? 'bg-[#00E676]/20 text-[#00E676]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                    title="Funciona"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setChecklist({...checklist, [item]: 'broken'})}
                                    className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'broken' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                    title="Não Funciona"
                                  >
                                    <X size={14} />
                                  </button>
                                  <button
                                    onClick={() => setChecklist({...checklist, [item]: 'untested'})}
                                    className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'untested' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                    title="Sem Teste"
                                  >
                                    <Grid size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-400">Observações do Checklist</label>
                      <input
                        type="text"
                        value={checklistNotes}
                        onChange={e => setChecklistNotes(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                        placeholder="Ex: Tela já possui trincado no canto superior direito"
                      />
                    </div>
                  </section>

                  {/* Defect & Notes */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
                        <AlertCircle size={16} className="text-blue-500" />
                        Prioridade
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {(['Baixa', 'Média', 'Alta', 'Urgente'] as OrderPriority[]).map(p => (
                          <button
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                              priority === p 
                                ? p === 'Baixa' ? 'bg-zinc-800 border-zinc-700 text-white'
                                : p === 'Média' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : p === 'Alta' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                : 'bg-red-500/20 border-red-500/50 text-red-400'
                                : 'bg-[#0A0A0A] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
                        <AlertTriangle size={16} className="text-amber-500" />
                        Defeito Relatado pelo Cliente *
                      </h2>
                      <textarea
                        value={defect}
                        onChange={e => setDefect(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors min-h-[100px] resize-y"
                        placeholder="Descreva detalhadamente o problema relatado..."
                      />
                    </div>

                    {profile.role !== 'attendant' && (
                      <div className="space-y-2">
                        <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
                          <PenTool size={16} className="text-blue-400" />
                          Observações Técnicas (Interno)
                        </h2>
                        <textarea
                          value={technicianNotes}
                          onChange={e => setTechnicianNotes(e.target.value)}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-y"
                          placeholder="Anotações visíveis apenas para a equipe técnica..."
                        />
                      </div>
                    )}
                  </section>

                  
                  {/* Service Details */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <FileText size={20} className="text-[#00E676]" />
                      Serviço a Executar
                    </h2>
                    
                    {availableServices.length > 0 && (
                      <div className="mb-4 space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Selecionar do Catálogo</label>
                        <select 
                          onChange={(e) => {
                            const svc = availableServices.find(s => s.id === e.target.value);
                            if (svc) {
                              setService(svc.name + (svc.description ? ` - ${svc.description}` : ''));
                              setFinancials(prev => ({ ...prev, totalValue: Number(svc.default_value) }));
                            }
                          }}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] appearance-none"
                        >
                          <option value="">Selecione um serviço cadastrado...</option>
                          {availableServices.map(s => (
                            <option key={s.id} value={s.id}>{s.name} - R$ {Number(s.default_value).toFixed(2)}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Descrição do Serviço</label>
                      <textarea
                        value={service}
                        onChange={e => setService(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors min-h-[100px] resize-y"
                        placeholder="Descrição do serviço contratado..."
                      />
                    </div>
                  </section>

                  {/* Financials */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                      <Banknote size={20} className="text-[#00E676]" />
                      Financeiro
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Valor do Serviço (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={financials.totalValue || ''}
                          onChange={e => setFinancials({...financials, totalValue: parseFloat(e.target.value) || 0})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-lg font-semibold text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="0,00"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Status do Pagamento</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Pendente', 'Parcial', 'Total'].map(status => (
                            <button
                              key={status}
                              onClick={() => setFinancials({...financials, paymentStatus: status as Order['financials']['paymentStatus']})}
                              className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                                financials.paymentStatus === status 
                                  ? 'bg-[#00E676]/10 border-[#00E676] text-[#00E676]' 
                                  : 'bg-[#0A0A0A] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {financials.paymentStatus !== 'Pendente' && (
                        <>
                          {financials.paymentStatus === 'Parcial' && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-zinc-400">Valor Pago (R$)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={financials.amountPaid || ''}
                                onChange={e => setFinancials({...financials, amountPaid: parseFloat(e.target.value) || 0})}
                                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                                placeholder="0,00"
                              />
                              <div className="text-xs text-zinc-500 mt-1 flex justify-between">
                                <span>Restante:</span>
                                <span className="font-medium text-white">
                                  R$ {Math.max(0, financials.totalValue - financials.amountPaid).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">Forma de Pagamento</label>
                            <select
                              value={financials.paymentType}
                              onChange={e => setFinancials({...financials, paymentType: e.target.value as Order['financials']['paymentType']})}
                              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                            >
                              <option value="">Selecione...</option>
                              <option value="Dinheiro">Dinheiro</option>
                              <option value="PIX">PIX</option>
                              <option value="Cartão">Cartão (Crédito/Débito)</option>
                              <option value="Transferência">Transferência Bancária</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  {/* Signatures */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                      <PenTool size={20} className="text-[#00E676]" />
                      Assinaturas
                    </h2>
                    
                    <div className="space-y-6">
                      <SignaturePad 
                        title="Assinatura do Técnico" 
                        onSave={(dataUrl) => setSignatures(prev => ({ ...prev, technician: dataUrl }))}
                        onClear={() => setSignatures(prev => ({ ...prev, technician: null }))}
                      />
                      <SignaturePad 
                        title="Assinatura do Cliente" 
                        onSave={(dataUrl) => setSignatures(prev => ({ ...prev, client: dataUrl }))}
                        onClear={() => setSignatures(prev => ({ ...prev, client: null }))}
                      />
                    </div>
                  </section>

                  <div className="pb-12" />
                </div>
              </motion.div>
          )}
        </div>
      </main>
      </div>

      <div className="print-a4-container">
        <OrderPrintTemplate 
          order={{
            id: 'preview',
            companyId: companySettings.id || 'main',
            osNumber: osSettings.nextOsNumber,
            customerId: selectedCustomer?.id || '',
            signatures: { client: null, technician: null },
            equipment,
            defect,
            service,
            checklist,
            checklistNotes,
            technicianNotes: '',
            financials,
            status: 'Entrada Registrada',
            priority,
            history: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }}
          customer={selectedCustomer || undefined}
          companySettings={companySettings}
          osSettings={osSettings}
        />
      </div>

      <div className="print-thermal-container">
        <ThermalReceiptTemplate 
          order={{
            id: 'preview',
            companyId: companySettings.id || 'main',
            osNumber: osSettings.nextOsNumber,
            customerId: selectedCustomer?.id || '',
            signatures: { client: null, technician: null },
            equipment,
            defect,
            service,
            checklist,
            checklistNotes,
            technicianNotes: '',
            financials,
            status: 'Entrada Registrada',
            priority,
            history: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }}
          customer={selectedCustomer || undefined}
          companySettings={companySettings}
          osSettings={osSettings}
        />
      </div>

      <AnimatePresence>
        {whatsappPrompt.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Notificar Cliente?</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Deseja notificar o cliente via WhatsApp sobre a alteração de status para <strong className="text-white">{whatsappPrompt.newStatus}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleWhatsappPromptResponse(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Não
                </button>
                <button
                  onClick={() => handleWhatsappPromptResponse(true)}
                  className="flex-1 py-3 rounded-xl font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Sim
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {whatsappModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-emerald-500/10">
                <h2 className="text-xl font-bold text-emerald-500 flex items-center gap-2">
                  <MessageCircle size={24} />
                  Enviar WhatsApp
                </h2>
                <button onClick={() => setWhatsappModal({ isOpen: false, message: '', customerPhone: '' })} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">Mensagem</label>
                <textarea
                  value={whatsappModal.message}
                  onChange={(e) => setWhatsappModal(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full h-48 bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>
              <div className="p-6 border-t border-zinc-800 bg-[#0A0A0A]">
                <button
                  onClick={() => {
                    const whatsappUrl = `https://wa.me/${whatsappModal.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappModal.message)}`;
                    window.open(whatsappUrl, '_blank');
                    setWhatsappModal({ isOpen: false, message: '', customerPhone: '' });
                  }}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  Enviar via WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

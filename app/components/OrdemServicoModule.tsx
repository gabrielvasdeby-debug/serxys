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
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export type OrderStatus = 'Entrada Registrada' | 'Orçamento em Elaboração' | 'Em Análise Técnica' | 'Aguardando Aprovação' | 'Aguardando Peça' | 'Em Manutenção' | 'Reparo Concluído' | 'Equipamento Retirado' | 'Orçamento Cancelado' | 'Sem Reparo' | 'Garantia';
export type OrderPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface OrderHistoryEvent {
  date: string;
  user: string;
  description: string;
}

export interface OrderCompletionData {
  servicesPerformed: string;
  exitChecklist: Record<string, 'works' | 'broken' | 'untested'>;
  supplier: string;
  partsUsed: string;
  warrantyDays?: number;
  warrantyDescription?: string;
}

export interface Order {
  id: string;
  osNumber: number;
  customerId: string;
  equipment: {
    type: string;
    brand: string;
    model: string;
    serial: string;
    color: string;
    passwordType: 'text' | 'pattern' | 'none';
    passwordValue: string;
  };
  checklist: Record<string, 'works' | 'broken' | 'untested'>;
  checklistNotes: string;
  defect: string;
  technicianNotes: string;
  service: string;
  financials: {
    totalValue: number;
    paymentType: 'Dinheiro' | 'PIX' | 'Cartão' | 'Transferência' | 'Outro' | '';
    paymentStatus: 'Total' | 'Parcial' | 'Pendente';
    amountPaid: number;
  };
  signatures: {
    technician: string | null;
    client: string | null;
  };
  status: OrderStatus;
  priority: OrderPriority;
  history: OrderHistoryEvent[];
  completionData?: OrderCompletionData;
  productsUsed?: { id: string, name: string, quantity: number, price: number }[];
  createdAt: string;
  updatedAt: string;
}

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
  osSettings: { nextOsNumber: number, checklistItems: string[], whatsappMessages: Record<string, string> };
  setOsSettings: React.Dispatch<React.SetStateAction<{ nextOsNumber: number, checklistItems: string[], whatsappMessages: Record<string, string> }>>;
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
  setOsSettings
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
  
  const [checklist, setChecklist] = useState<Order['checklist']>(() => {
    const initialChecklist: Record<string, 'works' | 'broken' | 'untested'> = {};
    osSettings.checklistItems.forEach(item => {
      initialChecklist[item] = 'untested';
    });
    return initialChecklist;
  });
  const [checklistNotes, setChecklistNotes] = useState('');
  const [defect, setDefect] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [service, setService] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('Média');
  
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

  const [currentCashSession, setCurrentCashSession] = useState<{ id: string; [key: string]: unknown } | null>(null);

  // Listen for current cash session
  useEffect(() => {
    if (!auth.currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'cashSessions'),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentCashSession({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setCurrentCashSession(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'cashSessions');
    });

    return () => unsubscribe();
  }, []);

  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
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
      const customerToAdd: Customer = {
        ...newCustomer,
        id: customerId,
        devices: [],
        createdAt: new Date().toISOString()
      };
      
      // Save to Firestore
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'customers', customerId), customerToAdd);
      
      setCustomers([...customers, customerToAdd]);
      setSelectedCustomer(customerToAdd);
      setIsCreatingCustomer(false);
      setStep('DETAILS');
      onShowToast('Cliente cadastrado com sucesso');
    } catch (error) {
      console.error('Error creating customer:', error);
      onShowToast('Erro ao cadastrar cliente');
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
    if (financials.amountPaid > 0) {
      if (!currentCashSession) {
        onShowToast('É necessário abrir o caixa para registrar pagamentos.');
        return;
      }
      if (currentCashSession.status === 'closed') {
        onShowToast('O caixa do dia já foi fechado. Não é possível registrar novos pagamentos.');
        return;
      }
    }

    try {
      const orderId = providedId || Date.now().toString();
      const newOrder: Order = {
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
          date: new Date().toISOString(),
          user: profile.name,
          description: 'Ordem de Serviço criada'
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      await setDoc(doc(db, 'orders', orderId), newOrder);

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
        
        await setDoc(doc(db, 'customers', updatedCustomer.id), updatedCustomer);
        setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      }

      // Record transaction in Caixa if there's a payment
      if (financials.paymentStatus !== 'Pendente' && financials.amountPaid > 0) {
        const transactionId = `trans_${Date.now()}`;
        const newTransaction = {
          type: 'entrada',
          description: `Pagamento OS #${osSettings.nextOsNumber} - ${selectedCustomer.name}`,
          value: financials.amountPaid,
          paymentMethod: (['Dinheiro', 'PIX', 'Cartão', 'Transferência'].includes(financials.paymentType) ? financials.paymentType : 'Dinheiro') as Transaction['paymentMethod'],
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          osId: osSettings.nextOsNumber.toString(),
          userId: auth.currentUser?.uid || profile.id || 'system',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'transactions', transactionId), newTransaction);
      }

      // Create Receivable if there is a balance
      const balance = financials.totalValue - (financials.amountPaid || 0);
      if (balance > 0) {
        const { addDoc, collection } = await import('firebase/firestore');
        await addDoc(collection(db, 'receivables'), {
          description: `Saldo OS #${osSettings.nextOsNumber} - ${equipment.type} ${equipment.brand}`,
          value: balance,
          dueDate: new Date().toISOString().split('T')[0], // Default to today
          status: 'pendente',
          customerName: selectedCustomer.name,
          osId: orderId,
          notes: `Gerado automaticamente da OS #${osSettings.nextOsNumber}`,
          createdAt: new Date().toISOString()
        });
      }

      setOrders([...orders, newOrder]);
      setOsSettings({ ...osSettings, nextOsNumber: osSettings.nextOsNumber + 1 });
      onShowToast(`OS #${osSettings.nextOsNumber} criada com sucesso`);
      
      // Trigger WhatsApp prompt
      setWhatsappPrompt({ isOpen: true, newStatus: 'Entrada Registrada', orderId: newOrder.id });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders/transactions');
    }
  };

  const handleWhatsappPromptResponse = (send: boolean) => {
    if (send && whatsappPrompt.orderId && selectedCustomer) {
      const order = orders.find(o => o.id === whatsappPrompt.orderId);
      if (order) {
        if (!selectedCustomer.whatsapp) {
          onShowToast('Cliente sem número de WhatsApp cadastrado');
          onBack();
          return;
        }

        const template = osSettings.whatsappMessages?.[whatsappPrompt.newStatus] || 
          `Olá [nome_cliente], o status da sua OS #[numero_os] foi atualizado para: [status].`;
        
        const message = template
          .replace(/\[nome_cliente\]/g, selectedCustomer.name)
          .replace(/\[numero_os\]/g, order.osNumber.toString())
          .replace(/\[status\]/g, whatsappPrompt.newStatus);

        setWhatsappModal({
          isOpen: true,
          message,
          customerPhone: selectedCustomer.whatsapp
        });
      } else {
        onBack();
      }
    } else {
      onBack();
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
                  window.print();
                }}
                className="bg-[#1A1A1A] hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors border border-zinc-700"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
              <button 
                onClick={() => {
                  if (!selectedCustomer?.whatsapp) {
                    onShowToast('Cliente não possui WhatsApp cadastrado');
                    return;
                  }
                  
                  // Generate tracking link
                  // We use the current timestamp as the ID, matching handleSaveOS
                  const orderId = Date.now().toString();
                  const trackingUrl = `${window.location.origin}/os/${orderId}`;
                  
                  const message = `Olá, *${selectedCustomer.name}*.\n\nSua ordem de serviço foi registrada com sucesso no sistema *Servyx*.\n\n*Número da OS:* #${osSettings.nextOsNumber.toString().padStart(4, '0')}\n\n*Equipamento:*\n${equipment.brand} ${equipment.model}\n\n*Defeito relatado:*\n${defect}\n\n*Status atual:*\nEntrada Registrada\n\n*Data de entrada:*\n${new Date().toLocaleDateString('pt-BR')}\n\nVocê pode acompanhar o andamento do seu reparo pelo link abaixo:\n\n${trackingUrl}\n\nAssistência técnica agradece a sua confiança!`;
                  
                  const whatsappUrl = `https://wa.me/${selectedCustomer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                  
                  // Now save the OS with the same ID
                  handleSaveOS(orderId);
                }}
                className="bg-[#1A1A1A] hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors border border-zinc-700"
              >
                <MessageCircle size={16} className="text-green-500" />
                <span className="hidden sm:inline">Enviar ao Cliente</span>
              </button>
              <button 
                onClick={() => handleSaveOS()}
                className="bg-[#00E676] hover:bg-[#00C853] text-black px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-lg shadow-[#00E676]/20 ml-2"
              >
                <Save size={16} />
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Equipment & Checklist */}
                <div className="lg:col-span-2 space-y-6">
                  
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
                          onChange={e => setEquipment({...equipment, type: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                        >
                          <option value="">Selecione...</option>
                          <option value="Celular">Celular / Smartphone</option>
                          <option value="Tablet">Tablet</option>
                          <option value="Notebook">Notebook</option>
                          <option value="Computador">Computador</option>
                          <option value="Videogame">Videogame</option>
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

                    {/* Password Section */}
                    <div className="border-t border-zinc-800 pt-6">
                      <h3 className="text-sm font-medium text-white mb-4">Senha de Desbloqueio</h3>
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="pwdType" 
                            checked={equipment.passwordType === 'none'}
                            onChange={() => setEquipment({...equipment, passwordType: 'none', passwordValue: ''})}
                            className="text-[#00E676] focus:ring-[#00E676] bg-zinc-800 border-zinc-700"
                          />
                          <span className="text-sm text-zinc-300">Sem Senha</span>
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
                            onChange={() => setEquipment({...equipment, passwordType: 'pattern', passwordValue: ''})}
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

                    {osSettings.checklistItems.length === 0 ? (
                      <div className="text-center py-6 bg-[#0A0A0A] rounded-xl border border-zinc-800 border-dashed">
                        <p className="text-sm text-zinc-500">Nenhum item de checklist configurado.</p>
                        <p className="text-xs text-zinc-600 mt-1">Acesse Ajustes para configurar.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {osSettings.checklistItems.map(item => (
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
                                <AlertCircle size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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

                </div>

                {/* Right Column: Service & Financials */}
                <div className="space-y-6">
                  
                  {/* Service Details */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <FileText size={20} className="text-[#00E676]" />
                      Serviço a Executar
                    </h2>
                    <textarea
                      value={service}
                      onChange={e => setService(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors min-h-[100px] resize-y"
                      placeholder="Descrição do serviço contratado (se já definido)..."
                    />
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

                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      </div>

      {/* Print View */}
      <div className="hidden print:block bg-white text-black p-8 absolute inset-0 z-50 min-h-screen print:static print:h-auto print:min-h-0 print:p-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tight">Ordem de Serviço</h1>
              <p className="text-lg text-gray-600 mt-1">Nº {osSettings.nextOsNumber.toString().padStart(4, '0')}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-xl">SERVYX</p>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {selectedCustomer && (
            <div className="mb-8">
              <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4 uppercase tracking-wider">Dados do Cliente</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nome</p>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Documento</p>
                  <p className="font-medium">{selectedCustomer.document || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefone / WhatsApp</p>
                  <p className="font-medium">{selectedCustomer.whatsapp || selectedCustomer.phone || 'Não informado'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4 uppercase tracking-wider">Dados do Aparelho</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Equipamento</p>
                <p className="font-medium">{equipment.brand} {equipment.model}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium capitalize">{equipment.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nº Série / IMEI</p>
                <p className="font-medium">{equipment.serial || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cor</p>
                <p className="font-medium">{equipment.color || 'Não informado'}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4 uppercase tracking-wider">Serviço e Valores</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Defeito Relatado</p>
                <p className="font-medium">{defect || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Serviço a ser realizado</p>
                <p className="font-medium">{service || 'A definir'}</p>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Forma de Pagamento</p>
                  <p className="font-medium">{financials.paymentType || 'A definir'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="text-2xl font-bold">R$ {financials.totalValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-24 grid grid-cols-2 gap-16">
            <div className="text-center">
              {signatures.client ? (
                <div className="h-24 flex items-end justify-center mb-2 relative">
                  <Image src={signatures.client} alt="Assinatura Cliente" fill className="object-contain" unoptimized />
                </div>
              ) : (
                <div className="h-24 mb-2"></div>
              )}
              <div className="border-t border-black pt-2">
                <p className="font-medium">{selectedCustomer?.name || 'Cliente'}</p>
                <p className="text-sm text-gray-500">Assinatura do Cliente</p>
              </div>
            </div>
            
            <div className="text-center">
              {signatures.technician ? (
                <div className="h-24 flex items-end justify-center mb-2 relative">
                  <Image src={signatures.technician} alt="Assinatura Técnico" fill className="object-contain" unoptimized />
                </div>
              ) : (
                <div className="h-24 mb-2"></div>
              )}
              <div className="border-t border-black pt-2">
                <p className="font-medium">{profile.name}</p>
                <p className="text-sm text-gray-500">Assinatura do Técnico</p>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center text-xs text-gray-400">
            <p>Documento gerado pelo sistema SERVYX OS</p>
          </div>
        </div>
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
                <button onClick={() => { setWhatsappModal({ isOpen: false, message: '', customerPhone: '' }); onBack(); }} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
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
                    onBack();
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

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Search, Plus, User, Smartphone, 
  CheckCircle2, XCircle, AlertCircle, AlertTriangle, Save, MessageCircle,
  Check, X, CreditCard, Banknote, QrCode, FileText, Grid, Eye, Trash2,
  Calendar, Clock, Wrench, ShieldCheck, Package, Truck, Inbox, LogOut, Minus, TrendingUp, Printer
} from 'lucide-react';
import { Customer } from './ClientesModule';
import { Order, OrderStatus, OrderPriority, OrderCompletionData } from '../types';
import PatternLock from './PatternLock';
import { supabase } from '../supabase';
import { addDays } from 'date-fns';
import OrderPrintTemplate from './OrderPrintTemplate';
import ThermalReceiptTemplate from './ThermalReceiptTemplate';
// Removed firebase imports to use Supabase instead.

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  barcode?: string;
}

interface SelectedProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
}
interface StatusOsModuleProps {
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
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  initialOrderId?: string | null;
  osSettings: any;
  companySettings: any;
  onEdit?: (order: Order) => void;
}

const COLUMNS: OrderStatus[] = [
  'Entrada Registrada',
  'Orçamento em Elaboração',
  'Em Análise Técnica',
  'Aguardando Aprovação',
  'Aguardando Peça',
  'Em Manutenção',
  'Reparo Concluído',
  'Equipamento Retirado',
  'Orçamento Cancelado',
  'Sem Reparo',
  'Garantia'
];

const STATUS_CONFIG: Record<OrderStatus, { icon: React.ElementType, color: string, bg: string }> = {
  'Entrada Registrada': { icon: Inbox, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Orçamento em Elaboração': { icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  'Em Análise Técnica': { icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'Aguardando Aprovação': { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  'Aguardando Peça': { icon: Package, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  'Em Manutenção': { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'Reparo Concluído': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  'Equipamento Retirado': { icon: LogOut, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
  'Orçamento Cancelado': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  'Sem Reparo': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  'Garantia': { icon: ShieldCheck, color: 'text-teal-400', bg: 'bg-teal-400/10' }
};

const PRIORITY_COLORS: Record<OrderPriority, string> = {
  'Baixa': 'bg-zinc-500',
  'Média': 'bg-blue-500',
  'Alta': 'bg-orange-500',
  'Urgente': 'bg-red-500'
};

export default function StatusOsModule({
  profile,
  onBack,
  onShowToast,
  customers,
  orders,
  setOrders,
  initialOrderId,
  osSettings,
  companySettings,
  onEdit
}: StatusOsModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'ALL' | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Cartão' | 'Transferência'>('Dinheiro');

  const [currentCashSession, setCurrentCashSession] = useState<{ id: string; [key: string]: unknown } | null>(null);

  // Listen for current cash session
  useEffect(() => {
    const fetchSession = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
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
  }, []);

  // Completion State
  const [servicesPerformed, setServicesPerformed] = useState('');
  const [exitChecklist, setExitChecklist] = useState<Record<string, 'works' | 'broken' | 'untested'>>({
    'Tela': 'untested',
    'Touch': 'untested',
    'Câmera': 'untested',
    'Áudio': 'untested',
    'Carregamento': 'untested',
    'WiFi': 'untested',
    'Bluetooth': 'untested'
  });
  const [supplier, setSupplier] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyDays, setWarrantyDays] = useState(90);
  const [warrantyDescription, setWarrantyDescription] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  useEffect(() => {
    if (initialOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === initialOrderId);
      if (order) {
        setSelectedOrder(order);
        setActiveStatus(order.status);
      }
    }
  }, [initialOrderId, orders]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) {
        setAvailableProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          category: p.category,
          barcode: p.barcode
        })));
      }
    };
    fetchProducts();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const customer = customers.find(c => c.id === o.customerId);
      const searchLower = searchQuery.toLowerCase();
      return (
        o.osNumber.toString().includes(searchLower) ||
        (customer?.name.toLowerCase().includes(searchLower)) ||
        (customer?.document && customer.document.includes(searchLower)) ||
        o.equipment.model.toLowerCase().includes(searchLower) ||
        o.equipment.brand.toLowerCase().includes(searchLower)
      );
    });
  }, [orders, customers, searchQuery]);

  const [whatsappPrompt, setWhatsappPrompt] = useState<{
    isOpen: boolean;
    order: Order | null;
    newStatus: OrderStatus | null;
    completionData?: OrderCompletionData;
    productsUsed?: SelectedProduct[];
  }>({ isOpen: false, order: null, newStatus: null });

  const [whatsappModal, setWhatsappModal] = useState<{
    isOpen: boolean;
    message: string;
    customerPhone: string;
  }>({ isOpen: false, message: '', customerPhone: '' });

  const updateOrderStatus = (order: Order, newStatus: OrderStatus, completionData?: OrderCompletionData, productsUsed?: SelectedProduct[]) => {
    setWhatsappPrompt({
      isOpen: true,
      order,
      newStatus,
      completionData,
      productsUsed
    });
  };

  const executeOrderStatusUpdate = async (order: Order, newStatus: OrderStatus, completionData?: OrderCompletionData, productsUsed?: SelectedProduct[]) => {
    const now = new Date().toISOString();
    const updatedOrder = {
      ...order,
      status: newStatus,
      completionData: completionData || order.completionData,
      productsUsed: productsUsed || order.productsUsed || [],
      history: [
        ...order.history,
        {
          date: now,
          user: profile.name,
          description: `Status alterado de "${order.status}" para "${newStatus}"`
        }
      ],
      updatedAt: now
    };

    try {
      // 1. Update Order in Supabase
      const { error: osError } = await supabase.from('orders').update({
        status: updatedOrder.status,
        completion_data: updatedOrder.completionData,
        products_used: updatedOrder.productsUsed,
        history: updatedOrder.history,
        updated_at: now
      }).eq('id', order.id);

      if (osError) throw osError;

      // 1.0 Create Warranty if present
      if (completionData?.warrantyDays) {
        const startDate = now.split('T')[0];
        const endDate = addDays(new Date(), completionData.warrantyDays).toISOString().split('T')[0];

        await supabase.from('warranties').insert({
          id: crypto.randomUUID(),
          os_id: order.id,
          os_number: order.osNumber.toString().padStart(4, '0'),
          client_name: customers.find(c => c.id === order.customerId)?.name || 'Cliente',
          equipment: `${order.equipment.brand} ${order.equipment.model}`,
          service_performed: completionData.servicesPerformed || order.service,
          start_date: startDate,
          end_date: endDate,
          duration_days: completionData.warrantyDays,
          notes: completionData.warrantyDescription || '',
          status: 'Ativa',
          user_id: profile.id
        });
      }

      // 2. Process Products Used
      if (productsUsed && productsUsed.length > 0) {
        for (const p of productsUsed) {
          const product = availableProducts.find(ap => ap.id === p.id);
          if (product) {
            // Update Stock
            await supabase.from('products').update({
              stock: Math.max(0, product.stock - p.quantity),
              updated_at: now
            }).eq('id', p.id);

            // Add History
            await supabase.from('product_history').insert({
              id: crypto.randomUUID(),
              product_id: p.id,
              type: 'saida',
              quantity: p.quantity,
              reason: 'os',
              reference_id: order.id,
              date: now.split('T')[0],
              user_id: profile.id,
              created_at: now
            });
          }
        }
      }

      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      onShowToast(`Status da OS #${order.osNumber} atualizado`);
    } catch (error: any) {
      console.error('Error updating OS status:', error);
      onShowToast(`Erro ao atualizar status: ${error.message || ''}`);
    }
  };

  const handleWhatsappPromptResponse = (wantsToNotify: boolean) => {
    const { order, newStatus, completionData, productsUsed } = whatsappPrompt;
    if (!order || !newStatus) return;

    executeOrderStatusUpdate(order, newStatus, completionData, productsUsed);

    if (wantsToNotify) {
      const customer = customers.find(c => c.id === order.customerId);
      if (!customer?.whatsapp) {
        onShowToast('Cliente sem número de WhatsApp cadastrado');
      } else {
        let template = osSettings?.whatsappMessages?.[newStatus] || '';
        if (!template) {
           template = `Olá [nome_cliente], o status da sua OS #[numero_os] foi atualizado para: [status].`;
        }
        const message = template
          .replace(/\[nome_cliente\]/g, customer.name)
          .replace(/\[numero_os\]/g, order.osNumber.toString().padStart(4, '0'))
          .replace(/\[status\]/g, newStatus);

        setWhatsappModal({
          isOpen: true,
          message,
          customerPhone: customer.whatsapp
        });
      }
    }

    setWhatsappPrompt({ isOpen: false, order: null, newStatus: null });
  };

  const updatePaymentStatus = async (order: Order, newPaymentStatus: 'Total' | 'Parcial' | 'Pendente') => {
    const now = new Date().toISOString();
    const updatedHistory = [
      ...order.history,
      {
        date: now,
        user: profile.name,
        description: `Status de pagamento alterado de "${order.financials.paymentStatus}" para "${newPaymentStatus}"`
      }
    ];

    try {
      const { error } = await supabase.from('orders').update({
        financials: {
          ...order.financials,
          paymentStatus: newPaymentStatus
        },
        history: updatedHistory,
        updated_at: now
      }).eq('id', order.id);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === order.id ? {
        ...o,
        financials: { ...o.financials, paymentStatus: newPaymentStatus },
        history: updatedHistory,
        updatedAt: now
      } : o));
      onShowToast(`Pagamento da OS #${order.osNumber} atualizado`);
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      onShowToast(`Erro ao atualizar pagamento: ${error.message || ''}`);
    }
  };

  const handleSaveCompletion = () => {
    if (!selectedOrder) return;
    if (!servicesPerformed.trim()) {
      onShowToast('Descreva os serviços realizados');
      return;
    }

    const completionData: OrderCompletionData = {
      servicesPerformed,
      exitChecklist,
      supplier,
      partsUsed,
      ...(hasWarranty ? { warrantyDays, warrantyDescription } : {})
    };

    updateOrderStatus(selectedOrder, 'Reparo Concluído', completionData, selectedProducts);
    setIsFinishing(false);
    setSelectedOrder(null);

    // Reset form
    setServicesPerformed('');
    setExitChecklist({
      'Tela': 'untested',
      'Touch': 'untested',
      'Câmera': 'untested',
      'Áudio': 'untested',
      'Carregamento': 'untested',
      'WiFi': 'untested',
      'Bluetooth': 'untested'
    });
    setSupplier('');
    setPartsUsed('');
    setHasWarranty(false);
    setWarrantyDays(90);
    setWarrantyDescription('');
    setSelectedProducts([]);
  };

  const handleRegisterPayment = async () => {
    if (!selectedOrder || !paymentAmount) return;

    // Check if cash session is open
    if (!currentCashSession) {
      onShowToast('É necessário abrir o caixa para registrar pagamentos.');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      onShowToast('Valor inválido');
      return;
    }

    const newAmountPaid = (selectedOrder.financials.amountPaid || 0) + amount;
    const totalValue = selectedOrder.financials.totalValue;

    let newPaymentStatus: 'Total' | 'Parcial' | 'Pendente' = 'Parcial';
    if (newAmountPaid >= totalValue) {
      newPaymentStatus = 'Total';
    }

    const now = new Date().toISOString();
    const updatedHistory = [
      ...selectedOrder.history,
      {
        date: now,
        user: profile.name,
        description: `Pagamento registrado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} (${paymentMethod})`
      }
    ];

    try {
      // 1. Update Order
      const { error: osError } = await supabase.from('orders').update({
        financials: {
          ...selectedOrder.financials,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          paymentType: paymentMethod
        },
        history: updatedHistory,
        updated_at: now
      }).eq('id', selectedOrder.id);

      if (osError) throw osError;

      // 2. Record transaction in Caixa
      const customer = customers.find(c => c.id === selectedOrder.customerId);
      const { error: transError } = await supabase.from('transactions').insert({
        id: crypto.randomUUID(),
        type: 'entrada',
        description: `Pagamento OS #${selectedOrder.osNumber} - ${customer?.name || 'Cliente'}`,
        value: amount,
        payment_method: paymentMethod,
        date: now.split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        os_id: selectedOrder.osNumber.toString(),
        user_id: profile.id,
        session_id: currentCashSession?.id
      });

      if (transError) throw transError;

      // 3. Update or Create Receivable
      const { data: receivables } = await supabase
        .from('receivables')
        .select('*')
        .eq('os_id', selectedOrder.id)
        .eq('status', 'pendente');

      const remainingBalance = totalValue - newAmountPaid;

      if (receivables && receivables.length > 0) {
        const receivableId = receivables[0].id;
        if (remainingBalance <= 0) {
          await supabase.from('receivables').update({
            status: 'recebido',
            received_date: now.split('T')[0],
            payment_method: paymentMethod,
            updated_at: now
          }).eq('id', receivableId);
        } else {
          await supabase.from('receivables').update({
            value: remainingBalance,
            updated_at: now
          }).eq('id', receivableId);
        }
      } else if (remainingBalance > 0) {
        await supabase.from('receivables').insert({
          id: crypto.randomUUID(),
          description: `Saldo OS #${selectedOrder.osNumber} - ${selectedOrder.equipment.type} ${selectedOrder.equipment.brand}`,
          value: remainingBalance,
          due_date: now.split('T')[0],
          status: 'pendente',
          customer_name: customer?.name || 'Cliente',
          os_id: selectedOrder.id,
          created_at: now
        });
      }

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? {
        ...o,
        financials: {
          ...o.financials,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          paymentType: paymentMethod
        },
        history: updatedHistory,
        updatedAt: now
      } : o));

      setSelectedOrder(prev => prev ? {
        ...prev,
        financials: {
          ...prev.financials,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          paymentType: paymentMethod
        },
        history: updatedHistory,
        updatedAt: now
      } : null);

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      onShowToast('Pagamento registrado com sucesso');
    } catch (error: any) {
      console.error('Error registering payment:', error);
      onShowToast(`Erro ao registrar pagamento: ${error.message || ''}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <header className="bg-[#141414] border-b border-zinc-800 p-4 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 hover:bg-zinc-800 rounded-xl transition-colors bg-zinc-900 border border-zinc-800"
            >
              <ArrowLeft size={20} className="text-zinc-400" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Status OS</h1>
              <p className="text-[10px] sm:text-sm text-zinc-500 font-medium uppercase tracking-wider">Gestão de Ordens</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Buscar OS, cliente ou aparelho..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
              />
            </div>
            <button
              onClick={() => setActiveStatus('ALL')}
              className={`px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-tight transition-all flex items-center justify-center gap-2 border ${
                activeStatus === 'ALL'
                ? 'bg-[#00E676] text-black border-[#00E676] shadow-lg shadow-[#00E676]/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <Grid size={18} />
              <span className="inline">Todas as OS</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {!activeStatus ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {COLUMNS.map(status => {
              const config = STATUS_CONFIG[status];
              const count = filteredOrders.filter(o => o.status === status).length;
              const Icon = config.icon;
              return (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className="bg-[#1A1A1A] border border-zinc-800 hover:border-zinc-700 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all group text-center aspect-square relative"
                >
                  {count > 0 && (
                    <div className="absolute top-4 right-4 bg-zinc-800 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {count}
                    </div>
                  )}
                  <div className={`w-16 h-16 rounded-2xl ${config.bg} flex items-center justify-center ${config.color} transition-colors`}>
                    <Icon size={28} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block mb-1 leading-tight">{status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveStatus(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <ArrowLeft size={20} className="text-zinc-400" />
                </button>
                <h2 className="text-xl font-bold text-white">
                  {activeStatus === 'ALL' ? 'Todas as Ordens' : activeStatus}
                </h2>
                <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-1 rounded-full">
                  {activeStatus === 'ALL'
                    ? filteredOrders.length
                    : filteredOrders.filter(o => o.status === activeStatus).length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(activeStatus === 'ALL'
                ? filteredOrders
                : filteredOrders.filter(o => o.status === activeStatus)
              ).map(order => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="bg-[#1A1A1A] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded-md">
                          #{order.osNumber.toString().padStart(4, '0')}
                        </span>
                        {activeStatus === 'ALL' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[order.status].bg} ${STATUS_CONFIG[order.status].color}`}>
                            {order.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[order.priority]}`} title={`Prioridade: ${order.priority}`} />
                      </div>
                    </div>

                    <h4 className="font-medium text-white mb-1 line-clamp-1">{customer?.name || 'Cliente não encontrado'}</h4>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-1">{order.equipment.brand} {order.equipment.model}</p>

                    <div className="bg-[#0A0A0A] rounded-xl p-3 mb-4">
                      <p className="text-xs text-zinc-500 line-clamp-2" title={order.defect}>{order.defect}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        {order.history[0]?.user || 'Sistema'}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(activeStatus === 'ALL'
                ? filteredOrders
                : filteredOrders.filter(o => o.status === activeStatus)
              ).length === 0 && (
                <div className="col-span-full py-12 text-center text-zinc-500">
                  Nenhuma ordem de serviço neste status.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* OS Details Modal */}
      <AnimatePresence>
        {selectedOrder && !isFinishing && (
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
              className="bg-[#141414] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="flex flex-col border-b border-zinc-800">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800/50 bg-zinc-900/30">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors sm:hidden"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black flex items-center gap-3">
                        OS #{selectedOrder.osNumber.toString().padStart(4, '0')}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                          selectedOrder.priority === 'Baixa' ? 'bg-zinc-800 text-zinc-500' :
                          selectedOrder.priority === 'Média' ? 'bg-blue-500/10 text-blue-400' :
                          selectedOrder.priority === 'Alta' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {selectedOrder.priority}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${STATUS_CONFIG[selectedOrder.status].bg} ${STATUS_CONFIG[selectedOrder.status].color}`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors hidden sm:block"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Actions Bar - Responsive */}
                <div className="p-3 sm:p-4 bg-[#0F0F0F] flex flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as OrderStatus;
                      if (newStatus === 'Equipamento Retirado' && selectedOrder.financials.paymentStatus !== 'Total') {
                        onShowToast('⚠️ Pagamento Pendente!');
                        return;
                      }
                      if (newStatus === 'Reparo Concluído') {
                        setIsFinishing(true);
                      } else {
                        updateOrderStatus(selectedOrder, newStatus);
                        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
                      }
                    }}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#00E676] min-w-[140px]"
                  >
                    {COLUMNS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>

                  <div className="h-6 w-px bg-zinc-800 mx-1 hidden sm:block" />

                  {onEdit && (
                    <button
                      onClick={() => onEdit(selectedOrder)}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-lg shadow-blue-500/20"
                    >
                      <FileText size={16} />
                      Editar
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const customer = customers.find(c => c.id === selectedOrder.customerId);
                      if (!customer?.whatsapp) return;
                      const trackingUrl = `https://servyx.app/${companySettings.publicSlug}/${selectedOrder.osNumber}`;
                      const message = `Olá, *${customer.name}*.\n\nSua OS #${selectedOrder.osNumber.toString().padStart(4, '0')} está no status: *${selectedOrder.status}*.\n\nLink: ${trackingUrl}`;
                      window.open(`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-lg shadow-green-500/20"
                  >
                    <MessageCircle size={16} />
                    Zap
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Client & Equipment Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <User size={16} /> Cliente
                    </h3>
                    <div className="bg-[#0A0A0A] rounded-xl p-4 border border-zinc-800/50">
                      {(() => {
                        const customer = customers.find(c => c.id === selectedOrder.customerId);
                        return customer ? (
                          <div className="space-y-2">
                            <p className="font-medium text-white">{customer.name}</p>
                            <p className="text-sm text-zinc-400">{customer.phone || customer.whatsapp}</p>
                            {customer.document && <p className="text-sm text-zinc-400">{customer.document}</p>}
                          </div>
                        ) : <p className="text-zinc-500">Cliente não encontrado</p>;
                      })()}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <Smartphone size={16} /> Aparelho
                    </h3>
                    <div className="bg-[#0A0A0A] rounded-xl p-4 border border-zinc-800/50">
                      <div className="space-y-2">
                        <p className="font-medium text-white">{selectedOrder.equipment.brand} {selectedOrder.equipment.model}</p>
                        <p className="text-sm text-zinc-400">Tipo: {selectedOrder.equipment.type}</p>
                        <p className="text-sm text-zinc-400">Cor: {selectedOrder.equipment.color}</p>
                        {selectedOrder.equipment.serial && <p className="text-sm text-zinc-400">Série/IMEI: {selectedOrder.equipment.serial}</p>}
                        {selectedOrder.equipment.passwordType !== 'none' && (
                          <div className="mt-2">
                            <p className="text-sm text-amber-500">
                              Senha ({selectedOrder.equipment.passwordType}): {selectedOrder.equipment.passwordType === 'pattern' ? 'Padrão Desenho' : selectedOrder.equipment.passwordValue}
                            </p>
                            {selectedOrder.equipment.passwordType === 'pattern' && selectedOrder.equipment.passwordValue && (
                              <button
                                onClick={() => {
                                  setIsPatternModalOpen(true);
                                }}
                                className="mt-2 flex items-center gap-2 bg-[#1A1A1A] hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-zinc-700"
                              >
                                <Eye size={14} className="text-blue-400" />
                                Visualizar Desenho
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>

                {/* Checklist de Entrada */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} /> Checklist de Entrada
                  </h3>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 border border-zinc-800/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Object.entries(selectedOrder.checklist).map(([item, status]) => (
                        <div key={item} className="flex items-center gap-2 text-sm">
                          {status === 'works' ? (
                            <CheckCircle2 size={14} className="text-[#00E676]" />
                          ) : status === 'broken' ? (
                            <XCircle size={14} className="text-red-500" />
                          ) : (
                            <AlertCircle size={14} className="text-zinc-500" />
                          )}
                          <span className={status === 'works' ? 'text-zinc-300' : status === 'broken' ? 'text-red-400' : 'text-zinc-500'}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                    {selectedOrder.checklistNotes && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <p className="text-xs text-zinc-500 mb-1">Observações do Checklist</p>
                        <p className="text-sm text-zinc-300">{selectedOrder.checklistNotes}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Defect & Notes */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={16} /> Defeito Relatado
                  </h3>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 border border-zinc-800/50">
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedOrder.defect}</p>
                  </div>
                </section>

                {selectedOrder.technicianNotes && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} /> Observações do Técnico
                    </h3>
                    <div className="bg-[#0A0A0A] rounded-xl p-4 border border-zinc-800/50">
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedOrder.technicianNotes}</p>
                    </div>
                  </section>
                )}

                {/* Financials */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <Banknote size={16} /> Valores e Serviço
                    </h3>
                    {selectedOrder.financials.paymentStatus !== 'Total' && (
                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="text-xs font-bold text-[#00E676] hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Registrar Pagamento
                      </button>
                    )}
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 border border-zinc-800/50">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Serviço Contratado</p>
                        <p className="text-sm text-white">{selectedOrder.service || 'Não especificado'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Valor Total</p>
                        <p className="text-lg font-medium text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials.totalValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Valor Pago</p>
                        <p className="text-lg font-medium text-emerald-500">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials.amountPaid || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Status Pagamento</p>
                        <select
                          value={selectedOrder.financials.paymentStatus}
                          onChange={(e) => {
                            const newStatus = e.target.value as 'Total' | 'Parcial' | 'Pendente';
                            updatePaymentStatus(selectedOrder, newStatus);
                            setSelectedOrder(prev => prev ? {
                              ...prev,
                              financials: { ...prev.financials, paymentStatus: newStatus }
                            } : null);
                          }}
                          className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider bg-[#0A0A0A] border border-zinc-800 focus:outline-none focus:border-[#00E676] transition-colors appearance-none cursor-pointer ${
                            selectedOrder.financials.paymentStatus === 'Total' ? 'text-emerald-500 border-emerald-500/30' :
                            selectedOrder.financials.paymentStatus === 'Parcial' ? 'text-blue-400 border-blue-500/30' :
                            'text-red-400 border-red-500/30'
                          }`}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Parcial">Parcial</option>
                          <option value="Total">Total</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* History */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={16} /> Histórico da OS
                  </h3>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 border border-zinc-800/50 space-y-4">
                    {selectedOrder.history.map((event, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-[#00E676] mt-1.5" />
                          {i < selectedOrder.history.length - 1 && <div className="w-px h-full bg-zinc-800 my-1" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm text-white">{event.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(event.date).toLocaleString('pt-BR')}</span>
                            <span className="flex items-center gap-1"><User size={12} /> {event.user}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Completion Data (if available) */}
                {selectedOrder.completionData && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#00E676] uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={16} /> Dados de Finalização
                    </h3>
                    <div className="bg-[#00E676]/5 rounded-xl p-6 border border-[#00E676]/20 space-y-6">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Serviços Realizados</p>
                        <p className="text-sm text-white whitespace-pre-wrap">{selectedOrder.completionData.servicesPerformed}</p>
                      </div>

                      {selectedOrder.completionData.partsUsed && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Peças Utilizadas</p>
                          <p className="text-sm text-white">{selectedOrder.completionData.partsUsed}</p>
                          {selectedOrder.completionData.supplier && (
                            <p className="text-xs text-zinc-500 mt-1">Fornecedor: {selectedOrder.completionData.supplier}</p>
                          )}
                        </div>
                      )}

                      {selectedOrder.completionData.warrantyDays && (
                        <div className="flex items-start gap-3 bg-[#0A0A0A] p-4 rounded-lg border border-zinc-800">
                          <ShieldCheck className="text-[#00E676] shrink-0 mt-0.5" size={20} />
                          <div>
                            <p className="text-sm font-medium text-white">Garantia de {selectedOrder.completionData.warrantyDays} dias</p>
                            {selectedOrder.completionData.warrantyDescription && (
                              <p className="text-xs text-zinc-400 mt-1">{selectedOrder.completionData.warrantyDescription}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finishing Modal */}
      <AnimatePresence>
        {isFinishing && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50 rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-[#00E676] flex items-center gap-2">
                    <CheckCircle2 size={24} />
                    Finalizar Reparo
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">OS #{selectedOrder.osNumber.toString().padStart(4, '0')}</p>
                </div>
                <button
                  onClick={() => setIsFinishing(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Services */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Wrench size={16} className="text-blue-500" /> Serviços Realizados *
                  </h3>
                  <textarea
                    value={servicesPerformed}
                    onChange={e => setServicesPerformed(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors min-h-[100px] resize-y"
                    placeholder="Descreva detalhadamente o que foi feito no aparelho..."
                  />
                </section>

                {/* Parts from Catalog */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Package size={16} className="text-emerald-500" /> Peças do Catálogo
                    </h3>
                    <button
                      onClick={() => setIsProductSearchOpen(true)}
                      className="text-xs font-medium text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                    >
                      <Plus size={14} /> Adicionar Peça
                    </button>
                  </div>

                  {selectedProducts.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-zinc-800 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-white">{p.name}</p>
                            <p className="text-xs text-zinc-500">Unitário: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedProducts(prev => prev.map(item => item.id === p.id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))}
                                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-bold text-white w-6 text-center">{p.quantity}</span>
                              <button
                                onClick={() => setSelectedProducts(prev => prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item))}
                                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              onClick={() => setSelectedProducts(prev => prev.filter(item => item.id !== p.id))}
                              className="p-1 hover:bg-red-500/20 text-red-500 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-zinc-800 rounded-xl text-center">
                      <p className="text-xs text-zinc-500">Nenhuma peça do catálogo selecionada</p>
                    </div>
                  )}

                  {/* Manual Parts Entry (Legacy) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-400">Outras Peças (Manual)</label>
                      <input
                        type="text"
                        value={partsUsed}
                        onChange={e => setPartsUsed(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                        placeholder="Ex: Tela OLED iPhone 11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-400">Fornecedor</label>
                      <div className="relative">
                        <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                          type="text"
                          value={supplier}
                          onChange={e => setSupplier(e.target.value)}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Nome do fornecedor"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Exit Checklist */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#00E676]" /> Checklist de Saída
                  </h3>
                  <div className="bg-[#0A0A0A] rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-4 border-b border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400">
                      <div>Item</div>
                      <div className="w-16 text-center">OK</div>
                      <div className="w-16 text-center">Falha</div>
                      <div className="w-16 text-center">N/T</div>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {Object.entries(exitChecklist).map(([item, status]) => (
                        <div key={item} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-3 items-center hover:bg-zinc-900/30 transition-colors">
                          <span className="text-sm text-zinc-300">{item}</span>
                          <button
                            onClick={() => setExitChecklist(prev => ({ ...prev, [item]: 'works' }))}
                            className={`w-16 h-8 rounded-lg flex items-center justify-center transition-colors ${status === 'works' ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800'}`}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setExitChecklist(prev => ({ ...prev, [item]: 'broken' }))}
                            className={`w-16 h-8 rounded-lg flex items-center justify-center transition-colors ${status === 'broken' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800'}`}
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => setExitChecklist(prev => ({ ...prev, [item]: 'untested' }))}
                            className={`w-16 h-8 rounded-lg flex items-center justify-center transition-colors ${status === 'untested' ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800'}`}
                          >
                            <span className="text-xs font-medium">-</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Warranty */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <ShieldCheck size={16} className="text-purple-500" /> Termo de Garantia
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-10 h-6 rounded-full transition-colors relative ${hasWarranty ? 'bg-[#00E676]' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${hasWarranty ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={hasWarranty} onChange={e => setHasWarranty(e.target.checked)} />
                      <span className="text-sm text-zinc-400">Emitir Garantia</span>
                    </label>
                  </div>

                  {hasWarranty && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-4 pt-2"
                    >
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Prazo (Dias)</label>
                        <select
                          value={warrantyDays}
                          onChange={e => setWarrantyDays(Number(e.target.value))}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                        >
                          <option value={30}>30 dias</option>
                          <option value={90}>90 dias</option>
                          <option value={180}>180 dias</option>
                          <option value={365}>1 ano</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Descrição / Condições da Garantia</label>
                        <input
                          type="text"
                          value={warrantyDescription}
                          onChange={e => setWarrantyDescription(e.target.value)}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: Garantia cobre apenas defeitos de fabricação da peça..."
                        />
                      </div>
                    </motion.div>
                  )}
                </section>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setIsFinishing(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCompletion}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#00E676] hover:bg-[#00C853] text-black transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  Salvar Finalização
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProductSearchOpen && (
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
              className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-emerald-500 flex items-center gap-2">
                  <Package size={24} className="text-emerald-500" />
                  Selecionar Peça do Catálogo
                </h2>
                <button onClick={() => setIsProductSearchOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    autoFocus
                    type="text"
                    value={productSearchQuery}
                    onChange={e => setProductSearchQuery(e.target.value)}
                    placeholder="Buscar por nome ou código..."
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                  {availableProducts
                    .filter(p =>
                      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                      p.barcode?.includes(productSearchQuery)
                    )
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (!selectedProducts.find(item => item.id === p.id)) {
                            setSelectedProducts(prev => [...prev, { id: p.id, name: p.name, quantity: 1, price: p.price }]);
                          }
                          setIsProductSearchOpen(false);
                          setProductSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between p-3 bg-[#0A0A0A] hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{p.name}</p>
                          <p className="text-xs text-zinc-500">Estoque: {p.stock} | {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</p>
                        </div>
                        <Plus size={18} className="text-emerald-500" />
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-emerald-500/10">
                <h2 className="text-xl font-bold text-emerald-500 flex items-center gap-2">
                  <Banknote size={24} />
                  Registrar Pagamento
                </h2>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-zinc-800">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Resumo Financeiro</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-zinc-400">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials.totalValue)}</p>
                      <p className="text-sm text-emerald-500">Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials.amountPaid || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase font-bold">Restante</p>
                      <p className="text-xl font-black text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials.totalValue - (selectedOrder.financials.amountPaid || 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Valor do Pagamento (R$)</label>
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white text-2xl font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Dinheiro', 'PIX', 'Cartão', 'Transferência'] as const).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === method
                          ? 'bg-zinc-800 border-zinc-600 text-white shadow-inner'
                          : 'bg-[#0A0A0A] border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {method === 'Dinheiro' && <Banknote size={16} />}
                        {method === 'PIX' && <QrCode size={16} />}
                        {method === 'Cartão' && <CreditCard size={16} />}
                        {method === 'Transferência' && <TrendingUp size={16} />}
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRegisterPayment}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPatternModalOpen && selectedOrder && (
          <PatternLock
            isOpen={isPatternModalOpen}
            onClose={() => setIsPatternModalOpen(false)}
            onSave={() => {}}
            initialPattern={selectedOrder.equipment.passwordValue}
            readOnly={true}
          />
        )}
      </AnimatePresence>

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

      {/* PROFESSIONAL PRINT TEMPLATE */}
      {selectedOrder && (
        <>
          <div className="print-a4-container">
            <OrderPrintTemplate
              order={selectedOrder}
              customer={customers.find(c => c.id === selectedOrder.customerId)}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>
          <div className="print-thermal-container">
            <ThermalReceiptTemplate
              order={selectedOrder}
              customer={customers.find(c => c.id === selectedOrder.customerId)}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>
        </>
      )}
    </div>
  );
}

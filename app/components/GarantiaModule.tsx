import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Search, ShieldCheck, ShieldAlert, Filter, 
  Calendar, User, Smartphone, FileText, CheckCircle2, XCircle, 
  Eye, Printer, MessageCircle, Clock, Save, ChevronDown, Wrench, X, Share2, Pen
} from 'lucide-react';
import { supabase } from '../supabase';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WarrantyPrintTemplate from './WarrantyPrintTemplate';
import WarrantyThermalTemplate from './WarrantyThermalTemplate';
import SignatureCanvas from 'react-signature-canvas';

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
  const [printMode, setPrintMode] = useState<'warranty' | 'warranty-thermal' | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // New Warranty Flow States
  const [isNewWarrantyModalOpen, setIsNewWarrantyModalOpen] = useState(false);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [searchQueryOs, setSearchQueryOs] = useState('');
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);
  const [isCreatingNewWarranty, setIsCreatingNewWarranty] = useState(false);
  const [osToConfirm, setOsToConfirm] = useState<any>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const sigCanvasRef = useRef<any>(null);

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

      const updates: any = {
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

      if (editForm.id === 'NEW') {
        // 1. Atualizar a OS para Reparo Concluído e salvar os termos de garantia
        const { data: orderData } = await supabase
          .from('orders')
          .select('completion_data')
          .eq('id', editForm.os_id)
          .single();

        const newCompletionData = {
          ...(orderData?.completion_data || {}),
          warrantyDays: editForm.duration_days,
          warrantyTerms: (editForm as any)._warranty_terms,
          signatures: {
            ...(orderData?.completion_data?.signatures || {}),
            technician: (editForm as any)._technician_signature || orderData?.completion_data?.signatures?.technician || null
          }
        };

        const { error: osError } = await supabase
          .from('orders')
          .update({ 
            status: 'Reparo Concluído', 
            completion_data: newCompletionData,
            updated_at: new Date().toISOString() 
          })
          .eq('id', editForm.os_id);

        if (osError) throw osError;

        // 2. Inserir a nova Garantia
        const insertData = {
          ...updates,
          company_id: editForm.company_id || profile.company_id,
          user_id: editForm.user_id || profile.user_id || profile.id || null,
          os_id: editForm.os_id,
          os_number: editForm.os_number,
          created_at: new Date().toISOString()
        };

        const { data: insertedData, error } = await supabase
          .from('warranties')
          .insert(insertData)
          .select('*')
          .single();

        if (error) throw error;

        onLogActivity?.('GARANTIA', 'CRIOU GARANTIA DA OS', {
          warrantyId: insertedData.id,
          osNumber: insertedData.os_number,
          clientName: insertedData.client_name,
          description: `Criou garantia da OS #${insertedData.os_number} para ${insertedData.client_name}`
        });

        onShowToast('Garantia criada com sucesso!');
        setIsEditing(false);
        setWarranties(prev => [insertedData, ...prev]);
        setSelectedWarranty(insertedData);

      } else {
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
      }
    } catch (err: any) {
      console.error('Update/Insert error:', err);
      onShowToast('Erro ao salvar garantia');
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

  // Função direta de impressão (evita useEffect para não perder o user-gesture no Mobile Safari)
  // Função direta de impressão (evita useEffect para não perder o user-gesture no Mobile Safari)
  const triggerPrint = async (mode: 'warranty' | 'warranty-thermal') => {
    if (!selectedWarranty) {
      onShowToast('Nenhuma garantia selecionada.');
      return;
    }

    const originalTitle = document.title;
    const osNumber = selectedWarranty.os_number.toString().padStart(4, '0');
    const companyName = companySettings?.name || 'Servyx';
    
    document.title = `${companyName.toUpperCase().replace(/\s+/g, '_')}_Garantia_${osNumber}`;
    
    // Ativa o estado de carregamento
    setIsPrinting(true);

    // Limpa classes anteriores
    document.body.classList.remove('print-warranty', 'print-warranty-thermal');
    
    // Adiciona a classe atual
    document.body.classList.add(`print-${mode}`);
    
    // Mobile Fix: Forçar o scroll do body para o topo para garantir que o absolute da portal-root funcione
    window.scrollTo(0, 0);

    // Força o navegador a recalcular o layout (ajuda no Mobile Chrome/Safari a aplicar o CSS display:block antes do print)
    void document.body.offsetHeight;

    // Identifica o contêiner ativo da impressão no Portal
    const className = mode === 'warranty-thermal' ? 'warranty-thermal-container' : `print-${mode}-container`;
    const container = document.querySelector(`.${className}`) as HTMLElement;

    if (container) {
      // Aguarda o carregamento de todas as imagens (logomarca e assinaturas base64)
      await new Promise<void>((resolve) => {
        const imgs = Array.from(container.querySelectorAll('img'));
        if (imgs.length === 0) {
          resolve();
          return;
        }
        let loaded = 0;
        const timer = setTimeout(resolve, 3000); // safety timeout de 3 segundos
        const onLoad = () => {
          loaded++;
          if (loaded >= imgs.length) {
            clearTimeout(timer);
            resolve();
          }
        };
        imgs.forEach((img) => {
          if (img.complete) {
            onLoad();
          } else {
            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', onLoad, { once: true });
          }
        });
      });
    }

    // Micro-timeout de 150ms para garantir renderização e fechar o loading antes de bloquear a thread do JS
    setTimeout(() => {
      setIsPrinting(false);
      window.print();
      
      // Limpeza após fechar o diálogo de impressão
      document.body.classList.remove(`print-${mode}`);
      document.title = originalTitle;
    }, 150);
  };

  // Função para compartilhar o documento via API nativa (Mobile)
  const handleSharePDF = async () => {
    if (!selectedWarranty || !selectedWarrantyData) {
      onShowToast('Selecione uma garantia primeiro.');
      return;
    }

    const osNumberFormatted = selectedWarranty.os_number.toString().padStart(4, '0');
    const companyName = companySettings.name || 'Servyx';
    const filename = `${companyName.toUpperCase().replace(/\s+/g, '_')}_Garantia_${osNumberFormatted}`;

    try {
      const React = await import('react');
      const { generateAndSharePDF } = await import('../utils/generatePDF');
      const { default: WarrantyPrintTemplate } = await import('./WarrantyPrintTemplate');

      const templateElement = React.createElement(WarrantyPrintTemplate, {
        order: selectedWarrantyData.order as any,
        customer: selectedWarrantyData.customer,
        companySettings,
        osSettings,
        isPreview: false,
      });

      await generateAndSharePDF(templateElement, filename, onShowToast, { forceShowOnly: false });
    } catch (error: any) {
      console.error('Erro PDF:', error);
      onShowToast(`Erro ao gerar PDF: ${(error.message || 'Erro desconhecido').substring(0, 50)}`);
    }
  };

  // Nova Garantia Flow
  const fetchOpenOrders = async () => {
    setIsFetchingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('company_id', profile.company_id)
        .not('status', 'in', '("Orçamento Cancelado", "Sem Reparo", "Equipamento Retirado")')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpenOrders(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar OS em aberto:', err);
      onShowToast('Erro ao carregar ordens de serviço');
    } finally {
      setIsFetchingOrders(false);
    }
  };

  useEffect(() => {
    if (isNewWarrantyModalOpen) {
      fetchOpenOrders();
    }
  }, [isNewWarrantyModalOpen]);

  const handleCreateWarrantyFromOS = (order: any) => {
    // Se já está com status Reparo Concluído, pular confirmação
    if (order.status === 'Reparo Concluído') {
      setOsToConfirm(null);
      // Vai direto para a preparação do form
      prepareNewWarrantyForm(order);
    } else {
      setOsToConfirm(order);
    }
  };

  const confirmCreateWarrantyFromOS = async () => {
    if (!osToConfirm) return;
    const order = osToConfirm;
    setOsToConfirm(null);
    prepareNewWarrantyForm(order);
  };

  const prepareNewWarrantyForm = (order: any) => {
    setIsNewWarrantyModalOpen(false);

    try {
      const now = new Date().toISOString();
      let warrantyDays = order.completion_data?.warrantyDays || 90;
      if (typeof warrantyDays === 'string') warrantyDays = parseInt(warrantyDays, 10);
      if (isNaN(warrantyDays)) warrantyDays = 90;
      
      const endDate = addDays(new Date(), warrantyDays).toISOString();
      
      const customer = order.customer || {};
      const customerName = customer.name || 'Cliente';
      const osNumberStr = (order.os_number || order.osNumber || 0).toString().padStart(4, '0');
      
      const equipmentStr = typeof order.equipment === 'string' 
        ? order.equipment 
        : `${order.equipment?.brand || ''} ${order.equipment?.model || ''}`.trim() || 'Equipamento';

      // Texto dos termos padrão
      const defaultTerms = osSettings?.warrantyTerms || (
        "• A garantia tem cobertura exclusiva aos serviços e peças componentes do reparo atual descritos neste documento.\n" +
        "• Ocorrerá a perda imediata da garantia em caso de rompimento, ausência ou violação dos selos de segurança.\n" +
        "• A garantia não abrange novos defeitos não relacionados à natureza do problema original reparado.\n" +
        "• Danos gerados por mau uso, quebras estruturais, exposição a umidade, líquidos, quedas acidentais ou flutuação extrema de energia elétrica em carregadores genéricos anulam automaticamente qualquer cobertura.\n" +
        "• Não nos responsabilizamos por perdas de dados, softwares, fotos ou informações contidas sob posse do dispositivo em caso de falha de hardware.\n" +
        "• Para acionar a garantia nos meses supracitados, é indispensável a exibição deste termo assim como das peças em questão."
      );

      // Criamos um objeto "mock" para abrir a tela de edição em modo de inserção
      const newWarrantyObj: any = {
        id: 'NEW', // flag especial
        company_id: profile.company_id,
        user_id: profile.user_id || profile.id || null,
        os_id: order.id,
        os_number: osNumberStr,
        client_name: customerName,
        equipment: equipmentStr,
        service_performed: order.completion_data?.servicesPerformed || order.service || 'Serviço técnico',
        start_date: now,
        end_date: endDate,
        duration_days: warrantyDays,
        notes: order.completion_data?.technicianObservations || '',
        status: 'Ativa',
        // Dados extras para exibição no form
        _customer_phone: customer.whatsapp || customer.phone || '',
        _customer_email: customer.email || '',
        _customer_document: customer.document || '',
        _customer_address: customer.address ? `${customer.address.street || ''}${customer.address.number ? ', ' + customer.address.number : ''} - ${customer.address.neighborhood || ''} - ${customer.address.city || ''}/${customer.address.state || ''}` : '',
        _equipment_type: order.equipment?.type || '',
        _equipment_brand: order.equipment?.brand || '',
        _equipment_model: order.equipment?.model || '',
        _equipment_serial: order.equipment?.serial || '',
        _equipment_color: order.equipment?.color || '',
        _defect: order.defect || '',
        _warranty_terms: defaultTerms,
        _technician_signature: null,
        _os_status: order.status
      };

      setEditForm(newWarrantyObj);
      setSelectedWarranty(newWarrantyObj as any);
      setIsEditing(true);

    } catch (err: any) {
      console.error('Erro ao preparar garantia:', err);
      onShowToast('Erro ao preparar tela de garantia');
    }
  };

  const filteredOpenOrders = openOrders.filter(o => {
    if (!searchQueryOs) return true;
    const term = searchQueryOs.toLowerCase();
    const osNum = (o.os_number || o.osNumber || '').toString();
    const clientMatch = o.customer?.name?.toLowerCase().includes(term) || false;
    const equipBrand = o.equipment?.brand?.toLowerCase() || '';
    const equipModel = o.equipment?.model?.toLowerCase() || '';
    const equipString = typeof o.equipment === 'string' ? o.equipment.toLowerCase() : '';
    
    return osNum.includes(term) || clientMatch || equipBrand.includes(term) || equipModel.includes(term) || equipString.includes(term);
  });

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
                <ChevronLeft size={20} />
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
               <button
                 onClick={() => setIsNewWarrantyModalOpen(true)}
                 className="flex items-center gap-1.5 bg-[#00E676]/10 text-[#00E676] hover:bg-[#00E676]/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all"
               >
                 <ShieldCheck size={16} />
                 <span>Nova Garantia</span>
               </button>
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm no-print"
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
                    {/* SEÇÃO: DADOS DO CLIENTE */}
                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-md p-4 space-y-4">
                      <p className="text-[10px] font-black text-[#00E676] uppercase tracking-widest flex items-center gap-2">
                        <User size={12} /> Dados do Cliente
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome</label>
                          <input 
                            type="text"
                            value={editForm.client_name || ''}
                            onChange={e => setEditForm({ ...editForm, client_name: e.target.value })}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all"
                          />
                        </div>
                        {(editForm as any)?._customer_document && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">CPF / CNPJ</label>
                            <div className="w-full bg-black/30 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm text-zinc-300">{(editForm as any)._customer_document}</div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(editForm as any)?._customer_phone && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Telefone / WhatsApp</label>
                            <div className="w-full bg-black/30 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm text-zinc-300">{(editForm as any)._customer_phone}</div>
                          </div>
                        )}
                        {(editForm as any)?._customer_email && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Email</label>
                            <div className="w-full bg-black/30 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm text-zinc-300">{(editForm as any)._customer_email}</div>
                          </div>
                        )}
                      </div>
                      {(editForm as any)?._customer_address && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Endereço</label>
                          <div className="w-full bg-black/30 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm text-zinc-300">{(editForm as any)._customer_address}</div>
                        </div>
                      )}
                    </div>

                    {/* SEÇÃO: DADOS DO EQUIPAMENTO */}
                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-md p-4 space-y-4">
                      <p className="text-[10px] font-black text-[#00E676] uppercase tracking-widest flex items-center gap-2">
                        <Smartphone size={12} /> Equipamento
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Equipamento (Marca + Modelo)</label>
                          <input 
                            type="text"
                            value={editForm.equipment || ''}
                            onChange={e => setEditForm({ ...editForm, equipment: e.target.value })}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all"
                          />
                        </div>
                        {(editForm as any)?._equipment_type && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Tipo</label>
                            <div className="w-full bg-black/30 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm text-zinc-300">{(editForm as any)._equipment_type}</div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {(editForm as any)?._equipment_serial && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">IMEI / Serial</label>
                            <div className="w-full bg-black/30 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm text-zinc-300 font-mono">{(editForm as any)._equipment_serial}</div>
                          </div>
                        )}
                        {(editForm as any)?._equipment_color && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cor</label>
                            <div className="w-full bg-black/30 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm text-zinc-300">{(editForm as any)._equipment_color}</div>
                          </div>
                        )}
                      </div>
                      {(editForm as any)?._defect && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Defeito Relatado</label>
                          <div className="w-full bg-black/30 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm text-zinc-300">{(editForm as any)._defect}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* SEÇÃO: SERVIÇO */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Serviço Realizado</label>
                      <textarea 
                        rows={2}
                        value={editForm.service_performed || ''}
                        onChange={e => setEditForm({ ...editForm, service_performed: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none"
                      />
                    </div>

                    {/* SEÇÃO: GARANTIA - Data + Período lado a lado */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Início</label>
                          <input 
                            type="date"
                            value={editForm.start_date ? editForm.start_date.split('T')[0] : ''}
                            onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all [color-scheme:dark]"
                          />
                        </div>
                        <div className="space-y-1.5 relative">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Período</label>
                          <button
                            type="button"
                            onClick={() => setShowDurationPicker(!showDurationPicker)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none hover:border-zinc-600 transition-all flex items-center justify-between"
                          >
                            <span className="font-bold">{editForm.duration_days || 90} dias</span>
                            <ChevronDown size={16} className={`text-zinc-500 transition-transform ${showDurationPicker ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {showDurationPicker && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-zinc-700 rounded-md shadow-2xl shadow-black/60 z-20 overflow-hidden"
                              >
                                {[30, 60, 90, 120, 180].map(days => (
                                  <button
                                    key={days}
                                    type="button"
                                    onClick={() => { setEditForm({ ...editForm, duration_days: days }); setShowDurationPicker(false); }}
                                    className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-colors flex items-center justify-between ${
                                      editForm.duration_days === days
                                        ? 'bg-[#00E676]/10 text-[#00E676]'
                                        : 'text-zinc-300 hover:bg-zinc-800'
                                    }`}
                                  >
                                    <span>{days} dias</span>
                                    {editForm.duration_days === days && <CheckCircle2 size={14} />}
                                  </button>
                                ))}
                                <div className="border-t border-zinc-800 px-4 py-2.5 flex items-center gap-2">
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">Outro:</span>
                                  <input 
                                    type="number"
                                    value={![30, 60, 90, 120, 180].includes(editForm.duration_days || 0) ? (editForm.duration_days || '') : ''}
                                    onChange={e => { setEditForm({ ...editForm, duration_days: parseInt(e.target.value) || 0 }); }}
                                    onKeyDown={e => { if (e.key === 'Enter') setShowDurationPicker(false); }}
                                    placeholder="Ex: 45"
                                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E676] transition-all"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Vencimento Calculado</label>
                        <div className="w-full bg-black/40 border border-zinc-800/50 rounded-sm px-4 py-3 text-sm font-bold text-[#00E676]">
                          {format(addDays(parseISO((editForm.start_date || selectedWarranty.start_date || new Date().toISOString()).split('T')[0] || new Date().toISOString()), editForm.duration_days || 0), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO: TERMOS E CONDIÇÕES */}
                    {(editForm as any)?._warranty_terms !== undefined && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Termos e Condições da Garantia (texto impresso)</label>
                        <textarea 
                          rows={6}
                          value={(editForm as any)._warranty_terms || ''}
                          onChange={e => setEditForm({ ...editForm, _warranty_terms: e.target.value } as any)}
                          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-xs text-zinc-300 focus:outline-none focus:border-[#00E676] transition-all resize-none leading-relaxed"
                        />
                      </div>
                    )}

                    {/* SEÇÃO: OBSERVAÇÕES (abaixo dos termos) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Observações</label>
                      <textarea 
                        rows={3}
                        value={editForm.notes || ''}
                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none"
                      />
                    </div>

                    {/* SEÇÃO: ASSINATURA DO TÉCNICO (botão abrindo modal) */}
                    {editForm.id === 'NEW' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Assinatura do Técnico</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsSignatureModalOpen(true)}
                            className="bg-[#00E676] hover:bg-[#00c853] text-black font-bold py-2.5 px-4 rounded-sm text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                          >
                            <Pen size={14} /> 
                            {editForm._technician_signature ? 'Alterar Assinatura' : 'Coletar Assinatura'}
                          </button>
                          
                          {(editForm as any)._technician_signature && (
                            <div className="flex items-center gap-2">
                              <div className="bg-white rounded-sm border border-zinc-700 h-10 px-2 flex items-center justify-center">
                                <img src={(editForm as any)._technician_signature} alt="Assinatura" className="h-8 object-contain" />
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditForm({ ...editForm, _technician_signature: null } as any)}
                                className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider transition-colors"
                              >
                                Limpar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                   <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 flex flex-col items-center relative custom-scrollbar p-0 sm:p-8 rounded-xl border border-zinc-800">
                     <div className="w-full max-w-[210mm] shadow-2xl rounded-sm overflow-hidden bg-white mx-auto mb-10 sm:max-w-[794px]">
                       {selectedWarrantyData && (
                         <WarrantyPrintTemplate
                           order={{
                             ...selectedWarrantyData.order,
                             company_id: (selectedWarrantyData.order as any).companyId ?? '',
                             os_number: (selectedWarrantyData.order as any).osNumber ?? 0,
                           }}
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
                      {/* Desktop A4 Button */}
                      <button 
                        onClick={() => triggerPrint('warranty')}
                        className="hidden sm:flex flex-1 h-[48px] bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-sm transition-all border border-zinc-700/50 items-center justify-center gap-2"
                      >
                        <Printer size={18} className="text-zinc-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">A4</span>
                      </button>

                      {/* Mobile Export PDF Button */}
                      <button 
                        onClick={handleSharePDF}
                        className="flex sm:hidden flex-1 h-[54px] bg-red-500 hover:bg-red-400 text-white rounded-sm transition-all shadow-lg items-center justify-center gap-2"
                      >
                        <FileText size={18} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Exportar PDF</span>
                      </button>

                      {/* Thermal Button (Both) */}
                      <button 
                        onClick={() => triggerPrint('warranty-thermal')}
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
                      className="hidden sm:flex w-full sm:flex-[1.2] h-[54px] sm:h-[48px] bg-[#00E676] hover:bg-[#00C853] text-black rounded-sm transition-all items-center justify-center gap-2 px-6 group shadow-lg"
                    >
                      <MessageCircle size={18} className="shrink-0" />
                      <span className="text-xs font-black uppercase tracking-widest text-center">Enviar WhatsApp</span>
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
          typeof document !== 'undefined' ? (document.getElementById('print-portal-root') || document.body) : null as any
        )
      )}

      {/* Loading de Impressão */}
      <AnimatePresence>
        {isPrinting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-white font-black uppercase tracking-widest text-xs">Preparando Documento</p>
                <p className="text-zinc-500 text-[10px] uppercase mt-1">Aguarde um instante...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* New Warranty Modal */}
      <AnimatePresence>
        {isNewWarrantyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex flex-col sm:items-center sm:justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-[#141414] border border-zinc-800 rounded-xl flex flex-col overflow-hidden max-h-full shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-zinc-800/80 flex items-center justify-between sticky top-0 bg-[#141414]/90 backdrop-blur-md z-10">
                <div>
                  <h2 className="text-lg font-black flex items-center gap-2">
                    <ShieldCheck className="text-[#00E676]" size={20} />
                    Criar Nova Garantia
                  </h2>
                  <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1">
                    Selecione uma OS em aberto
                  </p>
                </div>
                <button
                  onClick={() => setIsNewWarrantyModalOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="relative group mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00E676] transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por OS, cliente ou equipamento..."
                    value={searchQueryOs}
                    onChange={e => setSearchQueryOs(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-md pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all outline-none"
                    autoFocus
                  />
                </div>

                {isFetchingOrders ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                    <div className="w-8 h-8 border-2 border-zinc-800 border-t-[#00E676] rounded-full animate-spin mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Buscando Ordens de Serviço...</p>
                  </div>
                ) : filteredOpenOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-center">
                    <Search size={32} className="mb-4 opacity-50" />
                    <p className="text-sm font-bold">Nenhuma OS encontrada</p>
                    <p className="text-xs mt-1">Tente buscar por outro termo ou número.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOpenOrders.map((order) => {
                      const osNum = (order.os_number || order.osNumber || 0).toString().padStart(4, '0');
                      const equipName = typeof order.equipment === 'string' ? order.equipment : `${order.equipment?.brand || ''} ${order.equipment?.model || ''}`.trim() || 'Equipamento';
                      
                      return (
                        <button
                          key={order.id}
                          onClick={() => handleCreateWarrantyFromOS(order)}
                          disabled={isCreatingNewWarranty}
                          className="w-full bg-[#0A0A0A] hover:bg-zinc-800/80 border border-zinc-800 hover:border-[#00E676]/30 p-4 rounded-md text-left transition-all group flex flex-col sm:flex-row sm:items-center gap-3 disabled:opacity-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black bg-[#00E676]/10 text-[#00E676] px-2 py-0.5 rounded-sm uppercase tracking-wider">
                                OS {osNum}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 py-0.5 bg-zinc-800 rounded-sm">
                                {order.status}
                              </span>
                            </div>
                            <p className="font-bold text-sm text-white group-hover:text-[#00E676] transition-colors line-clamp-1">
                              {order.customer?.name || 'Cliente'}
                            </p>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider line-clamp-1 mt-0.5">
                              {equipName}
                            </p>
                          </div>
                          
                          <div className="hidden sm:flex shrink-0 w-8 h-8 rounded-full bg-zinc-800 items-center justify-center group-hover:bg-[#00E676] group-hover:text-black transition-colors">
                            <ChevronLeft className="rotate-180" size={16} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal para OS Selecionada */}
      <AnimatePresence>
        {osToConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#141414] border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-2xl p-6"
            >
              <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-center font-black text-white text-lg mb-2">Atenção ao Status</h3>
              <p className="text-zinc-400 text-sm text-center mb-6 leading-relaxed">
                A OS <strong className="text-white">{(osToConfirm.os_number || osToConfirm.osNumber || 0).toString().padStart(4, '0')}</strong> está atualmente com o status <strong className="text-white">{osToConfirm.status}</strong>.<br/><br/>
                Ao continuar, a tela de criação de garantia será aberta, e quando você clicar em <strong>"Salvar Alterações"</strong>, o status desta OS será alterado automaticamente para <strong className="text-[#00E676]">Reparo Concluído</strong>. Deseja continuar?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setOsToConfirm(null)}
                  className="flex-1 py-3 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCreateWarrantyFromOS}
                  className="flex-1 py-3 text-sm font-black text-black bg-[#00E676] hover:bg-[#00C853] rounded-md uppercase tracking-wider transition-colors shadow-lg shadow-[#00E676]/20"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading de Nova Garantia */}
      <AnimatePresence>
        {isCreatingNewWarranty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-white font-black uppercase tracking-widest text-xs">Gerando Garantia</p>
                <p className="text-zinc-500 text-[10px] uppercase mt-1">Atualizando status da OS...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signature Modal */}
      <AnimatePresence>
        {isSignatureModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsSignatureModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] border border-zinc-800 rounded-lg shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#141414]">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Pen size={16} className="text-[#00E676]" /> Coletar Assinatura
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Assine com o dedo ou mouse na área abaixo.</p>
                </div>
                <button
                  onClick={() => setIsSignatureModalOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 bg-zinc-900/50">
                <div className="w-full bg-white rounded-md border-2 border-dashed border-zinc-500 overflow-hidden" style={{ touchAction: 'none' }}>
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="#1a1a1a"
                    canvasProps={{
                      className: 'w-full',
                      style: { width: '100%', height: '250px' }
                    }}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 flex justify-between items-center bg-[#141414]">
                <button
                  onClick={() => {
                    if (sigCanvasRef.current) sigCanvasRef.current.clear();
                  }}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 font-bold uppercase tracking-wider transition-colors"
                >
                  Limpar
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsSignatureModalOpen(false)}
                    className="px-4 py-2 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
                        const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
                        setEditForm({ ...editForm, _technician_signature: dataUrl } as any);
                      }
                      setIsSignatureModalOpen(false);
                    }}
                    className="px-6 py-2 rounded-sm bg-[#00E676] hover:bg-[#00c853] text-black text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-[#00E676]/20 flex items-center gap-2"
                  >
                    <Save size={14} /> Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/app/supabase';
import { Order, CompanySettings, OsSettings } from '@/app/types';
import OrderPrintTemplate from '@/app/components/OrderPrintTemplate';
import BudgetDocumentView from '@/app/components/BudgetDocumentView';
import {
  Smartphone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Wrench,
  ShieldCheck,
  Inbox,
  FileText,
  Search,
  LogOut,
  History,
  Check,
  X,
  Signature as SignatureIcon,
  MessageCircle,
  AlertCircle,
  Image as ImageIcon,
  ChevronRight,
  User,
  Hash,
  Calculator,
  Activity,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';

const STATUS_CONFIG: Record<string, { icon: React.ElementType, color: string, bg: string, label: string }> = {
  'Entrada': { icon: Inbox, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Entrada' },
  'Orçamento em Elaboração': { icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Orçamento em Elaboração' },
  'Em Análise Técnica': { icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Em Análise Técnica' },
  'Aguardando Aprovação': { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Aguardando Aprovação' },
  'Aguardando Peça': { icon: Package, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Aguardando Peça' },
  'Em Manutenção': { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Em Manutenção' },
  'Reparo Concluído': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Reparo Concluído' },
  'Equipamento Retirado': { icon: LogOut, color: 'text-zinc-400', bg: 'bg-zinc-400/10', label: 'Equipamento Retirado' },
  'Orçamento Cancelado': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Orçamento Cancelado' },
  'Sem Reparo': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Sem Reparo' },
  'Garantia': { icon: ShieldCheck, color: 'text-teal-400', bg: 'bg-teal-400/10', label: 'Garantia' }
};

const STATUS_STEPS: string[] = [
  'Entrada',
  'Em Análise Técnica',
  'Aguardando Aprovação',
  'Em Manutenção',
  'Reparo Concluído',
  'Equipamento Retirado'
];

export default function TrackingPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<{ type: 'EXPIRED' | 'RATE_LIMITED' | 'NOT_FOUND' | null, message: string | null }>({ type: null, message: null });
  const [companySettings, setCompanySettings] = useState<CompanySettings & { isDarkTheme: boolean }>({
    name: 'SERVYX',
    cnpj: '',
    whatsapp: '',
    phone: '',
    email: '',
    street: 'Consulte a Assistência',
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: '',
    zipCode: '',
    logoUrl: '',
    publicSlug: 'servyx',
    slugHistory: [],
    followUpMessage: '',
    isDarkTheme: true
  });
  const [osSettings, setOsSettings] = useState<OsSettings>({
    nextOsNumber: 1,
    checklistItems: [],
    checklistByCategory: {},
    printTerms: "O cliente declara que as informações prestadas são verdadeiras, conferiu os dados e concorda com os termos desta Ordem de Serviço.\n\nO equipamento passará por análise técnica, podendo haver alteração no orçamento mediante aprovação do cliente.\n\nApós conclusão, reprovação ou impossibilidade de reparo, o equipamento deverá ser retirado em até 90 dias da notificação, sob pena de cobrança de armazenagem.\n\nNão nos responsabilizamos por acessórios não descritos. O cliente é responsável pelo backup e pelos dados.\n\nEquipamentos com sinais de mau uso, oxidação, quedas, violação ou reparo por terceiros podem perder a garantia.\n\nA garantia cobre apenas os serviços realizados e peças substituídas, não incluindo danos por mau uso ou causas externas.",
    whatsappMessages: {}
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showEntrySignaturePad, setShowEntrySignaturePad] = useState(false);
  const [viewMode, setViewMode] = useState<'status' | 'document'>('status');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Ajustar o modo de visualização inicial assim que a OS carregar
  useEffect(() => {
    if (order && order.signatures?.mode === 'remote' && !order.signatures?.client) {
      setViewMode('document');
    }
  }, [order]);

  // Atualizar título da página para impressão profissional
  useEffect(() => {
    if (order && companySettings.name) {
      const osNumber = order.osNumber.toString().padStart(4, '0');
      const companyName = companySettings.name || 'Servyx';
      document.title = `${companyName.toUpperCase().replace(/\s+/g, '_')}_OS_${osNumber}`;
    }
  }, [order, companySettings.name]);
  const [tempSignature, setTempSignature] = useState<string | null>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const cleanId = orderId.trim();

        // 1. Fetch the order directly (public RLS allows this)
        // We try to match by ID (standard UUID)
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();

        if (orderErr || !orderData) {
          setAccessError({ 
            type: 'NOT_FOUND', 
            message: 'Ordem de serviço não encontrada ou link inválido.' 
          });
          setLoading(false);
          return;
        }

        const typedOrder = {
          ...orderData,
          osNumber: orderData.os_number,
          entryPhotos: orderData.entry_photos || [],
          createdAt: orderData.created_at,
          updatedAt: orderData.updated_at,
          history: orderData.history || [],
          isVisualChecklist: orderData.is_visual_checklist,
          checklistNotes: orderData.checklist_notes,
          technicianNotes: orderData.technician_notes,
          checklistNotPossible: orderData.checklist_not_possible,
          completionData: orderData.completion_data,
          technicalReport: orderData.technical_report,
          scannedOsUrl: orderData.scanned_os_url,
          budget: orderData.budget || null
        } as Order;

        setOrder(typedOrder);
        setAccessError({ type: null, message: null });

        // 2. Fetch associated data using the IDs from the order
        // Fetch company settings
        const { data: companyData } = await supabase
          .from('company_settings')
          .select('*')
          .eq('id', orderData.company_id)
          .maybeSingle();

        if (companyData) {
          setCompanySettings({
            ...companyData,
            zipCode: companyData.zip_code || '',
            logoUrl: companyData.logo_url || '',
            publicSlug: companyData.public_slug || 'servyx',
            slugHistory: companyData.slug_history || [],
            followUpMessage: companyData.mensagem_acompanhamento_os || '',
            isDarkTheme: companyData.is_dark_theme ?? true
          });
        }

        // 3. Fetch customer via secure RPC (SECURITY DEFINER bypasses RLS)
        try {
          const { data: custData } = await supabase
            .rpc('get_public_customer', { p_public_id: orderData.id });
          if (custData && custData.length > 0) {
            setCustomer(custData[0]);
          }
        } catch (_) {
          // Customer data unavailable — portal still works without it
        }

        // 4. Fetch App Settings for OS terms
        try {
          const { data: settResArr } = await supabase
            .from('app_settings')
            .select('*')
            .eq('company_id', orderData.company_id);

          if (settResArr && settResArr.length > 0) {
            const settingsRow = settResArr.find((r: any) => r.key === `os_settings_${orderData.company_id}`) 
              || settResArr.find((r: any) => r.key === 'os_settings');
            if (settingsRow?.value) {
              setOsSettings(prev => ({ ...prev, ...(settingsRow.value as any) }));
            }
          }
        } catch (_) {
          // Settings unavailable — portal still works with defaults
        }

      } catch (err: any) {
        setAccessError({ 
          type: 'NOT_FOUND', 
          message: 'Erro ao carregar informações da OS.' 
        });
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleApproveBudget = async (signature: string) => {
    if (!order || !signature) return;

    setIsSubmittingApproval(true);
    try {
      const updatedBudget = {
        ...order.budget,
        status: 'Aprovado',
        clientSignature: signature,
        approvalDate: new Date().toISOString()
      };

      const historyEvent = {
        date: new Date().toISOString(),
        user: 'Cliente (Via Portal)',
        description: 'Orçamento APROVADO pelo cliente via link público.'
      };

      if (!order.id) throw new Error('ID missing');

      const { error: rpcError } = await supabase.rpc('public_approve_budget', {
        p_public_id: order.id,
        p_budget: updatedBudget,
        p_history_event: historyEvent
      });

      if (rpcError) throw rpcError;

      const osNumberStr = order.osNumber.toString().padStart(4, '0');
      const whatsappMessage = `Olá! Aprovo o orçamento da OS ${osNumberStr} no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.budget?.totalValue || 0)}. Pode dar andamento ao serviço!`;
      
      if (companySettings?.whatsapp) {
        const phoneDigits = companySettings.whatsapp.replace(/\D/g, '');
        if (phoneDigits) {
          window.open(`https://wa.me/55${phoneDigits}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
        }
      }
      
      setShowSuccessToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      } catch (err: any) {
        alert(`Erro ao aprovar orçamento: ${err.message || 'Tente novamente.'}`);
      } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRejectBudget = async (motive: string) => {
    if (!order) return;
    
    setIsSubmittingApproval(true);
    try {
      const updatedBudget = {
        ...order.budget,
        status: 'Recusado',
        rejectionReason: motive,
        rejectionDate: new Date().toISOString()
      };

      const historyEvent = {
        date: new Date().toISOString(),
        user: 'Cliente (Via Portal)',
        description: `Orçamento RECUSADO pelo cliente via link público. Motivo: ${motive || 'Não informado'}`
      };

      if (!order.id) throw new Error('ID missing');

      const { error: rpcError } = await supabase.rpc('public_reject_budget', {
        p_public_id: order.id,
        p_budget: updatedBudget,
        p_history_event: historyEvent
      });

      if (rpcError) throw rpcError;

      window.location.reload();
    } catch (err: any) {
      alert(`Erro ao recusar orçamento: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleSaveEntrySignature = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('Por favor, assine para confirmar os termos.');
      return;
    }

    const signature = sigCanvas.current?.getCanvas().toDataURL('image/png');
    if (!order || !signature) return;

    setIsSubmittingSignature(true);
    try {
      const historyEvent = {
        date: new Date().toISOString(),
        user: 'Cliente (Via Portal)',
        description: 'Termo de Entrada ASSINADO digitalmente pelo cliente via link remoto.'
      };

      if (!order.id) throw new Error('ID missing');

      const { error: rpcError } = await supabase.rpc('public_sign_order', {
        p_public_id: order.id,
        p_signature: signature,
        p_history_event: historyEvent
      });

      if (rpcError) throw rpcError;

      setShowSuccessToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      console.error('Error saving entry signature:', err);
      alert(`Erro ao salvar assinatura: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00E676] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 animate-pulse">Carregando portal do cliente...</p>
        </div>
      </div>
    );
  }

  if (accessError.type || !order) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141414] border border-zinc-800 rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-500">
          {accessError.type === 'RATE_LIMITED' ? (
            <Clock size={48} className="text-amber-500 mx-auto mb-4" />
          ) : accessError.type === 'EXPIRED' ? (
            <Lock size={48} className="text-red-500 mx-auto mb-4" />
          ) : (
            <AlertTriangle size={48} className="text-zinc-500 mx-auto mb-4" />
          )}
          
          <h1 className="text-xl font-bold text-white mb-2">
            {accessError.type === 'RATE_LIMITED' ? 'Muitas tentativas' : 
             accessError.type === 'EXPIRED' ? 'Link Expirado' : 'Ops! Algo deu errado'}
          </h1>
          
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">ID Consultado: {orderId}</p>
          <p className="text-zinc-400 mb-6 leading-relaxed">{accessError.message || 'Não foi possível encontrar esta Ordem de Serviço.'}</p>
          
          {accessError.type !== 'EXPIRED' && accessError.type !== 'RATE_LIMITED' ? (
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#00E676] text-black font-bold py-3 rounded-xl hover:bg-[#00C853] transition-colors"
            >
              Tentar Novamente
            </button>
          ) : (
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
              Entre em contato com o suporte para mais informações.
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG['Entrada'];
  const StatusIcon = currentStatusConfig.icon;
  const isPendingApproval = order.status === 'Aguardando Aprovação' && order.budget?.status !== 'Aprovado';
  const isEntrySignaturePending = order.signatures?.mode === 'remote' && !order.signatures?.client;

  const handleFinishRemoteEntry = async () => {
    if (!tempSignature) return;
    setIsSubmittingSignature(true);
    try {
      const historyEvent = {
        date: new Date().toISOString(),
        user: 'Cliente (Via Portal)',
        description: 'Termo de Entrada ASSINADO digitalmente pelo cliente via link remoto.'
      };

      // 1. Update the order with the signature
      if (!order.id) throw new Error('ID missing');

      const { error: rpcError } = await supabase.rpc('public_sign_order', {
        p_public_id: order.id,
        p_signature: tempSignature,
        p_history_event: historyEvent
      });

      if (rpcError) throw rpcError;

      // 2. Notification is handled by the dashboard detecting the new signature
      // and checking against dismissed_notifications.

      setShowSuccessToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      console.error('Error finishing entry:', err);
      alert(`Erro ao finalizar: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  if (isEntrySignaturePending) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-8">
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00E676] rounded-xl flex items-center justify-center text-black">
                <SignatureIcon size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter">ASSINATURA DIGITAL</h1>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Aguardando seu aceite</p>
              </div>
            </div>
            <p className="text-xl font-mono font-black text-[#00E676]">OS {order.osNumber.toString().padStart(4, '0')}</p>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="bg-white rounded-[1.5rem] relative overflow-hidden shadow-2xl">
               <div className="p-3 md:p-8 pb-32">
                  <OrderPrintTemplate 
                    order={order} 
                    customer={customer} 
                    companySettings={companySettings} 
                    osSettings={osSettings} 
                    isPreview={true} 
                    clientSignatureOverride={tempSignature || undefined}
                  />
               </div>

               {/* Botões de Ação Fixos no Rodapé para Mobile */}
               <div className="fixed bottom-0 left-0 right-0 p-4 flex flex-col items-center bg-white/90 backdrop-blur-md border-t border-zinc-100 z-50">
                  {!tempSignature ? (
                    <button 
                      onClick={() => setShowEntrySignaturePad(true)}
                      className="w-full max-w-md bg-[#2B323D] text-white px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center justify-center gap-3 shadow-2xl shadow-black/30"
                    >
                      <SignatureIcon size={20} /> Assinar Este Documento Agora
                    </button>
                  ) : (
                    <div className="space-y-4 w-full flex flex-col items-center">
                      <button 
                        onClick={handleFinishRemoteEntry}
                        disabled={isSubmittingSignature}
                        className="w-full max-w-sm bg-[#00E676] text-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-[#00C853] transition-all flex items-center justify-center gap-4"
                      >
                        <Check size={24} strokeWidth={4} />
                        {isSubmittingSignature ? 'Finalizando...' : 'Enviar Assinatura'}
                      </button>
                      <button 
                        onClick={() => { setTempSignature(null); setShowEntrySignaturePad(true); }}
                        className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                      >
                        Refazer Assinatura
                      </button>
                    </div>
                  )}
               </div>
            </div>

            <div className="text-center pb-10">
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Portal Oficial de Atendimento {companySettings?.name}</p>
            </div>
          </motion.div>
        </div>

        {/* MODAL DE ASSINATURA OVERLAY */}
        <AnimatePresence>
          {showEntrySignaturePad && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
                onClick={() => setShowEntrySignaturePad(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-zinc-900 w-full max-w-2xl rounded-[2.5rem] p-6 md:p-10 shadow-3xl border border-white/10"
              >
                <div className="text-center mb-8">
                  <h3 className="text-xl font-black text-white tracking-tighter">DESENHE SUA ASSINATURA</h3>
                  <p className="text-xs font-medium text-zinc-500 mt-2">Use o dedo ou caneta touch no quadro abaixo.</p>
                </div>

                <div className="bg-white rounded-[1.5rem] overflow-hidden border-4 border-zinc-800 shadow-inner">
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    minWidth={2.5}
                    maxWidth={4.5}
                    canvasProps={{ className: "w-full h-80 cursor-crosshair focus:outline-none" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                   <button 
                     onClick={() => sigCanvas.current?.clear()}
                     className="bg-black/40 border border-zinc-800 text-zinc-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-red-500 hover:border-red-500/50 transition-all"
                   >
                     Limpar
                   </button>
                   <button 
                     onClick={() => {
                       if (sigCanvas.current?.isEmpty()) {
                         alert('Por favor, desenhe sua assinatura.');
                         return;
                       }
                       setTempSignature(sigCanvas.current!.getCanvas().toDataURL('image/png'));
                       setShowEntrySignaturePad(false);
                     }}
                     className="bg-[#00E676] text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#00E676]/20"
                   >
                     Confirmar Assinatura
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 pb-24">
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md"
          >
            <div className="bg-[#141414]/90 backdrop-blur-xl border border-[#00E676]/30 rounded-2xl p-4 flex items-center gap-4 shadow-2xl shadow-[#00E676]/10">
              <div className="w-10 h-10 bg-[#00E676] rounded-xl flex items-center justify-center text-black shrink-0">
                <Check size={20} strokeWidth={4} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Assinatura Confirmada!</p>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest leading-none">OS N° {order.osNumber.toString().padStart(4, '0')} assinada com sucesso</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header com Branding */}
        <div className="flex items-center justify-between mb-8 border-b border-zinc-800/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#00E676] to-[#00C853] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00E676]/20">
               <div className="w-6 h-6 border-2 border-black rounded-sm flex items-center justify-center">
                 <div className="w-2 h-2 bg-black rounded-sm"></div>
               </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">SERVYX <span className="text-[#00E676]">OS</span></h1>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">Portal de Transparência</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Identificação Os</p>
            <p className="text-xl font-mono font-black text-[#00E676]">OS {order.osNumber.toString().padStart(4, '0')}</p>
          </div>
        </div>

        {/* ALERTA DE ORÇAMENTO PENDENTE */}
        <AnimatePresence>
          {isPendingApproval && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#00E676] text-black p-6 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-black/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Calculator size={32} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black tracking-tight">ORÇAMENTO DISPONÍVEL!</h3>
                  <p className="text-sm font-bold opacity-70">A assistência técnica enviou os detalhes para sua aprovação. Veja abaixo.</p>
                </div>
                <button 
                  onClick={() => document.getElementById('budget-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Ver Orçamento
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card de Status Principal - REMOVED DUPLICATION FROM HERE */}

        {/* TABS DE NAVEGAÇÃO */}
        <div className="flex bg-[#141414] p-1.5 rounded-2xl border border-zinc-800/50 mb-8">
          <button 
            onClick={() => setViewMode('status')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'status' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-white'}`}
          >
            <Activity size={14} /> Acompanhamento
          </button>
          <button 
            onClick={() => setViewMode('document')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'document' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-white'}`}
          >
            <FileText size={14} /> Ver Documento OS
          </button>
        </div>

        {viewMode === 'status' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Card de Status Principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-[40px] p-8 md:p-12 relative overflow-hidden group mb-6"
            >
              <div className="absolute top-0 right-0 p-12 text-zinc-800/20 group-hover:text-[#00E676]/5 transition-colors duration-1000">
                <StatusIcon size={240} strokeWidth={1} />
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className={`w-20 h-20 rounded-3xl ${currentStatusConfig.bg} flex items-center justify-center ${currentStatusConfig.color} shadow-inner`}>
                    <StatusIcon size={40} />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Status do Processo</p>
                    <h2 className={`text-3xl font-black tracking-tight ${currentStatusConfig.color}`}>{order.status}</h2>
                  </div>
                </div>
                <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl px-5 py-4 flex flex-col items-center md:items-end">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Interação em Tempo Real</p>
                  <p className="text-sm font-black flex items-center gap-2">
                    <Clock size={14} className="text-[#00E676]" />
                    {new Date(order.updatedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="mt-12 relative overflow-x-auto pb-6 custom-scrollbar no-scrollbar">
                <div className="min-w-[600px] relative">
                  <div className="absolute top-6 left-0 right-0 h-1 bg-zinc-800/50 rounded-full"></div>
                  <div className="flex justify-between relative z-10">
                    {STATUS_STEPS.map((step, idx) => {
                      const isCompleted = STATUS_STEPS.indexOf(order.status) >= idx ||
                        (order.status === 'Reparo Concluído' && idx <= 4) ||
                        (order.status === 'Equipamento Retirado' && idx <= 5);
                      const isCurrent = order.status === step;

                      return (
                        <div key={step} className="flex flex-col items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 ${isCompleted ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/30 rotate-0' : 'bg-zinc-800 text-zinc-600 rotate-45 group-hover:rotate-0'
                            } ${isCurrent ? 'ring-4 ring-[#00E676]/30 scale-110' : 'scale-100'}`}>
                            {isCompleted ? <Check size={24} strokeWidth={4} /> : <div className="w-3 h-3 bg-current rounded-full"></div>}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest text-center max-w-[80px] leading-tight ${isCompleted ? 'text-white' : 'text-zinc-600'
                            }`}>
                            {step.split(' ').slice(0, 2).join('\n')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* SEÇÃO DE ASSINATURA DE ENTRADA (PENDENTE) */}
            <AnimatePresence>
              {isEntrySignaturePending && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black border-2 border-[#00E676]/30 rounded-[40px] p-8 md:p-12 space-y-6 relative overflow-hidden mb-6"
                >
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="w-20 h-20 bg-[#00E676]/10 rounded-3xl flex items-center justify-center text-[#00E676]">
                      <SignatureIcon size={40} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-white tracking-tighter">ASSINATURA NECESSÁRIA</h3>
                      <p className="text-zinc-500 font-medium">Você ainda não assinou o termo de entrada. Por favor, revise o documento e assine para iniciarmos o reparo.</p>
                    </div>
                    <button 
                      onClick={() => setViewMode('document')}
                      className="bg-[#00E676] text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-[#00E676]/20"
                    >
                      Ver e Assinar Agora
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border-8 border-offset-4 border-zinc-900/5">
              <div className="transform origin-top transition-transform">
                {companySettings && osSettings && (
                  <OrderPrintTemplate 
                    order={order} 
                    customer={customer} 
                    companySettings={companySettings} 
                    osSettings={osSettings} 
                    isPreview={true} 
                    clientSignatureOverride={tempSignature || undefined}
                  />
                )}
              </div>
              
              {/* Botões de Ação sobre o Documento */}
              <div className="absolute bottom-10 left-0 right-0 p-8 flex flex-col items-center bg-gradient-to-t from-white via-white/95 to-transparent pt-24">
                  {isEntrySignaturePending && !tempSignature && (
                    <button 
                      onClick={() => setShowEntrySignaturePad(true)}
                      className="bg-[#2B323D] text-white px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center gap-3 shadow-2xl shadow-black/30"
                    >
                      <SignatureIcon size={20} /> Assinar Este Documento Digital
                    </button>
                  )}

                  {tempSignature && (
                    <div className="space-y-4 w-full flex flex-col items-center">
                      <button 
                        onClick={handleFinishRemoteEntry}
                        disabled={isSubmittingSignature}
                        className="w-full max-w-sm bg-[#00E676] text-black py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-[#00C853] transition-all flex items-center justify-center gap-4"
                      >
                        <Check size={24} strokeWidth={4} />
                        {isSubmittingSignature ? 'Finalizando...' : 'Enviar Assinatura Agora'}
                      </button>
                      <button 
                        onClick={() => { setTempSignature(null); setShowEntrySignaturePad(true); }}
                        className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-red-500 transition-colors bg-white/50 backdrop-blur px-4 py-2 rounded-full"
                      >
                        Refazer Desenho da Assinatura
                      </button>
                    </div>
                  )}
              </div>
            </div>

            <button 
              onClick={() => setViewMode('status')}
              className="w-full text-zinc-500 font-bold text-[10px] uppercase tracking-widest py-4 hover:text-white transition-colors"
            >
              &larr; Voltar para o Acompanhamento em Tempo Real
            </button>
          </motion.div>
        )}

        {/* MODAL DE ASSINATURA OVERLAY */}
        <AnimatePresence>
          {showEntrySignaturePad && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
                onClick={() => setShowEntrySignaturePad(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-zinc-900 w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-3xl border border-white/10"
              >
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-[#00E676]/10 rounded-2xl flex items-center justify-center text-[#00E676] mx-auto mb-6">
                    <SignatureIcon size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">ASSINATURA DIGITAL</h3>
                  <p className="text-sm font-medium text-zinc-500 mt-2">Assine no quadro branco abaixo para validar o documento.</p>
                </div>

                <div className="bg-white rounded-[2rem] overflow-hidden border-8 border-zinc-800 shadow-inner group">
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    minWidth={2.5}
                    maxWidth={4.5}
                    canvasProps={{ className: "w-full h-80 cursor-crosshair focus:outline-none" }}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                   <button 
                     onClick={() => setShowEntrySignaturePad(false)}
                     className="bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={() => sigCanvas.current?.clear()}
                     className="border border-zinc-800 text-zinc-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-red-500/50 hover:text-red-500"
                   >
                     Limpar
                   </button>
                   <button 
                     onClick={() => {
                       if (sigCanvas.current?.isEmpty()) {
                         alert('Por favor, desenhe sua assinatura.');
                         return;
                       }
                       setTempSignature(sigCanvas.current!.getCanvas().toDataURL('image/png'));
                       setShowEntrySignaturePad(false);
                     }}
                     className="col-span-2 md:col-span-1 bg-[#00E676] text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#00E676]/20"
                   >
                     Confirmar e Salvar
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
 
        {/* SEÇÃO DE ORÇAMENTO — DOCUMENTO PROFISSIONAL */}
        {(isPendingApproval || order.budget?.status === 'Aprovado' || order.budget?.status === 'Recusado') && (
          <BudgetDocumentView
            order={order}
            customer={customer}
            companySettings={companySettings}
            onApprove={handleApproveBudget}
            onReject={handleRejectBudget}
            isSubmitting={isSubmittingApproval}
          />
        )}

        {/* Informações Relevantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#141414] border border-zinc-800 rounded-3xl p-8"
          >
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
              <User size={16} className="text-[#00E676]" /> Detalhes do Cliente
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Responsável</p>
                <p className="text-xl font-bold">{customer?.name || 'Cliente identificado'}</p>
              </div>
              <div className="grid grid-cols-2 gap-6 border-t border-zinc-800/50 pt-6">
                <div>
                   <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Equipamento</p>
                   <p className="text-sm font-bold">{order.equipment.brand}</p>
                   <p className="text-xs text-zinc-500">{order.equipment.model}</p>
                </div>
                <div>
                   <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Nº Referência</p>
                   <p className="text-sm font-mono font-black text-[#00E676]">OS {order.osNumber.toString().padStart(4, '0')}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#141414] border border-zinc-800 rounded-3xl p-8"
          >
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
              <Hash size={16} className="text-[#00E676]" /> Ordem de Serviço
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Solicitação Inicial</p>
                <p className="text-sm text-zinc-400 leading-relaxed italic border-l-2 border-[#00E676] pl-4">
                  "{order.defect}"
                </p>
              </div>
              <div className="pt-6 border-t border-zinc-800/50">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Atendimento desde</p>
                <p className="text-sm font-bold">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-10 border-t border-zinc-900">
           <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] mb-4">SERVYX • TECNOLOGIA PARA ASSISTÊNCIAS</p>
           <div className="flex justify-center gap-8 text-zinc-500">
              <span className="flex items-center gap-2 text-[10px] font-bold"><ShieldCheck size={14} /> Dados Criptografados</span>
              <span className="flex items-center gap-2 text-[10px] font-bold"><CheckCircle2 size={14} /> Link Oficial</span>
           </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ size, strokeWidth }: { size: number, strokeWidth: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}


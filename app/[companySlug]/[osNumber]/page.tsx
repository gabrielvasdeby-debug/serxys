'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/app/supabase';
import SignatureCanvas from 'react-signature-canvas';
import { Order } from '@/app/types';
import OrderPrintTemplate from '@/app/components/OrderPrintTemplate';
import WarrantyPrintTemplate from '@/app/components/WarrantyPrintTemplate';
import BudgetDocumentView from '@/app/components/BudgetDocumentView';
import TechnicalReportPrintTemplate from '@/app/components/TechnicalReportPrintTemplate';
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
  Building2,
  Phone,
  MessageCircle,
  MapPin,
  Camera,
  Calendar,
  Check,
  ChevronRight,
  User,
  ExternalLink,
  Shield,
  LayoutGrid,
  Activity,
  Pencil,
  Trash2,
  X,
  ArrowRight,
  Loader2,
  FileSignature,
  ImageIcon,
  Receipt,
  Laptop,
  Monitor,
  Tablet,
  Gamepad2,
  Watch,
  Tv,
  Headphones,
  Printer,
  Speaker
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getDeviceIcon = (equipmentType: string | undefined) => {
  if (!equipmentType) return Smartphone;
  const t = equipmentType.toLowerCase();
  
  if (t.includes('computador') || t.includes('pc') || t.includes('desktop')) return Monitor;
  if (t.includes('notebook') || t.includes('laptop') || t.includes('macbook')) return Laptop;
  if (t.includes('tablet') || t.includes('ipad')) return Tablet;
  if (t.includes('videogame') || t.includes('console') || t.includes('controle') || t.includes('playstation') || t.includes('xbox') || t.includes('nintendo')) return Gamepad2;
  if (t.includes('tv') || t.includes('televisão') || t.includes('monitor')) return Tv;
  if (t.includes('relogio') || t.includes('smartwatch') || t.includes('watch') || t.includes('apple watch')) return Watch;
  if (t.includes('fone') || t.includes('headphone') || t.includes('headset') || t.includes('airpods')) return Headphones;
  if (t.includes('impressora')) return Printer;
  if (t.includes('caixa de som') || t.includes('speaker')) return Speaker;
  return Smartphone;
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType, color: string, bg: string, label: string, accent: string, description: string }> = {
  'Entrada': { icon: Inbox, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20', label: 'Entrada', accent: '#00E676', description: 'Seu equipamento foi recebido e registrado em nosso sistema.' },
  'Orçamento em Elaboração': { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20', label: 'Orçamento em Elaboração', accent: '#d97706', description: 'Nossa equipe está calculando os custos e peças necessárias.' },
  'Em Análise Técnica': { icon: Search, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border border-indigo-500/20', label: 'Em Análise Técnica', accent: '#4f46e5', description: 'Seu equipamento está sendo avaliado detalhadamente por especialistas.' },
  'Aguardando Aprovação': { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10 border border-orange-500/20', label: 'Aguardando Aprovação', accent: '#ea580c', description: 'O orçamento está pronto e aguarda sua autorização para prosseguir.' },
  'Aguardando Peça': { icon: Package, color: 'text-rose-400', bg: 'bg-rose-500/10 border border-rose-500/20', label: 'Aguardando Peça', accent: '#e11d48', description: 'Estamos aguardando a chegada de componentes específicos para o reparo.' },
  'Em Manutenção': { icon: Wrench, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20', label: 'Em Manutenção', accent: '#00E676', description: 'A manutenção está sendo executada conforme o planejado.' },
  'Reparo Concluído': { icon: CheckCircle2, color: 'text-[#00E676]', bg: 'bg-[#00E676]/10 border border-[#00E676]/30', label: 'Reparo Concluído', accent: '#059669', description: 'Tudo pronto! Seu equipamento foi testado e está disponível.' },
  'Equipamento Retirado': { icon: LogOut, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border border-zinc-500/20', label: 'Equipamento Retirado', accent: '#52525b', description: 'O equipamento foi entregue ao cliente com sucesso.' },
  'Orçamento Cancelado': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20', label: 'Orçamento Cancelado', accent: '#dc2626', description: 'O serviço foi cancelado conforme solicitação ou análise.' },
  'Sem Reparo': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10 border border-red-500/20', label: 'Sem Reparo', accent: '#b91c1c', description: 'Infelizmente o equipamento não possui condições de reparo técnico.' },
  'Garantia': { icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/20', label: 'Garantia', accent: '#0d9488', description: 'Equipamento em processo de garantia de serviço.' }
};

const STATUS_STEPS: { id: string, label: string }[] = [
  { id: 'Entrada', label: 'Entrada' },
  { id: 'Em Análise Técnica', label: 'Análise' },
  { id: 'Orçamento em Elaboração', label: 'Orçamento' },
  { id: 'Aguardando Aprovação', label: 'Aprovação' },
  { id: 'Aguardando Peça', label: 'Peça' },
  { id: 'Em Manutenção', label: 'Manutenção' },
  { id: 'Reparo Concluído', label: 'Concluído' }
];

interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  publicSlug: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  cnpj?: string;
}

export default function CustomerPortal() {
  const params = useParams();
  const companySlug = params?.companySlug as string;
  const osNumberStr = params?.osNumber as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [osSettings, setOsSettings] = useState<any>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [tempSignature, setTempSignature] = useState<string | null>(null);
  const sigPad = React.useRef<SignatureCanvas>(null);

  // New states for document viewing modals
  const [activeModal, setActiveModal] = useState<'OS' | 'PHOTOS' | 'WARRANTY' | 'BUDGET' | 'REPORT' | 'DOCS_HUB' | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (!companySlug || !osNumberStr) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Company by Slug (Public Data)
        const { data: companyData, error: compErr } = await supabase
          .from('company_settings')
          .select('*')
          .or(`public_slug.eq.${companySlug},slug_history.cs.{"${companySlug}"}`)
          .maybeSingle();

        if (compErr || !companyData) {
          setError('Empresa não encontrada. Verifique se o link está correto.');
          setLoading(false);
          return;
        }

        const mappedCompany: Company = {
          ...companyData,
          logoUrl: companyData.logo_url,
          publicSlug: companyData.public_slug,
          zipCode: companyData.zip_code
        };
        setCompany(mappedCompany);

        // 2. Resolve the order ID from the URL parameter
        let orderId: string | null = null;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osNumberStr);

        if (isUUID) {
          // URL contains a UUID directly — use it as the order ID
          orderId = osNumberStr;
        } else {
          const isNumeric = /^\d+$/.test(osNumberStr);
          if (isNumeric) {
            // URL contains an OS number — look up by company + os_number
            // orders table has a public RLS policy (FOR SELECT USING true) so this works for anon users
            const { data: foundOrder, error: findErr } = await supabase
              .from('orders')
              .select('id')
              .eq('os_number', parseInt(osNumberStr, 10))
              .eq('company_id', companyData.id)
              .maybeSingle();

            if (!findErr && foundOrder) {
              orderId = foundOrder.id;
            }
          }
        }

        if (!orderId) {
          setError('Ordem de Serviço não encontrada. Verifique o link e tente novamente.');
          setLoading(false);
          return;
        }

        // 3. Fetch the full order (public RLS allows this)
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();

        if (orderErr || !orderData) {
          setError('Ordem de Serviço não encontrada.');
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

        // 4. Fetch customer via secure RPC (SECURITY DEFINER bypasses RLS)
        // Uses order.id as p_public_id — the RPC accepts both public_id and id
        try {
          const { data: custData } = await supabase
            .rpc('get_public_customer', { p_public_id: orderId });
          if (custData && custData.length > 0) {
            setCustomer(custData[0]);
          }
        } catch (_) {
          // Customer data unavailable — portal still works without it
        }

        // 5. Re-use company data already fetched in step 1 (avoids RLS issue on company_settings)
        // Also fetch app settings for OS terms
        try {
          const { data: settResArr } = await supabase
            .from('app_settings')
            .select('*')
            .eq('company_id', companyData.id);

          if (settResArr && settResArr.length > 0) {
            const settingsRow = settResArr.find((r: any) => r.key === `os_settings_${companyData.id}`) 
              || settResArr.find((r: any) => r.key === 'os_settings');
            if (settingsRow?.value) {
              setOsSettings(settingsRow.value);
            }
          }
        } catch (_) {
          // Settings unavailable — portal still works with defaults
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Portal error:', err);
        setError('Erro ao carregar o portal. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companySlug, osNumberStr]);


  const handleSaveSignature = async () => {
    if (!tempSignature || !order || !company) return;
    
    setIsSavingSignature(true);
    try {
      const newSignatures = {
        ...(order.signatures || {}),
        client: tempSignature,
        mode: 'remote',
        signedAt: new Date().toISOString()
      };

      const historyEvent = {
        date: new Date().toISOString(),
        user: 'Cliente (Via Portal)',
        description: 'Termos de serviço assinados digitalmente via link remoto.'
      };

      if (!order.id) throw new Error('ID missing');

      const { error: rpcError } = await supabase.rpc('public_sign_order', {
        p_public_id: order.id,
        p_signature: tempSignature,
        p_history_event: historyEvent
      });

      if (rpcError) throw rpcError;

      setOrder({ 
        ...order, 
        signatures: newSignatures,
        history: [...(order.history || []), historyEvent]
      } as Order);
      
      // Notify success
      setShowSuccessToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Error saving remote signature:', err);
      alert(`Erro ao salvar assinatura: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleApproveBudget = async (signature: string) => {
    if (!order || !signature || !company) return;

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
      
      if (company?.whatsapp) {
        const phoneDigits = company.whatsapp.replace(/\D/g, '');
        if (phoneDigits) {
          const link = document.createElement('a');
          link.href = `https://api.whatsapp.com/send?phone=55${phoneDigits}&text=${encodeURIComponent(whatsappMessage)}`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      
      setShowSuccessToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      console.error('Error approving budget:', err);
      alert(`Erro ao aprovar orçamento: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRejectBudget = async (motive: string) => {
    if (!order || !company) return;
    
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

      const osNumberStr = order.osNumber.toString().padStart(4, '0');
      const whatsappMessage = `Olá! Recusei o orçamento da OS ${osNumberStr}.${motive ? ` Motivo: ${motive}` : ''}`;
      
      if (company?.whatsapp) {
        const phoneDigits = company.whatsapp.replace(/\D/g, '');
        if (phoneDigits) {
          const link = document.createElement('a');
          link.href = `https://api.whatsapp.com/send?phone=55${phoneDigits}&text=${encodeURIComponent(whatsappMessage)}`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      window.location.reload();
    } catch (err: any) {
      console.error('Error rejecting budget:', err);
      alert(`Erro ao recusar orçamento: ${err.message || 'Não foi possível completar a ação.'}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };


  const handleConfirmModalSignature = () => {
    if (!sigPad.current || (!hasDrawing && sigPad.current.isEmpty())) return;
    try {
      // Use the built-in toDataURL which is more stable across different Next.js/Webpack setups
      const dataUrl = sigPad.current.toDataURL('image/png');
      setTempSignature(dataUrl);
      setIsSignatureModalOpen(false);
    } catch (err) {
      console.error('Signature capture error:', err);
      // Final fallback to the direct canvas element
      const canvas = sigPad.current.getCanvas();
      if (canvas) {
        setTempSignature(canvas.toDataURL('image/png'));
        setIsSignatureModalOpen(false);
      }
    }
  };

  // Re-size signature pad on orientation change
  useEffect(() => {
    const doResize = () => {
      if (sigPad.current) {
        const canvas = sigPad.current.getCanvas();
        if (canvas) {
          if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;

          const data = sigPad.current.toData();
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          const oldWidth = canvas.width / ratio;
          const oldHeight = canvas.height / ratio;

          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.scale(ratio, ratio);

          sigPad.current.clear();

          if (data && data.length > 0) {
            const newWidth = canvas.offsetWidth;
            const newHeight = canvas.offsetHeight;
            
            if (oldWidth > 0 && oldHeight > 0 && (oldWidth !== newWidth || oldHeight !== newHeight)) {
              const scaleX = newWidth / oldWidth;
              const scaleY = newHeight / oldHeight;

              const scaledData = data.map((group: any) => {
                if (group.points) {
                  return {
                    ...group,
                    points: group.points.map((point: any) => ({
                      ...point,
                      x: point.x * scaleX,
                      y: point.y * scaleY
                    }))
                  };
                }
                return group.map((point: any) => ({
                  ...point,
                  x: point.x * scaleX,
                  y: point.y * scaleY
                }));
              });
              sigPad.current.fromData(scaledData as any);
            } else {
              sigPad.current.fromData(data as any);
            }
            setHasDrawing(true);
          }
        }
      }
    };

    const handleOrientationChange = () => {
      setTimeout(doResize, 300);
    };

    const handleResize = () => {
      setTimeout(doResize, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    if (isSignatureModalOpen) {
      setTimeout(doResize, 150);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isSignatureModalOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-zinc-800 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-t-2 border-[#00E676] rounded-full animate-spin"></div>
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-8">Carregando Portal DG TecHelp</p>
      </div>
    );
  }

  if (error || !order || !company) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#0A0A0A] border border-zinc-900 rounded-[32px] p-12 shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-md flex items-center justify-center mx-auto mb-8 text-red-500">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Portal indisponível</h1>
          <p className="text-zinc-500 mb-10 leading-relaxed font-medium">{error || 'Informações não encontradas.'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black py-5 rounded-md transition-all active:scale-95 uppercase tracking-widest text-[10px]"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG['Entrada'];
  const StatusIcon = currentStatusConfig.icon;
  const needsApproval = order.status === 'Aguardando Aprovação' || order.budget?.status === 'Aguardando Aprovação';
  const osFormatted = `OS ${order.osNumber.toString().padStart(4, '0')}`;
  
  const needsSignature = !order.signatures?.client && (order.signatures?.mode === 'remote' || order.signatures?.isManual === false);

  if (needsSignature) {
    return (
      <>
        <div className="min-h-screen bg-[#050505] flex flex-col items-center py-6 px-4 md:py-12 selection:bg-emerald-500/30 transition-colors duration-1000">
          <div className="bg-zinc-900/50 backdrop-blur-3xl border border-white/5 p-8 rounded-md shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
             
             <div>
               <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">Validar Documento</h1>
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Sua assinatura é necessária para prosseguir</p>
             </div>
          </div>

          <div className="bg-white rounded-md shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden relative border border-white/5 group">
             {/* A4 Scale Wrapper for Mobile */}
             <div className="w-full flex justify-center bg-zinc-100 shadow-inner">
               <div className="w-full max-w-[210mm] p-0 md:p-8 overflow-x-auto custom-scrollbar">
                 <div className="bg-white shadow-2xl border border-slate-200">
                    <OrderPrintTemplate 
                      order={order}
                      customer={customer}
                      companySettings={company as any}
                      osSettings={osSettings}
                      isPreview={true}
                      isSigning={true}
                      onClientSignatureClick={() => setIsSignatureModalOpen(true)}
                      clientSignatureOverride={tempSignature}
                    />
                 </div>
               </div>
             </div>
          </div>
          
          <div className="flex justify-center pb-32">
             <div className="flex items-center gap-4 text-zinc-800 opacity-40">
                <Shield size={16} />
                <span className="text-[9px] font-black uppercase tracking-[0.4em]">Protocolo de Segurança Servyx Intelligence</span>
             </div>
          </div>
        </div>

        {/* Fixed Bottom Actions for Signing */}
        <div className="fixed bottom-0 inset-x-0 p-6 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5 z-50 flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-3 w-full max-w-lg">
            <button 
              onClick={() => {
                setTempSignature(null);
                sigPad.current?.clear();
              }}
              disabled={!tempSignature && (!sigPad.current || sigPad.current?.isEmpty())}
              className="flex-1 px-4 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-bold rounded-md transition-all text-[10px] uppercase tracking-widest border border-white/5 flex items-center justify-center gap-2 group disabled:opacity-30"
            >
              <Trash2 size={14} className="group-hover:text-red-400 transition-colors" /> Limpar
            </button>
            <button
              onClick={handleSaveSignature}
              disabled={isSavingSignature || !tempSignature}
              className="flex-[2] px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-md transition-all text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 group"
            >
              {isSavingSignature ? <Loader2 className="animate-spin" size={16} /> : <>Assinar e Finalizar <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </div>
        </div>

        {/* Signature Modal */}
        <AnimatePresence>
          {isSignatureModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
                onClick={() => setIsSignatureModalOpen(false)}
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-[94%] mx-auto sm:w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-md shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
                   <div>
                     <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Assine Abaixo</h2>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Use seu dedo ou uma caneta stylus</p>
                   </div>
                   <button 
                    onClick={() => setIsSignatureModalOpen(false)}
                    className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 rounded-full flex items-center justify-center transition-all"
                   >
                     <X size={20} />
                   </button>
                </div>

                 <div className="p-4 sm:p-8 bg-black/30">
                    <div className="bg-white rounded-md overflow-hidden shadow-inner relative group border-4 border-zinc-800 h-64 sm:h-80 landscape:h-[50vh]">
                      <SignatureCanvas 
                        ref={sigPad}
                        penColor="#000000"
                        onBegin={() => setHasDrawing(true)}
                        onEnd={() => {
                          if (sigPad.current) {
                            const empty = sigPad.current.isEmpty();
                            setHasDrawing(!empty);
                          }
                        }}
                        canvasProps={{
                          className: 'w-full h-full cursor-crosshair',
                          style: { width: '100%', height: '100%' }
                        }}
                      />
                      
                      {/* Orientation Warning Overlay for Portrait */}
                      <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center sm:hidden portrait:flex pointer-events-auto">
                        <motion.div 
                          animate={{ rotate: 90 }}
                          transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                          className="text-[#00E676] mb-4"
                        >
                          <Smartphone size={48} />
                        </motion.div>
                        <h3 className="text-white font-black uppercase tracking-tighter italic text-lg mb-2">Gire o celular</h3>
                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                          A assinatura fica muito melhor na horizontal. Gire seu dispositivo agora!
                        </p>
                        <button 
                          onClick={(e) => {
                             const parent = e.currentTarget.parentElement;
                             if (parent) parent.style.display = 'none';
                          }}
                          className="mt-6 px-6 py-2 border border-zinc-700 rounded-sm text-zinc-500 text-[9px] font-black uppercase tracking-widest"
                        >
                          Continuar em Vertical
                        </button>
                      </div>

                      <button 
                        onClick={() => {
                          sigPad.current?.clear();
                          setHasDrawing(false);
                        }}
                        className="absolute bottom-4 right-4 w-12 h-12 bg-white/80 hover:bg-white text-zinc-400 hover:text-red-500 rounded-full flex items-center justify-center transition-all shadow-lg border border-zinc-100"
                        title="Limpar"
                      >
                        <Trash2 size={20} />
                      </button>
                   </div>
                </div>

                <div className="p-8 border-t border-zinc-800 flex gap-4">
                   <button 
                     onClick={() => setIsSignatureModalOpen(false)}
                     className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold rounded-md transition-all text-[11px] uppercase tracking-widest"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleConfirmModalSignature}
                     className="flex-[2] px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-md transition-all text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20"
                   >
                     Concluir Assinatura
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <style jsx global>{`
          .custom-scrollbar-hide::-webkit-scrollbar { display: none; }
          .custom-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          body { background-color: #050505; color-scheme: dark; }
        `}</style>
      </>
    );
  }


  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 selection:bg-emerald-500/30 font-sans antialiased">
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
                <p className="text-white font-bold text-sm">Aprovação Confirmada!</p>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest leading-none">OS N° {order.osNumber.toString().padStart(4, '0')} atualizada com sucesso</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SaaS Header (Fixed) */}
      <header className="fixed top-0 inset-x-0 h-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-sm bg-zinc-900 border border-white/5 flex items-center justify-center p-1">
            {company.logoUrl ? (
              <Image src={company.logoUrl} alt={company.name} fill className="object-contain p-1" />
            ) : (
              <Building2 size={24} className="text-zinc-500" />
            )}
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-white uppercase tracking-wider">{company.name}</h2>
            {company.cnpj && <p className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">CNPJ: {company.cnpj}</p>}
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Protocolo OS</span>
          <span className="text-sm font-black font-mono text-[#00E676]">{osFormatted}</span>
        </div>
      </header>

      <main className="pt-28 pb-32 px-5 max-w-lg mx-auto space-y-8">
        
        {/* Welcome Section */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div>
            <h1 className="text-2xl font-black text-white leading-tight">
              Olá, {customer?.name ? customer.name.split(' ')[0] : 'Cliente'}! 👋<br />
              <span className="text-zinc-500 text-lg font-medium tracking-tight">Acompanhe o andamento do seu serviço.</span>
            </h1>
          </div>
        </section>

        {/* Status Card */}
        <section className="relative overflow-hidden rounded-md bg-zinc-900/50 border border-white/5 p-6 shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
          
          <div className={`w-16 h-16 shrink-0 rounded-md ${currentStatusConfig.bg} ${currentStatusConfig.color} flex items-center justify-center relative z-10 ${order.status === 'Reparo Concluído' ? 'animate-pulse' : ''}`}>
            <StatusIcon size={28} strokeWidth={2} />
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00E676]">Status Atual</span>
            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight italic leading-tight mt-1">{currentStatusConfig.label}</h2>
          </div>
        </section>

        {/* Equipamento Info */}
        <section className="bg-[#0A0A0A] border border-zinc-800/80 rounded-md p-6 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
            {React.createElement(getDeviceIcon(order.equipment.type), { size: 14, className: "text-zinc-400" })} 
            Detalhes do Equipamento
          </h3>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Dispositivo</span>
              <p className="text-sm font-bold text-white capitalize">{order.equipment.type}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Marca / Modelo</span>
              <p className="text-sm font-bold text-white capitalize">{order.equipment.brand} {order.equipment.model}</p>
            </div>
            {order.service && (
              <div className="col-span-2 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/80">Serviço Contratado</span>
                <p className="text-sm font-bold text-emerald-400">{order.service}</p>
              </div>
            )}
            <div className="col-span-2 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500/80">Defeito Relatado</span>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-sm p-3">
                <p className="text-sm font-medium text-amber-400/90 italic leading-relaxed">"{order.defect || 'Não informado'}"</p>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO DE ORÇAMENTO — DOCUMENTO PROFISSIONAL (MOSTRAR APENAS PENDENTE) */}
        {needsApproval && (
          <BudgetDocumentView
            order={order}
            customer={customer}
            companySettings={company as any}
            onApprove={handleApproveBudget}
            onReject={handleRejectBudget}
            isSubmitting={isSubmittingApproval}
          />
        )}

        {/* Action Grid */}
        <section className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          {/* OS Always exists */}
          <button 
            onClick={() => setActiveModal('OS')}
            className="flex flex-col items-center justify-center h-24 px-2 py-4 bg-zinc-900 border border-white/5 rounded-md gap-2 hover:bg-zinc-800 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
              <FileText size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-200">Ordem de Serviço</span>
          </button>

          {order.budget && (order.budget?.status || order.budget?.totalValue > 0 || (order.budget?.items && order.budget.items.length > 0)) && (
            <button 
              onClick={() => setActiveModal('BUDGET')}
              className="flex flex-col items-center justify-center h-24 px-2 py-4 bg-zinc-900 border border-white/5 rounded-md gap-2 hover:bg-zinc-800 active:scale-95 transition-all group overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-1">
                <div className={`w-1.5 h-1.5 rounded-full ${order.budget?.status === 'Aprovado' ? 'bg-emerald-500' : order.budget?.status === 'Recusado' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Receipt size={18} className="text-emerald-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Orçamento</span>
            </button>
          )}

          {order.technicalReport && (
            <button 
              onClick={() => setActiveModal('REPORT')}
              className="flex flex-col items-center justify-center h-24 px-2 py-4 bg-zinc-900 border border-white/5 rounded-md gap-2 hover:bg-zinc-800 active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <FileSignature size={18} className="text-blue-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Laudo Técnico</span>
            </button>
          )}

          {order.completionData?.hasWarranty && (
            <button 
              onClick={() => setActiveModal('WARRANTY')}
              className="flex flex-col items-center justify-center h-24 px-2 py-4 bg-zinc-900 border border-white/5 rounded-md gap-2 hover:bg-zinc-800 active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <ShieldCheck size={18} className="text-purple-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Cert. Garantia</span>
            </button>
          )}

          {order.entryPhotos && order.entryPhotos.length > 0 && (
            <button 
              onClick={() => setActiveModal('PHOTOS')}
              className="flex flex-col items-center justify-center h-24 px-2 py-4 bg-zinc-900 border border-white/5 rounded-md gap-2 hover:bg-zinc-800 active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <ImageIcon size={18} className="text-amber-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Fotos Entrada</span>
            </button>
          )}
        </section>

        {/* Timeline / History */}
        <section className="bg-[#0A0A0A] border border-zinc-800/80 rounded-md p-6 space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <History size={14} className="text-zinc-400" /> Histórico
            </h3>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
              Entrada: {new Date(order.createdAt).toLocaleDateString('pt-BR')}  {new Date(order.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>

          <div className="relative space-y-6">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />
            
            {order.history.slice().reverse().map((event, idx) => (
              <div key={idx} className="flex gap-4 relative">
                <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center relative z-10 shrink-0 mt-1 ${
                  idx === 0 ? 'bg-[#0A0A0A] border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.2)]' : 'bg-[#0A0A0A] border-zinc-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-[#00E676]' : 'bg-zinc-700'}`} />
                </div>
                <div className="flex-1">
                  <time className={`text-[9px] font-bold uppercase tracking-widest mb-1 block ${idx === 0 ? 'text-[#00E676]' : 'text-zinc-600'}`}>
                    {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.date))}
                  </time>
                  <p className={`text-xs font-bold leading-relaxed ${idx === 0 ? 'text-white' : 'text-zinc-400'}`}>
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Floating CTA (WhatsApp) */}
      {company.whatsapp && (
        <a 
          href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`} 
          target="_blank" 
          rel="noreferrer" 
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.3)] hover:scale-105 active:scale-95 transition-all z-50"
        >
          <MessageCircle size={28} />
        </a>
      )}

      {/* Modals for viewing content */}
      <AnimatePresence>
        {activeModal === 'REPORT' && order.technicalReport && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505]">
            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] border-b border-zinc-800">
              <h2 className="text-sm font-black uppercase tracking-widest text-blue-400">Laudo Técnico</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0 sm:p-4 flex justify-center bg-zinc-200">
              <div className="bg-white shadow-2xl origin-top w-full max-w-[210mm] mb-20">
                <TechnicalReportPrintTemplate 
                  order={order}
                  customer={customer}
                  companySettings={company as any}
                  isPreview={true}
                />
              </div>
            </div>
          </div>
        )}

        {activeModal === 'OS' && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505]">
            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] border-b border-zinc-800">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Documento da Ordem de Serviço</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0 sm:p-4 flex justify-center bg-zinc-200">
              <div className="bg-white shadow-2xl origin-top w-full max-w-[210mm] mb-20">
                <OrderPrintTemplate 
                  order={order}
                  customer={customer}
                  companySettings={company as any}
                  osSettings={osSettings}
                  isPreview={true}
                  isSigning={false}
                />
              </div>
            </div>
          </div>
        )}

        {activeModal === 'PHOTOS' && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505]/95 backdrop-blur-xl">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Fotos Anexadas</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-black rounded-full text-zinc-400 border border-white/5">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 items-center">
               {order.entryPhotos?.map((photo, i) => (
                 <div key={i} className="relative w-full max-w-md aspect-square bg-zinc-900 rounded-md border border-white/10 overflow-hidden shadow-2xl">
                    <Image src={photo} alt="Foto da OS" fill className="object-contain" />
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeModal === 'WARRANTY' && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505]">
            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] border-b border-zinc-800">
              <h2 className="text-sm font-black uppercase tracking-widest text-purple-400">Termo de Garantia</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0 sm:p-4 flex justify-center bg-zinc-200">
              <div className="bg-white shadow-2xl origin-top w-full max-w-[210mm] mb-20">
                <WarrantyPrintTemplate 
                  order={order}
                  customer={customer}
                  companySettings={company as any}
                />
              </div>
            </div>
          </div>
        )}

        {activeModal === 'BUDGET' && order.budget && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505]">
            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] border-b border-zinc-800">
              <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Proposta de Orçamento</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-zinc-200">
              <div className="mb-20 w-[96%] sm:w-full max-w-3xl shadow-2xl">
                <BudgetDocumentView
                  order={order}
                  customer={customer}
                  companySettings={company as any}
                  onApprove={handleApproveBudget}
                  onReject={handleRejectBudget}
                  isSubmitting={isSubmittingApproval}
                />
              </div>
            </div>
          </div>
        )}


      </AnimatePresence>

      <div className="hidden">
        <OrderPrintTemplate 
          order={order}
          customer={customer}
          companySettings={company as any}
          osSettings={osSettings}
          isPreview={true}
          isSigning={false}
        />
        <WarrantyPrintTemplate 
          order={order}
          customer={customer}
          companySettings={company as any}
        />
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 0px; height: 0px; }
        body { background-color: #050505; color-scheme: dark; scroll-behavior: smooth; }
        .custom-scrollbar-hide::-webkit-scrollbar { display: none; }
        .custom-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

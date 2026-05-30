'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, User, Smartphone, 
  CheckCircle2, XCircle, AlertCircle, AlertTriangle, Save, MessageCircle,
  Check, X, CreditCard, Banknote, QrCode, FileText, Grid, Eye, Trash2, LayoutDashboard,
  Calendar, Clock, Wrench, Shield, ShieldCheck, Package, Truck, Inbox, LogOut, Minus, TrendingUp, Printer, ChevronDown, ChevronLeft, Loader2, Pencil,
  Calculator, MessageSquare, Link as LinkIcon, Lock, Signature, Hash, ExternalLink, Camera as CameraIcon, ChevronRight, Share2,
  SlidersHorizontal, Filter, ArrowUpDown
} from 'lucide-react';
import { Customer } from './ClientesModule';
import { Order, OrderStatus, OrderPriority, OrderCompletionData, BudgetData, BudgetItem, Product } from '../types';
import PatternLock from './PatternLock';
import ControllerChecklistPrint from './ControllerChecklistPrint';
import SignatureCanvas from 'react-signature-canvas';
import TechnicalReportPrintTemplate from './TechnicalReportPrintTemplate';
import OrderPrintTemplate from './OrderPrintTemplate';
import ThermalReceiptTemplate from './ThermalReceiptTemplate';
import WarrantyPrintTemplate from './WarrantyPrintTemplate';
import WarrantyThermalTemplate from './WarrantyThermalTemplate';
import BudgetDocumentView from './BudgetDocumentView';
import InfoTooltip from './InfoTooltip';
import SecurityPortalManager from './SecurityPortalManager';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { addDays, format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Currency Helpers
const formatToBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseCurrencyToNumber = (value: string) => {
  if (!value) return 0;
  return Number(value.replace(/\D/g, '')) / 100;
};

const formatInputOnBlur = (value: string) => {
  const numValue = parseCurrencyToNumber(value);
  return formatToBRL(numValue);
};

const formatInputOnChange = (value: string) => {
  // Only allow digits
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return '';
  
  const numValue = Number(cleanValue) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

const getTimelineConfig = (description: string) => {
  const desc = description.toLowerCase();
  
  if (desc.includes('criou a ordem') || desc.includes('nova os')) return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  if (desc.includes('aprovado') || desc.includes('concluído')) return { icon: CheckCircle2, color: 'text-[#00E676]', bg: 'bg-[#00E676]/10', border: 'border-[#00E676]/20' };
  if (desc.includes('aguardando') || desc.includes('orçamento')) return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  if (desc.includes('pagamento') || desc.includes('cobrou')) return { icon: Banknote, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
  if (desc.includes('cancelad') || desc.includes('reprovad') || desc.includes('falha') || desc.includes('exclui')) return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  if (desc.includes('peça') || desc.includes('estoque')) return { icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  if (desc.includes('notificou') || desc.includes('whatsapp') || desc.includes('cliente')) return { icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
  if (desc.includes('status')) return { icon: ActionIndicator, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' };
  
  // Default for specific manual notes
  return { icon: MessageSquare, color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700' };
};

const ActionIndicator = ({ size, className }: any) => <TrendingUp size={size} className={className} />;

// Helper to trim transparent borders from canvas
const trimCanvas = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const width = canvas.width;
  const height = canvas.height;
  const pixels = ctx.getImageData(0, 0, width, height);
  const l = pixels.data.length;
  
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < l; i += 4) {
    const alpha = pixels.data[i + 3];
    if (alpha > 0) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return canvas.toDataURL('image/png');
  }

  const padding = 6;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width, maxX + padding);
  maxY = Math.min(height, maxY + padding);

  const croppedWidth = maxX - minX;
  const croppedHeight = maxY - minY;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = croppedWidth;
  tempCanvas.height = croppedHeight;
  
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return canvas.toDataURL('image/png');

  tempCtx.drawImage(
    canvas,
    minX, minY, croppedWidth, croppedHeight,
    0, 0, croppedWidth, croppedHeight
  );

  return tempCanvas.toDataURL('image/png');
};

// Signature Pad Component
const SignaturePad = ({ title, onSave, onClear, initialSignature }: { title: string, onSave: (dataUrl: string) => void, onClear: () => void, initialSignature?: string | null }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isConfirmed, setIsConfirmed] = useState(!!initialSignature);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (initialSignature) {
      setIsConfirmed(true);
    }
  }, [initialSignature]);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsConfirmed(false);
    setHasDrawing(false);
    onClear();
  };

  const confirm = () => {
    if (sigCanvas.current?.isEmpty()) {
      return;
    }
    const canvasEl = sigCanvas.current?.getCanvas();
    if (canvasEl) {
      const dataUrl = trimCanvas(canvasEl);
      setIsConfirmed(true);
      onSave(dataUrl);
    }
  };

  // Re-size signature pad on orientation change
  useEffect(() => {
    const doResize = () => {
      if (sigCanvas.current) {
        const canvas = sigCanvas.current.getCanvas();
        if (canvas) {
          const data = sigCanvas.current.toData();
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          const oldWidth = canvas.width / ratio;
          const oldHeight = canvas.height / ratio;

          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.scale(ratio, ratio);

          sigCanvas.current.clear();

          if (data && data.length > 0) {
            const newWidth = canvas.offsetWidth;
            const newHeight = canvas.offsetHeight;
            if (oldWidth !== newWidth || oldHeight !== newHeight) {
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
              sigCanvas.current.fromData(scaledData as any);
            } else {
              sigCanvas.current.fromData(data as any);
            }
            setHasDrawing(true);
          }
        }
      }
    };

    const handleOrientationChange = () => setTimeout(doResize, 300);
    const handleResize = () => setTimeout(doResize, 100);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    if (isOpen) setTimeout(doResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isOpen]);

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
          className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-sm text-zinc-300 font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Pencil size={18} />
          Adicionar Assinatura
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-sm text-zinc-300 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Eye size={18} className="text-blue-400" />
            Ver / Editar Assinatura
          </button>
          <button
            onClick={clear}
            className="py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-sm font-medium flex items-center justify-center transition-colors"
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-sm p-6 w-full max-w-lg shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={`bg-white border-2 rounded-sm overflow-hidden relative transition-colors ${isConfirmed ? 'border-[#00E676]' : 'border-zinc-700'}`}>
                {!hasDrawing && !isConfirmed && !initialSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                    <span className="text-zinc-500 text-lg font-medium select-none">Assine aqui</span>
                  </div>
                )}
                
                {isConfirmed && initialSignature && !hasDrawing && (
                  <div className="absolute inset-0 flex items-center justify-center p-4 bg-white">
                    <img src={initialSignature} alt="Assinatura" className="max-h-full object-contain mix-blend-multiply" />
                  </div>
                )}

                <div className={isConfirmed && !hasDrawing ? 'hidden' : ''}>
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    clearOnResize={false}
                    canvasProps={{
                      className: "w-full h-[200px] cursor-crosshair touch-none"
                    }}
                    onBegin={() => setHasDrawing(true)}
                    onEnd={() => sigCanvas.current && setHasDrawing(!sigCanvas.current.isEmpty())}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    sigCanvas.current?.clear();
                    setHasDrawing(false);
                    setIsConfirmed(false);
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-sm transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={() => {
                    confirm();
                    setIsOpen(false);
                  }}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-sm transition-colors"
                >
                  Salvar Assinatura
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  onNavigateToGarantia?: (order: any) => void;
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
}

const COLUMNS: OrderStatus[] = [
  'Entrada',
  'Orçamento em Elaboração',
  'Em Análise Técnica',
  'Aguardando Aprovação',
  'Aguardando Peça',
  'Em Manutenção',
  'Reparo Concluído',
  'Equipamento Retirado'
];

const STATUS_CONFIG: Record<OrderStatus, { icon: React.ElementType, color: string, bg: string }> = {
  'Entrada': { icon: Inbox, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Orçamento em Elaboração': { icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  'Em Análise Técnica': { icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'Aguardando Aprovação': { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  'Aguardando Peça': { icon: Package, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  'Em Manutenção': { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'Reparo Concluído': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  'Equipamento Retirado': { icon: LogOut, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
  'Orçamento Cancelado': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  'Sem Reparo': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' }
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
  onEdit,
  onNavigateToGarantia,
  onLogActivity
}: StatusOsModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  // Helper Initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };
  
  const handleCaptureReportPhoto = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64 = reader.result as string;
          setReportPhotos(prev => [...prev, base64]);
        };
      };
      input.click();
    } catch (err) {
      console.error('Error capturing photo:', err);
    }
  };

  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'ALL' | null>('Entrada');
  const [groupBy, setGroupBy] = useState<'prioridade' | 'data' | 'nenhum'>('nenhum');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shouldNotifyCustomer, setShouldNotifyCustomer] = useState(true);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [orderToQuickStatus, setOrderToQuickStatus] = useState<Order | null>(null);
  const [printMode, setPrintMode] = useState<'a4' | 'thermal' | 'warranty' | 'warranty-thermal' | 'laudo' | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Elite Polish: Simulated loading on mount to show skeletons
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      onLogActivity?.('STATUS_OS', 'VISUALIZOU OS', {
        osNumber: selectedOrder.osNumber,
        description: `Visualizou detalhes da OS #${selectedOrder.osNumber.toString().padStart(4, '0')}`
      });
    }
  }, [selectedOrder?.id]);

  // Keyboard shortcut for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Smart Metrics Calculation
  const metrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const activeOrders = orders.filter(o => !['Equipamento Retirado', 'Orçamento Cancelado', 'Sem Reparo'].includes(o.status));
    const potentialRevenue = activeOrders.reduce((acc, o) => acc + (o.financials?.totalValue || 0), 0);
    const labLoad = activeOrders.length;
    
    const concludedThisMonth = orders.filter(o => {
      const date = new Date(o.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear && o.status === 'Reparo Concluído';
    });
    
    const avgTicket = concludedThisMonth.length > 0 
      ? concludedThisMonth.reduce((acc, o) => acc + (o.financials?.totalValue || 0), 0) / concludedThisMonth.length 
      : 0;

    return { potentialRevenue, labLoad, avgTicket, concludedCount: concludedThisMonth.length };
  }, [orders]);

  // Função direta de impressão (evita useEffect para não perder o user-gesture no Mobile Safari)
  // Função direta de impressão (evita useEffect para não perder o user-gesture no Mobile Safari)
  const triggerPrint = async (mode: 'a4' | 'thermal' | 'warranty' | 'warranty-thermal' | 'laudo') => {
    if (!selectedOrder) {
      onShowToast('Nenhuma OS selecionada.');
      return;
    }

    const originalTitle = document.title;
    const osNumber = selectedOrder.osNumber.toString().padStart(4, '0');
    const companyName = companySettings?.name || 'Servyx';
    const isWarranty = mode.includes('warranty');
    const isLaudo = mode === 'laudo';
    
    document.title = `${companyName.toUpperCase().replace(/\s+/g, '_')}_${isLaudo ? 'Laudo' : isWarranty ? 'Garantia' : 'OS'}_${osNumber}`;
    
    // Ativa o estado de carregamento
    setIsPrinting(true);

    // Limpa classes anteriores
    document.body.classList.remove('print-a4', 'print-thermal', 'print-warranty', 'print-warranty-thermal', 'print-laudo');
    
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
  const handleSharePDF = async (mode: 'a4' | 'warranty' | 'laudo' = 'a4') => {
    if (!selectedOrder) {
      onShowToast('Selecione uma OS primeiro.');
      return;
    }

    const osNumberFormatted = selectedOrder.osNumber.toString().padStart(4, '0');
    const companyName = companySettings.name || 'Servyx';
    const isWarranty = mode.includes('warranty');
    const isLaudo = mode === 'laudo';
    const docType = isLaudo ? 'Laudo' : isWarranty ? 'Garantia' : 'OS';
    const filename = `${companyName.toUpperCase().replace(/\s+/g, '_')}_${docType}_${osNumberFormatted}`;
    const orderCustomer = customers.find(c => c.id === selectedOrder.customerId);

    try {
      const React = await import('react');
      const { generateAndSharePDF } = await import('../utils/generatePDF');

      let templateElement: React.ReactElement;
      if (isLaudo) {
        const { default: TechnicalReportPrintTemplate } = await import('./TechnicalReportPrintTemplate');
        templateElement = React.createElement(TechnicalReportPrintTemplate, {
          order: selectedOrder, customer: orderCustomer, companySettings, isPreview: false,
        });
      } else if (isWarranty) {
        const { default: WarrantyPrintTemplate } = await import('./WarrantyPrintTemplate');
        templateElement = React.createElement(WarrantyPrintTemplate, {
          order: selectedOrder, customer: orderCustomer, companySettings, osSettings, isPreview: false,
        });
      } else {
        const { default: OrderPrintTemplate } = await import('./OrderPrintTemplate');
        templateElement = React.createElement(OrderPrintTemplate, {
          order: selectedOrder, customer: orderCustomer, companySettings, osSettings, isPreview: false,
        });
      }

      await generateAndSharePDF(templateElement, filename, onShowToast);
    } catch (error: any) {
      console.error('Erro PDF:', error);
      onShowToast(`Erro ao gerar PDF: ${(error.message || 'Erro desconhecido').substring(0, 50)}`);
    }
  };

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Débito' | 'Crédito' | 'Link'>('Dinheiro');
  const [discount, setDiscount] = useState('0');
  const [onSuccessStatus, setOnSuccessStatus] = useState<OrderStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCashSession, setCurrentCashSession] = useState<{ id: string; [key: string]: unknown } | null>(null);

  // Completion State
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [availableSuppliers, setAvailableSuppliers] = useState<{ id: string, company_name: string }[]>([]);

  // Budget State
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetData['status']>('Em Elaboração');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isWarrantyPreviewOpen, setIsWarrantyPreviewOpen] = useState(false);
  const [isDocHubOpen, setIsDocHubOpen] = useState(false);
  const [isBudgetPreviewOpen, setIsBudgetPreviewOpen] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [showAllCustomerInfo, setShowAllCustomerInfo] = useState(false);
  const [isEntryPhotosModalOpen, setIsEntryPhotosModalOpen] = useState(false);

  // New Detailed Budget States
  const [budgetDetailedDefect, setBudgetDetailedDefect] = useState('');
  const [budgetRequiredService, setBudgetRequiredService] = useState('');
  const [budgetServiceNotes, setBudgetServiceNotes] = useState('');
  const [budgetPhotos, setBudgetPhotos] = useState<string[]>([]);
  const [budgetPrice, setBudgetPrice] = useState('0');

  const handleViewDocs = (order: Order) => {
    const hasBudget = !!(order.budget && (order.budget.status || order.budget.totalValue > 0 || (order.budget.items && order.budget.items.length > 0)));
    const hasReport = !!(order.technicalReport && (order.technicalReport.diagnosis || order.technicalReport.conclusion));
    const hasWarranty = !!(order.completionData?.warrantyDays || order.completionData?.hasWarranty);
    const multiDocs = hasBudget || hasReport || hasWarranty;

    if (multiDocs) {
      setSelectedOrder(order);
      setIsDocHubOpen(true);
    } else if (order.scannedOsUrl) {
      window.open(order.scannedOsUrl, '_blank');
    } else {
      setPreviewOrder(order);
      setIsPreviewModalOpen(true);
    }
  };

  // Listen for current cash session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: openSessions } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1);

        if (openSessions && openSessions.length > 0) {
          const session = openSessions[0];
          setCurrentCashSession(session);
        } else {
          setCurrentCashSession(null);
        }
      } catch (err) {
        console.error('Error fetching cash session:', err);
        setCurrentCashSession(null);
      }
    };

    fetchSession();
  }, []);
  useEffect(() => {
    if (selectedOrder?.budget) {
      setBudgetItems(selectedOrder.budget.items || []);
      setBudgetStatus(selectedOrder.budget.status || 'Em Elaboração');
      setBudgetDetailedDefect(selectedOrder.budget.detailedDefect || '');
      setBudgetRequiredService(selectedOrder.budget.requiredService || '');
      setBudgetServiceNotes(selectedOrder.budget.serviceNotes || '');
      setBudgetPhotos(selectedOrder.budget.photos || []);
      setBudgetPrice(selectedOrder.budget.totalValue?.toString() || '0');
    } else {
      setBudgetItems([]);
      setBudgetStatus('Em Elaboração');
      setBudgetDetailedDefect('');
      setBudgetRequiredService('');
      setBudgetServiceNotes('');
      setBudgetPhotos([]);
      setBudgetPrice('0');
    }
  }, [selectedOrder]);

  const calculateBudgetTotal = () => {
    return budgetItems.reduce((acc, item) => acc + ((Number(item.price) || 0) * item.quantity), 0);
  };

  const handleAddBudgetItem = (type: 'service' | 'part') => {
    const newItem: BudgetItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      description: '',
      quantity: 1,
      price: 0
    };
    setBudgetItems([...budgetItems, newItem]);
  };

  const handleUpdateBudgetItem = (id: string, field: keyof BudgetItem, value: any) => {
    setBudgetItems(items => items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveBudgetItem = (id: string) => {
    setBudgetItems(items => items.filter(item => item.id !== id));
  };

  const handleSaveBudget = async () => {
    if (!selectedOrder) return;
    setIsSavingBudget(true);

    try {
      const budget: BudgetData = {
        items: budgetItems,
        totalValue: calculateBudgetTotal() || parseFloat(budgetPrice) || 0,
        status: budgetStatus,
        detailedDefect: budgetDetailedDefect,
        requiredService: budgetRequiredService,
        serviceNotes: budgetServiceNotes,
        photos: budgetPhotos,
        updatedAt: new Date().toISOString()
      };

      // If approved, update OS status
      let newStatus = selectedOrder.status;
      if (budgetStatus === 'Aprovado' && selectedOrder.status === 'Aguardando Aprovação') {
        newStatus = 'Em Manutenção';
      }

      const historyEvent = {
        date: new Date().toISOString(),
        user: profile.name,
        description: `Orçamento atualizado: status alterado para ${budgetStatus}. Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.totalValue)}`
      };

      const { error } = await supabase
        .from('orders')
        .update({ 
          budget,
          status: newStatus,
          history: [...selectedOrder.history, historyEvent],
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .eq('company_id', profile.company_id);

      if (error) throw error;

      // Update local state
      const updatedOrder = { 
        ...selectedOrder, 
        budget, 
        status: newStatus,
        history: [...selectedOrder.history, historyEvent]
      };
      setSelectedOrder(updatedOrder);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      
      onShowToast('Orçamento salvo com sucesso!');

      // Also record in audit table for redundancy if needed (existing)
      await supabase.from('order_history').insert({
        order_id: selectedOrder.id,
        user: profile.name,
        description: historyEvent.description,
        company_id: profile.company_id
      });

    } catch (err: any) {
      console.error('Error saving budget full error:', err);
      console.error('Error message:', err?.message);
      console.error('Error details:', err?.details);
      onShowToast(`Erro ao salvar orçamento: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleSendBudgetWhatsApp = async (includeLink: boolean = false) => {
    if (!selectedOrder || !customers) return;
    const customer = customers.find(c => c.id === selectedOrder.customerId);
    if (!customer?.whatsapp) {
      onShowToast('Cliente sem WhatsApp cadastrado.');
      return;
    }

    // Primeiro salva o orçamento para garantir que os dados estão no banco
    await handleSaveBudget();

    const total = calculateBudgetTotal() || parseFloat(budgetPrice) || 0;
    const portalUrl = companySettings?.publicSlug 
      ? `${window.location.origin}/${companySettings.publicSlug}/${selectedOrder.id}`
      : `${window.location.origin}/os/${selectedOrder.id}`;

    const template = osSettings.whatsappMessages?.['Aguardando Aprovação'] ||
      `Olá, [nome_cliente]! 👋\nSeu orçamento está pronto OS: [numero_os]\n🔧 [defeito]\n💰 [valor_total]  \n Aprove aqui:\n👉 [link_os]\n\nQualquer dúvida é só chamar 👍`;

    const message = template
      .replace(/\[nome_cliente\]/g, customer.name)
      .replace(/{cliente}/g, customer.name)
      .replace(/\[numero_os\]/g, selectedOrder.osNumber.toString().padStart(4, '0'))
      .replace(/{os}/g, selectedOrder.osNumber.toString().padStart(4, '0'))
      .replace(/\[marca\]/g, selectedOrder.equipment.brand)
      .replace(/\[modelo\]/g, selectedOrder.equipment.model)
      .replace(/\[defeito\]/g, budgetRequiredService || selectedOrder.service || 'Manutenção técnica')
      .replace(/\[status\]/g, selectedOrder.status)
      .replace(/\[valor_total\]/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total))
      .replace(/\[link_os\]/g, portalUrl)
      .replace(/{link}/g, portalUrl)
      .replace(/\[nome_assistencia\]/g, companySettings.name || 'Servyx')
      .replace(/{empresa}/g, companySettings.name || 'Servyx');

    const encodedMessage = encodeURIComponent(message);
    let decodedPhone = customer.whatsapp.replace(/\D/g, '');
    if (!decodedPhone.startsWith('55')) decodedPhone = `55${decodedPhone}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${decodedPhone}&text=${encodedMessage}`;
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = 'wa';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCaptureBudgetPhoto = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limita tamanho para 800kb aprox
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64 = reader.result as string;
          setBudgetPhotos(prev => [...prev, base64]);
        };
      };
      input.click();
    } catch (err) {
      console.error('Error capturing photo:', err);
    }
  };

  useEffect(() => {
    if (initialOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === initialOrderId);
      if (order) {
        setSelectedOrder(order);
        setActiveStatus(order.status);
        // Initialize report if exists
        if (order.technicalReport) {
          setDiagnosis(order.technicalReport.diagnosis);
          setTests(order.technicalReport.tests);
          setPartsNeeded(order.technicalReport.partsNeeded);
          setNotes(order.technicalReport.notes);
          setConclusion(order.technicalReport.conclusion);
          setTechnicianSignature(order.technicalReport.technicianSignature || null);
        } else {
          setDiagnosis('');
          setTests('');
          setPartsNeeded('');
          setNotes('');
          setConclusion('');
          setTechnicianSignature(null);
        }
      }
    }
  }, [initialOrderId, orders]);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'geral' | 'laudo' | 'historico' | 'orcamento' | 'seguranca'>('geral');

  // Technical Report Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [tests, setTests] = useState('');
  const [partsNeeded, setPartsNeeded] = useState('');
  const [notes, setNotes] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      if (selectedOrder.technicalReport) {
        setDiagnosis(selectedOrder.technicalReport.diagnosis);
        setTests(selectedOrder.technicalReport.tests);
        setPartsNeeded(selectedOrder.technicalReport.partsNeeded);
        setNotes(selectedOrder.technicalReport.notes);
        setConclusion(selectedOrder.technicalReport.conclusion);
        setTechnicianSignature(selectedOrder.technicalReport.technicianSignature || null);
        setReportPhotos(selectedOrder.technicalReport.photos || []);
      } else {
        setDiagnosis('');
        setTests('');
        setPartsNeeded('');
        setNotes('');
        setConclusion('');
        setTechnicianSignature(null);
        setReportPhotos([]);
      }
    }
  }, [selectedOrder]);

  const handleSaveTechnicalReport = async () => {
    if (!selectedOrder) return;
    setIsSavingReport(true);
    
    try {
      const technicalReport = {
        diagnosis,
        tests,
        partsNeeded,
        notes,
        conclusion,
        photos: reportPhotos,
        technicianSignature: technicianSignature || undefined,
        createdAt: selectedOrder.technicalReport?.createdAt || new Date().toISOString()
      };

      const historyEvent = {
        date: new Date().toISOString(),
        user: profile.name,
        description: 'Laudo técnico atualizado com diagnóstico e conclusão'
      };

      const { error } = await supabase
        .from('orders')
        .update({
          technical_report: technicalReport,
          history: [...selectedOrder.history, historyEvent],
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      const updatedOrder = { 
        ...selectedOrder, 
        technicalReport,
        history: [...selectedOrder.history, historyEvent]
      };
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      onShowToast('Laudo técnico salvo com sucesso!');
    } catch (error: any) {
      console.error('Error saving technical report full error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      onShowToast(`Erro ao salvar laudo: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingReport(false);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) {
        setAvailableProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price || 0,
          stock: p.stock || 0,
          minStock: p.min_stock || 0,
          category: p.category,
          barcode: p.barcode
        })));
      }
    };
    fetchProducts();

    const fetchSuppliers = async () => {
      const { data } = await supabase.from('suppliers').select('id, company_name').order('company_name');
      if (data) setAvailableSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const customer = customers.find(c => c.id === o.customerId);
      const searchLower = searchQuery.toLowerCase();
      const searchNum = searchLower.replace(/\D/g, '');
      const osNumStr = o.osNumber.toString().padStart(4, '0');
      return (
        o.osNumber.toString().includes(searchLower) ||
        (searchNum !== '' && osNumStr.includes(searchNum)) ||
        (customer?.name.toLowerCase().includes(searchLower)) ||
        (customer?.document && customer.document.includes(searchLower)) ||
        o.equipment.model.toLowerCase().includes(searchLower) ||
        o.equipment.brand.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleAddNote = async () => {
    if (!newHistoryNote.trim() || !selectedOrder) return;
    setIsAddingNote(true);
    try {
      const historyEvent = {
        date: new Date().toISOString(),
        user: profile.name,
        description: `Observação: ${newHistoryNote.trim()}`
      };
      
      const { error } = await supabase.from('orders')
        .update({
          history: [...selectedOrder.history, historyEvent],
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);
        
      if (error) throw error;
      
      const updatedOrder = {
        ...selectedOrder,
        history: [...selectedOrder.history, historyEvent]
      };
      
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      setNewHistoryNote('');
      onShowToast('Observação adicionada ao histórico!');
    } catch (err: any) {
      onShowToast(`Erro ao adicionar observação: ${err.message}`);
    } finally {
      setIsAddingNote(false);
    }
  };

  const updateOrderStatus = async (order: Order, newStatus: OrderStatus, completionData?: OrderCompletionData, productsUsed?: SelectedProduct[]) => {
    await executeOrderStatusUpdate(order, newStatus, completionData, productsUsed);
  };

  const executeOrderStatusUpdate = async (order: Order, newStatus: OrderStatus, completionData?: OrderCompletionData, productsUsed?: SelectedProduct[]) => {
    const now = new Date().toISOString();

    // Ao concluir ou retirar, remove o status de prioridade automaticamente
    const completedStatuses: OrderStatus[] = ['Reparo Concluído', 'Equipamento Retirado'];
    const newPriority = completedStatuses.includes(newStatus) ? 'Baixa' : order.priority;

    const updatedOrder = {
      ...order,
      status: newStatus,
      priority: newPriority as OrderPriority,
      completionData: completionData || order.completionData,
      productsUsed: productsUsed || order.productsUsed || [],
      history: [
        ...order.history,
        {
          date: now,
          user: profile.name,
          description: `Status alterado de "${order.status}" para "${newStatus}"${newPriority !== order.priority ? ` (prioridade redefinida para Baixa)` : ''}`
        }
      ],
      updatedAt: now
    };

    try {
      // 1. Update Order in Supabase
      const { error: osError } = await supabase.from('orders').update({
        status: updatedOrder.status,
        priority: updatedOrder.priority,
        completion_data: updatedOrder.completionData,
        products_used: updatedOrder.productsUsed,
        history: updatedOrder.history,
        updated_at: now
      }).eq('id', order.id).eq('company_id', profile.company_id);

      if (osError) throw osError;

      // 1.0 Create Warranty if present
      if (completionData?.hasWarranty) {
        if (!profile.company_id) {
          console.error('Erro: company_id não encontrado no perfil do usuário');
          onShowToast('Erro crítico: Perfil do usuário sem identificação de empresa.');
          return;
        }

        const { error: warrantyError } = await supabase.from('warranties').insert({
          os_id: order.id,
          os_number: order.osNumber.toString().padStart(4, '0'),
          client_name: customers.find(c => c.id === order.customerId)?.name || 'Cliente',
          equipment: `${order.equipment.brand} ${order.equipment.model}`,
          service_performed: completionData.servicesPerformed?.trim() || order.service || 'Serviço técnico',
          start_date: completionData.warrantyStartDate || now.split('T')[0],
          end_date: completionData.warrantyEndDate || now.split('T')[0],
          duration_days: Number(completionData.warrantyMonths || 3) * 30,
          notes: completionData.technicianObservations?.trim() || '',
          status: 'Ativa',
          user_id: profile.user_id || profile.id || null,
          company_id: profile.company_id,
          created_at: now
        });

        if (warrantyError) {
          const errorMsg = `ERRO SUPABASE (Garantia): ${warrantyError.message} | Código: ${warrantyError.code} | Hint: ${warrantyError.hint} | Detalhes: ${warrantyError.details}`;
          console.error(errorMsg);
          onShowToast(`Atenção: OS finalizada, mas a Garantia não foi salva.`);
        }
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
            }).eq('id', p.id).eq('company_id', profile.company_id);

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
              company_id: profile.company_id,
              created_at: now
            });
          }
        }
      }

      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(updatedOrder);
      }
      onShowToast(`Status da OS ${order.osNumber} atualizado`);
      
      const customer = customers.find(c => c.id === order.customerId);
      onLogActivity?.('STATUS_OS', 'ALTEROU STATUS', {
        osId: order.id,
        osNumber: order.osNumber,
        oldStatus: order.status,
        newStatus: newStatus,
        customerName: customer?.name,
        customerDocument: customer?.document,
        customerPhone: customer?.whatsapp || customer?.phone,
        description: `Alterou status da OS #${order.osNumber.toString().padStart(4, '0')} para ${newStatus}`
      });
    } catch (error: any) {
      console.error('Error updating OS status:', error);
      onShowToast(`Erro ao atualizar status: ${error.message || ''}`);
      throw error; // Propagate for handleSaveCompletion
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
        const portalUrl = companySettings.publicSlug
          ? `${window.location.origin}/${companySettings.publicSlug}/${order.id}`
          : `${window.location.origin}/os/${order.id}`;
        const template = osSettings.whatsappMessages?.[newStatus] || companySettings.followUpMessage || 
          `Olá, {cliente} 👋\n\nJá está disponível o acompanhamento da sua OS {os}.\nVocê pode visualizar todas as atualizações em tempo real pelo link abaixo:\n\n{link}\n\n{empresa}\nAgradecemos pela confiança em nossos serviços.`;
        
        const message = template
          .replace(/\[nome_cliente\]/g, customer.name)
          .replace(/{cliente}/g, customer.name)
          .replace(/\[numero_os\]/g, order.osNumber.toString().padStart(4, '0'))
          .replace(/{os}/g, order.osNumber.toString().padStart(4, '0'))
          .replace(/\[marca\]/g, order.equipment.brand)
          .replace(/\[modelo\]/g, order.equipment.model)
          .replace(/\[equipamento\]/g, `${order.equipment.brand} ${order.equipment.model}`)
          .replace(/\[defeito\]/g, order.defect)
          .replace(/\[status\]/g, newStatus)
          .replace(/\[data_entrada\]/g, new Date(order.createdAt).toLocaleDateString('pt-BR'))
          .replace(/\[valor_total\]/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue))
          .replace(/\[link_os\]/g, portalUrl)
          .replace(/{link}/g, portalUrl)
          .replace(/\[nome_assistencia\]/g, companySettings.name || 'Servyx')
          .replace(/{empresa}/g, companySettings.name || 'Servyx');

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
      }).eq('id', order.id).eq('company_id', profile.company_id);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === order.id ? {
        ...o,
        financials: { ...o.financials, paymentStatus: newPaymentStatus },
        history: updatedHistory,
        updatedAt: now
      } : o));
      onShowToast(`Pagamento da OS ${order.osNumber} atualizado`);

      const customer = customers.find(c => c.id === order.customerId);
      onLogActivity?.('STATUS_OS', 'PAGAMENTO', {
        osId: order.id,
        osNumber: order.osNumber,
        customerName: customer?.name,
        customerDocument: customer?.document,
        customerPhone: customer?.whatsapp || customer?.phone,
        oldStatus: order.financials.paymentStatus,
        newStatus: newPaymentStatus,
        description: `Atualizou status de pagamento da OS #${order.osNumber.toString().padStart(4, '0')} para ${newPaymentStatus}`
      });
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      onShowToast(`Erro ao atualizar pagamento: ${error.message || ''}`);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedOrder || !paymentAmount) return;

    setIsProcessing(true);

    // Final real-time check to see if cashier is open
    let sessionToUse = currentCashSession;
    if (!sessionToUse) {
      try {
        const { data: openSessions } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1);

        if (openSessions && openSessions.length > 0) {
          sessionToUse = openSessions[0];
          setCurrentCashSession(sessionToUse!);
        }
      } catch (err) {
        console.error('Final session fetch failed:', err);
      }
    }

    if (!sessionToUse) {
      onShowToast('⚠️ É necessário abrir o caixa para registrar pagamentos.');
      setIsProcessing(false);
      return;
    }
    const amount = parseFloat(paymentAmount) || 0;
    const disc = parseFloat(discount) || 0;
    
    const currentFinancials = selectedOrder.financials;
    const newTotal = Math.max(0, (currentFinancials.totalValue || 0) - disc);
    const newAmountPaid = (currentFinancials.amountPaid || 0) + amount;

    let newPaymentStatus: 'Total' | 'Parcial' | 'Pendente' = 'Parcial';
    if (newAmountPaid >= newTotal) {
      newPaymentStatus = 'Total';
    }

    const now = new Date().toISOString();
    const historyEntryDesc = disc > 0
      ? `Pagamento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} (${paymentMethod}) + Desconto: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(disc)}`
      : `Pagamento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} (${paymentMethod})`;

    const updatedHistory = [
      ...selectedOrder.history,
      {
        date: now,
        user: profile.name,
        description: (onSuccessStatus ? `OS ${onSuccessStatus}: ` : "") + historyEntryDesc
      }
    ];

    try {
      const statusToSave = onSuccessStatus || selectedOrder.status;
      
      // 1. Update Order
      const { error: osError } = await supabase.from('orders').update({
        financials: {
          ...currentFinancials,
          totalValue: newTotal,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          paymentType: paymentMethod
        },
        status: statusToSave,
        history: updatedHistory,
        updated_at: now
      }).eq('id', selectedOrder.id).eq('company_id', profile.company_id);

      if (osError) throw osError;

      // 2. Record transaction in Fluxo de Caixa
      const customer = customers.find(c => c.id === selectedOrder.customerId);
      const today = new Date();
      const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const { error: transError } = await supabase.from('transactions').insert({
        id: crypto.randomUUID(),
        type: 'entrada',
        description: `Recebimento OS ${selectedOrder.osNumber} - ${customer?.name || 'Cliente'}`,
        value: amount,
        payment_method: paymentMethod,
        date: localDateStr,
        time: today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        user_id: profile.id,
        session_id: sessionToUse.id,
        company_id: profile.company_id,
        os_id: selectedOrder.osNumber?.toString() || selectedOrder.id
      });

      if (transError) console.error('Transaction Error:', transError);

      // 3. Update or Create Receivable (Optional/Legacy check)
      try {
        const remainingBalance = newTotal - newAmountPaid;
        const { data: currentRecs } = await supabase.from('receivables').select('*').eq('os_id', selectedOrder.id).eq('company_id', profile.company_id).eq('status', 'pendente');

        if (currentRecs && currentRecs.length > 0) {
          if (remainingBalance <= 0) {
            await supabase.from('receivables').update({
              status: 'recebido',
              received_date: now.split('T')[0],
              payment_method: paymentMethod,
              updated_at: now
            }).eq('id', currentRecs[0].id).eq('company_id', profile.company_id);
          } else {
            await supabase.from('receivables').update({
              value: remainingBalance,
              updated_at: now
            }).eq('id', currentRecs[0].id).eq('company_id', profile.company_id);
          }
        }
      } catch (recErr) {
        console.warn('Receivables table sync failed (likely legacy/deleted):', recErr);
      }

      // Update State local
      const updatedOrder = {
        ...selectedOrder,
        status: statusToSave,
        financials: {
          ...currentFinancials,
          totalValue: newTotal,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          paymentType: paymentMethod
        },
        history: updatedHistory,
        updatedAt: now
      } as Order;

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setDiscount('0');
      setOnSuccessStatus(null);
      
      const hasWarrantyFinal = selectedOrder.completionData?.warrantyDays || selectedOrder.completionData?.hasWarranty;
      onShowToast(statusToSave === 'Equipamento Retirado' 
        ? (hasWarrantyFinal ? '✅ Equipamento entregue e pagamento registrado!' : '⚠️ Equipamento entregue (SEM GARANTIA) e pagamento registrado!')
        : '✅ Pagamento registrado com sucesso');
    } catch (error: any) {
      console.error('Error in handleRegisterPayment:', error);
      onShowToast(`❌ Erro: ${error.message || 'Verifique sua conexão'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const groupedOrders = useMemo(() => {
    const orders = (activeStatus === 'ALL' || searchQuery.length > 0)
      ? filteredOrders 
      : filteredOrders.filter(o => o.status === activeStatus);

    if (groupBy === 'nenhum') {
      const title = searchQuery.length > 0 ? 'Resultados da Busca' : (activeStatus === 'ALL' ? 'Todas as Ordens' : activeStatus);
      return [{ title, orders }];
    }
    
    if (groupBy === 'prioridade') {
      const activePriorityOrders = [...orders].filter(o => 
        o.status !== 'Orçamento Cancelado' && 
        o.status !== 'Sem Reparo' && 
        o.status !== 'Reparo Concluído' && 
        o.status !== 'Equipamento Retirado'
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return [
        { title: '🔥 Urgente', orders: activePriorityOrders.filter(o => o.priority === 'Urgente') },
        { title: '🔴 Alta Prioridade', orders: activePriorityOrders.filter(o => o.priority === 'Alta') },
        { title: '🟡 Prioridade Média', orders: activePriorityOrders.filter(o => o.priority === 'Média') },
        { title: '⚪ Baixa Prioridade', orders: activePriorityOrders.filter(o => o.priority === 'Baixa') }
      ].filter(g => g.orders.length > 0);
    }
    
    if (groupBy === 'data') {
      const today = new Date().toLocaleDateString('pt-BR');
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR');
      return [
        { title: '🕒 Hoje', orders: orders.filter(o => new Date(o.createdAt).toLocaleDateString('pt-BR') === today) },
        { title: '📅 Ontem', orders: orders.filter(o => new Date(o.createdAt).toLocaleDateString('pt-BR') === yesterday) },
        { title: '📁 Anteriores', orders: orders.filter(o => {
          const date = new Date(o.createdAt).toLocaleDateString('pt-BR');
          return date !== today && date !== yesterday;
        })}
      ].filter(g => g.orders.length > 0);
    }
    return [{ title: 'Todas as Ordens', orders }];
  }, [filteredOrders, groupBy, activeStatus]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex flex-col font-sans selection:bg-[#00E676]/30">
      <header className="bg-[#141414] border-b border-zinc-800 p-2.5 sm:p-4 sticky top-0 z-30 no-print">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-2.5">
          {/* Mobile Header: Title Row -> (Busca Colapsável) -> Actions Row */}
          <div className="flex lg:hidden flex-col gap-4">
            {/* Row 1: Back + Title + Lupa */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="w-11 h-11 flex items-center justify-center hover:bg-zinc-800 rounded-xl transition-colors bg-[#111111] border border-zinc-800"
                >
                  <ChevronLeft size={22} className="text-zinc-300" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight">Status OS</h1>
                </div>
              </div>
              {/* Lupa — abre/fecha busca inline */}
              <button
                onClick={() => setIsMobileSearchOpen(v => !v)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all active:scale-95 ${
                  isMobileSearchOpen
                    ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]'
                    : 'bg-[#111111] border-zinc-800 text-zinc-400'
                }`}
              >
                <Search size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Buscar</span>
              </button>
            </div>

            {/* Busca Colapsável */}
            {isMobileSearchOpen && (
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar OS, cliente ou aparelho..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111111] border border-[#00E676]/30 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676]/60 transition-colors"
                />
              </div>
            )}

            {/* Row 2: Filter & Priority Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsStatusPickerOpen(true)}
                className="flex-1 bg-[#111111] border border-zinc-800 rounded-xl py-3.5 flex items-center justify-center gap-2 text-[11px] font-black tracking-widest text-zinc-300 active:scale-95 transition-all uppercase"
              >
                <Filter size={16} className="text-zinc-500" />
                FILTROS
              </button>
              <button
                onClick={() => {
                  if (groupBy === 'prioridade') {
                    setGroupBy('nenhum');
                  } else {
                    setGroupBy('prioridade');
                    setActiveStatus('ALL');
                  }
                }}
                className={`flex-1 bg-[#111111] border rounded-xl py-3.5 flex items-center justify-center gap-2 text-[11px] font-black tracking-widest active:scale-95 transition-all uppercase ${
                  groupBy === 'prioridade' 
                  ? 'border-[#00E676]/30 text-[#00E676] bg-[#00E676]/5' 
                  : 'border-zinc-800 text-zinc-300'
                }`}
              >
                <ArrowUpDown size={16} className={groupBy === 'prioridade' ? 'text-[#00E676]' : 'text-zinc-500'} />
                PRIORIDADE
              </button>
            </div>

            {/* Row 3: Mobile Tabs Timeline — sem botão 'Todas' */}
            <div className="flex overflow-x-auto gap-2 py-1.5 mt-1 mb-1 no-scrollbar">
              
              {COLUMNS.map(status => {
                 const count = orders.filter(o => o.status === status).length;
                 if (count === 0 && activeStatus !== status) return null;
                 const isSelected = activeStatus === status;
                 let shortName = status.split(' ')[0];
                 if (['Em', 'Aguardando'].includes(shortName)) {
                   shortName = status.split(' ')[1];
                   if (status.includes('Técnica')) shortName = 'Análise';
                 }
                 if (status === 'Reparo Concluído') shortName = 'Concluído';
                 if (status === 'Equipamento Retirado') shortName = 'Retirado';
                 
                 const config = STATUS_CONFIG[status];
                 const Icon = config.icon;

                 return (
                   <button
                     key={`m-tab-${status}`}
                     onClick={() => setActiveStatus(status)}
                     className={`flex items-center gap-1.5 pl-2.5 pr-3 py-2 shrink-0 rounded-2xl border transition-all active:scale-95 ${
                       isSelected
                         ? `${config.bg} ${config.color} border-current/30 shadow-sm`
                         : 'bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300'
                     }`}
                   >
                     <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/15' : 'bg-white/[0.05]'}`}>
                       <Icon size={11} className={isSelected ? config.color : 'text-zinc-600'} />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-wider leading-none">{shortName}</span>
                     <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                       isSelected ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-zinc-600'
                     }`}>
                       {count}
                     </span>
                   </button>
                 );
              })}
            </div>
          </div>

          {/* Desktop Row (Hidden on Mobile) */}
          <div className="hidden lg:flex lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2.5 hover:bg-zinc-800 rounded-sm transition-colors bg-zinc-900 border border-zinc-800"
              >
                <ChevronLeft size={24} className="text-zinc-400" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold leading-none sm:leading-tight">Status OS</h1>
                <p className="hidden sm:block text-[10px] sm:text-sm text-zinc-500 font-medium uppercase tracking-wider">Gestão de Ordens</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => setShowMetrics(!showMetrics)}
                className={`hidden lg:flex items-center justify-center gap-2 px-4 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all border ${
                  showMetrics 
                  ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30 shadow-[0_0_15px_rgba(0,230,118,0.1)]' 
                  : 'bg-[#0A0A0A] text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <LayoutDashboard size={16} />
                {showMetrics ? 'Ocultar Painel' : 'Métricas do Mês'}
              </button>

            {/* Mobile-only Header Buttons (Removed from here, moved to sticky ribbon) */}
            
            <div className="hidden lg:block relative flex-1 lg:w-96 order-2 lg:order-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Buscar OS, cliente ou aparelho..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
              />
            </div>

            <div className="relative no-print shrink-0 order-3 lg:order-none w-full sm:w-auto">
                <button
                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  className={`hidden sm:flex w-full sm:px-4 py-2.5 rounded-sm text-sm font-black uppercase tracking-widest transition-all items-center justify-center gap-4 border bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700 sm:min-w-[200px] shadow-sm relative z-10`}
                >
                  <div className={`p-1.5 rounded-sm transition-colors ${groupBy !== 'nenhum' ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-zinc-800 text-zinc-500'}`}>
                     {groupBy === 'nenhum' && <Grid size={16} />}
                     {groupBy === 'prioridade' && <AlertCircle size={16} />}
                     {groupBy === 'data' && <Calendar size={16} />}
                  </div>
                  <div className="flex flex-col items-start leading-[1.1] gap-0.5">
                    <span className="text-[9px] text-zinc-500 tracking-[0.2em] font-black">Agrupar por</span>
                    <span className="text-[11px] text-zinc-100 font-bold">
                      {groupBy === 'nenhum' && 'Sem Agrupamento'}
                      {groupBy === 'prioridade' && 'Prioridade'}
                      {groupBy === 'data' && 'Data de Entrada'}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`ml-auto sm:ml-4 text-zinc-600 transition-all duration-300 ${isGroupDropdownOpen ? 'rotate-180 text-[#00E676]' : ''}`} />
                </button>
                
                {isGroupDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsGroupDropdownOpen(false)} />
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0A0A0A] border border-zinc-800 rounded-md overflow-hidden shadow-2xl z-50 p-1.5 backdrop-blur-xl">
                      {[
                        { id: 'nenhum', label: 'Sem Agrupamento', icon: Grid, desc: 'Visualização padrão' },
                        { id: 'prioridade', label: 'Prioridade', icon: AlertCircle, desc: 'Alta, Normal, Baixa' },
                        { id: 'data', label: 'Data de Entrada', icon: Calendar, desc: 'Hoje, Ontem, Semana' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => { 
                            setGroupBy(opt.id as any); 
                            setActiveStatus('ALL'); 
                            setIsGroupDropdownOpen(false);
                          }}
                          className={`w-full flex flex-col items-start px-4 py-2.5 rounded-sm text-xs font-bold transition-all hover:bg-zinc-800 group/item ${groupBy === opt.id ? 'bg-[#00E676]/10 text-[#00E676]' : 'text-zinc-400 hover:text-zinc-200'}`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <opt.icon size={14} className={groupBy === opt.id ? 'text-[#00E676]' : 'text-zinc-500 group-hover/item:text-zinc-300'} />
                            <span className="uppercase tracking-widest">{opt.label}</span>
                          </div>
                          <span className="text-[9px] text-zinc-600 font-medium group-hover/item:text-zinc-500">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
            </div>
            
            <div className="flex sm:flex-wrap items-center gap-2 pb-2 sm:pb-0 no-scrollbar snap-x order-4 lg:order-none">
              <button
                onClick={() => setActiveStatus('Orçamento Cancelado')}
                className={`hidden md:flex shrink-0 px-4 py-3 rounded-sm text-sm font-bold uppercase tracking-tight transition-all items-center justify-center gap-2 border ${
                  activeStatus === 'Orçamento Cancelado'
                  ? 'bg-red-400 text-black border-red-400 shadow-lg shadow-red-400/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                }`}
                title="Orçamento Cancelado"
              >
                <XCircle size={18} />
                <span className="hidden xl:inline">Cancelados</span>
              </button>
              <button
                onClick={() => setActiveStatus('Sem Reparo')}
                className={`hidden md:flex shrink-0 px-4 py-3 rounded-sm text-sm font-bold uppercase tracking-tight transition-all items-center justify-center gap-2 border ${
                  activeStatus === 'Sem Reparo'
                  ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                }`}
                title="Sem Reparo"
              >
                <AlertTriangle size={18} />
                <span className="hidden xl:inline">Sem Reparo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </header>

      {/* Compact Metrics Dashboard */}
      <AnimatePresence>
        {showMetrics && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#0A0A0A] border-b border-zinc-800/30 overflow-hidden no-print"
          >
            <div className="max-w-[1600px] mx-auto px-4 py-6 sm:px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-4">
                
                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-sm border border-zinc-800/50">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-sm">
                    <TrendingUp size={16} />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] font-black uppercase tracking-wider text-zinc-600 mb-1">Faturamento Potencial</span>
                    <span className="text-[14px] font-black text-white font-mono">
                      R$ {metrics.potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-sm border border-zinc-800/50">
                  <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-sm">
                    <Wrench size={16} />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] font-black uppercase tracking-wider text-zinc-600 mb-1">Laboratório</span>
                    <span className="text-[14px] font-black text-white font-mono">
                      {metrics.labLoad} <span className="text-[10px] text-zinc-500">Ordens</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-sm border border-zinc-800/50">
                  <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-sm">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] font-black uppercase tracking-wider text-zinc-600 mb-1">Concluídos/Mês</span>
                    <span className="text-[14px] font-black text-white font-mono">
                      {metrics.concludedCount} <span className="text-[10px] text-zinc-500">Itens</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-sm border border-zinc-800/50">
                  <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-sm">
                    <Calculator size={16} />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] font-black uppercase tracking-wider text-zinc-600 mb-1">Ticket Médio</span>
                    <span className="text-[14px] font-black text-white font-mono">
                      R$ {metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ribbon Timeline - FIXADA NO TOPO DA MAINKANBAN */}
      <div className="hidden sm:block bg-[#141414] border-b border-zinc-800/50 sticky top-[85px] z-20 no-print">
        <div className="max-w-[1600px] mx-auto p-2 sm:p-4">
          
          {/* Desktop Ribbon Timeline */}
          <div className="hidden sm:flex w-full h-12 bg-[#0A0A0A] rounded-sm p-1 border border-zinc-900/80 gap-1 overflow-x-auto custom-scrollbar-horizontal">

            {COLUMNS.map((status, idx, arr) => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              const isSelected = activeStatus === status;
              
              let shortName = status.split(' ')[0];
              if (['Em', 'Aguardando'].includes(shortName)) {
                shortName = status.split(' ')[1];
                if (status.includes('Técnica')) shortName = 'Análise';
              }
              if (status === 'Reparo Concluído') shortName = 'Concluí­do';
                  if (status === 'Equipamento Retirado') shortName = 'RETIRADO';

              return (
                <button
                  key={`top-ribbon-${status}`}
                  onClick={() => setActiveStatus(status === activeStatus ? 'ALL' : status)}
                  className={`sm:flex-1 flex items-center justify-center gap-2 py-2 sm:py-0 h-full px-1 sm:px-3 relative transition-all duration-300 group hover:bg-zinc-800/50 rounded-sm cursor-pointer ${
                    isSelected ? 'bg-zinc-800/80 ring-1 ring-zinc-700' : ''
                  }`}
                  style={{ zIndex: arr.length - idx }}
                >
                  <Icon 
                    size={14} 
                    className={`${config.color} transition-transform duration-300 group-hover:scale-110 hidden md:block ${isSelected ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} 
                  />
                  <span className={`text-[8px] xl:text-[9px] font-black uppercase tracking-widest ${config.color} truncate px-1 ${isSelected ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'} transition-opacity`}>
                    {shortName}
                  </span>
                  
                  {isSelected && (
                    <div className={`absolute bottom-0 left-2 right-2 h-[2px] rounded-full ${config.bg.replace('/10', '/60')} shadow-[0_0_10px_currentColor]`} />
                  )}
                </button>
              );
            })}

            <div className="w-[1px] h-6 bg-zinc-800 my-auto shrink-0" />
            <button
              onClick={() => setActiveStatus('ALL')}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 h-full px-4 rounded-sm transition-all ${
                activeStatus === 'ALL' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Grid size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Todos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Status Picker Overlay */}
      <AnimatePresence>
        {isStatusPickerOpen && (
          <div className="fixed inset-0 z-[100] sm:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStatusPickerOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute bottom-0 left-0 right-0 bg-[#0F0F0F]/95 backdrop-blur-xl border-t border-white/[0.06] rounded-t-[28px] max-h-[88vh] overflow-y-auto"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-5 pt-3 pb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#00E676]/10 flex items-center justify-center">
                      <Filter size={15} className="text-[#00E676]" />
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-[0.15em]">Filtrar por Status</h3>
                  </div>
                  <button
                    onClick={() => setIsStatusPickerOpen(false)}
                    className="w-9 h-9 flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] rounded-xl text-zinc-400 transition-all"
                  >
                    <X size={17} />
                  </button>
                </div>

                {/* Status list */}
                <div className="space-y-2">
                  {COLUMNS.map(status => {
                    const config = STATUS_CONFIG[status];
                    const Icon = config.icon;
                    const isSelected = activeStatus === status;
                    const count = orders.filter(o => o.status === status).length;

                    return (
                      <button
                        key={`picker-${status}`}
                        onClick={() => { setActiveStatus(status); setIsStatusPickerOpen(false); }}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                          isSelected
                          ? `${config.bg} border-white/10 ${config.color}`
                          : 'bg-white/[0.03] border-white/[0.05] text-zinc-400 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/10' : 'bg-white/[0.04]'}`}>
                          <Icon size={18} className={isSelected ? config.color : 'text-zinc-500'} />
                        </div>
                        <span className={`text-sm font-bold flex-1 text-left ${isSelected ? '' : 'text-zinc-300'}`}>{status}</span>
                        <div className="flex items-center gap-2.5">
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-zinc-500'
                          }`}>
                            {count}
                          </span>
                          {isSelected && <Check size={16} className={config.color} />}
                        </div>
                      </button>
                    );
                  })}

                  {/* Divider */}
                  <div className="h-px bg-white/[0.06] my-3" />

                  {/* Cancelados e Sem Reparo */}
                  {(['Orçamento Cancelado', 'Sem Reparo'] as const).map(status => {
                    const config = STATUS_CONFIG[status];
                    const Icon = config.icon;
                    const isSelected = activeStatus === status;
                    const count = orders.filter(o => o.status === status).length;
                    return (
                      <button
                        key={`picker-${status}`}
                        onClick={() => { setActiveStatus(status); setIsStatusPickerOpen(false); }}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                          isSelected
                          ? `${config.bg} border-white/10 ${config.color}`
                          : 'bg-white/[0.03] border-white/[0.05] text-zinc-400 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/10' : 'bg-white/[0.04]'}`}>
                          <Icon size={18} className={isSelected ? config.color : 'text-zinc-500'} />
                        </div>
                        <span className={`text-sm font-bold flex-1 text-left ${isSelected ? '' : 'text-zinc-300'}`}>{status}</span>
                        <div className="flex items-center gap-2.5">
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-zinc-500'
                          }`}>
                            {count}
                          </span>
                          {isSelected && <Check size={16} className={config.color} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          .no-print, 
          header, 
          main, 
          footer,
          .fixed,
          .AnimatePresence {
            display: none !important;
          }
          
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide ALL print containers by default in print mode */
          .print-a4-container,
          .print-thermal-container,
          .print-warranty-container,
          .warranty-thermal-container {
            display: none !important;
          }

          /* Show only the active one based on body class */
          body.print-a4 .print-a4-container,
          body.print-thermal .print-thermal-container,
          body.print-warranty .print-warranty-container,
          body.print-laudo .print-laudo-container,
          body.print-warranty-thermal .warranty-thermal-container {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 flex flex-col">
          <div className="space-y-12 pt-2">
            {groupedOrders.map((group, gIdx) => (
              <div key={group.title} className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-4">
                      <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                        <span className="w-1 h-4 bg-[#00E676] rounded-full" />
                        {group.title}
                      </h2>
                      <span className="bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-tight">
                        {group.orders.length} OS
                      </span>
                    </div>
                  </div>
                </div>

                {/* ===== MOBILE CARDS (hidden on sm+) ===== */}
                <div className="flex flex-col gap-4 sm:hidden pb-10">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={`m-skeleton-${i}`} className="bg-[#1C1C1C] border border-zinc-800/50 rounded-[16px] p-5 space-y-4 animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-24 bg-zinc-800 rounded-full" />
                          <div className="h-4 w-16 bg-zinc-800 rounded-full" />
                        </div>
                        <div className="flex gap-4">
                           <div className="w-12 h-12 bg-zinc-800 rounded-full shrink-0" />
                           <div className="space-y-2 w-full">
                             <div className="h-4 w-3/4 bg-zinc-800 rounded-sm" />
                             <div className="h-3 w-1/2 bg-zinc-800 rounded-md" />
                           </div>
                        </div>
                      </div>
                    ))
                  ) : group.orders.map(order => {
                    const customer = customers.find(c => c.id === order.customerId);
                    const cfg = STATUS_CONFIG[order.status];
                    const isLate = order.deliveryForecast && new Date(order.deliveryForecast) < new Date() && !['Reparo Concluído', 'Equipamento Retirado', 'Orçamento Cancelado', 'Sem Reparo'].includes(order.status);
                    
                    let shortName = order.status.split(' ')[0];
                    if (['Em', 'Aguardando'].includes(shortName)) {
                      shortName = order.status.split(' ')[1];
                    }
                    if (order.status === 'Reparo Concluído') shortName = 'Concluído';
                    if (order.status === 'Equipamento Retirado') shortName = 'RETIRADO';
                    
                    return (
                      <div key={`m-${order.id}`} className="relative bg-[#222] rounded-[18px] overflow-hidden shadow-2xl border border-white/[0.07]">
                        {/* Status color indicator bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bg.replace('/10', '/80')}`} />
                        
                        <div className="p-4 pl-5">
                          {/* Header do Card: OS + Status badge + Data */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {/* Número da OS — maior e mais destacado */}
                              <div className={`px-3 py-1 rounded-xl ${cfg.bg} border border-white/[0.08]`}>
                                <span className={`text-[13px] font-black tracking-widest font-mono ${cfg.color}`}>
                                  OS {order.osNumber.toString().padStart(4, '0')}
                                </span>
                              </div>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${cfg.color} bg-white/[0.05] border border-white/[0.06]`}>
                                {shortName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-500">
                              <Calendar size={11} />
                              <span className="text-[10px] font-semibold">{new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </div>

                          {/* Nome do cliente — maior */}
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-black text-[16px] text-white truncate pr-2 uppercase leading-tight tracking-tight">
                              {customer?.name || 'Cliente não encontrado'}
                            </h4>
                            {customer?.whatsapp && (
                              <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   let phone = customer.whatsapp.replace(/\D/g, '');
                                   if (!phone.startsWith('55')) phone = `55${phone}`;
                                   window.open(`https://api.whatsapp.com/send?phone=${phone}`, '_blank');
                                 }}
                                 className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0"
                              >
                                <MessageCircle size={14} />
                              </button>
                            )}
                          </div>

                          {/* Equipamento */}
                          <p className="text-[11px] text-zinc-500 font-medium mb-3 truncate">{order.equipment.brand} {order.equipment.model}</p>

                          {/* Defeito / Serviço / Total */}
                          <div className="flex justify-between items-end gap-2 mb-4">
                            <div className="flex flex-col gap-1 text-[11px] flex-1 min-w-0">
                              <div className="flex items-start gap-1">
                                <span className="text-zinc-600 uppercase font-black tracking-widest text-[9px] w-14 shrink-0 mt-[1px]">Defeito:</span>
                                <span className="text-zinc-400 italic line-clamp-1 pr-1">{order.defect || '—'}</span>
                              </div>
                              {order.service && (
                              <div className="flex items-start gap-1">
                                <span className="text-zinc-600 uppercase font-black tracking-widest text-[9px] w-14 shrink-0 mt-[1px]">Serviço:</span>
                                <span className="text-white font-bold line-clamp-1 pr-1">{order.service}</span>
                              </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest leading-none mb-1">Total</p>
                              <p className="text-[15px] font-black text-[#00E676] tracking-tight leading-none">{formatToBRL(order.financials?.totalValue || 0)}</p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-white/[0.05] -mx-4 mb-3" />

                          {/* Action Buttons */}
                          <div className="grid grid-cols-4 gap-1.5">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 active:scale-95 transition-all"
                            >
                              <Eye size={13} />
                              <span className="text-[7px] font-black uppercase tracking-wide">Ver</span>
                            </button>
                            <button
                              onClick={() => onEdit?.(order)}
                              className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 active:scale-95 transition-all"
                            >
                              <Pencil size={13} />
                              <span className="text-[7px] font-black uppercase tracking-wide">Editar</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOrderToQuickStatus(order); }}
                              className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 active:scale-95 transition-all"
                            >
                              <CheckCircle2 size={13} />
                              <span className="text-[7px] font-black uppercase tracking-wide">Status</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewDocs(order); }}
                              className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 active:scale-95 transition-all"
                            >
                              <FileText size={13} />
                              <span className="text-[7px] font-black uppercase tracking-wide">Docs</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ===== DESKTOP GRID (hidden on mobile) ===== */}
                <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={`skeleton-${i}`} className="bg-[#1C1C1C] border border-zinc-800/50 rounded-sm p-4 sm:p-6 space-y-4 animate-pulse">
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-16 bg-zinc-800 rounded-full" />
                            <div className="h-3 w-16 bg-zinc-800 rounded-full" />
                        </div>
                        <div className="space-y-2">
                           <div className="h-4 w-3/4 bg-zinc-800 rounded-sm" />
                           <div className="h-3 w-1/2 bg-zinc-800 rounded-md" />
                        </div>
                        <div className="h-10 bg-zinc-900 rounded-sm border border-zinc-800/50" />
                        <div className="flex items-center justify-between pt-2">
                           <div className="h-3 w-20 bg-zinc-800 rounded-full" />
                           <div className="h-6 w-12 bg-zinc-800 rounded-sm" />
                        </div>
                      </div>
                    ))
                  ) : group.orders.map(order => {
                    const customer = customers.find(c => c.id === order.customerId);
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-[#262626] border border-zinc-700 hover:border-zinc-500 rounded-sm p-3 sm:p-5 cursor-pointer transition-all hover:bg-[#2A2A2A] hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden flex flex-col gap-1.5 sm:gap-2 min-h-[120px] sm:min-h-[140px]"
                      >
                        {/* Visual Status Indicator on Card Left */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${STATUS_CONFIG[order.status].bg.replace('/10', '/90')}`} />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-[9px] sm:text-[10px] font-black font-mono text-zinc-300 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded-sm uppercase tracking-widest shadow-sm">
                              OS {order.osNumber.toString().padStart(4, '0')}
                            </span>
                            {(activeStatus === 'ALL' || groupBy !== 'nenhum') && (
                              <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-tighter ${STATUS_CONFIG[order.status].bg} ${STATUS_CONFIG[order.status].color}`}>
                                {order.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                            <Calendar size={9} className="text-zinc-600" />
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm sm:text-[15px] text-zinc-200 line-clamp-1 group-hover:text-[#00E676] transition-colors">{customer?.name || 'Cliente não encontrado'}</h4>
                            {customer?.whatsapp && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  let phone = customer.whatsapp.replace(/\D/g, '');
                                  if (!phone.startsWith('55')) phone = `55${phone}`;
                                  window.open(`https://api.whatsapp.com/send?phone=${phone}`, '_blank');
                                }}
                                className="p-1.5 rounded-sm bg-[#00E676]/10 border border-[#00E676]/20 text-[#00E676] hover:bg-[#00E676] hover:text-black transition-all opacity-0 group-hover:opacity-100"
                                title="Chamar no WhatsApp"
                              >
                                <MessageCircle size={16} />
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 line-clamp-1 uppercase tracking-tight">{order.equipment.brand} {order.equipment.model}</p>
                        </div>

                        <div className="pl-2 border-l-2 border-zinc-800 my-0.5">
                          <p className="text-[11px] sm:text-xs text-zinc-500 line-clamp-2 italic leading-relaxed" title={order.defect}>{order.defect || 'Sem defeito relatado'}</p>
                        </div>

                        <div className="flex items-end justify-between mt-auto pt-1">
                          <div className="flex flex-col gap-1">
                            {order.signatures?.mode === 'remote' && order.signatures?.client && (
                              <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-tighter bg-blue-500/10 text-blue-400/80 w-max border border-blue-500/10">
                                Assinado
                              </span>
                            )}
                            {order.budget?.status === 'Aprovado' && order.history.some(h => h.user === 'Cliente (Via Portal)' && h.description.includes('APROVADO')) && (
                              <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-400/80 w-max border border-emerald-500/10">
                                Aprovado (Cliente)
                              </span>
                            )}
                            {order.budget?.status === 'Recusado' && order.history.some(h => h.user === 'Cliente (Via Portal)' && h.description.includes('RECUSADO')) && (
                              <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-tighter bg-red-500/10 text-red-400/80 w-max border border-red-500/10">
                                Recusado (Cliente)
                              </span>
                            )}
                            {order.deliveryForecast && new Date(order.deliveryForecast) < new Date() && !['Reparo Concluído', 'Equipamento Retirado', 'Orçamento Cancelado', 'Sem Reparo'].includes(order.status) && (
                              <span className="flex items-center gap-1 text-[7px] sm:text-[8px] bg-red-500/10 text-red-500/80 px-1.5 py-0.5 rounded-sm font-black animate-pulse uppercase tracking-tighter w-max border border-red-500/10">
                                <AlertTriangle size={7} /> Atrasado
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {!['Reparo Concluído', 'Equipamento Retirado', 'Orçamento Cancelado', 'Sem Reparo'].includes(order.status) && (
                              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${PRIORITY_COLORS[order.priority]} opacity-80`} title={`Prioridade: ${order.priority}`} />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDocs(order);
                              }}
                              className="p-1 sm:p-1.5 rounded-sm bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-600 hover:text-zinc-300 transition-all shadow-sm"
                              title={order.scannedOsUrl ? 'Ver PDF Escaneado' : 'Ver Documentos'}
                            >
                              <FileText size={10} className="sm:w-3 sm:h-3" />
                            </button>
                            <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-950/50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm border border-zinc-800 shadow-sm">
                              <User size={8} className="sm:w-2.5 sm:h-2.5 text-zinc-600" />
                              <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{order.history[0]?.user?.split(' ')[0] || 'Téc'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}

            {groupedOrders.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4 bg-[#141414]/50 border border-zinc-800/50 rounded-[2.5rem]">
                 <div className="p-5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-700">
                    <Inbox size={48} strokeWidth={1} />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-300">Nenhuma ordem encontrada</h3>
                    <p className="text-sm text-zinc-500 max-w-[280px] mx-auto">Tente ajustar sua busca ou selecione outro status no seletor acima.</p>
                 </div>
              </div>
            )}
          </div>
      </main>

      {/* Global Search Command Palette (Ctrl+K) */}
      <AnimatePresence>
        {isGlobalSearchOpen && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGlobalSearchOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              className="relative w-full max-w-2xl bg-[#141414] border border-zinc-700/50 rounded-[28px] shadow-2xl overflow-hidden"
            >
              <div className="relative p-6 border-b border-zinc-800 bg-[#0A0A0A]/50">
                <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-[#00E676]" size={24} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Pesquisar por tudo... (Nome, Celular, OS ou Equipamento)"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full bg-transparent pl-14 pr-4 py-4 text-xl text-white placeholder-zinc-600 focus:outline-none"
                />
                <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded-sm border border-zinc-700">
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ESC</span>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto no-scrollbar p-3">
                {globalSearchQuery.length < 2 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-zinc-600">
                    <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800/50 mb-4 opacity-50">
                      <Search size={32} className="text-zinc-600" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.2em]">Encontre tudo instantaneamente</p>
                    <p className="text-[10px] text-zinc-600 font-bold mt-2">Digite ID da OS, Nome do Cliente ou Equipamento</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    {/* Results: Orders */}
                    {orders.filter(o => 
                      o.osNumber.toString().includes(globalSearchQuery) ||
                      o.equipment.model.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                      o.equipment.serial?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                      customers.find(c => c.id === o.customerId)?.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                      customers.find(c => c.id === o.customerId)?.document?.includes(globalSearchQuery)
                    ).map(o => {
                      const customer = customers.find(c => c.id === o.customerId);
                      return (
                        <button
                          key={`global-search-order-${o.id}`}
                          onClick={() => { setSelectedOrder(o); setIsGlobalSearchOpen(false); setGlobalSearchQuery(''); }}
                          className="w-full flex items-center gap-5 p-4 rounded-md hover:bg-zinc-800/80 transition-all border border-transparent hover:border-zinc-700 group/item text-left"
                        >
                          <div className={`p-4 rounded-md ${STATUS_CONFIG[o.status].bg} ${STATUS_CONFIG[o.status].color} group-hover/item:scale-110 transition-transform`}>
                             {React.createElement(STATUS_CONFIG[o.status].icon, { size: 24 })}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded uppercase tracking-tighter">OS {o.osNumber.toString().padStart(4, '0')}</span>
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{o.status}</span>
                            </div>
                            <h4 className="text-lg font-black text-zinc-100 group-hover/item:text-white capitalize">{o.equipment.brand} {o.equipment.model}</h4>
                            <p className="text-sm text-zinc-500 font-medium">{customer?.name || 'Cliente Desconhecido'}</p>
                          </div>
                          <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-sm opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <ChevronLeft size={16} className="text-zinc-400 rotate-180" />
                          </div>
                        </button>
                      );
                    })}
                    
                    {/* Empty State */}
                    {orders.filter(o => 
                      o.osNumber.toString().includes(globalSearchQuery) ||
                      o.equipment.model.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                      o.equipment.serial?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                      customers.find(c => c.id === o.customerId)?.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                      customers.find(c => c.id === o.customerId)?.document?.includes(globalSearchQuery)
                    ).length === 0 && (
                      <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-3">
                        <Inbox size={32} className="opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-50">Nada encontrado para "{globalSearchQuery}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OS Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm no-print"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0F0F0F]/98 backdrop-blur-xl border-none sm:border border-white/[0.06] w-full max-w-6xl h-[100dvh] sm:h-[95vh] flex flex-col shadow-2xl no-print overflow-hidden rounded-none sm:rounded-2xl relative"
            >
              {/* === CABEÇALHO DO MODAL === */}
              <div className="shrink-0 border-b border-white/[0.06] bg-[#0A0A0A]/80 relative overflow-hidden px-4 pt-4 pb-3 sm:px-6">
                {/* TOP ROW */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="w-9 h-9 flex items-center justify-center bg-white/[0.05] border border-white/[0.06] rounded-xl text-zinc-400 hover:text-white transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {/* Número da OS com cor do status */}
                    <div className={`px-3 py-1.5 rounded-xl ${STATUS_CONFIG[selectedOrder.status].bg} border border-white/[0.08]`}>
                      <span className={`text-[15px] font-black font-mono tracking-wider ${STATUS_CONFIG[selectedOrder.status].color}`}>
                        OS {selectedOrder.osNumber?.toString().padStart(4, '0') || '---'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[selectedOrder.priority]}`} />
                       <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest hidden sm:inline-block">{selectedOrder.priority}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2.5 py-1.5 rounded-xl font-black uppercase tracking-wider border border-white/[0.06] bg-white/[0.04] ${STATUS_CONFIG[selectedOrder.status].color}`}>
                      {selectedOrder.status}
                    </span>
                    <button onClick={() => setSelectedOrder(null)} className="w-9 h-9 flex items-center justify-center bg-white/[0.05] border border-white/[0.06] rounded-xl text-zinc-400 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* BOTTOM ROW: Client & Equipment */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight truncate leading-none">
                      {customers.find(c => c.id === selectedOrder.customerId)?.name || 'Cliente'}
                    </h2>
                  </div>
                  <div className="shrink-0 hidden sm:flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-xl">
                    <Smartphone size={12} className="text-blue-400/80" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">
                      {selectedOrder.equipment.model}
                    </span>
                  </div>
                </div>
              </div>

                {/* Barra de Ações Superior (Apenas Desktop) */}
                <div className="hidden sm:flex bg-[#050505] border-t border-zinc-800/30 items-center gap-3 px-6 py-3 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative group">
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as OrderStatus;
                          if (newStatus === 'Equipamento Retirado') {
                            const balance = (selectedOrder.financials?.totalValue || 0) - (selectedOrder.financials?.amountPaid || 0);
                            const hasWarrantyInOrder = selectedOrder.completionData?.warrantyDays || selectedOrder.completionData?.hasWarranty;
                            if (!hasWarrantyInOrder && !confirm("⚠️ Esta OS ainda não possui Termo de Garantia emitido. Deseja entregar o equipamento mesmo assim?")) return;
                            if (balance > 0) {
                              onShowToast(!hasWarrantyInOrder ? "⚠️ Atenção: Pendência financeira detectada." : "💰 Pagamento pendente.");
                              setPaymentAmount(balance.toString());
                              setDiscount('0');
                              setOnSuccessStatus('Equipamento Retirado');
                              setIsPaymentModalOpen(true);
                              return;
                            }
                            updateOrderStatus(selectedOrder, 'Equipamento Retirado');
                            return;
                          }
                          updateOrderStatus(selectedOrder, newStatus);
                          setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
                          if (newStatus === 'Reparo Concluído') {
                            if (window.confirm("Deseja criar um termo de garantia para esta OS?")) {
                              const fullCustomer = customers.find(c => c.id === selectedOrder.customerId);
                              if (onNavigateToGarantia) onNavigateToGarantia({ ...selectedOrder, status: newStatus, customer: fullCustomer });
                            }
                          }
                        }}
                        className="bg-[#1A1A1A] border border-zinc-800 text-[#00E676] text-[10px] font-black uppercase tracking-widest px-4 h-10 rounded-sm appearance-none pr-10 focus:border-[#00E676] transition-all cursor-pointer"
                      >
                        {Object.keys(STATUS_CONFIG).map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  <div className="w-px h-6 bg-zinc-800/50 shrink-0 mx-1" />

                  <div className="flex items-center gap-2 shrink-0 pr-4">
                    {onEdit && (
                      <button 
                        onClick={() => onEdit(selectedOrder)} 
                        disabled={isPrinting}
                        className="flex items-center gap-2 px-3 sm:px-4 h-10 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase disabled:opacity-30"
                      >
                        <Pencil size={14} /> <span className="hidden sm:inline">Editar</span>
                      </button>
                    )}
                    <button 
                      onClick={() => triggerPrint('a4')} 
                      disabled={isPrinting}
                      className="flex items-center gap-2 px-3 sm:px-4 h-10 bg-[#00E676]/10 border border-[#00E676]/30 rounded-sm text-[#00E676] hover:bg-[#00E676]/20 transition-all text-[10px] font-black uppercase disabled:opacity-30"
                    >
                      <Printer size={14} /> <span className="hidden sm:inline">Imprimir A4</span><span className="sm:hidden">A4</span>
                    </button>
                    <button 
                      onClick={() => triggerPrint('thermal')} 
                      disabled={isPrinting}
                      className="flex items-center gap-2 px-3 sm:px-4 h-10 bg-orange-500/10 border border-orange-500/30 rounded-sm text-orange-400 hover:bg-orange-500/20 transition-all text-[10px] font-black uppercase disabled:opacity-30"
                    >
                      <Printer size={14} /> <span className="hidden sm:inline">Cupom</span><span className="sm:hidden">Cupom</span>
                    </button>
                    <button 
                      onClick={() => {
                        const customer = customers.find(c => c.id === selectedOrder.customerId);
                        if (!customer?.whatsapp) { onShowToast('Cliente sem número de WhatsApp cadastrado'); return; }
                        const portalUrl = companySettings.publicSlug ? `${window.location.origin}/${companySettings.publicSlug}/${selectedOrder.id}` : `${window.location.origin}/os/${selectedOrder.id}`;
                        
                        const message = (osSettings.whatsappEntryTemplate || `Olá [nome_cliente]! Sua OS [numero_os] ([equipamento]) foi registrada com sucesso em nossa assistência. Acompanhe o status pelo link: [link_os]`)
                          .replace(/\[nome_cliente\]/g, customer.name)
                          .replace(/\[numero_os\]/g, selectedOrder.osNumber.toString().padStart(4, '0'))
                          .replace(/\[equipamento\]/g, `${selectedOrder.equipment.brand} ${selectedOrder.equipment.model}`)
                          .replace(/\[data_entrada\]/g, new Date().toLocaleDateString('pt-BR'))
                          .replace(/\[link_os\]/g, portalUrl)
                          .replace(/{link}/g, portalUrl)
                          .replace(/\[nome_assistencia\]/g, companySettings.name || 'Servyx')
                          .replace(/{empresa}/g, companySettings.name || 'Servyx');

                        setWhatsappModal({ isOpen: true, message, customerPhone: customer.whatsapp });
                      }}
                      disabled={isPrinting}
                      className="flex items-center gap-2 px-3 sm:px-4 h-10 bg-[#00E676]/10 border border-[#00E676]/30 rounded-sm text-[#00E676] hover:bg-[#00E676]/20 transition-all text-[10px] font-black uppercase disabled:opacity-30"
                      title="Enviar via WhatsApp"
                    >
                      <MessageCircle size={14} /> <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                    <button 
                      onClick={() => handleViewDocs(selectedOrder)} 
                      disabled={isPrinting}
                      className="flex items-center gap-2 px-3 sm:px-4 h-10 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase disabled:opacity-30"
                    >
                      <FileText size={14} /> <span className="hidden sm:inline">Docs</span><span className="sm:hidden">Docs</span>
                    </button>
                  </div>
                </div>
              {/* === CORPO (SIDEBAR ESQUERDA + CONTEÚDO DIREITA) === */}
              <div className="flex flex-1 overflow-hidden relative">
                
                {/* Mobile Tab Navigation */}
                <div className="md:hidden absolute top-0 left-0 right-0 z-[60] flex items-center justify-between px-2 py-1.5 bg-[#0F0F0F]/95 backdrop-blur-xl border-b border-white/[0.05] shadow-2xl">
                  {[
                    { id: 'geral', label: 'Geral', icon: FileText },
                    { id: 'laudo', label: 'Laudo', icon: CheckCircle2 },
                    { id: 'orcamento', label: 'Custos', icon: Calculator },
                    { id: 'seguranca', label: 'Acesso', icon: ShieldCheck },
                    { id: 'historico', label: 'Hist.', icon: Clock }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all mx-0.5 ${
                          isActive 
                            ? `${STATUS_CONFIG[selectedOrder.status].bg} ${STATUS_CONFIG[selectedOrder.status].color}` 
                            : 'text-zinc-600 hover:text-zinc-300 bg-transparent'
                        }`}
                      >
                        <Icon size={13} />
                        <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sidebar Desktop */}
                <div className="hidden md:flex w-56 flex-col bg-[#0A0A0A] border-r border-zinc-800 shrink-0 p-4 pt-6 space-y-2 relative z-10">
                  <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] mb-4 pl-3">Tópicos da OS</h3>
                  {[
                    { id: 'geral', label: 'Info Gerais', icon: FileText, desc: 'Dados e Aparelho' },
                    { id: 'laudo', label: 'Laudo', icon: CheckCircle2, desc: 'Técnico e Reparo' },
                    { id: 'orcamento', label: 'Orçamento', icon: Calculator, desc: 'Aprovação de Valor' },
                    { id: 'seguranca', label: 'Acesso', icon: ShieldCheck, desc: 'Links Públicos' },
                    { id: 'historico', label: 'Histórico', icon: Clock, desc: 'Logs e Alterações' }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 p-3 rounded-sm text-left transition-all border-l-2 ${
                          isActive 
                            ? 'bg-zinc-800/50 border-[#00E676]' 
                            : 'bg-transparent border-transparent hover:bg-zinc-800/30'
                        }`}
                      >
                         <div className={`p-2 rounded-sm bg-[#141414] border border-zinc-800 ${isActive ? 'text-[#00E676]' : 'text-zinc-500'}`}>
                           <Icon size={16} />
                         </div>
                         <div>
                           <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-zinc-400'}`}>{tab.label}</p>
                           <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">{tab.desc}</p>
                         </div>
                      </button>
                    );
                  })}

                  <div className="mt-auto pt-6 pb-2">
                    <div className="h-px bg-zinc-800 mb-6" />
                    <button
                      onClick={() => handleViewDocs(selectedOrder)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 transition-all group"
                    >
                      <div className="p-2 rounded-sm bg-[#141414] border border-zinc-800 text-zinc-500 group-hover:text-[#00E676] transition-colors">
                        <FileText size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors">Documentos</p>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-0.5">
                          Ver arquivos da OS
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto px-0 sm:p-8 pt-[48px] pb-24 md:pt-8 bg-[#0F0F0F] custom-scrollbar relative">
                
                {activeTab === 'geral' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Client & Equipment Info */}
                    {/* Client & Equipment Info - stacked vertically */}
                    <div className="grid grid-cols-1 gap-6">
                      
                      <section className="bg-white/[0.02] border-y sm:border border-white/[0.06] p-5 sm:p-6 rounded-none sm:rounded-2xl relative overflow-hidden hover:border-white/[0.1] transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <User size={14} className="text-[#00E676]" /> Dados do Cliente
                          </h3>
                          <button 
                            onClick={() => setShowAllCustomerInfo(!showAllCustomerInfo)}
                            className="text-[9px] font-black uppercase tracking-widest text-[#00E676] bg-[#00E676]/10 px-2.5 py-1 rounded-xl border border-[#00E676]/20 hover:bg-[#00E676]/20 transition-all"
                          >
                            {showAllCustomerInfo ? 'Ocultar' : 'Ver mais'}
                          </button>
                        </div>
                        <div className="space-y-2.5">
                          {(() => {
                            const customer = customers.find(c => c.id === selectedOrder.customerId);
                            return customer ? (
                              <>
                                <div className="bg-white/[0.03] rounded-2xl p-3.5 border border-white/[0.05]">
                                  <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider mb-1">Nome do Cliente</p>
                                  <p className="text-sm font-bold text-white truncate">{customer.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                  <div className="bg-white/[0.03] rounded-2xl p-3.5 border border-white/[0.05]">
                                    <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider mb-1">Contato</p>
                                    <p className="text-[11px] sm:text-xs text-zinc-300 font-bold truncate">{customer.phone || customer.whatsapp || '---'}</p>
                                  </div>
                                  <div className="bg-white/[0.03] rounded-2xl p-3.5 border border-white/[0.05]">
                                    <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider mb-1">Documento</p>
                                    <p className="text-[11px] sm:text-xs text-zinc-300 font-bold truncate">{customer.document || '---'}</p>
                                  </div>
                                </div>

                                {showAllCustomerInfo && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-3 pt-3 border-t border-zinc-800/50"
                                  >
                                    <div className="bg-[#141414] rounded-sm p-3.5 border border-zinc-800/50">
                                      <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">E-mail</p>
                                      <p className="text-[11px] sm:text-xs text-zinc-300 font-bold truncate">{customer.email || 'Não informado'}</p>
                                    </div>
                                    <div className="bg-[#141414] rounded-sm p-3.5 border border-zinc-800/50">
                                      <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">Endereço</p>
                                      <p className="text-[11px] sm:text-xs text-zinc-300 font-bold leading-relaxed">
                                        {customer.address?.street}, {customer.address?.number}{customer.address?.complement ? ` - ${customer.address.complement}` : ''}<br />
                                        {customer.address?.neighborhood} - {customer.address?.city}/{customer.address?.state}<br />
                                        CEP: {customer.address?.zipCode}
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </>
                            ) : <p className="text-zinc-500 italic text-sm">Cliente não encontrado</p>;
                          })()}
                        </div>
                      </section>



                      {/* Aparelho Card */}
                      <section className="bg-white/[0.02] border-y sm:border border-white/[0.06] p-5 sm:p-6 rounded-none sm:rounded-2xl relative overflow-hidden hover:border-white/[0.1] transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Smartphone size={14} className="text-blue-400" /> Detalhes do Equipamento
                          </h3>
                        </div>
                        <div className="space-y-2.5">
                          <div className="bg-white/[0.03] rounded-2xl p-3.5 border border-white/[0.05] flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">Aparelho</p>
                              <p className="text-sm font-bold text-white truncate pr-2">
                                {selectedOrder.equipment.brand} <span className="text-blue-400">{selectedOrder.equipment.model}</span>
                              </p>
                            </div>
                            {selectedOrder.equipment.serial && (
                              <div className="shrink-0 text-right pl-3 border-l border-white/[0.05]">
                                <p className="text-[8px] uppercase font-black text-zinc-600 tracking-widest mb-1">S/N</p>
                                <p className="text-[10px] font-mono text-zinc-300 font-bold">{selectedOrder.equipment.serial}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-white/[0.03] rounded-2xl p-3.5 border border-white/[0.05]">
                              <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider mb-1">Tipo</p>
                              <p className="text-[11px] sm:text-xs text-zinc-300 font-bold truncate">{selectedOrder.equipment.type}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-2xl p-3.5 border border-white/[0.05]">
                              <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider mb-1">Cor</p>
                              <p className="text-[11px] sm:text-xs text-zinc-300 font-bold truncate">{selectedOrder.equipment.color}</p>
                            </div>
                          </div>
                          
                          {selectedOrder.equipment.passwordType !== 'none' && (
                            <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3.5">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-500/10 rounded-xl">
                                  <Lock size={12} className="text-amber-500/60" /> 
                                </div>
                                <div>
                                  <p className="text-[8px] uppercase font-black text-amber-500/60 tracking-widest leading-none mb-1">
                                    {selectedOrder.equipment.passwordType === 'pattern' ? 'Padrão' : 'Senha'}
                                  </p>
                                  <p className="text-xs font-bold text-amber-500 leading-none">
                                    {selectedOrder.equipment.passwordType === 'pattern' ? 'Desenho' : selectedOrder.equipment.passwordValue}
                                  </p>
                                </div>
                              </div>
                              {selectedOrder.equipment.passwordType === 'pattern' && selectedOrder.equipment.passwordValue && (
                                <button
                                  onClick={() => setIsPatternModalOpen(true)}
                                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors border border-amber-500/20"
                                >
                                  Ver Padrão
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>


                    {/* Checklist & Defect Grid - stacked vertically */}
                    <div className="grid grid-cols-1 gap-6">
                      
                      <section className="bg-white/[0.02] border-y sm:border border-white/[0.06] p-5 sm:p-6 rounded-none sm:rounded-2xl flex flex-col hover:border-white/[0.1] transition-colors">
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                          <CheckCircle2 size={14} className="text-[#00E676]" /> Checklist de Entrada
                        </h3>
                        
                        {(selectedOrder.checklistNotPossible || (selectedOrder as any).checklist_not_possible) ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-red-500/5 rounded-2xl border border-red-500/10">
                            <AlertCircle size={32} className="text-red-500/40 mx-auto mb-3" />
                            <p className="text-sm font-black text-red-500 uppercase tracking-widest">
                              Checklist não realizado
                            </p>
                            <p className="text-xs text-red-500/60 mt-2 font-medium">
                              Dispositivo não liga ou apresenta falha crítica
                            </p>
                          </div>
                        ) : (selectedOrder.isVisualChecklist || (selectedOrder as any).is_visual_checklist) ? (
                          <div className="flex-1 -mx-2 sm:mx-0 overflow-x-auto custom-scrollbar pb-2">
                            <div className="w-full min-w-0 mx-auto overflow-hidden">
                              <ControllerChecklistPrint checklist={selectedOrder.checklist} theme="dark" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1">
                          <div className="flex flex-col gap-2">
                            {Object.entries(selectedOrder.checklist).map(([item, status]) => (
                               <div key={item} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                                <div className="flex items-center gap-3">
                                  {status === 'works' ? (
                                    <CheckCircle2 size={14} className="text-[#00E676]" />
                                  ) : status === 'broken' ? (
                                    <XCircle size={14} className="text-red-500" />
                                  ) : (
                                    <AlertCircle size={14} className="text-zinc-500" />
                                  )}
                                  <span className={`text-[12px] font-bold uppercase tracking-wider ${status === 'works' ? 'text-zinc-300' : status === 'broken' ? 'text-red-400' : 'text-zinc-500'}`}>
                                    {item}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'works' ? 'text-[#00E676]/60' : status === 'broken' ? 'text-red-500/60' : 'text-zinc-700'}`}>
                                  {status === 'works' ? 'OK' : status === 'broken' ? 'Falha' : 'N/A'}
                                </span>
                              </div>
                            ))}
                          </div>
                          </div>
                        )}
                        {selectedOrder.checklistNotes && (
                          <div className="mt-4 pt-4 border-t border-white/[0.06]">
                            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2">Observações</p>
                            <p className="text-sm text-zinc-300 italic">{selectedOrder.checklistNotes}</p>
                          </div>
                        )}

                        {/* Fotos de Entrada Button */}
                        <button 
                          onClick={() => setIsEntryPhotosModalOpen(true)}
                          className="w-full mt-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl py-4 px-5 flex items-center justify-between group hover:border-blue-500/30 hover:bg-white/[0.05] transition-all active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                              <CameraIcon size={18} />
                            </div>
                            <div className="text-left">
                              <span className="block text-xs font-black uppercase tracking-[0.1em] text-white group-hover:text-blue-400 transition-colors">Fotos de Entrada</span>
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Registradas no check-in</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-tighter">
                                {selectedOrder.entryPhotos?.length || 0}
                              </span>
                              <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">Arquivos</span>
                            </div>
                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </button>
                      </section>

                      <div className="flex flex-col gap-6">
                        <section className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-6 rounded-none sm:rounded-sm group hover:border-zinc-700 transition-colors">
                          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                            <AlertTriangle size={14} className="text-orange-400" /> Defeito Relatado
                          </h3>
                          <div className="bg-[#141414] rounded-sm p-4 border border-zinc-800 flex-1">
                            <p className="text-sm text-white font-medium whitespace-pre-wrap">{selectedOrder.defect}</p>
                          </div>
                        </section>

                        {/* Prominent Service Section - Moved here for better mobile flow */}
                        <section className="bg-zinc-900/40 border-y sm:border border-zinc-800 p-5 sm:p-6 rounded-none sm:rounded-sm">
                          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                            <Wrench size={14} className="text-[#00E676]" /> Serviço Contratado
                          </h3>
                          <div className="bg-[#141414] rounded-sm p-4 border border-[#00E676]/20 shadow-[0_0_15px_rgba(0,230,118,0.05)]">
                            <p className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                              {selectedOrder.service || 'Não especificado'}
                            </p>
                          </div>
                        </section>

                        {selectedOrder.technicianNotes && (
                          <section className="bg-[#0A0A0A] border border-zinc-800 p-6 rounded-sm group hover:border-zinc-700 transition-colors">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                              <FileText size={14} className="text-purple-400" /> Notas Internas
                            </h3>
                            <div className="bg-[#141414] rounded-sm p-4 border border-zinc-800/50 text-sm text-white font-medium whitespace-pre-wrap">
                              {selectedOrder.technicianNotes}
                            </div>
                          </section>
                        )}
                      </div>
                    </div>

                    {/* Financials & Closing */}
                    <div className="space-y-6">
                      <section className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-8 rounded-none sm:rounded-sm overflow-hidden relative group hover:border-zinc-700 transition-colors">

                         
                         <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                           <h3 className="text-sm font-black text-zinc-300 uppercase tracking-[0.2em] flex items-center gap-2">
                             <Banknote size={18} className="text-emerald-400" /> Valores e Serviço
                           </h3>
                           {selectedOrder.financials?.paymentStatus !== 'Total' && (
                             <button
                               onClick={() => setIsPaymentModalOpen(true)}
                               className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-sm text-xs font-bold uppercase transition-all flex items-center gap-2 w-fit"
                             >
                               <Plus size={14} /> Registrar Pagamento
                             </button>
                           )}
                         </div>

                         {/* Seção de Valores em Formato Lista */}
                         <div className="relative z-10 space-y-3">
                           <div className="flex items-center justify-between p-3.5 bg-[#141414] border border-zinc-800/50 rounded-sm">
                             <div className="flex items-center gap-3">
                               <div className="p-2 bg-zinc-800 rounded-sm text-zinc-500">
                                 <FileText size={16} />
                               </div>
                               <div>
                                 <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Serviço Contratado</p>
                                 <p className="text-sm font-semibold text-white leading-tight">{selectedOrder.service || 'Não especificado'}</p>
                               </div>
                             </div>
                           </div>

                           <div className="flex items-center justify-between p-3.5 bg-[#141414] border border-zinc-800/50 rounded-sm">
                             <div className="flex items-center gap-3">
                               <div className="p-2 bg-zinc-800 rounded-sm text-zinc-500">
                                 <Banknote size={16} />
                               </div>
                               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor Total</p>
                             </div>
                             <p className="text-base font-bold text-white">
                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials?.totalValue || 0)}
                             </p>
                           </div>

                           <div className="flex items-center justify-between p-3.5 bg-[#141414] border border-zinc-800/50 rounded-sm">
                             <div className="flex items-center gap-3">
                               <div className="p-2 bg-emerald-500/10 rounded-sm text-emerald-500">
                                 <Banknote size={16} />
                               </div>
                               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor Pago</p>
                             </div>
                             <p className="text-base font-bold text-emerald-500">
                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials?.amountPaid || 0)}
                             </p>
                           </div>

                            {(selectedOrder.financials?.totalValue || 0) - (selectedOrder.financials?.amountPaid || 0) > 0 && (
                              <div className="flex items-center justify-between p-3.5 bg-orange-500/5 border border-orange-500/10 rounded-sm">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-orange-500/10 rounded-sm text-orange-500">
                                    <Clock size={16} />
                                  </div>
                                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Saldo Restante</p>
                                </div>
                                <p className="text-base font-black text-orange-400">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((selectedOrder.financials?.totalValue || 0) - (selectedOrder.financials?.amountPaid || 0))}
                                </p>
                              </div>
                            )}

                           <div className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-zinc-800/50 rounded-md">
                             <div className="flex items-center gap-3">
                               <div className="p-2 bg-zinc-800 rounded-sm text-zinc-500">
                                 <Shield size={16} />
                               </div>
                               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status Pag.</p>
                             </div>
                             <select
                               value={selectedOrder.financials?.paymentStatus || 'Pendente'}
                               onChange={(e) => {
                                 const newStatus = e.target.value as 'Total' | 'Parcial' | 'Pendente';
                                 updatePaymentStatus(selectedOrder, newStatus);
                                 setSelectedOrder(prev => prev ? {
                                   ...prev,
                                   financials: { ...prev.financials, paymentStatus: newStatus }
                                 } : null);
                               }}
                               className={`text-[10px] font-black uppercase tracking-wider bg-[#141414] border border-zinc-800 rounded-sm px-2 py-1 focus:outline-none focus:border-[#00E676] transition-colors appearance-none cursor-pointer text-right ${
                                 selectedOrder.financials?.paymentStatus === 'Total' ? 'text-emerald-500' :
                                 selectedOrder.financials?.paymentStatus === 'Parcial' ? 'text-blue-400' :
                                 'text-red-400'
                               }`}
                             >
                               <option value="Pendente">Pendente</option>
                               <option value="Parcial">Parcial</option>
                               <option value="Total">Total</option>
                             </select>
                           </div>
                         </div>
                      </section>

                      {selectedOrder.completionData && (
                        <section className="bg-[#141414] border-y sm:border border-zinc-800/80 p-5 sm:p-8 rounded-none sm:rounded-sm overflow-hidden relative group hover:border-zinc-700 transition-colors">

                           <h3 className="text-sm font-black text-[#00E676] uppercase tracking-[0.2em] flex items-center gap-2 mb-6 relative z-10">
                             <CheckCircle2 size={18} /> Dados de Finalização do Reparo
                           </h3>
                           
                           <div className="relative z-10 space-y-6">
                             <div className="bg-[#0A0A0A]/50 border border-[#00E676]/10 p-5 rounded-md">
                               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Serviços Realizados</p>
                               <p className="text-sm text-white font-medium whitespace-pre-wrap leading-relaxed">{selectedOrder.completionData.servicesPerformed}</p>
                             </div>

                             {selectedOrder.completionData.partsUsed && (
                               <div className="bg-[#141414] border border-[#00E676]/20 p-5 rounded-none flex flex-col md:flex-row gap-4 justify-between">
                                 <div>
                                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Peças Trocadas/Utilizadas</p>
                                   <p className="text-sm text-zinc-300 font-medium">{selectedOrder.completionData.partsUsed}</p>
                                 </div>
                                 {selectedOrder.completionData.supplier && (
                                   <div className="md:text-right">
                                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Fornecedor</p>
                                     <p className="text-sm text-zinc-400">{selectedOrder.completionData.supplier}</p>
                                   </div>
                                 )}
                               </div>
                             )}

                             {selectedOrder.completionData.warrantyDays && (
                               <div className="flex items-start gap-4 bg-[#141414] border border-orange-500/20 p-5 rounded-none">
                                 <div className="bg-orange-500/10 p-3 rounded-none border border-orange-500/20">
                                   <ShieldCheck className="text-orange-500" size={24} />
                                 </div>
                                 <div>
                                   <p className="text-base font-black text-white">Garantia Ativa de {selectedOrder.completionData.warrantyDays} dias</p>
                                   {selectedOrder.completionData.warrantyTerms ? (
                                     <p className="text-sm text-zinc-400 mt-1 font-medium">{selectedOrder.completionData.warrantyTerms}</p>
                                   ) : (
                                     <p className="text-sm text-zinc-500 mt-1">Nenhum termo adicional descrito.</p>
                                   )}
                                 </div>
                               </div>
                             )}
                           </div>
                        </section>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'seguranca' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-[#0A0A0A] border-y sm:border border-zinc-800 rounded-none sm:rounded-sm">
                      <SecurityPortalManager 
                        order={selectedOrder}
                        companySettings={companySettings}
                        onUpdate={(updates) => {
                          setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
                          if (setOrders) setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, ...updates } : o));
                        }}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'laudo' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-6 rounded-none sm:rounded-sm gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-[#00E676] flex items-center gap-2 uppercase tracking-tight">
                          <FileText size={20} className="sm:w-6 sm:h-6" /> Laudo Técnico
                        </h3>
                        <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 uppercase font-bold tracking-widest">Diagnóstico formal para o cliente</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {selectedOrder.technicalReport && (
                           <button 
                             onClick={() => {
                               if (window.innerWidth < 640) {
                                 handleSharePDF();
                               } else {
                                 triggerPrint('a4');
                               }
                             }} 
                             className="flex-1 py-3 bg-[#141414] hover:bg-zinc-800 text-white rounded-sm border border-zinc-800 transition-all flex items-center justify-center gap-2 group"
                           >
                             {window.innerWidth < 640 ? <FileText size={16} className="text-zinc-400 group-hover:text-white transition-colors" /> : <Printer size={16} className="text-zinc-400 group-hover:text-white transition-colors" />}
                             <span className="text-[10px] font-black uppercase tracking-widest">{window.innerWidth < 640 ? "PDF" : "A4"}</span>
                           </button>
                        )}
                        <button
                          onClick={handleSaveTechnicalReport}
                          disabled={isSavingReport}
                          className="flex-1 sm:flex-none bg-[#00E676] text-black font-black px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest hover:bg-[#00C853] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          translate="no"
                        >
                          {isSavingReport ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Salvando</span>
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Salvar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <section className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-6 rounded-none sm:rounded-sm space-y-4">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Search size={14} className="text-[#00E676]" /> Diagnóstico Técnico
                          </label>
                          <textarea
                            value={diagnosis}
                            onChange={e => setDiagnosis(e.target.value)}
                            placeholder="Descreva o problema identificado..."
                            className="w-full h-32 bg-[#141414] border border-zinc-800 rounded-sm p-4 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none placeholder:text-zinc-800 font-medium"
                          />
                        </section>

                        <section className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-6 rounded-none sm:rounded-sm space-y-4">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Check size={14} className="text-[#00E676]" /> Testes Realizados
                          </label>
                          <textarea
                            value={tests}
                            onChange={e => setTests(e.target.value)}
                            placeholder="Quais testes foram feitos?"
                            className="w-full h-32 bg-[#141414] border border-zinc-800 rounded-sm p-4 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none placeholder:text-zinc-800 font-medium"
                          />
                        </section>

                        <section className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-6 rounded-none sm:rounded-sm space-y-4">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Package size={14} className="text-[#00E676]" /> Peças Necessárias
                          </label>
                          <textarea
                            value={partsNeeded}
                            onChange={e => setPartsNeeded(e.target.value)}
                            placeholder="Liste as peças necessárias..."
                            className="w-full h-24 bg-[#141414] border border-zinc-800 rounded-sm p-4 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none placeholder:text-zinc-800 font-medium"
                          />
                        </section>
                      </div>

                      <div className="space-y-6">
                        <section className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-6 rounded-none sm:rounded-sm space-y-4">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <MessageCircle size={14} className="text-[#00E676]" /> Observações Técnicas
                          </label>
                          <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Notas internas do técnico..."
                            className="w-full h-24 bg-[#141414] border border-zinc-800 rounded-sm p-4 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none placeholder:text-zinc-800 font-medium"
                          />
                        </section>

                        <section className="bg-[#0A0A0A] border-y sm:border border-[#00E676]/30 p-8 sm:p-8 rounded-none sm:rounded-sm space-y-4 shadow-2xl shadow-[#00E676]/5">
                          <label className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em] flex items-center gap-2 justify-center">
                            Conclusão Final
                          </label>
                          <textarea
                            value={conclusion}
                            onChange={e => setConclusion(e.target.value)}
                            placeholder="Qual o veredito técnico?"
                            className="w-full h-28 bg-[#141414] border border-zinc-800 rounded-sm p-6 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all resize-none placeholder:text-zinc-800 text-center italic font-bold"
                          />
                        </section>

                        <section className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-6 rounded-none sm:rounded-sm space-y-4">
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                               <CameraIcon size={14} className="text-[#00E676]" /> Evidências
                             </label>
                             <button
                               onClick={handleCaptureReportPhoto}
                               className="px-3 py-1.5 bg-[#141414] border border-zinc-700 rounded text-[9px] font-black uppercase text-zinc-300 hover:text-[#00E676] hover:border-[#00E676] transition-all"
                             >
                               Adicionar
                             </button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                             {reportPhotos.map((photo, idx) => (
                               <div key={idx} className="aspect-square bg-zinc-900 rounded-sm border border-zinc-800 overflow-hidden relative group">
                                 <img src={photo} alt="Evidência" className="w-full h-full object-contain bg-black/20" />
                                 <button onClick={() => setReportPhotos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                                </div>
                             ))}
                             {reportPhotos.length === 0 && (
                               <div className="col-span-3 h-20 border-2 border-dashed border-zinc-800 rounded-sm flex items-center justify-center text-[8px] text-zinc-700 font-black uppercase tracking-widest">
                                 Nenhuma evidência
                               </div>
                             )}
                          </div>
                        </section>

                        <section className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-6 rounded-none sm:rounded-sm">
                          <SignaturePad 
                             title="Assinatura do Técnico"
                             initialSignature={technicianSignature}
                             onSave={(url) => setTechnicianSignature(url)}
                             onClear={() => setTechnicianSignature(null)}
                          />
                        </section>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'orcamento' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                      
                      {/* Coluna Principal: Conteúdo do Orçamento */}
                      <div className="flex-1 space-y-6 w-full">
                        {/* Seção 1: Diagnóstico e Plano */}
                        <div className="bg-[#0A0A0A] border-y sm:border border-zinc-800 rounded-none sm:rounded-sm p-5 sm:p-8 space-y-8">
                          <div className="flex items-center gap-3 border-b border-zinc-800/50 pb-6">
                            <div className="p-2.5 bg-red-400/10 rounded-sm text-red-400">
                              <AlertCircle size={18} />
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">Análise Técnica</h3>
                              <p className="text-[10px] sm:text-xs text-zinc-500 uppercase font-bold tracking-widest">Defeito e plano de ação</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Search size={12} className="text-red-400" /> Defeito Detalhado
                              </label>
                              <textarea
                                value={budgetDetailedDefect}
                                onChange={e => setBudgetDetailedDefect(e.target.value)}
                                placeholder="O que falhou?"
                                className="w-full h-32 bg-[#141414] border border-zinc-800 rounded-sm p-4 text-sm text-white focus:border-[#00E676] transition-all resize-none placeholder:text-zinc-800"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Wrench size={12} className="text-[#00E676]" /> Serviço Necessário
                              </label>
                              <textarea
                                value={budgetRequiredService}
                                onChange={e => setBudgetRequiredService(e.target.value)}
                                placeholder="Qual o procedimento?"
                                className="w-full h-32 bg-[#141414] border border-zinc-800 rounded-sm p-4 text-sm text-white focus:border-[#00E676] transition-all resize-none placeholder:text-zinc-800"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção 2: Itens de Custos */}
                        <div className="bg-[#0A0A0A] border-y sm:border border-zinc-800 rounded-none sm:rounded-sm p-5 sm:p-8 space-y-6">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/50 pb-6 gap-4">
                             <div className="flex items-center gap-3">
                               <div className="p-2.5 bg-blue-400/10 rounded-sm text-blue-400">
                                 <Plus size={18} />
                               </div>
                               <div>
                                 <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">Peças e Serviços</h3>
                                 <p className="text-[10px] sm:text-xs text-zinc-500 uppercase font-bold tracking-widest">Detalhamento financeiro</p>
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <button onClick={() => handleAddBudgetItem('service')} className="flex-1 sm:flex-none bg-zinc-900 border border-zinc-800 text-[#00E676] px-4 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">+ SERVIÇO</button>
                               <button onClick={() => handleAddBudgetItem('part')} className="flex-1 sm:flex-none bg-zinc-900 border border-zinc-800 text-blue-400 px-4 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">+ PEÇA</button>
                             </div>
                           </div>

                           <div className="space-y-3">
                             {budgetItems.map(item => (
                               <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-[#141414] border border-zinc-800/50 p-3.5 rounded-sm hover:border-zinc-700 transition-all">
                                 <div className="flex items-center gap-3 flex-1">
                                   <div className={`w-10 h-10 shrink-0 rounded-sm flex items-center justify-center ${item.type === 'service' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-blue-400/10 text-blue-400'}`}>
                                     {item.type === 'service' ? <Wrench size={16} /> : <Package size={16} />}
                                   </div>
                                   <input
                                     value={item.description}
                                     onChange={e => handleUpdateBudgetItem(item.id, 'description', e.target.value)}
                                     placeholder="Nome do item..."
                                     className="flex-1 bg-transparent border-none text-sm font-bold text-white focus:ring-0 p-0"
                                   />
                                 </div>
                                 <div className="flex items-center gap-3">
                                   <div className="flex items-center gap-2 bg-[#0A0A0A] px-3 py-2 rounded-sm border border-zinc-800 focus-within:border-[#00E676] transition-colors group/input flex-1 sm:flex-none">
                                     <span className="text-[10px] font-black text-zinc-600 group-focus-within/input:text-[#00E676] transition-colors">R$</span>
                                     <input
                                       type="text"
                                       value={Number(item.price) > 0 ? formatInputOnChange(Math.round(Number(item.price) * 100).toString()) : ''}
                                       onChange={e => handleUpdateBudgetItem(item.id, 'price', parseCurrencyToNumber(e.target.value))}
                                       placeholder="0,00"
                                       className="w-24 bg-transparent border-none text-sm font-black text-white focus:ring-0 text-right p-0 placeholder:text-zinc-900"
                                     />
                                   </div>
                                   <button onClick={() => handleRemoveBudgetItem(item.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                 </div>
                               </div>
                             ))}
                             
                             {budgetItems.length === 0 && (
                               <div className="text-center py-12 border-2 border-dashed border-zinc-900 rounded-sm">
                                  <Calculator size={32} className="text-zinc-800 mx-auto mb-2 opacity-50" />
                                  <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Nenhum item adicionado</p>
                               </div>
                             )}
                           </div>
                        </div>

                        {/* Seção 3: Observações */}
                        <div className="bg-[#0A0A0A] border-y sm:border border-zinc-800 rounded-none sm:rounded-sm p-5 sm:p-8 space-y-4">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                             <FileText size={12} className="text-zinc-600" /> Notas e Prazos
                           </label>
                           <textarea
                             value={budgetServiceNotes}
                             onChange={e => setBudgetServiceNotes(e.target.value)}
                             placeholder="Ex: Garantia de 90 dias..."
                             className="w-full h-24 bg-[#141414] border border-zinc-800 rounded-sm p-4 text-sm text-white focus:border-[#00E676] transition-all resize-none italic placeholder:text-zinc-800"
                           />
                        </div>
                      </div>

                      {/* Coluna Lateral: Resumo e Ações */}
                      <div className="w-full lg:w-80 space-y-6 shrink-0">
                        {/* Card de Valor Total */}
                        <div className="bg-[#00E676] p-6 sm:p-8 rounded-sm shadow-xl shadow-[#00E676]/10 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                           <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1 relative z-10">Total do Orçamento</p>
                           {budgetItems.length > 0 ? (
                             <p className="text-3xl sm:text-4xl font-black text-black relative z-10 tracking-tighter">
                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateBudgetTotal())}
                             </p>
                           ) : (
                             <div className="flex items-center gap-1.5 relative z-10 group/price">
                               <span className="text-xl font-black text-black/40 group-focus-within/price:text-black/80 transition-colors tracking-tighter shrink-0">R$</span>
                               <input 
                                 type="text"
                                 value={budgetPrice !== '0' ? formatInputOnChange(Math.round(parseFloat(budgetPrice) * 100).toString()) : ''}
                                 onChange={e => setBudgetPrice(parseCurrencyToNumber(e.target.value).toString())}
                                 placeholder="0,00"
                                 className="w-full bg-transparent border-none text-2xl sm:text-3xl font-black text-black tracking-tighter focus:ring-0 p-0 placeholder:text-black/20"
                               />
                             </div>
                           )}
                        </div>

                        {/* Card de Status */}
                        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-sm p-5 sm:p-6 space-y-4">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Aprovação</label>
                           <div className="grid grid-cols-1 gap-2">
                             {(['Em Elaboração', 'Aguardando Aprovação', 'Aprovado', 'Recusado'] as BudgetData['status'][]).map(status => (
                               <button
                                 key={status}
                                 onClick={() => setBudgetStatus(status)}
                                 className={`w-full text-left px-4 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all border ${
                                   budgetStatus === status 
                                     ? 'bg-[#141414] border-[#00E676] text-[#00E676] shadow-lg shadow-[#00E676]/5' 
                                     : 'bg-black/40 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                                 }`}
                               >
                                 <div className="flex items-center justify-between">
                                   {status}
                                   {budgetStatus === status && <CheckIcon size={12} strokeWidth={4} />}
                                 </div>
                               </button>
                             ))}
                           </div>
                        </div>

                        {/* Card de Fotos */}
                        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-sm p-5 sm:p-6 space-y-4">
                           <div className="flex items-center justify-between">
                             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Evidências</label>
                             <button onClick={handleCaptureBudgetPhoto} className="p-2 bg-zinc-900 rounded-sm text-[#00E676] hover:bg-zinc-800 transition-all"><Plus size={16} /></button>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                             {budgetPhotos.map((photo, idx) => (
                               <div key={idx} className="relative aspect-square rounded-sm overflow-hidden border border-zinc-800 group">
                                 <img src={photo} alt="Foto" className="w-full h-full object-contain bg-black/20" />
                                 <button onClick={() => setBudgetPhotos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                               </div>
                             ))}
                             {budgetPhotos.length === 0 && (
                               <button onClick={handleCaptureBudgetPhoto} className="aspect-square rounded-sm border-2 border-dashed border-zinc-900 flex flex-col items-center justify-center gap-1.5 text-zinc-800 hover:text-zinc-700 transition-all">
                                 <Smartphone size={16} />
                                 <span className="text-[7px] font-black uppercase">Câmera</span>
                               </button>
                             )}
                           </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="space-y-3">
                          <button
                            onClick={handleSaveBudget}
                            disabled={isSavingBudget}
                            className="w-full bg-[#00E676] text-black font-black py-3.5 rounded-sm text-[10px] uppercase tracking-widest hover:bg-[#00C853] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-[#00E676]/10"
                          >
                            {isSavingBudget ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Salvando</span>
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                <span>Salvar Orçamento</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleSendBudgetWhatsApp(true)}
                            className="w-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] font-black py-3.5 rounded-sm text-[10px] uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center gap-3"
                          >
                            <MessageSquare size={16} />
                            <span>Enviar p/ Cliente</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}


                {activeTab === 'historico' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between px-5 sm:px-0">
                       <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                         <Clock size={14} className="text-[#00E676]" /> Linha do Tempo
                       </h3>
                    </div>

                    <div className="flex items-center gap-3 bg-[#0A0A0A] p-3 sm:p-4 border-y sm:border border-zinc-800 rounded-none sm:rounded-sm">
                      <div className="p-2 bg-[#141414] rounded-sm text-zinc-500 border border-zinc-800/50">
                        <MessageSquare size={14} />
                      </div>
                      <input
                        type="text"
                        value={newHistoryNote}
                        onChange={(e) => setNewHistoryNote(e.target.value)}
                        placeholder="Adicionar nota técnica..."
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-800 focus:outline-none font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNote();
                        }}
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={isAddingNote || !newHistoryNote.trim()}
                        className="bg-[#00E676] hover:bg-[#00C853] text-black disabled:opacity-30 px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        {isAddingNote ? '...' : 'Add'}
                      </button>
                    </div>

                    <div className="bg-[#0A0A0A] border-y sm:border border-zinc-800 p-5 sm:p-8 rounded-none sm:rounded-sm space-y-6 relative overflow-hidden">
                       {/* Linha vertical mestra da Timeline */}
                       <div className="absolute left-[39px] sm:left-[51px] top-10 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-zinc-800 to-transparent" />
                       
                       {/* Mapeamento reverso dos eventos */}
                       {[...selectedOrder.history].reverse().map((event, i) => {
                         const config = getTimelineConfig(event.description);
                         const EventIcon = config.icon;
                         let relativeTime = '';
                         try {
                           relativeTime = formatDistanceToNow(new Date(event.date), { addSuffix: true, locale: ptBR });
                         } catch (e) {
                           relativeTime = 'data inválida';
                         }

                         return (
                           <motion.div 
                             key={i} 
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: i * 0.05 }}
                             className="flex gap-4 sm:gap-6 relative z-10 transition-all group/item"
                           >
                             <div className="flex flex-col items-center shrink-0 w-10 sm:w-12 pt-1">
                               <div className={`w-10 h-10 rounded-sm flex items-center justify-center border ${config.bg} ${config.border} shadow-[0_0_15px_rgba(0,0,0,0.3)] group-hover/item:scale-110 transition-transform relative z-10`}>
                                  <EventIcon size={16} className={config.color} />
                               </div>
                             </div>
                             
                             <div className="flex-1 min-w-0 bg-[#141414] border border-zinc-800/50 p-3.5 sm:p-4 rounded-sm hover:border-zinc-700 transition-colors">
                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                                  <h4 className="text-sm font-bold text-white leading-tight">{event.description}</h4>
                                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap hidden sm:block">
                                    {relativeTime}
                                  </span>
                               </div>
                               
                               <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                 <span className="flex items-center gap-1.5 text-zinc-400">
                                   <Calendar size={10} className={config.color} /> 
                                   <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                                   <span className="text-zinc-800">•</span>
                                   <span>{new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                 </span>
                                 
                                 <span className="flex items-center gap-1.5 text-zinc-500">
                                   <User size={10} className="text-zinc-700" /> 
                                   <span className="text-zinc-300">{event.user}</span>
                                 </span>

                                 <span className="block sm:hidden text-[9px] text-[#00E676]/40 lowercase italic font-medium">
                                   {relativeTime}
                                 </span>
                               </div>
                             </div>
                           </motion.div>
                         );
                       })}
                    </div>
                  </div>
                )}
              </div>
              </div>
                {/* Barra Inferior Fixa (Mobile Only) */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-zinc-800 px-1.5 pt-1.5 pb-3 flex items-center gap-1.5 z-[70] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                  {/* Botão Status */}
                  <div className="flex-1 relative flex flex-col items-center justify-center h-10 bg-zinc-900 border border-zinc-800 rounded-sm text-[#00E676] active:bg-zinc-800 transition-all overflow-hidden group">
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as OrderStatus;
                        if (newStatus === 'Equipamento Retirado') {
                          const balance = (selectedOrder.financials?.totalValue || 0) - (selectedOrder.financials?.amountPaid || 0);
                          const hasWarrantyInOrder = selectedOrder.completionData?.warrantyDays || selectedOrder.completionData?.hasWarranty;
                          if (!hasWarrantyInOrder && !confirm("⚠️ Esta OS ainda não possui Termo de Garantia emitido. Deseja entregar o equipamento mesmo assim?")) return;
                          if (balance > 0) {
                            onShowToast(!hasWarrantyInOrder ? "⚠️ Atenção: Pendência financeira detectada." : "💰 Pagamento pendente.");
                            setPaymentAmount(balance.toString());
                            setDiscount('0');
                            setOnSuccessStatus('Equipamento Retirado');
                            setIsPaymentModalOpen(true);
                            return;
                          }
                          updateOrderStatus(selectedOrder, 'Equipamento Retirado');
                          return;
                        }
                        updateOrderStatus(selectedOrder, newStatus);
                        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
                        if (newStatus === 'Reparo Concluído') {
                          if (window.confirm("Deseja criar um termo de garantia para esta OS?")) {
                            const fullCustomer = customers.find(c => c.id === selectedOrder.customerId);
                            if (onNavigateToGarantia) onNavigateToGarantia({ ...selectedOrder, status: newStatus, customer: fullCustomer });
                          }
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    >
                      {Object.keys(STATUS_CONFIG).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <CheckCircle2 size={14} className="pointer-events-none" />
                    <span className="text-[8px] font-black uppercase mt-0.5 pointer-events-none group-active:scale-95 transition-transform">Status</span>
                  </div>
                  {/* Botão Editar */}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(selectedOrder)}
                      className="flex-1 flex flex-col items-center justify-center h-10 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-400 active:text-white active:bg-zinc-800 transition-all"
                    >
                      <Pencil size={14} />
                      <span className="text-[8px] font-black uppercase mt-0.5">Editar</span>
                    </button>
                  )}

                  {/* Botão Docs */}
                  <button
                    onClick={() => handleViewDocs(selectedOrder)}
                    className="flex-1 flex flex-col items-center justify-center h-10 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-400 active:text-white active:bg-zinc-800 transition-all"
                  >
                    <FileText size={14} />
                    <span className="text-[8px] font-black uppercase mt-0.5">Docs</span>
                  </button>

                  {/* Botão WhatsApp */}
                  <button
                    onClick={() => {
                      const customer = customers.find(c => c.id === selectedOrder.customerId);
                      if (!customer?.whatsapp) { onShowToast('Cliente sem número de WhatsApp cadastrado'); return; }
                      const portalUrl = companySettings.publicSlug ? `${window.location.origin}/${companySettings.publicSlug}/${selectedOrder.id}` : `${window.location.origin}/os/${selectedOrder.id}`;
                      const template = osSettings.whatsappMessages?.['Entrada Registrada'] || `Olá, {cliente} 👋\n\nJá está disponível o acompanhamento da sua OS {os}.\n{link}\n\n{empresa}`;
                      const message = template.replace(/{cliente}/g, customer.name).replace(/{os}/g, selectedOrder.osNumber.toString().padStart(4, '0')).replace(/{link}/g, portalUrl).replace(/{empresa}/g, companySettings.name || 'Servyx');
                      let decodedPhone = customer.whatsapp.replace(/\D/g, '');
                      if (!decodedPhone.startsWith('55')) decodedPhone = `55${decodedPhone}`;
                      window.open(`https://api.whatsapp.com/send?phone=${decodedPhone}&text=${encodeURIComponent(message)}`, 'wa');
                    }}
                    className="flex-1 flex flex-col items-center justify-center h-10 bg-zinc-900 border border-zinc-800 rounded-sm text-[#25D366]/80 active:text-[#25D366] active:bg-zinc-800 transition-all"
                  >
                    <MessageCircle size={14} />
                    <span className="text-[8px] font-black uppercase mt-0.5">Whats</span>
                  </button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry Photos Viewer Modal */}
      <AnimatePresence>
        {isEntryPhotosModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEntryPhotosModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl h-[85vh] bg-[#141414] border border-zinc-800 rounded-lg overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-black/20">
                <div className="flex items-center gap-3">
                  <CameraIcon size={18} className="text-blue-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Fotos de Entrada</h3>
                  <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                    {selectedOrder.entryPhotos?.length || 0} fotos
                  </span>
                </div>
                <button 
                  onClick={() => setIsEntryPhotosModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedOrder.entryPhotos?.map((photo, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group relative aspect-square bg-zinc-900 rounded-md border border-zinc-800 overflow-hidden"
                    >
                      <img 
                        src={photo} 
                        alt={`Foto de Entrada ${idx + 1}`} 
                        className="w-full h-full object-contain bg-black/40 group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => window.open(photo, '_blank')}
                          className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-white/20 transition-all"
                        >
                          <ExternalLink size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isProductSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-sm w-full max-w-lg overflow-hidden shadow-2xl"
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
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
                            setSelectedProducts(prev => [...prev, { id: p.id, name: p.name, quantity: 1, price: p.price || 0 }]);
                          }
                          setIsProductSearchOpen(false);
                          setProductSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between p-3 bg-[#0A0A0A] hover:bg-zinc-900 border border-zinc-800 rounded-sm transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{p.name}</p>
                          <p className="text-xs text-zinc-500">Estoque: {p.stock} | {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0)}</p>
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
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-sm w-full max-w-md overflow-hidden shadow-2xl"
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
                <div className="bg-[#0A0A0A] p-4 rounded-md border border-zinc-800">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Resumo Financeiro</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-zinc-400">Original: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials?.totalValue || 0)}</p>
                      <p className="text-sm text-emerald-500">Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.financials?.amountPaid || 0)}</p>
                      {parseFloat(discount) > 0 && (
                        <p className="text-sm text-orange-500">Desconto: -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(discount))}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase font-bold">Saldo para Quitar</p>
                      <p className="text-xl font-black text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, (selectedOrder.financials?.totalValue || 0) - (selectedOrder.financials?.amountPaid || 0) - parseFloat(discount || '0')))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest pl-1">Conceder Desconto</label>
                  <div className="flex items-center gap-3 bg-[#0A0A0A] border border-orange-500/20 rounded-md px-4 py-3 focus-within:border-orange-500 transition-all group/disc shadow-inner">
                    <span className="text-xs font-black text-orange-500/40 group-focus-within/disc:text-orange-500 transition-colors">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={discount !== '0' ? formatInputOnChange(Math.round(parseFloat(discount) * 100).toString()) : ''}
                      onChange={e => setDiscount(parseCurrencyToNumber(e.target.value).toString())}
                      placeholder="0,00"
                      className="flex-1 bg-transparent border-none text-white text-base font-bold focus:ring-0 p-0 placeholder:text-zinc-800 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Valor do Pagamento</label>
                  <div className="flex items-center gap-3 bg-[#0A0A0A] border border-zinc-800 rounded-md px-4 py-4 focus-within:border-[#00E676] transition-all group/pay shadow-inner">
                    <span className="text-sm font-black text-zinc-600 group-focus-within/pay:text-[#00E676] transition-colors">R$</span>
                    <input
                      autoFocus
                      type="text"
                      inputMode="decimal"
                      value={paymentAmount ? formatInputOnChange(Math.round(parseFloat(paymentAmount) * 100).toString()) : ''}
                      onChange={e => setPaymentAmount(parseCurrencyToNumber(e.target.value).toString())}
                      placeholder="0,00"
                      className="flex-1 bg-transparent border-none text-white text-3xl font-black focus:ring-0 p-0 placeholder:text-zinc-800 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Link'] as const).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`flex items-center gap-2 px-3 py-3 rounded-sm border text-xs sm:text-sm font-medium transition-all ${
                          paymentMethod === method
                          ? 'bg-zinc-800 border-zinc-600 text-white shadow-inner'
                          : 'bg-[#0A0A0A] border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {method === 'Dinheiro' && <Banknote size={16} />}
                        {method === 'PIX' && <QrCode size={16} />}
                        {method === 'Débito' && <CreditCard size={16} />}
                        {method === 'Crédito' && <CreditCard size={16} />}
                        {method === 'Link' && <LinkIcon size={16} />}
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                  <button
                    disabled={isProcessing}
                    onClick={handleRegisterPayment}
                    className={`w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-md transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Confirmar Pagamento'
                    )}
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
        {whatsappModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-sm w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
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
                  className="w-full h-48 bg-[#0A0A0A] border border-zinc-800 rounded-sm p-4 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>
              <div className="p-6 border-t border-zinc-800 bg-[#0A0A0A]">
                <button
                  onClick={() => {
                    let decodedPhone = whatsappModal.customerPhone.replace(/\D/g, '');
                    if (!decodedPhone.startsWith('55')) decodedPhone = `55${decodedPhone}`;
                    const whatsappUrl = `https://api.whatsapp.com/send?phone=${decodedPhone}&text=${encodeURIComponent(whatsappModal.message)}`;
                    const link = document.createElement('a');
                    link.href = whatsappUrl;
                    link.target = 'wa';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setWhatsappModal({ isOpen: false, message: '', customerPhone: '' });
                  }}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-md transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  Enviar via WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && previewOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md no-print"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-800 rounded-sm w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] no-print"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText size={24} className="text-[#00E676]" />
                    Visualização do Documento
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    OS {previewOrder.osNumber?.toString().padStart(4, '0') || '---'} | {customers.find(c => c.id === previewOrder.customerId)?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedOrder(previewOrder);
                      if (window.innerWidth < 640) {
                        handleSharePDF();
                      } else {
                        triggerPrint('a4');
                      }
                    }}
                    className="p-2.5 bg-[#00E676] hover:bg-[#00C853] text-black rounded-sm transition-all border border-emerald-600 flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-lg shadow-[#00E676]/20 active:scale-95"
                  >
                    {window.innerWidth < 640 ? <FileText size={18} /> : <Printer size={18} />}
                    {window.innerWidth < 640 ? "Visualizar PDF" : "Imprimir Documento"}
                  </button>
                  <button onClick={() => setIsPreviewModalOpen(false)} className="p-2.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 border border-zinc-800">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-900 flex flex-col items-center relative custom-scrollbar p-0 sm:p-8">
                 <div className="w-full max-w-[210mm] shadow-2xl rounded-sm overflow-hidden bg-white mb-10">
                    <OrderPrintTemplate
                       order={previewOrder}
                       customer={customers.find(c => c.id === previewOrder.customerId)}
                       companySettings={companySettings}
                       osSettings={osSettings}
                       isPreview={true}
                     />
                 </div>
              </div>

              <div className="p-4 bg-[#0A0A0A] border-t border-zinc-800 flex justify-center">
                 <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-2">
                   <Lock size={12} /> Documento gerado pelo sistema Servyx em {new Date().toLocaleDateString('pt-BR')}
                 </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HIDDEN PRINT CONTAINERS (Moved to Portal for reliable printing) */}
      {selectedOrder && typeof document !== 'undefined' && createPortal(
        <>
          <div className="print-laudo-container" key={`laudo-${selectedOrder.id}`}>
            <TechnicalReportPrintTemplate
              order={selectedOrder}
              customer={customers.find(c => c.id === selectedOrder.customerId)}
              companySettings={companySettings}
            />
          </div>
          <div className="print-a4-container" key={`a4-${selectedOrder.id}`}>
            <OrderPrintTemplate
              order={selectedOrder}
              customer={customers.find(c => c.id === selectedOrder.customerId)}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>
          <div className="print-thermal-container" key={`thermal-${selectedOrder.id}`}>
            <ThermalReceiptTemplate
              order={selectedOrder}
              customer={customers.find(c => c.id === selectedOrder.customerId)}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>
          <div className="print-warranty-container" key={`warranty-${selectedOrder.id}`}>
            <WarrantyPrintTemplate
              order={selectedOrder}
              customer={customers.find(c => c.id === selectedOrder.customerId)}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>
          <div className="warranty-thermal-container" key={`warranty-thermal-${selectedOrder.id}`}>
            <WarrantyThermalTemplate
              order={selectedOrder}
              customer={customers.find(c => c.id === selectedOrder.customerId)}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>
        </>,
        typeof document !== 'undefined' ? (document.getElementById('print-portal-root') || document.body) : null as any
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

      {/* Document Hub Modal */}
      <AnimatePresence>
        {isDocHubOpen && selectedOrder && (() => {
          const hasBudget = !!(selectedOrder.budget && (selectedOrder.budget.status || selectedOrder.budget.totalValue > 0 || (selectedOrder.budget.items && selectedOrder.budget.items.length > 0)));
          const hasReport = !!(selectedOrder.technicalReport && (selectedOrder.technicalReport.diagnosis || selectedOrder.technicalReport.conclusion));
          const hasWarranty = !!(selectedOrder.completionData?.warrantyDays || selectedOrder.completionData?.hasWarranty);

          const docs = [
            {
              key: 'os',
              label: 'Ordem de Serviço',
              description: 'Documento oficial de entrada',
              icon: FileText,
              color: 'text-zinc-200',
              accent: '#00E676',
              bg: 'bg-zinc-800',
              action: () => {
                setIsDocHubOpen(false);
                if (selectedOrder.scannedOsUrl) {
                  window.open(selectedOrder.scannedOsUrl, '_blank');
                } else {
                  setPreviewOrder(selectedOrder);
                  setIsPreviewModalOpen(true);
                }
              }
            },
            hasBudget && {
              key: 'budget',
              label: 'Proposta de Orçamento',
              description: selectedOrder.budget?.status === 'Aprovado' ? 'Aprovado pelo cliente ✓' : selectedOrder.budget?.status === 'Recusado' ? 'Recusado pelo cliente' : `Status: ${selectedOrder.budget?.status || 'Em elaboração'}`,
              icon: Calculator,
              color: 'text-emerald-400',
              accent: '#10b981',
              bg: 'bg-emerald-500/10',
              action: () => {
                setIsDocHubOpen(false);
                setIsBudgetPreviewOpen(true);
              }
            },
            hasReport && {
              key: 'report',
              label: 'Laudo Técnico',
              description: 'Diagnóstico detalhado do equipamento',
              icon: FileText,
              color: 'text-blue-400',
              accent: '#3b82f6',
              bg: 'bg-blue-500/10',
              action: () => {
                setIsDocHubOpen(false);
                setIsReportPreviewOpen(true);
              }
            },
            hasWarranty && {
              key: 'warranty',
              label: 'Certificado de Garantia',
              description: `${selectedOrder.completionData?.warrantyDays || 90} dias de garantia`,
              icon: ShieldCheck,
              color: 'text-purple-400',
              accent: '#a855f7',
              bg: 'bg-purple-500/10',
              action: () => {
                setIsDocHubOpen(false);
                setIsWarrantyPreviewOpen(true);
              }
            },
          ].filter(Boolean) as any[];

          return (
            <motion.div
              key="dochub-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm no-print"
              onClick={() => setIsDocHubOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-zinc-800/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-wide">Documentos da OS</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                      OS Nº {selectedOrder.osNumber?.toString().padStart(4, '0') || '---'} · {docs.length} {docs.length === 1 ? 'documento' : 'documentos'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDocHubOpen(false)}
                    className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Doc List */}
                <div className="p-4 space-y-2">
                  {docs.map((doc) => {
                    const Icon = doc.icon;
                    return (
                      <button
                        key={doc.key}
                        onClick={doc.action}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] transition-all border border-zinc-800/50 group text-left"
                      >
                        <div className={`w-11 h-11 rounded-xl ${doc.bg} flex items-center justify-center shrink-0`}>
                          <Icon size={20} className={doc.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-zinc-100">{doc.label}</p>
                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider truncate mt-0.5">{doc.description}</p>
                        </div>
                        <ChevronDown size={16} className={`${doc.color} opacity-60 shrink-0 -rotate-90 group-hover:translate-x-0.5 transition-transform`} />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Warranty Preview Modal */}
      <AnimatePresence>
        {isWarrantyPreviewOpen && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md no-print"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white border border-zinc-800 rounded-sm w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[90vh] no-print"
            >
              <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white text-slate-900">
                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[#2B323D]" />
                  Visualização da Garantia
                </h2>
                <button onClick={() => setIsWarrantyPreviewOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 flex flex-col items-center relative custom-scrollbar p-0 sm:p-8">
                <div className="w-full max-w-[210mm] shadow-2xl rounded-sm overflow-hidden bg-white mb-10">
                  <WarrantyPrintTemplate
                    order={selectedOrder}
                    customer={customers.find(c => c.id === selectedOrder.customerId)}
                    companySettings={companySettings}
                    osSettings={osSettings}
                    isPreview={true}
                  />
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-zinc-200 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => triggerPrint('warranty')}
                  className="w-full py-4 bg-[#2B323D] hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <FileText size={20} />
                  Imprimir A4
                </button>
                <button
                  onClick={async () => {
                    const html2pdf = (await import('html2pdf.js')).default;
                    const element = document.querySelector('.print-warranty-content');
                    if (!element) return;
                    
                    // Temporarily remove scaling for PDF generation
                    const originalTransform = (element.parentElement as HTMLElement).style.transform;
                    (element.parentElement as HTMLElement).style.transform = 'none';
                    
                    const opt = {
                      margin: 0,
                      filename: `garantia-os-${selectedOrder.osNumber.toString().padStart(4, '0')}.pdf`,
                      image: { type: 'jpeg', quality: 0.95 },
                      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };
                    
                    await html2pdf().set(opt).from(element).save();
                    
                    // Restore scaling
                    (element.parentElement as HTMLElement).style.transform = originalTransform;
                  }}
                  className="w-full py-4 bg-red-500 hover:bg-red-400 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  Exportar PDF
                </button>
                <button
                  onClick={() => triggerPrint('warranty-thermal')}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Imprimir Cupom
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Budget Preview Modal */}
      <AnimatePresence>
        {isBudgetPreviewOpen && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md no-print"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-700 w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl relative no-print overflow-hidden rounded-sm"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-emerald-500/10 flex items-center justify-center">
                    <Calculator size={20} className="text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Proposta de Orçamento</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">OS {selectedOrder.osNumber.toString().padStart(4, '0')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBudgetPreviewOpen(false)} 
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 border border-zinc-800"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-950/50 flex flex-col items-center relative custom-scrollbar p-0 sm:p-8">
                <div className="w-[96%] sm:w-full max-w-3xl shadow-2xl rounded-sm overflow-hidden bg-white mb-10">
                  <BudgetDocumentView
                    order={selectedOrder}
                    customer={customers.find(c => c.id === selectedOrder.customerId)}
                    companySettings={companySettings}
                    onApprove={async () => {}}
                    onReject={async () => {}}
                    isSubmitting={false}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-[#0A0A0A] border-t border-zinc-800 flex justify-center">
                 <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-2">
                   <Lock size={12} /> Versão de visualização interna do orçamento
                 </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Report Preview Modal */}
      <AnimatePresence>
        {isReportPreviewOpen && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md no-print"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] border border-zinc-700 w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl relative no-print overflow-hidden rounded-sm"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-blue-500/10 flex items-center justify-center">
                    <FileText size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Laudo Técnico</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">OS {selectedOrder.osNumber.toString().padStart(4, '0')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReportPreviewOpen(false)} 
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 border border-zinc-800"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-950/50 flex flex-col items-center relative custom-scrollbar p-0 sm:p-8">
                <div className="w-full max-w-[210mm] shadow-2xl rounded-sm overflow-hidden bg-white mb-10">
                  <TechnicalReportPrintTemplate
                    order={selectedOrder}
                    customer={customers.find(c => c.id === selectedOrder.customerId)}
                    companySettings={companySettings}
                    isPreview={true}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-[#0A0A0A] border-t border-zinc-800 flex justify-center">
                 <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-2">
                   <Lock size={12} /> Versão de visualização interna do laudo técnico
                 </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Quick Status Picker Modal (Mobile) */}
      <AnimatePresence>
        {orderToQuickStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm no-print"
            onClick={() => setOrderToQuickStatus(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#141414] border-t sm:border border-zinc-800 w-full max-w-lg rounded-t-xl sm:rounded-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Alterar Status</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">OS {orderToQuickStatus.osNumber.toString().padStart(4, '0')} - {customers.find(c => c.id === orderToQuickStatus.customerId)?.name}</p>
                </div>
                <button onClick={() => setOrderToQuickStatus(null)} className="p-2 text-zinc-500 hover:text-white bg-zinc-800/50 rounded-sm">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 gap-1">
                {Object.keys(STATUS_CONFIG).map(status => {
                  const config = STATUS_CONFIG[status as OrderStatus];
                  const Icon = config.icon;
                  const isCurrent = orderToQuickStatus.status === status;
                  
                  return (
                    <button
                      key={`quick-status-${status}`}
                      onClick={() => {
                        const newStatus = status as OrderStatus;
                        if (newStatus === 'Equipamento Retirado') {
                          const balance = (orderToQuickStatus.financials?.totalValue || 0) - (orderToQuickStatus.financials?.amountPaid || 0);
                          const hasWarrantyInOrder = orderToQuickStatus.completionData?.warrantyDays || orderToQuickStatus.completionData?.hasWarranty;
                          if (!hasWarrantyInOrder && !confirm("⚠️ Esta OS ainda não possui Termo de Garantia emitido. Deseja entregar o equipamento mesmo assim?")) return;
                          if (balance > 0) {
                            onShowToast(!hasWarrantyInOrder ? "⚠️ Atenção: Pendência financeira detectada." : "💰 Pagamento pendente.");
                            setPaymentAmount(balance.toString());
                            setDiscount('0');
                            setOnSuccessStatus('Equipamento Retirado');
                            setSelectedOrder(orderToQuickStatus);
                            setIsPaymentModalOpen(true);
                            setOrderToQuickStatus(null);
                            return;
                          }
                          updateOrderStatus(orderToQuickStatus, 'Equipamento Retirado');
                        } else {
                          updateOrderStatus(orderToQuickStatus, newStatus);
                          if (newStatus === 'Reparo Concluído') {
                            if (window.confirm("Deseja criar um termo de garantia para esta OS?")) {
                              const fullCustomer = customers.find(c => c.id === orderToQuickStatus.customerId);
                              if (onNavigateToGarantia) onNavigateToGarantia({ ...orderToQuickStatus, status: newStatus, customer: fullCustomer });
                            }
                          }
                        }
                        setOrderToQuickStatus(null);
                      }}
                      className={`flex items-center gap-4 p-4 rounded-sm transition-all border ${
                        isCurrent 
                        ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]' 
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <div className={`p-2 rounded-sm ${config.bg} ${config.color}`}>
                        <Icon size={20} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">{status}</span>
                      {isCurrent && <Check className="ml-auto" size={16} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

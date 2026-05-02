import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  ArrowLeft, Search, Plus, User, Smartphone, 
  CheckCircle2, AlertCircle, AlertTriangle, Save, Printer, MessageCircle,
  Check, X, Banknote, FileText, PenTool, Grid, Eye, Trash2, Camera, UploadCloud, Loader2, ShieldCheck, Mail, Pencil,
  Shield, Hash, Key, Lock, Home, ChevronLeft
} from 'lucide-react';
import { Customer, DeviceType } from './ClientesModule';
import { Transaction } from './CaixaModule';
import PatternLock from './PatternLock';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../supabase';
import OrderPrintTemplate from './OrderPrintTemplate';
import ThermalReceiptTemplate from './ThermalReceiptTemplate';
import WarrantyPrintTemplate from './WarrantyPrintTemplate';
import WarrantyThermalTemplate from './WarrantyThermalTemplate';
import VisualController from './VisualController';
import { Order, OrderStatus, OrderPriority, OrderCompletionData } from '../types';
import { formatPhone } from '../utils/formatPhone';
import { formatDocument } from '../utils/formatDocument';
import { applyMaskWithCursor } from '../utils/maskUtils';
import { capFirst } from '../utils/capFirst';
import CountryCodePicker, { countries, Country } from './CountryCodePicker';
import { jsPDF } from 'jspdf';


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
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
}

// Signature Pad Component
const SignaturePad = ({ title, onSave, onClear, autoOpen }: { title: string, onSave: (dataUrl: string) => void, onClear: () => void, autoOpen?: boolean }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isOpen, setIsOpen] = useState(autoOpen || false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isOrientationPromptDismissed, setIsOrientationPromptDismissed] = useState(false);

  // Re-open if autoOpen changes
  useEffect(() => {
    if (autoOpen) setIsOpen(true);
  }, [autoOpen]);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsConfirmed(false);
    setHasDrawing(false);
    setPreviewUrl(null);
    onClear();
  };

  const confirm = () => {
    // Usa hasDrawing como fallback pois isEmpty() pode retornar true
    // incorretamente após redimensionamento externo da canvas (ex: rotação)
    const canvasEmpty = sigCanvas.current?.isEmpty() ?? true;
    if (canvasEmpty && !hasDrawing) {
      return;
    }
    const dataUrl = sigCanvas.current?.getCanvas().toDataURL('image/png');
    if (dataUrl) {
      setIsConfirmed(true);
      setPreviewUrl(dataUrl);
      onSave(dataUrl);
      setIsOpen(false);
    }
  };

  // Re-size signature pad on orientation change
  useEffect(() => {
    const doResize = () => {
      if (sigCanvas.current) {
        const canvas = sigCanvas.current.getCanvas();
        if (canvas) {
          if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;

          // Salva assinatura atual (pontos) antes de redimensionar para poder escalar
          const data = sigCanvas.current.toData();
          
          // Largura lógica antiga (sem o ratio)
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          const oldWidth = canvas.width / ratio;
          const oldHeight = canvas.height / ratio;

          // Redimensiona o canvas para as novas dimensões do offset
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.scale(ratio, ratio);

          // Limpa internamente para resetar o estado da lib
          sigCanvas.current.clear();

          // Se havia pontos, restaura-os aplicando o ajuste de escala proporcional
          if (data && data.length > 0) {
            const newWidth = canvas.offsetWidth;
            const newHeight = canvas.offsetHeight;
            
            // Se as dimensões mudaram, escalamos os pontos
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
              sigCanvas.current.fromData(scaledData as any);
            } else {
              sigCanvas.current.fromData(data as any);
            }
            setHasDrawing(true);
          }
        }
      }
    };

    const handleOrientationChange = () => {
      // O browser precisa de tempo para atualizar o layout após rotação
      setTimeout(doResize, 300);
    };

    const handleResize = () => {
      setTimeout(doResize, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    if (isOpen) {
      setTimeout(doResize, 150);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isOpen]);

  return (
    <div className="space-y-4">
      <div 
        onClick={() => setIsOpen(true)}
        className={`group relative overflow-hidden h-16 rounded-md border transition-all cursor-pointer flex items-center justify-between px-6 ${
          isConfirmed 
            ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' 
            : 'bg-zinc-800/20 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded-sm flex items-center justify-center transition-colors ${isConfirmed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>
             {isConfirmed ? <CheckCircle2 size={18} /> : <PenTool size={18} />}
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-0.5">{title}</h4>
            <p className={`text-xs font-bold transition-colors ${isConfirmed ? 'text-emerald-400/80' : 'text-zinc-400 group-hover:text-white'}`}>
              {isConfirmed ? 'Assinatura Registrada' : 'Toque para Assinar'}
            </p>
          </div>
        </div>

        {isConfirmed && previewUrl && (
          <div className="h-10 w-24 bg-white/5 rounded-sm overflow-hidden border border-white/5 p-1 flex items-center justify-center grayscale opacity-60">
             <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain invert" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/98 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 w-full sm:max-w-4xl overflow-hidden shadow-2xl flex flex-col h-full sm:h-auto sm:rounded-sm relative"
            >
              <div className="p-4 sm:p-8 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-sm bg-[#00E676]/10 text-[#00E676]">
                      <PenTool size={18} />
                   </div>
                   <div>
                      <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-tighter italic">
                        {title}
                      </h3>
                      <p className="sm:hidden text-[8px] font-bold text-[#00E676] uppercase tracking-widest mt-0.5 animate-pulse portrait:block hidden">Gire o celular para assinar melhor</p>
                      <p className="sm:hidden text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 landscape:block hidden">Modo Horizontal Ativo</p>
                   </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all flex items-center justify-center active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 p-4 sm:p-8 flex flex-col gap-4 sm:gap-6 overflow-hidden">
                <div className="flex-1 bg-white rounded-sm overflow-hidden shadow-inner relative ring-1 ring-zinc-200 h-64 sm:h-80 landscape:h-[50vh]">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    penColor="black"
                    onBegin={() => setHasDrawing(true)}
                    onEnd={() => {
                      if (sigCanvas.current) {
                        const empty = sigCanvas.current.isEmpty();
                        setHasDrawing(!empty);
                      }
                    }}
                    canvasProps={{
                      className: "w-full h-full cursor-crosshair",
                      style: { width: '100%', height: '100%' }
                    }}
                  />
                  {!hasDrawing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                      <PenTool size={48} className="text-black mb-2" />
                      <p className="text-black font-black uppercase tracking-widest text-[10px]">Assine aqui</p>
                    </div>
                  )}
                  {/* Orientation Warning Overlay for Portrait */}
                  <div className={`absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center sm:hidden portrait:flex hidden pointer-events-auto ${isOrientationPromptDismissed ? '!hidden' : ''}`}>
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
                      onClick={() => setIsOrientationPromptDismissed(true)}
                      className="mt-6 px-6 py-2 border border-zinc-700 rounded-sm text-zinc-500 text-[9px] font-black uppercase tracking-widest"
                    >
                      Continuar em Vertical
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pb-safe">
                  <button
                    onClick={clear}
                    className="flex-1 h-12 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px] rounded-sm border border-zinc-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Limpar
                  </button>
                  <button
                    onClick={confirm}
                    className="flex-[2] h-12 bg-[#00E676] hover:bg-[#00C853] text-black font-black uppercase tracking-widest text-[9px] sm:text-[10px] rounded-sm transition-all shadow-lg shadow-[#00E676]/20 flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Salvar Assinatura
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Camera Capture Component
const CameraCapture = ({ isOpen, onClose, onCapture }: { isOpen: boolean, onClose: () => void, onCapture: (dataUrl: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    try {
      // First try to get media devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso à câmera.");
      }

      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError(err.message || "Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="text-[#00E676]" size={20} />
            Capturar Foto
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-sm transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {error ? (
            <div className="p-8 text-center space-y-4">
               <AlertTriangle size={48} className="mx-auto text-amber-500" />
               <p className="text-zinc-400 text-sm whitespace-pre-wrap">{error}</p>
               <button onClick={startCamera} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-sm text-xs font-bold uppercase transition-all">Tentar Novamente</button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-8 flex justify-center">
                <button 
                  onClick={capture}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group active:scale-95 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                >
                  <div className="w-16 h-16 rounded-full bg-white group-hover:bg-zinc-200 transition-colors" />
                </button>
              </div>
              <div className="absolute top-4 left-4">
                 <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">Ao Vivo</div>
              </div>
            </>
          )}
        </div>
        
        <div className="p-6 bg-zinc-900/50 flex justify-center">
           <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Alinhe o aparelho e capture a imagem</p>
        </div>
      </div>
    </div>
  );
};

// Document Scanner Component
const DocumentScanner = ({ isOpen, onClose, onCapture }: { isOpen: boolean, onClose: () => void, onCapture: (dataUrl: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso à câmera.");
      }

      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }, 
        audio: false 
      });
      
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError(err.message || "Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureAndProcess = async () => {
    if (videoRef.current && canvasRef.current) {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Appy "Scanner" filters
        ctx.filter = 'grayscale(1) contrast(1.5) brightness(1.1)';
        ctx.drawImage(video, 0, 0);
        
        // Minor refinement: reset filter and redraw with some edge enhancement if needed
        // For now, standard filter is enough for a clean look
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Create PDF
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'l' : 'p',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height);
        const pdfBase64 = pdf.output('datauristring');
        
        onCapture(pdfBase64);
        setIsProcessing(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/98 backdrop-blur-2xl">
      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="p-8 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase italic tracking-tighter">
              <Camera className="text-[#00E676]" size={24} />
              Scanner de Documento
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Digitalize a OS assinada manualmente</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all flex items-center justify-center active:scale-95">
            <X size={24} />
          </button>
        </div>

        <div className="relative aspect-[3/4] max-h-[60vh] bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-12 text-center space-y-6">
               <AlertTriangle size={64} className="mx-auto text-amber-500" />
               <p className="text-zinc-400 text-sm font-medium leading-relaxed">{error}</p>
               <button onClick={startCamera} className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-[10px] font-black uppercase tracking-widest transition-all">Tentar Novamente</button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-contain grayscale brightness-110 contrast-125"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Overlay focus area */}
              <div className="absolute inset-8 border-2 border-white/20 rounded-md pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#00E676] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#00E676] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#00E676] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#00E676] rounded-br-lg" />
              </div>

              <div className="absolute inset-x-0 bottom-10 flex justify-center">
                <button 
                  onClick={captureAndProcess}
                  disabled={isProcessing}
                  className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center group active:scale-95 transition-all shadow-[0_0_40px_rgba(0,0,0,0.5)] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 size={32} className="text-white animate-spin" />
                  ) : (
                    <div className="w-18 h-18 rounded-full bg-white group-hover:bg-zinc-200 transition-colors shadow-inner" />
                  )}
                </button>
              </div>
              <div className="absolute top-6 left-6">
                 <div className="px-4 py-1.5 bg-black/60 backdrop-blur-xl rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/10 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                   Modo Scanner
                 </div>
              </div>
            </>
          )}
        </div>
        
        <div className="p-8 bg-zinc-900/40 border-t border-zinc-800/50 flex justify-center">
           <div className="flex items-center gap-4 text-zinc-500">
             <FileText size={20} className="text-[#00E676]" />
             <p className="text-[10px] font-bold uppercase tracking-widest">A imagem será salva em formato PDF de alta qualidade</p>
           </div>
        </div>
      </div>
    </div>
  );
};


// OS Success Animation Modal
const SuccessAnimationModal = ({ osNumber, isOpen, onClose }: { osNumber: string, isOpen: boolean, onClose: () => void }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex flex-col items-center max-w-sm w-full"
          >
            {/* Rexona-style Checkmark Animation */}
            <div className="w-40 h-40 relative flex items-center justify-center mb-8">
              {/* Spinning Glow Ring */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-full border-4 border-[#00E676]/20 shadow-[0_0_50px_rgba(0,230,118,0.2)]"
              />
              
              <svg viewBox="0 0 100 100" className="w-24 h-24 filter drop-shadow-[0_0_10px_rgba(0,230,118,0.5)]">
                <motion.path
                  d="M 15 50 C 25 60 35 70 45 80 C 55 60 70 40 90 15"
                  fill="transparent"
                  strokeWidth="10"
                  stroke="#00E676"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    ease: [0.6, 0.05, -0.01, 0.9],
                    delay: 0.2
                  }}
                />
              </svg>
              
              {/* Particle Burst Effect */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="absolute inset-0 border-2 border-[#00E676] rounded-full"
              />
            </div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center space-y-3"
            >
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                OS N° {osNumber}
              </h2>
              <p className="text-[#00E676] font-black text-xs uppercase tracking-[0.4em] leading-relaxed">
                CRIADA E SALVA COM SUCESSO
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  initialOrder,
  onLogActivity
}: OrdemServicoModuleProps) {
  const [step, setStep] = useState<'CLIENT' | 'DETAILS'>('CLIENT');
  const [activeTab, setActiveTab] = useState<'EQUIPMENT' | 'CHECKLIST' | 'SERVICE' | 'FINANCIAL' | 'SIGNATURE'>('EQUIPMENT');
  // Client Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  
  const [whatsappCountry, setWhatsappCountry] = useState<Country>(countries[0]);
  const [phoneCountry, setPhoneCountry] = useState<Country>(countries[0]);

  // New Customer Form State (Full)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    birthDate: '',
    phone: '',
    whatsapp: '',
    email: '',
    document: '',
    notes: '',
    customer_origin: '',
    displayBirthDate: '',
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
  const [checklistNotPossible, setChecklistNotPossible] = useState(false);
  const [entryPhotos, setEntryPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [checklistNotes, setChecklistNotes] = useState('');
  const [defect, setDefect] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [service, setService] = useState('');
  const [deliveryForecast, setDeliveryForecast] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('Média');
  const [showVisualChecklist, setShowVisualChecklist] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanReminderOpen, setIsScanReminderOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'a4' | 'thermal' | 'warranty' | 'warranty-thermal' | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Monitor scroll for header styling if needed, otherwise simplified
  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Scroll monitoring for actions is no longer needed as they are in the header
  };
  
  const [financials, setFinancials] = useState<Order['financials']>({
    totalValue: 0,
    paymentType: '',
    paymentStatus: 'Pendente',
    amountPaid: 0
  });

  const [signatureMode, setSignatureMode] = useState<'digital' | 'manual' | 'remote'>(
    initialOrder?.signatures?.mode === 'manual' || initialOrder?.signatures?.isManual ? 'manual' :
    initialOrder?.signatures?.mode === 'remote' ? 'remote' : 'digital'
  );
  
  const [signatures, setSignatures] = useState<Order['signatures'] & { isManual?: boolean, mode?: 'digital' | 'manual' | 'remote' }>({
    technician: initialOrder?.signatures?.technician || null,
    client: initialOrder?.signatures?.client || null,
    isManual: initialOrder?.signatures?.isManual || false,
    mode: initialOrder?.signatures?.mode || (initialOrder?.signatures?.isManual ? 'manual' : 'digital')
  });

  const [availableServices, setAvailableServices] = useState<{ id: string, name: string, default_value: number, description: string, category: string }[]>([]);

  const [currentCashSession, setCurrentCashSession] = useState<{ id: string; [key: string]: unknown } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [localOrder, setLocalOrder] = useState<Order | null>(initialOrder || null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOsNumber, setSuccessOsNumber] = useState('');
  
  const scrollToTop = () => {
    // Blur any active element (like the confirm button) that might be forcing scroll position
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Reset internal container
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    // Reset global window/body just in case
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Reset scroll to top when changing steps, tabs, or selected customer
  useLayoutEffect(() => {
    scrollToTop();
    
    // Multiple attempts to handle different layout/animation durations
    const t0 = setTimeout(scrollToTop, 0); // Immediate next frame
    const t1 = setTimeout(scrollToTop, 50);
    const t2 = setTimeout(scrollToTop, 200);
    const t3 = setTimeout(scrollToTop, 500); // Late attempt for slow renders

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [step, activeTab, selectedCustomer?.id]);

  // Listen for current cash session
  useEffect(() => {
    const fetchSession = async () => {
      const { data: openSessions } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1);
      
      if (openSessions && openSessions.length > 0) {
        setCurrentCashSession(openSessions[0]);
      } else {
        setCurrentCashSession(null);
      }
    };

    fetchSession();

    // Fetch available services
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, default_value, description, category')
        .eq('company_id', profile.company_id)
        .order('name');
      
      if (error) {
        console.error('SUPABASE ERROR (OS Fetch Services):', error.message, error.details, error.hint);
      }
      if (data) {
        setAvailableServices(data.map((s: any) => ({ ...s, category: s.category || 'Outro' })));
      }
    };
    fetchServices();
  }, []);

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `entry-photos/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);
          
        newUrls.push(publicUrl);
      }
      
      setEntryPhotos([...entryPhotos, ...newUrls]);
    } catch (error: any) {
      console.error('Upload error:', error);
      onShowToast(`Erro ao enviar fotos: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCapturePhoto = async (dataUrl: string) => {
    setIsUploading(true);
    setIsCameraModalOpen(false);
    try {
      // Convert dataUrl to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      const filePath = `entry-photos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, blob);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);
        
      setEntryPhotos([...entryPhotos, publicUrl]);
      onShowToast('Foto capturada e salva com sucesso!');
    } catch (error: any) {
      console.error('Capture upload error:', error);
      onShowToast(`Erro ao salvar foto capturada: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCaptureScan = async (dataUrl: string) => {
    setIsUploading(true);
    setIsScannerOpen(false);
    try {
      // Robust conversion from dataUrl to blob
      let blob: Blob;
      let contentType = 'application/pdf';
      try {
        const res = await fetch(dataUrl);
        blob = await res.blob();
      } catch (e) {
        // Fallback if fetch fails (common with large data URIs in some environments)
        const arr = dataUrl.split(',');
        contentType = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], {type: contentType});
      }

      const fileName = `scanned-os-${Date.now()}.${contentType.includes('pdf') ? 'pdf' : 'jpg'}`;
      const filePath = `documents/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos') // Reusing photos bucket for simplicity
        .upload(filePath, blob, { contentType });
        
      if (uploadError) {
        throw new Error(uploadError.message || JSON.stringify(uploadError));
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);
        
      // If we are currently editing an OS, update it
      if (localOrder) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ scanned_os_url: publicUrl })
          .eq('id', localOrder.id);
          
        if (updateError) throw new Error(updateError.message || JSON.stringify(updateError));
        
        const updatedOrder = { ...localOrder, scannedOsUrl: publicUrl };
        setLocalOrder(updatedOrder);
        setOrders(prev => prev.map(o => o.id === localOrder!.id ? updatedOrder : o));
      }
      
      onShowToast('OS digitalizada com sucesso!');
    } catch (error: any) {
      const errorMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      console.error('Scan upload error:', error, errorMsg);
      onShowToast(`Erro ao salvar OS digitalizada: ${errorMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);

  // Populate state if editing
  useEffect(() => {
    if (initialOrder) {
      setLocalOrder(initialOrder);
      setStep('DETAILS');
      const customer = customers.find(c => c.id === initialOrder.customerId);
      if (customer) setSelectedCustomer(customer);
      
      setEquipment(initialOrder.equipment);
      setChecklist(initialOrder.checklist);
      setChecklistNotPossible(initialOrder.checklistNotPossible || (initialOrder as any).checklist_not_possible || false);
      setEntryPhotos(initialOrder.entryPhotos || []);
      setChecklistNotes(initialOrder.checklistNotes || '');
      setDefect(initialOrder.defect);
      setTechnicianNotes(initialOrder.technicianNotes || '');
      setService(initialOrder.service || '');
      setPriority(initialOrder.priority);
      setFinancials(initialOrder.financials);
      setSignatures(initialOrder.signatures);
      setShowVisualChecklist(initialOrder.isVisualChecklist || false);
      setDeliveryForecast(initialOrder.deliveryForecast || '');
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

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    
    let extractedWhatsapp = customer.whatsapp;
    if (customer.whatsapp?.startsWith('+')) {
      const dial = customer.whatsapp.split(' ')[0];
      const country = countries.find(c => c.dialCode === dial);
      if (country) {
        setWhatsappCountry(country);
        extractedWhatsapp = customer.whatsapp.replace(dial, '').trim();
      }
    }

    let extractedPhone = customer.phone;
    if (customer.phone?.startsWith('+')) {
      const dial = customer.phone.split(' ')[0];
      const country = countries.find(c => c.dialCode === dial);
      if (country) {
        setPhoneCountry(country);
        extractedPhone = customer.phone.replace(dial, '').trim();
      }
    }

    setNewCustomer({
      name: customer.name,
      phone: extractedPhone,
      whatsapp: extractedWhatsapp,
      email: customer.email,
      document: customer.document,
      address: customer.address || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
      notes: customer.notes,
      birthDate: customer.birthDate || '',
      displayBirthDate: customer.birthDate ? customer.birthDate.split('-').reverse().join('/') : '',
      customer_origin: customer.customer_origin || ''
    });
    setIsCreatingCustomer(true);
    setStep('CLIENT');
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) {
      onShowToast('Nome do cliente é obrigatório');
      return;
    }
    
    setIsSavingCustomer(true);
    try {
      const now = new Date().toISOString();

      const finalWhatsapp = newCustomer.whatsapp ? `${whatsappCountry.dialCode} ${newCustomer.whatsapp}` : '';
      const finalPhone = newCustomer.phone ? `${phoneCountry.dialCode} ${newCustomer.phone}` : '';

      if (editingCustomerId) {
        const customerToUpdate: any = {
          name: newCustomer.name,
          phone: finalPhone,
          whatsapp: finalWhatsapp,
          email: newCustomer.email,
          document: newCustomer.document,
          address: newCustomer.address,
          notes: newCustomer.notes,
          customer_origin: newCustomer.customer_origin || null,
          updated_at: now,
          birth_date: null
        };
        
        if (newCustomer.displayBirthDate) {
          const parts = newCustomer.displayBirthDate.split('/');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            if (d.length === 2 && m.length === 2 && y.length === 4) {
              customerToUpdate.birth_date = `${y}-${m}-${d}`;
            }
          }
        }

        const { error } = await supabase.from('customers').update(customerToUpdate).eq('id', editingCustomerId).eq('company_id', profile.company_id);
        if (error) throw error;

        const updatedCustomerList = customers.map(c => c.id === editingCustomerId ? { 
          ...c, 
          ...newCustomer, 
          whatsapp: finalWhatsapp,
          phone: finalPhone,
          birthDate: customerToUpdate.birth_date || ''
        } as Customer : c);
        
        setCustomers(updatedCustomerList);
        setSelectedCustomer(updatedCustomerList.find(c => c.id === editingCustomerId) || null);
        setIsCreatingCustomer(false);
        setEditingCustomerId(null);
        setNewCustomer({
          name: '', phone: '', whatsapp: '', email: '', document: '',
          address: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
          notes: '', birthDate: '', displayBirthDate: '', customer_origin: ''
        });
        setStep('DETAILS');
        onShowToast('Cliente atualizado com sucesso');
      } else {
        const customerId = crypto.randomUUID();
        const finalWhatsapp = newCustomer.whatsapp ? `${whatsappCountry.dialCode} ${newCustomer.whatsapp}` : '';
        const finalPhone = newCustomer.phone ? `${phoneCountry.dialCode} ${newCustomer.phone}` : '';

        const customerToAdd: any = {
          id: customerId,
          name: newCustomer.name,
          phone: finalPhone,
          whatsapp: finalWhatsapp,
          email: newCustomer.email,
          document: newCustomer.document,
          address: newCustomer.address,
          notes: newCustomer.notes,
          customer_origin: newCustomer.customer_origin || null,
          devices: [],
          created_at: now,
          updated_at: now,
          company_id: profile.company_id,
          birth_date: null
        };

        if (newCustomer.displayBirthDate) {
          const parts = newCustomer.displayBirthDate.split('/');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            if (d.length === 2 && m.length === 2 && y.length === 4) {
              customerToAdd.birth_date = `${y}-${m}-${d}`;
            }
          }
        }
        
        const { error } = await supabase.from('customers').insert(customerToAdd);
        if (error) throw error;
        
        const customerForState: Customer = {
          ...newCustomer,
          id: customerId,
          whatsapp: finalWhatsapp,
          phone: finalPhone,
          birthDate: customerToAdd.birth_date || '',
          devices: [],
          createdAt: now
        };

        setCustomers([...customers, customerForState]);
        setSelectedCustomer(customerForState);
        setIsCreatingCustomer(false);
        setNewCustomer({
          name: '', phone: '', whatsapp: '', email: '', document: '',
          address: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
          notes: '', birthDate: '', displayBirthDate: '', customer_origin: ''
        });
        // Blur the active submit button BEFORE changing step so browser doesn't scroll to it
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setStep('DETAILS');
        // Fire scroll resets at multiple frames to beat any browser auto-scroll
        const doScroll = () => {
          if (mainRef.current) { mainRef.current.scrollTop = 0; }
          window.scrollTo({ top: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        };
        doScroll();
        requestAnimationFrame(() => { doScroll(); requestAnimationFrame(doScroll); });
        setTimeout(doScroll, 50);
        setTimeout(doScroll, 150);
        setTimeout(doScroll, 400);
        onShowToast('Cliente cadastrado com sucesso');
      }
    } catch (error: any) {
      console.error('Error with customer:', error);
      onShowToast(`Erro com cliente: ${error.message || ''}`);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleSaveOS = async (providedId?: string, signaturesOverride?: typeof signatures) => {
    if (!selectedCustomer) {
      onShowToast('Selecione um cliente');
      return;
    }
    if (!equipment.type || !equipment.brand || !equipment.model) {
      onShowToast('Preencha os dados básicos do aparelho');
      return;
    }
    const effectiveSignatures = signaturesOverride ?? signatures;
    if (signatureMode === 'digital' && !effectiveSignatures.client) {
      onShowToast('É necessário coletar a assinatura do cliente.');
      return;
    }

    // Check if cash session is open if there's a payment
    if (financials.amountPaid > 0 && !initialOrder) {
      let sessionToUse = currentCashSession;
      
      if (!sessionToUse) {
        // Final real-time check to see if cashier is open (fallback)
        const { data: openSessions } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1);

        if (openSessions && openSessions.length > 0) {
          sessionToUse = openSessions[0];
          setCurrentCashSession(sessionToUse);
        }
      }

      if (!sessionToUse) {
        onShowToast('É necessário abrir o caixa para registrar pagamentos.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const orderId = localOrder?.id || providedId || crypto.randomUUID();
      const now = new Date().toISOString();
      
      const osData: any = {
        company_id: companySettings.id,
        customer_id: selectedCustomer.id,
        equipment,
        checklist,
        checklist_not_possible: checklistNotPossible,
        entry_photos: entryPhotos,
        checklist_notes: checklistNotes,
        defect,
        technician_notes: technicianNotes,
        service,
        financials,
        signatures: { ...effectiveSignatures, isManual: signatureMode === 'manual', mode: signatureMode },
        priority,
        is_visual_checklist: showVisualChecklist,
        delivery_forecast: deliveryForecast || null,
        budget: localOrder?.budget || null,
        technical_report: localOrder?.technicalReport || null,
        completion_data: localOrder?.completionData || null,
        customer_origin_snapshot: selectedCustomer?.customer_origin || null,
        updated_at: now
      };

      if (initialOrder || localOrder) {
        const baseOrder = (initialOrder || localOrder)!;
        osData.status = baseOrder.status;
        osData.history = [
          ...baseOrder.history,
          {
            date: now,
            user: profile.name,
            description: 'Ordem de Serviço editada'
          }
        ];

        const { error: osError } = await supabase.from('orders').update(osData).eq('id', baseOrder.id).eq('company_id', profile.company_id);
        if (osError) throw osError;

        const updatedOrder: Order = {
          ...localOrder as Order,
          customerId: selectedCustomer.id,
          equipment,
          checklist,
          checklistNotPossible,
          entryPhotos,
          checklistNotes,
          defect,
          technicianNotes,
          service,
          financials,
          signatures: effectiveSignatures,
          priority,
          isVisualChecklist: showVisualChecklist,
          deliveryForecast,
          updatedAt: now,
          history: osData.history
        };

        setOrders(orders.map(o => o.id === localOrder?.id ? updatedOrder : o));
        setLocalOrder(updatedOrder);
        osData.os_number = localOrder?.osNumber || updatedOrder.osNumber;

        onLogActivity?.('NOVA_OS', 'EDITOU OS', {
          osId: localOrder?.id,
          osNumber: osData.os_number,
          customerName: selectedCustomer.name,
          customerDocument: selectedCustomer.document,
          customerPhone: selectedCustomer.whatsapp || selectedCustomer.phone,
          description: `Editou informações da OS #${osData.os_number.toString().padStart(4, '0')}`
        });
      } else {
        // Real-time verification of the highest OS number in the database to avoid duplicates
        const { data: lastOrders } = await supabase
          .from('orders')
          .select('os_number')
          .eq('company_id', profile.company_id)
          .order('os_number', { ascending: false })
          .limit(1);

        const currentMax = lastOrders && lastOrders.length > 0 ? (lastOrders[0].os_number as number) : 0;
        // If system was reset (currentMax is 0), start at 1 even if osSettings.nextOsNumber is stuck at a high value.
        // The user can still set a higher starting number in settings if they explicitly want to.
        const newOsNumber = currentMax === 0 ? 1 : Math.max(currentMax + 1, osSettings.nextOsNumber);

        osData.id = orderId;
        osData.company_id = profile.company_id;
        osData.os_number = newOsNumber;
        osData.status = 'Entrada';
        osData.created_at = now;
        osData.history = [{
          date: now,
          user: profile.name,
          description: 'Ordem de Serviço criada'
        }];

        const { data: insertedOrder, error: osError } = await supabase.from('orders').insert(osData).select('id, os_number').single();
        if (osError) throw osError;
        
        // Update local osData with real values from DB
        if (insertedOrder) {
          osData.os_number = insertedOrder.os_number;
        }
        
        // Update local osData number for consistency in following logic
        osData.os_number = newOsNumber;

        onLogActivity?.('NOVA_OS', 'CRIOU OS', {
          osId: orderId,
          osNumber: newOsNumber,
          customerName: selectedCustomer.name,
          customerDocument: selectedCustomer.document,
          customerPhone: selectedCustomer.whatsapp || selectedCustomer.phone,
          description: `Criou nova OS #${newOsNumber.toString().padStart(4, '0')} para ${selectedCustomer.name}`
        });
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
          id: crypto.randomUUID(),
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
        }).eq('id', updatedCustomer.id).eq('company_id', profile.company_id);
        
        setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      }

      // Record transaction in Caixa if there's a payment
      if (financials.paymentStatus !== 'Pendente' && financials.amountPaid > 0) {
        await supabase.from('transactions').insert({
          id: crypto.randomUUID(),
          company_id: profile.company_id,
          type: 'entrada',
          description: `Pagamento OS ${osData.os_number} - ${selectedCustomer.name}`,
          value: financials.amountPaid,
          payment_method: (['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Link'].includes(financials.paymentType) ? financials.paymentType : 'Dinheiro'),
          date: now.split('T')[0],
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          os_id: osData.os_number.toString(),
          user_id: profile.id,
          session_id: currentCashSession?.id
        });
      }

      // Create Receivable if there is a balance
      const balance = financials.totalValue - (financials.amountPaid || 0);
      if (balance > 0) {
        await supabase.from('receivables').insert({
          id: crypto.randomUUID(),
          company_id: profile.company_id,
          description: `Saldo OS ${osData.os_number} - ${equipment.type} ${equipment.brand}`,
          value: balance,
          due_date: now.split('T')[0],
          status: 'pendente',
          customer_name: selectedCustomer.name,
          os_id: orderId
        });
      }

      const orderForState: Order = {
        id: orderId,
        osNumber: osData.os_number,
        customerId: selectedCustomer.id,
        equipment,
        checklist,
        checklistNotPossible,
        entryPhotos,
        checklistNotes,
        defect,
        technicianNotes,
        service,
        financials,
        signatures: { ...signatures, isManual: signatureMode === 'manual', mode: signatureMode },
        status: 'Entrada',
        priority,
        isVisualChecklist: showVisualChecklist,
        history: [{
          date: now,
          user: profile.name,
          description: 'Ordem de Serviço criada'
        }],
        createdAt: now,
        updatedAt: now
      } as any;

      setOrders(prev => prev.some(o => o.id === orderId) ? prev.map(o => o.id === orderId ? (orderForState || o) : o) : [...prev, orderForState]);
      setLocalOrder(orderForState);
      
      const isNew = !initialOrder && !localOrder;
      // nextOsNumber was being updated automatically, causing sticky high numbers after resets.
      // Now we rely on currentMax+1 from DB, and nextOsNumber is only the manual "floor" set by the user.

      setSuccessOsNumber(osData.os_number.toString().padStart(4, '0'));
      setShowSuccessModal(true);
      
      if (signatureMode === 'remote' && selectedCustomer.whatsapp) {
        // Use slug + secure UUID link (branding + privacy)
        const portalUrl = companySettings.publicSlug 
          ? `${window.location.origin}/${companySettings.publicSlug}/${osData.id}`
          : `${window.location.origin}/os/${osData.id}`;
        
        const template = osSettings.whatsappMessages?.['Assinatura Remota'] || 
          `Olá [nome_cliente]! 👋\nSeu atendimento já está em fase final (OS [numero_os]).\n\nFalta só sua confirmação para concluirmos:\n👉 [link_assinatura]\n\nAssim que confirmar, já damos continuidade 👍\n\nAguardamos você\n\n[nome_assistencia]`;
        
        const message = template
          .replace(/\\n/g, '\n')
          .replace(/\[nome_cliente\]/g, selectedCustomer.name)
          .replace(/{cliente}/g, selectedCustomer.name)
          .replace(/\[numero_os\]/g, osData.os_number.toString().padStart(4, '0'))
          .replace(/{os}/g, osData.os_number.toString().padStart(4, '0'))
          .replace(/\[marca\]/g, osData.equipment.brand)
          .replace(/\[modelo\]/g, osData.equipment.model)
          .replace(/\[defeito\]/g, osData.defect)
          .replace(/\[status\]/g, 'Entrada')
          .replace(/\[data_entrada\]/g, new Date().toLocaleDateString('pt-BR'))
          .replace(/\[link_os\]/g, portalUrl)
          .replace(/\[link_assinatura\]/g, portalUrl)
          .replace(/{link}/g, portalUrl)
          .replace(/\[nome_assistencia\]/g, companySettings.name || 'Servyx')
          .replace(/{empresa}/g, companySettings.name || 'Servyx');

        setWhatsappModal({
          isOpen: true,
          message,
          customerPhone: selectedCustomer.whatsapp
        });
      }

      if (isNew && signatureMode !== 'remote') {
        setWhatsappPrompt({ isOpen: true, orderId: orderId, newStatus: 'Entrada' });
      }
    } catch (error: any) {
      console.error('Error saving OS full error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      onShowToast(`Erro ao criar OS: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
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

        const portalUrl = companySettings.publicSlug 
          ? `${window.location.origin}/${companySettings.publicSlug}/${order.id}`
          : `${window.location.origin}/os/${order.id}`;

        const template = osSettings.whatsappMessages?.['Entrada Registrada'] || 
          `Olá, {cliente} 👋\n\nJá está disponível o acompanhamento da sua OS {os}.\nVocê pode visualizar todas as atualizações em tempo real pelo link abaixo:\n\n{link}\n\n{empresa}\nAgradecemos pela confiança em nossos serviços.`;
        
        let message = template
          .replace(/\\n/g, '\n')
          .replace(/\[nome_cliente\]/g, selectedCustomer.name)
          .replace(/{cliente}/g, selectedCustomer.name)
          .replace(/\[numero_os\]/g, order.osNumber.toString().padStart(4, '0'))
          .replace(/{os}/g, order.osNumber.toString().padStart(4, '0'))
          .replace(/\[marca\]/g, order.equipment.brand)
          .replace(/\[modelo\]/g, order.equipment.model)
          .replace(/\[defeito\]/g, order.defect)
          .replace(/\[status\]/g, order.status)
          .replace(/\[data_entrada\]/g, new Date(order.createdAt).toLocaleDateString('pt-BR'))
          .replace(/\[link_os\]/g, portalUrl)
          .replace(/{link}/g, portalUrl)
          .replace(/\[nome_assistencia\]/g, companySettings.name || 'Servyx')
          .replace(/{empresa}/g, companySettings.name || 'Servyx');

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

  const printOrder = useMemo(() => {
    return localOrder || {
      id: 'preview',
      companyId: companySettings?.id || 'default',
      osNumber: orders.length === 0 ? (osSettings?.nextOsNumber || 1) : Math.max(Math.max(...orders.map(o => o.osNumber || 0)) + 1, osSettings?.nextOsNumber || 1),
      customerId: selectedCustomer?.id || '',
      signatures: { ...signatures, isManual: signatureMode === 'manual', mode: signatureMode },
      equipment,
      defect,
      service,
      checklist,
      checklistNotPossible,
      checklistNotes,
      technicianNotes,
      financials,
      status: 'Entrada',
      priority,
      isVisualChecklist: showVisualChecklist,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Order;
  }, [
    localOrder, companySettings.id, orders, osSettings.nextOsNumber, 
    selectedCustomer?.id, signatures, signatureMode, equipment, defect, 
    service, checklist, checklistNotPossible, checklistNotes, technicianNotes, 
    financials, priority, showVisualChecklist
  ]);

  const warrantyOrder = useMemo(() => {
    return {
      ...printOrder,
      status: 'Reparo Concluído',
      completionData: localOrder?.completionData || {
          servicesPerformed: service,
          exitChecklist: checklist,
          supplier: '',
          partsUsed: '',
          warrantyDays: 90,
          warrantyTerms: osSettings.printTerms
      }
    } as Order;
  }, [printOrder, localOrder, service, checklist, osSettings.printTerms]);

  // Efeito para gerenciar a impressão com delay para estabilidade
  useEffect(() => {
    if (!printMode) return;

    const originalTitle = document.title;
    const osNumber = (localOrder ? localOrder.osNumber : printOrder.osNumber).toString().padStart(4, '0');
    const companyName = companySettings.name || 'Servyx';
    const isWarranty = printMode.includes('warranty');
    
    document.title = `${companyName.toUpperCase().replace(/\s+/g, '_')}_${isWarranty ? 'Garantia' : 'OS'}_${osNumber}`;
    
    // Limpa classes anteriores
    document.body.classList.remove('print-a4', 'print-thermal', 'print-warranty', 'print-warranty-thermal');
    
    // Adiciona a classe atual
    document.body.classList.add(`print-${printMode}`);

    // Pequeno delay para garantir que o Portal renderizou e o browser processou as classes CSS
    const timer = setTimeout(() => {
      window.print();
      
      // Limpeza após fechar o diálogo de impressão
      document.body.classList.remove(`print-${printMode}`);
      document.title = originalTitle;
      setPrintMode(null);
      
      if (signatureMode === 'manual' && (printMode === 'a4' || printMode === 'thermal')) {
        setTimeout(() => setIsScanReminderOpen(true), 1000);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [printMode, localOrder, printOrder.osNumber, companySettings.name, signatureMode]);

  return (
    <>
      <div className="h-screen bg-[#0A0A0A] text-white flex flex-col overflow-hidden">

      {/* Main App Content - Hidden on Print */}
        {/* Success Animation Modal */}
        <SuccessAnimationModal 
          isOpen={showSuccessModal}
          osNumber={successOsNumber}
          onClose={() => setShowSuccessModal(false)}
        />

        <div className="nova-os-ui flex flex-col flex-1 h-full overflow-hidden">
        {/* Header */}
      <header className="bg-[#141414]/90 backdrop-blur-2xl border-b border-white/[0.05] p-3 sm:p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={onBack}
                className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl transition-all text-zinc-400 hover:text-white active:scale-95"
                title="Voltar ao Dashboard"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            <div className="flex flex-col items-end sm:items-start text-right sm:text-left">
              <div className="flex items-center gap-3 sm:gap-2">
                <span className="text-zinc-500 text-[10px] sm:text-sm font-black uppercase tracking-widest sm:hidden">
                  {localOrder ? 'Editar' : 'Nova OS'}
                </span>
                <span className="text-base sm:text-xs font-black font-mono bg-zinc-900 border border-white/5 text-zinc-400 px-3 py-1.5 sm:px-2 sm:py-1 rounded-lg shadow-inner">
                  OS {localOrder ? localOrder.osNumber.toString().padStart(4, '0') : 
                      (orders.length === 0 ? '0001' : Math.max(Math.max(...orders.map(o => o.osNumber)) + 1, osSettings.nextOsNumber).toString().padStart(4, '0'))}
                </span>
              </div>
              <h1 className="hidden sm:block text-xl font-black text-white tracking-tight">
                {localOrder ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main 
        key={step}
        ref={mainRef}
        onScroll={handleMainScroll}
        className="flex-1 p-3 sm:p-6 overflow-y-auto"
      >
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          
          {step === 'CLIENT' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#141414] border border-zinc-800 rounded-md p-4 sm:p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                      <div className="w-12 h-12 rounded-sm bg-[#00E676]/10 flex items-center justify-center">
                        <User size={24} className="text-[#00E676]" />
                      </div>
                      {isCreatingCustomer ? (editingCustomerId ? 'Editar Cliente' : 'Novo Cliente') : 'Escolha o Cliente'}
                    </h2>
                    <p className="text-zinc-500 text-xs mt-1 ml-14">
                      {isCreatingCustomer 
                        ? 'Preencha os dados básicos para o registro da OS' 
                        : 'Busque um cliente cadastrado ou crie um novo'}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (!isCreatingCustomer) {
                        setEditingCustomerId(null);
                        setNewCustomer({
                          name: '', phone: '', whatsapp: '', email: '', document: '',
                          address: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
                          notes: '', birthDate: '', displayBirthDate: '', customer_origin: ''
                        });
                      }
                      setIsCreatingCustomer(!isCreatingCustomer);
                    }}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-md font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                      isCreatingCustomer 
                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' 
                        : 'bg-[#00E676] text-black hover:bg-[#00C853] shadow-lg shadow-[#00E676]/20'
                    }`}
                  >
                    {isCreatingCustomer ? (
                      <>
                        <X size={16} />
                        Cancelar
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Novo Cadastro
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
                          onChange={e => setNewCustomer({...newCustomer, name: capFirst(e.target.value)})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: João da Silva"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">WhatsApp</label>
                        <div className="flex gap-2">
                          <CountryCodePicker selectedCountry={whatsappCountry} onSelect={setWhatsappCountry} />
                          <input
                            type="tel"
                            value={newCustomer.whatsapp}
                            onChange={e => setNewCustomer({...newCustomer, whatsapp: applyMaskWithCursor(e.target as HTMLInputElement, 'phone')})}
                            className="flex-1 bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Telefone</label>
                        <div className="flex gap-2">
                          <CountryCodePicker selectedCountry={phoneCountry} onSelect={setPhoneCountry} />
                          <input
                            type="tel"
                            value={newCustomer.phone}
                            onChange={e => setNewCustomer({...newCustomer, phone: applyMaskWithCursor(e.target as HTMLInputElement, 'phone')})}
                            className="flex-1 bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="(00) 0000-0000"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">CPF ou CNPJ</label>
                        <input
                          type="tel"
                          value={newCustomer.document}
                          onChange={e => setNewCustomer({...newCustomer, document: applyMaskWithCursor(e.target as HTMLInputElement, 'document')})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">E-mail</label>
                        <input
                          type="email"
                          value={newCustomer.email}
                          onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Data de Nascimento</label>
                        <input
                          type="tel"
                          value={newCustomer.displayBirthDate}
                          onChange={e => setNewCustomer({...newCustomer, displayBirthDate: applyMaskWithCursor(e.target as HTMLInputElement, 'date')})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="DD/MM/AAAA"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Origem do Cliente</label>
                        <select 
                          value={newCustomer.customer_origin}
                          onChange={e => setNewCustomer({...newCustomer, customer_origin: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                        >
                          <option value="">Selecione a origem</option>
                          {['Google', 'Instagram', 'Facebook', 'WhatsApp', 'Indicação', 'Passou na loja', 'Cliente antigo'].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
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
                            onBlur={async (e) => {
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
                                  setNewCustomer(prev => ({
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

                                const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                const viaCepData = await viaCepResponse.json();
                                if (viaCepData.erro) {
                                  onShowToast('CEP não encontrado. Verifique o número informado.');
                                } else {
                                  setNewCustomer(prev => ({
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
                            }}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="00000-000"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-xs font-medium text-zinc-400">Rua</label>
                          <input
                            type="text"
                            value={newCustomer.address.street}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, street: capFirst(e.target.value)}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="Nome da rua"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-400">Número</label>
                          <input
                            type="text"
                            value={newCustomer.address.number}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, number: e.target.value}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-400">Bairro</label>
                          <input
                            type="text"
                            value={newCustomer.address.neighborhood}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, neighborhood: capFirst(e.target.value)}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="Bairro"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-400">Cidade</label>
                          <input
                            type="text"
                            value={newCustomer.address.city}
                            onChange={e => setNewCustomer({...newCustomer, address: {...newCustomer.address, city: capFirst(e.target.value)}})}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                            placeholder="Cidade"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-400">Observações</label>
                      <textarea
                        value={newCustomer.notes}
                        onChange={e => setNewCustomer({...newCustomer, notes: capFirst(e.target.value)})}
                        rows={3}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors resize-none"
                        placeholder="Informações adicionais..."
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSavingCustomer}
                        className="bg-[#00E676] hover:bg-[#00C853] text-black px-6 py-2.5 rounded-sm font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {isSavingCustomer ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          editingCustomerId ? 'Salvar Edição e Continuar' : 'Cadastrar e Continuar'
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="relative group">
                      <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00E676] transition-colors" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome, CPF ou WhatsApp..."
                        className="w-full bg-[#0A0A0A] border-2 border-zinc-800/50 rounded-[22px] pl-14 pr-6 py-5 text-base text-white focus:outline-none focus:border-[#00E676] transition-all shadow-xl placeholder:text-zinc-600"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pb-4">
                      {filteredCustomers.length === 0 ? (
                        <div className="sm:col-span-2 text-center py-16 bg-black/20 rounded-[32px] border-2 border-dashed border-zinc-800/50">
                          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                            <Search size={32} className="text-zinc-700" />
                          </div>
                          <h3 className="text-white font-bold mb-1 font-black uppercase text-xs tracking-widest">Nenhum cliente encontrado</h3>
                          <p className="text-zinc-500 text-sm">Tente outro termo ou cadastre um novo cliente.</p>
                        </div>
                      ) : (
                        filteredCustomers.map((customer, idx) => {
                          return (
                            <motion.div 
                              key={customer.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setStep('DETAILS');
                              }}
                              className="bg-[#0A0A0A] border border-zinc-800/80 rounded-md p-5 flex items-center gap-4 cursor-pointer hover:border-[#00E676]/60 hover:bg-zinc-900/40 transition-all group relative overflow-hidden"
                            >
                              <div className="w-14 h-14 rounded-sm bg-zinc-800 flex items-center justify-center text-xl font-black text-zinc-400 border border-zinc-700/50 group-hover:scale-110 group-hover:bg-[#00E676]/10 group-hover:text-[#00E676] group-hover:border-[#00E676]/20 transition-all shadow-lg">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-black text-sm text-white truncate group-hover:text-[#00E676] transition-colors uppercase tracking-tight">{customer.name}</h3>
                                <div className="flex flex-col gap-1 mt-1.5">
                                  {customer.whatsapp && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                       <MessageCircle size={10} className="text-[#25D366]" />
                                       {customer.whatsapp}
                                    </div>
                                  )}
                                  {customer.document && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                                       <FileText size={10} className="text-zinc-600" />
                                       {customer.document}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditCustomer(customer);
                                  }}
                                  className="p-2.5 bg-zinc-900/50 text-zinc-500 hover:text-[#00E676] hover:bg-[#00E676]/10 rounded-sm transition-all border border-zinc-800 group-hover:border-zinc-700"
                                  title="Editar Cliente"
                                >
                                  <Pencil size={16} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
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
              <div className="bg-[#141414] border border-zinc-800/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00E676]/20 to-zinc-900 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] font-black text-xl shadow-inner">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{selectedCustomer.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                       {selectedCustomer.whatsapp && (
                         <span className="text-[10px] font-bold text-[#00E676]/80 uppercase tracking-widest flex items-center gap-1">
                           <MessageCircle size={10} /> {selectedCustomer.whatsapp}
                         </span>
                       )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-4 border-t sm:border-t-0 border-zinc-800/50 pt-3 sm:pt-0">
                  <button 
                    onClick={() => handleEditCustomer(selectedCustomer)}
                    className="text-xs text-zinc-400 hover:text-[#00E676] flex items-center gap-1 transition-colors"
                    title="Editar Cadastro"
                  >
                    <Pencil size={12} />
                    Editar
                  </button>
                  <button 
                    onClick={() => setStep('CLIENT')}
                    className="text-xs text-zinc-400 hover:text-white underline underline-offset-2"
                  >
                    Trocar Cliente
                  </button>
                </div>
              </div>

              {/* Tabs Navigation (Stepper) */}
              <div className="relative mb-6">
                 <div className="flex w-full gap-0.5 sm:gap-1">
                   {[
                     { id: 'EQUIPMENT', label: 'Equipamento', icon: Smartphone },
                     { id: 'CHECKLIST', label: 'Checklist', icon: CheckCircle2 },
                     { id: 'SERVICE', label: 'Serviço', icon: FileText },
                     { id: 'FINANCIAL', label: 'Financeiro', icon: Banknote },
                     { id: 'SIGNATURE', label: 'Assinaturas', icon: Pencil },
                   ].map((tab, idx, arr) => {
                     const isSelected = activeTab === tab.id;
                     
                     return (
                       <button
                         key={tab.id}
                         onClick={() => setActiveTab(tab.id as any)}
                         className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-12 relative ${idx !== 0 ? '-ml-2 sm:-ml-4' : ''} transition-all duration-300 group ${
                           isSelected 
                             ? 'bg-[#00E676]/20 border border-[#00E676]/50' 
                             : 'bg-[#141414] hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700'
                         }`}
                         style={{
                           clipPath: idx === 0 
                                     ? 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 0% 50%)'
                                     : idx === arr.length - 1
                                       ? 'polygon(0% 0%, 100% 0%, 100% 50%, 100% 100%, 0% 100%, 10px 50%)'
                                       : 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)',
                           zIndex: arr.length - idx
                         }}
                       >
                         {/* Optional Icon inner shadow/color */}
                         <div className={`transition-colors ${isSelected ? 'text-[#00E676]' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                           <tab.icon size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
                         </div>
                         <span className={`text-[8px] sm:text-[10px] uppercase font-black tracking-widest truncate max-w-[50px] sm:max-w-none transition-colors ${
                           isSelected ? 'text-[#00E676]' : 'text-zinc-500 group-hover:text-zinc-300'
                         }`}>
                           {tab.label}
                         </span>
                       </button>
                     );
                   })}
                 </div>
              </div>

              <div className="space-y-4 sm:space-y-6">

                  {activeTab === 'EQUIPMENT' && (
                    <>
                    <section className="bg-[#141414] border border-zinc-800 rounded-md p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
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
                            className="bg-[#0A0A0A] border border-zinc-800 rounded-sm px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00E676]"
                          >
                            <option value="new">+ Novo Aparelho</option>
                            {selectedCustomer.devices.map(d => (
                              <option key={d.id} value={d.id}>{d.brand} {d.model}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Tipo de Aparelho *</label>
                        <select
                          value={equipment.type}
                          onChange={e => {
                            const newType = e.target.value;
                            setEquipment({...equipment, type: newType});
                            
                            if (newType === 'Controle') {
                              setShowVisualChecklist(true);
                              const controllerItems = [
                                'L1', 'L2', 'R1', 'R2', 
                                'D-Pad Cima', 'D-Pad Baixo', 'D-Pad Esquerda', 'D-Pad Direita', 
                                'Triângulo', 'Círculo', 'Cross / X', 'Quadrado', 
                                'L3 (Analógico)', 'R3 (Analógico)', 
                                'PS Button', 'Touchpad', 'Create', 'Options', 
                                'Conector Carga', 'Entrada Fone P2'
                              ];
                              const newChecklist: Record<string, 'works' | 'broken' | 'untested'> = {};
                              controllerItems.forEach(item => {
                                newChecklist[item] = 'untested';
                              });
                              setChecklist(newChecklist);
                            } else {
                              setShowVisualChecklist(false);
                              // Set dynamic checklist based on type
                              const items = osSettings.checklistByCategory?.[newType];
                              if (items) {
                                const newChecklist: Record<string, 'works' | 'broken' | 'untested'> = {};
                                items.forEach((item: string) => {
                                  newChecklist[item] = 'untested';
                                });
                                setChecklist(newChecklist);
                              } else {
                                setChecklist({});
                              }
                            }
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                        >
                          <option value="">Selecione...</option>
                          {Array.from(new Set([
                            'Smartphone', 'Notebook', 'Computador', 'Tablet', 'Videogame', 'Controle', 'Impressora', 'Áudio', 'Smartwatch', 'Outro',
                            ...Object.keys(osSettings.checklistByCategory || {})
                          ])).map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Marca *</label>
                        <input
                          type="text"
                          value={equipment.brand}
                          onChange={e => setEquipment({...equipment, brand: capFirst(e.target.value)})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: Apple, Samsung"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Modelo *</label>
                        <input
                          type="text"
                          value={equipment.model}
                          onChange={e => setEquipment({...equipment, model: capFirst(e.target.value)})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: iPhone 13 Pro"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Cor</label>
                        <input
                          type="text"
                          value={equipment.color}
                          onChange={e => setEquipment({...equipment, color: capFirst(e.target.value)})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="Ex: Preto"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">IMEI / Número de Série</label>
                        <input
                          type="text"
                          value={equipment.serial}
                          onChange={e => setEquipment({...equipment, serial: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors font-mono"
                          placeholder="Digite o IMEI ou Serial"
                        />
                      </div>
                    </div>
                  </section>

                    {/* Password Section (Hidden for Controllers) */}
                    {equipment.type !== 'Controle' && (
                      <div className="space-y-4 mb-8 bg-[#0A0A0A] border border-zinc-800 rounded-sm p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                             <Lock size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Senha / Padrão</h3>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">Proteção do aparelho</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'none', label: 'Sem Senha', icon: ShieldCheck, desc: 'Aparelho livre' },
                            { id: 'text', label: 'PIN / Senha', icon: Key, desc: 'Texto ou números' },
                            { id: 'pattern', label: 'Desenho', icon: Grid, desc: 'Padrão de pontos' },
                          ].map((type) => {
                            const isSelected = equipment.passwordType === type.id;
                            const Icon = type.icon;
                            return (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => {
                                  if (type.id === 'pattern') {
                                    setEquipment({...equipment, passwordType: 'pattern', passwordValue: ''});
                                    setIsPatternModalReadOnly(false);
                                    setIsPatternModalOpen(true);
                                  } else {
                                    setEquipment({...equipment, passwordType: type.id as any, passwordValue: ''});
                                  }
                                }}
                                className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-sm border transition-all group/p-btn relative ${
                                  isSelected 
                                    ? 'bg-zinc-800/80 border-zinc-600 shadow-sm' 
                                    : 'bg-[#141414] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-sm flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-zinc-900 text-[#00E676] shadow-inner' : 'bg-zinc-900/50 text-zinc-600 group-hover/p-btn:text-zinc-400'
                                }`}>
                                   <Icon size={16} />
                                </div>
                                <div className="text-center mt-1">
                                  <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'text-zinc-500'} transition-colors`}>{type.label}</p>
                                  <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">{type.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {equipment.passwordType === 'text' && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2 pt-2"
                          >
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Digite o PIN ou Senha</label>
                            <div className="relative group max-w-xs">
                              <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#00E676] transition-colors" />
                              <input
                                type="text"
                                value={equipment.passwordValue}
                                onChange={e => setEquipment({...equipment, passwordValue: e.target.value})}
                                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all font-mono tracking-widest"
                                placeholder="****"
                              />
                            </div>
                          </motion.div>
                        )}
                        
                        {equipment.passwordType === 'pattern' && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#0A0A0A] border border-zinc-800 rounded-md p-4 flex flex-col items-start gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${equipment.passwordValue ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-zinc-800'}`} />
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                {equipment.passwordValue ? 'Padrão definido com sucesso' : 'Aguardando definição do padrão'}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full">
                              <button
                                onClick={() => {
                                  setIsPatternModalReadOnly(false);
                                  setIsPatternModalOpen(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-800 hover:border-zinc-700 active:scale-95"
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
                                  className="aspect-square bg-zinc-900 hover:bg-zinc-800 text-blue-400 px-3 rounded-sm transition-all border border-zinc-800 hover:border-zinc-700 active:scale-95"
                                  title="Ver Padrão"
                                >
                                  <Eye size={18} />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-4">
                      <button onClick={() => setActiveTab('CHECKLIST')} className="bg-[#00E676] hover:bg-[#00C853] text-black px-6 py-3 rounded-sm font-bold transition-all shadow-lg text-xs uppercase tracking-widest flex items-center gap-2">
                        Avançar para Checklist &rarr;
                      </button>
                    </div>
                  </>
                  )}

                  {/* Modals & Checklist Sections */}
                  <PatternLock 
                    key={isPatternModalOpen ? 'modal-open' : 'modal-closed'}
                    isOpen={isPatternModalOpen}
                    onClose={() => setIsPatternModalOpen(false)}
                    onSave={(pattern) => setEquipment({ ...equipment, passwordValue: pattern })}
                    initialPattern={equipment.passwordValue}
                    readOnly={isPatternModalReadOnly}
                  />

                  {/* Checklist */}
                  {activeTab === 'CHECKLIST' && (
                    <>
                    <section className="bg-[#141414] border border-zinc-800 rounded-md p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-[#00E676]">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Checklist de Entrada</h3>
                        </div>
                      </div>
                      
                      {equipment.type === 'Controle' && (
                        <button 
                          onClick={() => setShowVisualChecklist(!showVisualChecklist)}
                          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all border ${
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
                    
                    <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="checklist_not_possible"
                        checked={checklistNotPossible}
                        onChange={(e) => setChecklistNotPossible(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-700 text-[#00E676] focus:ring-[#00E676] bg-zinc-800"
                      />
                      <label htmlFor="checklist_not_possible" className="text-sm text-zinc-300 font-medium cursor-pointer">
                        Não foi possível realizar o checklist de funcionamento (Ex: Aparelho não liga)
                      </label>
                    </div>

                    {checklistNotPossible ? (
                      <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-sm mb-4">
                        <AlertCircle size={20} className="text-red-500 shrink-0" />
                        <p className="text-sm font-semibold text-red-400">
                          Não foi possível realizar o checklist de funcionamento.
                        </p>
                      </div>
                    ) : showVisualChecklist && equipment.type === 'Controle' ? (
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-md p-1 sm:p-4 mb-8 overflow-hidden">
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
                          <div className="text-center py-6 bg-[#0A0A0A] rounded-sm border border-zinc-800 border-dashed">
                            <p className="text-sm text-zinc-500">Nenhum item de checklist configurado.</p>
                            <p className="text-xs text-zinc-600 mt-1">Selecione um aparelho ou configure em Ajustes.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <div className="flex-1 space-y-2">
                              {Object.keys(checklist).slice(0, Math.ceil(Object.keys(checklist).length / 2)).map(item => (
                                <div key={item} className="bg-[#0A0A0A] border border-zinc-800 rounded-sm p-2.5 flex items-center justify-between">
                                  <span className="text-[13px] text-zinc-300 font-medium truncate pr-2">{item}</span>
                                  <div className="flex items-center gap-1 bg-[#141414] rounded-sm p-0.5 border border-zinc-800">
                                    <button
                                      onClick={() => setChecklist({...checklist, [item]: 'works'})}
                                      className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'works' ? 'bg-[#00E676]/20 text-[#00E676]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                      title="Funciona"
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      onClick={() => setChecklist({...checklist, [item]: 'broken'})}
                                      className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'broken' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                      title="Não Funciona"
                                    >
                                      <X size={13} />
                                    </button>
                                    <button
                                      onClick={() => setChecklist({...checklist, [item]: 'untested'})}
                                      className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'untested' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                      title="Sem Teste"
                                    >
                                      <Grid size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex-1 space-y-2">
                              {Object.keys(checklist).slice(Math.ceil(Object.keys(checklist).length / 2)).map(item => (
                                <div key={item} className="bg-[#0A0A0A] border border-zinc-800 rounded-sm p-2.5 flex items-center justify-between">
                                  <span className="text-[13px] text-zinc-300 font-medium truncate pr-2">{item}</span>
                                  <div className="flex items-center gap-1 bg-[#141414] rounded-sm p-0.5 border border-zinc-800">
                                    <button
                                      onClick={() => setChecklist({...checklist, [item]: 'works'})}
                                      className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'works' ? 'bg-[#00E676]/20 text-[#00E676]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                      title="Funciona"
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      onClick={() => setChecklist({...checklist, [item]: 'broken'})}
                                      className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'broken' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                      title="Não Funciona"
                                    >
                                      <X size={13} />
                                    </button>
                                    <button
                                      onClick={() => setChecklist({...checklist, [item]: 'untested'})}
                                      className={`p-1.5 rounded-md transition-colors ${checklist[item] === 'untested' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                      title="Sem Teste"
                                    >
                                      <Grid size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-400">Observações do Checklist</label>
                      <input
                        type="text"
                        value={checklistNotes}
                        onChange={e => setChecklistNotes(capFirst(e.target.value))}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
                        placeholder="Ex: Tela já possui trincado no canto superior direito"
                      />
                    </div>
                  </section>
                  
                  <div className="flex justify-between mt-4">
                    <button onClick={() => setActiveTab('EQUIPMENT')} className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-6 py-3 rounded-sm font-bold transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                      &larr; Voltar
                    </button>
                    <button onClick={() => setActiveTab('SERVICE')} className="bg-[#00E676] hover:bg-[#00C853] text-black px-6 py-3 rounded-sm font-bold transition-all shadow-lg text-xs uppercase tracking-widest flex items-center gap-2">
                      Avançar para Serviço &rarr;
                    </button>
                  </div>
                </>
                )}

                {/* SERVICE TAB */}
                {activeTab === 'SERVICE' && (
                  <>
                  {/* Fotos de Entrada */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-md p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsCameraModalOpen(true)}
                          className={`w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-[#00E676] hover:bg-zinc-700 transition-all ${isUploading ? 'opacity-50' : ''}`}
                          disabled={isUploading}
                        >
                          <Camera size={16} />
                        </button>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Fotos de Entrada</h3>
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase font-black">Portal do Cliente</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {entryPhotos.map((url, index) => (
                          <div key={index} className="relative group aspect-square rounded-sm overflow-hidden border border-zinc-800 bg-black">
                            <img src={url} alt={`Entrada ${index + 1}`} className="w-full h-full object-contain" />
                            <button
                              onClick={() => setEntryPhotos(entryPhotos.filter((_, i) => i !== index))}
                              className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        
                        {entryPhotos.length < 8 && (
                          <>
                            {/* Option: Upload File/Gallery */}
                            <label className={`aspect-square rounded-sm border-2 border-dashed border-zinc-800 hover:border-[#00E676] hover:bg-[#00E676]/5 transition-all flex flex-col items-center justify-center cursor-pointer gap-2 ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleUploadPhotos}
                                disabled={isUploading}
                              />
                              {isUploading ? (
                                <Loader2 size={24} className="text-[#00E676] animate-spin" />
                              ) : (
                                <>
                                  <Plus size={24} className="text-zinc-600" />
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Galeria</span>
                                </>
                              )}
                            </label>

                            {/* Option: Camera Direct */}
                            <button 
                              onClick={() => setIsCameraModalOpen(true)}
                              className={`aspect-square rounded-sm border-2 border-dashed border-zinc-800 hover:border-[#00E676] hover:bg-[#00E676]/5 transition-all flex flex-col items-center justify-center gap-2 ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 size={24} className="text-[#00E676] animate-spin" />
                              ) : (
                                <>
                                  <Camera size={24} className="text-zinc-600" />
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Câmera</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600">Máximo de 8 fotos. Formatos: JPG, PNG.</p>
                    </div>
                  </section>

                  {/* Defect & Notes */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-md p-4 sm:p-6 shadow-sm space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-blue-500">
                           <AlertCircle size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Prioridade</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['Baixa', 'Média', 'Alta', 'Urgente'] as OrderPriority[]).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`px-3 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all border ${
                              priority === p 
                                ? p === 'Baixa' ? 'bg-zinc-800 border-zinc-700 text-white shadow-lg'
                                : p === 'Média' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10'
                                : p === 'Alta' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-lg shadow-orange-500/10'
                                : 'bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10'
                                : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700 active:scale-95'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-amber-500">
                           <AlertTriangle size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Defeito Relatado *</h3>
                      </div>
                      <textarea
                        value={defect}
                        onChange={e => setDefect(capFirst(e.target.value))}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors min-h-[100px] resize-y"
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
                          onChange={e => setTechnicianNotes(capFirst(e.target.value))}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-y"
                          placeholder="Anotações visíveis apenas para a equipe técnica..."
                        />
                      </div>
                    )}
                  </section>

                  
                  {/* Service Details */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-md p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-[#00E676]">
                         <FileText size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">Serviço a Executar</h3>
                    </div>
                    
                    {availableServices.length > 0 && (() => {
                      // Map equipment.type to service category
                      const filteredSvcs = equipment.type
                        ? availableServices.filter(s => s.category === equipment.type || s.category === 'Outro')
                        : availableServices;
                      const exactMatch = equipment.type
                        ? availableServices.filter(s => s.category === equipment.type)
                        : availableServices;
                      const displaySvcs = exactMatch.length > 0 ? exactMatch : availableServices;
                      return (
                        <div className="mb-4 space-y-1">
                          <div className="flex items-center justify-between ml-1 mb-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Selecionar do Catálogo</label>
                            {equipment.type && (
                              <span className="text-[9px] text-[#00E676] font-bold uppercase tracking-widest">
                                {displaySvcs.length} serviço{displaySvcs.length !== 1 ? 's' : ''} para {equipment.type}
                              </span>
                            )}
                          </div>
                          <select
                            onChange={(e) => {
                              const svc = availableServices.find(s => s.id === e.target.value);
                              if (svc) {
                                setService(svc.name + (svc.description ? ` - ${svc.description}` : ''));
                                setFinancials(prev => ({ ...prev, totalValue: Number(svc.default_value) }));
                              }
                            }}
                            className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] appearance-none"
                          >
                            <option value="">
                              {equipment.type
                                ? displaySvcs.length > 0
                                  ? `Serviços para ${equipment.type}...`
                                  : 'Nenhum serviço cadastrado para este equipamento'
                                : 'Selecione um serviço cadastrado...'}
                            </option>
                            {displaySvcs.map(s => (
                              <option key={s.id} value={s.id}>{s.name} — R$ {Number(s.default_value).toFixed(2)}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    {/* Delivery Forecast Section */}
                    <div className="pt-4 border-t border-zinc-800/50 mt-6 overflow-hidden relative group/forecast">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E676]/[0.02] blur-3xl rounded-full pointer-events-none group-hover/forecast:bg-[#00E676]/[0.05] transition-all duration-700"></div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-[#00E676] shadow-inner">
                           <Grid size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest italic leading-none">Previsão de Entrega</h3>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Opcional • Alerta de atraso automático</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data Prevista</label>
                          <div className="relative group/input">
                            <input
                              type="date"
                              value={deliveryForecast ? deliveryForecast.split('T')[0] : ''}
                              onChange={(e) => {
                                const time = deliveryForecast ? (deliveryForecast.split('T')[1] || '09:00:00') : '09:00:00';
                                setDeliveryForecast(e.target.value ? `${e.target.value}T${time}` : '');
                              }}
                              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all [color-scheme:dark]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Hora Prevista</label>
                          <div className="relative group/input">
                            <input
                              type="time"
                              value={deliveryForecast && deliveryForecast.includes('T') ? deliveryForecast.split('T')[1].substring(0, 5) : ''}
                              onChange={(e) => {
                                const date = deliveryForecast ? deliveryForecast.split('T')[0] : new Date().toISOString().split('T')[0];
                                setDeliveryForecast(e.target.value ? `${date}T${e.target.value}:00` : '');
                              }}
                              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-all [color-scheme:dark]"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {deliveryForecast && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 flex items-center gap-3 p-3 bg-[#00E676]/5 border border-[#00E676]/20 rounded-sm"
                        >
                          <AlertCircle size={14} className="text-[#00E676]" />
                          <p className="text-[10px] font-bold text-[#00E676] uppercase tracking-wider">
                            O sistema monitorará este prazo. Em caso de atraso, a prioridade subirá para ALTA automaticamente.
                          </p>
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-1 mt-6">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Descrição do Serviço</label>
                      <textarea
                        value={service}
                        onChange={e => setService(capFirst(e.target.value))}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors min-h-[100px] resize-y"
                        placeholder="Descrição do serviço contratado..."
                      />
                    </div>
                  </section>


                  <div className="flex justify-between mt-4">
                    <button onClick={() => setActiveTab('CHECKLIST')} className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-6 py-3 rounded-sm font-bold transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                      &larr; Voltar
                    </button>
                    <button onClick={() => setActiveTab('FINANCIAL')} className="bg-[#00E676] hover:bg-[#00C853] text-black px-6 py-3 rounded-sm font-bold transition-all shadow-lg text-xs uppercase tracking-widest flex items-center gap-2">
                      Avançar para Financeiro &rarr;
                    </button>
                  </div>
                </>
                )}

                {/* FINANCIAL TAB */}
                {activeTab === 'FINANCIAL' && (
                  <>
                  {/* Financials */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-md p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-[#00E676]">
                         <Banknote size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">Financeiro</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Valor do Serviço (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={financials.totalValue || ''}
                          onChange={e => {
                            const newTotal = parseFloat(e.target.value) || 0;
                            setFinancials({
                              ...financials, 
                              totalValue: newTotal,
                              amountPaid: financials.paymentStatus === 'Total' ? newTotal : financials.amountPaid
                            });
                          }}
                          className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-3 text-lg font-semibold text-white focus:outline-none focus:border-[#00E676] transition-colors"
                          placeholder="0,00"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Status do Pagamento</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Pendente', 'Parcial', 'Total'].map(status => (
                            <button
                              key={status}
                              onClick={() => {
                                const newAmountPaid = status === 'Total' 
                                  ? financials.totalValue 
                                  : (status === 'Pendente' ? 0 : financials.amountPaid);
                                  
                                setFinancials({
                                  ...financials, 
                                  paymentStatus: status as Order['financials']['paymentStatus'],
                                  amountPaid: newAmountPaid
                                });
                              }}
                              className={`py-2 text-xs font-medium rounded-sm border transition-colors ${
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
                                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors"
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
                              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                            >
                              <option value="">Selecione...</option>
                              <option value="Dinheiro">Dinheiro</option>
                              <option value="PIX">PIX</option>
                              <option value="Débito">Débito</option>
                              <option value="Crédito">Crédito</option>
                              <option value="Link">Link</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                  
                  <div className="flex justify-between mt-4">
                    <button onClick={() => setActiveTab('SERVICE')} className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-6 py-3 rounded-sm font-bold transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                      &larr; Voltar
                    </button>
                    <button onClick={() => setActiveTab('SIGNATURE')} className="bg-[#00E676] hover:bg-[#00C853] text-black px-6 py-3 rounded-sm font-bold transition-all shadow-lg text-xs uppercase tracking-widest flex items-center gap-2">
                      Assinar OS &rarr;
                    </button>
                  </div>
                </>
                )}

                {/* SIGNATURE TAB */}
                {activeTab === 'SIGNATURE' && (
                  <>
                  {/* Signatures */}
                  <section className="bg-[#141414] border border-zinc-800 rounded-md p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-[#00E676]">
                         <Pencil size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">Assinaturas</h3>
                    </div>
                    
                      {/* Signature Mode Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 1 - Digital */}
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureMode('digital');
                            setSignatures(prev => ({ ...prev, mode: 'digital', isManual: false }));
                          }}
                          className={`p-4 rounded-sm border transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${
                            signatureMode === 'digital'
                              ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm' 
                              : 'bg-[#0A0A0A] border-zinc-800 text-zinc-500 hover:border-zinc-700'
                          }`}
                        >
                           <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all ${signatureMode === 'digital' ? 'bg-zinc-900 text-[#00E676] shadow-inner' : 'bg-zinc-900/50 text-zinc-600 group-hover:text-zinc-400'}`}>
                              <Smartphone size={20} />
                           </div>
                           <div className="text-center relative z-10">
                              <h4 className={`text-[9px] uppercase font-black tracking-widest ${signatureMode === 'digital' ? 'text-white' : 'text-zinc-500'}`}>Digital</h4>
                              <p className="text-[8px] font-bold uppercase tracking-tight text-zinc-600 mt-0.5">Na tela</p>
                           </div>
                        </button>

                        {/* 2 - Via Link (WhatsApp) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureMode('remote');
                            setSignatures(prev => ({ ...prev, mode: 'remote', isManual: false }));
                            // Prompt for technician signature immediately as requested
                            // This will be handled by the effect or conditional rendering below
                          }}
                          className={`p-4 rounded-sm border transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${
                            signatureMode === 'remote'
                              ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm' 
                              : 'bg-[#0A0A0A] border-zinc-800 text-zinc-500 hover:border-zinc-700'
                          }`}
                        >
                           <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all ${signatureMode === 'remote' ? 'bg-zinc-900 text-[#00E676] shadow-inner' : 'bg-zinc-900/50 text-zinc-600 group-hover:text-zinc-400'}`}>
                              <MessageCircle size={20} />
                           </div>
                           <div className="text-center relative z-10">
                              <h4 className={`text-[9px] uppercase font-black tracking-widest ${signatureMode === 'remote' ? 'text-white' : 'text-zinc-500'}`}>Via WhatsApp</h4>
                              <p className="text-[8px] font-bold uppercase tracking-tight text-zinc-600 mt-0.5">Link Remoto</p>
                           </div>
                        </button>

                        {/* 3 - Manual */}
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureMode('manual');
                            setSignatures(prev => ({ ...prev, mode: 'manual', isManual: true }));
                          }}
                          className={`p-4 rounded-sm border transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${
                            signatureMode === 'manual'
                              ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm' 
                              : 'bg-[#0A0A0A] border-zinc-800 text-zinc-500 hover:border-zinc-700'
                          }`}
                        >
                           <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all ${signatureMode === 'manual' ? 'bg-zinc-900 text-blue-400 shadow-inner' : 'bg-zinc-900/50 text-zinc-600 group-hover:text-zinc-400'}`}>
                              <Pencil size={20} />
                           </div>
                           <div className="text-center relative z-10">
                              <h4 className={`text-[9px] uppercase font-black tracking-widest ${signatureMode === 'manual' ? 'text-white' : 'text-zinc-500'}`}>Manual</h4>
                              <p className="text-[8px] font-bold uppercase tracking-tight text-zinc-600 mt-0.5">Papel Físico</p>
                           </div>
                        </button>
                      </div>

                      {signatureMode === 'digital' ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
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
                      ) : signatureMode === 'remote' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="p-6 text-center bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-sm">
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed mb-4">
                              Ao escolher via WhatsApp, você deve assinar como técnico primeiro. Após salvar, a OS será criada e você poderá enviar o link para o cliente.
                            </p>
                            <SignaturePad 
                              title="Assinatura do Técnico" 
                              autoOpen={signatureMode === 'remote' && !signatures.technician}
                              onSave={(dataUrl) => {
                                const updatedSigs = { ...signatures, technician: dataUrl };
                                setSignatures(updatedSigs);
                                // Passa a assinatura diretamente para evitar closure stale no estado
                                setTimeout(() => handleSaveOS(undefined, updatedSigs), 500);
                              }}
                              onClear={() => setSignatures(prev => ({ ...prev, technician: null }))}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-sm animate-in zoom-in-95 duration-300">
                          <div className="w-12 h-12 rounded-sm bg-blue-500/10 flex items-center justify-center text-blue-400 mx-auto mb-3">
                             <Pencil size={24} />
                          </div>
                          <div>
                            <h4 className="text-white font-black uppercase tracking-widest text-[10px]">Assinatura Manual</h4>
                            <p className="text-[9px] text-zinc-500 mt-1 max-w-[240px] mx-auto font-bold uppercase tracking-tight leading-relaxed">
                              O cliente deverá assinar o documento físico após a impressão da Ordem de Serviço.
                            </p>
                          </div>
                        </div>
                      )}
                    </section>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-6 py-4 border-t border-zinc-800/50 gap-4">
                    <button onClick={() => setActiveTab('FINANCIAL')} className="w-full sm:w-auto bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-6 py-3 rounded-sm font-bold transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                      &larr; Voltar
                    </button>

                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto bg-zinc-900/50 p-1.5 rounded-md border border-white/5">
                      {/* Communication Group */}
                      <div className="flex items-center bg-black/40 rounded-sm p-1 border border-white/5 gap-1">
                        <button 
                          onClick={() => {
                            if (!selectedCustomer?.whatsapp) {
                              onShowToast('Cliente sem WhatsApp cadastrado');
                              return;
                            }
                            const osNumberFormatted = (localOrder ? localOrder.osNumber : osSettings.nextOsNumber).toString().padStart(4, '0');
                            const orderId = localOrder?.id || '';
                            
                            const template = osSettings.whatsappMessages?.['Entrada Registrada'] || 
                              `Olá, [nome_cliente]! 👋\nSua OS [numero_os] foi registrada com sucesso.\nAcompanhe por aqui: [link_os]\n\n[nome_assistencia]`;
                            
                            const portalUrl = companySettings.publicSlug 
                              ? `${window.location.origin}/${companySettings.publicSlug}/${orderId}`
                              : `${window.location.origin}/os/${orderId}`;

                            const message = template
                              .replace(/\\n/g, '\n')
                              .replace(/\[nome_cliente\]/g, selectedCustomer.name)
                              .replace(/{cliente}/g, selectedCustomer.name)
                              .replace(/\[numero_os\]/g, osNumberFormatted)
                              .replace(/{os}/g, osNumberFormatted)
                              .replace(/\[marca\]/g, equipment.brand)
                              .replace(/\[modelo\]/g, equipment.model)
                              .replace(/\[defeito\]/g, defect)
                              .replace(/\[status\]/g, localOrder?.status || 'Entrada')
                              .replace(/\[data_entrada\]/g, new Date().toLocaleDateString('pt-BR'))
                              .replace(/\[link_os\]/g, portalUrl)
                              .replace(/{link}/g, portalUrl)
                              .replace(/\[nome_assistencia\]/g, companySettings.name || 'Servyx')
                              .replace(/{empresa}/g, companySettings.name || 'Servyx');

                            setWhatsappModal({ isOpen: true, message, customerPhone: selectedCustomer.whatsapp });
                          }}
                          className="px-3 h-8 flex items-center gap-2 rounded-sm text-emerald-400 hover:bg-emerald-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </button>
                        <button 
                          onClick={() => {
                            if (!selectedCustomer?.email) {
                              onShowToast('Cliente sem email cadastrado');
                              return;
                            }
                            window.location.href = `mailto:${selectedCustomer.email}`;
                          }}
                          className="px-3 h-8 flex items-center gap-2 rounded-sm text-blue-400 hover:bg-blue-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                          <Mail size={14} />
                          Email
                        </button>
                      </div>

                      {/* Printing Group */}
                      <div className="flex items-center bg-black/40 rounded-sm p-1 border border-white/5 gap-1">
                        <button 
                          onClick={() => setPrintMode('a4')}
                          className="px-3 h-8 flex items-center gap-2 rounded-sm text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                          <Printer size={14} />
                          A4
                        </button>
                        <button 
                          onClick={() => setPrintMode('thermal')}
                          className="px-3 h-8 flex items-center gap-2 rounded-sm text-orange-400/80 hover:text-orange-400 transition-all text-[10px] font-black uppercase tracking-widest border-l border-white/5"
                        >
                          <Printer size={14} />
                          Cupom
                        </button>
                      </div>

                      {localOrder && ['Pronto', 'Entregue'].includes(localOrder.status) && (
                        <div className="flex items-center bg-black/40 rounded-sm p-1 border border-white/5 gap-1">
                          <button 
                            onClick={() => setPrintMode('warranty')}
                            className="px-3 h-8 flex items-center gap-2 rounded-sm text-emerald-500 hover:bg-emerald-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                            <ShieldCheck size={14} />
                            Garantia A4
                          </button>
                          <button 
                            onClick={() => setPrintMode('warranty-thermal')}
                            className="px-3 h-8 flex items-center gap-2 rounded-sm text-[#00E676] hover:bg-[#00E676]/10 transition-all text-[10px] font-black uppercase tracking-widest border-l border-white/5"
                          >
                            <ShieldCheck size={14} />
                            Garantia Cupom
                          </button>
                        </div>
                      )}

                      <button 
                        onClick={() => handleSaveOS()}
                        disabled={isSaving}
                        className="px-8 h-10 rounded-sm bg-[#00E676] hover:bg-[#00C853] text-black font-black text-[11px] uppercase tracking-[0.15em] transition-all shadow-xl shadow-[#00E676]/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar OS
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="pb-8" />
            </div>
          </motion.div>
        )}
      </div>
    </main>

      <AnimatePresence>
        {/* Actions Footer Removed - Buttons moved to Header */}
      </AnimatePresence>

      <CameraCapture 
        isOpen={isCameraModalOpen} 
        onClose={() => setIsCameraModalOpen(false)} 
        onCapture={handleCapturePhoto} 
      />

      <DocumentScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onCapture={handleCaptureScan} 
      />

      <AnimatePresence>
        {isScanReminderOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl p-8"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-md flex items-center justify-center mx-auto mb-6">
                 <Camera size={40} className="text-[#00E676]" />
              </div>

              <h3 className="text-2xl font-black text-white text-center uppercase italic tracking-tighter mb-3">
                 Digitalizar OS Assinada?
              </h3>
              <p className="text-zinc-400 text-center text-sm font-medium leading-relaxed mb-8">
                 Como você escolheu a **assinatura manual**, é importante digitalizar o documento assinado pelo cliente para segurança e visualização posterior no sistema.
              </p>

              <div className="flex flex-col gap-3">
                 <button 
                   onClick={() => {
                     setIsScanReminderOpen(false);
                     setIsScannerOpen(true);
                   }}
                   className="w-full py-4 bg-[#00E676] hover:bg-[#00C853] text-black font-black rounded-md transition-all shadow-xl shadow-[#00E676]/20 active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                 >
                   <Camera size={18} />
                   Escanear Agora
                 </button>
                 <button 
                   onClick={() => setIsScanReminderOpen(false)}
                   className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold rounded-md transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                 >
                   Lembrar Depois / Cancelar
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      </div>

      {/* ===== CONTAINERS DE IMPRESSÃO ===== */}
      {/* Usamos Portal para que fiquem fora da estrutura principal do app e não sejam ocultados pelo display:none do CSS de impressão */}
      {selectedCustomer && typeof document !== 'undefined' && createPortal(
        <>
          <div className="print-a4-container" key={`nova-os-a4-${selectedCustomer.id}`}>
            <OrderPrintTemplate 
              order={printOrder}
              customer={selectedCustomer}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>

          <div className="print-thermal-container" key={`nova-os-thermal-${selectedCustomer.id}`}>
            <ThermalReceiptTemplate 
              order={printOrder}
              customer={selectedCustomer}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>

          <div className="print-warranty-container" key={`nova-os-warranty-${selectedCustomer.id}`}>
            <WarrantyPrintTemplate 
              order={warrantyOrder}
              customer={selectedCustomer}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>
          <div className="warranty-thermal-container" key={`nova-os-warranty-thermal-${selectedCustomer.id}`}>
            <WarrantyThermalTemplate 
              order={warrantyOrder}
              customer={selectedCustomer}
              companySettings={companySettings}
              osSettings={osSettings}
            />
          </div>
        </>,
        document.body
      )}

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
              className="bg-[#141414] border border-zinc-800 rounded-md w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Link de Acompanhamento</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Deseja enviar o link de acompanhamento via WhatsApp para o cliente?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleWhatsappPromptResponse(false)}
                  className="flex-1 py-3 rounded-sm font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Não
                </button>
                <button
                  onClick={() => handleWhatsappPromptResponse(true)}
                  className="flex-1 py-3 rounded-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
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
              className="bg-[#141414] border border-zinc-800 rounded-md w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
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
      </div>
    </>
  );
}

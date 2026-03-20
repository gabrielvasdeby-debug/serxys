'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/app/supabase';
import { Order } from '@/app/types';
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
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_CONFIG: Record<string, { icon: React.ElementType, color: string, bg: string, label: string }> = {
  'Entrada Registrada': { icon: Inbox, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Entrada Registrada' },
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
  'Entrada Registrada',
  'Em Análise Técnica',
  'Aguardando Aprovação',
  'Em Manutenção',
  'Reparo Concluído',
  'Equipamento Retirado'
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
  city?: string;
  state?: string;
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

  useEffect(() => {
    if (!companySlug || !osNumberStr) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Company by Slug or History
        const { data: companyData, error: companyError } = await supabase
          .from('company_settings')
          .select('*')
          .or(`public_slug.eq.${companySlug},slug_history.cs.{${companySlug}}`)
          .single();

        if (companyError || !companyData) {
          setError('Empresa não encontrada.');
          setLoading(false);
          return;
        }

        const mappedCompany: Company = {
          ...companyData,
          logoUrl: companyData.logo_url,
          publicSlug: companyData.public_slug
        };
        setCompany(mappedCompany);

        // 2. Fetch Order by Number and Company
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('company_id', mappedCompany.id)
          .eq('os_number', parseInt(osNumberStr, 10))
          .single();

        if (orderError || !orderData) {
          setError('Ordem de Serviço não encontrada nesta assistência.');
          setLoading(false);
          return;
        }

        // 3. Fetch Customer info (only name for display)
        const { data: customerData } = await supabase
          .from('customers')
          .select('name')
          .eq('id', orderData.customer_id)
          .single();

        setOrder({
          ...orderData,
          osNumber: orderData.os_number,
          createdAt: orderData.created_at,
          updatedAt: orderData.updated_at,
          history: orderData.history || []
        } as Order);
        
        setCustomer(customerData);

      } catch (err: any) {
        console.error('Portal error:', err);
        setError('Erro ao carregar o portal. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companySlug, osNumberStr]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-[#00E676] border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(0,230,118,0.2)]"></div>
        <p className="text-[#00E676] font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Acessando Portal SEVYX</p>
      </div>
    );
  }

  if (error || !order || !company) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-[#141414] border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Portal indisponível</h1>
          <p className="text-zinc-400 mb-8 leading-relaxed font-medium">{error || 'Informações não encontradas.'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG['Entrada Registrada'];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#00E676]/30">
      {/* Decorative Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#00E676]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Company Header Card */}
        <header className="bg-[#141414]/80 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-24 h-24 bg-black rounded-2xl border border-zinc-800 flex items-center justify-center overflow-hidden p-2">
              {company.logoUrl ? (
                <Image src={company.logoUrl} alt={company.name} fill className="object-contain p-2" />
              ) : (
                <Building2 size={40} className="text-zinc-700" />
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-black tracking-tighter mb-1 uppercase bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                {company.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest mt-3">
                {company.whatsapp && (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <MessageCircle size={14} />
                    {company.whatsapp}
                  </span>
                )}
                {company.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {company.city} - {company.state}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-center md:text-right bg-black/40 px-8 py-5 rounded-[2rem] border border-white/5 backdrop-blur-sm self-stretch md:self-auto flex flex-col justify-center">
            <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-[0.3em] mb-1">CÓDIGO DA Ordem</p>
            <p className="text-3xl font-black text-[#00E676] font-mono tracking-tighter italic">#{order.osNumber.toString().padStart(4, '0')}</p>
          </div>
        </header>

        {/* Status Spotlight */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#141414]/80 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group"
        >
          <div className={`absolute -top-24 -right-24 w-64 h-64 ${currentStatusConfig.bg} opacity-10 blur-[80px] rounded-full group-hover:opacity-20 transition-opacity duration-1000`}></div>
          
          <div className="flex flex-col items-center text-center space-y-8 relative z-10">
            <div className={`w-24 h-24 rounded-3xl ${currentStatusConfig.bg} flex items-center justify-center ${currentStatusConfig.color} shadow-2xl shadow-current/20 animate-pulse`}>
              <StatusIcon size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em]">Situação do Serviço</p>
              <h2 className={`text-4xl md:text-5xl font-black tracking-tighter uppercase ${currentStatusConfig.color}`}>
                {order.status}
              </h2>
              <p className="text-sm font-medium text-zinc-400">
                Última atualização em {new Date(order.updatedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Warranty Alert */}
          {order.completionData?.warrantyDays && (
             <div className="mt-12 flex justify-center">
                {(() => {
                  const startDate = order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt);
                  const expiryDate = new Date(startDate);
                  expiryDate.setDate(expiryDate.getDate() + (order.completionData.warrantyDays || 0));
                  const isExpired = new Date() > expiryDate;

                  return (
                    <div className={`flex items-center gap-5 px-8 py-5 rounded-[2rem] border-2 ${
                      isExpired ? 'bg-red-500/5 border-red-500/10 text-red-500' : 'bg-teal-500/5 border-teal-500/10 text-teal-400'
                    }`}>
                      <ShieldCheck size={28} />
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">{isExpired ? 'Certificado de Garantia Expirado' : 'Equipamento em Garantia'}</p>
                        <p className="text-lg font-black tracking-tight">
                          {isExpired ? 'Vencido em: ' : 'Cobertura até: '}
                          {expiryDate.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  );
                })()}
             </div>
          )}

          {/* Tracker bar */}
          <div className="mt-16 relative">
            <div className="absolute top-6 left-0 right-0 h-1.5 bg-zinc-900 rounded-full"></div>
            <div className="flex justify-between relative z-10">
              {STATUS_STEPS.map((step, idx) => {
                const stepIdx = STATUS_STEPS.indexOf(order.status);
                const isCompleted = stepIdx >= idx || (order.status === 'Reparo Concluído' && idx <= 4) || (order.status === 'Equipamento Retirado' && idx <= 5);
                const isCurrent = order.status === step;
                
                return (
                  <div key={step} className="flex flex-col items-center gap-4 group/step">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 ${
                      isCompleted ? 'bg-[#00E676] text-black shadow-[0_0_25px_rgba(0,230,118,0.4)]' : 'bg-zinc-900 text-zinc-700'
                    } ${isCurrent ? 'scale-125 ring-4 ring-[#00E676]/20' : ''}`}>
                      {isCompleted ? <CheckIcon size={24} strokeWidth={3} /> : <div className="w-2.5 h-2.5 bg-current rounded-full"></div>}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-tighter text-center max-w-[70px] transition-colors ${
                      isCompleted ? 'text-white' : 'text-zinc-700'
                    }`}>
                      {step.split(' ').join('\n')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          {/* Equipment Details */}
          <section className="bg-[#141414]/60 backdrop-blur-md border border-zinc-800/50 rounded-[2.5rem] p-10 hover:border-zinc-700/50 transition-all">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Smartphone size={24} />
              </div>
              <h3 className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em]">O Equipamento</h3>
            </div>
            
            <div className="space-y-6">
              <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2">Marca/Modelo</p>
                <p className="text-xl font-black tracking-tight">{order.equipment.brand} {order.equipment.model}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Identificação</p>
                  <p className="text-xs font-mono font-bold text-zinc-300">{order.equipment.serial || 'NÃO INFORMADO'}</p>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Cor</p>
                  <p className="text-xs font-black text-zinc-300 uppercase">{order.equipment.color || '---'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Service Box */}
          <section className="bg-[#141414]/60 backdrop-blur-md border border-zinc-800/50 rounded-[2.5rem] p-10 hover:border-zinc-700/50 transition-all">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Wrench size={24} />
              </div>
              <h3 className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em]">O Serviço</h3>
            </div>
            
            <div className="space-y-6">
              <div className="bg-black/20 p-6 rounded-2xl border border-white/5 min-h-[140px]">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3 italic">Relato do Defeito</p>
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">"{order.defect}"</p>
              </div>
              
              <div className="flex items-center gap-3 ml-2">
                <div className="w-2 h-2 rounded-full bg-[#00E676]"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Registrado em {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* History Timeline */}
        <section className="bg-[#141414]/60 backdrop-blur-md border border-zinc-800/50 rounded-[2.5rem] p-10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <History size={24} />
              </div>
              <h3 className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em]">Diário do Reparo</h3>
            </div>
            <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-4 py-2 rounded-full tracking-widest">{order.history.length} EVENTOS</span>
          </div>

          <div className="space-y-10 relative">
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-zinc-800 via-zinc-800/50 to-transparent"></div>
            
            {order.history.slice().reverse().map((event, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={idx} 
                className="flex gap-10 relative"
              >
                <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center relative z-10 shrink-0 ${
                  idx === 0 ? 'bg-[#00E676] border-[#00E676] text-black shadow-[0_0_15px_rgba(0,230,118,0.3)]' : 'bg-black border-zinc-800 text-zinc-700'
                }`}>
                  <Clock size={16} strokeWidth={idx === 0 ? 3 : 2} />
                </div>
                <div className="flex-1 space-y-2 pt-1 border-b border-zinc-800/30 pb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-lg font-black tracking-tighter text-white uppercase">{event.description}</p>
                    <time className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-lg">
                      {new Date(event.date).toLocaleString('pt-BR')}
                    </time>
                  </div>
                  {event.user && (
                    <p className="text-[9px] font-black text-[#00E676] uppercase tracking-[0.2em] opacity-80 decoration-dotted underline underline-offset-4 decoration-[#00E676]/30">
                      Responsável: {event.user}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer info */}
        <footer className="text-center pt-8 pb-12 opacity-50 space-y-4">
          <div className="flex items-center justify-center gap-6 grayscale opacity-50">
             <span className="text-[10px] font-black tracking-[0.3em]">PRIVACIDADE PROTEGIDA</span>
             <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
             <span className="text-[10px] font-black tracking-[0.3em]">SISTEMA SEVYX</span>
          </div>
          <p className="text-[9px] font-medium text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Este portal é para fins de consulta pública de Ordens de Serviço contratadas junto à {company.name}. Todos os direitos reservados.
          </p>
        </footer>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0A0A0A;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1A1A1A;
          border-radius: 10px;
        }
      `}</style>
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

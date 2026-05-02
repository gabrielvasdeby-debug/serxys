import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, Cake, MessageCircle, Star, 
  Calendar, CheckCircle2, History, Smartphone, User, 
  Send, ExternalLink, Filter, ChevronRight, Check
} from 'lucide-react';
import { Customer } from './ClientesModule';
import { Order } from '../types';
import { format, isSameDay, isWithinInterval, startOfWeek, endOfWeek, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RelacionamentoModuleProps {
  profile: {
    id: string;
    name: string;
    type: string;
    role: string;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
  customers: Customer[];
  orders: Order[];
  osSettings: {
    whatsappMessages: Record<string, string>;
  };
  dismissedNotifications: any[];
  onDismissNotification: (type: 'BIRTHDAY' | 'FOLLOW_UP', entityId: string, period: string) => void;
}

export default function RelacionamentoModule({ 
  profile, 
  onBack, 
  onShowToast, 
  customers, 
  orders,
  osSettings,
  dismissedNotifications,
  onDismissNotification
}: RelacionamentoModuleProps) {
  const [activeTab, setActiveTab] = useState<'BIRTHDAYS' | 'FOLLOW_UP'>('BIRTHDAYS');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab 1: Birthdays of the week
  const birthdayCustomers = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });

    return customers.filter(customer => {
      if (!customer.birthDate) return false;
      
      const bDay = parseISO(customer.birthDate);
      const clientMonth = bDay.getMonth();
      const clientDay = bDay.getDate();
      const thisYearBirthday = new Date(today.getFullYear(), clientMonth, clientDay);
      
      const isWithin = isWithinInterval(thisYearBirthday, { start, end }) ||
                       (isSameDay(thisYearBirthday, start) || isSameDay(thisYearBirthday, end));
      
      if (!isWithin) return false;

      // Filter out dismissed for this year
      const isDismissed = dismissedNotifications.some(d => 
        d.type === 'BIRTHDAY' && d.entity_id === customer.id && d.period === today.getFullYear().toString()
      );

      return !isDismissed;
    }).sort((a, b) => {
       const dA = parseISO(a.birthDate!).getDate();
       const dB = parseISO(b.birthDate!).getDate();
       return dA - dB;
    });
  }, [customers, dismissedNotifications]);

  // Tab 2: Follow-up (Yesterday's "Equipamento Retirado")
  const followUpOrders = useMemo(() => {
    const yesterday = subDays(new Date(), 1);
    
    return orders.filter(order => {
      if (order.status !== 'Equipamento Retirado') return false;
      
      const statusDate = parseISO(order.updatedAt);
      const isYesterday = isSameDay(statusDate, yesterday);
      
      if (!isYesterday) return false;

      const isDismissed = dismissedNotifications.some(d => 
        d.type === 'FOLLOW_UP' && d.entity_id === order.id
      );

      return !isDismissed;
    });
  }, [orders, dismissedNotifications]);

  const sendBirthdayMessage = (customer: Customer) => {
    if (profile.type === 'Técnico') {
      onShowToast('Apenas administradores e atendentes podem enviar mensagens');
      return;
    }
    
    if (!customer.whatsapp) {
      onShowToast('Cliente sem WhatsApp cadastrado');
      return;
    }

    const template = osSettings.whatsappMessages?.['birthday'] || 
      "Olá [nome], a equipe da SERVYX deseja um feliz aniversário! 🎉 Preparamos um mimo especial para você. Conte conosco sempre!";
    
    const message = template.replace(/\[nome\]/g, customer.name);
    let decodedPhone = customer.whatsapp.replace(/\D/g, '');
    if (!decodedPhone.startsWith('55')) decodedPhone = `55${decodedPhone}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${decodedPhone}&text=${encodeURIComponent(message)}`;
    
    // Auto-dismiss
    onDismissNotification('BIRTHDAY', customer.id, new Date().getFullYear().toString());
    
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = 'wa';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendFollowUpMessage = (order: Order) => {
    if (profile.type === 'Técnico') {
      onShowToast('Apenas administradores e atendentes podem enviar mensagens');
      return;
    }

    const customer = customers.find(c => c.id === order.customerId);
    if (!customer?.whatsapp) {
      onShowToast('Cliente sem WhatsApp cadastrado');
      return;
    }

    const template = osSettings.whatsappMessages?.['follow_up'] || 
      "Olá [nome], tudo bem? Estamos entrando em contato para saber se o serviço realizado no seu aparelho está funcionando perfeitamente. Se puder, deixe uma avaliação para nossa loja no Google. Isso nos ajuda muito!";
    
    const message = template.replace(/\[nome\]/g, customer.name);
    let decodedPhone = customer.whatsapp.replace(/\D/g, '');
    if (!decodedPhone.startsWith('55')) decodedPhone = `55${decodedPhone}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${decodedPhone}&text=${encodeURIComponent(message)}`;
    
    // Auto-dismiss
    onDismissNotification('FOLLOW_UP', order.id, '');
    
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = 'wa';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#141414]/80 backdrop-blur-md border-b border-zinc-800 p-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="text-[#00E676]" size={24} />
                Relacionamento
              </h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Marketing & Pós-venda</p>
            </div>
          </div>

          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('BIRTHDAYS')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'BIRTHDAYS' ? 'bg-zinc-800 text-[#00E676] shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Cake size={18} />
              Aniversariantes
            </button>
            <button
              onClick={() => setActiveTab('FOLLOW_UP')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'FOLLOW_UP' ? 'bg-zinc-800 text-[#00E676] shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <History size={18} />
              Pós-venda
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {activeTab === 'BIRTHDAYS' ? (
          <div className="space-y-6">
            <div className="bg-[#141414] border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-[#00E676]/10 text-[#00E676] rounded-full flex items-center justify-center">
                <Cake size={40} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold text-white mb-2">Aniversariantes da Semana</h2>
                <p className="text-zinc-400 text-sm">
                  Existem <strong>{birthdayCustomers.length}</strong> clientes soprando velinhas nesta semana. 
                  Aproveite para fidelizar com uma mensagem especial!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {birthdayCustomers.map((customer, idx) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={customer.id}
                  className="bg-[#141414] border border-zinc-800 rounded-2xl p-5 hover:border-[#00E676]/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                      <Image 
                        src={`https://picsum.photos/seed/${customer.id}/100/100`} 
                        alt={customer.name} 
                        width={48} 
                        height={48} 
                        className="object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDismissNotification('BIRTHDAY', customer.id, new Date().getFullYear().toString())}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-white rounded-lg transition-colors"
                        title="Marcar como visto"
                      >
                        <Check size={14} />
                      </button>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#00E676] uppercase tracking-widest bg-[#00E676]/10 px-2 py-1 rounded-md">
                          {format(parseISO(customer.birthDate!), 'dd/MM', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-white mb-1">{customer.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                    <ExternalLink size={12} />
                    {customer.whatsapp || customer.phone || 'Sem contato'}
                  </div>

                  <button
                    onClick={() => sendBirthdayMessage(customer)}
                    className="w-full py-2.5 bg-[#00E676]/10 hover:bg-[#00E676] text-[#00E676] hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-[#00E676]/20"
                  >
                    <Send size={14} />
                    Enviar Mensagem de Aniversário
                  </button>
                </motion.div>
              ))}

              {birthdayCustomers.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl">
                  <p className="text-zinc-500 font-medium">Nenhum aniversariante nesta semana.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#141414] border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                <Star size={40} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold text-white mb-2">Pós-venda de Serviços Recentes</h2>
                <p className="text-zinc-400 text-sm">
                  Ordens de serviço retiradas <strong>ontem</strong>. 
                  Verifique se o cliente está satisfeito e peça uma avaliação!
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {followUpOrders.map((order, idx) => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={order.id}
                    className="bg-[#141414] border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 border border-zinc-700">
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OS {order.osNumber}</span>
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase">Retirado</span>
                        </div>
                        <h3 className="font-bold text-white">{customer?.name || 'Cliente Desconhecido'}</h3>
                        <p className="text-xs text-zinc-500">{order.equipment.brand} {order.equipment.model} - {order.service}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <div className="text-right hidden md:block mr-2">
                         <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Retirada em</p>
                         <p className="text-xs font-medium text-zinc-300">{format(parseISO(order.updatedAt), 'dd/MM/yyyy')}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <button
                            onClick={() => onDismissNotification('FOLLOW_UP', order.id, '')}
                            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-white rounded-xl transition-colors"
                            title="Marcar como visto"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => sendFollowUpMessage(order)}
                            className="flex-1 sm:flex-none py-2.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                          >
                            <MessageCircle size={14} />
                            Pós-venda WhatsApp
                          </button>
                       </div>
                    </div>
                  </motion.div>
                );
              })}

              {followUpOrders.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl">
                  <p className="text-zinc-500 font-medium">Nenhum aparelho foi retirado ontem.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Image({ src, alt, width, height, className }: { src: string, alt: string, width: number, height: number, className?: string }) {
  return <img src={src} alt={alt} width={width} height={height} className={className} />;
}

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { 
  PlusCircle, 
  Activity, 
  Users, 
  ShieldCheck, 
  Package, 
  Wrench, 
  Calculator, 
  Wallet, 
  Truck, 
  Calendar, 
  Settings, 
  AlertCircle,
  LayoutGrid,
  BarChart2,
  HeadphonesIcon,
  ChevronRight,
  MessageCircle,
  Cake,
  CheckCircle2,
  Check,
  Star,
  X,
  Search,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { Profile, Product, Order, View } from '../types';
import { Customer } from './ClientesModule';

interface DashboardViewProps {
  view: View;
  profile: Profile;
  onNavigate: (module: string) => void;
  onLogout: () => void;
  onSwitchProfile: () => void;
  customers: Customer[];
  products: Product[];
  orders: Order[];
  isCompanyIncomplete: boolean;
  cashSessionsCount: number;
  showTutorial: boolean;
  onDismissTutorial: () => void;
  dismissedNotifications: any[];
  onDismissNotification: (type: 'BIRTHDAY' | 'FOLLOW_UP' | 'OS_SIGNED' | 'BUDGET_APPROVED' | 'BUDGET_REJECTED' | 'STOCK', entityId: string, period: string) => void;
  onOpenSearch: () => void;
  appNotifications: any[];
  onMarkNotificationAsRead: (id: string) => void;
  onClearNotifications: () => void;
}

export default function DashboardView({ 
  view, 
  profile, 
  onNavigate, 
  onLogout,
  onSwitchProfile,
  customers,
  products,
  orders,
  isCompanyIncomplete,
  cashSessionsCount,
  showTutorial,
  onDismissTutorial,
  dismissedNotifications,
  onDismissNotification,
  onOpenSearch,
  appNotifications,
  onMarkNotificationAsRead,
  onClearNotifications
}: DashboardViewProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const onboardingSteps = useMemo(() => {
    return [
      { id: 'company', label: 'Configurações da empresa', completed: !isCompanyIncomplete, moduleId: 'ajustes' },
      { id: 'caixa', label: 'Abrir caixa do dia', completed: cashSessionsCount > 0, moduleId: 'caixa' },
      { id: 'product', label: 'Cadastrar primeiro produto', completed: products.length > 0, moduleId: 'produtos' },
      { id: 'first_os', label: 'Criar primeira OS', completed: orders.length > 0, moduleId: 'nova_os' },
    ];
  }, [isCompanyIncomplete, products, orders, cashSessionsCount]);

  const showOnboarding = onboardingSteps.some(s => !s.completed);

  const notifications = useMemo(() => {
    const list: { id: string, type: 'BIRTHDAY' | 'STOCK' | 'ALERT', title: string, message: string, icon: any, color: string, moduleId?: string, isRead?: boolean, originalId?: string }[] = [];
    
    // Low stock
    products.filter(p => p.stock <= p.minStock).forEach(p => {
      const isDismissed = dismissedNotifications.some(d => 
        d.type === 'STOCK' && d.entity_id === p.id && d.period === p.stock.toString()
      );

      if (!isDismissed) {
        list.push({
          id: `stock-${p.id}`,
          type: 'STOCK',
          title: 'Estoque Baixo',
          message: `${p.name} está com apenas ${p.stock} unidades.`,
          icon: Package,
          color: 'text-red-400',
          moduleId: 'produtos'
        });
      }
    });

    // Birthdays today
    const today = new Date();
    const todayStr = format(today, 'MM-dd');
    const thisYear = today.getFullYear().toString();

    customers.filter(c => c.birthDate && c.birthDate.substring(5) === todayStr).forEach(c => {
      const isDismissed = dismissedNotifications.some(d => 
        d.type === 'BIRTHDAY' && d.entity_id === c.id && d.period === thisYear
      );

      if (!isDismissed) {
        list.push({
          id: `bday-${c.id}`,
          type: 'BIRTHDAY',
          title: 'Aniversário Hoje!',
          message: `${c.name} está fazendo aniversário hoje. Envie um mimo!`,
          icon: Cake,
          color: 'text-[#00E676]',
          moduleId: 'relacionamento'
        });
      }
    });

    // Review reminder (Retirada Yesterday)
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    orders.filter(o => o.status === 'Equipamento Retirado').forEach(o => {
      const withdrawalEvent = [...o.history].reverse().find(h => 
        h.description.toLowerCase().includes('retirado') || h.description.toLowerCase().includes('entregue')
      );
      
      if (withdrawalEvent && withdrawalEvent.date.startsWith(yesterdayStr)) {
        const isDismissed = dismissedNotifications.some(d => 
          d.type === 'FOLLOW_UP' && d.entity_id === o.id
        );

        if (!isDismissed) {
          const cust = customers.find(c => c.id === o.customerId);
          list.push({
            id: `review-${o.id}`,
            type: 'ALERT',
            title: 'Pedir Avaliação',
            message: `O aparelho da(o) ${cust?.name || 'cliente'} (OS ${o.osNumber}) foi retirado ontem. Peça uma avaliação no Google!`,
            icon: Star,
            color: 'text-amber-400',
            moduleId: 'relacionamento'
          });
        }
      }
    });

    // Global App Notifications (Signatures, Approvals etc from useServyxApp)
    appNotifications.filter(n => !n.isRead).forEach(n => {
      list.push({
        id: `global-${n.id}`,
        type: 'ALERT',
        title: n.title,
        message: n.message,
        icon: n.type === 'SUCCESS' ? CheckCircle2 : n.type === 'DANGER' ? AlertCircle : Activity,
        color: n.type === 'SUCCESS' ? 'text-emerald-400' : n.type === 'DANGER' ? 'text-red-400' : 'text-blue-400',
        moduleId: n.moduleId,
        isRead: n.isRead,
        originalId: n.id
      });
    });

    return list;
  }, [products, customers, orders, dismissedNotifications, appNotifications]);



  const allModules = [
    { id: 'nova_os', name: 'Nova OS', subtitle: 'CRIAR TICKET', icon: PlusCircle, color: 'text-[#00E676]', bg: 'bg-[#00E676]/10', shadow: 'shadow-[0_0_15px_rgba(0,230,118,0.2)]' },
    { id: 'status_os', name: 'Status OS', subtitle: 'MONITORAR FLUXO', icon: Activity, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'clientes', name: 'Clientes', subtitle: 'BANCO DE DADOS CRM', icon: Users, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'garantia', name: 'Garantia', subtitle: 'GARANTIAS', icon: ShieldCheck, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'produtos', name: 'Produtos', subtitle: 'CONTROLE DE ESTOQUE', icon: Package, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'servicos', name: 'Serviços', subtitle: 'CATÁLOGO DE SERVIÇOS', icon: Wrench, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'caixa', name: 'Caixa', subtitle: 'CAIXA DIÁRIO', icon: Calculator, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'financeiro', name: 'Financeiro', subtitle: 'CONTABILIDADE', icon: Wallet, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'fornecedores', name: 'Fornecedores', subtitle: 'FORNECEDORES', icon: Truck, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'agenda', name: 'Agenda Técnico', subtitle: 'AGENDA DO TÉCNICO', icon: Calendar, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'relacionamento', name: 'Relacionamento', subtitle: 'MENSAGENS & CRM', icon: MessageCircle, color: 'text-white', bg: 'bg-[#222222]' },
    { id: 'relatorios', name: 'Relatórios', subtitle: 'ANÁLISE DE DADOS', icon: BarChart2, color: 'text-white', bg: 'bg-[#222222]' },
  ];

  const modules = allModules.filter(mod => {
    if (mod.id === 'financeiro') {
      return profile.type === 'ADM' || profile.role === 'ADM';
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-zinc-800/50 bg-[#0a0a0a] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Servyx Logo" className="servyx-logo drop-shadow-md" />
            <div className="hidden sm:block">
              <p className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] uppercase leading-none">Painel Principal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onOpenSearch}
              className="w-10 h-10 rounded-full border border-zinc-800 bg-[#1A1A1A] text-zinc-400 hover:text-[#00E676] hover:border-[#00E676]/50 flex items-center justify-center transition-all group"
              title="Busca Global (Ctrl+K)"
            >
              <Search size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            <div className="relative">
              <motion.button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                animate={notifications.length > 0 && !isNotificationsOpen ? {
                  scale: [1, 1.1, 1],
                  borderColor: ["rgba(249, 115, 22, 0.4)", "rgba(249, 115, 22, 1)", "rgba(249, 115, 22, 0.4)"]
                } : {}}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all relative ${
                  isNotificationsOpen ? 'bg-amber-500 border-amber-500 text-black' : 'bg-[#1A1A1A] border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {notifications.length > 0 && !isNotificationsOpen && (
                  <div className="absolute -top-1 -right-1 flex items-center justify-center pointer-events-none">
                    {/* Vibrant vibrating pulse */}
                    <motion.div 
                      animate={{ 
                        scale: [1, 2.2, 1], 
                        opacity: [0.6, 0, 0.6],
                        filter: ["blur(4px)", "blur(8px)", "blur(4px)"]
                      }}
                      transition={{ 
                        duration: 1.2, 
                        repeat: Infinity, 
                        ease: "easeOut" 
                      }}
                      className="absolute w-6 h-6 bg-orange-500 rounded-full"
                    />
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.5, 1],
                        backgroundColor: ["#f97316", "#ffedd5", "#f97316"]
                      }}
                      transition={{ 
                        duration: 0.6, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                      className="relative w-3 h-3 bg-orange-600 rounded-full shadow-[0_0_15px_rgba(249,115,22,1)] border-2 border-[#0a0a0a]"
                    />
                  </div>
                )}
                <AlertCircle size={18} />
              </motion.button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-[320px] sm:w-[380px] bg-[#141414] border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                        <h3 className="font-bold text-sm text-zinc-300 uppercase tracking-widest">Notificações</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={onClearNotifications} className="p-1 px-2 hover:bg-white/5 rounded-md text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase">Limpar</button>
                          <span className="bg-[#00E676]/10 text-[#00E676] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {notifications.length} Alertas
                          </span>
                        </div>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-zinc-800/50">
                            {notifications.map((n, i) => {
                              const handleDismiss = (e?: React.MouseEvent) => {
                                if (e) e.stopPropagation();
                                
                                if (n.originalId) {
                                  onMarkNotificationAsRead(n.originalId);
                                } else if (n.id.startsWith('stock-')) {
                                  const entityId = n.id.replace('stock-', '');
                                  const prod = products.find(p => p.id === entityId);
                                  onDismissNotification('STOCK', entityId, prod?.stock.toString() || '0');
                                } else if (n.id.startsWith('bday-')) {
                                  const entityId = n.id.replace('bday-', '');
                                  onDismissNotification('BIRTHDAY', entityId, new Date().getFullYear().toString());
                                } else if (n.id.startsWith('review-')) {
                                  const entityId = n.id.replace('review-', '');
                                  onDismissNotification('FOLLOW_UP', entityId, '');
                                }
                              };

                              return (
                                <div key={n.id} className="relative group">
                                  <button 
                                    onClick={() => {
                                      if (n.moduleId) onNavigate(n.moduleId);
                                      handleDismiss();
                                      setIsNotificationsOpen(false);
                                    }}
                                    className="w-full p-4 hover:bg-zinc-800/30 transition-colors flex gap-4 text-left"
                                  >
                                    <div className={`w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 group-hover:bg-zinc-800 transition-colors ${n.color}`}>
                                      <n.icon size={18} />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-bold text-white text-sm mb-0.5">{n.title}</p>
                                      <p className="text-xs text-zinc-400 leading-relaxed">{n.message}</p>
                                    </div>
                                    <ChevronRight className="text-zinc-600 group-hover:text-zinc-400 self-center" size={16} />
                                  </button>
                                  
                                  <button 
                                    onClick={handleDismiss}
                                    className="absolute top-4 right-10 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-[#00E676] opacity-100 md:opacity-0 group-hover:opacity-100 transition-all z-10 border border-zinc-800 shadow-xl"
                                    title="Dispensar"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
                            <CheckCircle2 size={32} className="text-zinc-800" />
                            <p className="text-sm font-medium">Tudo em ordem por aqui!</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} 
                className={`relative w-10 h-10 rounded-full border-2 overflow-hidden p-0.5 transition-all ${isProfileMenuOpen ? 'border-white ring-4 ring-white/10' : 'border-[#00E676]'}`}
              >
                <div className="w-full h-full rounded-full overflow-hidden relative bg-zinc-800">
                  <Image src={profile.photo} alt={profile.name} fill className="object-cover" referrerPolicy="no-referrer" />
                </div>
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-64 bg-[#141414] border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                        <p className="text-xs font-black text-white uppercase truncate">{profile.name}</p>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{profile.type}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <button 
                          onClick={() => { onSwitchProfile(); setIsProfileMenuOpen(false); }}
                          className="w-full px-4 py-3 flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <Users size={16} />
                          Trocar Perfil
                        </button>
                        <button 
                          onClick={() => { onNavigate('ajustes'); setIsProfileMenuOpen(false); }}
                          className="w-full px-4 py-3 flex items-center gap-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <Settings size={16} />
                          Configurações
                        </button>
                        <div className="h-px bg-zinc-800 mx-2 my-1" />
                        <button 
                          onClick={() => { onLogout(); setIsProfileMenuOpen(false); }}
                          className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <X size={16} />
                          Encerrar Sessão
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-32 overflow-x-hidden">
        {showOnboarding && (
          <div className="mb-8 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E676]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#00E676]/10 transition-all"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <LayoutGrid className="text-[#00E676]" size={24} />
                Primeiro Acesso
              </h2>
              <div className="mb-6">
                <p className="text-white font-black text-lg mb-1">Bem-vindo ao Servyx!</p>
                <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
                  Siga os passos abaixo para configurar seu sistema e começar a gerenciar sua assistência técnica com mais organização, agilidade e eficiência.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(() => {
                  const firstPendingStepId = onboardingSteps.find(s => !s.completed)?.id;
                  
                  return onboardingSteps.map(step => (
                    <button
                      key={step.id}
                      onClick={() => onNavigate(step.moduleId)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                        step.completed 
                          ? 'bg-[#00E676]/5 border-[#00E676]/20' 
                          : step.id === firstPendingStepId
                            ? 'bg-zinc-800 border-[#00E676] animate-pulse' // Simplificado para exemplo, original tinha classe custom
                            : 'bg-zinc-900/50 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        step.completed ? 'bg-[#00E676] text-black' : step.id === firstPendingStepId ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {step.completed ? <Check size={20} strokeWidth={3} /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-600"></div>}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${step.completed || step.id === firstPendingStepId ? 'text-white' : 'text-zinc-400'}`}>{step.label}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                          {step.completed ? 'Concluído' : 'Pendente'}
                        </p>
                      </div>
                      {!step.completed && <ChevronRight className="ml-auto text-zinc-600" size={16} />}
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {modules.map(m => (
            <motion.button 
              key={m.id}
              id={`tour-btn-${m.id}`}
              onClick={() => onNavigate(m.id)}
              whileHover={{ 
                y: -4, 
                borderColor: 'rgba(0, 230, 118, 0.4)',
                backgroundColor: '#222222',
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="bg-[#1A1A1A] border border-zinc-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all text-center aspect-square shadow-xl shadow-black/20 focus:outline-none group"
            >
              <div className={`w-16 h-16 rounded-2xl ${m.bg} flex items-center justify-center ${m.color} transition-all ${m.shadow || ''}`}>
                <m.icon size={28} strokeWidth={2} />
              </div>
              <div>
                <span className="font-bold text-base text-white block mb-1">{m.name}</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{m.subtitle}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </main>
      
      <motion.footer 
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-[#121212]/95 backdrop-blur-2xl flex items-center justify-around px-2 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] sm:hidden" 
        style={{ height: 'calc(4.5rem + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-800 rounded-full mt-1 sm:hidden opacity-50"></div>
        <button 
          onClick={() => onNavigate('relacionamento')}
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${view === 'RELACIONAMENTO' ? 'text-[#00E676]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <MessageCircle size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Relacionamento</span>
        </button>
        <button 
          onClick={() => onNavigate('relatorios')}
          className={`flex flex-col items-center gap-1 transition-colors px-4 py-2 ${view === 'RELATORIOS' ? 'text-[#00E676]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <BarChart2 size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Relatórios</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors px-4 py-2">
          <HeadphonesIcon size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Suporte</span>
        </button>
        <button id="tour-btn-ajustes" onClick={() => onNavigate('ajustes')} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors px-4 py-2">
          <Settings size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Ajustes</span>
        </button>
      </motion.footer>

    </div>
  );
}

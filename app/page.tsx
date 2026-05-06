'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Activity, AlertCircle, Bell, Trash2, X, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

// Modules
import ClientesModule from './components/ClientesModule';
import OrdemServicoModule from './components/OrdemServicoModule';
import StatusOsModule from './components/StatusOsModule';
import CaixaModule from './components/CaixaModule';
import ProdutosModule from './components/ProdutosModule';
import FinanceiroModuleView from './components/FinanceiroModule';
import AgendaModule from './components/AgendaModule';
import RelatoriosModule from './components/RelatoriosModule';
import ServicosModule from './components/ServicosModule';
import FornecedoresModule from './components/FornecedoresModule';
import GarantiaModule from './components/GarantiaModule';
import RelacionamentoModule from './components/RelacionamentoModule';

// Custom Components
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import ProfilesView from './components/ProfilesView';
import PinEntryView from './components/PinEntryView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import CreateProfileView from './components/CreateProfileView';
import GlobalSearch from './components/GlobalSearch';
import OnboardingTour from './components/OnboardingTour';

// Hook
import { useServyxApp } from '../hooks/useServyxApp';

export default function ServyxApp() {
  const {
    view, setView,
    previousView, setPreviousView,
    profiles,
    selectedProfile,
    toastMessage, setToastMessage,
    isAuthReady,
    initialOrderId, setInitialOrderId,
    caixaInitialView, setCaixaInitialView,
    editingOrder, setEditingOrder,
    settingsRedirectSection,
    showTutorial,
    showResetModal, setShowResetModal,
    isResetting,
    dismissedNotifications,
    customers, setCustomers,
    orders, setOrders,
    products, setProducts,
    cashSessionsCount, setCashSessionsCount,
    osSettings, setOsSettings,
    companySettings, setCompanySettings,
    isCompanyIncomplete,
    handleLogin, handleRegister, handleLogout,
    handleNavigate, handleSelectProfile, handleVerifyPin,
    handleDeleteProfile, handleUpdateProfile, handleSaveProfile,
    handleConfirmReset, handleDismissNotification,
    dismissTutorial,
    tourStep, setTourStep,
    logActivity,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    clearAllNotifications
  } = useServyxApp();

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [activeBanner, setActiveBanner] = React.useState<any>(null);

  // Auto-banner logic for new unread notifications
  React.useEffect(() => {
    const latestUnread = notifications.filter((n: any) => !n.isRead).sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
    if (latestUnread && (!activeBanner || activeBanner.id !== latestUnread.id)) {
      setActiveBanner(latestUnread);
      const timer = setTimeout(() => setActiveBanner(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Global Shortcut for Search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden print:overflow-visible print:bg-white relative main-app-layout">
      <div id="main-app-layout" className="flex-1 relative">
        {/* Decorative glowing blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-[#00E676]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* ── Factory Reset Confirmation Modal ── */}
        {showResetModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => !isResetting && setShowResetModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#141414] border border-red-900/50 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <ShieldAlert size={28} className="text-red-400" />
              </div>
              <h2 className="text-white font-black text-xl text-center mb-2">Zona de Perigo</h2>
              <p className="text-zinc-400 text-sm text-center mb-8">Esta ação irá apagar todos os dados permanentemente.</p>
              <div className="space-y-3">
                <button onClick={handleConfirmReset} disabled={isResetting} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase transition-all">{isResetting ? 'Resetando...' : '🚨 Confirmar Reset'}</button>
                <button onClick={() => setShowResetModal(false)} className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-2xl font-bold text-sm uppercase">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {!isAuthReady && (
            <motion.div 
              key="loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
            >
              {/* Premium Tech Background */}
              <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00E676]/5 to-[#00E676]/10 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center justify-center -mt-10">
                {/* Advanced Glow effect */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: [0.1, 0.3, 0.1],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-[#00E676] rounded-full blur-[80px] w-64 h-64 m-auto -z-10 bg-blend-screen"
                />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center mb-12"
                >
                  {/* Aura pulsante atrás da logo */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 0, 0.4]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-[#00E676] rounded-full blur-3xl opacity-20 -z-10"
                  />
                  
                  {/* A Logo ganhando vida */}
                  <motion.img 
                    src="/logo.png" 
                    alt="Servyx" 
                    className="w-full h-full relative object-contain z-10"
                    animate={{
                      scale: [0.95, 1.05, 0.95],
                      y: [0, -8, 0],
                      filter: [
                        'drop-shadow(0px 0px 0px rgba(0,230,118,0))',
                        'drop-shadow(0px 15px 25px rgba(0,230,118,0.3))',
                        'drop-shadow(0px 0px 0px rgba(0,230,118,0))'
                      ]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
                
                <div className="flex flex-col items-center gap-5">
                  <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-zinc-900/50 border border-white/5 backdrop-blur-xl shadow-2xl">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3.5 h-3.5 border-[2.5px] border-zinc-500 border-t-[#00E676] border-r-[#00E676] rounded-full drop-shadow-[0_0_5px_rgba(0,230,118,0.5)]"
                    />
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] sm:tracking-[0.5em] transition-all"
                    >
                      Iniciando Sistema
                    </motion.p>
                  </div>
                  
                  {/* Cool progress bar */}
                  <div className="w-48 h-1 bg-zinc-900/80 rounded-full overflow-hidden relative shadow-inner">
                    <motion.div 
                      initial={{ left: '-100%' }}
                      animate={{ left: '100%' }}
                      transition={{ 
                        duration: 1.5, 
                        ease: "linear",
                        repeat: Infinity 
                      }}
                      className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-[#00E676] to-transparent opacity-80"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isAuthReady && view === 'LOGIN' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              <LoginView onLogin={handleLogin} onRegister={() => setView('REGISTER')} />
            </motion.div>
          )}
          {isAuthReady && view === 'REGISTER' && (
            <motion.div key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0">
              <RegisterView onRegister={handleRegister} onBack={() => setView('LOGIN')} />
            </motion.div>
          )}
          {isAuthReady && view === 'PROFILES' && (
            <motion.div key="profiles" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="absolute inset-0">
              <ProfilesView profiles={profiles} onSelectProfile={handleSelectProfile} onManageProfiles={() => { const adm = profiles.find(p => p.type === 'ADM' || p.role === 'ADM'); if(adm) handleSelectProfile(adm, 'SETTINGS'); }} onAddProfile={() => { setPreviousView('PROFILES'); setView('CREATE_PROFILE'); }} />
            </motion.div>
          )}
          {isAuthReady && view === 'PIN_ENTRY' && (
            <motion.div key="pin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0">
              <PinEntryView onVerify={handleVerifyPin} onCancel={() => setView('PROFILES')} />
            </motion.div>
          )}
          {isAuthReady && view === 'DASHBOARD' && selectedProfile && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
              <DashboardView 
                view={view} profile={selectedProfile} onNavigate={handleNavigate} onLogout={handleLogout} onSwitchProfile={() => setView('PROFILES')}
                customers={customers} products={products} orders={orders} isCompanyIncomplete={isCompanyIncomplete} cashSessionsCount={cashSessionsCount}
                showTutorial={showTutorial} onDismissTutorial={dismissTutorial} dismissedNotifications={dismissedNotifications} onDismissNotification={handleDismissNotification}
                onOpenSearch={() => setIsSearchOpen(true)}
                appNotifications={notifications}
                onMarkNotificationAsRead={markNotificationAsRead}
                onClearNotifications={clearAllNotifications}
              />
            </motion.div>
          )}
          {view === 'SETTINGS' && selectedProfile && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <SettingsView 
                profiles={profiles} onBack={() => setView('DASHBOARD')} onCreateProfile={() => { setPreviousView('SETTINGS'); setView('CREATE_PROFILE'); }} onDeleteProfile={handleDeleteProfile} onUpdateProfile={handleUpdateProfile}
                osSettings={osSettings} setOsSettings={setOsSettings} companySettings={companySettings} setCompanySettings={setCompanySettings} profile={selectedProfile} initialSection={settingsRedirectSection} onFactoryReset={async () => setShowResetModal(true)} showTutorial={showTutorial} onShowToast={setToastMessage} 
                logActivity={logActivity}
              />
            </motion.div>
          )}
          {view === 'CREATE_PROFILE' && (
            <motion.div key="create_profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0">
              <CreateProfileView onSave={handleSaveProfile} onBack={() => setView(previousView)} profiles={profiles} onShowToast={setToastMessage} />
            </motion.div>
          )}
          {view === 'CLIENTES' && selectedProfile && (
            <motion.div key="clientes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <ClientesModule profile={selectedProfile} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} customers={customers} setCustomers={setCustomers} onLogActivity={logActivity} />
            </motion.div>
          )}
          {view === 'NOVA_OS' && selectedProfile && (
            <motion.div key="nova_os" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <OrdemServicoModule 
                profile={selectedProfile} 
                onBack={() => { 
                  setView(previousView === 'STATUS_OS' ? 'STATUS_OS' : 'DASHBOARD'); 
                  setEditingOrder(null); 
                }} 
                onShowToast={setToastMessage} 
                customers={customers} 
                setCustomers={setCustomers} 
                orders={orders} 
                setOrders={setOrders} 
                osSettings={osSettings} 
                setOsSettings={setOsSettings} 
                companySettings={companySettings} 
                initialOrder={editingOrder} 
                onLogActivity={logActivity}
              />
            </motion.div>
          )}
          {view === 'STATUS_OS' && selectedProfile && (
            <motion.div key="status_os" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <StatusOsModule 
                profile={selectedProfile} 
                onBack={() => { setView('DASHBOARD'); setInitialOrderId(null); }} 
                onShowToast={setToastMessage} 
                customers={customers} 
                orders={orders} 
                setOrders={setOrders} 
                initialOrderId={initialOrderId} 
                osSettings={osSettings as any} 
                companySettings={companySettings} 
                onEdit={(order) => { 
                  setPreviousView('STATUS_OS');
                  setEditingOrder(order); 
                  setView('NOVA_OS'); 
                }} 
                onLogActivity={logActivity}
              />
            </motion.div>
          )}
          {view === 'CAIXA' && selectedProfile && (
            <motion.div key="caixa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <CaixaModule profile={selectedProfile} onBack={() => { setCaixaInitialView(null); setView('DASHBOARD'); }} onShowToast={setToastMessage} onUpdateChecklist={() => setCashSessionsCount(prev => prev + 1)} companySettings={companySettings} initialView={caixaInitialView || undefined} onLogActivity={logActivity} />
            </motion.div>
          )}
          {view === 'PRODUTOS' && selectedProfile && (
            <motion.div key="produtos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <ProdutosModule profile={selectedProfile} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} products={products as any} setProducts={setProducts as any} onLogActivity={logActivity} />
            </motion.div>
          )}
          {view === 'FINANCEIRO' && selectedProfile && (
            <motion.div key="financeiro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <FinanceiroModuleView profile={selectedProfile} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} companySettings={companySettings} orders={orders} customers={customers} onLogActivity={logActivity} />
            </motion.div>
          )}
          {view === 'AGENDA' && selectedProfile && (
            <motion.div key="agenda" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <AgendaModule profile={selectedProfile} profiles={profiles} orders={orders} customers={customers} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} onOpenOsStatus={(order) => { setInitialOrderId(order.id); setView('STATUS_OS'); }} />
            </motion.div>
          )}
          {view === 'RELATORIOS' && selectedProfile && (
            <motion.div key="relatorios" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <RelatoriosModule profile={selectedProfile} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} customers={customers} />
            </motion.div>
          )}
          {view === 'SERVICOS' && selectedProfile && (
            <motion.div key="servicos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <ServicosModule profile={selectedProfile} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} onLogActivity={logActivity} />
            </motion.div>
          )}
          {view === 'FORNECEDORES' && selectedProfile && (
            <motion.div key="fornecedores" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <FornecedoresModule profile={selectedProfile} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} onLogActivity={logActivity} />
            </motion.div>
          )}
          {view === 'GARANTIA' && selectedProfile && (
            <motion.div key="garantia" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <GarantiaModule profile={selectedProfile} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} companySettings={companySettings} osSettings={osSettings} onLogActivity={logActivity} />
            </motion.div>
          )}
          {view === 'RELACIONAMENTO' && selectedProfile && (
            <motion.div key="relacionamento" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
              <RelacionamentoModule profile={selectedProfile} onBack={() => setView('DASHBOARD')} onShowToast={setToastMessage} customers={customers} orders={orders} osSettings={osSettings} dismissedNotifications={dismissedNotifications} onDismissNotification={handleDismissNotification} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Top Banner Notification */}
        <AnimatePresence>
          {activeBanner && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 24, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-1/2 -translate-x-1/2 z-[300] w-full max-w-lg px-4 no-print"
            >
              <div 
                onClick={() => {
                  markNotificationAsRead(activeBanner.id);
                  if (activeBanner.moduleId) {
                    if (activeBanner.entityId && activeBanner.moduleId === 'status_os') {
                      setInitialOrderId(activeBanner.entityId);
                      setView('STATUS_OS');
                    } else {
                      handleNavigate(activeBanner.moduleId);
                    }
                  }
                  setActiveBanner(null);
                }}
                className="bg-[#141414]/95 backdrop-blur-xl border border-zinc-800 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-5 cursor-pointer hover:bg-[#1a1a1a] transition-colors group relative overflow-hidden"
              >
                {/* Status indicator bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                  activeBanner.type === 'SUCCESS' ? 'bg-emerald-500' : 
                  activeBanner.type === 'DANGER' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  activeBanner.type === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 
                  activeBanner.type === 'DANGER' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {activeBanner.type === 'SUCCESS' ? <CheckCircle2 size={28} /> : 
                   activeBanner.type === 'DANGER' ? <AlertCircle size={28} /> : <Activity size={28} />}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] mb-1">Nova Atividade</p>
                  <h4 className="text-white font-bold text-sm truncate">{activeBanner.title}</h4>
                  <p className="text-zinc-400 text-xs mt-1 line-clamp-2 leading-relaxed">{activeBanner.message}</p>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    markNotificationAsRead(activeBanner.id);
                    setActiveBanner(null);
                  }}
                  className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-sm shadow-2xl no-print">
              {toastMessage === 'Acesso negado' ? <AlertCircle size={18} className="text-red-400" /> : <Activity size={18} className="text-blue-400" />}
              <span className="font-medium text-sm tracking-tight">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Search Spotlight */}
        {selectedProfile && (
          <GlobalSearch 
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            companyId={selectedProfile.company_id}
            onSelectOrder={(orderId) => {
              setInitialOrderId(orderId);
              setView('STATUS_OS');
            }}
            onSelectCustomer={(customerId) => {
              // For now, navigating to Clientes is enough as it shows the list
              // In future, we could pass an initialCustomerId to open the modal
              setView('CLIENTES');
            }}
          />
        )}
        {selectedProfile && (
          <OnboardingTour
            isOpen={showTutorial}
            onClose={dismissTutorial}
            onNavigate={handleNavigate}
            currentStep={tourStep}
            setCurrentStep={setTourStep}
          />
        )}
      </div>
    </div>
  );
}

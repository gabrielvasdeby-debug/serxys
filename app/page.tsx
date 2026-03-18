'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowLeft, 
  Plus, 
  ShieldAlert,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  LayoutGrid,
  BarChart2,
  HeadphonesIcon,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  UserCog,
  FileCog,
  ListChecks,
  Hash,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import ClientesModule, { Customer } from './components/ClientesModule';
import OrdemServicoModule, { Order } from './components/OrdemServicoModule';
import StatusOsModule from './components/StatusOsModule';
import CaixaModule from './components/CaixaModule';
import ProdutosModule from './components/ProdutosModule';
import FinanceiroModule from './components/FinanceiroModule';
import AgendaModule from './components/AgendaModule';

import { db, auth } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, getDocFromServer, setDoc, getDocs, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

type View = 'LOGIN' | 'REGISTER' | 'PROFILES' | 'PIN_ENTRY' | 'DASHBOARD' | 'SETTINGS' | 'CREATE_PROFILE' | 'CREATE_PIN' | 'CLIENTES' | 'NOVA_OS' | 'STATUS_OS' | 'CAIXA' | 'PRODUTOS' | 'FINANCEIRO' | 'AGENDA';
type ProfileType = 'ADM' | 'Técnico' | 'Atendente' | 'Financeiro';

interface Profile {
  id: string;
  name: string;
  type: ProfileType;
  role: string;
  photo: string;
  [key: string]: string | number | boolean | undefined | null;
}

export default function ServyxApp() {
  const [view, setView] = useState<View>('LOGIN');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [admPin, setAdmPin] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pendingProfile, setPendingProfile] = useState<Omit<Profile, 'id'> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  
  // Shared State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [osSettings, setOsSettings] = useState({
    nextOsNumber: 1,
    checklistItems: ['Tela', 'Touch', 'Câmera', 'Áudio', 'Microfone', 'Botões', 'WiFi', 'Bluetooth', 'Carregamento'],
    whatsappMessages: {
      'Entrada Registrada': 'Olá [nome_cliente], sua OS #[numero_os] foi registrada com sucesso. Status: [status].',
      'Em Análise Técnica': 'Olá [nome_cliente], sua OS #[numero_os] está em análise técnica. Status: [status].',
      'Orçamento em Elaboração': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] está em elaboração. Status: [status].',
      'Aguardando Aprovação': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] está aguardando aprovação. Status: [status].',
      'Em Manutenção': 'Olá [nome_cliente], sua OS #[numero_os] está em manutenção. Status: [status].',
      'Reparo Concluído': 'Olá [nome_cliente], o reparo da sua OS #[numero_os] foi concluído. Status: [status].',
      'Orçamento Cancelado': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] foi cancelado. Status: [status].',
      'Sem Reparo': 'Olá [nome_cliente], sua OS #[numero_os] foi avaliada como sem reparo. Status: [status].'
    } as Record<string, string>
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [initialOrderId, setInitialOrderId] = useState<string | null>(null);

  console.log('Auth ready:', isAuthReady);

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthReady(true);
        // Fetch user data and profiles
        let userDoc;
        try {
          userDoc = await getDocFromServer(doc(db, 'users', user.uid));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          return;
        }
        
        if (userDoc.exists()) {
          setCompanyName(userDoc.data().companyName);
        }
        
        const qProfiles = query(collection(db, `users/${user.uid}/profiles`));
        const unsubscribeProfiles = onSnapshot(qProfiles, (snapshot) => {
          const profilesList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Profile));
          setProfiles(profilesList);
          
          // If we just registered or logged in with Google for first time,
          // we might want to auto-select the admin profile
          if (profilesList.length > 0 && view === 'LOGIN') {
            setView('PROFILES');
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/profiles`);
        });
        return () => unsubscribeProfiles();
      } else {
        setIsAuthReady(false);
        setProfiles([]);
        setView('LOGIN');
      }
    });
    return () => unsubscribe();
  }, [view]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user document exists
      let userDoc;
      try {
        userDoc = await getDocFromServer(doc(db, 'users', user.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        return;
      }

      if (!userDoc.exists()) {
        // First access, create user doc and default profile
        try {
          await setDoc(doc(db, 'users', user.uid), {
            companyName: 'Minha Empresa',
            email: user.email,
            role: 'admin',
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
          return;
        }
        
        const adminProfile: Omit<Profile, 'id'> = {
          name: user.displayName || 'Administrador',
          type: 'ADM',
          role: 'ADM',
          photo: user.photoURL || 'https://picsum.photos/seed/adm/200/200'
        };
        
        const profileRef = doc(collection(db, `users/${user.uid}/profiles`));
        try {
          await setDoc(profileRef, adminProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/profiles/${profileRef.id}`);
          return;
        }
        
        // Auto-select the new profile and go to dashboard
        setSelectedProfile({ ...adminProfile, id: profileRef.id } as Profile);
        setView('DASHBOARD');
      } else {
        setToastMessage('Login realizado com sucesso');
        setView('PROFILES');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setToastMessage('Login com Google não ativado. Ative-o no Firebase Console e selecione um e-mail de suporte.');
      } else {
        setToastMessage('Erro ao realizar login com Google');
      }
    }
  };

  const handleLogin = async (email?: string, password?: string) => {
    if (email && password) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setToastMessage('Login realizado com sucesso');
        setView('PROFILES');
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.code === 'auth/operation-not-allowed') {
          setToastMessage('Método de login não ativado no Firebase Console. Por favor, ative E-mail/Senha e Google.');
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          setToastMessage('Email ou senha incorretos');
        } else {
          setToastMessage('Erro ao realizar login');
        }
      }
    } else {
      if (!isAuthReady) {
        setToastMessage('Por favor, faça login para acessar o sistema.');
        return;
      }
      setView('PROFILES');
    }
  };

  const handleRegister = async (company: string, name: string, email: string, pass: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const user = result.user;
      
      // Create user doc
      try {
        await setDoc(doc(db, 'users', user.uid), {
          companyName: company,
          email: email,
          role: 'admin',
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        return;
      }
      
      // Create default admin profile
      const adminProfile: Omit<Profile, 'id'> = {
        name: name,
        type: 'ADM',
        role: 'ADM',
        photo: 'https://picsum.photos/seed/adm/200/200'
      };
      
      const profileRef = doc(collection(db, `users/${user.uid}/profiles`));
      try {
        await setDoc(profileRef, adminProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/profiles/${profileRef.id}`);
        return;
      }
      
      setToastMessage('Conta criada com sucesso!');
      
      // Auto-select the new profile and go to dashboard
      setSelectedProfile({ ...adminProfile, id: profileRef.id } as Profile);
      setView('DASHBOARD');
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setToastMessage('Cadastro não permitido. Ative o método E-mail/Senha no Firebase Console.');
      } else if (error.code === 'auth/email-already-in-use') {
        // If email already exists, try to login automatically as requested
        try {
          await signInWithEmailAndPassword(auth, email, pass);
          setToastMessage('Conta já existente. Login realizado automaticamente.');
          setView('PROFILES');
        } catch (loginError) {
          setToastMessage('Email já está em uso por outra conta.');
        }
      } else if (error.code === 'auth/invalid-email') {
        setToastMessage('Email inválido');
      } else {
        setToastMessage('Erro ao criar conta');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedProfile(null);
      setView('LOGIN');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    if (profile.type === 'ADM') {
      setView('PIN_ENTRY');
    } else {
      setView('DASHBOARD');
    }
  };

  const handleVerifyPin = (pin: string) => {
    if (pin === admPin || pin === '1234') { // Default pin for testing
      setView('DASHBOARD');
    } else {
      setToastMessage('PIN incorreto');
    }
  };

  const handleNavigate = (moduleId: string) => {
    if (!selectedProfile) return;

    const permissions: Record<ProfileType, string[]> = {
      'ADM': ['nova_os', 'status_os', 'clientes', 'garantia', 'produtos', 'servicos', 'caixa', 'financeiro', 'fornecedores', 'agenda', 'ajustes'],
      'Financeiro': ['caixa', 'financeiro', 'fornecedores'],
      'Técnico': ['nova_os', 'status_os', 'agenda'],
      'Atendente': ['nova_os', 'status_os', 'clientes']
    };

    if (permissions[selectedProfile.type].includes(moduleId)) {
      if (moduleId === 'ajustes') {
        setView('SETTINGS');
      } else if (moduleId === 'clientes') {
        setView('CLIENTES');
      } else if (moduleId === 'status_os') {
        setView('STATUS_OS');
      } else if (moduleId === 'nova_os') {
        setView('NOVA_OS');
      } else if (moduleId === 'caixa') {
        setView('CAIXA');
      } else if (moduleId === 'produtos') {
        setView('PRODUTOS');
      } else if (moduleId === 'financeiro') {
        setView('FINANCEIRO');
      } else if (moduleId === 'agenda') {
        setView('AGENDA');
      } else {
        setToastMessage(`Módulo ${moduleId} em desenvolvimento`);
      }
    } else {
      setToastMessage('Acesso negado');
    }
  };

  const handleSaveProfile = (profileData: Omit<Profile, 'id'>) => {
    if (profiles.length === 1 && !admPin) {
      // First additional profile, require ADM PIN
      setPendingProfile(profileData);
      setView('CREATE_PIN');
    } else {
      const newProfile = { ...profileData, id: Date.now().toString() } as Profile;
      setProfiles([...profiles, newProfile]);
      setView('SETTINGS');
    }
  };

  const handleSavePin = (pin: string) => {
    setAdmPin(pin);
    if (pendingProfile) {
      const newProfile = { ...pendingProfile, id: Date.now().toString() } as Profile;
      setProfiles([...profiles, newProfile]);
      setPendingProfile(null);
    }
    setView('SETTINGS');
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans overflow-hidden print:overflow-visible print:bg-white relative">
      <AnimatePresence mode="wait">
        {view === 'LOGIN' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            <LoginView onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onRegister={() => setView('REGISTER')} />
          </motion.div>
        )}
        {view === 'REGISTER' && (
          <motion.div key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0">
            <RegisterView onRegister={handleRegister} onBack={() => setView('LOGIN')} />
          </motion.div>
        )}
        {view === 'PROFILES' && (
          <motion.div key="profiles" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="absolute inset-0">
            <ProfilesView profiles={profiles} onSelectProfile={handleSelectProfile} />
          </motion.div>
        )}
        {view === 'PIN_ENTRY' && (
          <motion.div key="pin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0">
            <PinEntryView onVerify={handleVerifyPin} onCancel={() => setView('PROFILES')} />
          </motion.div>
        )}
        {view === 'DASHBOARD' && selectedProfile && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
            <DashboardView profile={selectedProfile} onNavigate={handleNavigate} onLogout={handleLogout} />
          </motion.div>
        )}
        {view === 'SETTINGS' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <SettingsView 
              profiles={profiles} 
              onBack={() => setView('DASHBOARD')} 
              onCreateProfile={() => setView('CREATE_PROFILE')} 
              osSettings={osSettings}
              setOsSettings={setOsSettings}
            />
          </motion.div>
        )}
        {view === 'CREATE_PROFILE' && (
          <motion.div key="create_profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0">
            <CreateProfileView onSave={handleSaveProfile} onBack={() => setView('SETTINGS')} />
          </motion.div>
        )}
        {view === 'CREATE_PIN' && (
          <motion.div key="create_pin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="absolute inset-0">
            <CreatePinView onSave={handleSavePin} />
          </motion.div>
        )}
        {view === 'CLIENTES' && selectedProfile && (
          <motion.div key="clientes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <ClientesModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
              customers={customers}
              setCustomers={setCustomers}
            />
          </motion.div>
        )}
        {view === 'NOVA_OS' && selectedProfile && (
          <motion.div key="nova_os" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto print:static print:overflow-visible">
            <OrdemServicoModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
              customers={customers}
              setCustomers={setCustomers}
              orders={orders}
              setOrders={setOrders}
              osSettings={osSettings}
              setOsSettings={setOsSettings}
            />
          </motion.div>
        )}
        {view === 'STATUS_OS' && selectedProfile && (
          <motion.div key="status_os" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <StatusOsModule 
              profile={selectedProfile} 
              onBack={() => {
                setView('DASHBOARD');
                setInitialOrderId(null);
              }} 
              onShowToast={setToastMessage} 
              customers={customers}
              orders={orders}
              setOrders={setOrders}
              initialOrderId={initialOrderId}
              osSettings={osSettings as any}
            />
          </motion.div>
        )}
        {view === 'CAIXA' && selectedProfile && (
          <motion.div key="caixa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <CaixaModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
            />
          </motion.div>
        )}
        {view === 'PRODUTOS' && selectedProfile && (
          <motion.div key="produtos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <ProdutosModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
            />
          </motion.div>
        )}
        {view === 'FINANCEIRO' && selectedProfile && (
          <motion.div key="financeiro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <FinanceiroModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
            />
          </motion.div>
        )}
        {view === 'AGENDA' && selectedProfile && (
          <motion.div key="agenda" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <AgendaModule 
              profile={selectedProfile} 
              profiles={profiles}
              orders={orders}
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
              onOpenOsStatus={(order) => {
                setInitialOrderId(order.id);
                setView('STATUS_OS');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-800 border border-zinc-700 text-white px-6 py-3 rounded-full shadow-2xl"
          >
            {toastMessage === 'Acesso negado' ? <AlertCircle size={18} className="text-red-400" /> : <Activity size={18} className="text-blue-400" />}
            <span className="font-medium text-sm">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function LoginView({ onLogin, onGoogleLogin, onRegister }: { onLogin: (email: string, pass: string) => void, onGoogleLogin: () => void, onRegister: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1A1A1A] rounded-2xl flex items-center justify-center border border-zinc-800 shadow-lg">
              <div className="w-6 h-6 border-[3px] border-[#00E676] rounded-md flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-[#00E676] rounded-sm"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold tracking-tight text-white">SERVYX</span>
                <span className="text-3xl font-bold tracking-tight text-[#00E676]">OS</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase leading-none mt-1">System Management</span>
            </div>
          </div>
        </div>
        
        <p className="text-center text-zinc-400 mb-8 text-sm">Acesso seguro à infraestrutura corporativa</p>
        
        <div className="bg-[#1A1A1A] rounded-[32px] p-8 shadow-2xl border border-zinc-800/50">
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#222222] border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all placeholder:text-zinc-600" 
                  placeholder="name@company.com" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-300">Senha</label>
                <a href="#" className="text-sm text-[#00E676] hover:underline">Esqueceu?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#222222] border border-zinc-800 rounded-2xl pl-11 pr-11 py-3.5 text-white focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] transition-all placeholder:text-zinc-600" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <Eye size={18} className="text-[#00E676]" /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <div className="w-5 h-5 rounded border border-zinc-700 bg-[#222222] flex items-center justify-center">
                {/* Checkbox icon could go here */}
              </div>
              <span className="text-sm text-zinc-400">Manter conectado</span>
            </div>
            
            <button type="submit" className="w-full bg-[#00E676] hover:bg-[#00C853] text-black font-bold py-4 rounded-2xl transition-colors mt-2 shadow-lg shadow-[#00E676]/20">
              Entrar
            </button>

            <button 
              type="button" 
              onClick={onRegister}
              className="w-full bg-transparent hover:bg-zinc-800 text-zinc-300 font-medium py-3 rounded-2xl transition-colors border border-zinc-800"
            >
              Criar conta
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1A1A1A] px-4 text-zinc-500 tracking-wider">OU CONECTE-SE COM</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                type="button" 
                onClick={onGoogleLogin}
                className="flex items-center justify-center gap-2 bg-[#222222] hover:bg-[#2A2A2A] border border-zinc-800 py-3.5 rounded-2xl transition-colors text-sm font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RegisterView({ onRegister, onBack }: { onRegister: (company: string, name: string, email: string, pass: string) => void, onBack: () => void }) {
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }
    onRegister(company, name, email, password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Criar nova conta</h1>
        </div>
        
        <div className="bg-[#1A1A1A] rounded-[32px] p-8 shadow-2xl border border-zinc-800/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Nome da Empresa</label>
              <input 
                type="text" 
                required 
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-[#222222] border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-all" 
                placeholder="Ex: Assistência Técnica XYZ" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Seu Nome (Administrador)</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#222222] border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-all" 
                placeholder="Seu nome completo" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#222222] border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-all" 
                placeholder="seu@email.com" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#222222] border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-all" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <Eye size={18} className="text-[#00E676]" /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Confirmar Senha</label>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#222222] border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-all" 
                placeholder="••••••••" 
              />
            </div>
            
            <button type="submit" className="w-full bg-[#00E676] hover:bg-[#00C853] text-black font-bold py-4 rounded-2xl transition-colors mt-4 shadow-lg shadow-[#00E676]/20">
              Finalizar Cadastro
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProfilesView({ profiles, onSelectProfile }: { profiles: Profile[], onSelectProfile: (p: Profile) => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0F1A15]">
      <header className="p-6 flex justify-between items-center">
        <div className="w-8 h-8"></div> {/* Spacer */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1A1A1A] rounded-xl flex items-center justify-center border border-zinc-800 shadow-sm">
            <div className="w-4 h-4 border-2 border-[#00E676] rounded-sm flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#00E676] rounded-sm"></div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold tracking-tight text-white">SERVYX</span>
            <span className="text-xl font-bold tracking-tight text-[#00E676]">OS</span>
          </div>
        </div>
        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
          <HelpCircle size={18} />
        </button>
      </header>
      
      <div className="flex-1 flex flex-col items-center justify-center p-4 pb-24">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 text-center tracking-tight">Escolha seu perfil</h1>
        <p className="text-xl text-zinc-400 mb-16 font-light">Quem está acessando hoje?</p>
        
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 max-w-3xl">
          {profiles.map(p => (
            <button key={p.id} onClick={() => onSelectProfile(p)} className="group flex flex-col items-center gap-4 transition-all hover:scale-105 focus:outline-none">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#00E676] group-focus:border-[#00E676] transition-colors shadow-xl relative bg-[#E5D5C5]">
                <Image src={p.photo} alt={p.name} fill className="object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="text-center">
                <p className="text-zinc-300 group-hover:text-white group-focus:text-white font-medium text-xl transition-colors">{p.name}</p>
              </div>
            </button>
          ))}
          
          <button onClick={() => {}} className="group flex flex-col items-center gap-4 transition-all hover:scale-105 focus:outline-none">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-[#00E676] transition-colors flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 group-hover:text-[#00E676] transition-colors">
                <Plus size={24} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-zinc-400 group-hover:text-white font-medium text-xl transition-colors">Adicionar Novo</p>
            </div>
          </button>
        </div>
        
        <button className="mt-16 px-8 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium tracking-wider text-sm hover:bg-white/5 transition-colors uppercase">
          Gerenciar Perfis
        </button>
      </div>
      
      <footer className="h-16 border-t border-white/5 flex items-center justify-around px-6 bg-black/20">
        <button className="text-[#00E676]"><LayoutGrid size={24} /></button>
        <button className="text-zinc-500 hover:text-zinc-300 transition-colors"><Activity size={24} /></button>
        <button className="text-zinc-500 hover:text-zinc-300 transition-colors"><Settings size={24} /></button>
      </footer>
    </div>
  );
}

function PinEntryView({ onVerify, onCancel }: { onVerify: (pin: string) => void, onCancel: () => void }) {
  const [pin, setPin] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerify(pin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-zinc-800/50 text-center">
        <div className="w-16 h-16 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Digite o PIN</h2>
        <p className="text-zinc-400 mb-8 text-sm">Acesso restrito ao Administrador</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="password" 
            maxLength={4}
            required
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-4 text-center text-4xl tracking-[0.5em] text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono" 
            placeholder="••••" 
          />
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3.5 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={pin.length !== 4} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium py-3.5 rounded-xl transition-colors">
              Acessar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardView({ profile, onNavigate, onLogout }: { profile: Profile, onNavigate: (module: string) => void, onLogout: () => void }) {
  const modules = [
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
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#121212]">
      <header className="border-b border-zinc-800/50 bg-[#121212] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center border border-zinc-800">
              <div className="w-5 h-5 border-2 border-[#00E676] rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-[#00E676] rounded-sm"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold tracking-tight text-white">SERVYX</span>
                <span className="text-lg font-bold tracking-tight text-[#00E676]">OS</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase leading-none">Painel Principal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <Activity size={18} />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors relative">
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#00E676] rounded-full"></div>
              <AlertCircle size={18} />
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            <button onClick={onLogout} className="relative w-10 h-10 rounded-full border-2 border-[#00E676] overflow-hidden p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden relative bg-[#E5D5C5]">
                <Image src={profile.photo} alt={profile.name} fill className="object-cover" referrerPolicy="no-referrer" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {modules.map(m => (
            <button 
              key={m.id} 
              onClick={() => onNavigate(m.id)}
              className="bg-[#1A1A1A] border border-zinc-800 hover:border-zinc-700 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all group text-center aspect-square"
            >
              <div className={`w-16 h-16 rounded-2xl ${m.bg} flex items-center justify-center ${m.color} transition-colors ${m.shadow || ''}`}>
                <m.icon size={28} strokeWidth={2} />
              </div>
              <div>
                <span className="font-bold text-base text-white block mb-1">{m.name}</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{m.subtitle}</span>
              </div>
            </button>
          ))}
        </div>
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 h-16 border-t border-zinc-800 bg-[#121212] flex items-center justify-around px-2 z-20">
        <button className="flex flex-col items-center gap-1 text-[#00E676]">
          <LayoutGrid size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Início</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
          <BarChart2 size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Relatórios</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
          <HeadphonesIcon size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Suporte</span>
        </button>
        <button onClick={() => onNavigate('ajustes')} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
          <Settings size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Ajustes</span>
        </button>
      </footer>
    </div>
  );
}

function SettingsView({ 
  profiles, 
  onBack, 
  onCreateProfile,
  osSettings,
  setOsSettings
}: { 
  profiles: Profile[], 
  onBack: () => void, 
  onCreateProfile: () => void,
  osSettings: { nextOsNumber: number, checklistItems: string[], whatsappMessages: Record<string, string> },
  setOsSettings: React.Dispatch<React.SetStateAction<{ nextOsNumber: number, checklistItems: string[], whatsappMessages: Record<string, string> }>>
}) {
  const [activeSection, setActiveSection] = useState<'MENU' | 'PROFILES' | 'OS'>('MENU');
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isWhatsappSettingsOpen, setIsWhatsappSettingsOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setOsSettings(prev => ({ ...prev, checklistItems: [...prev.checklistItems, newItemName.trim()] }));
      setNewItemName('');
    }
  };

  const handleSaveEdit = (index: number) => {
    if (editingName.trim()) {
      setOsSettings(prev => {
        const newItems = [...prev.checklistItems];
        newItems[index] = editingName.trim();
        return { ...prev, checklistItems: newItems };
      });
      setEditingIndex(null);
    }
  };

  const handleRemoveItem = (index: number) => {
    setOsSettings(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((_, i) => i !== index)
    }));
  };

  const handleSaveWhatsappMessage = (status: string, message: string) => {
    setOsSettings(prev => ({
      ...prev,
      whatsappMessages: {
        ...prev.whatsappMessages,
        [status]: message
      }
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto w-full px-6 h-20 flex items-center gap-4">
          <button onClick={() => activeSection === 'MENU' ? onBack() : setActiveSection('MENU')} className="p-2.5 hover:bg-zinc-800/80 rounded-xl transition-colors -ml-2 text-zinc-400 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold tracking-tight">
            {activeSection === 'MENU' ? 'Ajustes' : activeSection === 'PROFILES' ? 'Configuração de Perfis' : 'Configuração de OS'}
          </h1>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {activeSection === 'MENU' && (
            <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <button 
                onClick={() => setActiveSection('PROFILES')}
                className="w-full bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/50 rounded-2xl p-6 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <UserCog size={24} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">Configuração de Perfis</h2>
                    <p className="text-sm text-zinc-400 mt-1">Gerencie os usuários e permissões de acesso.</p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-500 group-hover:text-white transition-colors" />
              </button>

              <button 
                onClick={() => setActiveSection('OS')}
                className="w-full bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/50 rounded-2xl p-6 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <FileCog size={24} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">Configuração de OS</h2>
                    <p className="text-sm text-zinc-400 mt-1">Numeração de OS e itens do checklist.</p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-500 group-hover:text-white transition-colors" />
              </button>
            </motion.div>
          )}

          {activeSection === 'PROFILES' && (
            <motion.div key="profiles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-8 border-b border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Perfis Cadastrados</h2>
                    <p className="text-sm text-zinc-400">Gerencie os usuários que têm acesso ao sistema Servyx.</p>
                  </div>
                  <button onClick={onCreateProfile} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 shrink-0">
                    <Plus size={18} />
                    Novo Perfil
                  </button>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {profiles.map(p => (
                    <div key={p.id} className="p-6 flex items-center gap-5 hover:bg-zinc-800/20 transition-colors">
                      <div className="relative w-14 h-14 rounded-full border border-zinc-700 overflow-hidden shrink-0">
                        <Image src={p.photo} alt={p.name} fill className="object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-lg text-zinc-200">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                            p.type === 'ADM' ? 'bg-blue-500/10 text-blue-400' : 
                            p.type === 'Técnico' ? 'bg-emerald-500/10 text-emerald-400' : 
                            'bg-purple-500/10 text-purple-400'
                          }`}>
                            {p.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'OS' && (
            <motion.div key="os" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-8 border-b border-zinc-800/50 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <Hash size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Numeração de OS</h2>
                    <p className="text-sm text-zinc-400">Defina o número da próxima Ordem de Serviço.</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-zinc-400">Próxima OS:</label>
                    <input 
                      type="number" 
                      value={osSettings.nextOsNumber}
                      onChange={e => setOsSettings(prev => ({ ...prev, nextOsNumber: parseInt(e.target.value) || 1 }))}
                      className="w-32 bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-lg" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-xl">
                <button 
                  onClick={() => setIsChecklistOpen(!isChecklistOpen)}
                  className="w-full p-8 flex items-center justify-between hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <ListChecks size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-1">Configuração de Checklist</h2>
                      <p className="text-sm text-zinc-400">Gerencie os itens do checklist de testes da OS.</p>
                    </div>
                  </div>
                  <ChevronDown className={`text-zinc-500 transition-transform duration-300 ${isChecklistOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isChecklistOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-zinc-800/50"
                    >
                      <div className="p-6 bg-zinc-950/30">
                        <div className="flex gap-2 mb-4">
                          <input 
                            type="text" 
                            placeholder="Nome do novo item..." 
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          <button 
                            onClick={handleAddItem}
                            disabled={!newItemName.trim()}
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0"
                          >
                            <Plus size={16} />
                            Adicionar
                          </button>
                        </div>
                        <div className="divide-y divide-zinc-800/50 bg-zinc-900/80 border border-zinc-800/50 rounded-2xl overflow-hidden">
                          {osSettings.checklistItems.map((item, index) => (
                            <div key={index} className="p-4 px-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                              {editingIndex === index ? (
                                <div className="flex-1 flex gap-2 mr-4">
                                  <input 
                                    type="text" 
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    autoFocus
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                                  <button onClick={() => handleSaveEdit(index)} className="text-blue-400 hover:text-blue-300 text-xs font-bold">Salvar</button>
                                  <button onClick={() => setEditingIndex(null)} className="text-zinc-500 hover:text-zinc-400 text-xs font-bold">Cancelar</button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-zinc-200 font-medium">{item}</span>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        setEditingIndex(index);
                                        setEditingName(item);
                                      }}
                                      className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                      Editar
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveItem(index)}
                                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          {osSettings.checklistItems.length === 0 && (
                            <div className="p-6 text-center text-zinc-500 text-sm">Nenhum item no checklist.</div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-xl">
                <button 
                  onClick={() => setIsWhatsappSettingsOpen(!isWhatsappSettingsOpen)}
                  className="w-full p-8 flex items-center justify-between hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-1">Mensagens de Status da OS</h2>
                      <p className="text-sm text-zinc-400">Personalize as mensagens enviadas via WhatsApp por status.</p>
                    </div>
                  </div>
                  <ChevronDown className={`text-zinc-500 transition-transform duration-300 ${isWhatsappSettingsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isWhatsappSettingsOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-zinc-800/50"
                    >
                      <div className="p-6 bg-zinc-950/30">
                        <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                          <h3 className="text-sm font-semibold text-blue-400 mb-2">Variáveis Dinâmicas</h3>
                          <p className="text-xs text-zinc-400 mb-2">Você pode usar as seguintes variáveis na sua mensagem. Elas serão substituídas automaticamente:</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-xs font-mono text-zinc-300">[nome_cliente]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-xs font-mono text-zinc-300">[numero_os]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-xs font-mono text-zinc-300">[status]</span>
                          </div>
                        </div>
                        <div className="space-y-6">
                          {Object.entries(osSettings.whatsappMessages || {}).map(([status, message]) => (
                            <div key={status} className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4">
                              <label className="block text-sm font-semibold text-zinc-200 mb-2">{status}</label>
                              <textarea 
                                value={message}
                                onChange={(e) => handleSaveWhatsappMessage(status, e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none h-24"
                                placeholder={`Mensagem para ${status}...`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function CreateProfileView({ onSave, onBack }: { onSave: (p: Omit<Profile, 'id'>) => void, onBack: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProfileType>('Técnico');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      type,
      role: type,
      photo: `https://picsum.photos/seed/${name.replace(/\s/g, '')}/200/200`
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-zinc-800/50">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2.5 hover:bg-zinc-800 rounded-xl transition-colors -ml-2 text-zinc-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold tracking-tight">Novo Perfil</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Nome do usuário</label>
            <input 
              type="text" 
              required 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-600" 
              placeholder="Ex: João Silva" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Tipo de Perfil</label>
            <div className="relative">
              <select 
                value={type}
                onChange={e => setType(e.target.value as ProfileType)}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="Técnico">Técnico</option>
                <option value="Atendente">Atendente</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium py-3.5 rounded-xl transition-colors mt-4 shadow-lg shadow-blue-500/20">
            Criar Perfil
          </button>
        </form>
      </div>
    </div>
  );
}

function CreatePinView({ onSave }: { onSave: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      onSave(pin);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-zinc-800/50 text-center">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Segurança ADM</h2>
        <p className="text-zinc-400 mb-8 text-sm leading-relaxed">Como este é o primeiro perfil adicional, crie um PIN de 4 dígitos para proteger o acesso do Administrador.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="password" 
            maxLength={4}
            required
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-4 text-center text-4xl tracking-[0.5em] text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono" 
            placeholder="••••" 
          />
          <button type="submit" disabled={pin.length !== 4} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20">
            Salvar PIN e Continuar
          </button>
        </form>
      </div>
    </div>
  );
}

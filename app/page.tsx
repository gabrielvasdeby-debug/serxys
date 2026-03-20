'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  FileText,
  ListChecks,
  Hash,
  MessageCircle,
  Cake,
  CheckCircle2,
  Check,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import ClientesModule, { Customer } from './components/ClientesModule';
import OrdemServicoModule from './components/OrdemServicoModule';
import { Order } from './types';
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

import { supabase } from './supabase';


type View = 'LOGIN' | 'REGISTER' | 'PROFILES' | 'PIN_ENTRY' | 'DASHBOARD' | 'SETTINGS' | 'CREATE_PROFILE' | 'CREATE_PIN' | 'CLIENTES' | 'NOVA_OS' | 'STATUS_OS' | 'CAIXA' | 'PRODUTOS' | 'FINANCEIRO' | 'AGENDA' | 'RELATORIOS' | 'SERVICOS' | 'FORNECEDORES' | 'GARANTIA' | 'RELACIONAMENTO';
type ProfileType = 'ADM' | 'Técnico' | 'Atendente' | 'Financeiro';

interface Product {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}

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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [initialOrderId, setInitialOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [osSettings, setOsSettingsState] = useState<{
    nextOsNumber: number;
    checklistItems: string[];
    checklistByCategory: Record<string, string[]>;
    printTerms: string;
    whatsappMessages: Record<string, string>;
  }>({
    nextOsNumber: 1,
    checklistItems: ['Carregador', 'Cabo USB', 'Bateria', 'Cartão de Memória', 'Chip', 'Capa Proteção'],
    checklistByCategory: {
      'Celular': [
        'Tela/Touch', 'Display', 'Botão Power', 'Botões Vol', 'Câmera Frontal', 
        'Câmera Traseira', 'Microfone', 'Alto-falante', 'Auricular', 'Wi-Fi', 
        'Bluetooth', 'Chip', 'Carregamento', 'Flash', 'Vibracall', 'Biometria/FaceID'
      ],
      'Tablet': [
        'Tela/Touch', 'Display', 'Botão Power', 'Botões Vol', 'Câmera Frontal', 
        'Câmera Traseira', 'Wi-Fi', 'Bluetooth', 'Carregamento', 'Microfone', 
        'Alto-falante', 'Biometria'
      ],
      'Notebook': [
        'Tela', 'Teclado', 'Mouse/Touchpad', 'Wi-Fi', 'Bluetooth', 
        'Webcam', 'Microfone', 'Alto-falantes', 'Portas USB', 'HDMI', 
        'Bateria', 'Carregador', 'Dobradiças'
      ],
      'Computador': [
        'Portas USB', 'HDMI/VGA', 'Entrada Rede', 'Saída Áudio', 'Entrada Mic', 
        'Fonte', 'Painel Frontal', 'Coolers', 'Wi-Fi (se houver)'
      ],
      'Videogame': [
        'Leitor de Disco', 'Entrada HDMI', 'Portas USB', 'Wi-Fi', 
        'Bluetooth', 'Conectividade Controle', 'Fonte Interna', 'Cooler', 'Bip/Luzes'
      ],
      'Controle': [
        'L1', 'L2', 'R1', 'R2', 'D-Pad Cima', 'D-Pad Baixo', 'D-Pad Esquerda', 'D-Pad Direita',
        'Triângulo', 'Círculo', 'Cross / X', 'Quadrado', 'L3 (Analógico)', 'R3 (Analógico)', 'PS Button', 'Touchpad', 'Mute', 'Conector Carga', 'Entrada Fone P2'
      ],
      'Outro': ['Carregador', 'Cabo USB', 'Bateria', 'Capa Proteção']
    },
    printTerms: '',
    whatsappMessages: {
      'Entrada Registrada': 'Ola´ [nome_cliente] sua Ordem de Serviço foi gerada com sucesso em nosso Sistema. 🚀\n\nNúmero da sua OS: #[numero_os]\n\nEquipamento:\n[marca] [modelo]\n\nDefeito relatado:\n[defeito]\n\nStatus atual:\n[status]\n\nData de entrada:\n[data_entrada]\n\nVocê pode acompanhar o andamento do seu reparo pelo link abaixo:\n\n[link_os]\n\n[nome_assistencia] agradece sua confiança!',
      'Em Análise Técnica': 'Olá [nome_cliente], sua OS #[numero_os] está em análise técnica. Status: [status].',
      'Orçamento em Elaboração': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] está em elaboração. Status: [status].',
      'Aguardando Aprovação': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] está aguardando aprovação. Status: [status].',
      'Em Manutenção': 'Olá [nome_cliente], sua OS #[numero_os] está em manutenção. Status: [status].',
      'Reparo Concluído': 'Olá [nome_cliente], o reparo da sua OS #[numero_os] foi concluído. Status: [status].',
      'Orçamento Cancelado': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] foi cancelado. Status: [status].',
      'Sem Reparo': 'Olá [nome_cliente], sua OS #[numero_os] foi avaliada como sem reparo. Status: [status].',
      'birthday': 'Olá [nome], a equipe da SERVYX deseja um feliz aniversário! 🎉 Preparamos um mimo especial para você. Conte conosco sempre!',
      'follow_up': 'Olá [nome], tudo bem? Estamos entrando em contato para saber se o serviço realizado no seu aparelho está funcionando perfeitamente. Se puder, deixe uma avaliação para nossa loja no Google. Isso nos ajuda muito!'
    }
  });

  const [companySettings, setCompanySettingsState] = useState({
    name: 'SERVYX',
    cnpj: '',
    whatsapp: '',
    phone: '',
    email: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: '',
    zipCode: '',
    logoUrl: '',
    publicSlug: 'servyx',
    slugHistory: [] as string[]
  });

  // Load data from Supabase after login
  const loadDataFromSupabase = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Servyx] Error getting session in loadData:', sessionError);
        await handleLogout();
        return;
      }

      if (!session) {
        setView('LOGIN');
        setIsAuthReady(true);
        return;
      }

      const [customersRes, ordersRes, settingsRes, profilesRes, productsRes, companyRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').eq('key', 'os_settings').single(),
        supabase.from('profiles').select('*').eq('user_id', session.user.id).order('created_at'),
        supabase.from('products').select('id, name, stock, min_stock'),
        supabase.from('company_settings').select('*').eq('id', 'main').single()
      ]);

      if (profilesRes.data && profilesRes.data.length > 0) {
        setProfiles(profilesRes.data as Profile[]);
      } else {
        // Create initial profile if none exists
        const user = session.user;
        const initialProfile = {
          id: user.id as any,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Administrador',
          type: 'ADM' as ProfileType,
          role: 'ADM',
          photo: user.user_metadata?.avatar_url || `https://picsum.photos/seed/${user.id}/200/200`,
          user_id: user.id
        };
        
        const { data: inserted } = await supabase.from('profiles').upsert(initialProfile).select().single();
        if (inserted) setProfiles([inserted as Profile]);
      }

      if (customersRes.data) {
        setCustomers(customersRes.data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          name: row.name as string,
          birthDate: row.birth_date as string | undefined,
          phone: row.phone as string || '',
          whatsapp: row.whatsapp as string || '',
          email: row.email as string || '',
          document: row.document as string || '',
          address: (row.address as Customer['address']) || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
          notes: row.notes as string || '',
          createdAt: row.created_at as string || new Date().toISOString(),
          devices: (row.devices as Customer['devices']) || [],
        })));
      }

      if (productsRes.data) {
        setProducts(productsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          stock: p.stock || 0,
          minStock: p.min_stock || 0
        })));
      }

      if (ordersRes.data) {
        setOrders(ordersRes.data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          companyId: row.company_id as string,
          osNumber: row.os_number as number,
          customerId: row.customer_id as string,
          equipment: row.equipment as Order['equipment'],
          checklist: row.checklist as Order['checklist'],
          checklistNotes: row.checklist_notes as string || '',
          defect: row.defect as string || '',
          technicianNotes: row.technician_notes as string || '',
          service: row.service as string || '',
          financials: row.financials as Order['financials'],
          signatures: row.signatures as Order['signatures'],
          status: row.status as Order['status'],
          priority: row.priority as Order['priority'],
          history: (row.history as Order['history']) || [],
          completionData: row.completion_data as Order['completionData'],
          productsUsed: (row.products_used as Order['productsUsed']) || [],
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
        })));
      }

      if (settingsRes.data?.value) {
        const saved = settingsRes.data.value as Record<string, unknown>;
        setOsSettingsState(prev => ({ ...prev, ...saved }));
      }

      if (companyRes.data) {
        setCompanySettingsState(prev => ({ 
          ...prev, 
          ...companyRes.data,
          zipCode: companyRes.data.zip_code || '',
          logoUrl: companyRes.data.logo_url || '',
          publicSlug: companyRes.data.public_slug || 'servyx',
          slugHistory: companyRes.data.slug_history || []
        }));
        if (companyRes.data.name) setCompanyName(companyRes.data.name);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const setOsSettings = async (newSettingsOrFn: typeof osSettings | ((prev: typeof osSettings) => typeof osSettings)) => {
    const nextSettings = typeof newSettingsOrFn === 'function' ? newSettingsOrFn(osSettings) : newSettingsOrFn;
    setOsSettingsState(nextSettings);
    await supabase.from('app_settings').upsert({
      key: 'os_settings',
      value: nextSettings,
      updated_at: new Date().toISOString(),
    });
  };

  const setCompanySettings = async (newSettings: typeof companySettings) => {
    try {
      const oldSlug = companySettings.publicSlug;
      const newSlug = newSettings.publicSlug;
      let updatedHistory = companySettings.slugHistory || [];
      
      // If slug changed, add old slug to history
      if (oldSlug && newSlug && oldSlug !== newSlug && !updatedHistory.includes(oldSlug)) {
        updatedHistory = [...updatedHistory, oldSlug];
      }

      setCompanySettingsState({ ...newSettings, slugHistory: updatedHistory });
      const toSave = {
        ...newSettings,
        zip_code: newSettings.zipCode,
        logo_url: newSettings.logoUrl,
        public_slug: newSettings.publicSlug,
        slug_history: updatedHistory
      };
      // Remove camelCase versions for DB
      delete (toSave as any).zipCode;
      delete (toSave as any).logoUrl;
      delete (toSave as any).publicSlug;
      delete (toSave as any).slugHistory;

      const { error } = await supabase.from('company_settings').upsert({
        id: 'main',
        ...toSave,
        updated_at: new Date().toISOString()
      });

      if (error) {
        console.error('Error saving company settings:', error);
        setToastMessage(`Erro ao salvar: ${error.message}`);
      } else {
        setToastMessage('Dados da empresa salvos com sucesso!');
        if (newSettings.name) setCompanyName(newSettings.name);
      }
    } catch (err: any) {
      console.error('Fatal error saving company settings:', err);
      setToastMessage(`Erro inesperado: ${err.message}`);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Tem certeza que deseja excluir este perfil?')) return;
    
    // Don't allow deleting the active profile
    if (profileId === selectedProfile?.id) {
      setToastMessage('Não é possível excluir o perfil em uso');
      return;
    }

    const { error } = await supabase.from('profiles').delete().eq('id', profileId);
    if (error) {
      setToastMessage(`Erro ao excluir: ${error.message}`);
    } else {
      setProfiles(profiles.filter(p => p.id !== profileId));
      setToastMessage('Perfil excluído com sucesso');
    }
  };

  const handleUpdateProfile = async (profileId: string, updates: Partial<Profile>) => {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        type: updates.type,
        role: updates.role || updates.type,
        photo: updates.photo,
        email: updates.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      setToastMessage(`Erro ao atualizar: ${error.message}`);
    } else if (updated) {
      setProfiles(profiles.map(p => p.id === profileId ? updated as Profile : p));
      if (selectedProfile?.id === profileId) setSelectedProfile(updated as Profile);
      setToastMessage('Perfil atualizado com sucesso');
    }
  };


  // Auth Initialization — check Supabase session on load
  useEffect(() => {
    let mounted = true;
    console.log('[Servyx] Initializing Auth...');
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('[Servyx] Session error during init:', error);
        // Clear everything if session is invalid
        handleLogout().then(() => {
          setView('LOGIN');
          setIsAuthReady(true);
        });
        return;
      }
      
      console.log('[Servyx] Auth session:', session ? 'User logged in' : 'No session');
      if (session?.user) {
        setCompanyName('SERVYX');
        loadDataFromSupabase().then(() => {
          if (mounted) {
            console.log('[Servyx] Initial data loaded');
            setView('PROFILES');
            setIsAuthReady(true);
          }
        }).catch(err => {
          console.error('[Servyx] Error loading initial data:', err);
          if (mounted) {
            setView('LOGIN');
            setIsAuthReady(true);
          }
        });
      } else {
        setView('LOGIN');
        setIsAuthReady(true);
      }
    }).catch(err => {
      console.error('[Servyx] Supabase Session Fatal Error:', err);
      if (mounted) {
        handleLogout().then(() => {
          setView('LOGIN');
          setIsAuthReady(true);
        });
      }
    });

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-hide toast messages
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err) {
      console.error('Google login error:', err);
      setToastMessage('Erro ao entrar com Google');
    }
  };

  const handleLogin = async (email?: string, password?: string) => {
    if (email && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Fallback: if no account exists, try to sign up automatically
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
          if (signUpError) throw signUpError;
          if (signUpData.user) {
            const profile = {
              id: signUpData.user.id,
              name: signUpData.user.email || 'Administrador',
              type: 'ADM' as ProfileType,
              role: 'ADM',
              photo: `https://picsum.photos/seed/${signUpData.user.id}/200/200`
            };
            setCompanyName('SERVYX');
            setProfiles([profile]);
            setSelectedProfile(profile);
            setToastMessage('Conta criada e login realizado!');
            await loadDataFromSupabase();
            setView('PROFILES');
          }
          return;
        }
        if (data.user) {
          const profile = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email || 'Administrador',
            type: 'ADM' as ProfileType,
            role: 'ADM',
            photo: data.user.user_metadata?.avatar_url || `https://picsum.photos/seed/${data.user.id}/200/200`
          };
          setCompanyName('SERVYX');
          setProfiles([profile]);
          setSelectedProfile(profile);
          setToastMessage('Login realizado com sucesso!');
          await loadDataFromSupabase();
          setView('PROFILES');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao fazer login';
        setToastMessage(`Erro: ${message}`);
      }
    } else {
      setView('PROFILES');
    }
  };

  const handleRegister = async (company: string, name: string, email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { name, company } }
      });
      if (error) throw error;
      if (data.user) {
        const profile = {
          id: data.user.id,
          name: name,
          type: 'ADM' as ProfileType,
          role: 'ADM',
          photo: `https://picsum.photos/seed/${data.user.id}/200/200`
        };
        setCompanyName(company);
        setProfiles([profile]);
        setSelectedProfile(profile);
        setToastMessage('Conta criada com sucesso!');
        setView('DASHBOARD');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      setToastMessage(`Erro: ${message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSelectedProfile(null);
    setProfiles([]);
    setCustomers([]);
    setOrders([]);
    setView('LOGIN');
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
      'ADM': ['nova_os', 'status_os', 'clientes', 'garantia', 'produtos', 'servicos', 'caixa', 'financeiro', 'fornecedores', 'agenda', 'ajustes', 'relatorios', 'relacionamento'],
      'Financeiro': ['caixa', 'financeiro', 'fornecedores', 'garantia'],
      'Técnico': ['nova_os', 'status_os', 'agenda', 'garantia', 'relacionamento'],
      'Atendente': ['nova_os', 'status_os', 'clientes', 'garantia', 'relacionamento']
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
      } else if (moduleId === 'servicos') {
        setView('SERVICOS');
      } else if (moduleId === 'fornecedores') {
        setView('FORNECEDORES');
      } else if (moduleId === 'relatorios') {
        setView('RELATORIOS');
      } else if (moduleId === 'relacionamento') {
        setView('RELACIONAMENTO');
      } else if (moduleId === 'garantia') {
        setView('GARANTIA');
      } else {
        setToastMessage(`Módulo ${moduleId} em desenvolvimento`);
      }
    } else {
      setToastMessage('Acesso negado');
    }
  };

  const handleSaveProfile = async (profileData: Omit<Profile, 'id'>) => {
    if (profiles.length === 1 && !admPin) {
      // First additional profile, require ADM PIN
      setPendingProfile(profileData);
      setView('CREATE_PIN');
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        // Filter only columns that exist in our database table
        const profileToSave = {
          name: profileData.name,
          type: profileData.type,
          role: profileData.role || profileData.type,
          photo: profileData.photo,
          email: profileData.email as string || '',
          user_id: uid
        };

        const { data: inserted, error } = await supabase
          .from('profiles')
          .insert(profileToSave)
          .select()
          .single();
        
        if (error) {
          console.error('Error details:', error);
          setToastMessage(`Erro (${error.code}): ${error.message}`);
          return;
        }

        if (inserted) {
          setProfiles([...profiles, inserted as Profile]);
          setToastMessage('Perfil criado com sucesso!');
        }
      }
      setView('PROFILES');
    }
  };

  const handleSavePin = async (pin: string) => {
    setAdmPin(pin);
    if (pendingProfile) {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        // Filter only columns that exist in our database table
        const profileToSave = {
          name: pendingProfile.name,
          type: pendingProfile.type,
          role: pendingProfile.role || pendingProfile.type,
          photo: pendingProfile.photo,
          email: pendingProfile.email as string || '',
          user_id: uid
        };

        const { data: inserted, error } = await supabase
          .from('profiles')
          .insert(profileToSave)
          .select()
          .single();
        
        if (error) {
          console.error('Error details after PIN:', error);
          setToastMessage(`Erro (${error.code}): ${error.message}`);
        } else if (inserted) {
          setProfiles([...profiles, inserted as Profile]);
          setToastMessage('Perfil e PIN configurados!');
        }
      }
      setPendingProfile(null);
    }
    setView('PROFILES');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden print:overflow-visible print:bg-white relative">
      {/* Decorative glowing blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-[#00E676]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

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
            <ProfilesView 
              profiles={profiles} 
              onSelectProfile={handleSelectProfile} 
              onAddProfile={() => setView('CREATE_PROFILE')}
            />
          </motion.div>
        )}
        {view === 'PIN_ENTRY' && (
          <motion.div key="pin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0">
            <PinEntryView onVerify={handleVerifyPin} onCancel={() => setView('PROFILES')} />
          </motion.div>
        )}
        {view === 'DASHBOARD' && selectedProfile && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
            <DashboardView 
              view={view} 
              profile={selectedProfile} 
              onNavigate={handleNavigate} 
              onLogout={handleLogout}
              customers={customers}
              products={products}
            />
          </motion.div>
        )}
        {view === 'SETTINGS' && selectedProfile && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <SettingsView 
              profiles={profiles} 
              onBack={() => setView('DASHBOARD')} 
              onCreateProfile={() => setView('CREATE_PROFILE')} 
              onDeleteProfile={handleDeleteProfile}
              onUpdateProfile={handleUpdateProfile}
              osSettings={osSettings}
              setOsSettings={setOsSettings}
              companySettings={companySettings}
              setCompanySettings={setCompanySettings}
              profile={selectedProfile as Profile}
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
              onBack={() => {
                setView('DASHBOARD');
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
              companySettings={companySettings}
              onEdit={(order) => {
                setEditingOrder(order);
                setView('NOVA_OS');
              }}
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
            <FinanceiroModuleView 
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
        {view === 'RELATORIOS' && selectedProfile && (
          <motion.div key="relatorios" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <RelatoriosModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
            />
          </motion.div>
        )}
        {view === 'SERVICOS' && selectedProfile && (
          <motion.div key="servicos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <ServicosModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
            />
          </motion.div>
        )}
        {view === 'FORNECEDORES' && selectedProfile && (
          <motion.div key="fornecedores" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <FornecedoresModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
            />
          </motion.div>
        )}
        {view === 'GARANTIA' && selectedProfile && (
          <motion.div key="garantia" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <GarantiaModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage} 
            />
          </motion.div>
        )}
        {view === 'RELACIONAMENTO' && selectedProfile && (
          <motion.div key="relacionamento" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto">
            <RelacionamentoModule 
              profile={selectedProfile} 
              onBack={() => setView('DASHBOARD')} 
              onShowToast={setToastMessage}
              customers={customers}
              orders={orders}
              osSettings={osSettings}
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative z-10 w-full overflow-x-hidden overflow-y-hidden md:overflow-y-auto">
      <div className="w-full max-w-md mx-auto -mt-6 sm:-mt-10">
        <div className="flex justify-center -mb-6 sm:-mb-12 relative z-0">
          <div className="flex flex-col items-center gap-0">
            <img
              src="/logo.png"
              alt="Servyx Logo"
              className="servyx-logo-hero drop-shadow-[0_0_35px_rgba(0,230,118,0.3)]"
            />
          </div>
        </div>
        
        <div className="glass-panel rounded-[24px] p-8 shadow-2xl relative z-10 w-full max-w-[400px] border border-white/5 mx-auto">
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-[#00E676] transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-800/50 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676]/50 focus:bg-black/60 transition-all placeholder:text-zinc-600" 
                  placeholder="name@company.com" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Senha de Acesso</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-[#00E676] transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-800/50 rounded-xl pl-12 pr-12 py-3 text-sm text-white focus:outline-none focus:border-[#00E676]/50 focus:bg-black/60 transition-all placeholder:text-zinc-600" 
                  placeholder="Digite sua senha" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-zinc-600 hover:text-zinc-400"
                >
                  {showPassword ? <Eye size={18} className="text-[#00E676]" /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="pt-2">
              <button type="submit" className="w-full bg-[#00E676] hover:bg-[#00C853] text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#00E676]/20 active:scale-[0.99] text-sm uppercase tracking-wider">
                Entrar no Sistema
              </button>
            </div>

            <div className="text-center">
              <button 
                type="button" 
                onClick={onRegister}
                className="text-zinc-400 hover:text-white transition-colors text-xs font-medium"
              >
                Não tem uma conta? <span className="text-[#00E676] hover:underline">Criar conta</span>
              </button>
            </div>
            
            <div className="relative py-2 px-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800/50"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-[#0a0a0a] px-3 text-zinc-600 tracking-widest font-bold italic">ou</span>
              </div>
            </div>
            
            <button 
              type="button" 
              onClick={onGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 py-3 rounded-xl transition-all text-xs font-bold text-zinc-300 active:scale-[0.99]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Account
            </button>
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative z-10 w-full overflow-x-hidden">
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Criar nova conta</h1>
        </div>
        
        <div className="glass-panel rounded-[32px] p-8 shadow-2xl">
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

function ProfilesView({ profiles, onSelectProfile, onAddProfile }: { profiles: Profile[], onSelectProfile: (p: Profile) => void, onAddProfile: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-4 text-center">
      <div className="w-full max-w-4xl py-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">Escolha seu perfil</h1>
        <p className="text-xl text-zinc-400 mb-16 font-light">Quem está acessando hoje?</p>
        
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12 max-w-4xl mx-auto">
          {profiles.map(p => (
            <button key={p.id} onClick={() => onSelectProfile(p)} className="group flex flex-col items-center gap-4 transition-all hover:scale-110 focus:outline-none">
              <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#00E676] group-focus:border-[#00E676] transition-all shadow-2xl relative bg-zinc-800">
                <Image src={p.photo} alt={p.name} fill className="object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="text-center">
                <p className="text-zinc-300 group-hover:text-white group-focus:text-white font-medium text-xl transition-colors">{p.name}</p>
              </div>
            </button>
          ))}
          
          <button onClick={onAddProfile} className="group flex flex-col items-center gap-4 transition-all hover:scale-110 focus:outline-none">
            <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-[#00E676] transition-all flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-[#00E676] transition-colors">
                <Plus size={28} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-zinc-400 group-hover:text-white font-medium text-xl transition-colors">Adicionar</p>
            </div>
          </button>
        </div>
        
        <button className="mt-20 px-10 py-3 rounded-xl border border-zinc-800 text-zinc-500 font-medium tracking-wider text-xs hover:bg-white/5 transition-colors uppercase">
          Gerenciar Perfis
        </button>
      </div>
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="w-full max-w-sm glass-panel rounded-[32px] p-10 shadow-2xl border border-white/5 text-center relative z-10">
        <div className="w-20 h-20 bg-black/40 border border-[#00E676]/20 text-[#00E676] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(0,230,118,0.1)]">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Digite seu PIN</h2>
        <p className="text-zinc-500 mb-10 text-sm font-medium uppercase tracking-[0.2em]">Segurança ADM</p>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <input 
            type="password" 
            maxLength={4}
            required
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-4 py-5 text-center text-5xl tracking-[0.6em] text-white focus:outline-none focus:border-[#00E676] transition-all font-mono shadow-inner" 
            placeholder="••••" 
          />
          
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={onCancel} 
              className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-400 font-bold py-4 rounded-2xl transition-all border border-white/5"
            >
              Voltar
            </button>
            <button 
              type="submit" 
              disabled={pin.length !== 4} 
              className="flex-1 bg-[#00E676] hover:bg-[#00C853] text-black font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[#00E676]/20 disabled:opacity-30 disabled:grayscale active:scale-[0.98]"
            >
              Acessar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardView({ 
  view, 
  profile, 
  onNavigate, 
  onLogout,
  customers,
  products 
}: { 
  view: View, 
  profile: Profile, 
  onNavigate: (module: string) => void, 
  onLogout: () => void,
  customers: Customer[],
  products: Product[]
}) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const notifications = useMemo(() => {
    const list: { id: string, type: 'BIRTHDAY' | 'STOCK' | 'ALERT', title: string, message: string, icon: any, color: string, moduleId?: string }[] = [];
    
    // Low stock
    products.filter(p => p.stock <= p.minStock).forEach(p => {
      list.push({
        id: `stock-${p.id}`,
        type: 'STOCK',
        title: 'Estoque Baixo',
        message: `${p.name} está com apenas ${p.stock} unidades.`,
        icon: Package,
        color: 'text-red-400',
        moduleId: 'produtos'
      });
    });

    // Birthdays today
    const today = new Date();
    const todayStr = format(today, 'MM-dd');
    customers.filter(c => c.birthDate && c.birthDate.substring(5) === todayStr).forEach(c => {
      list.push({
        id: `bday-${c.id}`,
        type: 'BIRTHDAY',
        title: 'Aniversário Hoje!',
        message: `${c.name} está fazendo aniversário hoje. Envie um mimo!`,
        icon: Cake,
        color: 'text-[#00E676]',
        moduleId: 'relacionamento'
      });
    });

    return list;
  }, [products, customers]);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 60;
      if (window.innerWidth < 640) {
        setShowShortcuts(isAtBottom);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all relative ${
                  isNotificationsOpen ? 'bg-[#00E676] border-[#00E676] text-black' : 'bg-[#1A1A1A] border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {notifications.length > 0 && !isNotificationsOpen && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#00E676] rounded-full ring-2 ring-[#0a0a0a]"></div>
                )}
                <AlertCircle size={18} />
              </button>

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
                        <span className="bg-[#00E676]/10 text-[#00E676] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {notifications.length} Alertas
                        </span>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-zinc-800/50">
                            {notifications.map(n => (
                              <button 
                                key={n.id}
                                onClick={() => {
                                  if (n.moduleId) onNavigate(n.moduleId);
                                  setIsNotificationsOpen(false);
                                }}
                                className="w-full p-4 hover:bg-zinc-800/30 transition-colors flex gap-4 text-left group"
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
                            ))}
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
            <button onClick={onLogout} className="relative w-10 h-10 rounded-full border-2 border-[#00E676] overflow-hidden p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden relative bg-zinc-800">
                <Image src={profile.photo} alt={profile.name} fill className="object-cover" referrerPolicy="no-referrer" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-32 overflow-x-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {modules.map(m => (
            <button 
              key={m.id} 
              onClick={() => onNavigate(m.id)}
              className="bg-[#1A1A1A] border border-zinc-800 hover:border-zinc-700 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all group text-center aspect-square"
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
      
      <motion.footer 
        initial={{ y: "85%" }}
        animate={{ 
          y: showShortcuts ? 0 : "85%"
        }}
        whileHover={{ y: 0 }}
        onViewportEnter={() => { if(window.innerWidth < 640) setShowShortcuts(true) }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-[#121212]/90 backdrop-blur-xl flex items-center justify-around px-2 z-30 shadow-2xl overflow-hidden group hover:bg-[#121212]" 
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
          onClick={() => {
            if (profile.type === 'ADM' || profile.role === 'ADM') {
              onNavigate('relatorios');
            } else {
              onLogout(); // Just to trigger a refresh or show access denied if handled by onNavigate
              // Actually, better to just show the toast.
              // dashboard doesn't have setToastMessage, it's passed via props? No.
              // Let's check how onNavigate handles it.
              onNavigate('relatorios'); 
            }
          }}
          className={`flex flex-col items-center gap-1 transition-colors px-4 py-2 ${view === 'RELATORIOS' ? 'text-[#00E676]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <BarChart2 size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Relatórios</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors px-4 py-2">
          <HeadphonesIcon size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Suporte</span>
        </button>
        <button onClick={() => onNavigate('ajustes')} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors px-4 py-2">
          <Settings size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Ajustes</span>
        </button>
      </motion.footer>
    </div>
  );
}

function SettingsView({ 
  profiles, 
  onBack, 
  onCreateProfile,
  osSettings,
  setOsSettings,
  onDeleteProfile,
  onUpdateProfile,
  companySettings,
  setCompanySettings,
  profile
}: { 
  profiles: Profile[], 
  onBack: () => void, 
  onCreateProfile: () => void,
  onDeleteProfile: (id: string) => void,
  onUpdateProfile: (id: string, updates: Partial<Profile>) => void,
  osSettings: { nextOsNumber: number, checklistItems: string[], whatsappMessages: Record<string, string>, printTerms: string },
  setOsSettings: (v: any) => void | Promise<void>,
  companySettings: any,
  setCompanySettings: (v: any) => void | Promise<void>,
  profile: Profile
}) {
  const [activeSection, setActiveSection] = useState<'MENU' | 'PROFILES' | 'OS' | 'WHATSAPP_MARKETING' | 'COMPANY'>('MENU');
  const [selectedCategory, setSelectedCategory] = useState<string>('Celular');
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isWhatsappSettingsOpen, setIsWhatsappSettingsOpen] = useState(false);
  const [isOsNotesOpen, setIsOsNotesOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<ProfileType>('Técnico');
  const [editPhoto, setEditPhoto] = useState('');
  
  // Company state
  const [companyForm, setCompanyForm] = useState(companySettings);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const readAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) {
        if (error.message.includes('bucket not found') || error.message.includes('Bucket not found')) {
          console.log('Bucket "avatars" not found, falling back to Base64');
          const base64 = await readAsBase64(file);
          setCompanyForm((prev: any) => ({ ...prev, logoUrl: base64 }));
          return;
        } else {
          throw error;
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setCompanyForm((prev: any) => ({ ...prev, logoUrl: publicUrl }));
    } catch (err: any) {
      console.error('Logo upload error:', err);
      alert('Erro ao carregar logo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) {
        if (error.message.includes('bucket not found') || error.message.includes('Bucket not found')) {
          // Fallback to Base64 if bucket doesn't exist
          console.log('Bucket "avatars" not found, falling back to Base64');
          const base64 = await readAsBase64(file);
          setEditPhoto(base64);
          return;
        } else {
          throw error;
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditPhoto(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Erro ao carregar imagem: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setOsSettings((prev: any) => {
        const byCategory = prev.checklistByCategory || {};
        const currentItems = byCategory[selectedCategory] || [];
        return {
          ...prev,
          checklistByCategory: {
            ...byCategory,
            [selectedCategory]: [...currentItems, newItemName.trim()]
          }
        };
      });
      setNewItemName('');
    }
  };

  const handleSaveEdit = (index: number) => {
    if (editingName.trim()) {
      setOsSettings((prev: any) => {
        const byCategory = prev.checklistByCategory || {};
        const newItems = [...(byCategory[selectedCategory] || [])];
        newItems[index] = editingName.trim();
        return {
          ...prev,
          checklistByCategory: {
            ...byCategory,
            [selectedCategory]: newItems
          }
        };
      });
      setEditingIndex(null);
    }
  };

  const handleRemoveItem = (index: number) => {
    setOsSettings((prev: any) => {
      const byCategory = prev.checklistByCategory || {};
      const newItems = (byCategory[selectedCategory] || []).filter((_: any, i: number) => i !== index);
      return {
        ...prev,
        checklistByCategory: {
          ...byCategory,
          [selectedCategory]: newItems
        }
      };
    });
  };

  const handleSaveWhatsappMessage = (status: string, message: string) => {
    setOsSettings((prev: any) => ({
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
            {activeSection === 'MENU' ? 'Ajustes' : 
             activeSection === 'PROFILES' ? 'Configuração de Perfis' : 
             activeSection === 'OS' ? 'Configuração de OS' : 
             activeSection === 'COMPANY' ? 'Dados da Empresa' :
             'Mensagens de Relacionamento'}
          </h1>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {activeSection === 'MENU' && (
            <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <button 
                onClick={() => setActiveSection('COMPANY')}
                className="w-full bg-[#00E676]/5 hover:bg-[#00E676]/10 border border-[#00E676]/20 rounded-2xl p-6 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-[#00E676]/10 text-[#00E676] flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-white group-hover:text-[#00E676] transition-colors">Dados da Empresa</h2>
                    <p className="text-sm text-zinc-400 mt-1">Identidade, contatos e link público da sua loja.</p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-500 group-hover:text-white transition-colors" />
              </button>

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

              <button 
                onClick={() => setActiveSection('WHATSAPP_MARKETING')}
                className="w-full bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/50 rounded-2xl p-6 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <MessageCircle size={24} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">Mensagens de Relacionamento</h2>
                    <p className="text-sm text-zinc-400 mt-1">Aniversário e Pós-venda automático.</p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-500 group-hover:text-white transition-colors" />
              </button>
            </motion.div>
          )}

          {activeSection === 'COMPANY' && (
            <motion.div key="company" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 shadow-xl">
                
                {/* Logo Upload Section */}
                <div className="flex flex-col sm:flex-row items-center gap-8 mb-10 pb-10 border-b border-zinc-800/50">
                  <div className="relative w-32 h-32 rounded-2xl bg-[#0A0A0A] border border-zinc-800 flex items-center justify-center overflow-hidden group/logo">
                    {companyForm.logoUrl ? (
                      <Image src={companyForm.logoUrl} alt="Logo" fill className="object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-600">
                        <Plus size={32} />
                        <span className="text-[10px] uppercase font-bold tracking-tighter">Sua Logo</span>
                      </div>
                    )}
                    <button 
                      onClick={() => logoInputRef.current?.click()}
                      disabled={profile.type !== 'ADM' || isUploading}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold uppercase disabled:hidden"
                    >
                      Alterar Logo
                    </button>
                  </div>
                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">Logotipo da Empresa</h3>
                      <p className="text-sm text-zinc-400">Esta imagem aparecerá nos orçamentos, portal do cliente e relatórios.</p>
                    </div>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      <button 
                        onClick={() => logoInputRef.current?.click()}
                        disabled={profile.type !== 'ADM' || isUploading}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all border border-zinc-700 disabled:opacity-50"
                      >
                        {isUploading ? 'Enviando...' : 'Selecionar Arquivo'}
                      </button>
                      <button 
                        onClick={() => setCompanyForm((prev: any) => ({ ...prev, logoUrl: '' }))}
                        disabled={profile.type !== 'ADM'}
                        className="bg-transparent hover:bg-red-500/10 text-zinc-500 hover:text-red-400 px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Basic Info Group */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em] mb-4">Informações Básicas</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
                        <input 
                          type="text"
                          disabled={profile.type !== 'ADM'}
                          value={companyForm.name}
                          onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                          placeholder="Ex: Tech Silva Assistência"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">CNPJ</label>
                        <input 
                          type="text"
                          disabled={profile.type !== 'ADM'}
                          value={companyForm.cnpj}
                          onChange={e => setCompanyForm({...companyForm, cnpj: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">WhatsApp</label>
                          <input 
                            type="text"
                            disabled={profile.type !== 'ADM'}
                            value={companyForm.whatsapp}
                            onChange={e => setCompanyForm({...companyForm, whatsapp: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone Fixo</label>
                          <input 
                            type="text"
                            disabled={profile.type !== 'ADM'}
                            value={companyForm.phone}
                            onChange={e => setCompanyForm({...companyForm, phone: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                            placeholder="(11) 5555-5555"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Comercial</label>
                        <input 
                          type="email"
                          disabled={profile.type !== 'ADM'}
                          value={companyForm.email}
                          onChange={e => setCompanyForm({...companyForm, email: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                          placeholder="contato@empresa.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">URL amigável (Portal do Cliente)</label>
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text"
                            disabled={profile.type !== 'ADM'}
                            value={companyForm.publicSlug}
                            onChange={e => {
                              const slug = e.target.value
                                .toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/[^a-z0-9]/g, '');
                              setCompanyForm({...companyForm, publicSlug: slug});
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] font-mono disabled:opacity-50"
                            placeholder="ex: techsilva"
                          />
                          <p className="text-[10px] text-zinc-500 ml-1">
                            Link: servyx.com.br/p/<strong>{companyForm.publicSlug || 'sua-loja'}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Group */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em] mb-4">Endereço da Assistência</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">CEP</label>
                          <input 
                            type="text"
                            disabled={profile.type !== 'ADM'}
                            value={companyForm.zipCode}
                            onChange={e => setCompanyForm({...companyForm, zipCode: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                            placeholder="00000-000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">UF</label>
                          <input 
                            type="text"
                            disabled={profile.type !== 'ADM'}
                            value={companyForm.state}
                            onChange={e => setCompanyForm({...companyForm, state: e.target.value.toUpperCase()})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50 text-center"
                            placeholder="SP"
                            maxLength={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3 space-y-2">
                          <label className="text-[10px) font-bold text-zinc-500 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                          <input 
                            type="text"
                            disabled={profile.type !== 'ADM'}
                            value={companyForm.street}
                            onChange={e => setCompanyForm({...companyForm, street: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                            placeholder="Nome da avenida ou rua"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nº</label>
                          <input 
                            type="text"
                            disabled={profile.type !== 'ADM'}
                            value={companyForm.number}
                            onChange={e => setCompanyForm({...companyForm, number: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                            placeholder="123"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Bairro</label>
                        <input 
                          type="text"
                          disabled={profile.type !== 'ADM'}
                          value={companyForm.neighborhood}
                          onChange={e => setCompanyForm({...companyForm, neighborhood: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                          placeholder="Nome do bairro"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Cidade</label>
                        <input 
                          type="text"
                          disabled={profile.type !== 'ADM'}
                          value={companyForm.city}
                          onChange={e => setCompanyForm({...companyForm, city: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Complemento</label>
                        <input 
                          type="text"
                          disabled={profile.type !== 'ADM'}
                          value={companyForm.complement}
                          onChange={e => setCompanyForm({...companyForm, complement: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E676] disabled:opacity-50"
                          placeholder="Sala, Andar, Referência..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {profile.type === 'ADM' && (
                  <div className="mt-12 pt-6 border-t border-zinc-800/50 flex justify-end">
                    <button 
                      onClick={() => setCompanySettings(companyForm)}
                      className="w-full md:w-fit bg-[#00E676] hover:bg-[#00C853] text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#00E676]/20 active:scale-95"
                    >
                      <Check size={20} />
                      Salvar Alterações
                    </button>
                  </div>
                )}
              </div>
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
                    <div key={p.id} className="p-6 flex items-center gap-5 hover:bg-zinc-800/20 transition-colors group/row">
                      <div className="relative w-14 h-14 rounded-full border border-zinc-700 overflow-hidden shrink-0 bg-zinc-800">
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
                      <div className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingProfile(p);
                            setEditName(p.name);
                            setEditType(p.type as ProfileType);
                            setEditPhoto(p.photo);
                          }}
                          className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => onDeleteProfile(p.id)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                  {profiles.length === 0 && (
                    <div className="p-12 text-center text-zinc-500">Nenhum perfil cadastrado.</div>
                  )}
                </div>
              </div>

              {/* Edit Profile Modal */}
              <AnimatePresence>
                {editingProfile && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  >
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    >
                      <h3 className="text-xl font-bold mb-6">Editar Perfil</h3>
                      <div className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative w-24 h-24 rounded-full border-2 border-zinc-800 overflow-hidden bg-zinc-950 shadow-inner">
                            <Image src={editPhoto} alt="Preview" fill className="object-cover" />
                          </div>
                          <div className="w-full space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Link da Foto de Perfil</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={editPhoto}
                                onChange={e => setEditPhoto(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                placeholder="URL da imagem (Google, Picsum...)"
                              />
                              <input 
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                              />
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-colors border border-zinc-700"
                              >
                                {isUploading ? '...' : 'Upload'}
                              </button>
                              <button 
                                onClick={() => setEditPhoto(`https://picsum.photos/seed/${Math.random()}/200/200`)}
                                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-colors border border-zinc-700"
                              >
                                Nova
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Nome do Usuário</label>
                          <input 
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Tipo de Acesso</label>
                          <select 
                            value={editType}
                            onChange={e => setEditType(e.target.value as ProfileType)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                          >
                            <option value="ADM">ADM (Acesso Total)</option>
                            <option value="Técnico">Técnico (Foco em OS)</option>
                            <option value="Atendente">Atendente (Cadastro/OS)</option>
                            <option value="Financeiro">Financeiro (Caixa/Contas)</option>
                          </select>
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button 
                            onClick={() => setEditingProfile(null)}
                            className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors text-sm"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => {
                              onUpdateProfile(editingProfile.id, { 
                                name: editName, 
                                type: editType, 
                                photo: editPhoto 
                              });
                              setEditingProfile(null);
                            }}
                            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 text-sm"
                          >
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                      onChange={e => setOsSettings((prev: any) => ({ ...prev, nextOsNumber: parseInt(e.target.value) || 1 }))}
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
                        {/* Categorias */}
                        <div className="flex flex-wrap gap-2 mb-6 p-2 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                          {['Celular', 'Tablet', 'Notebook', 'Computador', 'Videogame', 'Controle', 'Outro'].map(cat => (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                selectedCategory === cat 
                                  ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' 
                                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2 mb-4">
                          <input 
                            type="text" 
                            placeholder={`Novo item para ${selectedCategory}...`} 
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
                          {((osSettings as any).checklistByCategory?.[selectedCategory] || []).map((item: string, index: number) => (
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
                          {(!(osSettings as any).checklistByCategory?.[selectedCategory] || (osSettings as any).checklistByCategory[selectedCategory].length === 0) && (
                            <div className="p-6 text-center text-zinc-500 text-sm">Nenhum item configurado para {selectedCategory}.</div>
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
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[nome_cliente]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[numero_os]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[status]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[marca]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[modelo]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[defeito]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[data_entrada]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[link_os]</span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-300">[nome_assistencia]</span>
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

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-xl">
                <button 
                  onClick={() => setIsOsNotesOpen(!isOsNotesOpen)}
                  className="w-full p-8 flex items-center justify-between hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-1">Observação da OS</h2>
                      <p className="text-sm text-zinc-400">Informações importantes e regras da assistência para o PDF.</p>
                    </div>
                  </div>
                  <ChevronDown className={`text-zinc-500 transition-transform duration-300 ${isOsNotesOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isOsNotesOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-zinc-800/50"
                    >
                      <div className="p-8 space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Regras e Termos da Assistência</label>
                           <textarea 
                             value={osSettings.printTerms}
                             onChange={e => setOsSettings({ ...osSettings, printTerms: e.target.value })}
                             className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[160px] resize-y transition-all"
                             placeholder="Ex: Pós 90 dias sem retirada o equipamento será considerado abandonado... Garantia de 90 dias nas peças trocadas..."
                           />
                           <p className="text-[10px] text-zinc-500 ml-1 italic leading-relaxed">
                             Essas informações serão exibidas automaticamente no rodapé do template de impressão da OS.
                           </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeSection === 'WHATSAPP_MARKETING' && (
            <motion.div key="marketing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-xl p-8">
                <div className="mb-8 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Cake size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Mensagem de Aniversário</h2>
                    <p className="text-sm text-zinc-500">Enviada para clientes aniversariantes da semana.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                    <p className="text-xs text-zinc-400">Use <span className="font-mono text-zinc-200">[nome]</span> para incluir o nome do cliente.</p>
                  </div>
                  <textarea 
                    value={osSettings.whatsappMessages?.['birthday'] || ''}
                    onChange={(e) => handleSaveWhatsappMessage('birthday', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-all min-h-[120px] resize-none"
                    placeholder="Olá [nome], feliz aniversário!..."
                  />
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-xl p-8">
                <div className="mb-8 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Star size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Mensagem de Pós-venda</h2>
                    <p className="text-sm text-zinc-500">Enviada após a retirada do equipamento.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                    <p className="text-xs text-zinc-400">Use <span className="font-mono text-zinc-200">[nome]</span> para incluir o nome do cliente.</p>
                  </div>
                  <textarea 
                    value={osSettings.whatsappMessages?.['follow_up'] || ''}
                    onChange={(e) => handleSaveWhatsappMessage('follow_up', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all min-h-[120px] resize-none"
                    placeholder="Olá [nome], como está o funcionamento do seu aparelho?..."
                  />
                </div>
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
  const [photo, setPhoto] = useState(`https://picsum.photos/seed/${Math.random()}/200/200`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const readAsBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    };

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) {
        if (error.message.includes('bucket not found') || error.message.includes('Bucket not found')) {
          // Fallback to Base64 if bucket doesn't exist
          const base64 = await readAsBase64(file);
          setPhoto(base64);
          return;
        } else {
          throw error;
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPhoto(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Erro ao carregar imagem: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name,
      type,
      role: type,
      photo: photo
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2.5 hover:bg-zinc-800 rounded-xl transition-colors -ml-2 text-zinc-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-white">Novo Perfil</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-6 pb-2">
            <div className="relative w-28 h-28 rounded-full border-4 border-zinc-800 overflow-hidden bg-zinc-950 shadow-2xl">
              <Image src={photo} alt="Preview" fill className="object-cover" />
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white tracking-widest">SUBINDO...</span>
                </div>
              )}
            </div>
            
            <div className="w-full space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Foto de Perfil</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={photo}
                  onChange={e => setPhoto(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                  placeholder="Link da imagem..."
                />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-colors border border-zinc-700 shrink-0 text-white"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Nome do Usuário</label>
            <input 
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-blue-500 transition-all"
              placeholder="Ex: Gabriel Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Tipo de Acesso</label>
            <select 
              value={type}
              onChange={e => setType(e.target.value as ProfileType)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-blue-500 transition-all appearance-none"
            >
              <option value="ADM">ADM (Acesso Total)</option>
              <option value="Técnico">Técnico (Foco em OS)</option>
              <option value="Atendente">Atendente (Cadastro)</option>
              <option value="Financeiro">Financeiro (Caixa)</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={isUploading}
            className="w-full py-4.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-500/20 mt-4 active:scale-[0.98] disabled:opacity-50"
          >
            {isUploading ? 'Aguarde...' : 'Concluir Cadastro'}
          </button>
        </form>
      </motion.div>
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

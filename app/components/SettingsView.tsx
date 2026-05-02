import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  UserCog, 
  FileCog, 
  MessageCircle, 
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Camera,
  Save,
  ShieldAlert,
  Hash,
  CheckCircle2,
  Activity,
  User,
  Settings as SettingsIcon,
  Lock,
  Smartphone,
  Laptop,
  Check,
  Building,
  Mail,
  MapPin,
  Globe,
  Shield,
  Bookmark,
  PenTool,
  X,
  Home,
  Search,
  FileText,
  Zap,
  Clock,
  Calculator,
  XCircle,
  AlertTriangle,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Profile, CompanySettings, OsSettings, ProfileType, ActivityLog } from '../types';
import { supabase } from '../supabase';
import { AVAILABLE_MODULES } from '../constants';
import InfoTooltip from './InfoTooltip';
import OrderPrintTemplate from './OrderPrintTemplate';
import WarrantyPrintTemplate from './WarrantyPrintTemplate';
import { formatPhone } from '../utils/formatPhone';

interface SettingsViewProps {
  profiles: Profile[];
  onBack: () => void;
  onCreateProfile: () => void;
  onDeleteProfile: (id: string) => void;
  onUpdateProfile: (id: string, updates: Partial<Profile>) => void;
  osSettings: OsSettings;
  setOsSettings: (v: any) => void | Promise<void>;
  companySettings: CompanySettings;
  setCompanySettings: (v: any) => void | Promise<void>;
  profile: Profile;
  initialSection?: any;
  onFactoryReset: () => Promise<void>;
  showTutorial: boolean;
  onShowToast: (message: string) => void;
  logActivity?: (module: string, action: string, details: any) => Promise<void>;
}

export default function SettingsView({ 
  profiles, 
  onBack, 
  onCreateProfile,
  onDeleteProfile,
  onUpdateProfile,
  osSettings,
  setOsSettings,
  companySettings,
  setCompanySettings,
  profile,
  initialSection = 'MENU',
  onFactoryReset,
  showTutorial,
  onShowToast,
  logActivity
}: SettingsViewProps) {
   const [activeSection, setActiveSection] = useState<'MENU' | 'COMPANY' | 'PROFILES' | 'OS' | 'WHATSAPP_MARKETING' | 'AUDIT'>(initialSection);
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [auditUserFilter, setAuditUserFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const mockCustomer: any = {
    id: 'mock-1',
    company_id: 'mock-company',
    name: 'João da Silva (Simulação)',
    document: '123.456.789-00',
    phone: '(11) 99999-9999',
    whatsapp: '11999999999',
    address: 'Avenida Exemplo, 1234 - Bairro Nobre'
  };

  const mockOrder: any = {
    id: 'mock-order-1',
    osNumber: 1,
    customerId: 'mock-1',
    companyId: 'mock-company',
    status: 'Reparo Concluído',
    priority: 'Normal',
    equipment: {
      type: 'Smartphone',
      brand: 'Apple',
      model: 'iPhone 13 Pro',
      color: 'Grafite',
      serial: 'XYZ987654321',
      passwordType: 'none',
      passwordValue: '',
      condition: 'Em bom estado',
      accessories: 'Capa, Película'
    },
    defect: 'Bateria descarrega de forma rápida e aparelho esquenta.',
    checklist: {
      'Display': 'works',
      'Touch': 'works',
      'Câmera': 'works',
      'Câmera Frontal': 'works',
      'Microfone': 'works',
      'Alto Falante': 'works',
      'Wi-Fi': 'works',
    },
    checklistNotes: 'Aparelho entrou ligado e com bateria.',
    service: 'Substituição de Bateria Premium',
    budget: {
      items: [{ description: 'Bateria Original Apple', price: 450, quantity: 1, type: 'part' }],
      totalValue: 450,
      status: 'Aprovado'
    },
    financials: {
      totalValue: 450,
      amountPaid: 450,
      paymentStatus: 'Total'
    },
    history: [],
    completionData: {
      date: new Date().toISOString(),
      servicesPerformed: 'Serviço executado com sucesso.',
      partsUsed: 'Bateria Alta Capacidade',
      warrantyDays: 90,
      warrantyTerms: osSettings.warrantyTerms || 'Garantia padrao legal'
    },
    createdAt: new Date().toISOString()
  };

  useEffect(() => {
    if (initialSection) {
      if (initialSection === 'OS_PRINT') {
        setActiveSection('OS');
        setOsTab('PRINT');
      } else {
        setActiveSection(initialSection);
      }
    }
  }, [initialSection]);

  const [selectedCategory, setSelectedCategory] = useState<string>('Smartphone');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<ProfileType>('Técnico');
  const [editPhoto, setEditPhoto] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editEmail, setEditEmail] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editUsePin, setEditUsePin] = useState(false);
  const [companyForm, setCompanyForm] = useState(companySettings);
  const [isUploading, setIsUploading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [osTab, setOsTab] = useState<'CHECKLIST' | 'PRINT' | 'WARRANTY'>('CHECKLIST');
  const [nextOsInput, setNextOsInput] = useState(osSettings.nextOsNumber?.toString() || '1');
  const [localPrintTerms, setLocalPrintTerms] = useState(osSettings.printTerms || '');
  const printTermsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local states when osSettings changes from parent
  useEffect(() => {
    setLocalPrintTerms(osSettings.printTerms || '');
    setNextOsInput(osSettings.nextOsNumber?.toString() || '1');
  }, [osSettings.printTerms, osSettings.nextOsNumber]);

  const handlePrintTermsChange = (value: string) => {
    setLocalPrintTerms(value); // instant UI + preview update
  };
  
  const handleSavePrintTerms = () => {
    setOsSettings({ ...osSettings, printTerms: localPrintTerms }); // saves to DB
    onShowToast('Observações da O.S. salvas com sucesso!');
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          profile:profiles(name, photo)
        `)
        .eq('company_id', profile.company_id)
        .gte('created_at', `${auditDate}T00:00:00`)
        .lte('created_at', `${auditDate}T23:59:59`);

      if (auditUserFilter !== 'all') {
        query = query.eq('profile_id', auditUserFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[Servyx Audit] Fetch Error:', error.message, error.details);
        onShowToast('Falha ao carregar logs de auditoria');
        throw error;
      }
      
      // Client-side filtering for search query (searching inside details JSONB)
      let filteredData = data || [];
      if (auditSearch.trim()) {
        const search = auditSearch.toLowerCase();
        filteredData = filteredData.filter((log: ActivityLog) => {
          const detailsString = JSON.stringify(log.details || {}).toLowerCase();
          const profileName = log.profile?.name?.toLowerCase() || '';
          return detailsString.includes(search) || 
                 profileName.includes(search) || 
                 log.module.toLowerCase().includes(search) ||
                 log.action.toLowerCase().includes(search);
        });
      }

      setAuditLogs(filteredData);
    } catch (err: any) {
      console.error('[Servyx Audit] Global Error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'AUDIT') {
      fetchAuditLogs();
    }
  }, [activeSection, auditDate, auditUserFilter, auditSearch]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleEditPermission = (moduleId: string) => {
    setEditPermissions(prev => prev.includes(moduleId) ? prev.filter(p => p !== moduleId) : [...prev, moduleId]);
  };

  const onEditProfile = (p: Profile) => {
    setEditingProfile(p);
    setEditName(p.name || '');
    setEditType(p.type || p.role as ProfileType || 'Técnico');
    setEditPhoto(p.photo || p.photo_url || '');
    setEditPermissions(p.permissions || []);
    setEditEmail(p.email || '');
    setEditPin(p.pin || '');
    setEditUsePin(!!p.pin);
  };

  const onSaveProfile = () => {
    if (!editingProfile) return;
    onUpdateProfile(editingProfile.id, {
      name: editName,
      type: editType,
      role: editType, // Keep both for safety
      photo: editPhoto,
      photo_url: editPhoto, // Keep both for safety
      email: editEmail,
      pin: editUsePin ? editPin : undefined,
      permissions: editPermissions
    });

    logActivity?.('EQUIPE', 'EDITOU PERFIL', {
      profileName: editName,
      profileType: editType,
      description: `Editou o perfil de ${editName} (${editType})`
    });

    setEditingProfile(null);
  };

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setCompanyForm((prev: any) => ({
            ...prev,
            zipCode: cep,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state
          }));
        }
      } catch (err) { console.error(err); }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `logos/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('photos').upload(fileName, file);
      
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
      setCompanyForm({ ...companyForm, logoUrl: publicUrl });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      onShowToast(`Erro ao salvar logo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `avatars/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('photos').upload(fileName, file);
      
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
      setEditPhoto(publicUrl);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      onShowToast(`Erro ao salvar perfil: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setOsSettings((prev: any) => {
        const byCategory = prev.checklistByCategory || {};
        const currentItems = byCategory[selectedCategory] || [];
        return { ...prev, checklistByCategory: { ...byCategory, [selectedCategory]: [...currentItems, newItemName.trim()] } };
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
        return { ...prev, checklistByCategory: { ...byCategory, [selectedCategory]: newItems } };
      });
      setEditingIndex(null);
    }
  };

  const handleRemoveItem = (index: number) => {
    setOsSettings((prev: any) => {
      const byCategory = prev.checklistByCategory || {};
      const newItems = (byCategory[selectedCategory] || []).filter((_: any, i: number) => i !== index);
      return { ...prev, checklistByCategory: { ...byCategory, [selectedCategory]: newItems } };
    });
  };

  const handleSaveWhatsappMessage = (status: string, message: string) => {
    setOsSettings((prev: any) => ({ ...prev, whatsappMessages: { ...prev.whatsappMessages, [status]: message } }));
  };

  // Helper masks
  const maskCEP = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
  const maskCNPJ = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] selection:bg-[#00E676]/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#00E676]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <header className="sticky top-0 z-40 bg-[#050505]/60 backdrop-blur-2xl border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto w-full px-6 h-24 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div className="flex gap-2">
              <button 
                title={activeSection === 'MENU' ? "Voltar ao Dashboard" : "Voltar ao Menu"}
                onClick={() => (activeSection === 'MENU' || activeSection === initialSection) ? onBack() : setActiveSection('MENU')} 
                className="w-12 h-12 flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-[12px] transition-all text-zinc-400 hover:text-white group hover:scale-105 active:scale-95"
              >
                <ArrowLeft size={22} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              {activeSection !== 'MENU' && (
                <button 
                  title="Voltar ao Dashboard"
                  onClick={onBack} 
                  className="w-12 h-12 flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-[12px] transition-all text-zinc-400 hover:text-white group hover:scale-105 active:scale-95"
                >
                  <Home size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                {activeSection === 'MENU' ? 'Ajustes' : 
                 activeSection === 'PROFILES' ? 'Equipe' : 
                 activeSection === 'OS' ? 'Configuração de OS' : 
                 activeSection === 'COMPANY' ? 'Empresa' :
                 activeSection === 'AUDIT' ? 'Rastreamento' :
                 'Mensagens'}
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
              </h1>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-1.5 opacity-60">Configuração do Ecossistema</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          <AnimatePresence mode="wait">
            {activeSection === 'MENU' && (
              <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="flex flex-col gap-3">
                  {[
                    { id: 'COMPANY', title: 'Minha Empresa', desc: 'Identidade, documentos e endereço.', icon: ShieldCheck, color: '#00E676' },
                    { id: 'PROFILES', title: 'Equipe e Acessos', desc: 'Gerenciar perfis, cargos e permissões.', icon: UserCog, color: '#3B82F6' },
                    { id: 'AUDIT', title: 'Rastreamento (Auditoria)', desc: 'Histórico de ações de cada perfil.', icon: Activity, color: '#E91E63' },
                    { id: 'OS', title: 'Configuração de OS', desc: 'Checklists, garantias e termos de serviço.', icon: FileCog, color: '#F59E0B' },
                    { id: 'WHATSAPP_MARKETING', title: 'Relacionamento', desc: 'Configurar mensagens automáticas e marketing.', icon: MessageCircle, color: '#A855F7' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => setActiveSection(item.id as any)}
                        className="bg-[#111] border border-white/5 hover:border-[#00E676]/30 hover:bg-[#00E676]/[0.02] rounded-[12px] p-5 text-left transition-all group flex items-center gap-5"
                      >
                        <div className="w-12 h-12 rounded-lg bg-white/[0.03] flex items-center justify-center group-hover:bg-[#00E676]/10 group-hover:scale-110 transition-all" style={{ color: item.color }}>
                          <Icon size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-bold text-base">{item.title}</h3>
                            {item.id === 'COMPANY' && companySettings.name === '' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            )}
                          </div>
                          <p className="text-zinc-500 text-[11px] leading-tight mt-0.5">{item.desc}</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-zinc-900/50 flex items-center justify-center text-zinc-600 group-hover:text-[#00E676] group-hover:bg-[#00E676]/10 transition-all">
                          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-10 border-t border-white/5">
                  <button 
                    onClick={onFactoryReset}
                    className="w-full bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 py-4 rounded-[12px] text-red-500 font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    ⚠️ Redefinir Sistema (Limpar Tudo)
                  </button>
                </div>
              </motion.div>
            )}

            {activeSection === 'COMPANY' && (
              <motion.div key="company" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                 <div className="bg-[#0A0A0A] border border-white/[0.05] rounded-[12px] p-6 sm:p-8 shadow-2xl relative overflow-hidden group/container">
                    {/* Glass Background Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#00E676]/5 rounded-full blur-[120px] -mr-48 -mt-48 opacity-10" />
                    
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 relative z-10">
                      {/* Logo Section */}
                      <div className="flex flex-col items-center gap-6 group/logo">
                        <div className="relative">
                          <div className="w-48 h-48 rounded-[12px] bg-black/40 border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover/logo:border-[#00E676]/40 shadow-inner relative">
                            {companyForm.logoUrl ? (
                              <img src={companyForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-6" />
                            ) : (
                              <Camera size={44} className="text-zinc-800" />
                            )}
                            {isUploading && (
                              <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                                <Activity size={24} className="text-[#00E676] animate-spin" />
                                <span className="text-[9px] font-black text-[#00E676] uppercase tracking-[0.3em]">OK</span>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => logoInputRef.current?.click()} 
                            className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#00E676] rounded-[6px] flex items-center justify-center text-black shadow-lg hover:scale-110 active:scale-90 transition-all z-20 border-2 border-[#0A0A0A]"
                          >
                            <Plus size={20} />
                          </button>
                          <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        </div>
                      </div>
   
                      {/* Basic Info Grid */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 w-full">
                        <div className="space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Building size={11} />
                            Nome Fantasia
                          </label>
                          <input 
                            type="text" 
                            value={companyForm.name} 
                            onChange={e => {
                              const name = e.target.value;
                              const slug = name.toLowerCase()
                                .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
                                .replace(/[^a-z0-9]/g, '-')
                                .replace(/-+/g, '-')
                                .replace(/^-|-$/g, '');
                              setCompanyForm({...companyForm, name: name, publicSlug: slug});
                            }} 
                            className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30 transition-all font-bold placeholder:text-zinc-800" 
                            placeholder="Ex: Servyx Assistência" 
                          />
                        </div>
                        <div className="space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Hash size={11} />
                            CNPJ / CPF
                          </label>
                          <input 
                            type="text" 
                            value={companyForm.cnpj} 
                            onChange={e => setCompanyForm({...companyForm, cnpj: maskCNPJ(e.target.value)})} 
                            className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30 transition-all font-bold placeholder:text-zinc-800" 
                            placeholder="00.000.000/0000-00" 
                          />
                        </div>
                        <div className="space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Mail size={11} />
                            E-mail Profissional
                          </label>
                          <input 
                            type="email" 
                            value={companyForm.email} 
                            onChange={e => setCompanyForm({...companyForm, email: e.target.value})} 
                            className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30 transition-all font-bold placeholder:text-zinc-800" 
                          />
                        </div>
                        <div className="space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Smartphone size={11} />
                            WhatsApp
                          </label>
                          <input 
                            type="text" 
                            value={companyForm.phone} 
                            onChange={e => {
                              const formatted = formatPhone(e.target.value);
                              setCompanyForm({...companyForm, phone: formatted, whatsapp: formatted});
                            }} 
                            className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30 transition-all font-bold placeholder:text-zinc-800" 
                          />
                        </div>
                      </div>
                    </div>
   
                    {/* Location Section */}
                    <div className="pt-8 mt-8 border-t border-white/[0.03] space-y-6 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[8px] bg-[#00E676]/10 flex items-center justify-center text-[#00E676]">
                          <MapPin size={18} />
                        </div>
                        <h4 className="text-white font-black text-base uppercase tracking-tight">Localização</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        <div className="md:col-span-3 space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">CEP</label>
                          <input 
                            type="text" 
                            value={companyForm.zipCode} 
                            onChange={e => {
                              const val = maskCEP(e.target.value);
                              setCompanyForm(prev => ({ ...prev, zipCode: val }));
                              if (val.length === 9) handleCepSearch(val);
                            }} 
                            className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30 font-bold" 
                          />
                        </div>
                        <div className="md:col-span-6 space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">Logradouro</label>
                          <input type="text" value={companyForm.street} onChange={e => setCompanyForm({...companyForm, street: e.target.value})} className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30" />
                        </div>
                        <div className="md:col-span-3 space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">Nº</label>
                          <input type="text" value={companyForm.number} onChange={e => setCompanyForm({...companyForm, number: e.target.value})} className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30 text-center" />
                        </div>
  
                        <div className="md:col-span-3 space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">Bairro</label>
                          <input type="text" value={companyForm.neighborhood} onChange={e => setCompanyForm({...companyForm, neighborhood: e.target.value})} className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30" placeholder="Ex: Centro" />
                        </div>
                        <div className="md:col-span-5 space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">Cidade / UF</label>
                          <div className="flex gap-2">
                            <input type="text" value={companyForm.city} onChange={e => setCompanyForm({...companyForm, city: e.target.value})} className="flex-1 min-w-0 h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30" placeholder="Ex: São Paulo" />
                            <input type="text" value={companyForm.state} maxLength={2} onChange={e => setCompanyForm({...companyForm, state: e.target.value.toUpperCase()})} className="w-14 h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] text-[13px] text-white focus:outline-none focus:border-[#00E676]/30 text-center uppercase" placeholder="UF" />
                          </div>
                        </div>
                        <div className="md:col-span-4 space-y-1.5 group/input">
                          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">Complemento / Obs</label>
                          <input type="text" value={companyForm.complement} onChange={e => setCompanyForm({...companyForm, complement: e.target.value})} className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30" placeholder="Ex: Sala 202, Loja 05" />
                        </div>
                      </div>
                    </div>
   
                    {/* Digital Presence */}
                    <div className="pt-8 mt-8 border-t border-white/[0.03] relative z-10">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-5 rounded-[10px] bg-white/[0.01] border border-white/[0.03]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[8px] bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Globe size={20} />
                          </div>
                          <div>
                            <h4 className="text-white font-black text-sm uppercase tracking-tight italic">Link Digital</h4>
                            <p className="text-[8px] text-[#00E676] font-bold uppercase tracking-widest mt-0.5">Sincronizado</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-zinc-600 font-bold text-[10px] italic">servyx.app/</span>
                           <span className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-[6px] text-white font-black text-[12px]">{companyForm.publicSlug}</span>
                        </div>
                      </div>
                    </div>
   
                    {/* Submit Action */}
                    <div className="mt-8 flex justify-center relative z-10">
                      <button 
                        onClick={() => {
                          setCompanySettings(companyForm);
                          logActivity?.('EMPRESA', 'ATUALIZOU DADOS', {
                            companyName: companyForm.name,
                            description: `Atualizou os dados cadastrais da empresa ${companyForm.name}`
                          });
                        }} 
                        className="w-full md:w-auto px-10 h-14 bg-[#00E676] hover:bg-[#00C853] text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-[8px] transition-all shadow-xl shadow-[#00E676]/10 flex items-center justify-center gap-3 group"
                      >
                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                        Salvar Alterações
                      </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/[0.03] flex justify-center relative z-10">
                      <button 
                        onClick={() => setActiveSection('OS')}
                        className="w-full md:w-auto px-8 h-12 bg-white/[0.02] border border-white/[0.05] hover:border-amber-500/30 text-zinc-500 hover:text-white font-black uppercase tracking-[0.1em] text-[9px] rounded-[8px] transition-all flex items-center justify-center gap-3 group"
                      >
                        <FileCog size={16} className="text-amber-500 group-hover:rotate-12 transition-transform" />
                        Configuração de OS
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </button>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeSection === 'PROFILES' && (
              <motion.div key="profiles" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
                  <div className="space-y-0.5">
                    <h3 className="text-xl font-black text-white tracking-tighter uppercase">Equipe Elite</h3>
                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em]">Gestão de Acessos</p>
                  </div>
                  <button 
                    onClick={onCreateProfile}
                    className="w-full sm:w-auto px-6 h-10 bg-white/[0.03] border border-white/[0.1] hover:border-[#00E676]/30 text-white font-black uppercase tracking-[0.15em] text-[9px] rounded-[8px] transition-all flex items-center justify-center gap-2 group/add"
                  >
                    <Plus size={14} className="text-[#00E676]" />
                    Novo Operador
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profiles.map(p => {
                    const isAdmin = p.role === 'admin';
                    
                    return (
                      <motion.div 
                        key={p.id}
                        whileHover={{ y: -2 }}
                        className="bg-[#0A0A0A] border border-white/[0.05] rounded-[12px] p-5 relative overflow-hidden group/card"
                      >
                        <div className="relative z-10 flex flex-col items-center">
                             <div className="flex justify-center mb-6">
                               <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/5 bg-zinc-900 shadow-2xl relative group-hover:border-[#00E676]/30 transition-all">
                                 {(p.photo || p.photo_url) ? (
                                   <img src={p.photo || p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                 ) : (
                                   <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-800">
                                     <User size={28} />
                                   </div>
                                 )}
                               </div>
                             </div>

                          <h4 className="text-base font-black text-white tracking-tight mb-0.5">{p.name}</h4>
                          <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-5">{p.role || p.type}</p>
                          
                          <div className="flex items-center gap-2 w-full">
                            <button 
                              onClick={() => onEditProfile(p)}
                              className="flex-1 h-9 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] text-white rounded-[6px] text-[8px] font-black uppercase tracking-widest"
                            >
                              Ajustes
                            </button>
                            <button 
                              onClick={() => onDeleteProfile(p.id)}
                              className="w-9 h-9 bg-red-500/5 text-zinc-800 hover:text-red-500 rounded-[6px] flex items-center justify-center transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Edit Modal */}
                <AnimatePresence>
                  {editingProfile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-sm" onClick={() => setEditingProfile(null)} />
                      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-[#0A0A0A] border border-white/10 rounded-[12px] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                           <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Operador</h3>
                           <button onClick={() => setEditingProfile(null)} className="w-9 h-9 rounded-[6px] bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                              <X size={18} />
                           </button>
                        </div>

                        <div className="space-y-6">
                          <div className="flex justify-center">
                             <div className="relative group">
                               <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#00E676] bg-zinc-900 shadow-2xl relative">
                                 {editPhoto ? (
                                   <img src={editPhoto} alt="Avatar" className="w-full h-full object-cover" />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center text-zinc-800"><User size={40} /></div>
                                 )}
                               </div>
                               <button 
                                 onClick={() => fileInputRef.current?.click()}
                                 className="absolute bottom-0 right-0 w-9 h-9 bg-[#00E676] rounded-full flex items-center justify-center text-black shadow-lg border-2 border-[#0A0A0A] hover:scale-110 transition-all"
                               >
                                 <Camera size={16} />
                               </button>
                               <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                             </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div className="space-y-1.5">
                               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.1em] ml-1">Nome</label>
                               <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[6px] px-4 text-white focus:outline-none focus:border-[#00E676]/30 font-bold text-xs" />
                             </div>
                             <div className="space-y-1.5">
                               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.1em] ml-1">Cargo</label>
                               <select value={editType} onChange={e => setEditType(e.target.value as any)} className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[6px] px-4 text-white focus:outline-none focus:border-[#00E676]/30 font-bold text-xs appearance-none">
                                 <option value="ADM">Administrador</option>
                                 <option value="Técnico">Técnico</option>
                                 <option value="Atendente">Atendente</option>
                                 <option value="Financeiro">Financeiro</option>
                               </select>
                             </div>
                           </div>

                           <div className="space-y-1.5">
                             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">E-mail Corporativo</label>
                             <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email para contato..." className="w-full h-11 bg-white/[0.02] border border-white/[0.05] rounded-[6px] px-4 text-white focus:outline-none focus:border-[#00E676]/30 font-medium text-xs" />
                           </div>

                           <div className="space-y-3">
                             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Módulos Permitidos</label>
                             <div className="flex flex-col gap-1.5 bg-black/40 border border-white/5 rounded-[8px] p-4 max-h-48 overflow-y-auto custom-scrollbar">
                               {AVAILABLE_MODULES.map(module => (
                                 <button
                                   key={module.id}
                                   onClick={() => toggleEditPermission(module.id)}
                                   className={`flex items-center justify-between p-2.5 rounded-[6px] border transition-all ${editPermissions.includes(module.id) ? 'bg-[#00E676]/10 border-[#00E676]/30 text-white' : 'bg-white/[0.01] border-white/[0.03] text-zinc-600 hover:text-zinc-500'}`}
                                 >
                                   <div className="flex items-center gap-2.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${editPermissions.includes(module.id) ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-zinc-800'}`} />
                                      <span className="text-[10px] font-bold tracking-tight uppercase">{module.name}</span>
                                   </div>
                                   <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${editPermissions.includes(module.id) ? 'bg-[#00E676] text-black' : 'bg-zinc-900 border border-white/5'}`}>
                                     {editPermissions.includes(module.id) && <Check size={10} strokeWidth={4} />}
                                   </div>
                                 </button>
                               ))}
                             </div>
                           </div>

                          <div className="bg-white/[0.01] border border-white/[0.03] rounded-[8px] p-5 space-y-4">
                             <div className="flex items-center justify-between">
                               <span className="text-[9px] text-white font-black uppercase tracking-widest">Acesso por PIN</span>
                               <button 
                                 onClick={() => setEditUsePin(!editUsePin)}
                                 className={`w-10 h-5 rounded-full transition-all relative ${editUsePin ? 'bg-[#00E676]' : 'bg-zinc-800'}`}
                               >
                                 <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${editUsePin ? 'left-6' : 'left-1'}`} />
                               </button>
                             </div>
                             
                             {editUsePin && (
                               <input 
                                 type="password" 
                                 maxLength={4}
                                 value={editPin}
                                 onChange={e => setEditPin(e.target.value.replace(/\D/g, ''))}
                                 className="w-full h-11 bg-black border border-white/5 rounded-[6px] px-4 text-center text-base font-black text-[#00E676] tracking-[1em] focus:outline-none focus:border-[#00E676]/30" 
                                 placeholder="****"
                               />
                             )}
                          </div>

                          <button 
                            onClick={onSaveProfile}
                            className="w-full h-14 bg-[#00E676] hover:bg-[#00C853] text-black font-black uppercase tracking-[0.1em] text-[10px] rounded-[8px] transition-all"
                          >
                            Salvar Alterações
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeSection === 'AUDIT' && (
              <motion.div key="audit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="bg-[#0A0A0A] border border-white/[0.05] rounded-[12px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                   <div className="flex flex-col gap-6 mb-10">
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                           <Activity size={24} />
                         </div>
                         <div>
                           <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Rastreamento de Atividades</h3>
                           <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Auditoria de sistema em tempo real</p>
                         </div>
                       </div>

                       <div className="flex flex-wrap items-center gap-3">
                         {/* Date Filter */}
                         <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl p-2 px-4 h-12">
                           <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Data:</label>
                           <input 
                             type="date" 
                             value={auditDate} 
                             onChange={e => setAuditDate(e.target.value)} 
                             className="bg-transparent text-white font-bold text-xs focus:outline-none [color-scheme:dark]"
                           />
                         </div>

                         {/* Operator Filter */}
                         <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl p-2 px-4 h-12">
                           <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">Operador:</label>
                           <select 
                             value={auditUserFilter} 
                             onChange={e => setAuditUserFilter(e.target.value)}
                             className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                           >
                             <option value="all">Todos</option>
                             {profiles.map(p => (
                               <option key={p.id} value={p.id}>{p.name}</option>
                             ))}
                           </select>
                         </div>
                       </div>
                     </div>

                     {/* Advanced Search */}
                     <div className="relative">
                       <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
                         <Search size={18} />
                       </div>
                       <input 
                         type="text"
                         value={auditSearch}
                         onChange={e => setAuditSearch(e.target.value)}
                         placeholder="Buscar por OS, Venda, Cliente (Nome, CPF, Tel) ou Ação..."
                         className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all shadow-inner"
                       />
                     </div>
                   </div>

                   {auditLoading ? (
                     <div className="flex flex-col items-center justify-center py-20 gap-4">
                       <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                       <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Carregando Auditoria</span>
                     </div>
                   ) : auditLogs.length === 0 ? (
                     <div className="text-center py-20">
                        <Activity size={48} className="text-zinc-900 mx-auto mb-4" />
                        <p className="text-zinc-500 font-medium">Nenhuma atividade registrada nesta data.</p>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       {auditLogs.map((log: ActivityLog) => (
                         <div key={log.id} className="bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.02] rounded-xl p-5 flex items-center gap-5 transition-all">
                           <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 bg-zinc-900">
                             <img src={log.profile?.photo} alt={log.profile?.name} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1">
                             <div className="flex items-center justify-between mb-1">
                               <p className="text-white font-bold text-sm">
                                 {log.profile?.name} 
                                 <span className="text-zinc-500 font-medium ml-2">em {log.module}</span>
                               </p>
                               <span className="text-[9px] font-black text-zinc-600 uppercase">
                                 {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                             </div>
                             <p className="text-xs text-zinc-400">
                               <span className="font-extrabold text-pink-500 uppercase text-[9px] tracking-widest mr-2">{log.action}</span>
                               {log.details?.description || 'Realizou uma ação no sistema'}
                             </p>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              </motion.div>
            )}

            {activeSection === 'OS' && (
              <motion.div key="os" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="bg-[#0A0A0A] border border-white/[0.05] rounded-[12px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                   {/* Sub-navigation tabs */}
                   <div className="mb-10 flex flex-wrap items-center gap-2 p-1.5 bg-black/40 border border-white/[0.05] rounded-[8px] backdrop-blur-md shrink-0">
                     {[
                       { id: 'CHECKLIST', label: 'Checklist', icon: CheckCircle2 },
                       { id: 'PRINT', label: 'Impressão OS', icon: Hash },
                       { id: 'WARRANTY', label: 'Termos e Garantia', icon: PenTool }
                     ].map(tab => (
                       <button 
                         key={tab.id}
                         onClick={() => setOsTab(tab.id as any)}
                         className={`flex-1 min-w-[120px] px-4 h-11 rounded-[8px] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${osTab === tab.id ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                       >
                         <tab.icon size={14} />
                         {tab.label}
                       </button>
                     ))}
                   </div>

                   <AnimatePresence mode="wait">
                     {osTab === 'CHECKLIST' && (
                       <motion.div key="checklist" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-[6px] bg-amber-500/10 flex items-center justify-center text-amber-500">
                             <CheckCircle2 size={20} />
                           </div>
                           <h3 className="text-lg font-black text-white tracking-tighter uppercase italic">Configuração de Checklist</h3>
                         </div>

                         <div className="space-y-3">
                           <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.1em] ml-1">Categoria de Equipamento</label>
                           <div className="flex flex-wrap gap-2">
                             {Array.from(new Set([
                               'Smartphone', 'Notebook', 'Computador', 'Tablet', 'Videogame', 'Controle', 'Impressora', 'Áudio', 'Smartwatch', 'Outro',
                               ...Object.keys(osSettings.checklistByCategory || {})
                             ])).map(cat => (
                               <button 
                                 key={cat}
                                 onClick={() => setSelectedCategory(cat)}
                                 className={`px-5 py-2.5 rounded-[6px] text-[9px] font-black uppercase tracking-widest transition-all border ${selectedCategory === cat ? 'bg-[#00E676] text-black border-[#00E676]' : 'bg-white/[0.02] text-zinc-600 border-white/5 hover:border-white/10'}`}
                               >
                                 {cat}
                               </button>
                             ))}
                             
                             <button 
                               onClick={() => {
                                 const newCat = prompt('Digite o nome da nova categoria (ex: Apple Watch, Drone):');
                                 if (newCat) {
                                   const formatted = newCat.trim();
                                   if (formatted) setSelectedCategory(formatted);
                                 }
                               }}
                               className="px-5 py-2.5 rounded-[6px] text-[9px] font-black uppercase tracking-widest transition-all border border-dashed border-white/10 text-zinc-500 hover:border-[#00E676]/30 hover:text-[#00E676]"
                             >
                               + Nova Categoria
                             </button>
                           </div>
                         </div>

                         <div className="bg-white/[0.01] border border-white/[0.03] rounded-[12px] p-6 space-y-6">
                            <h4 className="text-white font-black text-[11px] uppercase tracking-tight flex items-center gap-2">
                              Checklist: {selectedCategory}
                            </h4>

                            <div className="flex flex-col md:flex-row gap-2">
                               <div className="flex-1 space-y-2">
                                 {(osSettings.checklistByCategory?.[selectedCategory] || []).slice(0, Math.ceil((osSettings.checklistByCategory?.[selectedCategory] || []).length / 2)).map((item: string, idx: number) => (
                                   <div key={idx} className="bg-black/20 border border-white/5 rounded-[6px] p-2.5 flex items-center justify-between group">
                                      <span className="text-[12px] font-bold text-zinc-500 ml-1">{item}</span>
                                      <button onClick={() => handleRemoveItem(idx)} className="w-7 h-7 bg-red-500/5 text-zinc-800 hover:text-red-500 rounded-[4px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                        <Plus size={14} className="rotate-45" />
                                      </button>
                                   </div>
                                 ))}
                               </div>
                               <div className="flex-1 space-y-3">
                                 {(osSettings.checklistByCategory?.[selectedCategory] || []).slice(Math.ceil((osSettings.checklistByCategory?.[selectedCategory] || []).length / 2)).map((item: string, idx: number) => (
                                   <div key={idx + Math.ceil((osSettings.checklistByCategory?.[selectedCategory] || []).length / 2)} className="bg-black/20 border border-white/5 rounded-[6px] p-3 flex items-center justify-between group">
                                      <span className="text-[12px] font-bold text-zinc-500 ml-1">{item}</span>
                                      <button onClick={() => handleRemoveItem(idx + Math.ceil((osSettings.checklistByCategory?.[selectedCategory] || []).length / 2))} className="w-7 h-7 bg-red-500/5 text-zinc-800 hover:text-red-500 rounded-[4px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                        <Plus size={14} className="rotate-45" />
                                      </button>
                                   </div>
                                 ))}
                                 <div className="flex gap-2">
                                   <input 
                                     type="text" 
                                     value={newItemName}
                                     onChange={e => setNewItemName(e.target.value)}
                                     placeholder="Novo item..."
                                     className="flex-1 h-9 bg-black border border-dashed border-white/10 rounded-[6px] px-3 text-[11px] text-white focus:outline-none focus:border-[#00E676]/30"
                                   />
                                   <button onClick={handleAddItem} className="w-10 h-10 bg-[#00E676] text-black rounded-[8px] flex items-center justify-center shadow-lg active:scale-95 transition-all">
                                     <Plus size={16} />
                                   </button>
                                 </div>
                               </div>
                            </div>
                         </div>
                       </motion.div>
                     )}

                     {osTab === 'PRINT' && (
                       <motion.div key="print" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-[6px] bg-[#00E676]/10 flex items-center justify-center text-[#00E676]">
                             <Hash size={20} />
                           </div>
                           <h3 className="text-lg font-black text-white tracking-tighter uppercase italic">Configurações de Impressão</h3>
                         </div>

                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <div className="space-y-6">
                             <div className="space-y-1.5 group/input">
                               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">Sequência Inicial / Próxima O.S.</label>
                               <div className="flex gap-2">
                                 <input 
                                   id="tour-os-number-input"
                                   type="text" 
                                   value={nextOsInput}
                                   onChange={e => {
                                     const val = e.target.value.replace(/\D/g, '');
                                     setNextOsInput(val);
                                   }}
                                   placeholder="Ex: 1"
                                   className="flex-1 h-12 bg-white/[0.02] border border-white/[0.05] rounded-[8px] px-5 text-[13px] text-white focus:outline-none focus:border-[#00E676]/30 font-bold"
                                 />
                                 <button 
                                   onClick={() => {
                                     const num = parseInt(nextOsInput, 10);
                                     if (!isNaN(num)) {
                                       setOsSettings({ ...osSettings, nextOsNumber: num });
                                       onShowToast('Contador atualizado');
                                     }
                                   }}
                                   className="px-6 h-12 bg-[#00E676]/10 border border-[#00E676]/20 text-[#00E676] text-[9px] font-black uppercase tracking-widest rounded-[8px] hover:bg-[#00E676] hover:text-black transition-all"
                                 >
                                   Atualizar
                                 </button>
                               </div>
                               <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest ml-1">O sistema usará este número como base caso não existam outras ordens, ou continuará a contagem a partir do maior número existente.</p>
                             </div>

                             <div className="space-y-1.5 group/input">
                               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">Observações do Rodapé</label>
                               <textarea 
                                 value={osSettings.printFooter || ''}
                                 onChange={e => setOsSettings({ ...osSettings, printFooter: e.target.value })}
                                 placeholder="Ex: Obrigado pela preferência! Volte sempre."
                                 className="w-full h-24 bg-white/[0.02] border border-white/[0.05] rounded-[8px] p-5 text-[12px] text-white focus:outline-none focus:border-[#00E676]/30 resize-none leading-relaxed"
                               />
                             </div>

                             <div className="space-y-1.5 group/input">
                               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">Observações Gerais (Impressas na O.S.)</label>
                               <textarea 
                                 value={localPrintTerms}
                                 onChange={e => handlePrintTermsChange(e.target.value)}
                                 placeholder="O cliente declara que as informações prestadas são verdadeiras..."
                                 className="w-full h-64 bg-white/[0.02] border border-white/[0.05] rounded-[12px] p-5 text-[12px] text-zinc-300 focus:outline-none focus:border-[#00E676]/30 resize-none leading-relaxed font-medium"
                               />
                               <div className="flex items-center justify-between mt-2">
                                 <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest ml-1">Este texto é impresso na seção de <b>Observações</b> do documento A4 da O.S.</p>
                                 <button
                                   onClick={handleSavePrintTerms}
                                   className="px-6 h-10 bg-[#00E676]/10 border border-[#00E676]/20 text-[#00E676] text-[10px] font-black uppercase tracking-widest rounded-[8px] hover:bg-[#00E676] hover:text-black transition-all flex items-center gap-2"
                                 >
                                   <Save size={14} />
                                   Salvar Alterações
                                 </button>
                               </div>
                             </div>
                           </div>

                           <div className="hidden lg:flex flex-col items-center bg-[#050505] border border-white/5 rounded-[12px] p-4 relative overflow-hidden min-h-[500px]">
                              <div className="w-full h-full flex justify-center transform origin-top sm:scale-[0.45] xl:scale-[0.55] 2xl:scale-[0.65]">
                                <div className="w-[210mm] mt-8 bg-white shadow-2xl">
                                  <OrderPrintTemplate
                                    order={{...mockOrder, osNumber: nextOsInput ? parseInt(nextOsInput, 10) : 1}}
                                    customer={mockCustomer}
                                    companySettings={companySettings}
                                    osSettings={{ ...osSettings, printTerms: localPrintTerms }}
                                    isPreview={true}
                                  />
                                </div>
                              </div>
                           </div>
                         </div>
                       </motion.div>
                     )}

                     {osTab === 'WARRANTY' && (
                       <motion.div key="warranty" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-[6px] bg-blue-500/10 flex items-center justify-center text-blue-500">
                             <PenTool size={20} />
                           </div>
                           <h3 className="text-lg font-black text-white tracking-tighter uppercase italic">Termos e Garantia</h3>
                         </div>

                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <div className="space-y-6">
                             <div className="space-y-3">
                               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.1em] ml-1">Regras de Cobertura (Garantia)</label>
                               <textarea 
                                 value={osSettings.warrantyTerms || ''}
                                 onChange={e => setOsSettings({ ...osSettings, warrantyTerms: e.target.value })}
                                 placeholder="Descreva aqui as regras e as condições de perda da garantia..."
                                 className="w-full h-96 bg-white/[0.02] border border-white/[0.05] rounded-[12px] p-6 text-[12px] text-zinc-300 focus:outline-none focus:border-[#00E676]/30 leading-relaxed font-medium"
                               />
                               <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest ml-1">Este texto será impresso no <b>Certificado de Garantia (A4)</b>.</p>
                             </div>
                           </div>
                           
                           <div className="hidden lg:flex flex-col items-center bg-[#050505] border border-white/5 rounded-[12px] p-4 relative overflow-hidden min-h-[900px]">
                              <div className="w-full h-full flex justify-center transform origin-top sm:scale-[0.45] xl:scale-[0.55] 2xl:scale-[0.70]">
                                <div className="w-[210mm] mt-8 bg-white shadow-2xl">
                                  <WarrantyPrintTemplate
                                    order={mockOrder}
                                    customer={mockCustomer}
                                    companySettings={companySettings}
                                    osSettings={osSettings}
                                    isPreview={true}
                                  />
                                </div>
                              </div>
                           </div>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeSection === 'WHATSAPP_MARKETING' && (
              <motion.div key="marketing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                 <div className="bg-[#0A0A0A] border border-white/[0.05] rounded-[12px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-10">
                       <div className="w-10 h-10 rounded-[6px] bg-purple-500/10 flex items-center justify-center text-purple-500">
                          <MessageCircle size={20} />
                       </div>
                       <h3 className="text-lg font-black text-white tracking-tighter uppercase italic">Mensagens Automáticas</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {[
                        { status: 'Entrada Registrada', label: '1. Boas-Vindas (Entrada)', icon: Bookmark, color: '#3B82F6', desc: 'Enviada no momento que a OS é criada.' },
                        { status: 'Em Análise', label: '2. Em Análise', icon: Search, color: '#8b5cf6', desc: 'O aparelho entrou para análise na fila técnica.' },
                        { status: 'Orçamento em Elaboração', label: '3. Orçamento em Elaboração', icon: Calculator, color: '#f59e0b', desc: 'Preparo dos custos e viabilidade do reparo.' },
                        { status: 'Aguardando Aprovação', label: '4. Aguardando Aprovação', icon: FileCog, color: '#F59E0B', desc: 'Link para o cliente aprovar/recusar o orçamento.' },
                        { status: 'Orçamento Aprovado', label: '5. Orçamento APROVADO', icon: Activity, color: '#00E676', desc: 'Confirmação de início após aprovação do cliente.' },
                        { status: 'Orçamento Cancelado', label: '6. Orçamento RECUSADO', icon: XCircle, color: '#EF4444', desc: 'Mensagem enviada se o cliente negar o orçamento.' },
                        { status: 'Em Manutenção', label: '7. Início de Reparo', icon: PenTool, color: '#A855F7', desc: 'Avisa que o técnico começou a trabalhar no aparelho.' },
                        { status: 'Reparo Concluído', label: '8. Pronto para Retirada', icon: Check, color: '#0284c7', desc: 'Avisa que o aparelho está pronto para ser buscado.' },
                        { status: 'Finalizada', label: '9. Entrega (Finalizada)', icon: ShieldCheck, color: '#059669', desc: 'Enviada quando o cliente retira o aparelho.' },
                        { status: 'Sem Reparo', label: '10. Sem Reparo / Devolução', icon: AlertTriangle, color: '#71717a', desc: 'Avisa que não foi possível consertar.' },
                        { status: 'Assinatura Remota', label: '11. Assinatura via Link', icon: Link, color: '#f97316', desc: 'Enviada quando é solicitada a assinatura digital.' },
                        { status: 'Garantia', label: '12. Termo de Garantia', icon: FileText, color: '#6366f1', desc: 'Mensagem com o link do certificado de garantia digital.' },
                        { status: 'follow_up', label: '13. Pós-Venda / Avaliação', icon: MessageCircle, color: '#fbbf24', desc: 'Convite para avaliar no Google após alguns dias.' },
                        { status: 'birthday', label: '14. Feliz Aniversário', icon: Zap, color: '#ec4899', desc: 'Mensagem automática no dia do aniversário do cliente.' },
                      ].map(msg => (
                        <div key={msg.status} className="bg-white/[0.01] border border-white/[0.05] rounded-[12px] p-5 space-y-3 group/msg">
                           <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center`} style={{ backgroundColor: `${msg.color}10`, color: msg.color }}>
                                <msg.icon size={16} />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-white uppercase tracking-[0.1em]">{msg.label}</label>
                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{msg.desc}</p>
                              </div>
                           </div>
                           <textarea 
                             value={osSettings.whatsappMessages?.[msg.status] || ''}
                             onChange={e => handleSaveWhatsappMessage(msg.status, e.target.value)}
                             className="w-full h-32 bg-black/40 border border-white/5 rounded-[8px] p-4 text-[12px] text-zinc-400 group-hover/msg:text-white focus:text-white focus:outline-none focus:border-[#00E676]/20 transition-all resize-none font-medium leading-relaxed"
                             placeholder="Configurar mensagem..."
                           />
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="mt-8 bg-black/20 border border-white/[0.05] rounded-[8px] p-5">
                      <h5 className="text-[9px] uppercase font-black text-[#00E676] tracking-[0.2em] mb-4 flex items-center gap-2">
                        Atalhos de Texto
                        <InfoTooltip position="top" content="Copie estas 'tags' e cole no texto. Quando enviar para o cliente, o sistema substituirá a tag pelo dado real (ex: o nome do cliente)." className="ml-1 text-zinc-500 hover:text-zinc-300" />
                      </h5>
                      <div className="flex flex-wrap gap-2">
                         {['[nome_cliente]', '[numero_os]', '[equipamento]', '[valor_total]', '[servyx_link]'].map(t => (
                           <span key={t} className="bg-black/40 border border-white/5 rounded-[4px] px-2.5 py-1 text-[#00E676] text-[9px] font-black tracking-widest">{t}</span>
                         ))}
                      </div>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

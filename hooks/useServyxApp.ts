import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../app/supabase';
import { 
  View, 
  Profile, 
  ProfileType, 
  Product, 
  Order, 
  CompanySettings, 
  OsSettings,
  BudgetData,
  TechnicalReport,
  AppNotification
} from '../app/types';
import { Customer } from '../app/components/ClientesModule';
import { DEFAULT_PERMISSIONS } from '../app/constants';
import { subDays } from 'date-fns';

export function useServyxApp() {
  const [view, setView] = useState<View>('LOGIN');
  const [previousView, setPreviousView] = useState<View>('PROFILES');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Auto-clear toast messages after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [companyName, setCompanyName] = useState<string>('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [initialOrderId, setInitialOrderId] = useState<string | null>(null);
  const [caixaInitialView, setCaixaInitialView] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [settingsRedirectSection, setSettingsRedirectSection] = useState<any>('MENU');
  const [viewAfterPin, setViewAfterPin] = useState<View>('DASHBOARD');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tourStep, setTourStep] = useState<number>(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<any[]>([]);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cashSessionsCount, setCashSessionsCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const unreadNotificationsCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'); // Sleek digital ping
      audio.volume = 0.4;
      audio.play();
    } catch (e) {
      // Silent fail (browser blocks autoplay without interaction)
    }
  }, []);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
    playNotificationSound();
  }, [playNotificationSound]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const [osSettings, setOsSettingsState] = useState<OsSettings>({
    nextOsNumber: 1,
    checklistItems: ['Carregador', 'Cabo USB', 'Bateria', 'Cartão de Memória', 'Chip', 'Capa Proteção'],
    checklistByCategory: {
      'Smartphone': ['Tela/Touch', 'Display', 'Botão Power', 'Botões Vol', 'Câmera Frontal', 'Câmera Traseira', 'Microfone', 'Alto-falante', 'Auricular', 'Wi-Fi', 'Bluetooth', 'Chip', 'Carregamento', 'Flash', 'Vibracall', 'Biometria/FaceID'],
      'Tablet': ['Tela/Touch', 'Display', 'Botão Power', 'Botões Vol', 'Câmera Frontal', 'Câmera Traseira', 'Wi-Fi', 'Bluetooth', 'Carregamento', 'Microfone', 'Alto-falante', 'Biometria'],
      'Notebook': ['Tela', 'Teclado', 'Mouse/Touchpad', 'Wi-Fi', 'Bluetooth', 'Webcam', 'Microfone', 'Alto-falantes', 'Portas USB', 'HDMI', 'Bateria', 'Carregador', 'Dobradiças'],
      'Computador': ['Portas USB', 'HDMI/VGA', 'Entrada Rede', 'Saída Áudio', 'Entrada Mic', 'Fonte', 'Painel Frontal', 'Coolers', 'Wi-Fi (se houver)'],
      'Videogame': ['Leitor de Disco', 'Entrada HDMI', 'Portas USB', 'Wi-Fi', 'Bluetooth', 'Conectividade Controle', 'Fonte Interna', 'Cooler', 'Bip/Luzes'],
      'Controle': ['L1', 'L2', 'R1', 'R2', 'D-Pad Cima', 'D-Pad Baixo', 'D-Pad Esquerda', 'D-Pad Direita', 'Triângulo', 'Círculo', 'Cross / X', 'Quadrado', 'L3 (Analógico)', 'R3 (Analógico)', 'PS Button', 'Touchpad', 'Mute', 'Create', 'Options', 'Conector Carga', 'Entrada Fone P2'],
      'Impressora': ['Carregamento de Papel', 'Conector USB/Rede', 'Painel/Botões', 'Qualidade de Impressão', 'Scanner (se houver)', 'Wi-Fi', 'Fonte/Cabo Energia', 'Cartuchos/Toner'],
      'Áudio': ['Bluetooth', 'Entrada P2/P10', 'Botões de Controle', 'Qualidade de Som', 'Bateria/Fonte', 'Entrada de Carga'],
      'Smartwatch': ['Tela/Touch', 'Botões laterais', 'Sensores Traseiros', 'Carregamento', 'Pulseira', 'Sincronização Bluetooth', 'Microfone/Alto-falante'],
      'Outro': ['Carregador', 'Cabo USB', 'Bateria', 'Capa Proteção']
    },
    printTerms: "O cliente declara que as informações prestadas são verdadeiras, conferiu os dados e concorda com os termos desta Ordem de Serviço.\n\nO equipamento passará por análise técnica, podendo haver alteração no orçamento mediante aprovação do cliente.\n\nApós conclusão, reprovação ou impossibilidade de reparo, o equipamento deverá ser retirado em até 90 dias da notificação, sob pena de cobrança de armazenagem.\n\nNão nos responsabilizamos por acessórios não descritos. O cliente é responsável pelo backup e pelos dados.\n\nEquipamentos com sinais de mau uso, oxidação, quedas, violação ou reparo por terceiros podem perder a garantia.\n\nA garantia cobre apenas os serviços realizados e peças substituídas, não incluindo danos por mau uso ou causas externas.",
    warrantyTerms: "• Cobertura exclusiva para os serviços e peças componentes do reparo atual.\n• Perda total imediata da garantia em caso de rompimento ou violação dos selos de segurança.\n• Danos físicos, quebras de tela, exposição a umidade, líquidos ou quedas invalidam este certificado.\n• A garantia não abrange novos defeitos não relacionados ao problema sanado originalmente.\n• Para acionar a garantia, é obrigatória a apresentação deste certificado original e o dispositivo.\n• Não nos responsabilizamos por perdas de dados ou arquivos contidos no dispositivo.",
    printFooter: "",
    whatsappMessages: {
      'Entrada Registrada': 'Olá, [nome_cliente]! 👋\nSua Ordem de Serviço foi gerada com sucesso em nosso Sistema. 🚀\n\nNúmero da sua OS: [numero_os]\n\nEquipamento:\n[marca] [modelo]\n\nDefeito relatado:\n[defeito]\n\nStatus atual:\n[status]\n\nData de entrada:\n[data_entrada]\n\nVocê pode acompanhar o andamento do seu reparo pelo link abaixo:\n\n👉 [link_os]\n\n[nome_assistencia] agradece sua confiança!',
      'Em Análise Técnica': 'Olá [nome_cliente]! 👋\n\nSeu aparelho já está com nossos técnicos para análise.\n\n🔧 OS: [numero_os]\n📊 Status: [status]\n\nLink de acompanhamento:\n👉 [link_os]',
      'Orçamento em Elaboração': 'Olá [nome_cliente]! 👋\n\nA análise técnica da sua OS [numero_os] foi concluída e estamos elaborando seu orçamento.\n\nLogo entraremos em contato com os valores!',
      'Aguardando Aprovação': 'Olá, [nome_cliente]! 👋\nSeu orçamento está pronto OS: [numero_os]\n🔧 [defeito]\n💰 [valor_total]  \n Aprove aqui:\n👉 [link_os]\n\nQualquer dúvida é só chamar 👍',
      'Orçamento Aprovado': 'Olá [nome_cliente]! 🚀\n\nSeu orçamento da OS [numero_os] foi APROVADO.\n\nNossa equipe já iniciou o reparo e em breve te avisaremos da conclusão!',
      'Orçamento Cancelado': 'Olá [nome_cliente]. Entendido.\n\nO orçamento da OS [numero_os] foi RECUSADO. O aparelho está disponível para retirada sem custos de análise.\n\n[nome_assistencia]',
      'Assinatura Remota': 'Olá [nome_cliente]! 👋\nSeu atendimento já está em fase final (OS [numero_os]).\n\nFalta só sua confirmação para concluirmos:\n👉 [link_assinatura]\n\nAssim que confirmar, já damos continuidade 👍\n\nAguardamos você\n\n[nome_assistencia]',
      'Em Manutenção': 'Olá [nome_cliente]! 🛠️\n\nAviso que iniciamos o reparo do seu [equipamento] (OS [numero_os]).\n\nAcompanhe o progresso em tempo real:\n👉 [link_os]',
      'Reparo Concluído': 'Olá [nome_cliente]! 🎉 BOAS NOTÍCIAS!\n\nO reparo do seu [equipamento] foi concluído com sucesso.\n\n✅ OS: [numero_os]\n\nO aparelho já está pronto para retirada em nossa loja.\n\n[nome_assistencia]',
      'Finalizada': 'Olá [nome_cliente]! 👋\n\nSua OS [numero_os] foi finalizada e o aparelho entregue.\n\nAgradecemos pela preferência!\n\n[nome_assistencia]',
      'Sem Reparo': 'Olá [nome_cliente].\n\nInfelizmente, após análise técnica detalhada, não foi possível realizar o reparo da sua OS [numero_os].\n\nO aparelho está disponível para retirada na loja.\n\n[nome_assistencia]',
      'Garantia': 'Olá [nome_cliente]! 👋\n\nAqui está o seu comprovante e termo de garantia digital da OS [numero_os].\n\nLink do documento:\n👉 [link_os]\n\nGuarde este link para sua segurança.',
      'follow_up': 'Olá [nome_cliente]! 👋\n\nTudo bem? Estamos passando para saber se o serviço realizado no seu [equipamento] está 100%.\n\nSua opinião é muito importante! Se puder, nos avalie no Google:\n👉 [link_google]',
      'birthday': 'Olá [nome_cliente]! 🎉\n\nToda a equipe da [nome_assistencia] te deseja um super Feliz Aniversário!\n\nPara comemorar, preparamos um presente especial para você em sua próxima visita. Parabéns! 🎈'
    }
  });

  const [companySettings, setCompanySettingsState] = useState<CompanySettings>({
    name: '',
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
    publicSlug: '',
    slugHistory: [],
    followUpMessage: `Olá, {cliente} 👋\n\nJá está disponível o acompanhamento da sua Ordem de Serviço nº {os}.\nVocê pode visualizar todas as atualizações em tempo real pelo link abaixo:\n\n{link}\n\n{empresa}\nAgradecemos pela confiança em nossos serviços.`
  });

  const isCompanyIncomplete = useMemo(() => {
    if (!companySettings) return false;
    const namePending = !companySettings.name || companySettings.name === 'SERVYX' || companySettings.name.trim() === '';
    const contactPending = !companySettings.phone && !companySettings.whatsapp;
    const addressPending = !companySettings.street || companySettings.street.trim() === '' || 
                           !companySettings.city || companySettings.city.trim() === '';
    return namePending || contactPending || addressPending;
  }, [companySettings]);

  const showSetupWarning = useMemo(() => {
    const isTransitionalView = ['LOGIN', 'REGISTER', 'PROFILES', 'PIN_ENTRY', 'CREATE_PROFILE'].includes(view);
    return !isTransitionalView && isCompanyIncomplete;
  }, [view, isCompanyIncomplete]);

  const logActivity = useCallback(async (module: string, action: string, details: any = {}) => {
    if (!selectedProfile) return;
    try {
      await supabase.from('activity_logs').insert({
        company_id: selectedProfile.company_id,
        profile_id: selectedProfile.id,
        module,
        action,
        details
      });
    } catch (err) {
      console.error('[Servyx] Audit log error:', err);
    }
  }, [selectedProfile]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Servyx] Sign out error:', err);
    }
    setSelectedProfile(null);
    setProfiles([]);
    setCustomers([]);
    setOrders([]);
    setView('LOGIN');
  }, []);

  const loadDataFromSupabase = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[Servyx] Error getting session in loadData:', sessionError);
        // Do not logout on session errors unless strictly necessary
        return [];
      }
      if (!session) {
        setView('LOGIN');
        setIsAuthReady(true);
        return [];
      }

      const { data: profilesData } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).order('created_at');
      let currentProfiles = profilesData || [];
      let activeCompanyId = '';

      if (currentProfiles.length > 0) {
        setProfiles(currentProfiles as Profile[]);
        activeCompanyId = currentProfiles[0].company_id;
      } else {
        const user = session.user;
        activeCompanyId = user.id;
        const initialProfile = {
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Administrador',
          type: 'ADM' as ProfileType,
          role: 'ADM',
          photo: user.user_metadata?.avatar_url || `https://picsum.photos/seed/${user.id}/200/200`,
          user_id: user.id,
          company_id: activeCompanyId,
          permissions: DEFAULT_PERMISSIONS['ADM']
        };
        
        // Use upsert to create or update the initial profile
        const { data: inserted, error: upsertError } = await supabase.from('profiles').upsert(initialProfile).select().single();
        
        if (upsertError) {
          console.error('[Servyx] Profile creation error:', upsertError);
          // Try a simple select as fallback
          const { data: retry } = await supabase.from('profiles').select('*').eq('user_id', user.id);
          if (retry && retry.length > 0) {
            currentProfiles = retry as Profile[];
            setProfiles(currentProfiles);
            activeCompanyId = currentProfiles[0].company_id;
          }
        } else if (inserted) {
          currentProfiles = [inserted as Profile];
          setProfiles(currentProfiles);
        }
      }

      const [customersRes, ordersRes, settingsResArr, productsRes, companyRes, cashSessionsRes, dismissedNotificationsRes] = await Promise.all([
        supabase.from('customers').select('*').eq('company_id', activeCompanyId).order('name'),
        supabase.from('orders').select('*').eq('company_id', activeCompanyId).order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').in('key', ['os_settings', `os_settings_${activeCompanyId}`]),
        supabase.from('products').select('*').eq('company_id', activeCompanyId),
        supabase.from('company_settings').select('*').eq('id', activeCompanyId).single(),
        supabase.from('cash_sessions').select('id', { count: 'exact', head: true }).eq('company_id', activeCompanyId),
        supabase.from('dismissed_notifications').select('*').eq('user_id', session.user.id)
      ]);

      // Prefer company-specific record, fall back to global (null) record
      const settingsRows = settingsResArr.data || [];
      const settingsRes = {
        data: settingsRows.find((r: any) => r.key === `os_settings_${activeCompanyId}`) || settingsRows.find((r: any) => r.key === 'os_settings') || null
      };

      if (dismissedNotificationsRes.data) setDismissedNotifications(dismissedNotificationsRes.data);
      if (cashSessionsRes.count !== null) setCashSessionsCount(cashSessionsRes.count);
      
      if (customersRes.data) {
        setCustomers(customersRes.data.map((row: any) => ({
          id: row.id,
          name: row.name,
          birthDate: row.birth_date,
          phone: row.phone || '',
          whatsapp: row.whatsapp || '',
          email: row.email || '',
          document: row.document || '',
          address: row.address || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
          notes: row.notes || '',
          createdAt: row.created_at || new Date().toISOString(),
          devices: row.devices || [],
        })));
      }

      if (productsRes.data) {
        setProducts(productsRes.data.map((p: any) => ({
          id: p.id,
          companyId: p.company_id,
          name: p.name,
          image: p.image,
          category: p.category,
          description: p.description,
          barcode: p.barcode,
          brand: p.brand,
          model: p.model,
          price: p.price,
          costPrice: p.cost_price,
          stock: p.stock,
          minStock: p.min_stock,
          unit: p.unit || 'un',
          ncm: p.ncm,
          sku: p.sku,
          location: p.location,
          warrantyDays: p.warranty_days,
          allowNegativeStock: p.allow_negative_stock,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })));
      }

      if (ordersRes.data) {
        setOrders(ordersRes.data.map((row: any) => ({
          id: row.id,
          companyId: row.company_id,
          osNumber: row.os_number,
          customerId: row.customer_id,
          equipment: row.equipment,
          checklist: row.checklist,
          checklistNotes: row.checklist_notes || '',
          defect: row.defect || '',
          technicianNotes: row.technician_notes || '',
          service: row.service || '',
          financials: row.financials,
          signatures: row.signatures,
          status: row.status,
          priority: row.priority,
          history: row.history || [],
          completionData: row.completion_data,
          productsUsed: row.products_used || [],
          isVisualChecklist: row.is_visual_checklist,
          checklistNotPossible: row.checklist_not_possible,
          budget: row.budget,
          technicalReport: row.technical_report,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deliveryForecast: row.delivery_forecast,
          entryPhotos: row.entry_photos || [],
        })));
      }

      if (settingsRes.data?.value) {
        const saved = settingsRes.data.value;
        if (saved.checklistByCategory?.Celular && !saved.checklistByCategory?.Smartphone) {
          saved.checklistByCategory.Smartphone = saved.checklistByCategory.Celular;
          delete saved.checklistByCategory.Celular;
        }

        if (!saved.printTerms || saved.printTerms.startsWith('O cliente declara, ao assinar')) {
          saved.printTerms = "O cliente declara que as informações prestadas são verdadeiras, conferiu os dados e concorda com os termos desta Ordem de Serviço.\n\nO equipamento passará por análise técnica, podendo haver alteração no orçamento mediante aprovação do cliente.\n\nApós conclusão, reprovação ou impossibilidade de reparo, o equipamento deverá ser retirado em até 90 dias da notificação, sob pena de cobrança de armazenagem.\n\nNão nos responsabilizamos por acessórios não descritos. O cliente é responsável pelo backup e pelos dados.\n\nEquipamentos com sinais de mau uso, oxidação, quedas, violação ou reparo por terceiros podem perder a garantia.\n\nA garantia cobre apenas os serviços realizados e peças substituídas, não incluindo danos por mau uso ou causas externas.";
        }
        if (!saved.warrantyTerms) {
          saved.warrantyTerms = "• Cobertura exclusiva para os serviços e peças componentes do reparo atual.\n• Perda total imediata da garantia em caso de rompimento ou violação dos selos de segurança.\n• Danos físicos, quebras de tela, exposição a umidade, líquidos ou quedas invalidam este certificado.\n• A garantia não abrange novos defeitos não relacionados ao problema sanado originalmente.\n• Para acionar a garantia, é obrigatória a apresentação deste certificado original e o dispositivo.\n• Não nos responsabilizamos por perdas de dados ou arquivos contidos no dispositivo.";
        }
        if (!saved.printFooter) {
          saved.printFooter = "";
        }

        setOsSettingsState(prev => ({ ...prev, ...saved }));
      }

      if (companyRes.data) {
        setCompanySettingsState(prev => ({ 
          ...prev, 
          ...companyRes.data,
          zipCode: companyRes.data.zip_code || '',
          logoUrl: companyRes.data.logo_url || '',
          publicSlug: companyRes.data.public_slug || 'servyx',
          slugHistory: companyRes.data.slug_history || [],
          followUpMessage: companyRes.data.mensagem_acompanhamento_os || prev.followUpMessage
        }));
        if (companyRes.data.name) setCompanyName(companyRes.data.name);
      }
      return currentProfiles;
    } catch (err: any) {
      console.error('Error loading data:', err.message || err);
      return [];
    }
  }, [handleLogout]);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        if (mounted) handleLogout();
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        handleLogout().then(() => setIsAuthReady(true));
        return;
      }
      if (session?.user) {
        setCompanyName('');
        loadDataFromSupabase().then((loadedProfiles: Profile[]) => {
          if (mounted) {
            if (loadedProfiles.length === 1) {
              setSelectedProfile(loadedProfiles[0]);
              setView('DASHBOARD');
            } else {
              setView('PROFILES');
            }
            setIsAuthReady(true);
          }
        });
      } else {
        setView('LOGIN');
        setIsAuthReady(true);
      }
    });

    return () => { 
      mounted = false; 
      subscription.unsubscribe();
    };
  }, [handleLogout, loadDataFromSupabase]);

  // Real-time notifications for remote signatures
  useEffect(() => {
    if (!selectedProfile?.company_id) return;

    const channel = supabase
      .channel('os-signatures-v2')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${selectedProfile.company_id}`
        },
        (payload: any) => {
          // 1. Map current order data
          const row = payload.new as any;
          const updatedOrder: Order = {
            id: row.id,
            companyId: row.company_id,
            osNumber: row.os_number,
            customerId: row.customer_id,
            equipment: row.equipment,
            checklist: row.checklist,
            checklistNotes: row.checklist_notes || '',
            defect: row.defect || '',
            technicianNotes: row.technician_notes || '',
            service: row.service || '',
            financials: row.financials,
            signatures: row.signatures,
            status: row.status,
            priority: row.priority,
            history: row.history || [],
            completionData: row.completion_data,
            productsUsed: row.products_used || [],
            isVisualChecklist: row.is_visual_checklist,
            checklistNotPossible: row.checklist_not_possible,
            budget: row.budget,
            technicalReport: row.technical_report,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deliveryForecast: row.delivery_forecast,
            entryPhotos: row.entry_photos || [],
          };

          // 2. Detect if a signature happened
          const newSignatures = row.signatures;
          const newHistory = row.history;
          const oldRecord = payload.old_record as any;
          const oldSignatures = oldRecord?.signatures;

          // Check latest history event
          const latestEvent = newHistory && Array.isArray(newHistory) && newHistory.length > 0 
            ? newHistory[newHistory.length - 1] 
            : null;

          const isClientAction = latestEvent?.user === 'Cliente (Via Portal)';
          const historyDesc = latestEvent?.description?.toLowerCase() || '';
          
          const hasJustSigned = isClientAction && (
            historyDesc.includes('assinada') || 
            historyDesc.includes('assinado') ||
            historyDesc.includes('aprovado') ||
            historyDesc.includes('recusado')
          );

          // Direct signature field comparison fallback
          const directSignatureDiff = newSignatures?.client && (!oldSignatures || !oldSignatures.client);

          if (hasJustSigned || directSignatureDiff) {
            // Detect Customer Name (First Name Only)
            const customer = customers.find(c => c.id === row.customer_id);
            const firstName = customer?.name?.split(' ')[0] || 'Cliente';
            const osDisplay = `OS${row.os_number.toString().padStart(4, '0')}`;
            
            let actionType: 'SUCCESS' | 'DANGER' | 'INFO' = 'INFO';
            let actionLabel = '';

            if (historyDesc.includes('aprovado')) {
              actionType = 'SUCCESS';
              actionLabel = 'aprovou o orçamento';
            } else if (historyDesc.includes('recusado')) {
              actionType = 'DANGER';
              actionLabel = 'recusou o orçamento';
            } else if (historyDesc.includes('assinado') || historyDesc.includes('assinada')) {
              actionType = 'SUCCESS';
              actionLabel = 'assinou a OS';
            }

            // 2. Add Global Notification (This triggers the Top Banner in page.tsx)
            if (actionLabel) {
              addNotification({
                type: actionType,
                title: `${firstName} ${osDisplay} ${actionLabel}`,
                message: `${row.equipment.brand} ${row.equipment.model} — Interação via Portal`,
                moduleId: 'status_os',
                entityId: row.id
              });
            }
            
            // 3. Sync state
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          } else {
            // Just sync state silently for other updates
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProfile?.company_id, loadDataFromSupabase]);

  // Real-time synchronization for products & stock alerts
  useEffect(() => {
    if (!selectedProfile?.company_id) return;

    const channel = supabase
      .channel('products-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `company_id=eq.${selectedProfile.company_id}` },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== payload.old.id));
            return;
          }

          const row = payload.new as any;
          const updatedProduct: Product = {
            id: row.id,
            companyId: row.company_id,
            name: row.name,
            price: row.price,
            stock: row.stock,
            minStock: row.min_stock,
            costPrice: row.cost_price || 0,
            image: row.image || '',
            category: row.category || '',
            description: row.description || '',
            brand: row.brand || '',
            model: row.model || '',
            ncm: row.ncm || '',
            sku: row.sku || '',
            location: row.location || '',
            unit: row.unit || 'un',
            warrantyDays: row.warranty_days || 90,
            allowNegativeStock: row.allow_negative_stock || false
          };

          // Check for stock alerts to notify via Top Banner
          if (payload.eventType === 'UPDATE') {
            const oldStock = payload.old?.stock;
            const hasZeroed = updatedProduct.stock === 0 && (oldStock === undefined || oldStock > 0);
            const hasBecomeLow = updatedProduct.stock <= updatedProduct.minStock && (oldStock === undefined || oldStock > updatedProduct.minStock);

            if (hasZeroed || hasBecomeLow) {
              addNotification({
                type: updatedProduct.stock === 0 ? 'DANGER' : 'INFO',
                title: updatedProduct.stock === 0 ? '🚨 ESTOQUE ESGOTADO!' : '⚠️ Estoque Baixo',
                message: updatedProduct.stock === 0 
                  ? `O produto ${updatedProduct.name} acabou! Reponha imediatamente para não perder vendas.`
                  : `O produto ${updatedProduct.name} atingiu o limite mínimo (${updatedProduct.stock} ${updatedProduct.unit} restantes).`,
                moduleId: 'produtos',
                entityId: updatedProduct.id
              });
            }
          }

          setProducts(prev => {
            const exists = prev.find(p => p.id === updatedProduct.id);
            if (exists) {
              return prev.map(p => p.id === updatedProduct.id ? updatedProduct : p);
            }
            return [updatedProduct, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProfile?.company_id, addNotification]);

  useEffect(() => {
    // Initialize step from storage
    const savedStep = localStorage.getItem('servyx_tour_step');
    if (savedStep && tourStep === 0) {
      setTourStep(parseInt(savedStep, 10));
    }
  }, []);

  useEffect(() => {
    if (tourStep > 0) {
      localStorage.setItem('servyx_tour_step', tourStep.toString());
    }
  }, [tourStep]);

  useEffect(() => {
    const isDismissed = localStorage.getItem('servyx_onboarding_completed');
    if (isDismissed) {
      setShowTutorial(false);
      return;
    }

    if (['DASHBOARD', 'CAIXA', 'SETTINGS', 'PRODUTOS', 'STATUS_OS', 'NOVA_OS'].includes(view) && selectedProfile?.type === 'ADM' && profiles.length === 1) {
      setShowTutorial(true);
    } else {
      setShowTutorial(false);
    }
  }, [view, selectedProfile, profiles]);

  const dismissTutorial = () => {
    setShowTutorial(false);
    setTourStep(0);
    localStorage.removeItem('servyx_tour_step');
    localStorage.setItem('servyx_onboarding_completed', 'true');
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      setToastMessage('Limpando dados...');
      const tablesToDelete = [
        'warranties', 'product_history', 'order_history', 'transactions', 'incomes', 'expenses', 
        'agenda', 'orders', 'sales', 'customers', 'products', 
        'suppliers', 'services', 'cash_sessions', 'app_settings', 
        'profiles', 'dismissed_notifications', 'company_settings', 'receivables'
      ];
      for (const table of tablesToDelete) {
        if (table === 'app_settings' || table === 'company_settings') {
          // These tables use 'key' or 'id' as primary key but we want to clear them anyway
          const pk = table === 'app_settings' ? 'key' : 'id';
          await supabase.from(table as any).delete().neq(pk, '_RESERVED_CLEAR_ALL_');
        } else {
          await supabase.from(table as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
      }
      const { data: { session } } = await supabase.auth.getSession();
      const companyId = session?.user?.id || 'main';
      
      // Deep clean the company settings to factory defaults
      await supabase.from('company_settings').upsert({ 
        id: companyId, 
        company_id: companyId,
        name: '',
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
        zip_code: '',
        logo_url: '', // Clear logo explicitly
        public_slug: `loja-${Math.floor(Math.random() * 10000)}`,
        slug_history: [],
        mensagem_acompanhamento_os: ''
      });

      // Clear the main profile to defaults
      await supabase.from('profiles').upsert({
        user_id: session?.user.id,
        company_id: companyId,
        name: 'Administrador',
        role: 'ADM',
        type: 'ADM',
        photo: `https://picsum.photos/seed/${companyId}/200/200`, // Factory default photo
        permissions: ['dashboard', 'nova_os', 'status_os', 'caixa', 'clientes', 'produtos', 'financeiro', 'agenda', 'relatorios', 'servicos', 'fornecedores', 'garantia', 'relacionamento', 'ajustes']
      });

      localStorage.removeItem('servyx_onboarding_completed');
      localStorage.removeItem('servyx_tour_step');
      setShowResetModal(false);
      setToastMessage('Sistema redefinido com sucesso! Saindo...');
      setTimeout(async () => {
        await handleLogout();
        window.location.reload();
      }, 2000);
    } catch (err) {
      setToastMessage('Erro ao redefinir sistema.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogin = async (email?: string, password?: string) => {
    if (email && password) {
      try {
        setToastMessage('Acessando sua conta...');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('E-mail ou senha incorretos.');
          }
          throw error;
        }

        if (data.user) {
          setToastMessage('Login realizado com sucesso!');
          const loadedProfiles = await loadDataFromSupabase();
          if (loadedProfiles.length === 1) {
            setSelectedProfile(loadedProfiles[0]);
            setView('DASHBOARD');
          } else if (loadedProfiles.length > 1) {
            setView('PROFILES');
          } else {
            // No profiles even after loading/creating? Something is wrong, but let's try to show the profiles screen
            setView('PROFILES');
          }
        }
      } catch (err: any) {
        setToastMessage(`Erro: ${err.message}`);
      }
    } else {
      setView('LOGIN');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err) {
      setToastMessage('Erro ao entrar com Google');
    }
  };

  const setCompanySettings = async (newSettings: CompanySettings) => {
    try {
      const oldSlug = companySettings.publicSlug;
      const newSlug = newSettings.publicSlug;
      let updatedHistory = companySettings.slugHistory || [];
      if (oldSlug && newSlug && oldSlug !== newSlug && !updatedHistory.includes(oldSlug)) {
        updatedHistory = [...updatedHistory, oldSlug];
      }
      setCompanySettingsState({ ...newSettings, slugHistory: updatedHistory });
      const { data: { session } } = await supabase.auth.getSession();
      const companyId = profiles[0]?.company_id || session?.user?.id;
      if (!companyId) return;

      const toSave = {
        id: companyId,
        company_id: companyId,
        name: newSettings.name,
        cnpj: newSettings.cnpj,
        whatsapp: newSettings.whatsapp,
        phone: newSettings.phone,
        email: newSettings.email,
        street: newSettings.street,
        number: newSettings.number,
        neighborhood: newSettings.neighborhood,
        complement: newSettings.complement,
        city: newSettings.city,
        state: newSettings.state,
        zip_code: newSettings.zipCode,
        logo_url: newSettings.logoUrl,
        public_slug: newSettings.publicSlug,
        slug_history: updatedHistory,
        mensagem_acompanhamento_os: newSettings.followUpMessage,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('company_settings').upsert(toSave);
      if (error) {
        setToastMessage(`Erro ao salvar: ${error.message}`);
      } else {
        setToastMessage('Dados da empresa salvos com sucesso!');
        if (newSettings.name) setCompanyName(newSettings.name);
        // Não redireciona automaticamente para não quebrar o fluxo do tour de onboarding
        
        // Auto-advance tour if at step 1
        if (tourStep === 1) {
          const nextStep = 2;
          setTourStep(nextStep);
          localStorage.setItem('servyx_tour_step', nextStep.toString());
        }
      }
    } catch (err: any) {
      setToastMessage(`Erro inesperado: ${err.message}`);
    }
  };

  const handleRegister = async (company: string, name: string, whatsapp: string, email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { name, company, whatsapp } } });
      if (error) throw error;
      if (data.user) {
        const initialSlug = company.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        await setCompanySettings({ ...companySettings, name: company, whatsapp: whatsapp, publicSlug: initialSlug });
        setToastMessage('Conta criada com sucesso!');
        setView('DASHBOARD');
      }
    } catch (err: any) {
      setToastMessage(`Erro: ${err.message}`);
    }
  };

  const handleNavigate = (navigationId: string) => {
    if (!selectedProfile) return;
    const [moduleId, subSection] = navigationId.split(':');
    const profilePermissions = selectedProfile.permissions || DEFAULT_PERMISSIONS[selectedProfile.type] || [];
    if (profilePermissions.includes(moduleId)) {
      setPreviousView(view);
      if (moduleId === 'ajustes') {
        setSettingsRedirectSection(subSection || 'MENU');
        setView('SETTINGS');
      } else if (moduleId === 'caixa') {
        setCaixaInitialView(subSection || null);
        setView('CAIXA');
      } else {
        setView(moduleId.toUpperCase() as View);
      }
    } else {
      setToastMessage('Acesso negado');
    }
  };

  const handleSelectProfile = (profile: Profile, targetView: View = 'DASHBOARD') => {
    setPreviousView(view);
    setSelectedProfile(profile);
    setViewAfterPin(targetView);
    if (profiles.length > 1 && profile.pin) {
      setView('PIN_ENTRY');
    } else {
      setView(targetView);
    }
  };

  const handleVerifyPin = (pinValue: string) => {
    if (pinValue === selectedProfile?.pin) {
      setView(viewAfterPin);
    } else {
      setToastMessage('PIN incorreto');
    }
  };

  const setOsSettings = async (newSettingsOrFn: OsSettings | ((prev: OsSettings) => OsSettings)) => {
    const nextSettings = typeof newSettingsOrFn === 'function' ? newSettingsOrFn(osSettings) : newSettingsOrFn;
    setOsSettingsState(nextSettings);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const companyId = profiles[0]?.company_id || session?.user?.id;
      if (!companyId) return;

      // The table has primary key ONLY on 'key'. We use a specific key per company so it doesn't collide with the global 'os_settings' key.
      const companyKey = `os_settings_${companyId}`;
      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert({ key: companyKey, value: nextSettings, company_id: companyId, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (upsertError) {
        console.error('[Servyx] Error saving company os settings:', upsertError.message);
      }
    } catch (err: any) {
      console.error('[Servyx] Error saving os settings:', err.message);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Tem certeza?')) return;
    if (profileId === selectedProfile?.id) return setToastMessage('Perfil em uso');
    const { error } = await supabase.from('profiles').delete().eq('id', profileId).eq('company_id', selectedProfile?.company_id);
    if (!error) {
      setProfiles(profiles.filter(p => p.id !== profileId));
      setToastMessage('Perfil excluído');
    }
  };

  const handleUpdateProfile = async (profileId: string, updates: Partial<Profile>) => {
    const { data: updated, error } = await supabase.from('profiles').update(updates).eq('id', profileId).eq('company_id', selectedProfile?.company_id).select().single();
    if (updated) {
      setProfiles(profiles.map(p => p.id === profileId ? updated as Profile : p));
      if (selectedProfile?.id === profileId) setSelectedProfile(updated as Profile);
      setToastMessage('Perfil atualizado');
    }
  };

  const handleSaveProfile = async (profileData: Omit<Profile, 'id'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setToastMessage('Sessão expirada. Faça login novamente.');
        setView('LOGIN');
        return;
      }

      // Se não houver perfis carregados, o ID da empresa é o ID do próprio usuário (dono)
      const companyId = profiles[0]?.company_id || session.user.id;
      
      const { data: inserted, error } = await supabase
        .from('profiles')
        .insert({ 
          ...profileData, 
          user_id: session.user.id, 
          company_id: companyId 
        })
        .select()
        .single();

      if (error) {
        console.error('[Servyx] Error saving profile:', error);
        setToastMessage(`Erro ao salvar perfil: ${error.message}`);
        return; // Não muda de tela se der erro
      }

      if (inserted) {
        setProfiles(prev => [...prev, inserted as Profile]);
        setToastMessage('Perfil criado com sucesso!');
        // Se for o primeiro perfil, já seleciona ele
        if (profiles.length === 0) {
          setSelectedProfile(inserted as Profile);
          setView('DASHBOARD');
        } else {
          setView(previousView === 'SETTINGS' ? 'SETTINGS' : 'PROFILES');
        }
      }
    } catch (err: any) {
      console.error('[Servyx] Unexpected error in handleSaveProfile:', err);
      setToastMessage('Ocorreu um erro inesperado ao salvar o perfil.');
    }
  };

  const handleDismissNotification = async (type: 'BIRTHDAY' | 'FOLLOW_UP' | 'OS_SIGNED' | 'BUDGET_APPROVED' | 'BUDGET_REJECTED' | 'STOCK', entityId: string, period: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !selectedProfile) return;
    
    try {
      const { data, error } = await supabase.from('dismissed_notifications').insert({ 
        user_id: session.user.id, 
        company_id: selectedProfile.company_id,
        type, 
        entity_id: entityId, 
        period: period || ''
      }).select().single();
      
      if (error) {
        // Ignore duplicate key errors (it means it's already dismissed)
        if (error.code === '23505') return;
        
        console.error('[Servyx] Error dismissing notification:', error.message);
        
        // Fallback for older schema if company_id is missing
        if (error.message.includes('column "company_id" does not exist')) {
          const { data: retryData, error: retryError } = await supabase.from('dismissed_notifications').insert({ 
            user_id: session.user.id, 
            type, 
            entity_id: entityId, 
            period: period || ''
          }).select().single();
          
          if (retryData) setDismissedNotifications(prev => [...prev, retryData]);
          if (retryError) console.error('[Servyx] Retry error:', retryError.message);
          return;
        }

        // Potential UUID error if entity_id is TEXT but table expects UUID
        if (error.message.includes('invalid input syntax for type uuid')) {
          console.warn('[Servyx] Warning: entity_id in database is UUID, but OS ID is TEXT. Please run fix_dismissed_notifications.sql');
        }
        return;
      }
      
      if (data) setDismissedNotifications(prev => [...prev, data]);
    } catch (err) {
      console.error('[Servyx] Unexpected error dismissing notification:', err);
    }
  };

  return {
    view, setView,
    previousView, setPreviousView,
    profiles, setProfiles,
    selectedProfile, setSelectedProfile,
    toastMessage, setToastMessage,
    companyName, setCompanyName,
    isAuthReady, setIsAuthReady,
    initialOrderId, setInitialOrderId,
    caixaInitialView, setCaixaInitialView,
    editingOrder, setEditingOrder,
    settingsRedirectSection, setSettingsRedirectSection,
    viewAfterPin, setViewAfterPin,
    showTutorial, setShowTutorial,
    tourStep, setTourStep,
    handleConfirmReset, handleDismissNotification,
    showResetModal, setShowResetModal,
    isResetting, setIsResetting,
    dismissedNotifications, setDismissedNotifications,
    customers, setCustomers,
    orders, setOrders,
    products, setProducts,
    cashSessionsCount, setCashSessionsCount,
    osSettings, setOsSettings,
    companySettings, setCompanySettings,
    isCompanyIncomplete,
    showSetupWarning,
    handleLogin, handleRegister, handleLogout, handleGoogleLogin,
    handleNavigate, handleSelectProfile, handleVerifyPin,
    handleDeleteProfile, handleUpdateProfile, handleSaveProfile,
    dismissTutorial,
    logActivity,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    clearAllNotifications
  };
}

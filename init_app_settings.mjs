import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://medymhlxzfzfkjvkkexa.supabase.co";
const supabaseKey = "sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde";
const supabase = createClient(supabaseUrl, supabaseKey);

async function initSettings() {
  console.log('Initializing app_settings...');
  
  const defaultSettings = {
    nextOsNumber: 1,
    checklistItems: ["Tela", "Touch", "Câmera", "Áudio", "Microfone", "Botões", "WiFi", "Bluetooth", "Carregamento"],
    checklistByCategory: {
      'Smartphone': [
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
        'Triângulo', 'Círculo', 'Cross / X', 'Quadrado', 'L3 (Analógico)', 'R3 (Analógico)', 'PS Button', 'Touchpad', 'Mute', 'Create', 'Options', 'Conector Carga', 'Entrada Fone P2'
      ],
      'Outro': ['Carregador', 'Cabo USB', 'Bateria', 'Capa Proteção']
    },
    printTerms: '',
    whatsappMessages: {
      'Entrada Registrada': 'Olá, [nome_cliente]! 👋\nSua Ordem de Serviço foi gerada com sucesso em nosso Sistema. 🚀\n\nNúmero da sua OS: [numero_os]\n\nEquipamento:\n[marca] [modelo]\n\nDefeito relatado:\n[defeito]\n\nStatus atual:\n[status]\n\nData de entrada:\n[data_entrada]\n\nVocê pode acompanhar o andamento do seu reparo pelo link abaixo:\n\n👉 [link_os]\n\n[nome_assistencia] agradece sua confiança!',
      'Em Análise Técnica': 'Olá [nome_cliente], sua OS [numero_os] está em análise técnica. Status: [status].',
      'Orçamento em Elaboração': 'Olá [nome_cliente], o orçamento da sua OS [numero_os] está em elaboração. Status: [status].',
      'Aguardando Aprovação': 'Olá, [nome_cliente]! 👋\nSeu orçamento está pronto OS: [numero_os]\n🔧 [defeito]\n💰 [valor_total]  \n Aprove aqui:\n👉 [link_os]\n\nQualquer dúvida é só chamar 👍',
      'Em Manutenção': 'Olá [nome_cliente], sua OS [numero_os] está em manutenção. Status: [status].',
      'Reparo Concluído': 'Olá [nome_cliente], o reparo da sua OS [numero_os] foi concluído. Status: [status].',
      'Orçamento Cancelado': 'Olá [nome_cliente], o orçamento da sua OS [numero_os] foi cancelado. Status: [status].',
      'Assinatura Remota': 'Olá [nome_cliente]! 👋\nSeu atendimento já está em fase final (OS [numero_os]).\n\nFalta só sua confirmação para concluirmos:\n👉 [link_assinatura]\n\nAssim que confirmar, já damos continuidade 👍\n\nAguardamos você\n\n[nome_assistencia]',
      'Sem Reparo': 'Olá [nome_cliente], sua OS [numero_os] foi avaliada como sem reparo. Status: [status].',
      'birthday': 'Olá [nome], a equipe da SERVYX deseja um feliz aniversário! 🎉 Preparamos um mimo especial para você. Conte conosco sempre!',
      'follow_up': 'Olá [nome], tudo bem? Estamos entrando em contato para saber se o serviço realizado no seu aparelho está funcionando perfeitamente. Se puder, deixe uma avaliação para nossa loja no Google. Isso nos ajuda muito!'
    }
  };

  try {
    const { error } = await supabase.from('app_settings').upsert({
      key: 'os_settings',
      value: defaultSettings,
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error initializing settings:', error.message);
    } else {
      console.log('Successfully initialized os_settings.');
    }
  } catch (err) {
    console.error('Fatal error initializing settings:', err);
  }
}

initSettings();

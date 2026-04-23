'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Package, Calculator, PlusCircle, Activity,
  ChevronRight, ChevronLeft, X, Sparkles, Hash, ShoppingCart,
  BookOpen
} from 'lucide-react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  buttonText?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-welcome',
    title: 'Bem-vindo ao Servyx! 🚀',
    description: 'Tudo o que sua assistência técnica precisa em um só lugar: ordens de serviço, financeiro, caixa, estoque, agenda e muito mais.\n\nAgora vamos te guiar pelas principais funcionalidades em um tour rápido!',
    icon: Sparkles,
    iconColor: 'text-[#00E676]',
  },
  {
    targetId: 'tour-btn-ajustes',
    title: '⚙️ Configurações Iniciais',
    description: 'Acesse Ajustes para cadastrar os dados da sua empresa (Nome, CNPJ, Endereço, WhatsApp e Logomarca). Essas informações aparecem automaticamente em todos os recibos.',
    icon: Settings,
    iconColor: 'text-zinc-300',
    buttonText: 'Ir para Ajustes'
  },
  {
    targetId: 'tour-os-number-input',
    title: '🔢 Numeração da OS',
    description: 'Ainda nos Ajustes, aba "Ordem de Serviço", defina o número inicial da OS. Ex: se você já tinha 500 ordens, coloque 501 e o Servyx continua de lá.',
    icon: Hash,
    iconColor: 'text-amber-400',
    buttonText: 'Ir para Ajustes'
  },
  {
    targetId: 'tour-btn-produtos',
    title: '📦 Cadastre seus Produtos',
    description: 'No módulo Produtos, cadastre peças e acessórios. Defina preço de custo, venda e estoque mínimo — o sistema avisa automaticamente quando estiver acabando.',
    icon: Package,
    iconColor: 'text-white',
    buttonText: 'Ir para Produtos'
  },
  {
    targetId: 'tour-btn-caixa',
    title: '💰 Controle de Caixa',
    description: 'Inicie o caixa com o saldo inicial e gerencie entradas e saídas em um só lugar. Ao final do dia, faça o fechamento para conferir o saldo.',
    icon: Calculator,
    iconColor: 'text-white',
    buttonText: 'Ir para o Caixa'
  },
  {
    targetId: 'tour-btn-venda-rapida',
    title: '🛒 Venda Rápida (PDV)',
    description: 'Com o caixa aberto, clique em "Nova Venda" para vendas rápidas de produtos. Selecione o item, escolha o pagamento e finalize. Simples assim!',
    icon: ShoppingCart,
    iconColor: 'text-emerald-400',
    buttonText: 'Ir para Vendas'
  },
  {
    targetId: 'tour-btn-nova_os',
    title: '📋 Crie sua Primeira OS',
    description: 'No módulo Nova OS, busque ou cadastre o cliente, preencha os dados do equipamento, realize o checklist e descreva o defeito. Um comprovante profissional é gerado automaticamente. ✍️',
    icon: PlusCircle,
    iconColor: 'text-[#00E676]',
    buttonText: 'Criar Nova OS'
  },
  {
    targetId: 'tour-btn-status_os',
    title: '📊 Acompanhe pelo Status',
    description: 'No Status OS, todas as ordens ficam organizadas por etapa: Entrada → Orçamento → Análise → Aprovado → Manutenção → Concluído → Retirado. Arraste os cards conforme o serviço avança!',
    icon: Activity,
    iconColor: 'text-white',
    buttonText: 'Ir para Status'
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (moduleId: string) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export default function OnboardingTour({ isOpen, onClose, onNavigate, currentStep, setCurrentStep }: OnboardingTourProps) {
  const [isMobile, setIsMobile] = useState(false);
  // minimized: tour recolhido num botão flutuante enquanto usuário usa o módulo
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sempre que o passo mudar e vier de uma navegação externa, expandir o tour
  useEffect(() => {
    if (isOpen) setMinimized(false);
  }, [currentStep, isOpen]);

  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isCentered = step.targetId === 'tour-welcome';

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(currentStep - 1);
  };

  const handleFinish = () => {
    setCurrentStep(0);
    localStorage.removeItem('servyx_tour_step');
    localStorage.setItem('servyx_onboarding_completed', 'true');
    onClose();
  };

  const handleGoToModule = () => {
    let moduleId = '';

    if (step.targetId === 'tour-btn-ajustes' || step.targetId === 'tour-os-number-input') {
      // Passo 1 (índice 1): dados da empresa → seção COMPANY
      // Passo 2 (índice 2): numeração da OS → seção OS
      moduleId = currentStep === 1 ? 'ajustes:COMPANY' : 'ajustes:OS_PRINT';
    } else {
      const map: Record<string, string> = {
        'tour-btn-produtos': 'produtos',
        'tour-btn-caixa': 'caixa',
        'tour-btn-venda-rapida': 'caixa:PDV',
        'tour-btn-nova_os': 'nova_os',
        'tour-btn-status_os': 'status_os',
      };
      moduleId = map[step.targetId];
    }

    if (moduleId) {
      // Minimize tour so user can use the module freely
      setMinimized(true);
      onNavigate(moduleId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {!minimized && (
          <motion.div
            key="tour-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          >
            {/* Overlay escuro — clicável para fechar */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={handleFinish}
            />

            {/* Card do tour */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="relative z-10 bg-[#111] border border-zinc-700/60 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Barra de progresso */}
              <div className="h-1 bg-zinc-800 w-full">
                <motion.div
                  className="h-full bg-[#00E676]"
                  animate={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <div className="p-6 sm:p-7">
                {/* Botão fechar */}
                <button
                  onClick={handleFinish}
                  className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Ícone + Título + Descrição */}
                <div className="flex items-start gap-4 mb-6 pr-6">
                  <div className={`w-11 h-11 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0 ${step.iconColor}`}>
                    <step.icon size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white leading-snug mb-2">{step.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{step.description}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  {/* Dots */}
                  <div className="flex gap-1.5">
                    {TOUR_STEPS.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentStep(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentStep ? 'w-5 bg-[#00E676]' :
                          idx < currentStep ? 'w-1.5 bg-[#00E676]/40' : 'w-1.5 bg-zinc-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {/* Botão "Ir para módulo" — só quando não é a tela de boas-vindas */}
                    {!isCentered && step.buttonText && (
                      <button
                        onClick={handleGoToModule}
                        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#00E676] border border-[#00E676]/30 hover:bg-[#00E676]/10 transition-all"
                      >
                        {step.buttonText}
                      </button>
                    )}

                    {/* Voltar */}
                    {!isFirst && (
                      <button
                        onClick={handlePrev}
                        className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
                      >
                        <ChevronLeft size={17} />
                      </button>
                    )}

                    {/* Próximo / Concluir */}
                    <button
                      onClick={handleNext}
                      className="bg-[#00E676] hover:bg-[#00d068] text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#00E676]/20 transition-all"
                    >
                      {isLast ? 'Concluir!' : 'Próximo'}
                      {!isLast && <ChevronRight size={15} />}
                    </button>
                  </div>
                </div>

                {/* Contador */}
                <p className="text-center text-[10px] text-zinc-600 mt-5 font-bold uppercase tracking-widest">
                  Passo {currentStep + 1} de {TOUR_STEPS.length}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante quando minimizado */}
      <AnimatePresence>
        {minimized && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => setMinimized(false)}
            className="fixed bottom-6 right-6 z-[300] flex items-center gap-2 bg-[#00E676] text-black px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-[#00E676]/30 hover:bg-[#00d068] transition-colors"
          >
            <BookOpen size={16} />
            Continuar Tour
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

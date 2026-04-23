'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCcw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let isSecurityError = false;

      if (this.state.error?.message) {
        if (
          this.state.error.message.includes('42501') || 
          this.state.error.message.includes('new row violates row-level security policy') ||
          this.state.error.message.includes('insufficient permissions')
        ) {
          isSecurityError = true;
          errorMessage = "Erro de Permissão (RLS): Você não tem permissão para realizar esta operação ou acessar estes dados no Supabase.";
        }
      }

      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full bg-[#141414] border border-white/5 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>
            
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-500/10">
              <AlertTriangle className="text-red-500" size={48} />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight">Ocorreu um erro</h1>
              <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={this.handleReset}
                className="w-full py-4.5 bg-[#00E676] hover:bg-[#00C853] text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#00E676]/10 active:scale-[0.98]"
              >
                <RefreshCcw size={18} />
                Tentar Novamente
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 transition-all border border-white/5 active:scale-[0.98]"
              >
                <Home size={18} />
                Voltar ao Início
              </button>
            </div>

            {isSecurityError && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-red-500/80 uppercase tracking-[0.2em] font-black">
                  Segurança: Violação de Política Detectada
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

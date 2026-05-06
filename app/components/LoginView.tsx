import React, { useState } from 'react';
import { Mail, Lock, Eye } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, pass: string) => void;
  onRegister: () => void;
}

export default function LoginView({ onLogin, onRegister }: LoginViewProps) {
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
              alt="Logotipo da Servyx"
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
                  placeholder="nome@empresa.com" 
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
          </form>
        </div>
      </div>
    </div>
  );
}

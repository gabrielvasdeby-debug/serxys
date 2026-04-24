import React, { useState } from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import { formatPhone } from '../utils/formatPhone';

interface RegisterViewProps {
  onRegister: (company: string, name: string, whatsapp: string, email: string, pass: string) => void;
  onBack: () => void;
}

export default function RegisterView({ onRegister, onBack }: RegisterViewProps) {
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
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
    onRegister(company, name, whatsapp, email, password);
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
              <label className="block text-sm font-medium text-zinc-300">WhatsApp da Empresa</label>
              <input 
                type="text" 
                required 
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                className="w-full bg-[#222222] border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-all" 
                placeholder="(00) 00000-0000" 
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

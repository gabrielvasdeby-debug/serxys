import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface PinEntryViewProps {
  onVerify: (pin: string) => void;
  onCancel: () => void;
}

export default function PinEntryView({ onVerify, onCancel }: PinEntryViewProps) {
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

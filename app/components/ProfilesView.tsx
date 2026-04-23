import React from 'react';
import Image from 'next/image';
import { Settings, Plus, ShieldAlert } from 'lucide-react';
import { Profile } from '../types';

interface ProfilesViewProps {
  profiles: Profile[];
  onSelectProfile: (p: Profile, targetView?: any) => void;
  onManageProfiles: () => void;
  onAddProfile: () => void;
}

export default function ProfilesView({ 
  profiles, 
  onSelectProfile, 
  onManageProfiles, 
  onAddProfile 
}: ProfilesViewProps) {
  const [isManageMode, setIsManageMode] = React.useState(false);
  const ads = profiles.filter(p => p.type === 'ADM' || p.role === 'ADM');

  const handleProfileClick = (p: Profile) => {
    if (isManageMode) {
      onSelectProfile(p, 'SETTINGS');
    } else {
      onSelectProfile(p);
    }
  };

  const displayedProfiles = isManageMode ? ads : profiles;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-4 text-center">
      <div className="w-full max-w-4xl py-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          {isManageMode ? 'Configurações Protegidas' : 'Escolha seu perfil'}
        </h1>
        <p className="text-xl text-zinc-400 mb-10 font-light">
          {isManageMode ? 'Selecione um Administrador para acessar os ajustes' : 'Quem está acessando hoje?'}
        </p>
        
        {isManageMode && ads.length === 0 && (
          <div className="max-w-md mx-auto mb-10 bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center">
             <ShieldAlert size={32} className="mx-auto mb-4 text-red-500" />
             <p className="text-zinc-400 text-sm">Nenhum perfil administrador encontrado para configurar o sistema.</p>
             <button onClick={() => setIsManageMode(false)} className="mt-4 text-[#00E676] font-bold text-xs uppercase tracking-widest">Voltar</button>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-8 sm:gap-12 max-w-4xl mx-auto">
          {displayedProfiles.map(p => (
            <button key={p.id} onClick={() => handleProfileClick(p)} className="group flex flex-col items-center gap-4 transition-all hover:scale-110 focus:outline-none relative">
              <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-transparent group-hover:border-amber-500 group-focus:border-amber-500 transition-all shadow-2xl relative bg-zinc-800">
                <Image src={p.photo} alt={p.name} fill className="object-cover" referrerPolicy="no-referrer" />
                {!p.pin && (
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-zinc-950/80 border border-amber-500/50 flex items-center justify-center text-amber-500 backdrop-blur-sm" title="Perfil sem PIN">
                    <ShieldAlert size={14} />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-zinc-300 group-hover:text-white group-focus:text-white font-medium text-xl transition-colors">{p.name}</p>
                {isManageMode && <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Nível ADM</p>}
              </div>
            </button>
          ))}
          
          {!isManageMode && (
            <button onClick={onAddProfile} className="group flex flex-col items-center gap-4 transition-all hover:scale-110 focus:outline-none">
              <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-[#00E676] transition-all flex items-center justify-center bg-black/20">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-[#00E676] transition-colors">
                  <Plus size={28} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-zinc-400 group-hover:text-white font-medium text-xl transition-colors">Adicionar</p>
              </div>
            </button>
          )}
        </div>
        
        <div className="mt-20 flex justify-center pb-12 gap-4">
          {isManageMode ? (
            <button 
              onClick={() => setIsManageMode(false)}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 font-black tracking-[0.2em] text-[9px] uppercase hover:bg-zinc-800 transition-all active:scale-95 shadow-2xl"
            >
              Cancelar Ajustes
            </button>
          ) : ads.length > 0 && (
            <button 
              onClick={() => setIsManageMode(true)}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 font-black tracking-[0.2em] text-[9px] uppercase hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-500 transition-all group active:scale-95 shadow-2xl"
            >
              <Settings size={14} className="group-hover:rotate-90 transition-transform duration-700" />
              Ajustes do Sistema
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { ArrowLeft, User, ShieldCheck, Lock, Check, Camera, Plus, X } from 'lucide-react';
import { Profile, ProfileType } from '../types';
import { DEFAULT_PERMISSIONS, AVAILABLE_MODULES } from '../constants';
import { supabase } from '../supabase';

interface CreateProfileViewProps {
  onSave: (data: Omit<Profile, 'id'>) => void;
  onBack: () => void;
  profiles: Profile[];
  onShowToast: (message: string) => void;
}

export default function CreateProfileView({ onSave, onBack, profiles, onShowToast }: CreateProfileViewProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProfileType>('Técnico');
  const [photo, setPhoto] = useState(`https://picsum.photos/seed/${Math.random()}/200/200`);
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_PERMISSIONS['Técnico']);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (newType: ProfileType) => {
    setType(newType);
    setPermissions(DEFAULT_PERMISSIONS[newType]);
  };

  const togglePermission = (moduleId: string) => {
    setPermissions(prev => prev.includes(moduleId) ? prev.filter(p => p !== moduleId) : [...prev, moduleId]);
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
      setPhoto(publicUrl);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      onShowToast(`Erro ao salvar foto: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="p-6 border-b border-white/5">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight italic uppercase">Novo Perfil Elite</h1>
        </div>
      </header>
      
      <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-xl mx-auto space-y-10 pb-12">
          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#00E676] bg-zinc-900 shadow-2xl relative">
                <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 bg-[#00E676] rounded-full flex items-center justify-center text-black shadow-lg border-2 border-[#0a0a0a] hover:scale-110 active:scale-95 transition-all"
              >
                <Camera size={16} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-black">Avatar do Operador</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Identificação</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#00E676]/30 transition-all font-bold" 
                placeholder="Ex: João Técnico"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Categori / Permissões Base</label>
              <div className="grid grid-cols-2 gap-3">
                {(['ADM', 'Técnico', 'Atendente', 'Financeiro'] as ProfileType[]).map(t => (
                  <button 
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${type === t ? 'bg-[#00E676]/10 border-[#00E676] text-white' : 'bg-white/[0.02] border-white/5 text-zinc-600'}`}
                  >
                    <span className="font-black uppercase tracking-widest text-[10px]">{t}</span>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${type === t ? 'bg-[#00E676] text-black' : 'bg-black/40 border border-white/5'}`}>
                      {type === t && <Check size={12} strokeWidth={4} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Acesso aos Módulos</label>
                <span className="text-[9px] text-[#00E676] font-bold uppercase tracking-tight">{permissions.length} Ativos</span>
              </div>
              <div className="flex flex-col gap-1.5 bg-white/[0.01] border border-white/[0.03] rounded-3xl p-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                {AVAILABLE_MODULES.map(module => (
                  <button
                    key={module.id}
                    onClick={() => togglePermission(module.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${permissions.includes(module.id) ? 'bg-[#00E676]/5 border-[#00E676]/30 text-white' : 'bg-black/20 border-white/[0.03] text-zinc-600 hover:text-zinc-400'}`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${permissions.includes(module.id) ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-zinc-800'}`} />
                       <span className="text-[11px] font-black uppercase tracking-widest">{module.name}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${permissions.includes(module.id) ? 'bg-[#00E676] text-black' : 'bg-zinc-900 border border-white/10'}`}>
                      {permissions.includes(module.id) && <Check size={12} strokeWidth={4} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${usePin ? 'bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-zinc-800 text-zinc-600'}`}>
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white tracking-tight uppercase">Senha de Acesso</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">PIN de 4 dígitos</p>
                  </div>
                </div>
                <button 
                  onClick={() => setUsePin(!usePin)}
                  className={`w-12 h-6 rounded-full relative transition-all ${usePin ? 'bg-[#00E676]' : 'bg-zinc-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${usePin ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {usePin && (
                <input 
                  type="password" 
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black border border-[#00E676]/30 rounded-2xl px-6 py-4 text-center text-3xl tracking-[1em] text-[#00E676] font-mono focus:outline-none focus:border-[#00E676] transition-all shadow-inner"
                  placeholder="••••"
                />
              )}
            </div>
          </div>

          <button 
            onClick={() => onSave({ name, type, role: type, photo, permissions, pin: usePin ? pin : undefined, company_id: '' })}
            disabled={!name || (usePin && pin.length !== 4) || isUploading}
            className="w-full py-5 bg-[#00E676] hover:bg-[#00C853] disabled:opacity-20 disabled:grayscale text-black font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all shadow-2xl shadow-[#00E676]/10 active:scale-95"
          >
            {isUploading ? 'Salvando Foto...' : 'Finalizar Cadastro de Operador'}
          </button>
        </div>
      </main>
    </div>
  );
}

import React from 'react';
import { Check, X, Battery, Headphones } from 'lucide-react';

interface VisualControllerProps {
  checklist: Record<string, 'works' | 'broken' | 'untested'>;
  onChange: (item: string, status: 'works' | 'broken' | 'untested') => void;
}

const VisualController: React.FC<VisualControllerProps> = ({ checklist, onChange }) => {
  const toggleStatus = (item: string) => {
    const current = checklist[item] || 'untested';
    if (current === 'untested') onChange(item, 'works');
    else if (current === 'works') onChange(item, 'broken');
    else onChange(item, 'untested');
  };

  const ButtonSpot = ({ id, label, style, size = 20 }: { id: string, label: string, style: React.CSSProperties, size?: number }) => {
    const status = checklist[id] || 'untested';
    
    return (
      <button
        type="button"
        onClick={() => toggleStatus(id)}
        className="absolute z-20 flex flex-col items-center justify-center transition-all group pointer-events-auto"
        style={{ ...style, width: size, height: size }}
      >
        <div className={`
          relative w-full h-full rounded-md flex items-center justify-center border-[1.5px] transition-all duration-200
          ${status === 'works' ? 'bg-[#00E676] border-[#00E676] text-black shadow-[0_0_12px_rgba(0,230,118,0.6)]' : 
            status === 'broken' ? 'bg-red-500 border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 
            'bg-[#050505]/95 border-zinc-700 text-transparent hover:border-[#00E676] hover:bg-zinc-800'}
        `}>
          {status === 'works' && <Check size={size * 0.7} strokeWidth={4} />}
          {status === 'broken' && <X size={size * 0.7} strokeWidth={4} />}
          
          <div className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[#00E676] border border-[#00E676]/30 rounded shadow-2xl text-[10px] font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-30 transform group-hover:-translate-y-1">
            {label}
          </div>
        </div>
        
        <span className="sm:hidden mt-0.5 text-[6.5px] font-black text-zinc-600 uppercase whitespace-nowrap scale-[0.85]">
          {label.split(' ')[0]}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full bg-[#080808] rounded-[2rem] p-3 sm:p-10 border border-zinc-900 shadow-3xl overflow-hidden">
      <div className="max-w-[600px] mx-auto overflow-visible">
        <div className="relative aspect-[1.35/1] w-full select-none pointer-events-none">
          {/* Sharper Professional Symmetric Controller SVG */}
          <svg viewBox="0 0 500 350" className="w-full h-full drop-shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#222" />
                <stop offset="100%" stopColor="#080808" />
              </linearGradient>
            </defs>
            
            {/* Sharper Main Shell */}
            <path 
              d="M135,45 L365,45 L385,50 C415,55 445,70 460,105 L480,150 L490,260 C490,290 465,315 440,315 C410,315 385,285 370,245 L355,210 L145,210 L130,245 C115,285 90,315 60,315 C35,315 10,290 10,260 L20,150 L40,105 C55,70 85,55 115,50 Z" 
              fill="url(#bodyGrad)" 
              stroke="#2A2A2A" 
              strokeWidth="2.5" 
            />
            
            {/* Center Area (Rectangular Touchpad) */}
            <rect x="165" y="55" width="170" height="90" rx="6" fill="#0C0C0C" stroke="#222" strokeWidth="2.5" />
            
            {/* Symmetrical Sticks (Center Aligned) */}
            <circle cx="185" cy="190" r="46" fill="#030303" stroke="#1A1A1A" strokeWidth="2.5" />
            <circle cx="315" cy="190" r="46" fill="#030303" stroke="#1A1A1A" strokeWidth="2.5" />
            
            {/* Charging Port Slot (TOP) */}
            <rect x="235" y="40" width="30" height="10" rx="2" fill="#0D0D0D" stroke="#1A1A1A" strokeWidth="1" />
            
            {/* Headphone Jack Port (BOTTOM) */}
            <circle cx="250" cy="210" r="6" fill="#0D0D0D" stroke="#1A1A1A" strokeWidth="1" />
          </svg>

          {/* ABSOLUTE POSITIONED BUTTONS (PERCENTAGE BASED) */}
          
          {/* L1/L2 and R1/R2 (Top Bar) */}
          <ButtonSpot id="L2" label="L2" style={{ left: '16.5%', top: '0%' }} size={28} />
          <ButtonSpot id="L1" label="L1" style={{ left: '16.5%', top: '10%' }} size={28} />
          <ButtonSpot id="R2" label="R2" style={{ right: '16.5%', top: '0%' }} size={28} />
          <ButtonSpot id="R1" label="R1" style={{ right: '16.5%', top: '10%' }} size={28} />

          {/* D-PAD */}
          <ButtonSpot id="D-Pad Cima" label="DPAD ↑" style={{ left: '22%', top: '24%' }} size={22} />
          <ButtonSpot id="D-Pad Baixo" label="DPAD ↓" style={{ left: '22%', top: '42%' }} size={22} />
          <ButtonSpot id="D-Pad Esquerda" label="DPAD ←" style={{ left: '15%', top: '33%' }} size={22} />
          <ButtonSpot id="D-Pad Direita" label="DPAD →" style={{ left: '29%', top: '33%' }} size={22} />

          {/* FACE BUTTONS */}
          <ButtonSpot id="Triângulo" label="▲" style={{ right: '22%', top: '24%' }} size={22} />
          <ButtonSpot id="Cross / X" label="✖" style={{ right: '22%', top: '42%' }} size={22} />
          <ButtonSpot id="Quadrado" label="■" style={{ right: '29%', top: '33%' }} size={22} />
          <ButtonSpot id="Círculo" label="●" style={{ right: '15%', top: '33%' }} size={22} />

          {/* STICKS */}
          <ButtonSpot id="L3 (Analógico)" label="L3" style={{ left: '32.5%', top: '53%' }} size={30} />
          <ButtonSpot id="R3 (Analógico)" label="R3" style={{ right: '32.5%', top: '53%' }} size={30} />

          {/* UTILITY BUTTONS */}
          <ButtonSpot id="PS Button" label="Home" style={{ left: '50%', top: '51%', transform: 'translateX(-50%)' }} size={28} />
          <ButtonSpot id="Touchpad" label="TPAD" style={{ left: '50%', top: '24%', transform: 'translateX(-50%)' }} size={34} />
          <ButtonSpot id="Create" label="SHRE" style={{ left: '32%', top: '22%' }} size={16} />
          <ButtonSpot id="Options" label="OPTS" style={{ right: '32%', top: '22%' }} size={16} />
          
          {/* CONECTOR CARGA (Moved to TOP as requested) */}
          <ButtonSpot id="Conector Carga" label="CRGA" style={{ left: '50%', top: '0%', transform: 'translateX(-50%)' }} size={24} />
          
          {/* ENTRADA FONE / P2 (New - at BOTTOM as requested) */}
          <ButtonSpot id="Entrada Fone P2" label="FONE" style={{ left: '50%', top: '63.5%', transform: 'translateX(-50%)' }} size={22} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-12 px-2 border-t border-zinc-900/50 pt-8">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#00E676]" />
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">OK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider text-red-500">Falha</span>
          </div>
        </div>
        
        <div className="text-[9px] text-zinc-500 italic bg-zinc-900/30 px-5 py-2 rounded-2xl border border-zinc-800/50">
          Carga (Topo) • Fone P2 (Base)
        </div>
      </div>
    </div>
  );
};

export default VisualController;

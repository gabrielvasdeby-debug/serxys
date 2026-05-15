import React from 'react';
import { Check, X } from 'lucide-react';

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
          ${status === 'works' ? 'bg-[#00E676] border-[#00E676] text-black shadow-[0_0_10px_rgba(0,230,118,0.5)]' : 
            status === 'broken' ? 'bg-red-500 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
            'bg-[#050505]/95 border-zinc-700 text-transparent hover:border-[#00E676] hover:bg-zinc-800'}
        `}>
          {status === 'works' && <Check size={size * 0.6} strokeWidth={3.5} />}
          {status === 'broken' && <X size={size * 0.6} strokeWidth={3.5} />}
          
          <div className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[#00E676] border border-[#00E676]/30 rounded shadow-2xl text-[10px] font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-30 transform group-hover:-translate-y-1">
            {label}
          </div>
        </div>
        
        <span className="sm:hidden mt-[2px] text-[4.5px] font-bold text-zinc-600 uppercase whitespace-nowrap leading-none opacity-50">
          {label.split(' ')[0]}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full bg-[#080808] rounded-xl sm:rounded-[2rem] py-6 px-0 sm:p-4 border border-zinc-900 shadow-2xl overflow-hidden">
      <div className="w-full mx-auto px-1 sm:px-0">
        <div className="relative w-full scale-[1.12] sm:scale-100 origin-center" style={{ paddingBottom: '68%' }}>
          {/* Controller SVG */}
          <svg
            viewBox="0 0 500 350"
            className="absolute inset-0 w-full h-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
          >
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#222" />
                <stop offset="100%" stopColor="#080808" />
              </linearGradient>
            </defs>
            {/* Main Shell */}
            <path
              d="M135,45 L365,45 L385,50 C415,55 445,70 460,105 L480,150 L490,260 C490,290 465,315 440,315 C410,315 385,285 370,245 L355,210 L145,210 L130,245 C115,285 90,315 60,315 C35,315 10,290 10,260 L20,150 L40,105 C55,70 85,55 115,50 Z"
              fill="url(#bodyGrad)"
              stroke="#2A2A2A"
              strokeWidth="2.5"
            />
            {/* Center Touchpad Area */}
            <rect x="165" y="55" width="170" height="90" rx="6" fill="#0C0C0C" stroke="#222" strokeWidth="2.5" />
            {/* Sticks */}
            <circle cx="185" cy="190" r="46" fill="#030303" stroke="#1A1A1A" strokeWidth="2.5" />
            <circle cx="315" cy="190" r="46" fill="#030303" stroke="#1A1A1A" strokeWidth="2.5" />
            {/* Charging Port (TOP) */}
            <rect x="235" y="40" width="30" height="10" rx="2" fill="#0D0D0D" stroke="#1A1A1A" strokeWidth="1" />
            {/* Headphone Jack (BOTTOM) */}
            <circle cx="250" cy="210" r="6" fill="#0D0D0D" stroke="#1A1A1A" strokeWidth="1" />
          </svg>

          {/* Buttons overlay */}
          <div className="absolute inset-0 pointer-events-none">

            {/* SHOULDERS */}
            <ButtonSpot id="L2" label="L2" style={{ left: '16%', top: '2%' }} size={32} />
            <ButtonSpot id="L1" label="L1" style={{ left: '18%', top: '12%' }} size={32} />
            <ButtonSpot id="R2" label="R2" style={{ right: '16%', top: '2%' }} size={32} />
            <ButtonSpot id="R1" label="R1" style={{ right: '18%', top: '12%' }} size={32} />

            {/* D-PAD (Aligned with left face area) */}
            <ButtonSpot id="D-Pad Cima"     label="↑" style={{ left: '17%', top: '23%' }} size={34} />
            <ButtonSpot id="D-Pad Baixo"    label="↓" style={{ left: '17%', top: '48%' }} size={34} />
            <ButtonSpot id="D-Pad Esquerda" label="←" style={{ left: '8%',  top: '35.5%' }} size={34} />
            <ButtonSpot id="D-Pad Direita"  label="→" style={{ left: '26%', top: '35.5%' }} size={34} />

            {/* FACE BUTTONS (Aligned with right face area) */}
            <ButtonSpot id="Triângulo"  label="▲" style={{ right: '17%', top: '23%' }} size={34} />
            <ButtonSpot id="Cross / X"  label="✖" style={{ right: '17%', top: '48%' }} size={34} />
            <ButtonSpot id="Quadrado"   label="■" style={{ right: '26%', top: '35.5%' }} size={34} />
            <ButtonSpot id="Círculo"    label="●" style={{ right: '8%',  top: '35.5%' }} size={34} />

            {/* ANALOG STICKS (Aligned with L3/R3 circles) */}
            <ButtonSpot id="L3 (Analógico)" label="L3" style={{ left: '33.4%',  top: '51.5%' }} size={38} />
            <ButtonSpot id="R3 (Analógico)" label="R3" style={{ right: '33.4%', top: '51.5%' }} size={38} />

            {/* UTILITY */}
            <ButtonSpot id="PS Button" label="Home" style={{ left: '50%', top: '56%', transform: 'translateX(-50%)' }} size={32} />
            <ButtonSpot id="Touchpad"  label="TPAD" style={{ left: '50%', top: '24%', transform: 'translateX(-50%)' }} size={38} />
            <ButtonSpot id="Create"    label="SHRE" style={{ left: '32%', top: '19%' }} size={24} />
            <ButtonSpot id="Options"   label="OPTS" style={{ right: '32%', top: '19%' }} size={24} />

            {/* PORTS */}
            <ButtonSpot id="Conector Carga"  label="CRGA" style={{ left: '50%', top: '2%', transform: 'translateX(-50%)' }} size={32} />
            <ButtonSpot id="Entrada Fone P2" label="FONE" style={{ left: '50%', top: '68%', transform: 'translateX(-50%)' }} size={32} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between gap-4 mt-6 px-3 border-t border-zinc-900/50 pt-3">
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-[#00E676]" />
            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">OK</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-red-500" />
            <span className="text-[8px] text-red-500 font-bold uppercase tracking-wider">Falha</span>
          </div>
        </div>
        <div className="text-[8px] text-zinc-600 font-medium uppercase tracking-tighter">
          Checklist Visual Interativo
        </div>
      </div>
    </div>
  );
};

export default VisualController;

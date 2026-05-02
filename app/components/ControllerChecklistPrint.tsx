import React from 'react';

interface ControllerChecklistPrintProps {
  checklist: Record<string, 'works' | 'broken' | 'untested'>;
  /** 'dark' for screen display, 'light' for A4 print */
  theme?: 'dark' | 'light';
  /** Explicit pixel height for the SVG (helps avoid clipping in print). Defaults to auto (100% width). */
  svgHeight?: number;
  /** If true, uses high-contrast black/white symbols (X/V) instead of colors, suitable for thermal printers. */
  isThermal?: boolean;
}

const BUTTONS: { id: string; label: string; cx: number; cy: number; r?: number; rx?: number; ry?: number }[] = [
  { id: 'L2',            label: 'L2',   cx: 82,  cy: 25 },
  { id: 'L1',            label: 'L1',   cx: 82,  cy: 55 },
  { id: 'R2',            label: 'R2',   cx: 418, cy: 25 },
  { id: 'R1',            label: 'R1',   cx: 418, cy: 55 },
  { id: 'D-Pad Cima',    label: '↑',   cx: 110, cy: 90 },
  { id: 'D-Pad Baixo',   label: '↓',   cx: 110, cy: 155 },
  { id: 'D-Pad Esquerda',label: '←',   cx: 75,  cy: 122 },
  { id: 'D-Pad Direita', label: '→',   cx: 145, cy: 122 },
  { id: 'Triângulo',     label: '▲',   cx: 390, cy: 90 },
  { id: 'Cross / X',     label: '✖',   cx: 390, cy: 155 },
  { id: 'Quadrado',      label: '■',   cx: 355, cy: 122 },
  { id: 'Círculo',       label: '●',   cx: 425, cy: 122 },
  { id: 'L3 (Analógico)', label: 'L3',  cx: 185, cy: 190 },
  { id: 'R3 (Analógico)', label: 'R3',  cx: 315, cy: 190 },
  { id: 'PS Button',     label: 'PS',  cx: 250, cy: 195 },
  { id: 'Touchpad',      label: 'TPAD',cx: 250, cy: 90 },
  { id: 'Create',        label: 'SHR', cx: 160, cy: 80 },
  { id: 'Options',       label: 'OPT', cx: 340, cy: 80 },
  { id: 'Conector Carga',label: 'USB', cx: 250, cy: 25 },
  { id: 'Entrada Fone P2',label:'P2',  cx: 250, cy: 235 },
];

const statusColor = (s: 'works' | 'broken' | 'untested' | undefined, theme: 'dark' | 'light') => {
  if (s === 'works')  return '#00E676';
  if (s === 'broken') return '#EF4444';
  return theme === 'light' ? '#CBD5E1' : '#3F3F46';
};

const statusTextColor = (s: 'works' | 'broken' | 'untested' | undefined) => {
  if (s === 'works')  return '#000';
  if (s === 'broken') return '#fff';
  return '#888';
};

export default function ControllerChecklistPrint({ checklist, theme = 'dark', svgHeight, isThermal }: ControllerChecklistPrintProps) {
  const bg = isThermal ? '#FFFFFF' : (theme === 'light' ? '#FFFFFF' : '#0A0A0A');
  const shell = isThermal ? '#FFFFFF' : (theme === 'light' ? '#FFFFFF' : '#1A1A1A');
  const shellStroke = isThermal ? '#000000' : (theme === 'light' ? '#94A3B8' : '#2A2A2A');
  const innerFill = isThermal ? '#FFFFFF' : (theme === 'light' ? '#F1F5F9' : '#030303');
  const textCol = isThermal ? '#000000' : (theme === 'light' ? '#334155' : '#A1A1AA');
  
  const legendOk = isThermal ? '#FFFFFF' : '#00E676';
  const legendFail = isThermal ? '#FFFFFF' : '#EF4444';
  const legendUntested = isThermal ? '#FFFFFF' : (theme === 'light' ? '#CBD5E1' : '#3F3F46');

  const svgProps = svgHeight
    ? { viewBox: '0 0 500 350', height: svgHeight, width: Math.round(svgHeight * (500 / 350)), preserveAspectRatio: 'xMidYMid meet', style: { display: 'block', margin: '0 auto' } as React.CSSProperties }
    : { viewBox: '0 0 500 350', width: '100%', preserveAspectRatio: 'xMidYMid meet', style: { display: 'block' } as React.CSSProperties };

  return (
    <div style={{ background: bg, borderRadius: isThermal ? 0 : 16, padding: isThermal ? '4px' : '8px 8px 6px', border: isThermal ? 'none' : (theme === 'light' ? 'none' : `1px solid ${shellStroke}`) }}>
      <svg {...svgProps}>
        {/* Controller body */}
        <path
          d="M135,45 L365,45 L385,50 C415,55 445,70 460,105 L480,150 L490,260 C490,290 465,315 440,315 C410,315 385,285 370,245 L355,210 L145,210 L130,245 C115,285 90,315 60,315 C35,315 10,290 10,260 L20,150 L40,105 C55,70 85,55 115,50 Z"
          fill={shell}
          stroke={shellStroke}
          strokeWidth={isThermal ? "1.5" : "2.5"}
        />
        {/* Center touchpad area */}
        <rect x="165" y="55" width="170" height="90" rx="6" fill={innerFill} stroke={shellStroke} strokeWidth={isThermal ? "1" : "2"} />
        {/* Sticks */}
        <circle cx="185" cy="190" r="46" fill={innerFill} stroke={shellStroke} strokeWidth={isThermal ? "1" : "2"} />
        <circle cx="315" cy="190" r="46" fill={innerFill} stroke={shellStroke} strokeWidth={isThermal ? "1" : "2"} />
        
        {/* Button dots */}
        {BUTTONS.map(btn => {
          const status = (checklist && checklist[btn.id]) || 'untested';
          const r = 12;
          
          if (isThermal) {
            return (
              <g key={btn.id}>
                {status === 'works' && (
                  <path
                    d="M-8,1 L-2,7 L10,-9"
                    fill="none"
                    stroke="#000"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform={`translate(${btn.cx}, ${btn.cy})`}
                  />
                )}
                {status === 'broken' && (
                  <g transform={`translate(${btn.cx}, ${btn.cy})`}>
                    <line x1="-7" y1="-7" x2="7" y2="7" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
                    <line x1="7" y1="-7" x2="-7" y2="7" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
                  </g>
                )}
              </g>
            );
          }

          const fill = statusColor(status, theme);
          const textFill = statusTextColor(status);
          return (
            <g key={btn.id}>
              <circle cx={btn.cx} cy={btn.cy} r={r} fill={fill} strokeWidth="0" />
              <text
                x={btn.cx}
                y={btn.cy + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fontWeight="900"
                fontFamily="monospace"
                fill={textFill}
              >
                {btn.label.length > 3 ? btn.label.substring(0, 3) : btn.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 4 }}>
        {isThermal ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 8, fontWeight: 900 }}>V = OK</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 8, fontWeight: 900 }}>X = DEFEITO</span>
            </div>
          </>
        ) : (
          [
            { color: legendOk,       label: 'OK' },
            { color: legendFail,     label: 'FALHA' },
            { color: legendUntested, label: 'N/T' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 7, fontWeight: 800, color: textCol, textTransform: 'uppercase' }}>{l.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

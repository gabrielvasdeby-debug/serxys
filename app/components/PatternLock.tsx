import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, RotateCcw } from 'lucide-react';

interface PatternLockProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pattern: string) => void;
  initialPattern?: string;
  readOnly?: boolean;
}

export default function PatternLock({ isOpen, onClose, onSave, initialPattern, readOnly = false }: PatternLockProps) {
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const containerRef = useRef<SVGSVGElement>(null);
  const touchAreasRef = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize pattern
  useEffect(() => {
    if (isOpen) {
      if (readOnly && initialPattern) {
        setPattern(initialPattern.split('-').map(Number));
      } else {
        setPattern([]);
        setSuccess(false);
        setError(false);
      }
    }
  }, [isOpen, readOnly, initialPattern]);

  const getPointCoords = (dotNum: number) => {
    const col = (dotNum - 1) % 3;
    const row = Math.floor((dotNum - 1) / 3);
    // Return percentage-based coords (0 to 100)
    return {
      x: 16.66 + col * 33.33,
      y: 16.66 + row * 33.33
    };
  };

  const handlePoint = (dotNum: number) => {
    if (pattern.includes(dotNum)) return;

    setPattern(prev => {
      const newPattern = [...prev];
      
      // Auto-connect intermediate dots
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const mid = getMidpoint(last, dotNum);
        if (mid && !prev.includes(mid)) {
          newPattern.push(mid);
        }
      }
      
      newPattern.push(dotNum);
      return newPattern;
    });
  };

  const getMidpoint = (p1: number, p2: number): number | null => {
    const midpoints: Record<string, number> = {
      '1-3': 2, '3-1': 2,
      '1-7': 4, '7-1': 4,
      '1-9': 5, '9-1': 5,
      '2-8': 5, '8-2': 5,
      '3-7': 5, '7-3': 5,
      '3-9': 6, '9-3': 6,
      '4-6': 5, '6-4': 5,
      '7-9': 8, '9-7': 8
    };
    return midpoints[`${p1}-${p2}`] || null;
  };

  const processInput = (clientX: number, clientY: number) => {
    if (!isDrawing || readOnly || success) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      setCurrentPos({ x, y });

      // Check distance to all dots
      for (let i = 1; i <= 9; i++) {
        const dotCoords = getPointCoords(i);
        const dist = Math.sqrt(Math.pow(x - dotCoords.x, 2) + Math.pow(y - dotCoords.y, 2));
        
        // Threshold (8% of grid) for more intentional selection
        if (dist < 8) {
          handlePoint(i);
        }
      }
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || success) return;
    setIsDrawing(true);
    setError(false);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    processInput(clientX, clientY);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scroll while drawing
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    processInput(clientX, clientY);
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentPos(null);
    
    if (pattern.length > 0 && pattern.length < 4) {
      setError(true);
      setPattern([]);
      setTimeout(() => setError(false), 1500);
    }
  };

  const handleSave = () => {
    if (pattern.length < 4) return;
    setSuccess(true);
    setTimeout(() => {
      onSave(pattern.join('-'));
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl touch-none">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="bg-[#0F0F0F] border border-white/10 rounded-[40px] p-8 w-full max-w-[360px] shadow-2xl relative select-none"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2">
              {readOnly ? 'Senha Visual' : 'Defina o Padrão'}
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
              {readOnly ? 'Padrão registrado no aparelho' : (error ? 'Mínimo 4 pontos!' : 'Desenhe conectando os pontos')}
            </p>
          </div>

          <div 
            className="relative aspect-square w-full bg-[#111111] rounded-3xl border border-white/5 shadow-inner p-4 touch-none"
            onMouseDown={handleStart}
            onTouchStart={handleStart}
            onMouseMove={handleMove}
            onTouchMove={handleMove}
            onMouseUp={handleEnd}
            onTouchEnd={handleEnd}
            onMouseLeave={handleEnd}
          >
            {/* SVG Layer for Drawing Lines */}
            <svg 
              ref={containerRef}
              viewBox="0 0 100 100" 
              className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] pointer-events-none z-10 overflow-visible"
            >
              {/* Connected lines */}
              {pattern.map((dot, i) => {
                if (i === 0) return null;
                const p1 = getPointCoords(pattern[i-1]);
                const p2 = getPointCoords(dot);
                return (
                  <line
                    key={`line-${i}`}
                    x1={p1.x} y1={p1.y}
                    x2={p2.x} y2={p2.y}
                    stroke={error ? '#EF4444' : '#00E676'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="transition-all"
                  />
                );
              })}

              {/* Rubber band line following finger/mouse */}
              {isDrawing && currentPos && pattern.length > 0 && (
                <line
                  x1={getPointCoords(pattern[pattern.length-1]).x}
                  y1={getPointCoords(pattern[pattern.length-1]).y}
                  x2={currentPos.x}
                  y2={currentPos.y}
                  stroke={error ? '#EF4444' : '#00E676'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              )}
            </svg>

            {/* Hit Areas / Visual Dots */}
            <div className="absolute inset-4 grid grid-cols-3 grid-rows-3 h-[calc(100%-2rem)] z-20 pointer-events-none">
              {[1,2,3,4,5,6,7,8,9].map(num => {
                const isSelected = pattern.includes(num);
                return (
                  <div 
                    key={`hit-${num}`}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <div className="relative flex items-center justify-center">
                      <div 
                        className={`absolute w-12 h-12 rounded-full transition-all duration-200 ${
                          isSelected ? (error ? 'bg-red-500/20 scale-100' : 'bg-[#00E676]/20 scale-100') : 'scale-0'
                        }`}
                      />
                      <div 
                        className={`w-3.5 h-3.5 rounded-full z-10 transition-all duration-200 ${
                          isSelected ? (error ? 'bg-red-500 scale-125' : 'bg-[#00E676] scale-125') : 'bg-zinc-600 scale-100 border-2 border-zinc-500/50'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!readOnly && (
            <div className="mt-10 flex gap-4">
              <button
                onClick={() => { setPattern([]); setError(false); }}
                className="p-5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-[24px] transition-all border border-white/5"
              >
                <RotateCcw size={20} />
              </button>
              <button
                onClick={handleSave}
                disabled={pattern.length < 4 || success}
                className={`flex-1 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all ${
                  pattern.length >= 4 
                    ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20 active:scale-95' 
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {success ? 'Concluído!' : 'Salvar Padrão'}
              </button>
            </div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-[40px] flex items-center justify-center p-8 z-50"
            >
              <div className="bg-[#00E676] p-4 rounded-full shadow-2xl shadow-[#00E676]/40">
                <Check size={40} className="text-black" />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

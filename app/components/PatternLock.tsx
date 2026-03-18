import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, RotateCcw } from 'lucide-react';

interface PatternLockProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pattern: string) => void;
  initialPattern?: string;
  readOnly?: boolean;
}

export default function PatternLock({ isOpen, onClose, onSave, initialPattern, readOnly = false }: PatternLockProps) {
  const [pattern, setPattern] = useState<number[]>(readOnly && initialPattern ? initialPattern.split('-').map(Number) : []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [step, setStep] = useState<'DRAW' | 'CONFIRM' | 'VIEW'>(readOnly && initialPattern ? 'VIEW' : 'DRAW');
  const [firstPattern, setFirstPattern] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dots = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const getDotPosition = (dotNumber: number) => {
    // Grid is 3x3, container is 280x280
    // Each cell is 280/3 = 93.33px
    const index = dotNumber - 1;
    const col = index % 3;
    const row = Math.floor(index / 3);
    const cellSize = 280 / 3;
    return {
      x: (col + 0.5) * cellSize,
      y: (row + 0.5) * cellSize,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || success) return;
    setIsDrawing(true);
    setError(false);
    setPattern([]);
    handleMove(e);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly || success) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setCurrentPos({ x, y });

    // Check if we hit a dot
    dots.forEach((dotNum) => {
      if (pattern.includes(dotNum)) return; // Already in pattern

      const dotPos = getDotPosition(dotNum);
      const distance = Math.sqrt(Math.pow(x - dotPos.x, 2) + Math.pow(y - dotPos.y, 2));
      
      if (distance < 30) { // Hit radius
        setPattern(prev => [...prev, dotNum]);
      }
    });
  };

  const handleEnd = () => {
    if (!isDrawing || readOnly || success) return;
    setIsDrawing(false);
    setCurrentPos(null);

    if (pattern.length < 4) {
      setError(true);
      setTimeout(() => {
        setPattern([]);
        setError(false);
      }, 1000);
      return;
    }

    if (step === 'DRAW') {
      setFirstPattern(pattern);
      setStep('CONFIRM');
      setTimeout(() => setPattern([]), 500);
    } else if (step === 'CONFIRM') {
      if (pattern.join('-') === firstPattern.join('-')) {
        setSuccess(true);
        setTimeout(() => {
          onSave(pattern.join('-'));
          onClose();
        }, 1000);
      } else {
        setError(true);
        setTimeout(() => {
          setPattern([]);
          setError(false);
        }, 1000);
      }
    }
  };

  const handleReset = () => {
    setStep('DRAW');
    setPattern([]);
    setFirstPattern([]);
    setError(false);
    setSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">
              {readOnly ? 'Padrão Cadastrado' : step === 'DRAW' ? 'Desenhe o Padrão' : 'Confirme o Padrão'}
            </h2>
            <p className="text-sm text-zinc-400">
              {readOnly 
                ? 'Este é o padrão de desbloqueio do aparelho.' 
                : step === 'DRAW' 
                  ? 'Conecte pelo menos 4 pontos.' 
                  : 'Desenhe o mesmo padrão novamente para confirmar.'}
            </p>
          </div>

          <div 
            className="relative w-[280px] h-[280px] mx-auto touch-none"
            ref={containerRef}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          >
            {/* Draw lines between selected dots */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {pattern.map((dot, i) => {
                if (i === 0) return null;
                const prev = getDotPosition(pattern[i - 1]);
                const curr = getDotPosition(dot);
                return (
                  <motion.line
                    key={`line-${i}`}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.2 }}
                    x1={prev.x}
                    y1={prev.y}
                    x2={curr.x}
                    y2={curr.y}
                    stroke={error ? '#EF4444' : success || readOnly ? '#00E676' : '#3B82F6'}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Draw line to current cursor position */}
              {isDrawing && currentPos && pattern.length > 0 && (
                <line
                  x1={getDotPosition(pattern[pattern.length - 1]).x}
                  y1={getDotPosition(pattern[pattern.length - 1]).y}
                  x2={currentPos.x}
                  y2={currentPos.y}
                  stroke={error ? '#EF4444' : '#3B82F6'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity={0.5}
                />
              )}
            </svg>

            {/* Draw dots */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0">
              {dots.map(dot => {
                const isSelected = pattern.includes(dot);
                return (
                  <div key={dot} className="flex items-center justify-center w-full h-full">
                    <div 
                      className={`pattern-dot w-4 h-4 rounded-full transition-all duration-200 ${
                        isSelected 
                          ? error 
                            ? 'bg-red-500 scale-150 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                            : success || readOnly
                              ? 'bg-[#00E676] scale-150 shadow-[0_0_15px_rgba(0,230,118,0.5)]'
                              : 'bg-blue-500 scale-150 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                          : 'bg-zinc-600'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {!readOnly && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <RotateCcw size={16} />
                Tentar novamente
              </button>
            </div>
          )}
          
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm text-center mt-4"
            >
              {pattern.length < 4 ? 'Conecte pelo menos 4 pontos' : 'Padrão incorreto. Tente novamente.'}
            </motion.p>
          )}
          
          {success && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#00E676] text-sm text-center mt-4 flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Padrão confirmado!
            </motion.p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconSize?: number;
}

export default function InfoTooltip({ content, position = 'top', className = '', iconSize = 14 }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const animationProps = {
    top: { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 5 } },
    bottom: { initial: { opacity: 0, y: -5 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -5 } },
    left: { initial: { opacity: 0, x: 5 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 5 } },
    right: { initial: { opacity: 0, x: -5 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -5 } },
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center cursor-help ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)} // For mobile/touch support
    >
      <Info 
        size={iconSize} 
        className="text-zinc-500 hover:text-[#00E676] transition-colors" 
      />

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={animationProps[position].initial}
            animate={animationProps[position].animate}
            exit={animationProps[position].exit}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-[200] w-max max-w-[250px] p-2.5 rounded-xl bg-[#141414] border border-zinc-700/80 shadow-[0_10px_25px_rgba(0,0,0,0.8)] backdrop-blur-xl pointer-events-none ${positionClasses[position]}`}
          >
            <p className="text-[11px] font-medium text-zinc-300 leading-snug whitespace-normal">
              {content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

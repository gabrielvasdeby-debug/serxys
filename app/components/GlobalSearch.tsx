'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  User, 
  Smartphone, 
  History, 
  X, 
  Command,
  ArrowRight,
  Hash,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench,
  Package,
  Inbox,
  LogOut,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabase';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
  onSelectCustomer: (customerId: string) => void;
  companyId: string;
}

const STATUS_CONFIG: Record<string, { icon: any, color: string, bg: string }> = {
  'Entrada': { icon: Inbox, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Orçamento em Elaboração': { icon: History, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  'Em Análise Técnica': { icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'Aguardando Aprovação': { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  'Aguardando Peça': { icon: Package, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  'Em Manutenção': { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'Reparo Concluído': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  'Equipamento Retirado': { icon: LogOut, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
  'Orçamento Cancelado': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  'Sem Reparo': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' }
};

export default function GlobalSearch({ isOpen, onClose, onSelectOrder, onSelectCustomer, companyId }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ orders: any[], customers: any[] }>({ orders: [], customers: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults({ orders: [], customers: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (!query.trim() || query.length < 2) {
        setResults({ orders: [], customers: [] });
        return;
      }

      setIsLoading(true);
      try {
        // Search Orders
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, os_number, status, equipment, customer_id')
          .eq('company_id', companyId)
          .or(`os_number.ilike.%${query}%,equipment->>brand.ilike.%${query}%,equipment->>model.ilike.%${query}%`)
          .limit(5);

        // Search Customers
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, name, document, whatsapp')
          .eq('company_id', companyId)
          .or(`name.ilike.%${query}%,document.ilike.%${query}%,whatsapp.ilike.%${query}%`)
          .limit(5);

        setResults({
          orders: orderData || [],
          customers: customerData || []
        });
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query, companyId]);

  const allResults = [...results.orders.map(o => ({ ...o, type: 'order' })), ...results.customers.map(c => ({ ...c, type: 'customer' }))];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % allResults.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      const item = allResults[selectedIndex];
      if (item.type === 'order') onSelectOrder(item.id);
      else onSelectCustomer(item.id);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-start justify-center sm:pt-[10vh] pt-4 px-2 sm:px-4 md:px-0">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-[#141414] border border-zinc-800 sm:rounded-[28px] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Search Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center gap-3 sm:gap-4 bg-zinc-900/30">
            <Search className={`text-zinc-500 ${isLoading ? 'animate-pulse' : ''}`} size={18} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Pesquisar cliente, OS..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-zinc-600 font-medium text-base sm:text-lg"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-700 border border-zinc-800 px-1.5 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-widest hidden sm:flex">
                <Command size={10} /> K
              </span>
              <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {!query ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-700">
                  <Search size={32} />
                </div>
                <div>
                  <p className="text-zinc-300 font-bold mb-1">O que você está procurando?</p>
                  <p className="text-zinc-500 text-sm">Digite o nome de um cliente ou o número da OS para começar.</p>
                </div>
              </div>
            ) : isLoading && results.orders.length === 0 && results.customers.length === 0 ? (
              <div className="p-12 text-center">
                 <div className="w-8 h-8 border-3 border-[#00E676] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                 <p className="text-zinc-500 text-sm uppercase font-black tracking-widest">Buscando no sistema...</p>
              </div>
            ) : allResults.length > 0 ? (
              <div className="p-2 space-y-4">
                {results.orders.length > 0 && (
                  <div>
                    <h3 className="px-4 py-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Ordens de Serviço</h3>
                    <div className="space-y-1">
                      {results.orders.map((order, idx) => {
                        const status = STATUS_CONFIG[order.status] || STATUS_CONFIG['Entrada'];
                        const isSelected = selectedIndex === idx;
                        return (
                          <button
                            key={order.id}
                            onClick={() => { onSelectOrder(order.id); onClose(); }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full p-3 sm:p-4 flex items-center justify-between rounded-xl sm:rounded-2xl transition-all group ${isSelected ? 'bg-[#00E676]/10 border border-[#00E676]/20' : 'bg-transparent border border-transparent hover:bg-zinc-800/40'}`}
                          >
                            <div className="flex items-center gap-3 sm:gap-4 text-left min-w-0">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#00E676] text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                                <Hash size={20} className="sm:w-6 sm:h-6" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                  <p className="font-black text-white text-base sm:text-lg leading-none">OS {String(order.os_number).padStart(4, '0')}</p>
                                  <span className={`text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 ${status.color} ${status.bg} border border-${status.color}/20`}>
                                     <status.icon size={8} className="sm:w-2.5 sm:h-2.5" />
                                     {order.status}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-zinc-400 group-hover:text-zinc-300 transition-colors truncate">
                                  {order.equipment.brand} {order.equipment.model}
                                </p>
                              </div>
                            </div>
                            <ArrowRight size={18} className={`transition-all shrink-0 ${isSelected ? 'text-[#00E676] translate-x-1' : 'text-zinc-800 opacity-0 group-hover:opacity-100'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {results.customers.length > 0 && (
                  <div>
                    <h3 className="px-4 py-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Clientes</h3>
                    <div className="space-y-1">
                      {results.customers.map((cust, idx) => {
                        const realIdx = results.orders.length + idx;
                        const isSelected = selectedIndex === realIdx;
                        return (
                          <button
                            key={cust.id}
                            onClick={() => { onSelectCustomer(cust.id); onClose(); }}
                            onMouseEnter={() => setSelectedIndex(realIdx)}
                            className={`w-full p-3 sm:p-4 flex items-center justify-between rounded-xl sm:rounded-2xl transition-all group ${isSelected ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-transparent border border-transparent hover:bg-zinc-800/40'}`}
                          >
                            <div className="flex items-center gap-3 sm:gap-4 text-left min-w-0">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-900 text-zinc-500'}`}>
                                <User size={20} className="sm:w-6 sm:h-6" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-white text-base sm:text-lg leading-none mb-0.5 sm:mb-1 truncate">{cust.name}</p>
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                   <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1 whitespace-nowrap">
                                     <Smartphone size={8} className="text-zinc-700 sm:w-2.5 sm:h-2.5" /> {cust.whatsapp}
                                   </p>
                                   <span className="w-1 h-1 bg-zinc-800 rounded-full hidden sm:block" />
                                   <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-black tracking-widest truncate">
                                     {cust.document || 'Sem Documento'}
                                   </p>
                                </div>
                              </div>
                            </div>
                            <ArrowRight size={18} className={`transition-all shrink-0 ${isSelected ? 'text-blue-400 translate-x-1' : 'text-zinc-800 opacity-0 group-hover:opacity-100'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : query && (
              <div className="p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-800">
                  <XCircle size={32} />
                </div>
                <div>
                  <p className="text-white font-black text-lg mb-1">Nenhum resultado encontrado</p>
                  <p className="text-zinc-600 text-sm">Tente pesquisar por outros termos ou verifique se digitou corretamente.</p>
                </div>
              </div>
            )}
          </div>

          {/* Tips Footer */}
          <div className="p-4 bg-black/40 border-t border-zinc-800 items-center justify-center gap-8 hidden sm:flex">
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-zinc-700 border border-zinc-900 px-1 rounded bg-zinc-950">ESC</span>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Fechar</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                   <span className="text-[9px] font-black text-zinc-700 border border-zinc-900 px-1 rounded bg-zinc-950">↑</span>
                   <span className="text-[9px] font-black text-zinc-700 border border-zinc-900 px-1 rounded bg-zinc-950">↓</span>
                </div>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Navegar</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-zinc-700 border border-zinc-900 px-1 rounded bg-zinc-950">ENTER</span>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Selecionar</span>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

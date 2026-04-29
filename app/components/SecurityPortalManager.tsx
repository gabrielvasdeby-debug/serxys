
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { Order, CompanySettings } from '@/app/types';
import { 
  Shield, 
  RefreshCw, 
  Calendar, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  KeyRound,
  Lock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SecurityPortalManagerProps {
  order: Order;
  companySettings: CompanySettings;
  onUpdate: (updatedOrder: Partial<Order>) => void;
}

export default function SecurityPortalManager({ order, companySettings, onUpdate }: SecurityPortalManagerProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingExpiry, setIsUpdatingExpiry] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryDate, setExpiryDate] = useState(order.publicExpiresAt ? new Date(order.publicExpiresAt).toISOString().slice(0, 16) : '');
  
  const publicUrl = `${window.location.origin}/${companySettings.publicSlug}/${order.osNumber}`;
  // Or if using the UUID route directly:
  const directPublicUrl = `${window.location.origin}/os/${order.public_id}`;

  const isExpired = order.publicExpiresAt && new Date(order.publicExpiresAt) < new Date();
  const isCloseToExpire = order.publicExpiresAt && !isExpired && 
    (new Date(order.publicExpiresAt).getTime() - new Date().getTime()) < 24 * 60 * 60 * 1000;

  const handleRegenerate = async () => {
    if (!confirm('Deseja realmente regerar o link? O link anterior deixará de funcionar imediatamente.')) return;
    
    setIsRegenerating(true);
    try {
      const newPublicId = crypto.randomUUID();
      const { error } = await supabase
        .from('orders')
        .update({ public_id: newPublicId })
        .eq('id', order.id);

      if (error) throw error;
      
      onUpdate({ public_id: newPublicId });
      alert('Link público regerado com sucesso!');
    } catch (err: any) {
      console.error('Error regenerating link:', err.message || err);
      alert('Erro ao regerar link. Verifique os logs.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleUpdateExpiry = async (date: string) => {
    setIsUpdatingExpiry(true);
    try {
      const newDate = date ? new Date(date).toISOString() : null;
      const { error } = await supabase
        .from('orders')
        .update({ public_expires_at: newDate })
        .eq('id', order.id);

      if (error) throw error;
      onUpdate({ publicExpiresAt: newDate || undefined });
    } catch (err) {
      console.error('Error updating expiry:', err);
      alert('Erro ao atualizar expiração.');
    } finally {
      setIsUpdatingExpiry(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(directPublicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="bg-[#0A0A0A] border-y sm:border border-zinc-800 rounded-none sm:rounded-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between bg-[#0A0A0A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-[#141414] border border-zinc-800 flex items-center justify-center text-[#00E676]">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Portal de Segurança</h3>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Gestão de acesso público</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isExpired ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Expirado</span>
            </span>
          ) : isCloseToExpire ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Expira Breve</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#00E676]/10 border border-[#00E676]/20 rounded-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
              <span className="text-[9px] font-black text-[#00E676] uppercase tracking-widest">Link Ativo</span>
            </span>
          ) }
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Link Display */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-0.5">Link de Rastreio Público</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 h-12 bg-[#141414] border border-zinc-800 rounded-sm px-4 flex items-center overflow-hidden">
              <p className="text-[11px] font-mono text-zinc-400 truncate">{directPublicUrl}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={copyToClipboard}
                className="flex-1 sm:w-12 h-12 bg-[#141414] hover:bg-zinc-800 border border-zinc-800 rounded-sm flex items-center justify-center transition-all active:scale-95 group gap-2 sm:gap-0"
              >
                {copied ? <Check size={18} className="text-[#00E676]" /> : <Copy size={18} className="text-zinc-500 group-hover:text-white" />}
                <span className="sm:hidden text-[10px] font-black uppercase text-zinc-400">Copiar</span>
              </button>
              <a 
                href={directPublicUrl} 
                target="_blank" 
                className="flex-1 sm:w-12 h-12 bg-[#141414] hover:bg-[#00E676]/10 border border-zinc-800 rounded-sm flex items-center justify-center transition-all active:scale-95 group gap-2 sm:gap-0"
              >
                <ExternalLink size={18} className="text-zinc-500 group-hover:text-[#00E676]" />
                <span className="sm:hidden text-[10px] font-black uppercase text-zinc-400">Abrir</span>
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expiry Date */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-0.5 flex items-center gap-1.5">
              <Clock size={12} className="text-blue-400" /> Expiração do Link
            </label>
            <div className="relative">
              <input 
                type="datetime-local" 
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  handleUpdateExpiry(e.target.value);
                }}
                className="w-full h-12 bg-[#141414] border border-zinc-800 rounded-sm px-4 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
              />
              {isUpdatingExpiry && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 size={14} className="animate-spin text-[#00E676]" />
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setExpiryDate('');
                handleUpdateExpiry('');
              }}
              className="text-[9px] font-black text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors ml-0.5 flex items-center gap-1.5"
            >
              <RefreshCw size={10} /> Remover prazo de expiração
            </button>
          </div>

          {/* Regenerate Action */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-0.5 flex items-center gap-1.5">
              <Lock size={12} className="text-red-400" /> Ação Crítica
            </label>
            <button 
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="w-full h-12 bg-[#141414] hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 rounded-sm px-4 flex items-center justify-center gap-3 transition-all group disabled:opacity-50"
            >
              {isRegenerating ? <Loader2 size={16} className="animate-spin text-red-500" /> : <RefreshCw size={16} className="text-zinc-600 group-hover:text-red-500 transition-colors" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-red-500 transition-colors">Regerar Token Público</span>
            </button>
            <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-tight ml-0.5 leading-relaxed">
              * O link anterior será invalidado imediatamente.
            </p>
          </div>
        </div>

        {/* Tip Section */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-sm flex items-start gap-3">
          <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed tracking-tight">
            Links com expiração aumentam a segurança da sua assistência. Recomendamos definir um prazo de <span className="text-blue-400">7 a 15 dias</span> para cada OS.
          </p>
        </div>
      </div>
    </div>
  );

}

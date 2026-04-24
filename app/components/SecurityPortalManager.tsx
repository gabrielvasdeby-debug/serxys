
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
    <div className="bg-[#0A0A0A] border border-zinc-900 rounded-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Shield size={16} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white">Portal de Segurança</h3>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Gestão de acesso público à OS</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isExpired ? (
            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Expirado</span>
            </span>
          ) : isCloseToExpire ? (
            <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Expira em breve</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Link Ativo</span>
            </span>
          ) }
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Link Display */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Link de Rastreio Público</label>
          <div className="flex gap-2">
            <div className="flex-1 h-12 bg-black border border-white/5 rounded-md px-4 flex items-center overflow-hidden">
              <p className="text-[10px] font-mono text-zinc-400 truncate">{directPublicUrl}</p>
            </div>
            <button 
              onClick={copyToClipboard}
              className="w-12 h-12 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-md flex items-center justify-center transition-all active:scale-95 group"
            >
              {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} className="text-zinc-500 group-hover:text-white" />}
            </button>
            <a 
              href={directPublicUrl} 
              target="_blank" 
              className="w-12 h-12 bg-zinc-900 hover:bg-emerald-500/20 border border-white/5 rounded-md flex items-center justify-center transition-all active:scale-95 group"
            >
              <ExternalLink size={18} className="text-zinc-500 group-hover:text-emerald-500" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expiry Date */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-1.5">
              <Clock size={10} /> Expiração do Link
            </label>
            <div className="relative">
              <input 
                type="datetime-local" 
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  handleUpdateExpiry(e.target.value);
                }}
                className="w-full h-12 bg-black border border-white/5 rounded-md px-4 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              {isUpdatingExpiry && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 size={12} className="animate-spin text-emerald-500" />
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setExpiryDate('');
                handleUpdateExpiry('');
              }}
              className="text-[8px] font-black text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors ml-1"
            >
              Remover prazo de expiração
            </button>
          </div>

          {/* Regenerate Action */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-1.5">
              <Lock size={10} /> Ação Crítica
            </label>
            <button 
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="w-full h-12 bg-zinc-900/50 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 rounded-md px-4 flex items-center justify-center gap-3 transition-all group disabled:opacity-50"
            >
              {isRegenerating ? <Loader2 size={16} className="animate-spin text-red-500" /> : <RefreshCw size={16} className="text-zinc-500 group-hover:text-red-500 transition-colors" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-red-500 transition-colors">Regerar Token Público</span>
            </button>
            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest ml-1 leading-relaxed">
              O link anterior será invalidado permanentemente.
            </p>
          </div>
        </div>

        {/* Tip Section */}
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-md flex items-start gap-3">
          <AlertCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[9px] text-emerald-500/80 font-bold uppercase leading-relaxed tracking-tight">
            Links com expiração aumentam a segurança da sua assistência. Recomendamos definir um prazo de 7 a 15 dias para cada OS.
          </p>
        </div>
      </div>
    </div>
  );
}

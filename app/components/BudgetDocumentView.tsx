'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Smartphone, AlertTriangle, Wrench, DollarSign, FileText,
  CheckCircle2, X, XCircle, Image as ImageIcon, Check, ShieldCheck, Phone,
  Mail, MapPin, Signature as SignatureIcon, Calendar, Hash, ZoomIn, ChevronLeft, ChevronRight
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { QRCodeSVG } from 'qrcode.react';
import { Order, CompanySettings } from '../types';

interface BudgetDocumentViewProps {
  order: Order;
  customer: any;
  companySettings: CompanySettings;
  onApprove: (signature: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const WhatsappIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} stroke="none">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

export default function BudgetDocumentView({
  order, customer, companySettings, onApprove, onReject, isSubmitting
}: BudgetDocumentViewProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [showSigPad, setShowSigPad] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const budget = order.budget;
  const budgetTotal = budget?.totalValue || 0;
  const items = budget?.items || [];
  const photos = budget?.photos || [];
  const isApproved = budget?.status === 'Aprovado';
  const isRejected = budget?.status === 'Recusado';
  const [trackingUrl, setTrackingUrl] = useState('');
  
  useEffect(() => {
    setTrackingUrl(typeof window !== 'undefined' ? window.location.href : '');
  }, []);
  const osNumber = (order.osNumber || 0).toString().padStart(4, '0');

  const handleConfirmSign = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('Por favor, desenhe sua assinatura para confirmar.');
      return;
    }
    const sig = sigCanvas.current!.getCanvas().toDataURL('image/png');
    setShowSigPad(false);
    await onApprove(sig);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxPhoto(photos[index]);
  };

  return (
    <>
      <motion.div
        id="budget-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full relative"
      >
      {/* Documento Principal */}
      <div className="bg-white text-slate-800 rounded-sm shadow-2xl overflow-hidden border border-zinc-200">

        {/* === CABEÇALHO === */}
        <div className="bg-[#1A2535] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-auto max-w-[240px] h-20 flex items-center justify-start shrink-0 pr-4 overflow-hidden">
              {companySettings?.logoUrl ? (
                <img src={companySettings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain object-left" />
              ) : (
                <div className="w-16 h-16 bg-[#00E676] rounded-sm flex items-center justify-center text-black font-black text-2xl flex-shrink-0">
                  {(companySettings?.name || 'SY').substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-black text-lg tracking-tight uppercase">{companySettings?.name || 'Assistência Técnica'}</p>
              <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-0.5">
                {companySettings?.cnpj && <span>CNPJ: {companySettings.cnpj}</span>}
                {companySettings?.phone && (
                  <span className="flex items-center gap-1"><Phone size={9} />{companySettings.phone}</span>
                )}
                {companySettings?.whatsapp && (
                  <span className="flex items-center gap-1"><WhatsappIcon size={9} />{companySettings.whatsapp}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <QRCodeSVG value={trackingUrl} size={48} level="M" bgColor="transparent" fgColor="white" />
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Acompanhar OS</p>
          </div>
        </div>

        {/* Título do Documento */}
        <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-[11px] font-black text-[#1A2535] uppercase tracking-[0.25em]">Proposta de Orçamento</h2>
            <p className="text-[9px] text-slate-500 font-medium">Documento oficial aguardando sua aprovação</p>
          </div>
          <div className="flex items-center gap-4 text-[9px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <Hash size={10} className="text-slate-400" />
              <span className="font-black text-[#1A2535]">OS {osNumber}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={10} className="text-slate-400" />
              <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            {isApproved && (
              <span className="bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-sm text-[8px] uppercase tracking-wider border border-emerald-200">
                ✓ Aprovado
              </span>
            )}
            {isRejected && (
              <span className="bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-sm text-[8px] uppercase tracking-wider border border-red-200">
                ✗ Recusado
              </span>
            )}
            {!isApproved && !isRejected && (
              <span className="bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-sm text-[8px] uppercase tracking-wider border border-amber-200 animate-pulse">
                ⏳ Aguardando
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* === DADOS DO CLIENTE === */}
          <section>
            <div className="bg-[#1A2535] text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-t-sm flex items-center gap-2">
              <User size={12} />
              Dados do Cliente
            </div>
            <div className="border border-slate-200 border-t-0 rounded-b-sm overflow-hidden">
              <div className="grid grid-cols-12 divide-x divide-y divide-slate-200 text-[9px]">
                <div className="col-span-6 p-2 flex flex-col gap-0.5">
                  <span className="text-slate-400 font-bold uppercase">Nome</span>
                  <span className="font-black text-slate-800 text-[10px]">{customer?.name || '—'}</span>
                </div>
                <div className="col-span-3 p-2 flex flex-col gap-0.5">
                  <span className="text-slate-400 font-bold uppercase">Telefone</span>
                  <span className="font-bold text-slate-700">{customer?.whatsapp || customer?.phone || '—'}</span>
                </div>
                <div className="col-span-3 p-2 flex flex-col gap-0.5">
                  <span className="text-slate-400 font-bold uppercase">E-mail</span>
                  <span className="font-bold text-slate-700 truncate">{customer?.email || '—'}</span>
                </div>
                {customer?.document && (
                  <div className="col-span-3 p-2 flex flex-col gap-0.5">
                    <span className="text-slate-400 font-bold uppercase">CPF/CNPJ</span>
                    <span className="font-bold text-slate-700">{customer.document}</span>
                  </div>
                )}
                {customer?.address?.street && (
                  <div className={`${customer?.document ? 'col-span-9' : 'col-span-12'} p-2 flex flex-col gap-0.5`}>
                    <span className="text-slate-400 font-bold uppercase flex items-center gap-1"><MapPin size={8} />Endereço</span>
                    <span className="font-bold text-slate-700">
                      {customer.address.street}, {customer.address.number || 'S/N'}
                      {customer.address.neighborhood ? ` — ${customer.address.neighborhood}` : ''}
                      {customer.address.city ? ` — ${customer.address.city}/${customer.address.state}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* === DADOS DO EQUIPAMENTO === */}
          <section>
            <div className="bg-[#1A2535] text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-t-sm flex items-center gap-2">
              <Smartphone size={12} />
              Equipamento
            </div>
            <div className="border border-slate-200 border-t-0 rounded-b-sm overflow-hidden">
              <table className="w-full text-[9px] text-center">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2 border-r border-slate-200">Tipo</th>
                    <th className="py-1.5 px-2 border-r border-slate-200">Marca</th>
                    <th className="py-1.5 px-2 border-r border-slate-200">Modelo</th>
                    <th className="py-1.5 px-2 border-r border-slate-200">Cor</th>
                    <th className="py-1.5 px-2">IMEI / Série</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white text-slate-800 font-bold">
                    <td className="py-2 px-2 border-r border-slate-100">{order.equipment.type || '—'}</td>
                    <td className="py-2 px-2 border-r border-slate-100">{order.equipment.brand}</td>
                    <td className="py-2 px-2 border-r border-slate-100">{order.equipment.model}</td>
                    <td className="py-2 px-2 border-r border-slate-100">{order.equipment.color || '—'}</td>
                    <td className="py-2 px-2 font-black text-[#1A2535]">{order.equipment.serial || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* === DIAGNÓSTICO E SERVIÇO PROPOSTO === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section>
              <div className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-t-sm flex items-center gap-2">
                <AlertTriangle size={12} />
                Diagnóstico Técnico
              </div>
              <div className="border border-slate-200 border-t-0 rounded-b-sm p-3 bg-amber-50 min-h-[60px]">
                <p className="text-[10px] text-slate-700 leading-relaxed italic">
                  "{budget?.detailedDefect || order.defect || 'Problema técnico identificado no equipamento.'}"
                </p>
              </div>
            </section>
            <section>
              <div className="bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-t-sm flex items-center gap-2">
                <Wrench size={12} />
                Serviço Proposto
              </div>
              <div className="border border-slate-200 border-t-0 rounded-b-sm p-3 bg-blue-50 min-h-[60px]">
                <p className="text-[10px] font-black text-slate-800 leading-relaxed">
                  {budget?.requiredService || order.service || 'Manutenção corretiva'}
                </p>
                {budget?.serviceNotes && (
                  <p className="text-[9px] text-slate-500 mt-1 italic">Obs: {budget.serviceNotes}</p>
                )}
              </div>
            </section>
          </div>

          {/* === FOTOS === */}
          {photos.length > 0 && (
            <section>
              <div className="bg-[#1A2535] text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-t-sm flex items-center gap-2">
                <ImageIcon size={12} />
                Evidências Fotográficas ({photos.length} foto{photos.length > 1 ? 's' : ''})
              </div>
              <div className="border border-slate-200 border-t-0 rounded-b-sm p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => openLightbox(i)}
                      className="aspect-video bg-slate-100 rounded-sm overflow-hidden relative group border border-slate-200 hover:border-slate-400 transition-colors"
                    >
                      <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* === TABELA DE PREÇOS === */}
          <section>
            <div className="bg-[#1A2535] text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-t-sm flex items-center gap-2">
              <DollarSign size={12} />
              Composição de Preços
            </div>
            <div className="border border-slate-200 border-t-0 rounded-b-sm overflow-hidden">
              {items.length > 0 ? (
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[9px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left">Descrição</th>
                      <th className="py-2 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2 px-3 font-medium text-slate-700 capitalize">{item.description}</td>
                        <td className="py-2 px-3 text-right font-black text-slate-800">{formatBRL(Number(item.price) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#1A2535] text-white">
                      <td className="py-3 px-3 font-black text-[11px] uppercase tracking-wider">Total do Orçamento</td>
                      <td className="py-3 px-3 text-right font-black text-[16px] text-[#00E676]">{formatBRL(budgetTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-50 to-white">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valor Total</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Pagamento após conclusão do serviço</p>
                  </div>
                  <p className="text-3xl font-black text-[#1A2535]">{formatBRL(budgetTotal)}</p>
                </div>
              )}
            </div>
          </section>

          {/* === ESTADO: APROVADO === */}
          {isApproved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-2 border-emerald-500 rounded-sm p-5 md:p-6 bg-emerald-50 flex flex-col md:flex-row items-center justify-center md:items-start gap-4 md:gap-6"
            >
              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                <Check size={28} strokeWidth={3} className="text-white" />
              </div>
              <div className="w-full grow text-center md:text-left min-w-0">
                <h4 className="text-lg font-black text-emerald-700 uppercase tracking-tight break-words">Orçamento Aprovado!</h4>
                <p className="text-sm text-slate-600 mt-1 break-words">
                  Aprovado em {budget?.approvalDate ? new Date(budget.approvalDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1 break-words">Seu equipamento já está na fila de manutenção. Você será notificado quando o reparo for concluído.</p>
              </div>
                {budget?.clientSignature && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Assinatura</p>
                    <img src={budget.clientSignature} alt="Assinatura" className="h-16 w-48 object-contain bg-white rounded-sm p-1 border border-slate-200 shadow-sm mix-blend-multiply shrink-0" />
                  </div>
                )}
            </motion.div>
          )}

          {/* === ESTADO: RECUSADO === */}
          {isRejected && (
            <div className="border-2 border-red-300 rounded-sm p-6 bg-red-50 text-center space-y-2">
              <X size={32} className="text-red-500 mx-auto" />
              <h4 className="font-black text-red-700 uppercase">Orçamento Recusado</h4>
              <p className="text-sm text-slate-500">Entre em contato com a assistência para mais informações.</p>
            </div>
          )}

          {/* === AÇÕES DE APROVAÇÃO === */}
          {!isApproved && !isRejected && (
            <div className="pt-2 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-[10px] text-amber-800 leading-relaxed">
                <p className="font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Termos de Autorização
                </p>
                <p>Ao assinar e aprovar este orçamento, você autoriza a execução dos serviços descritos acima pelo valor indicado, concordando com os termos e condições de manutenção da empresa.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isSubmitting}
                  className="col-span-1 py-4 border-2 border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  Recusar Orçamento
                </button>
                <button
                  onClick={() => setShowSigPad(true)}
                  disabled={isSubmitting}
                  className="col-span-2 py-4 bg-[#1A2535] hover:bg-[#2B3B4E] text-white rounded-sm font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                >
                  <SignatureIcon size={18} />
                  Assinar e Autorizar o Reparo
                </button>
              </div>
            </div>
          )}

          {/* Rodapé do documento */}
          <div className="pt-2 border-t border-slate-200 text-center text-[8px] text-slate-400 font-medium tracking-widest">
            {companySettings?.name} — Proposta de orçamento emitida em {new Date().toLocaleDateString('pt-BR')} • Documento digital gerado pelo sistema Servyx
          </div>
        </div>
      </div>
      </motion.div>

      {/* === MODAL DE ASSINATURA === */}
      <AnimatePresence>
        {showSigPad && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setShowSigPad(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative bg-[#111111] border border-zinc-800 w-full max-w-2xl rounded-sm p-6 md:p-8 shadow-3xl z-10"
            >
              <button
                onClick={() => setShowSigPad(false)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#1A2535] rounded-sm flex items-center justify-center mx-auto mb-3">
                  <SignatureIcon size={24} className="text-[#00E676]" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Assine para Confirmar</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Use o dedo ou mouse para assinar abaixo. Ao confirmar, o orçamento de{' '}
                  <span className="text-[#00E676] font-black">{formatBRL(budgetTotal)}</span> será aprovado.
                </p>
              </div>

              <div className="bg-white rounded-sm overflow-hidden border-2 border-zinc-700 shadow-inner">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="#1A2535"
                  minWidth={2}
                  maxWidth={4}
                  canvasProps={{ className: 'w-full h-52 md:h-64 cursor-crosshair' }}
                />
              </div>
              <p className="text-center text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-2">Assine no campo acima</p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  onClick={() => sigCanvas.current?.clear()}
                  className="py-3.5 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Limpar
                </button>
                <button
                  onClick={handleConfirmSign}
                  disabled={isSubmitting}
                  className="py-3.5 bg-[#00E676] hover:bg-[#00C853] text-black rounded-sm font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00E676]/20 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Processando...</span>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={3} />
                      Confirmar Aprovação
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === MODAL DE RECUSA === */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 perspective-1000">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowRejectModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="relative bg-zinc-900 border-t md:border border-zinc-800 w-full max-w-lg md:rounded-2xl rounded-t-3xl shadow-2xl z-20 flex flex-col max-h-[90vh]"
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mt-3 mb-2 md:hidden" />
              
              <button
                onClick={() => setShowRejectModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors hidden md:block"
              >
                <X size={18} />
              </button>

              <div className="p-6 overflow-y-auto custom-scrollbar-hide">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-inner">
                    <XCircle size={32} strokeWidth={1.5} className="text-red-500" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Recusar Orçamento</h3>
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                    Poderia nos informar brevemente o motivo da recusa? Isso nos ajuda a melhorar! (Opcional)
                  </p>
                </div>

                <div className="space-y-4">
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ex: Valor acima do esperado, não farei o serviço agora..."
                    className="w-full h-28 bg-[#050505] border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-red-500/50 transition-colors resize-none placeholder:text-zinc-600 shadow-inner block"
                  />
                  
                  <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="w-full py-4 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all"
                    >
                      Voltar ao Orçamento
                    </button>
                    <button
                      onClick={async () => {
                        await onReject(rejectionReason);
                        setShowRejectModal(false);
                      }}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                    >
                      {isSubmitting ? 'Processando...' : 'Confirmar Recusa'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lightboxPhoto && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95"
              onClick={() => setLightboxPhoto(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 max-w-4xl w-full"
            >
              <img src={lightboxPhoto} alt="Evidência" className="w-full max-h-[80vh] object-contain rounded-sm shadow-2xl" />
              <button
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-3 right-3 p-2 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
              >
                <X size={20} />
              </button>
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => { const prev = (lightboxIndex - 1 + photos.length) % photos.length; setLightboxIndex(prev); setLightboxPhoto(photos[prev]); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => { const next = (lightboxIndex + 1) % photos.length; setLightboxIndex(next); setLightboxPhoto(photos[next]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <p className="text-center text-white text-sm mt-3 font-bold opacity-70">
                    {lightboxIndex + 1} / {photos.length}
                  </p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

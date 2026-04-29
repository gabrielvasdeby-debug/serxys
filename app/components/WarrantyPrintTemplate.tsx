'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, Smartphone, AlertTriangle, Wrench, ShieldCheck, Calendar, FileText, Phone, Mail } from 'lucide-react';
import { Order } from '../types';

interface WarrantyPrintTemplateProps {
  order: Order;
  customer: any;
  companySettings: {
    name: string;
    cnpj: string;
    whatsapp: string;
    phone: string;
    email: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    logoUrl: string;
    publicSlug: string;
    complement?: string;
  };
  osSettings?: {
    warrantyTerms?: string;
  };
  isPreview?: boolean;
}

const BlockHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <div className="bg-[#2B323D] text-white font-bold text-[10px] uppercase px-3 py-1.5 flex items-center gap-2 rounded-t-lg">
    <Icon size={12} className="text-white" />
    {title}
  </div>
);

const WhatsappIcon = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} stroke="none">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const A4_WIDTH_PX = 794;

export default function WarrantyPrintTemplate({ order, customer, companySettings, osSettings, isPreview }: WarrantyPrintTemplateProps) {
  const [scale, setScale] = useState(1);
  const [docHeight, setDocHeight] = useState<number | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPreview) return;
    const updateScale = () => {
      const availableWidth = window.innerWidth < 640 ? window.innerWidth - 32 : window.innerWidth - 80;
      const newScale = availableWidth < A4_WIDTH_PX ? availableWidth / A4_WIDTH_PX : 1;
      setScale(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isPreview]);

  useEffect(() => {
    if (!isPreview || !docRef.current) return;
    const observer = new ResizeObserver(() => {
      if (docRef.current) setDocHeight(docRef.current.scrollHeight);
    });
    observer.observe(docRef.current);
    setDocHeight(docRef.current.scrollHeight);
    return () => observer.disconnect();
  }, [isPreview]);

  if (!order || !customer) return null;

  const compData = order.completionData;
  const rawStartDate = compData?.warrantyStartDate || order.updatedAt || order.createdAt || new Date().toISOString();
  const warrantyStartDate = new Date(rawStartDate).toLocaleDateString('pt-BR');
  
  let warrantyEndDate = '';
  if (compData?.warrantyEndDate) {
    warrantyEndDate = new Date(compData.warrantyEndDate).toLocaleDateString('pt-BR');
  } else if (compData?.warrantyDays) {
    const end = new Date(rawStartDate);
    end.setDate(end.getDate() + compData.warrantyDays);
    warrantyEndDate = end.toLocaleDateString('pt-BR');
  } else {
    // Default 90 days if not specified
    const end = new Date(rawStartDate);
    end.setDate(end.getDate() + 90);
    warrantyEndDate = end.toLocaleDateString('pt-BR');
  }

  const warrantyMonths = compData?.warrantyMonths || (compData?.warrantyDays ? Math.floor(compData.warrantyDays / 30) : 3);

  // Tracking URL for QR Code
  const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/${companySettings?.publicSlug}/${order.id || order.osNumber}` : '';

  return (
    <div className="print-warranty-content bg-white text-slate-800 p-0 m-0 font-sans leading-tight w-full print-exact-colors print:block print:overflow-visible" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      {/* Viewer: clips overflow, sets height to post-scale height */}
      <div
        className={`${isPreview ? 'w-full overflow-hidden' : ''}`}
        style={isPreview && scale < 1 && docHeight ? { height: `${docHeight * scale}px` } : {}}
      >
        {/* A4 document scaled to fit screen width, centered */}
        <div
          ref={docRef}
          className="w-[794px] p-[5mm] min-h-[260mm] flex flex-col box-border bg-white print:shadow-none"
          style={isPreview && scale < 1 ? {
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            marginLeft: `calc(50% - 397px)`,
          } : { margin: '0 auto' }}
        >
        {/* CABEÇALHO PADRÃO OS */}
        <header className="flex flex-col mb-1.5">
          <div className="flex justify-between items-center mb-2 pl-2">
            <div className="flex items-center gap-3">
              <div className="w-auto max-w-[240px] h-16 flex items-center justify-start shrink-0 pr-4 overflow-hidden">
                {companySettings?.logoUrl ? (
                  <img src={companySettings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain object-left" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[#2B323D] flex items-center justify-center shrink-0 text-white font-black text-2xl w-full">
                    {(companySettings?.name || 'SY').substring(0,2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="h-12 w-px bg-slate-300"></div>
              <div className="text-[9px] text-slate-700 leading-[1.4] font-medium tracking-wide">
                <p className="font-black text-[13px] text-slate-900 mb-[1px] tracking-tight uppercase">{companySettings?.name || 'Servyx'}</p>
                <p>CNPJ: {companySettings?.cnpj || '---'}</p>
                <p>{companySettings?.street || '---'}, {companySettings?.number || 'S/N'}{companySettings?.complement ? ` - ${companySettings.complement}` : ''} - {companySettings?.neighborhood || '---'}</p>
                <p>{companySettings?.city || '---'} - {companySettings?.state || '---'} | CEP: {companySettings?.zipCode || '---'}</p>
                <div className="flex items-center gap-2 mt-[1px]">
                  {companySettings?.phone && <div className="flex items-center gap-1"><Phone size={9} className="text-slate-500" /><span>{companySettings.phone}</span></div>}
                  {companySettings?.whatsapp && <div className="flex items-center gap-1"><WhatsappIcon size={9} className="text-[#25D366]" /><span>{companySettings.whatsapp}</span></div>}
                  {companySettings?.email && <div className="flex items-center gap-1"><Mail size={9} className="text-slate-500" /><span>{companySettings.email}</span></div>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end pr-1 gap-2 border border-slate-200 p-2 rounded-lg bg-slate-50">
                <div className="flex flex-col items-end">
                   <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-widest pl-2">Portal do Cliente</span>
                   <span className="text-[8px] font-bold text-slate-800">Acesse online</span>
                </div>
                <QRCodeSVG value={trackingUrl} size={42} level="M" />
            </div>
          </div>
          <div className="w-full h-px bg-slate-300 mb-1" />
          <div className="flex justify-between items-end mb-1 px-1">
             <h2 className="text-[15px] font-black text-[#2B323D] uppercase tracking-widest leading-none mb-1">CERTIFICADO DE GARANTIA</h2>
             <div className="flex flex-col items-end min-w-[240px]">
               <div className="flex items-center justify-end w-full mb-1 px-1 gap-4">
                 <div className="flex items-center gap-2">
                   <span className="text-[9px] font-bold text-[#2B323D] uppercase tracking-widest">GARANTIA OS</span>
                   <span className="text-[9px] font-black text-red-600">OS {order.osNumber.toString().padStart(4, '0')}</span>
                 </div>
               </div>
               <div className="w-full border-t border-slate-300 pt-1 text-[8px] font-medium text-slate-800 flex justify-between gap-4 px-1">
                 <span>Emitido: {new Date().toLocaleDateString('pt-BR')}</span>
                 <span>Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
             </div>
          </div>
        </header>

        <div className="w-full h-px bg-slate-200 mb-3" />

        {/* CLIENTE */}
        <div className="border border-slate-300 rounded-lg mb-2 flex flex-col overflow-hidden">
          <BlockHeader icon={User} title="DADOS DO CLIENTE / PROPRIETÁRIO" />
          <div className="grid grid-cols-12 divide-x divide-y divide-slate-300 text-[8.5px] bg-white">
             <div className="col-span-6 p-1.5 flex flex-col"><span className="text-slate-500 mb-0.5 text-[7.5px]">Nome:</span><span className="font-bold text-[#2B323D] text-[9.5px]">{customer.name}</span></div>
             <div className="col-span-3 p-1.5 flex flex-col justify-center"><span className="text-slate-500 mb-0.5 text-[7.5px]">Telefone:</span><span className="font-bold text-[#2B323D] text-[9.5px]">{customer.whatsapp || customer.phone || '---'}</span></div>
             <div className="col-span-3 p-1.5 flex flex-col justify-center"><span className="text-slate-500 mb-0.5 text-[7.5px]">E-mail:</span><span className="font-bold text-[#2B323D] text-[9.5px] truncate">{customer.email || '—'}</span></div>
             <div className="col-span-9 p-1.5 flex flex-col"><span className="text-slate-500 mb-0.5 text-[7.5px]">Endereço:</span><span className="font-bold text-[#2B323D] text-[9px]">{customer.address?.street ? `${customer.address.street}, ${customer.address.number || 'S/N'} - ${customer.address.neighborhood} - ${customer.address.city}/${customer.address.state}` : '—'}</span></div>
             <div className="col-span-3 p-1.5 flex flex-col justify-center"><span className="text-slate-500 mb-0.5 text-[7.5px]">CPF / CNPJ:</span><span className="font-bold text-[#2B323D] text-[9.5px]">{customer.document || '—'}</span></div>
          </div>
        </div>

        {/* EQUIPAMENTO */}
        <div className="border border-slate-300 rounded-lg mb-2 flex flex-col overflow-hidden">
          <BlockHeader icon={Smartphone} title="ESPECIFICAÇÕES DO EQUIPAMENTO" />
          <table className="w-full text-center text-[9px] bg-white">
            <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300 text-[8px]">
              <tr><th className="py-1.5 border-r border-slate-300">Tipo</th><th className="py-1.5 border-r border-slate-300">Marca</th><th className="py-1.5 border-r border-slate-300">Modelo</th><th className="py-1.5 border-r border-slate-300">Cor / Detalhe</th><th className="py-1.5">Série / IMEI</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1.5 border-r border-slate-300">{order.equipment.type}</td>
                <td className="py-1.5 border-r border-slate-300">{order.equipment.brand}</td>
                <td className="py-1.5 border-r border-slate-300">{order.equipment.model}</td>
                <td className="py-1.5 border-r border-slate-300">{order.equipment.color || '—'}</td>
                <td className="py-1.5 font-bold uppercase">{order.equipment.serial || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* COTAÇÃO DE TEMPO ENVOLVIDOS */}
        <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden">
               <BlockHeader icon={ShieldCheck} title="NATUREZA DOS SERVIÇOS EXECUTADOS" />
               <div className="p-2 text-[9.5px] bg-white min-h-[60px]">
                 <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-medium mb-3">
                     {compData?.servicesPerformed || order.service || 'Manutenção técnica especializada realizada e homologada.'}
                 </div>
                 {order.productsUsed && order.productsUsed.length > 0 && (
                     <div className="border-t border-slate-100 pt-2">
                          <p className="text-[8px] font-black uppercase text-slate-400 italic mb-1">Componentes Revezados / Substituídos:</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                             {order.productsUsed.map((p, i) => (
                                 <li key={i} className="text-[9px] font-bold text-slate-700">
                                     {p.quantity}x {p.name}
                                 </li>
                             ))}
                          </ul>
                     </div>
                 )}
               </div>
            </div>

            <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden">
               <BlockHeader icon={Calendar} title="PRAZOS DE COBERTURA DA GARANTIA" />
               <div className="p-2 bg-white flex-1 flex flex-col justify-center">
                   <div className="grid grid-cols-1 divide-y divide-slate-100">
                       <div className="flex justify-between py-2 items-center">
                           <span className="text-[8.5px] font-bold text-slate-500 uppercase">Data de Início da Cobertura:</span>
                           <span className="font-bold text-[10px] text-slate-900">{warrantyStartDate}</span>
                       </div>
                       <div className="flex justify-between py-2 items-center">
                           <span className="text-[8.5px] font-bold text-slate-500 uppercase">Período de Validade:</span>
                           <span className="font-bold text-[10px] bg-[#2B323D] text-white px-2 py-0.5 rounded-sm">{warrantyMonths} Meses</span>
                       </div>
                       <div className="flex justify-between py-2 items-center">
                           <span className="text-[8.5px] font-bold text-emerald-600 uppercase">Vencimento da Garantia:</span>
                           <span className="font-black text-[11px] text-emerald-700">{warrantyEndDate || '---'}</span>
                       </div>
                   </div>
               </div>
            </div>
        </div>

        {/* OBSERVAÇÕES E CHECKLIST DE SAÍDA TÉCNICO */}
        {compData?.technicianObservations && (
            <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden mb-2 bg-slate-50">
               <div className="bg-slate-200 text-slate-700 font-bold text-[9px] uppercase px-3 py-1 flex items-center gap-2 border-b border-slate-300">
                 <AlertTriangle size={12} /> Exceções / Observações Técnicas Registradas
               </div>
               <div className="p-2 text-[9px] italic text-slate-700 whitespace-pre-wrap font-medium">"{compData.technicianObservations}"</div>
            </div>
        )}

        {/* REGULAMENTO DA GARANTIA */}
        <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden mb-8 flex-1">
            <BlockHeader icon={FileText} title="TERMOS E CONDIÇÕES DE GARANTIA" />
            <div className="p-3 text-[8.5px] bg-white text-slate-600 leading-relaxed font-medium flex-1">
                <div className="whitespace-pre-wrap">
                    {compData?.warrantyTerms || osSettings?.warrantyTerms || (
                        "• A garantia tem cobertura exclusiva aos serviços e peças componentes do reparo atual descritos neste documento.\n" +
                        "• Ocorrerá a perda imediata da garantia em caso de rompimento, ausência ou violação dos selos de segurança.\n" +
                        "• A garantia não abrange novos defeitos não relacionados à natureza do problema original reparado.\n" +
                        "• Danos gerados por mau uso, quebras estruturais, exposição a umidade, líquidos, quedas acidentais ou flutuação extrema de energia elétrica em carregadores genéricos anulam automaticamente qualquer cobertura.\n" +
                        "• Não nos responsabilizamos por perdas de dados, softwares, fotos ou informações contidas sob posse do dispositivo em caso de falha de hardware.\n" +
                        "• Para acionar a garantia nos meses supracitados, é indispensável a exibição deste termo assim como das peças em questão."
                    )}
                </div>
            </div>
        </div>

        {/* ASSINATURA TÉCNICO APENAS */}
        <div className="mt-auto pt-6 flex flex-col items-center justify-center">
             <div className="w-64 flex flex-col items-center">
                  <div className="h-16 w-full border-b border-slate-800 flex items-center justify-center mb-1">
                      {(order?.completionData?.signatures?.technician || order?.signatures?.technician) ? (
                          <img src={(order?.completionData?.signatures?.technician || order?.signatures?.technician) || undefined} alt="Sig Técnico" className="max-h-full mix-blend-multiply" />
                      ) : (
                          <span className="text-[7.5px] text-slate-300 font-bold uppercase tracking-widest text-center">Responsável Técnico / Assistência</span>
                      )}
                  </div>
                  <span className="text-[9px] font-black uppercase text-[#2B323D]">ASSINATURA RESPONSÁVEL TÉCNICO</span>
                  <span className="text-[7.5px] font-bold text-slate-500 tracking-widest uppercase">{companySettings.name}</span>
             </div>
        </div>

        </div>
      </div>
    </div>
  );
}

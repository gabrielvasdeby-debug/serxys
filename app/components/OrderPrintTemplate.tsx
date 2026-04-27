'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, X, User, Smartphone, AlertTriangle, Wrench, ListChecks, DollarSign, Info, Phone, Mail, Pencil } from 'lucide-react';
import { Order, CompanySettings, OsSettings } from '../types';
import ControllerChecklistPrint from './ControllerChecklistPrint';

interface OrderPrintTemplateProps {
  order: Order;
  customer: any;
  companySettings: CompanySettings;
  osSettings: OsSettings;
  isPreview?: boolean;
  isSigning?: boolean;
  onClientSignatureClick?: () => void;
  clientSignatureOverride?: string | null;
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

export default function OrderPrintTemplate({ order, customer: rawCustomer, companySettings, osSettings, isPreview, isSigning, onClientSignatureClick, clientSignatureOverride }: OrderPrintTemplateProps) {
  if (!order) return null;

  // Ensure customer data exists, fallback to placeholders if null/undefined
  const customer = rawCustomer || {
    name: 'Cliente',
    whatsapp: '---',
    phone: '---',
    email: '---',
    document: '---',
    address: {
      street: 'Consulte a Assistência',
      number: '',
      neighborhood: '',
      city: '',
      state: ''
    }
  };

  const trackingUrl = `https://servyx.app/${companySettings.publicSlug || 'os'}/${order.id}`;

  return (
    <div className={`bg-white text-slate-800 p-0 m-0 font-sans leading-tight w-full print-exact-colors print:block print:overflow-visible ${isPreview ? 'block' : 'block'}`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      
      {/* Mobile-friendly wrapper that scales A4 to fit screen */}
      <div className={`${isPreview ? 'flex flex-col items-center overflow-hidden w-full' : ''}`}>
        <div 
          className="w-[210mm] min-w-[210mm] mx-auto p-[5mm] min-h-[260mm] flex flex-col box-border bg-white origin-top sm:scale-100 sm:m-0"
          style={isPreview ? { 
            transform: 'scale(var(--doc-scale, 1))',
            marginBottom: 'calc(260mm * (var(--doc-scale, 1) - 1))',
            width: '210mm'
          } : {}}
        >
          {/* Script inline to handle dynamic scaling for mobile view */}
          {isPreview && (
            <style dangerouslySetInnerHTML={{ __html: `
              :root { --doc-scale: 1; }
              @media (max-width: 794px) {
                :root { --doc-scale: calc((100vw - 40px) / 794); }
              }
            `}} />
          )}

          {/* CABEÇALHO */}
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
            <div className="flex items-center justify-end pr-1"><QRCodeSVG value={trackingUrl} size={48} level="M" /></div>
          </div>
          <div className="w-full h-px bg-slate-300 mb-1" />
          <div className="flex justify-between items-end mb-1 px-1">
             <h2 className="text-[15px] font-black text-[#2B323D] uppercase tracking-widest leading-none mb-1">ORDEM DE SERVIÇO</h2>
             <div className="flex flex-col items-end min-w-[240px]">
               <div className="flex items-center justify-end w-full mb-1 px-1 gap-4">
                 <div className="flex items-center gap-2">
                   <span className="text-[9px] font-bold text-[#2B323D] uppercase tracking-widest">COMPROVANTE DE OS</span>
                   <span className="text-[9px] font-black text-red-600">OS {order.osNumber.toString().padStart(4, '0')}</span>
                 </div>
                 <span className="bg-[#2B323D] text-white text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-sm tracking-widest">{order.status}</span>
               </div>
               <div className="w-full border-t border-slate-300 pt-1 text-[8px] font-medium text-slate-800 flex justify-between gap-4 px-1">
                 <span>Data: {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                 <span>Hora: {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
             </div>
          </div>
        </header>

        <div className="w-full h-px bg-slate-200 mb-3" />

        {/* CLIENTE */}
        <div className="border border-slate-300 rounded-lg mb-1 flex flex-col overflow-hidden">
          <BlockHeader icon={User} title="DADOS DO CLIENTE" />
          <div className="grid grid-cols-12 divide-x divide-y divide-slate-300 text-[8.5px] bg-white">
             <div className="col-span-6 p-1 flex flex-col"><span className="text-slate-500 mb-0.5 text-[7.5px]">Nome:</span><span className="font-bold text-[#2B323D] text-[9px]">{customer.name}</span></div>
             <div className="col-span-3 p-1 flex flex-col justify-center"><span className="text-slate-500 mb-0.5 text-[7.5px]">Telefone:</span><span className="font-bold text-[#2B323D] text-[9px]">{customer.whatsapp || customer.phone || '---'}</span></div>
             <div className="col-span-3 p-1 flex flex-col justify-center"><span className="text-slate-500 mb-0.5 text-[7.5px]">E-mail:</span><span className="font-bold text-[#2B323D] text-[9px] truncate">{customer.email || '—'}</span></div>
             <div className="col-span-9 p-1 flex flex-col"><span className="text-slate-500 mb-0.5 text-[7.5px]">Endereço:</span><span className="font-bold text-[#2B323D] text-[9px]">{customer.address?.street ? `${customer.address.street}, ${customer.address.number || 'S/N'} - ${customer.address.neighborhood} - ${customer.address.city}/${customer.address.state}` : '—'}</span></div>
             <div className="col-span-3 p-1 flex flex-col justify-center"><span className="text-slate-500 mb-0.5 text-[7.5px]">CPF / CNPJ:</span><span className="font-bold text-[#2B323D] text-[9px]">{customer.document || '—'}</span></div>
          </div>
        </div>

        {/* EQUIPAMENTO */}
        <div className="border border-slate-300 rounded-lg mb-1 flex flex-col overflow-hidden">
          <BlockHeader icon={Smartphone} title="EQUIPAMENTO" />
          <table className="w-full text-center text-[9px] bg-white">
            <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300 text-[8px]">
              <tr><th className="py-1 border-r border-slate-300">Tipo</th><th className="py-1 border-r border-slate-300">Marca</th><th className="py-1 border-r border-slate-300">Modelo</th><th className="py-1 border-r border-slate-300">Cor</th><th className="py-1 border-r border-slate-300">IMEI/Série</th><th className="py-1">Senha</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 border-r border-slate-300">{order.equipment.type}</td>
                <td className="py-1 border-r border-slate-300">{order.equipment.brand}</td>
                <td className="py-1 border-r border-slate-300">{order.equipment.model}</td>
                <td className="py-1 border-r border-slate-300">{order.equipment.color || '—'}</td>
                <td className="py-1 border-r border-slate-300 font-bold">{order.equipment.serial || '—'}</td>
                <td className="py-1 font-bold">{order.equipment.passwordType === 'pattern' ? 'Padrão' : order.equipment.passwordType === 'text' ? 'Texto' : 'Sem Senha'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DEFEITO E SERVIÇO - FULL WIDTH */}
        <div className="space-y-2 mb-2">
           <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden">
              <BlockHeader icon={AlertTriangle} title="DEFEITO RELATADO" />
              <div className="p-2 text-[10px] text-slate-800 italic bg-white min-h-[30px]">"{order.defect}"</div>
           </div>
           <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden">
              <BlockHeader icon={Wrench} title="SERVIÇO(S) / PROCEDIMENTO(S)" />
              <div className="p-1.5 text-[9.5px] bg-white min-h-[30px]">
                <ul className="list-disc pl-4 space-y-0.5"><li>{order.service || 'Manutenção geral'}</li></ul>
                {order.technicianNotes && <div className="mt-1 text-[8px] pl-1"><span className="font-bold">Observação:</span> {order.technicianNotes}</div>}
              </div>
           </div>
        </div>

        {order.isVisualChecklist ? (
          /* Visual controller: values left, controller right - side by side */
          <div className="grid grid-cols-[0.45fr_0.55fr] gap-4 mb-2">
            <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden">
              <BlockHeader icon={DollarSign} title="VALORES" />
              <div className="p-2 text-[9.5px] bg-white space-y-2 flex-1 flex flex-col justify-center">
                <div className="flex justify-between"><span>Serviço:</span><span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue)}</span></div>
                <div className="flex justify-between"><span>Entrada:</span><span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.amountPaid || 0)}</span></div>
                <div className="flex justify-between"><span>Saldo:</span><span className="font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue - (order.financials.amountPaid || 0))}</span></div>
                <div className="flex justify-between pt-1 border-t"><span>Pagamento realizado:</span><span className="font-bold">{order.financials.paymentType || 'A combinar'}</span></div>
              </div>
            </div>
            <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden">
              <BlockHeader icon={ListChecks} title="CHECKLIST — CONTROLE" />
              <div className="bg-white flex-1 flex items-center justify-center p-1">
                <ControllerChecklistPrint checklist={order.checklist} theme="light" svgHeight={140} />
              </div>
              {order.checklistNotes && <div className="p-1 px-2 bg-slate-50 border-t font-bold text-[8px] text-slate-500">Nota: <span className="text-slate-700 italic font-normal">{order.checklistNotes}</span></div>}
            </div>
          </div>
        ) : (
          /* Default text checklist layout */
          <div className="grid grid-cols-[0.8fr_1.2fr] gap-4 mb-2">
            <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden h-full">
              <BlockHeader icon={DollarSign} title="VALORES" />
              <div className="p-2 text-[9.5px] bg-white space-y-2 flex-1 flex flex-col justify-center">
                <div className="flex justify-between"><span>Serviço:</span><span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue)}</span></div>
                <div className="flex justify-between"><span>Entrada:</span><span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.amountPaid || 0)}</span></div>
                <div className="flex justify-between"><span>Saldo:</span><span className="font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue - (order.financials.amountPaid || 0))}</span></div>
                <div className="flex justify-between pt-1 border-t"><span>Pagamento realizado:</span><span className="font-bold">{order.financials.paymentType || 'A combinar'}</span></div>
              </div>
            </div>
            <div className="border border-slate-300 rounded-lg flex flex-col overflow-hidden h-full">
              <BlockHeader icon={ListChecks} title="CHECKLIST DE ENTRADA" />
              {order.checklistNotPossible ? (
                <div className="flex-1 p-4 flex items-center justify-center bg-white"><div className="text-red-500 font-bold text-[9px] uppercase tracking-widest text-center rounded-lg p-3 bg-red-50 border border-red-200">Não foi possível realizar o checklist.</div></div>
              ) : (
                <div className="bg-white flex flex-1">
                  {(() => {
                    const entries = Object.entries(order.checklist);
                    const mid = Math.ceil(entries.length / 2);
                    const left = entries.slice(0, mid);
                    const right = entries.slice(mid);
                    return (
                      <>
                        <div className="flex-1 border-r border-slate-200">
                          <table className="w-full text-[8.5px] border-collapse">
                            <thead className="bg-slate-50 font-bold border-b text-slate-700"><tr><th className="py-1 px-2 text-left w-[70%] text-[7.5px]">Item</th><th className="py-1 text-center w-[30%] text-[7.5px]">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                              {left.map(([item, status], i) => (
                                <tr key={item} className={i % 2 !== 0 ? 'bg-slate-50/30' : 'bg-white'}>
                                  <td className="py-0.5 px-2 font-medium text-slate-600 truncate">{item}</td>
                                  <td className="py-0.5 text-center font-black text-[7px]">{status === 'works' ? 'OK' : status === 'broken' ? <span className="text-red-600">FALHA</span> : <span className="text-slate-300">—</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex-1">
                          <table className="w-full text-[8.5px] border-collapse">
                            <thead className="bg-slate-50 font-bold border-b text-slate-700"><tr><th className="py-1 px-2 text-left w-[70%] text-[7.5px]">Item</th><th className="py-1 text-center w-[30%] text-[7.5px]">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                              {right.map(([item, status], i) => (
                                <tr key={item} className={i % 2 !== 0 ? 'bg-slate-50/30' : 'bg-white'}>
                                  <td className="py-0.5 px-2 font-medium text-slate-600 truncate">{item}</td>
                                  <td className="py-0.5 text-center font-black text-[7px]">{status === 'works' ? 'OK' : status === 'broken' ? <span className="text-red-600">FALHA</span> : <span className="text-slate-300">—</span>}</td>
                                </tr>
                              ))}
                              {left.length > right.length && (<tr className="bg-white"><td className="py-0.5 px-2 text-transparent">—</td><td className="py-0.5 text-transparent">—</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              {order.checklistNotes && <div className="p-1 px-2 bg-slate-50 border-t mt-auto font-bold text-[8px] text-slate-500">Nota: <span className="text-slate-700 italic font-normal">{order.checklistNotes}</span></div>}
            </div>
          </div>
        )}
        

        {/* OBSERVAÇÕES */}
        <div className="bg-[#F8F9FA] rounded-lg p-3 flex flex-col text-[10px] mt-1 border shadow-sm">
          <div className="font-black flex items-center gap-1.5 mb-1.5 uppercase text-[10.5px] tracking-wider text-[#2B323D]"><Info size={13} />OBSERVAÇÕES IMPORTANTES</div>
          <div className="text-[10px] leading-relaxed font-medium text-slate-700 whitespace-pre-wrap pl-1 pr-1">
            {osSettings.printTerms || 'O cliente declara que as informações prestadas são verdadeiras, conferiu os dados e concorda com os termos desta Ordem de Serviço.\n\nO equipamento passará por análise técnica, podendo haver alteração no orçamento mediante aprovação do cliente.\n\nApós conclusão, reprovação ou impossibilidade de reparo, o equipamento deverá ser retirado em até 90 dias da notificação, sob pena de cobrança de armazenagem.\n\nNão nos responsabilizamos por acessórios não descritos. O cliente é responsável pelo backup e pelos dados.\n\nEquipamentos com sinais de mau uso, oxidação, quedas, violação ou reparo por terceiros podem perder a garantia.\n\nA garantia cobre apenas os serviços realizados e peças substituídas, não incluindo danos por mau uso ou causas externas.'}
          </div>
        </div>

        {/* ASSINATURAS */}
        <div className="flex justify-between text-center text-[9px] px-10 mt-auto mb-2 pt-4">
          <div className="flex flex-col items-center w-[45%]">
            <div className={`w-full border-b border-slate-800 mb-2 h-16 flex items-center justify-center relative ${isSigning ? 'bg-slate-50 cursor-pointer hover:bg-slate-100 rounded-t-sm' : ''}`} onClick={() => isSigning && onClientSignatureClick?.()}>
              {isSigning && !clientSignatureOverride ? (
                 <div className="flex flex-col items-center gap-0.5 pb-2 text-emerald-600 font-bold">
                    <Pencil size={18} className="animate-bounce" />
                    <span className="text-[8px] uppercase tracking-widest">Toque para Assinar</span>
                 </div>
              ) : (clientSignatureOverride || (order.signatures?.client && !order.signatures?.isManual)) && (
                <img src={(clientSignatureOverride || order.signatures?.client) as string} alt="Assinatura" className="max-h-full w-auto max-w-full object-contain mix-blend-multiply scale-110" />
              )}
            </div>
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter">Assinatura do Cliente</span>
          </div>
          <div className="flex flex-col items-center w-[45%]">
            <div className="w-full border-b border-slate-800 mb-2 h-16 flex items-center justify-center relative">
              {!order.signatures?.isManual && order.signatures?.technician && (
                <img src={order.signatures.technician} alt="Tecnico" className="max-h-full w-auto max-w-full object-contain mix-blend-multiply scale-110" />
              )}
            </div>
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter">Responsável Técnico</span>
            <span className="font-black text-[10px] text-slate-900 uppercase">{companySettings.name}</span>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="mt-4 pt-3 border-t text-center text-[8px] text-slate-500 font-medium">
          {osSettings.printFooter || `${companySettings.name} - SERVYX | CNPJ: ${companySettings.cnpj || '---'} | ${companySettings.city} - ${companySettings.state}`}
        </div>
      </div>
    </div>
  );
}

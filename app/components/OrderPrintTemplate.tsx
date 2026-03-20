'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types';

interface OrderPrintTemplateProps {
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
  };
  osSettings: {
    printTerms: string;
  };
}

export default function OrderPrintTemplate({ order, customer, companySettings, osSettings }: OrderPrintTemplateProps) {
  if (!order || !customer) return null;

  // Tracking URL for QR Code
  const trackingUrl = `https://servyx.app/${companySettings.publicSlug}/${order.osNumber}`;

  return (
    <div className="hidden print:block bg-white text-black p-0 m-0 font-sans text-[10px] leading-tight w-full">
      <style jsx global>{`
        @media print {
          body:not(.print-a4) .print-a4-container {
            display: none !important;
          }
          body.print-a4 .print-a4-container {
            display: block !important;
            width: 100% !important;
          }
          body.print-a4 .print-thermal-container {
            display: none !important;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
      {/* Container to enforce A4 width feel - Minimal padding to fit everything */}
      <div className="max-w-[210mm] mx-auto p-[6mm]">
        
        {/* HEADER - Compacted */}
        <header className="flex justify-between items-center mb-3">
          <div className="flex gap-4 items-center">
            {companySettings.logoUrl && (
              <div className="relative w-24 h-24 bg-white flex items-center justify-center">
                <img 
                  src={companySettings.logoUrl} 
                  alt={companySettings.name} 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-0.5">
              <h1 className="text-xl font-black uppercase tracking-tight leading-none">{companySettings.name}</h1>
              <p className="text-[10px] font-bold text-zinc-600">CNPJ: {companySettings.cnpj || '---'}</p>
              <div className="text-[9px] text-zinc-700">
                <p>{companySettings.street}, {companySettings.number} - {companySettings.neighborhood}</p>
                <p>{companySettings.city} - {companySettings.state} | {companySettings.zipCode}</p>
              </div>
              <div className="flex gap-3 font-bold text-[9px]">
                {companySettings.phone && <span>Tel: {companySettings.phone}</span>}
                {companySettings.whatsapp && <span>WhatsApp: {companySettings.whatsapp}</span>}
              </div>
              <p className="text-[9px] text-zinc-500">{companySettings.email}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <div className="bg-white p-1.5 border border-zinc-100 rounded">
                <QRCodeSVG value={trackingUrl} size={70} level="M" />
            </div>
            <p className="text-[7px] font-black uppercase tracking-tighter text-zinc-400">Acompanhamento</p>
          </div>
        </header>

        {/* GRAY OS BANNER */}
        <div className="w-full bg-zinc-100 text-zinc-800 px-4 py-1.5 mb-3 flex justify-between items-center rounded border border-zinc-200 shadow-sm print:shadow-none">
            <h2 className="text-sm font-black tracking-[0.2em] italic uppercase">ORDEM DE SERVIÇO</h2>
            <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold">Nº:</span>
                <p className="text-xl font-mono font-black">#{order.osNumber.toString().padStart(4, '0')}</p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* CLIENT DATA */}
          <section className="border border-zinc-200 p-2 rounded relative">
            <h3 className="text-[8px] font-black uppercase tracking-widest mb-1 text-zinc-400 border-b border-zinc-50 pb-0.5">DADOS DO CLIENTE</h3>
            <div className="space-y-0.5 text-[10px]">
              <p><span className="font-bold text-zinc-500 mr-1 uppercase text-[8px]">Nome:</span> <span className="font-bold">{customer.name}</span></p>
              <div className="flex gap-4">
                <p><span className="font-bold text-zinc-500 mr-1 uppercase text-[8px]">WhatsApp:</span> {customer.whatsapp || customer.phone || '---'}</p>
              </div>
              <p><span className="font-bold text-zinc-500 mr-1 uppercase text-[8px]">E-mail:</span> {customer.email || '---'}</p>
              <p><span className="font-bold text-zinc-500 mr-1 uppercase text-[8px]">Data/Hora:</span> {new Date(order.createdAt).toLocaleDateString('pt-BR')} {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </section>

          {/* EQUIPMENT DATA */}
          <section className="border border-zinc-200 p-2 rounded">
            <h3 className="text-[8px] font-black uppercase tracking-widest mb-1 text-zinc-400 border-b border-zinc-50 pb-0.5">DADOS DO EQUIPAMENTO</h3>
            <div className="space-y-0.5 text-[10px]">
              <p><span className="font-bold text-zinc-500 mr-1 uppercase text-[8px]">Aparelho:</span> <span className="font-bold uppercase">{order.equipment.type} {order.equipment.brand} {order.equipment.model}</span></p>
              <p><span className="font-bold text-zinc-500 mr-1 uppercase text-[8px]">Série/IMEI:</span> {order.equipment.serial || '---'}</p>
              {order.equipment.passwordType !== 'none' && (
                <div className="bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100 font-bold inline-block mt-0.5">
                  <span className="text-zinc-500 uppercase text-[8px] mr-2">Senha:</span>
                  {order.equipment.passwordType === 'pattern' ? 'Padrão Desenho' : order.equipment.passwordValue}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* DEFECT & SERVICE - Two columns to save vertical space */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <section className="border border-zinc-200 p-2 rounded shadow-sm print:shadow-none">
            <h3 className="text-[8px] font-black uppercase tracking-widest mb-1 text-zinc-400">DEFEITO RELATADO</h3>
            <p className="text-[10px] leading-tight italic">"{order.defect}"</p>
          </section>
          
          <section className="border border-zinc-200 p-2 rounded shadow-sm print:shadow-none">
            <h3 className="text-[8px] font-black uppercase tracking-widest mb-1 text-zinc-400">SERVIÇO / OBS</h3>
            <p className="text-[10px] font-bold uppercase">{order.service || 'Mão de obra técnica'}</p>
          </section>
        </div>

        {/* CHECKLIST - Optimized 2 columns */}
        <section className="mb-3 border border-zinc-200 rounded overflow-hidden shadow-sm print:shadow-none">
          <h3 className="text-[8px] font-black uppercase tracking-widest p-1.5 px-3 bg-zinc-50 border-b border-zinc-200">CHECKLIST DE ENTRADA</h3>
          <div className="grid grid-cols-2 divide-x divide-zinc-200 text-[9px]">
            <div className="divide-y divide-zinc-50">
              {Object.entries(order.checklist).slice(0, Math.ceil(Object.entries(order.checklist).length / 2)).map(([item, status]) => (
                <div key={item} className="flex items-center justify-between p-1 px-3">
                  <span className="uppercase text-zinc-600 truncate mr-1">{item}</span>
                  <span className={`font-black uppercase text-[8px] ${status === 'works' ? 'text-emerald-600' : status === 'broken' ? 'text-red-600' : 'text-zinc-400'}`}>
                    {status === 'works' ? 'OK' : status === 'broken' ? 'FALHA' : '---'}
                  </span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-zinc-50">
              {Object.entries(order.checklist).slice(Math.ceil(Object.entries(order.checklist).length / 2)).map(([item, status]) => (
                <div key={item} className="flex items-center justify-between p-1 px-3">
                  <span className="uppercase text-zinc-600 truncate mr-1">{item}</span>
                  <span className={`font-black uppercase text-[8px] ${status === 'works' ? 'text-emerald-600' : status === 'broken' ? 'text-red-600' : 'text-zinc-400'}`}>
                    {status === 'works' ? 'OK' : status === 'broken' ? 'FALHA' : '---'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {order.checklistNotes && (
             <div className="p-1 px-3 bg-zinc-50 border-t border-zinc-100 text-[9px]">
                <span className="font-bold uppercase text-[7px] text-zinc-400 mr-2">Obs:</span>
                {order.checklistNotes}
             </div>
          )}
        </section>

        {/* FINANCIALS & SIGNATURES - Combined horizontal row */}
        <div className="grid grid-cols-[1.2fr,2fr] gap-3 mb-3">
            {/* COMPACT VALES */}
            <section className="border border-zinc-800 p-2 rounded-lg bg-zinc-50 flex flex-col justify-center divide-y divide-zinc-200 shadow-sm print:shadow-none">
                <div className="flex justify-between py-1">
                  <span className="text-[8px] font-black uppercase text-zinc-500">Total:</span>
                  <span className="text-xs font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[8px] font-black uppercase text-zinc-500">Adiant.:</span>
                  <span className="text-xs font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.amountPaid || 0)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[8px] font-black uppercase text-zinc-500">Saldo:</span>
                  <span className="text-xs font-black text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue - (order.financials.amountPaid || 0))}</span>
                </div>
                <div className="pt-1 text-center font-black text-[7px] uppercase text-zinc-400">Pagto: {order.financials.paymentType || 'A COMBINAR'}</div>
            </section>

            {/* SIGNATURES */}
            <section className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <div className="w-full h-12 border-b border-black flex items-center justify-center overflow-hidden">
                  {order.signatures.client && (
                    <img src={order.signatures.client} alt="Assinatura" className="max-h-full object-contain mix-blend-multiply" />
                  )}
                </div>
                <p className="font-bold uppercase text-[7px] mt-1 text-zinc-400">Assinatura Cliente</p>
                <p className="text-[9px] font-black uppercase truncate max-w-full">{customer.name.split(' ')[0]}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-full h-12 border-b border-black flex items-center justify-center overflow-hidden">
                   {order.signatures.technician && (
                    <img src={order.signatures.technician} alt="Assinatura" className="max-h-full object-contain mix-blend-multiply" />
                  )}
                </div>
                <p className="font-bold uppercase text-[7px] mt-1 text-zinc-400">Responsável Técnico</p>
                <p className="text-[9px] font-black uppercase truncate max-w-full">{companySettings.name}</p>
              </div>
            </section>
        </div>

        {/* LARGE SPACE FOR TERMS & CONDITIONS - Now from osSettings */}
        <section className="pt-2 border-t border-zinc-200">
           {osSettings.printTerms ? (
             <div className="p-2 bg-zinc-50 rounded border border-zinc-200 min-h-[140px] shadow-sm print:shadow-none">
                <h4 className="text-[8px] font-black uppercase tracking-widest mb-1.5 text-zinc-500 border-b border-zinc-200 pb-0.5">TERMOS, GARANTIAS E REGRAS DA ASSISTÊNCIA</h4>
                <div className="text-[9px] text-zinc-700 leading-normal whitespace-pre-wrap font-medium">
                  {osSettings.printTerms}
                </div>
             </div>
           ) : (
             <div className="text-center italic text-zinc-400 text-[9px] py-4">
               "Consulte nossas regras e termos de garantia na recepção."
             </div>
           )}
        </section>

        {/* SYSTEM FOOTER */}
        <div className="mt-4 flex justify-between items-center opacity-40 grayscale text-[7px] font-medium uppercase tracking-tighter">
            <span>SERVYX OS SYSTEM PRO - GESTÃO INTELIGENTE</span>
            <span>Documento emitido em: {new Date().toLocaleString('pt-BR')}</span>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 0;
            size: A4;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

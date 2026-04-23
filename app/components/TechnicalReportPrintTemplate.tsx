'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types';

interface TechnicalReportPrintTemplateProps {
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
}

export default function TechnicalReportPrintTemplate({ 
  order, 
  customer, 
  companySettings 
}: TechnicalReportPrintTemplateProps) {
  if (!order || !customer || !order.technicalReport) return null;

  const report = order.technicalReport;
  const trackingUrl = `https://servyx.app/${companySettings?.publicSlug || 'os'}/${order.id}`;
  const emissionDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

  return (
    <div className="hidden print:block bg-white text-black p-0 m-0 font-sans text-[10px] leading-tight w-full">

      {/* A4 WRAPPER */}
      <div className="max-w-[210mm] mx-auto bg-white p-[5mm] print:p-0">
        
        {/* 1. CABEÇALHO */}
        <header className="flex justify-between items-start mb-6 border-b border-zinc-200 pb-4">
          <div className="flex gap-4 items-start">
            {companySettings?.logoUrl && (
              <img 
                src={companySettings.logoUrl} 
                alt={companySettings.name} 
                className="w-20 h-20 object-contain"
              />
            )}
            <div className="space-y-0.5 max-w-[350px]">
              <h1 className="text-xl font-black uppercase text-black leading-none">{companySettings?.name || 'SUA EMPRESA'}</h1>
              <p className="text-[10px] font-bold text-zinc-600">CNPJ: {companySettings?.cnpj || '---'}</p>
              
              <div className="text-[9px] text-zinc-500 mt-1">
                <p>{companySettings?.street || '---'}, {companySettings?.number || 'S/N'}{companySettings?.complement ? ` - ${companySettings.complement}` : ''} - {companySettings?.neighborhood || '---'}</p>
                <p>{companySettings?.city || '---'} - {companySettings?.state || '---'} | CEP: {companySettings?.zipCode || '---'}</p>
              </div>

              <div className="flex gap-3 pt-1.5 text-[9px] font-bold text-zinc-700">
                {companySettings?.phone && <span>Fone: {companySettings.phone}</span>}
                {companySettings?.whatsapp && <span>WhatsApp: {companySettings.whatsapp}</span>}
              </div>
              <p className="text-[9px] text-zinc-400 font-normal">{companySettings?.email}</p>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-white p-1 border border-zinc-100 rounded">
                <QRCodeSVG value={trackingUrl} size={65} level="M" />
            </div>
            <p className="text-[7px] font-bold text-zinc-400 mt-1 uppercase">Acompanhe online</p>
          </div>
        </header>

        {/* 2. TÍTULO */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black tracking-[0.2em] text-black uppercase">LAUDO TÉCNICO</h2>
          <div className="flex justify-center items-center gap-4 text-[9px] text-zinc-500 font-bold mt-1">
            <span className="bg-zinc-100 px-2 py-0.5 rounded uppercase">OS {order.osNumber.toString().padStart(4, '0')}</span>
            <span className="bg-zinc-100 px-2 py-0.5 rounded uppercase">Emitido em: {emissionDate}</span>
          </div>
        </div>

        {/* 3. DADOS (GRID) */}
        <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-zinc-100">
          <section>
            <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 border-l-2 border-zinc-300 pl-2">DADOS DO CLIENTE</h3>
            <div className="space-y-1 pl-2.5">
              <p className="text-xs shrink-0"><span className="text-[8px] font-bold text-zinc-400 uppercase mr-2">NOME:</span> <span className="font-bold">{customer?.name}</span></p>
              <p className="text-xs shrink-0"><span className="text-[8px] font-bold text-zinc-400 uppercase mr-2">CONTATO:</span> {customer?.whatsapp || customer?.phone || '---'}</p>
              <p className="text-xs shrink-0"><span className="text-[8px] font-bold text-zinc-400 uppercase mr-2">E-MAIL:</span> {customer?.email || '---'}</p>
            </div>
          </section>

          <section>
            <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 border-l-2 border-zinc-300 pl-2">DADOS DO EQUIPAMENTO</h3>
            <div className="space-y-1 pl-2.5">
              <p className="text-xs shrink-0"><span className="text-[8px] font-bold text-zinc-400 uppercase mr-2">APARELHO:</span> <span className="font-bold uppercase">{order.equipment?.type}</span></p>
              <p className="text-xs shrink-0"><span className="text-[8px] font-bold text-zinc-400 uppercase mr-2">MODELO:</span> {order.equipment?.brand} {order.equipment?.model}</p>
              <p className="text-xs shrink-0"><span className="text-[8px] font-bold text-zinc-400 uppercase mr-2">SÉRIE:</span> {order.equipment?.serial || '---'}</p>
            </div>
          </section>
        </div>

        {/* 4. CONTEÚDO DO LAUDO */}
        <div className="space-y-4 mb-8">
          <section className="space-y-1">
            <h4 className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">1. DIAGNÓSTICO TÉCNICO</h4>
            <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
              <p className="text-[10px] text-zinc-800 whitespace-pre-wrap leading-normal">{report.diagnosis}</p>
            </div>
          </section>

          <section className="space-y-1">
            <h4 className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">2. TESTES REALIZADOS</h4>
            <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
              <p className="text-[10px] text-zinc-800 whitespace-pre-wrap leading-normal">{report.tests}</p>
            </div>
          </section>

          <section className="space-y-1">
            <h4 className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">3. PEÇAS E MATERIAIS</h4>
            <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
              <p className="text-[10px] text-zinc-800 whitespace-pre-wrap leading-normal">{report.partsNeeded || 'Nenhuma peça extra necessária.'}</p>
            </div>
          </section>

          {report.notes && (
            <section className="space-y-1">
              <h4 className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">4. OBSERVAÇÕES TÉCNICAS</h4>
              <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
                <p className="text-[10px] text-zinc-800 whitespace-pre-wrap leading-normal">{report.notes}</p>
              </div>
            </section>
          )}

          <section className="pt-4">
            <div className="p-4 bg-zinc-100 border border-zinc-200 rounded-xl">
              <h4 className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">CONCLUSÃO DO LAUDO</h4>
              <p className="text-xs font-bold leading-tight italic text-black">
                "{report.conclusion}"
              </p>
            </div>
          </section>

          {report.photos && report.photos.length > 0 && (
            <section className="pt-6 page-break-inside-avoid">
              <h4 className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-3">ANEXOS VISUAIS</h4>
              <div className="grid grid-cols-3 gap-4">
                {report.photos.map((photo, idx) => (
                  <div key={idx} className="aspect-square bg-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
                    <img src={photo} alt={`Anexo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 5. ASSINATURA */}
        <div className="mt-12 flex flex-col items-center">
          <div className="w-full max-w-[300px] border-b border-zinc-300 mb-2 flex justify-center h-16 items-end relative">
            {report.technicianSignature && (
              <img 
                src={report.technicianSignature} 
                alt="Assinatura" 
                className="max-h-16 object-contain mix-blend-multiply" 
              />
            )}
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase text-black tracking-wider">ASSINATURA RESPONSÁVEL</p>
            <p className="text-[8px] font-bold text-zinc-400 mt-0.5">DATA: {emissionDate}</p>
          </div>
        </div>

        {/* 6. RODAPÉ */}
        <footer className="mt-16 pt-4 border-t border-zinc-100 flex justify-between items-center text-[7px] text-zinc-400 font-bold uppercase tracking-widest opacity-60">
          <div className="flex gap-3">
            <span>{companySettings?.name}</span>
            {companySettings?.phone && <span>• {companySettings.phone}</span>}
          </div>
          <div className="text-right">
            SERVYX OS SYSTEM - LAUDO OFICIAL
          </div>
        </footer>
      </div>
    </div>
  );
}

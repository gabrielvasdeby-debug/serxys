import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';
import { Order } from '../types';
import { Customer } from './ClientesModule';

interface ThermalReceiptTemplateProps {
  order: Order;
  customer: Customer | undefined;
  companySettings: any;
  osSettings: any;
}

export default function ThermalReceiptTemplate({ 
  order, 
  customer, 
  companySettings,
  osSettings 
}: ThermalReceiptTemplateProps) {
  const remainingValue = order.financials.totalValue - (order.financials.amountPaid || 0);

  return (
    <div className="thermal-receipt hidden print:block w-[80mm] mx-auto p-4 bg-white text-black font-mono text-[11px] leading-tight">
      <style jsx global>{`
        @media print {
          body:not(.print-thermal) .thermal-print-container {
            display: none !important;
          }
          body.print-thermal .thermal-print-container {
            display: block !important;
            width: 100% !important;
          }
          body.print-thermal .print-a4-container {
            display: none !important;
          }
          body.print-thermal .thermal-receipt {
            display: block !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="text-center mb-4 space-y-1">
        {companySettings?.logoUrl && (
          <div className="flex justify-center mb-2">
            <img 
              src={companySettings.logoUrl} 
              alt="Logo" 
              className="max-w-[150px] max-h-[60px] object-contain grayscale"
            />
          </div>
        )}
        <h1 className="text-sm font-bold uppercase leading-tight">{companySettings?.name || 'Sua Empresa'}</h1>
        {companySettings?.cnpj && <p className="text-[9px] font-bold">CNPJ: {companySettings.cnpj}</p>}
        <div className="text-[10px] space-y-0.5 flex flex-wrap justify-center gap-x-3">
          {companySettings?.phone && <span>📞 {companySettings.phone}</span>}
          {companySettings?.whatsapp && <span>💬 {companySettings.whatsapp}</span>}
        </div>
        <div className="text-[9px] leading-tight opacity-80 pt-1 border-t border-black/5 mx-auto max-w-[90%]">
          {companySettings?.street}, {companySettings?.number} - {companySettings?.neighborhood}<br />
          {companySettings?.city} - {companySettings?.state} | CEP: {companySettings?.zipCode}
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* OS INFO */}
      <div className="flex justify-between font-bold text-xs mb-1">
        <span>OS Nº: {order.osNumber.toString().padStart(4, '0')}</span>
        <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* CUSTOMER INFO */}
      <div className="space-y-1">
        <p><strong>CLIENTE:</strong> {customer?.name || 'Não Identificado'}</p>
        <p><strong>TEL:</strong> {customer?.phone || customer?.whatsapp || 'N/A'}</p>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* EQUIPMENT INFO */}
      <div className="space-y-1">
        <p><strong>EQUIPAMENTO:</strong> {order.equipment.type}</p>
        <p><strong>MARCA:</strong> {order.equipment.brand}</p>
        <p><strong>MODELO:</strong> {order.equipment.model}</p>
        {order.equipment.serial && <p><strong>SÉRIE:</strong> {order.equipment.serial}</p>}
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* DEFECT & SERVICE */}
      <div className="space-y-2">
        <div>
          <p className="font-bold underline mb-1">DEFEITO RELATADO:</p>
          <p className="italic">{order.defect}</p>
        </div>
        <div>
          <p className="font-bold underline mb-1">SERVIÇO CONTRATADO:</p>
          <p className="italic">{order.service || 'A definir'}</p>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* CHECKLIST */}
      <div className="space-y-1">
        <p className="font-bold mb-1 underline text-center text-[9px]">CHECKLIST DE ENTRADA</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {Object.entries(order.checklist).map(([item, status]) => (
            <div key={item} className="flex justify-between items-center text-[8px] border-b border-black/5">
              <span className="truncate pr-1">{item}:</span>
              <span className="font-bold uppercase shrink-0">
                {status === 'works' ? 'OK' : status === 'broken' ? 'F' : '-'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* VALUES */}
      <div className="space-y-1 text-right">
        <div className="flex justify-between">
          <span>VALOR TOTAL:</span>
          <span className="font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue)}
          </span>
        </div>
        <div className="flex justify-between text-emerald-700">
          <span>VALOR PAGO:</span>
          <span className="font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.amountPaid || 0)}
          </span>
        </div>
        <div className="flex justify-between text-red-700 border-t border-zinc-200 mt-1 pt-1 font-bold">
          <span>RESTANTE:</span>
          <span>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingValue)}
          </span>
        </div>
        <p className="text-[9px] mt-1 italic">Forma: {order.financials.paymentType || 'N/A'}</p>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* SIGNATURE */}
      <div className="mt-6 mb-4 text-center">
        {order.signatures?.client ? (
          <div className="space-y-1">
            <img 
              src={order.signatures.client} 
              alt="Assinatura" 
              className="max-h-[80px] mx-auto grayscale invert hover:invert-0"
              style={{ filter: 'contrast(200%) brightness(0.5)' }}
            />
            <p className="border-t border-black pt-1 text-[9px] uppercase">Assinatura Digital do Cliente</p>
          </div>
        ) : (
          <div className="mt-10">
            <div className="border-t border-black w-full mx-auto" />
            <p className="mt-1 text-[9px] uppercase">Assinatura do Cliente</p>
          </div>
        )}
      </div>

      {/* QR CODE */}
      <div className="flex flex-col items-center justify-center my-4 space-y-2">
        <QRCodeSVG 
          value={`https://servyx.app/${companySettings?.publicSlug || 'os'}/${order.osNumber}`}
          size={100}
          level="H"
          className="grayscale"
        />
        <p className="text-[9px] text-center font-bold">Acompanhe sua OS pelo QR Code</p>
      </div>

      {/* FOOTER */}
      <div className="text-center mt-4 pt-4 border-t border-dashed border-black space-y-2">
        <p className="font-bold text-[10px]">Guarde este comprovante para retirada do equipamento.</p>
        <p className="text-[8px] opacity-75">Impresso em {new Date().toLocaleString('pt-BR')}</p>
        <p className="text-[7px] mt-2">Powered by SERVYX</p>
      </div>
    </div>
  );
}

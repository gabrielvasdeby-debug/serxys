import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, X } from 'lucide-react';
import { Order, CompanySettings, OsSettings } from '../types';
import { Customer } from './ClientesModule';
import ControllerChecklistPrint from './ControllerChecklistPrint';

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
    <div className="thermal-receipt block print:block w-[80mm] mx-auto p-2 bg-white text-black font-mono text-[10px] leading-tight">

      {/* HEADER */}
      <div className="text-center mb-1 space-y-0.5">
        {companySettings?.logoUrl && (
          <div className="flex justify-center mb-1">
            <img 
              src={companySettings.logoUrl} 
              alt="Logo" 
              className="max-w-[150px] max-h-[60px] object-contain grayscale"
              style={{ filter: 'contrast(150%) brightness(0.8)' }}
            />
          </div>
        )}
        <h1 className="text-xs font-bold uppercase">{companySettings?.name || 'Sua Empresa'}</h1>
        {companySettings?.cnpj && <p className="text-[9px] font-bold">CNPJ: {companySettings.cnpj}</p>}
        <div className="text-[9px] flex flex-wrap justify-center gap-x-2">
          {companySettings?.phone && <span>Tel: {companySettings.phone}</span>}
          {companySettings?.whatsapp && <span>Zap: {companySettings.whatsapp}</span>}
        </div>
        <div className="text-[8px] opacity-80 pt-0.5 border-t border-black/5 mx-auto max-w-[90%]">
          {companySettings?.street}, {companySettings?.number}{companySettings?.complement ? ` - ${companySettings.complement}` : ''} - {companySettings?.neighborhood}<br />
          {companySettings?.city} - {companySettings?.state} | CEP: {companySettings?.zipCode}
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* OS INFO */}
      <div className="flex justify-between font-bold text-[11px]">
        <span>OS {order.osNumber.toString().padStart(4, '0')}</span>
        <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* CUSTOMER INFO */}
      <div className="space-y-0.5">
        <p><strong>CLIENTE:</strong> {customer?.name || 'Não Identificado'}</p>
        <p><strong>TEL:</strong> {customer?.phone || customer?.whatsapp || customer?.email || 'N/A'}</p>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* EQUIPMENT */}
      <div className="space-y-0.5 p-1.5 rounded-sm border border-black/10">
        <p className="font-bold uppercase text-center border-b border-black/10 pb-0.5 mb-1">{order.equipment.type} {order.equipment.brand}</p>
        <p><strong>MODELO:</strong> {order.equipment.model}</p>
        {order.equipment.serial && <p><strong>SÉRIE:</strong> {order.equipment.serial}</p>}
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* DEFECT & SERVICE */}
      <div className="space-y-1">
        <p><strong>DEFEITO:</strong> {order.defect}</p>
        <p><strong>SERVIÇO:</strong> {order.service || 'A definir'}</p>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* CHECKLIST */}
      {order.checklist && Object.keys(order.checklist).length > 0 && !order.checklistNotPossible && (
        <div className="space-y-0.5">
          <p className="font-bold text-[9px] text-center uppercase tracking-widest border-b border-black/5 mb-1">Checklist de Entrada</p>
          
          {order.isVisualChecklist && order.equipment.type === 'Controle' ? (
            <div className="py-1">
              <ControllerChecklistPrint checklist={order.checklist} theme="light" svgHeight={180} isThermal={true} />
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] leading-tight justify-center">
              {Object.entries(order.checklist).map(([item, status]) => (
                <span key={item} className="border-b border-black/5">
                  {item}: <span className="font-bold uppercase">{status === 'works' ? 'V' : status === 'broken' ? 'X' : '-'}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {order.checklistNotes && (
        <div className="mt-1 space-y-0.5">
          <p className="font-bold text-[8px] underline">OBS CHECKLIST:</p>
          <p className="text-[8px] italic">{order.checklistNotes}</p>
        </div>
      )}

      <div className="border-t border-dashed border-black my-1" />

      {/* VALUES */}
      <div className="space-y-0.5 text-right font-bold">
        <div className="flex justify-between"><span>TOTAL:</span><span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue)}</span></div>
        <div className="flex justify-between text-[9px] opacity-70"><span>VALOR PAGO:</span><span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.amountPaid || 0)}</span></div>
        <div className="flex justify-between border-t border-black/10 pt-0.5"><span>RESTANTE:</span><span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingValue)}</span></div>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* SIGNATURES (Vertical like old) */}
      <div className="space-y-4 my-2">
        <div className="text-center">
          {order.signatures?.client ? (
            <img 
              src={order.signatures.client} 
              alt="Ass" 
              className="max-h-[85px] mx-auto grayscale" 
              style={{ filter: 'contrast(400%) brightness(0.2) drop-shadow(0.5px 0.5px 0px black)' }} 
            />
          ) : (
            <div className="border-t border-black w-3/4 mx-auto mt-6" />
          )}
          <p className="text-[8px] uppercase font-bold">Assinatura do Cliente</p>
        </div>

        <div className="text-center">
          {order.signatures?.technician ? (
            <img 
              src={order.signatures.technician} 
              alt="Ass" 
              className="max-h-[60px] mx-auto grayscale" 
              style={{ filter: 'contrast(400%) brightness(0.2) drop-shadow(0.5px 0.5px 0px black)' }} 
            />
          ) : (
            <div className="border-t border-black w-3/4 mx-auto mt-6" />
          )}
          <p className="text-[8px] uppercase font-bold">Assinatura do Técnico</p>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* QR & FOOTER */}
      <div className="flex flex-col items-center gap-1 my-1">
        <QRCodeSVG value={`https://servyx.app/${companySettings?.publicSlug || 'os'}/${order.id}`} size={60} level="M" className="grayscale" />
        <p className="text-[8px] text-center font-bold">Acompanhe via QRCode</p>
      </div>

      <div className="text-center mt-1 pt-1 opacity-70 border-t border-black/10">
        <p className="text-[7px]">Impresso em {new Date().toLocaleString('pt-BR')} - Servyx</p>
      </div>
    </div>
  );
}

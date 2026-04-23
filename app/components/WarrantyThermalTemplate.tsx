import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order, CompanySettings, OsSettings } from '../types';
import { Customer } from './ClientesModule';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ControllerChecklistPrint from './ControllerChecklistPrint';

interface WarrantyThermalTemplateProps {
  order: Order;
  customer: Customer | undefined;
  companySettings: any;
  osSettings: any;
}

export default function WarrantyThermalTemplate({ 
  order, 
  customer, 
  companySettings,
  osSettings
}: WarrantyThermalTemplateProps) {
  
  const warrantyDays = order.completionData?.warrantyDays || 90;
  const createdAtDate = order.updatedAt ? parseISO(order.updatedAt) : new Date();
  const warrantyEndDate = addDays(createdAtDate, warrantyDays);

  return (
    <div className="warranty-thermal hidden print:block w-[80mm] mx-auto p-2 bg-white text-black font-mono text-[10px] leading-tight">

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
        <p className="text-[10px] font-black border-y border-black py-1 my-1">CERTIFICADO DE GARANTIA</p>
        <p className="text-[9px]">{companySettings?.cnpj ? `CNPJ: ${companySettings.cnpj}` : ''}</p>
        <div className="text-[9px] flex flex-wrap justify-center gap-x-2">
          {companySettings?.phone && <span>Tel: {companySettings.phone}</span>}
          {companySettings?.whatsapp && <span>Zap: {companySettings.whatsapp}</span>}
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* OS & CLIENTE */}
      <div className="flex justify-between font-bold text-[10px]">
        <span>OS {order.osNumber.toString().padStart(4, '0')}</span>
        <span>{format(createdAtDate, 'dd/MM/yyyy')}</span>
      </div>
      <div className="mt-1">
        <p><strong>CLIENTE:</strong> {customer?.name || 'Não identificado'}</p>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* EQUIPMENT */}
      <div className="space-y-0.5 p-1.5 rounded-sm border border-black/10">
        <p className="font-bold uppercase text-center border-b border-black/10 pb-0.5 mb-1">{order.equipment.type} {order.equipment.brand}</p>
        <p><strong>MODELO:</strong> {order.equipment.model}</p>
        {order.equipment.serial && <p><strong>SÉRIE:</strong> {order.equipment.serial}</p>}
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* SERVICE */}
      <div className="space-y-1">
        <p><strong>SERVIÇO:</strong> {order.completionData?.servicesPerformed || order.service || 'Manutenção técnica'}</p>
        {order.completionData?.partsUsed && <p><strong>PEÇAS:</strong> {order.completionData.partsUsed}</p>}
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* CHECKLIST DE SAÍDA */}
      {order.completionData?.exitChecklist && Object.keys(order.completionData.exitChecklist).length > 0 && (
        <div className="space-y-0.5">
          <p className="font-bold text-[9px] text-center uppercase tracking-widest border-b border-black/5 mb-1">Checklist de Saída</p>
          
          {order.isVisualChecklist && order.equipment.type === 'Controle' ? (
            <div className="py-1">
              <ControllerChecklistPrint checklist={order.completionData.exitChecklist} theme="light" svgHeight={180} isThermal={true} />
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] leading-tight justify-center">
              {Object.entries(order.completionData.exitChecklist).map(([item, status]) => (
                <span key={item} className="border-b border-black/5">
                  {item}: <span className="font-bold uppercase">{status === 'works' ? 'V' : status === 'broken' ? 'X' : '-'}</span>
                </span>
              ))}
            </div>
          )}
          <div className="border-t border-dashed border-black my-1" />
        </div>
      )}

      {/* WARRANTY & VALUE */}
      <div className="my-2 border-2 border-black p-2 text-center rounded-sm">
        <p className="font-bold text-xs uppercase tracking-widest">Garantia: {warrantyDays} Dias</p>
        <p className="text-[10px] font-bold">Válido até: {format(warrantyEndDate, 'dd/MM/yyyy')}</p>
      </div>

      <div className="flex justify-between font-bold text-xs pb-1">
        <span>VALOR TOTAL:</span>
        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.financials.totalValue)}</span>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* TERMS */}
      <div className="text-center space-y-1 my-1">
        <p className="font-bold text-[8px] uppercase underline">Regras da Garantia</p>
        <p className="text-[7px] leading-tight opacity-80">Selo rompido, mau uso, quedas, contato com líquidos ou reparos por terceiros anulam esta garantia, que é restrita aos itens descritos.</p>
      </div>

      <div className="border-t border-dashed border-black my-1" />


      <div className="border-t border-dashed border-black my-1" />

      {/* QR & FOOTER */}
      <div className="flex flex-col items-center gap-1 my-1">
        <QRCodeSVG value={`https://servyx.app/${companySettings?.publicSlug || 'os'}/${order.id}`} size={60} level="M" className="grayscale" />
        <p className="text-[8px] font-bold uppercase tracking-tighter text-center">Acompanhe sua OS pelo Portal do Cliente</p>
      </div>

      <div className="text-center mt-1 pt-1 opacity-70 border-t border-black/10">
        <p className="text-[7px] font-bold">Powered by SERVYX</p>
        <p className="text-[7px]">Emitido em {new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}

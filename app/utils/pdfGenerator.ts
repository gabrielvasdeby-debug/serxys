import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, CashSession } from '../components/CaixaModule';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface Totals {
  initial: number;
  entries: number;
  entriesByType: Record<string, number>;
  exits: number;
  balance: number;
  cashInHand: number;
}

export const generateCashReportPDF = (
  session: CashSession,
  transactions: Transaction[],
  totals: Totals,
  companySettings?: {
    name: string;
    cnpj: string;
    phone: string;
    whatsapp: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    logoUrl?: string;
  }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  // --- HEADER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  const companyName = companySettings?.name || 'SERVYX';
  doc.text(companyName.toUpperCase(), margin, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  if (companySettings) {
    doc.text(`CNPJ: ${companySettings.cnpj || '---'} | Tel: ${companySettings.phone || '---'}`, margin, 25);
    doc.text(`${companySettings.street}, ${companySettings.number} - ${companySettings.neighborhood}`, margin, 29);
    doc.text(`${companySettings.city} - ${companySettings.state} | CEP: ${companySettings.zipCode}`, margin, 33);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('RELATÓRIO DIÁRIO DE CAIXA', pageWidth - margin, 22, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data do Relatório: ${new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR')}`, pageWidth - margin, 28, { align: 'right' });
  
  doc.line(margin, 38, pageWidth - margin, 38);

  let currentY = 45;

  // --- SECTION 1: DADOS DO TURNO (Table Style) ---
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[{ content: '1. INFORMAÇÕES DE TURNO', colSpan: 4, styles: { halign: 'left', fillColor: [40, 40, 40], textColor: [255, 255, 255] } }]],
    body: [
      ['Abertura:', session.openingTime, 'Usuário:', session.openingUserName || 'Sistema'],
      ['Fechamento:', session.closingTime || '---', 'Usuário:', session.closingUserName || '---'],
      ['Status:', session.status === 'open' ? 'ABERTO' : 'ENCERRADO', 'ID Sessão:', session.id.slice(0, 8).toUpperCase()]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 25 }, 1: { cellWidth: 40 }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 25 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- SECTION 2: RESUMO FINANCEIRO (Table Style) ---
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['2. RESUMO FINANCEIRO DO DIA', 'VALOR']],
    body: [
      ['Total de Entradas Bruto', formatCurrency(totals.entries)],
      ['Total de Saídas (Retiradas/Sangrias)', formatCurrency(totals.exits)],
      ['Saldo Final Calculado (Líquido)', formatCurrency(totals.balance)],
      ['Troco Inicial em Dinheiro', formatCurrency(totals.initial)],
      ['Dinheiro em Espécie (Físico)', formatCurrency(totals.cashInHand)]
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right', fontStyle: 'bold' } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- SECTION 3: POR FORMA DE PAGAMENTO (Table Style) ---
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['3. RECEBIMENTOS POR FORMA DE PAGAMENTO', 'TOTAL']],
    body: [
      ['Dinheiro em Espécie', formatCurrency(totals.entriesByType['Dinheiro'] || 0)],
      ['Pix / Transferência', formatCurrency(totals.entriesByType['PIX'] || 0)],
      ['Cartão de Débito', formatCurrency(totals.entriesByType['Débito'] || 0)],
      ['Cartão de Crédito', formatCurrency(totals.entriesByType['Crédito'] || 0)],
      ['Link de Pagamento / Digital', formatCurrency(totals.entriesByType['Link'] || 0)]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'right' } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // --- SECTION 4: HISTÓRICO DE LANÇAMENTOS (Detailed) ---
  const detailRows = transactions.map((t, idx) => {
    let tipo = 'Ajuste';
    let ref = '---';
    if (t.type === 'saida') tipo = 'Retirada';
    else if (t.description?.includes('Venda #')) { tipo = 'Venda'; ref = t.description.match(/#(\d+)/)?.[1] || '---'; }
    else if (t.description?.includes('Recebimento OS')) { tipo = 'Receb. OS'; ref = t.description.match(/OS (\d+)/)?.[1] || '---'; }

    return [
      t.time,
      tipo,
      ref,
      t.description || '---',
      t.paymentMethod || '---',
      formatCurrency(t.value)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [{ content: '4. MOVIMENTAÇÕES DETALHADAS (CRONOLÓGICO)', colSpan: 6, styles: { halign: 'left', fillColor: [40, 40, 40], textColor: [255, 255, 255] } }],
      ['Hora', 'Tipo', 'Ref#', 'Descrição / Motivo', 'Pagt.', 'Valor']
    ],
    body: detailRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fontStyle: 'bold' },
    bodyStyles: { textColor: [40, 40, 40] },
    columnStyles: { 
      0: { cellWidth: 15 }, 
      1: { cellWidth: 22 }, 
      2: { cellWidth: 15 },
      3: { cellWidth: 'auto' }, 
      4: { cellWidth: 22 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 25 } 
    },
    didParseCell: (data) => {
      if (data.row.index === 1 && data.section === 'head') {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.textColor = [40, 40, 40];
      }
    }
  });

  // --- SIGNATURES ---
  const footerY = 265;
  doc.setLineWidth(0.2);
  doc.line(pageWidth / 2 - 45, footerY, pageWidth / 2 + 45, footerY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Responsável pelo Fechamento', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(session.closingUserName || session.openingUserName || '---', pageWidth / 2, footerY + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY + 15, { align: 'center' });

  // Pagination
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(`Auditoria Serveyx - Página ${i} de ${totalPages} - Documento Oficial de Caixa`, pageWidth / 2, 292, { align: 'center' });
  }

  doc.save(`Relatorio_Caixa_${session.date}.pdf`);
};

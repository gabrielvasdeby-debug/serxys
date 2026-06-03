import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, CashSession, Sale } from '../types';

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
  sales: Sale[] = [],
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
    doc.text(`${companySettings.street || ''}, ${companySettings.number || ''} - ${companySettings.neighborhood || ''}`, margin, 29);
    doc.text(`${companySettings.city || ''} - ${companySettings.state || ''} | CEP: ${companySettings.zipCode || '---'}`, margin, 33);
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

  // Formatar hora de fechamento
  const closingTimeStr = session.closed_at 
    ? new Date(session.closed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
    : (session.closingTime || '---');
  const closingDateStr = session.closed_at 
    ? new Date(session.closed_at).toLocaleDateString('pt-BR') 
    : (session.date ? new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR') : '---');

  // --- CABEÇALHO DO RELATÓRIO ---
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[{ content: 'INFORMAÇÕES OPERACIONAIS', colSpan: 2, styles: { halign: 'left', fillColor: [40, 40, 40], textColor: [255, 255, 255] } }]],
    body: [
      ['Empresa:', companyName],
      ['Responsável Abertura:', `${session.openingUserName || 'Sistema'} em ${new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR')} às ${session.openingTime || '---'}`],
      ['Responsável Fechamento:', session.status === 'open' ? 'CAIXA AINDA ABERTO' : `${session.closingUserName || '---'} em ${closingDateStr} às ${closingTimeStr}`]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 40 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Valores calculados
  const initial = session.initialValue || 0;
  const entries = totals.entries;
  const exits = totals.exits;
  const operationalResult = entries - exits;
  const expectedPhysical = initial + entries - exits;
  const countedValue = session.finalValue !== undefined && session.finalValue !== null 
    ? Number(session.finalValue) 
    : (session.closing_balance !== undefined && session.closing_balance !== null ? Number(session.closing_balance) : expectedPhysical);
  const difference = countedValue - expectedPhysical;

  // --- RESUMO FINANCEIRO ---
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[{ content: 'RESUMO FINANCEIRO', colSpan: 2, styles: { halign: 'left', fillColor: [40, 40, 40], textColor: [255, 255, 255] } }]],
    body: [
      ['Fundo Inicial', formatCurrency(initial)],
      ['Total de Entradas', formatCurrency(entries)],
      ['Total de Saídas', formatCurrency(exits)],
      ['Resultado Operacional (Entradas - Saídas)', formatCurrency(operationalResult)],
      ['Caixa Físico Esperado', formatCurrency(expectedPhysical)],
      ['Valor Contado no Caixa', formatCurrency(countedValue)],
      ['Diferença', `${difference > 0 ? '+' : ''}${formatCurrency(difference)}`]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 
      0: { fontStyle: 'bold', cellWidth: 100 }, 
      1: { halign: 'right', fontStyle: 'bold' } 
    },
    didParseCell: (data) => {
      // Destacar a linha de diferença e caixa esperado
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [240, 248, 240];
      }
      if (data.row.index === 6) {
        if (difference === 0) {
          data.cell.styles.textColor = [0, 120, 0];
        } else if (Math.abs(difference) <= 10) {
          data.cell.styles.textColor = [120, 120, 0];
        } else {
          data.cell.styles.textColor = [200, 0, 0];
        }
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // --- RECEBIMENTOS POR FORMA DE PAGAMENTO ---
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['RECEBIMENTOS POR FORMA DE PAGAMENTO', 'TOTAL']],
    body: [
      ['Dinheiro em Espécie', formatCurrency(totals.entriesByType['Dinheiro'] || 0)],
      ['Pix / Transferência', formatCurrency(totals.entriesByType['PIX'] || 0)],
      ['Cartão de Débito', formatCurrency(totals.entriesByType['Débito'] || 0)],
      ['Cartão de Crédito', formatCurrency(totals.entriesByType['Crédito'] || 0)],
      ['Link de Pagamento / Digital', formatCurrency(totals.entriesByType['Link'] || 0)]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'right' } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- DETALHAMENTO: PRODUTOS VENDIDOS ---
  const productsSold = sales.flatMap(s => (s.items || []).map(item => [
    item.productName || 'Produto',
    String(item.quantity),
    formatCurrency(item.price * item.quantity),
    s.paymentMethod || 'Dinheiro'
  ]));

  if (productsSold.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [{ content: 'DETALHAMENTO: PRODUTOS VENDIDOS', colSpan: 4, styles: { halign: 'left', fillColor: [60, 60, 60], textColor: [255, 255, 255] } }],
        ['Produto', 'Quantidade', 'Valor', 'Forma de Pagamento']
      ],
      body: productsSold,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 30 }, 3: { cellWidth: 35 } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // --- DETALHAMENTO: ORDENS DE SERVIÇO RECEBIDAS ---
  const osReceived = transactions.filter(t => t.type === 'entrada' && (t.osId || t.description?.toLowerCase().includes('os')));
  const osRows = osReceived.map(t => {
    const match = t.description?.match(/OS\s+(\d+)\s*-\s*([^()]+)/i);
    const osNumber = match ? match[1] : (t.osId || '---');
    const customerName = match ? match[2].trim() : '---';
    return [
      `OS #${osNumber}`,
      customerName,
      formatCurrency(t.value || 0),
      t.paymentMethod || 'Dinheiro'
    ];
  });

  if (osRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [{ content: 'DETALHAMENTO: ORDENS DE OS RECEBIDAS', colSpan: 4, styles: { halign: 'left', fillColor: [60, 60, 60], textColor: [255, 255, 255] } }],
        ['Número da OS', 'Cliente', 'Valor', 'Forma de Pagamento']
      ],
      body: osRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 'auto' }, 2: { halign: 'right', cellWidth: 30 }, 3: { cellWidth: 35 } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // --- DETALHAMENTO: RECEBIMENTOS AVULSOS ---
  const isOsPayment = (t: Transaction) => !!t.osId || t.description?.toLowerCase().includes('os');
  const isSale = (t: Transaction) => t.description?.startsWith('Venda #');
  const avulsos = transactions.filter(t => t.type === 'entrada' && !isOsPayment(t) && !isSale(t));
  const avulsosRows = avulsos.map(t => [
    t.description || 'Recebimento Avulso',
    formatCurrency(t.value || 0),
    t.paymentMethod || 'Dinheiro'
  ]);

  if (avulsosRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [{ content: 'DETALHAMENTO: RECEBIMENTOS AVULSOS', colSpan: 3, styles: { halign: 'left', fillColor: [60, 60, 60], textColor: [255, 255, 255] } }],
        ['Descrição', 'Valor', 'Forma de Pagamento']
      ],
      body: avulsosRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 30 }, 2: { cellWidth: 35 } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // --- DETALHAMENTO: RETIRADAS / SANGRIAS ---
  const retiradas = transactions.filter(t => t.type === 'saida');
  const retiradasRows = retiradas.map(t => [
    t.description || 'Retirada de caixa',
    formatCurrency(t.value || 0)
  ]);

  if (retiradasRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [{ content: 'DETALHAMENTO: RETIRADAS / SANGRIAS', colSpan: 2, styles: { halign: 'left', fillColor: [60, 60, 60], textColor: [255, 255, 255] } }],
        ['Descrição', 'Valor']
      ],
      body: retiradasRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 30 } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // --- FATURAMENTO TOTAL DO DIA (Destaque Visual) ---
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: [
      ['FATURAMENTO TOTAL DO DIA', formatCurrency(entries)]
    ],
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: 5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // --- SIGNATURES ---
  const footerY = Math.min(265, doc.internal.pageSize.height - 25);
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
    doc.text(`Auditoria Servyx - Página ${i} de ${totalPages} - Documento Oficial de Caixa`, pageWidth / 2, doc.internal.pageSize.height - 8, { align: 'center' });
  }

  doc.save(`Relatorio_Caixa_${session.date}.pdf`);
};

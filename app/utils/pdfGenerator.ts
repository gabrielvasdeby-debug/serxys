import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, CashSession } from '../components/CaixaModule';

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
  totals: Totals
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text('SERVYX', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Relatório de Caixa - ${new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR')}`, 14, 28);
  doc.line(14, 32, pageWidth - 14, 32);

  // General Info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES GERAIS', 14, 42);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Data: ${new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR')}`, 14, 50);
  doc.text(`Abertura: ${session.openingTime}`, 14, 56);
  doc.text(`Fechamento: ${session.closingTime || 'N/A'}`, 14, 62);
  doc.text(`Responsável: ${session.openingUserName}`, 14, 68);

  // Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DO CAIXA', 14, 80);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Troco Inicial: ${formatCurrency(totals.initial)}`, 14, 88);
  doc.text(`Entradas Totais: ${formatCurrency(totals.entries)}`, 14, 94);
  doc.text(`Saídas Totais: ${formatCurrency(totals.exits)}`, 14, 100);
  doc.setFont('helvetica', 'bold');
  doc.text(`Saldo Geral (Entradas - Saídas): ${formatCurrency(totals.balance)}`, 14, 106);

  // Cash in Hand (Highlighted)
  doc.setFillColor(240, 240, 240);
  doc.rect(14, 114, pageWidth - 28, 20, 'F');
  doc.setFontSize(12);
  doc.setTextColor(0, 100, 0);
  doc.text('DINHEIRO EM CAIXA (VALOR REAL)', 20, 122);
  doc.setFontSize(14);
  doc.text(formatCurrency(totals.cashInHand), 20, 130);
  doc.setTextColor(0, 0, 0);

  // Summary by Payment Method
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO POR FORMA DE PAGAMENTO', 14, 146);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Dinheiro: ${formatCurrency(totals.entriesByType['Dinheiro'] || 0)}`, 14, 154);
  doc.text(`PIX: ${formatCurrency(totals.entriesByType['PIX'] || 0)}`, 14, 160);
  doc.text(`Cartão: ${formatCurrency(totals.entriesByType['Cartão'] || 0)}`, 14, 166);
  doc.text(`Outros: ${formatCurrency(totals.entriesByType['Transferência'] || 0)}`, 14, 172);

  // Reconciliation
  if (session.status === 'closed') {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFERÊNCIA DE CAIXA', 14, 184);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Valor Esperado: ${formatCurrency(session.expectedValue || 0)}`, 14, 192);
    doc.text(`Valor Informado: ${formatCurrency(session.finalValue || 0)}`, 14, 198);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(session.difference === 0 ? 0 : 200, 0, 0);
    doc.text(`Diferença: ${formatCurrency(session.difference || 0)}`, 14, 204);
    doc.setTextColor(0, 0, 0);
  }

  // Detailed Entries
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHAMENTO DE ENTRADAS', 14, 20);
  
  const entryData = transactions
    .filter(t => t.type === 'entrada')
    .map(t => [
      `${t.time}`,
      t.description,
      t.paymentMethod,
      formatCurrency(t.value)
    ]);

  autoTable(doc, {
    startY: 25,
    head: [['Hora', 'Descrição', 'Pagamento', 'Valor']],
    body: entryData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] }
  });

  // Detailed Exits
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 30;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHAMENTO DE SAÍDAS', 14, finalY + 15);

  const exitData = transactions
    .filter(t => t.type === 'saida')
    .map(t => [
      `${t.time}`,
      t.description,
      formatCurrency(t.value)
    ]);

  autoTable(doc, {
    startY: finalY + 20,
    head: [['Hora', 'Descrição', 'Valor']],
    body: exitData,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] }
  });

  // Save the PDF
  doc.save(`Relatorio_Caixa_${session.date}.pdf`);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

'use client';

import type { ReactElement } from 'react';

export interface SharePDFOptions {
  width?: number;
  scale?: number;
  renderDelay?: number;
  forceShowOnly?: boolean;
}

export async function generateAndSharePDF(
  templateElement: ReactElement,
  filename: string,
  onShowToast: (msg: string) => void,
  opts: SharePDFOptions = {}
): Promise<void> {
  const { width = 794, scale = 1.5, renderDelay = 1200, forceShowOnly = true } = opts;

  // 1. Off-screen container (On-screen but hidden behind content to prevent mobile viewport culling)
  const offscreen = document.createElement('div');
  offscreen.style.cssText = `position:absolute;top:0;left:0;width:${width}px;background:#ffffff;z-index:-9999;pointer-events:none;overflow:hidden;`;
  document.body.appendChild(offscreen);

  try {
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(offscreen);
    root.render(templateElement);

    // Wait for rendering and images to fully paint
    await new Promise<void>((resolve) => setTimeout(resolve, renderDelay));

    // 2. Capture with html-to-image
    const { toJpeg } = await import('html-to-image');
    
    const imgData = await toJpeg(offscreen, {
      quality: 0.9,
      backgroundColor: '#ffffff',
      width: width,
      pixelRatio: scale,
      skipFonts: true, // Prevents hanging on font CORS issues
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });

    root.unmount();

    // 3. Build PDF
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    if (!isFinite(pdfHeight) || pdfHeight <= 0) throw new Error('Tamanho de imagem inválido');

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    // 4. Action: Show or Share
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && forceShowOnly) {
      // Create a temporary link and click it to open in new tab
      // Some mobile browsers block window.open, but clicking a link is usually allowed.
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.click();
      onShowToast('PDF aberto com sucesso!');
    } else if (!isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' })] })) {
      const file = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });
      try {
        await navigator.share({ files: [file], title: filename, text: `Segue o documento: ${filename}` });
      } catch (shareError: any) {
        if (shareError.name !== 'AbortError') {
          window.open(url, '_blank');
        }
      }
    } else {
      // Fallback: Download/Open
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      a.click();
      onShowToast('PDF gerado com sucesso!');
    }
  } catch (error: any) {
    console.error('Erro na geração do PDF:', error);
    throw error;
  } finally {
    if (document.body.contains(offscreen)) document.body.removeChild(offscreen);
  }
}

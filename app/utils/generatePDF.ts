'use client';

import type { ReactElement } from 'react';

export interface SharePDFOptions {
  width?: number;
  scale?: number;
  renderDelay?: number;
  forceShowOnly?: boolean;
}

/**
 * Waits for all <img> elements inside a container to finish loading.
 * This is critical for base64 signature images which need a paint cycle to appear.
 */
function waitForImages(container: HTMLElement, timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length === 0) {
      resolve();
      return;
    }
    let loaded = 0;
    const timer = setTimeout(resolve, timeout); // Safety timeout
    const onLoad = () => {
      loaded++;
      if (loaded >= imgs.length) {
        clearTimeout(timer);
        resolve();
      }
    };
    imgs.forEach((img) => {
      if (img.complete) {
        onLoad();
      } else {
        img.addEventListener('load', onLoad, { once: true });
        img.addEventListener('error', onLoad, { once: true }); // Also resolve on error
      }
    });
  });
}

export async function generatePDFData(
  templateElement: ReactElement,
  opts: SharePDFOptions = {}
): Promise<{ pdfBlob: Blob; url: string; imgData: string }> {
  const { width = 794, scale = 2, renderDelay = 800 } = opts;

  // 1. Off-screen container (visible but behind content via z-index)
  const offscreen = document.createElement('div');
  offscreen.style.cssText = `position:fixed;top:0;left:0;width:${width}px;background:#ffffff;z-index:-9999;pointer-events:none;`;
  document.body.appendChild(offscreen);

  try {
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(offscreen);
    root.render(templateElement);

    // Wait for React to paint the component
    await new Promise<void>((resolve) => setTimeout(resolve, renderDelay));

    // Wait for all images (including base64 signatures) to fully render
    await waitForImages(offscreen);

    // 2. Capture with html-to-image
    const { toJpeg } = await import('html-to-image');

    const imgData = await toJpeg(offscreen, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      width: width,
      pixelRatio: scale,
      skipFonts: true, // Prevents hanging on font CORS issues
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
        overflow: 'visible',
      },
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

    return { pdfBlob, url, imgData };
  } catch (error: any) {
    console.error('Erro na geração do PDF:', error);
    throw error;
  } finally {
    if (document.body.contains(offscreen)) document.body.removeChild(offscreen);
  }
}

export async function generateAndSharePDF(
  templateElement: ReactElement,
  filename: string,
  onShowToast: (msg: string) => void,
  opts: SharePDFOptions = {}
): Promise<void> {
  const { forceShowOnly = true } = opts;

  try {
    const { pdfBlob, url } = await generatePDFData(templateElement, opts);

    // 4. Action: Show or Share
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && forceShowOnly) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.click();
      onShowToast('PDF aberto com sucesso!');
    } else if (
      !isMobile &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' })] })
    ) {
      const file = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });
      try {
        await navigator.share({ files: [file], title: filename, text: `Segue o documento: ${filename}` });
      } catch (shareError: any) {
        if (shareError.name !== 'AbortError') {
          window.open(url, '_blank');
        }
      }
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      a.click();
      onShowToast('PDF gerado com sucesso!');
    }
  } catch (error: any) {
    console.error('Erro no generateAndSharePDF:', error);
    throw error;
  }
}

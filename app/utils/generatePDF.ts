'use client';

import type { ReactElement } from 'react';

/**
 * Converts an oklch() color value to rgb() for html2canvas compatibility.
 * html2canvas does not support modern CSS color spaces like oklch.
 */
function oklchToRgbString(l: number, c: number, h: number, alpha?: number): string {
  // oklch -> oklab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // oklab -> linear rgb (official matrix)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;

  let r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let bv = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;

  // linear rgb -> srgb gamma
  const toSrgb = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

  r = Math.round(Math.max(0, Math.min(1, toSrgb(r))) * 255);
  g = Math.round(Math.max(0, Math.min(1, toSrgb(g))) * 255);
  bv = Math.round(Math.max(0, Math.min(1, toSrgb(bv))) * 255);

  if (alpha !== undefined) return `rgba(${r}, ${g}, ${bv}, ${alpha})`;
  return `rgb(${r}, ${g}, ${bv})`;
}

/**
 * Processes a cloned document to replace oklch() colors with rgb() equivalents
 * so that html2canvas can parse them without errors.
 */
function fixOklchColors(clonedDoc: Document) {
  const oklchRegex =
    /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g;

  const replace = (text: string) =>
    text.replace(oklchRegex, (_match, l, c, h, alpha) => {
      try {
        const L = parseFloat(l) > 1 ? parseFloat(l) / 100 : parseFloat(l);
        const C = parseFloat(c);
        const H = parseFloat(h);
        const A = alpha
          ? alpha.endsWith('%')
            ? parseFloat(alpha) / 100
            : parseFloat(alpha)
          : undefined;
        return oklchToRgbString(L, C, H, A);
      } catch {
        return 'rgb(0,0,0)';
      }
    });

  // Process inline <style> elements
  clonedDoc.querySelectorAll('style').forEach((el) => {
    if (el.textContent?.includes('oklch')) {
      el.textContent = replace(el.textContent);
    }
  });
}

export interface SharePDFOptions {
  /** Width of the A4 template in pixels (default: 794) */
  width?: number;
  /** html2canvas scale factor (default: 1.5) */
  scale?: number;
  /** Delay in ms to wait for React to render (default: 800) */
  renderDelay?: number;
}

/**
 * Renders a React element into an off-screen div, captures it with html2canvas,
 * generates a PDF, and shares it via the Web Share API (or downloads as fallback).
 */
export async function generateAndSharePDF(
  templateElement: ReactElement,
  filename: string,
  onShowToast: (msg: string) => void,
  opts: SharePDFOptions = {}
): Promise<void> {
  const { width = 794, scale = 1.5, renderDelay = 800 } = opts;

  // 1. Off-screen container — always visible to html2canvas
  const offscreen = document.createElement('div');
  offscreen.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    `width:${width}px`,
    'background:#ffffff',
    'z-index:-1',
    'overflow:visible',
  ].join(';');
  document.body.appendChild(offscreen);

  const { createRoot } = await import('react-dom/client');
  const root = createRoot(offscreen);
  root.render(templateElement);

  // 2. Wait for React + images to finish rendering
  await new Promise<void>((resolve) => setTimeout(resolve, renderDelay));

  try {
    // 3. Capture with html2canvas, fixing oklch on clone
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(offscreen, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => fixOklchColors(clonedDoc),
    });

    // 4. Generate PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (!isFinite(pdfHeight) || pdfHeight <= 0) {
      throw new Error('Tamanho de imagem inválido');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const pdfBlob = pdf.output('blob');
    const file = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });

    // 5. Share or download
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename, text: `Segue o documento: ${filename}` });
      } catch (shareError: any) {
        if (shareError.name !== 'AbortError') throw shareError;
      }
    } else {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('PDF baixado com sucesso!');
    }
  } finally {
    root.unmount();
    if (document.body.contains(offscreen)) {
      document.body.removeChild(offscreen);
    }
  }
}

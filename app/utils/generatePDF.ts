'use client';

import type { ReactElement } from 'react';

// ─── oklch → rgb math ────────────────────────────────────────────────────────

function oklchToRgbString(l: number, c: number, h: number, alpha?: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;

  let r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let bv = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;

  const toSrgb = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

  r = Math.round(Math.max(0, Math.min(1, toSrgb(r))) * 255);
  g = Math.round(Math.max(0, Math.min(1, toSrgb(g))) * 255);
  bv = Math.round(Math.max(0, Math.min(1, toSrgb(bv))) * 255);

  if (alpha !== undefined && alpha < 1) return `rgba(${r}, ${g}, ${bv}, ${alpha})`;
  return `rgb(${r}, ${g}, ${bv})`;
}

function convertOklchInString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('oklch')) return str;

  return str.replace(
    /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g,
    (_m, l, c, h, alpha) => {
      try {
        const L = parseFloat(l) > 1 ? parseFloat(l) / 100 : parseFloat(l);
        const C = parseFloat(c);
        const H = parseFloat(h);
        const A = alpha
          ? alpha.endsWith('%') ? parseFloat(alpha) / 100 : parseFloat(alpha)
          : undefined;
        return oklchToRgbString(L, C, H, A);
      } catch (_e) {
        return 'rgb(0,0,0)';
      }
    }
  );
}

// ─── Pre-process ALL document stylesheets before html2canvas sees them ────────

function buildOklchOverrideStyle(): HTMLStyleElement | null {
  const lines: string[] = [];

  try {
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules).forEach((rule) => {
          if (rule.cssText.includes('oklch')) {
            lines.push(convertOklchInString(rule.cssText));
          }
        });
      } catch (_e) {
        // Cross-origin sheet, skip
      }
    });
  } catch (_e) {
    return null;
  }

  if (lines.length === 0) return null;

  const el = document.createElement('style');
  el.id = '__pdf-oklch-override';
  el.textContent = lines.join('\n');
  return el;
}

// ─── html2canvas onclone fallback (also fixes cloned doc) ────────────────────

function fixOklchInClone(clonedDoc: Document) {
  // 1. Fix all style tags in the clone
  clonedDoc.querySelectorAll('style').forEach((el) => {
    if (el.textContent?.includes('oklch')) {
      el.textContent = convertOklchInString(el.textContent);
    }
  });

  // 2. Force-replace oklch in all element inline styles in the clone
  const all = clonedDoc.querySelectorAll('*');
  all.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style) {
      for (let i = 0; i < htmlEl.style.length; i++) {
        const prop = htmlEl.style[i];
        const val = htmlEl.style.getPropertyValue(prop);
        if (val && val.includes('oklch')) {
          htmlEl.style.setProperty(prop, convertOklchInString(val));
        }
      }
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

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

  // 1. Off-screen container
  const offscreen = document.createElement('div');
  offscreen.style.cssText = `position:fixed;left:-9999px;top:0;width:${width}px;background:#ffffff;z-index:-1;overflow:visible;`;
  document.body.appendChild(offscreen);

  // 2. Inject override style to document head
  const overrideStyle = buildOklchOverrideStyle();
  if (overrideStyle) document.head.appendChild(overrideStyle);

  try {
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(offscreen);
    root.render(templateElement);

    // Wait for rendering and images
    await new Promise<void>((resolve) => setTimeout(resolve, renderDelay));

    // 3. Capture with html2canvas
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(offscreen, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => fixOklchInClone(clonedDoc),
    });

    root.unmount();

    // 4. Build PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (!isFinite(pdfHeight) || pdfHeight <= 0) throw new Error('Tamanho de imagem inválido');

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    // 5. Action: Show or Share
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && forceShowOnly) {
      // Open in new tab/window
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
    if (overrideStyle && document.head.contains(overrideStyle)) document.head.removeChild(overrideStyle);
  }
}

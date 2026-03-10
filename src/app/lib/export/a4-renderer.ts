/**
 * A4 Renderer.
 * Client-side A4 page capture using html-to-image and jsPDF.
 * Renders the newsletter into A4-sized pages at 2× scale for high quality.
 *
 * Key design:
 *   - Uses the SAME CSS + HTML pipeline as the web export, but with
 *     A4-specific overrides so the output closely matches the live preview canvas.
 *   - Google Fonts are fetched as raw CSS text and injected as inline <style>
 *     to avoid CORS SecurityError when html-to-image reads cssRules.
 *   - An isolated CSS reset prevents Tailwind / host-page styles from leaking.
 */
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import type { Section } from '../editor-types';
import type { ThemeConfig } from '../types';
import { generateWebHtml } from './web-renderer';
import { generateWebCss } from './css-generator';

// A4 at 96 dpi = 794 × 1123 px.
// The newsletter content is designed for ~600 px max-width, so we centre it
// inside the A4 page with realistic print margins.
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const SCALE = 2; // 2× for retina-quality output

// Horizontal margin so the 600 px newsletter is centred on the A4 page
const PAGE_MARGIN_X = 40; // px each side  →  content area = 794 − 80 = 714 px (newsletter centres inside)
const PAGE_MARGIN_TOP = 32;

export type A4Format = 'png' | 'jpg' | 'pdf';

interface A4RenderOptions {
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
  format: A4Format;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Fetch a Google Fonts CSS URL and return the raw CSS text.
 * Note: the `User-Agent` header is a forbidden header in browsers, so the
 * browser sends its own UA — Google will still return valid woff2 @font-face
 * rules for modern browsers.
 */
async function fetchFontCss(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Wait for all <img> elements inside `container` to finish loading and for
 * the document font set to be ready, with an overall timeout.
 */
async function waitForReady(container: HTMLElement, timeout: number): Promise<void> {
  const images = container.querySelectorAll('img');
  const imgPromises = Array.from(images).map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) resolve();
        else { img.onload = () => resolve(); img.onerror = () => resolve(); }
      }),
  );

  const fontPromise = document.fonts?.ready ?? Promise.resolve();

  await Promise.race([
    Promise.all([...imgPromises, fontPromise]),
    new Promise<void>((r) => setTimeout(r, timeout)),
  ]);

  // Extra tick for paint
  await new Promise((r) => setTimeout(r, 300));
}

/**
 * Generate a minimal CSS reset that prevents any inherited host-page (e.g.
 * Tailwind preflight) styles from leaking into the off-screen render container.
 */
function isolationReset(): string {
  return `
    /* ── Isolation reset ─────────────────── */
    .a4-render-root,
    .a4-render-root *,
    .a4-render-root *::before,
    .a4-render-root *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      border: 0;
      font-size: 100%;
      font: inherit;
      vertical-align: baseline;
      line-height: inherit;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .a4-render-root img { display: block; max-width: 100%; height: auto; border: 0; }
    .a4-render-root a { color: inherit; text-decoration: none; }
    .a4-render-root ul, .a4-render-root ol { list-style: none; }
    .a4-render-root h1, .a4-render-root h2, .a4-render-root h3,
    .a4-render-root h4, .a4-render-root h5, .a4-render-root h6 {
      font-size: inherit;
      font-weight: inherit;
    }
  `;
}

// ── Main entry ──────────────────────────────────────────────────────

export async function renderA4(options: A4RenderOptions): Promise<Blob> {
  const { title, sections, theme, darkMode, format } = options;

  // 1. Generate newsletter body HTML (no <html>/<head> wrapper)
  const bodyHtml = generateWebHtml({
    title,
    sections,
    theme,
    darkMode,
    includeWrapper: false,
  });

  // 2. Generate stylesheet — skip @import (we inline fonts separately),
  //    and request A4-specific overrides.
  const css = generateWebCss(theme, darkMode, { skipFontImports: true, a4Mode: true });

  // 3. Determine page & newsletter background colors
  const pageBg = darkMode ? '#111827' : '#f0f0f0';
  const newsletterBg = darkMode ? '#1a1a2e' : (theme.background_color || '#f4efe5');

  // ── Build off-screen container ────────────────────────────────────

  const container = document.createElement('div');
  container.className = 'a4-render-root';
  Object.assign(container.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    zIndex: '-9999',
    width: `${A4_WIDTH_PX}px`,
    minHeight: `${A4_HEIGHT_PX}px`,
    backgroundColor: pageBg,
    overflow: 'visible',
    fontFamily: `'${theme.font_family || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    fontSize: '14px',
    lineHeight: '1.6',
    color: darkMode ? '#e0e0e0' : (theme.text_color || '#000'),
  });
  document.body.appendChild(container);

  // 3a. Inject isolation reset + newsletter styles
  const styleEl = document.createElement('style');
  styleEl.textContent = isolationReset() + '\n' + css;
  container.appendChild(styleEl);

  // 3b. Fetch & inject Google Fonts as inline <style>
  const fontFamily = theme.font_family || 'Inter';
  const fontUrls = [
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`,
    `https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap`,
  ];
  const fontTexts = await Promise.all(fontUrls.map(fetchFontCss));
  const combinedFontCss = fontTexts.filter(Boolean).join('\n');
  if (combinedFontCss) {
    const fontStyle = document.createElement('style');
    fontStyle.textContent = combinedFontCss;
    container.appendChild(fontStyle);
  }

  // 3c. Create the page wrapper (margins + centered newsletter)
  const pageWrapper = document.createElement('div');
  Object.assign(pageWrapper.style, {
    padding: `${PAGE_MARGIN_TOP}px ${PAGE_MARGIN_X}px`,
    minHeight: `${A4_HEIGHT_PX}px`,
  });
  container.appendChild(pageWrapper);

  // 3d. Create newsletter card (shadow + rounded to match preview)
  const card = document.createElement('div');
  Object.assign(card.style, {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: newsletterBg,
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    fontFamily: `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  });
  card.innerHTML = bodyHtml;
  pageWrapper.appendChild(card);

  // 4. Wait for images + fonts
  await waitForReady(container, 4000);

  try {
    if (format === 'pdf') {
      return await capturePdf(container, title, pageBg);
    } else if (format === 'jpg') {
      return await captureImage(container, 'jpeg', pageBg);
    } else {
      return await captureImage(container, 'png', pageBg);
    }
  } finally {
    document.body.removeChild(container);
  }
}

// ── Capture functions ───────────────────────────────────────────────

async function captureImage(
  container: HTMLElement,
  type: 'png' | 'jpeg',
  bgColor: string,
): Promise<Blob> {
  const actualHeight = Math.max(container.scrollHeight, A4_HEIGHT_PX);

  const opts = {
    width: A4_WIDTH_PX,
    height: actualHeight,
    pixelRatio: SCALE,
    quality: type === 'jpeg' ? 0.92 : undefined,
    backgroundColor: bgColor,
    skipFonts: true,
    // Override the cloned node's position so it renders inside the SVG
    // foreignObject viewport (cloneCSSStyle copies position:fixed;left:-99999px).
    style: {
      position: 'static' as const,
      left: 'auto',
      top: 'auto',
      zIndex: 'auto',
      transform: 'none',
      transformOrigin: 'top left',
    },
  };

  const dataUrl = type === 'jpeg'
    ? await toJpeg(container, opts)
    : await toPng(container, opts);

  const res = await fetch(dataUrl);
  return res.blob();
}

async function capturePdf(
  container: HTMLElement,
  title: string,
  bgColor: string,
): Promise<Blob> {
  const actualHeight = Math.max(container.scrollHeight, A4_HEIGHT_PX);

  // Capture the full-length newsletter as a single high-res PNG
  const dataUrl = await toPng(container, {
    width: A4_WIDTH_PX,
    height: actualHeight,
    pixelRatio: SCALE,
    backgroundColor: bgColor,
    skipFonts: true,
    style: {
      position: 'static' as const,
      left: 'auto',
      top: 'auto',
      zIndex: 'auto',
      transform: 'none',
      transformOrigin: 'top left',
    },
  });

  // A4 in mm
  const pdfW = 210;
  const pdfH = 297;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Determine how tall the image is when scaled to pdfW mm
  const imgHeightMm = (actualHeight / A4_WIDTH_PX) * pdfW;

  if (imgHeightMm <= pdfH) {
    // Fits on one page — add background fill, then the image
    pdf.setFillColor(bgColor);
    pdf.rect(0, 0, pdfW, pdfH, 'F');
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, imgHeightMm);
  } else {
    // Multi-page: tile the image across pages with proper clipping
    const totalPages = Math.ceil(imgHeightMm / pdfH);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Background fill for this page
      pdf.setFillColor(bgColor);
      pdf.rect(0, 0, pdfW, pdfH, 'F');

      // Position the full image so the correct page-slice is visible.
      // jsPDF clips to the page bounds automatically.
      const yOffset = -(page * pdfH);
      pdf.addImage(dataUrl, 'PNG', 0, yOffset, pdfW, imgHeightMm);
    }
  }

  pdf.setProperties({
    title: title || 'Newsletter',
    creator: 'Tech Tribune Builder',
  });

  return pdf.output('blob');
}

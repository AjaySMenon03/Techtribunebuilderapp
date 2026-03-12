/**
 * A4 DOM Renderer — pixel-perfect A4 capture.
 *
 * Instead of regenerating HTML from a separate pipeline, this module renders
 * the *exact same* React `SectionPreview` components used in the live preview
 * canvas.  It mounts them into a hidden off-screen container via
 * `ReactDOM.createRoot`, waits for the React commit + images + fonts, then
 * captures with `html-to-image` (and optionally converts to PDF via jsPDF).
 *
 * The result is a 100 % WYSIWYG match with the editor preview.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import type { Section } from '../editor-types';
import { applyDarkModeToSection } from '../editor-types';
import type { ThemeConfig } from '../types';
import { SectionPreview } from '../../components/editor/section-previews';
import { useEditorStore } from '../editor-store';

// ── A4 layout constants ────────────────────────────────────────────
// 96 dpi → 210 mm × 297 mm → 794 × 1123 px
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
const SCALE = 2;
const PAGE_PAD_X = 48;
const PAGE_PAD_Y = 40;
const NEWSLETTER_MAX_W = 600; // matches the live preview

// Typography constants for consistent rendering
const BASE_FONT_SIZE = 14;
const BASE_LINE_HEIGHT = 1.6;

export type A4Format = 'png' | 'jpg' | 'pdf';

export interface A4DomRenderOptions {
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Wait for the React tree to commit by waiting for two animation frames. */
function waitForCommit(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/** Wait for every <img> inside `el` to finish loading + document font set. */
async function waitForAssets(el: HTMLElement, timeout = 5000): Promise<void> {
  const imgs = el.querySelectorAll('img');
  const imgPs = Array.from(imgs).map(
    (img) =>
      new Promise<void>((res) => {
        if (img.complete && img.naturalWidth > 0) return res();
        img.onload = () => res();
        img.onerror = () => res();
      }),
  );
  const fontP = document.fonts?.ready ?? Promise.resolve();

  await Promise.race([
    Promise.all([...imgPs, fontP]),
    new Promise<void>((r) => setTimeout(r, timeout)),
  ]);

  // One extra repaint tick
  await new Promise((r) => setTimeout(r, 250));
}

/** Build the effective theme for dark mode (mirrors PreviewCanvas logic). */
function effectiveTheme(theme: ThemeConfig, dark: boolean): ThemeConfig {
  if (!dark) return theme;
  return {
    ...theme,
    background_color: '#1a1a2e',
    card_color: '#16213e',
    text_color: '#e0e0e0',
    accent_color: theme.accent_color === '#000000' ? '#ffffff' : theme.accent_color,
  };
}

// ── The headless React tree we render off-screen ────────────────────

interface OffscreenNewsletterProps {
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
}

function OffscreenNewsletter({ sections, theme, darkMode }: OffscreenNewsletterProps) {
  const et = effectiveTheme(theme, darkMode);
  const pageBg = darkMode ? '#111827' : '#f0f0f0';

  const visible = sections
    .filter((s) => s.visible)
    .map((s) => applyDarkModeToSection(s, darkMode));

  return (
    <div
      style={{
        width: A4_WIDTH,
        minHeight: A4_HEIGHT,
        backgroundColor: pageBg,
        padding: `${PAGE_PAD_Y}px ${PAGE_PAD_X}px`,
        fontFamily: `'${et.font_family || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
        fontSize: BASE_FONT_SIZE,
        lineHeight: BASE_LINE_HEIGHT,
        color: et.text_color,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale' as any,
      }}
    >
      {/* Global styles for rich text rendering */}
      <style>{`
        /* Rich text elements - Project Update */
        .project-update-content p {
          margin: 0 0 8px 0;
          line-height: ${BASE_LINE_HEIGHT};
          font-size: 14px;
        }
        .project-update-content p:last-child {
          margin-bottom: 0;
        }
        .project-update-content ul,
        .project-update-content ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        .project-update-content ul:last-child,
        .project-update-content ol:last-child {
          margin-bottom: 0;
        }
        .project-update-content ul {
          list-style-type: disc;
        }
        .project-update-content ol {
          list-style-type: decimal;
        }
        .project-update-content li {
          margin: 0 0 4px 0;
          line-height: ${BASE_LINE_HEIGHT};
          font-size: 14px;
        }
        .project-update-content li:last-child {
          margin-bottom: 0;
        }
        .project-update-content li p {
          margin: 0;
        }
        .project-update-content h1,
        .project-update-content h2,
        .project-update-content h3 {
          margin: 12px 0 8px 0;
          line-height: 1.3;
        }
        .project-update-content h1:first-child,
        .project-update-content h2:first-child,
        .project-update-content h3:first-child {
          margin-top: 0;
        }
        .project-update-content a {
          color: inherit;
          text-decoration: underline;
        }
        .project-update-content strong {
          font-weight: 700;
        }
        .project-update-content em {
          font-style: italic;
        }
        .project-update-content u {
          text-decoration: underline;
        }
        .project-update-content blockquote {
          border-left: 3px solid currentColor;
          padding-left: 16px;
          margin: 8px 0;
          opacity: 0.8;
        }
        
        /* Rich text elements - Comic caption */
        .comic-caption p {
          margin: 0 0 8px 0;
          line-height: ${BASE_LINE_HEIGHT};
          font-size: 14px;
        }
        .comic-caption p:last-child {
          margin-bottom: 0;
        }
        .comic-caption ul,
        .comic-caption ol {
          margin: 8px 0;
          padding-left: 24px;
          text-align: left;
        }
        .comic-caption ul:last-child,
        .comic-caption ol:last-child {
          margin-bottom: 0;
        }
        .comic-caption ul {
          list-style-type: disc;
        }
        .comic-caption ol {
          list-style-type: decimal;
        }
        .comic-caption li {
          margin: 0 0 4px 0;
          line-height: ${BASE_LINE_HEIGHT};
          font-size: 14px;
        }
        .comic-caption li:last-child {
          margin-bottom: 0;
        }
        .comic-caption li p {
          margin: 0;
        }
        .comic-caption a {
          color: inherit;
          text-decoration: underline;
        }
        .comic-caption strong {
          font-weight: 700;
        }
        .comic-caption em {
          font-style: italic;
        }
        .comic-caption u {
          text-decoration: underline;
        }
        
        /* Rich text elements - Appreciation message */
        .appreciation-message p {
          margin: 0 0 4px 0;
          line-height: 1.5;
          font-size: 12px;
        }
        .appreciation-message p:last-child {
          margin-bottom: 0;
        }
        .appreciation-message ul,
        .appreciation-message ol {
          margin: 4px 0;
          padding-left: 20px;
          text-align: left;
        }
        .appreciation-message ul:last-child,
        .appreciation-message ol:last-child {
          margin-bottom: 0;
        }
        .appreciation-message ul {
          list-style-type: disc;
        }
        .appreciation-message ol {
          list-style-type: decimal;
        }
        .appreciation-message li {
          margin: 0 0 2px 0;
          line-height: 1.5;
          font-size: 12px;
        }
        .appreciation-message li:last-child {
          margin-bottom: 0;
        }
        .appreciation-message li p {
          margin: 0;
        }
        .appreciation-message a {
          color: inherit;
          text-decoration: underline;
        }
        .appreciation-message strong {
          font-weight: 700;
        }
        .appreciation-message em {
          font-style: italic;
        }
        .appreciation-message u {
          text-decoration: underline;
        }
        .appreciation-message blockquote {
          border-left: 2px solid currentColor;
          padding-left: 12px;
          margin: 4px 0;
          opacity: 0.8;
        }
        
        /* Rich text elements - Footer */
        .footer-content p {
          margin: 0 0 8px 0;
          line-height: 1.625;
          font-size: 14px;
        }
        .footer-content p:last-child {
          margin-bottom: 0;
        }
        .footer-content ul,
        .footer-content ol {
          margin: 8px 0;
          padding-left: 24px;
          text-align: left;
        }
        .footer-content ul:last-child,
        .footer-content ol:last-child {
          margin-bottom: 0;
        }
        .footer-content ul {
          list-style-type: disc;
        }
        .footer-content ol {
          list-style-type: decimal;
        }
        .footer-content li {
          margin: 0 0 4px 0;
          line-height: 1.625;
          font-size: 14px;
        }
        .footer-content li:last-child {
          margin-bottom: 0;
        }
        .footer-content li p {
          margin: 0;
        }
        .footer-content a {
          color: inherit;
          text-decoration: underline;
        }
        .footer-content strong {
          font-weight: 700;
        }
        .footer-content em {
          font-style: italic;
        }
        .footer-content u {
          text-decoration: underline;
        }
        .footer-content blockquote {
          border-left: 3px solid currentColor;
          padding-left: 16px;
          margin: 8px 0;
          opacity: 0.8;
        }
        
        /* Ensure font inheritance */
        * {
          font-family: inherit;
        }
      `}</style>
      
      {/* Newsletter card — matches preview-canvas.tsx */}
      <div
        style={{
          maxWidth: NEWSLETTER_MAX_W,
          margin: '0 auto',
          backgroundColor: et.background_color,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          fontFamily: `'${et.font_family || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
        }}
      >
        {visible.map((section) => (
          <SectionPreview
            key={section.id}
            section={section}
            theme={et}
            selected={false}
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Mount the preview React tree off-screen, wait for assets, capture to a
 * data URL string.  The caller is responsible for deciding what to do with
 * the resulting data URL (show preview, convert to PDF, etc.).
 *
 * Returns `{ dataUrl, cleanup }`.  Call `cleanup()` when done — it unmounts
 * the React tree and removes the container from the DOM.
 */
export async function renderA4ToDataUrl(
  options: A4DomRenderOptions,
  format: 'png' | 'jpeg' = 'png',
  onProgress?: (step: string) => void,
): Promise<{ dataUrl: string; containerHeight: number; cleanup: () => void }> {
  const { sections, theme, darkMode } = options;

  onProgress?.('Preparing render…');

  // 1. Off-screen host
  const host = document.createElement('div');
  host.id = '__a4-dom-render-host';
  Object.assign(host.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    zIndex: '-9999',
    width: `${A4_WIDTH}px`,
    overflow: 'visible',
  });
  document.body.appendChild(host);

  // 2. Mount the React tree asynchronously.
  //    Temporarily force previewMode='desktop' so SectionPreview components
  //    use desktop layout (not mobile).
  const root = createRoot(host);
  const prevMode = useEditorStore.getState().previewMode;
  useEditorStore.setState({ previewMode: 'desktop' });

  root.render(
    <OffscreenNewsletter sections={sections} theme={theme} darkMode={darkMode} />,
  );

  // Wait for React to commit the tree (two rAF frames ensure the commit
  // has flushed to the DOM without needing flushSync).
  await waitForCommit();

  // Restore the original preview mode
  useEditorStore.setState({ previewMode: prevMode });

  // 3. Wait for images + fonts
  onProgress?.('Loading assets…');
  await waitForAssets(host, 5000);

  // 4. Capture
  onProgress?.('Capturing…');
  const captureTarget = host.firstElementChild as HTMLElement;
  const actualH = Math.max(captureTarget.scrollHeight, A4_HEIGHT);

  const pageBg = darkMode ? '#111827' : '#f0f0f0';

  const opts = {
    width: A4_WIDTH,
    height: actualH,
    pixelRatio: SCALE,
    quality: format === 'jpeg' ? 0.92 : undefined,
    backgroundColor: pageBg,
    skipFonts: true,
    cacheBust: true,
    style: {
      position: 'static' as const,
      left: 'auto',
      top: 'auto',
      zIndex: 'auto',
      transform: 'none',
      transformOrigin: 'top left',
    },
  };

  const dataUrl = format === 'jpeg'
    ? await toJpeg(captureTarget, opts)
    : await toPng(captureTarget, opts);

  const cleanup = () => {
    root.unmount();
    host.remove();
  };

  return { dataUrl, containerHeight: actualH, cleanup };
}

/**
 * Render + capture → Blob (PNG or JPG).
 */
export async function captureA4Image(
  options: A4DomRenderOptions,
  format: 'png' | 'jpg',
  onProgress?: (step: string) => void,
): Promise<Blob> {
  const imgFmt = format === 'jpg' ? 'jpeg' : 'png';
  const { dataUrl, cleanup } = await renderA4ToDataUrl(options, imgFmt as any, onProgress);
  cleanup();
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Render + capture → PDF Blob, handling multi-page overflow.
 */
export async function captureA4Pdf(
  options: A4DomRenderOptions,
  onProgress?: (step: string) => void,
): Promise<Blob> {
  const { dataUrl, containerHeight, cleanup } = await renderA4ToDataUrl(options, 'png', onProgress);
  cleanup();

  onProgress?.('Building PDF…');

  const pdfW = 210; // mm
  const pdfH = 297;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const imgHMm = (containerHeight / A4_WIDTH) * pdfW;
  const pageBg = options.darkMode ? '#111827' : '#f0f0f0';

  if (imgHMm <= pdfH) {
    pdf.setFillColor(pageBg);
    pdf.rect(0, 0, pdfW, pdfH, 'F');
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, imgHMm);
  } else {
    const pages = Math.ceil(imgHMm / pdfH);
    for (let p = 0; p < pages; p++) {
      if (p > 0) pdf.addPage();
      pdf.setFillColor(pageBg);
      pdf.rect(0, 0, pdfW, pdfH, 'F');
      pdf.addImage(dataUrl, 'PNG', 0, -(p * pdfH), pdfW, imgHMm);
    }
  }

  pdf.setProperties({
    title: options.title || 'Newsletter',
    creator: 'Tech Tribune Builder',
  });

  return pdf.output('blob');
}
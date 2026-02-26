/**
 * A4 Renderer.
 * Client-side A4 page capture using html-to-image and jsPDF.
 * Renders the newsletter into A4-sized pages at 2x scale for high quality.
 *
 * Google Fonts are fetched as CSS text and injected as inline <style> tags
 * to avoid CORS SecurityError when html-to-image reads cssRules.
 */
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import type { Section } from '../editor-types';
import type { ThemeConfig } from '../types';
import { generateWebHtml } from './web-renderer';
import { generateWebCss } from './css-generator';

// A4 dimensions in pixels at 96dpi
const A4_WIDTH_PX = 595;
const A4_HEIGHT_PX = 842;
const SCALE = 2; // 2x scale for high quality

export type A4Format = 'png' | 'jpg' | 'pdf';

interface A4RenderOptions {
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
  format: A4Format;
}

/**
 * Fetch a Google Fonts CSS URL and return the raw CSS text.
 * We pass a woff2-capable User-Agent so Google returns modern @font-face rules.
 * Returns empty string on failure (fonts will just fall back).
 */
async function fetchFontCss(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        // Pretend to be Chrome so Google returns woff2 @font-face rules
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Creates a temporary container with the newsletter rendered at A4 size,
 * captures it, and returns a Blob.
 */
export async function renderA4(options: A4RenderOptions): Promise<Blob> {
  const { title, sections, theme, darkMode, format } = options;

  // Generate HTML and CSS
  const bodyHtml = generateWebHtml({
    title,
    sections,
    theme,
    darkMode,
    includeWrapper: false,
  });
  // Skip @import font rules in CSS — we fetch and inline them separately below
  const css = generateWebCss(theme, darkMode, { skipFontImports: true });

  // Determine background color matching the theme
  const pageBg = darkMode ? '#1a1a2e' : '#f0f0f0';

  // Create an off-screen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.width = `${A4_WIDTH_PX}px`;
  container.style.minHeight = `${A4_HEIGHT_PX}px`;
  container.style.backgroundColor = pageBg;
  container.style.overflow = 'visible';
  document.body.appendChild(container);

  // Inject newsletter styles
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  container.appendChild(styleEl);

  // Fetch Google Fonts CSS as text and inject as inline <style> to avoid
  // cross-origin cssRules SecurityError in html-to-image.
  const fontFamily = theme.font_family || 'Inter';
  const fontUrls = [
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`,
    `https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap`,
  ];

  const fontCssTexts = await Promise.all(fontUrls.map(fetchFontCss));
  const combinedFontCss = fontCssTexts.filter(Boolean).join('\n');

  if (combinedFontCss) {
    const fontStyleEl = document.createElement('style');
    fontStyleEl.textContent = combinedFontCss;
    container.appendChild(fontStyleEl);
  }

  // Inject HTML content
  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = bodyHtml;
  container.appendChild(contentDiv);

  // Wait for images to load and fonts to render
  await waitForReady(container, 3000);

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

async function waitForReady(container: HTMLElement, timeout: number): Promise<void> {
  // Wait for all images to load
  const images = container.querySelectorAll('img');
  const imagePromises = Array.from(images).map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      }),
  );

  // Also wait for fonts
  const fontPromise = document.fonts?.ready || Promise.resolve();

  // Wait with timeout
  await Promise.race([
    Promise.all([...imagePromises, fontPromise]),
    new Promise<void>((resolve) => setTimeout(resolve, timeout)),
  ]);

  // Small extra delay for rendering
  await new Promise((resolve) => setTimeout(resolve, 200));
}

async function captureImage(container: HTMLElement, type: 'png' | 'jpeg', bgColor: string = '#ffffff'): Promise<Blob> {
  const captureOptions = {
    width: A4_WIDTH_PX,
    height: container.scrollHeight,
    pixelRatio: SCALE,
    quality: type === 'jpeg' ? 0.92 : undefined,
    backgroundColor: bgColor,
    // Tell html-to-image not to try inlining external stylesheets
    // (we already inlined fonts as <style> tags above)
    skipFonts: true,
    // Reset off-screen positioning so the cloned node renders inside the
    // SVG foreignObject viewport (cloneCSSStyle copies ALL computed styles
    // including position:fixed;left:-99999px from the original).
    style: {
      position: 'static',
      left: 'auto',
      top: 'auto',
      zIndex: 'auto',
      transform: 'none',
      transformOrigin: 'top left',
    },
  };

  let dataUrl: string;
  if (type === 'jpeg') {
    dataUrl = await toJpeg(container, captureOptions);
  } else {
    dataUrl = await toPng(container, captureOptions);
  }

  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  return response.blob();
}

async function capturePdf(container: HTMLElement, title: string, bgColor: string = '#ffffff'): Promise<Blob> {
  // Capture as PNG first at 2x scale
  const dataUrl = await toPng(container, {
    width: A4_WIDTH_PX,
    height: container.scrollHeight,
    pixelRatio: SCALE,
    backgroundColor: bgColor,
    skipFonts: true,
    style: {
      position: 'static',
      left: 'auto',
      top: 'auto',
      zIndex: 'auto',
      transform: 'none',
      transformOrigin: 'top left',
    },
  });

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm

  // Calculate the image dimensions in the PDF
  const imgWidth = pdfWidth;
  const contentHeight = container.scrollHeight;
  const contentWidth = A4_WIDTH_PX;
  const imgHeight = (contentHeight / contentWidth) * pdfWidth;

  // If content fits on one page
  if (imgHeight <= pdfHeight) {
    pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
  } else {
    // Multi-page: split the image across pages
    let remainingHeight = imgHeight;
    let yOffset = 0;

    while (remainingHeight > 0) {
      if (yOffset > 0) {
        pdf.addPage();
      }

      // For multi-page, we render the full image but crop via positioning
      pdf.addImage(dataUrl, 'PNG', 0, -yOffset, imgWidth, imgHeight);

      yOffset += pdfHeight;
      remainingHeight -= pdfHeight;
    }
  }

  // Set PDF metadata
  pdf.setProperties({
    title: title || 'Newsletter',
    creator: 'Tech Tribune Builder',
  });

  return pdf.output('blob');
}
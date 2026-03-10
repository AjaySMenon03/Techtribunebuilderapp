/**
 * Export Engine - Orchestrator.
 * Coordinates all export formats: Web HTML, Email HTML, A4 PNG/JPG/PDF, ZIP bundle, Clipboard.
 */
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Section } from '../editor-types';
import type { ThemeConfig } from '../types';
import { generateWebHtml, generateBodyHtml } from './web-renderer';
import { generateWebCss } from './css-generator';
import { generateEmailHtml } from './email-renderer';
import { captureA4Image, captureA4Pdf, type A4Format } from './a4-dom-renderer';

export type ExportFormat = 'web-html' | 'email-html' | 'a4-png' | 'a4-jpg' | 'a4-pdf' | 'zip' | 'clipboard';

export interface ExportOptions {
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    || 'newsletter';
}

/**
 * Collect all image URLs from sections for asset bundling.
 */
function collectAssetUrls(sections: Section[]): string[] {
  const urls = new Set<string>();

  for (const section of sections) {
    if (!section.visible) continue;
    const data = section.data;

    switch (section.baseType) {
      case 'header':
        if (data.logoUrl) urls.add(data.logoUrl);
        if (data.bannerUrl) urls.add(data.bannerUrl);
        break;
      case 'meet_engineer':
        if (data.photoUrl) urls.add(data.photoUrl);
        break;
      case 'appreciation':
        (data.members || []).forEach((m: any) => {
          // Support multiple photos (photoUrls array) with fallback to single photoUrl
          const photos: string[] = (m.photoUrls && m.photoUrls.length > 0) ? m.photoUrls : (m.photoUrl ? [m.photoUrl] : []);
          photos.forEach((url: string) => urls.add(url));
        });
        break;
      case 'project_update':
        // No images in project update section anymore
        break;
      case 'comic':
        if (data.imageUrl) urls.add(data.imageUrl);
        break;
    }
  }

  return Array.from(urls);
}

/**
 * Download a remote image and return as Blob + filename.
 */
async function downloadAsset(url: string): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    // Extract filename from URL
    const urlPath = new URL(url).pathname;
    const rawName = urlPath.split('/').pop() || 'image';
    // Clean up filename
    const ext = rawName.includes('.') ? '' : `.${blob.type.split('/')[1] || 'png'}`;
    const filename = rawName.replace(/[^a-zA-Z0-9._-]/g, '_') + ext;
    return { blob, filename };
  } catch (e) {
    console.warn(`Failed to download asset: ${url}`, e);
    return null;
  }
}

/**
 * Rewrite asset URLs in HTML to local paths.
 */
function rewriteAssetPaths(html: string, urlToPath: Map<string, string>): string {
  let result = html;
  for (const [originalUrl, localPath] of urlToPath) {
    // Escape special regex characters in URL
    const escaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), localPath);
  }
  return result;
}

// --- Public Export Functions ---

/**
 * Export as editable Web HTML file.
 */
export async function exportWebHtml(options: ExportOptions): Promise<void> {
  const html = generateWebHtml({
    ...options,
    includeWrapper: true,
  });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `${slugify(options.title)}-web.html`;
  saveAs(blob, filename);
}

/**
 * Export as Email HTML file.
 */
export async function exportEmailHtml(options: ExportOptions): Promise<void> {
  const html = generateEmailHtml(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `${slugify(options.title)}-email.html`;
  saveAs(blob, filename);
}

/**
 * Export as A4 image (PNG or JPG) or PDF.
 * Uses the DOM-based renderer for pixel-perfect fidelity with the live preview.
 */
export async function exportA4(options: ExportOptions, format: A4Format): Promise<void> {
  const ext = format === 'jpg' ? 'jpg' : format === 'pdf' ? 'pdf' : 'png';
  const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', pdf: 'application/pdf' };
  const filename = `${slugify(options.title)}-a4.${ext}`;

  let blob: Blob;
  if (format === 'pdf') {
    blob = await captureA4Pdf(options);
  } else {
    blob = await captureA4Image(options, format as 'png' | 'jpg');
  }
  saveAs(new Blob([blob], { type: mimeMap[ext] }), filename);
}

/**
 * Copy HTML to clipboard (body content only, with inline CSS for pasting into editors).
 */
export async function copyHtmlToClipboard(options: ExportOptions): Promise<boolean> {
  try {
    // Generate email-style HTML for best compatibility when pasting
    const html = generateEmailHtml(options);
    // Also generate plain body content for plain text fallback
    const bodyHtml = generateBodyHtml(options);

    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([bodyHtml], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
    } else {
      // Fallback: use execCommand
      const textarea = document.createElement('textarea');
      textarea.value = html;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    return true;
  } catch (e) {
    console.error('Failed to copy HTML to clipboard:', e);
    return false;
  }
}

/**
 * Export as ZIP bundle containing:
 * - newsletter-name/index.html (web HTML)
 * - newsletter-name/email.html (email HTML)
 * - newsletter-name/style.css (external CSS)
 * - newsletter-name/assets/ (downloaded images)
 */
export async function exportZipBundle(
  options: ExportOptions,
  onProgress?: (step: string) => void,
): Promise<void> {
  const zip = new JSZip();
  const folderName = slugify(options.title);
  const folder = zip.folder(folderName)!;

  // 1. Generate CSS
  onProgress?.('Generating styles...');
  const css = generateWebCss(options.theme, options.darkMode);
  folder.file('style.css', css);

  // 2. Collect and download assets
  onProgress?.('Downloading assets...');
  const assetUrls = collectAssetUrls(options.sections);
  const urlToLocalPath = new Map<string, string>();
  const assetsFolder = folder.folder('assets')!;

  const downloadResults = await Promise.allSettled(
    assetUrls.map(async (url) => {
      const result = await downloadAsset(url);
      if (result) {
        const localPath = `assets/${result.filename}`;
        urlToLocalPath.set(url, localPath);
        assetsFolder.file(result.filename, result.blob);
      }
    }),
  );

  const successCount = downloadResults.filter((r) => r.status === 'fulfilled').length;
  console.log(`Downloaded ${successCount}/${assetUrls.length} assets for ZIP bundle`);

  // 3. Generate Web HTML with rewritten asset paths
  onProgress?.('Building web HTML...');
  let webHtml = generateWebHtml({
    ...options,
    includeWrapper: true,
  });
  webHtml = rewriteAssetPaths(webHtml, urlToLocalPath);
  folder.file('index.html', webHtml);

  // 4. Generate Email HTML with rewritten asset paths
  onProgress?.('Building email HTML...');
  let emailHtml = generateEmailHtml(options);
  // For email HTML, keep original URLs (email clients need absolute URLs)
  folder.file('email.html', emailHtml);

  // 5. Generate ZIP
  onProgress?.('Packaging ZIP...');
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(blob, `${folderName}.zip`);
}

/**
 * Master export function - routes to the appropriate handler.
 */
export async function exportNewsletter(
  format: ExportFormat,
  options: ExportOptions,
  onProgress?: (step: string) => void,
): Promise<boolean> {
  try {
    switch (format) {
      case 'web-html':
        await exportWebHtml(options);
        return true;
      case 'email-html':
        await exportEmailHtml(options);
        return true;
      case 'a4-png':
        onProgress?.('Rendering A4 PNG...');
        await exportA4(options, 'png');
        return true;
      case 'a4-jpg':
        onProgress?.('Rendering A4 JPG...');
        await exportA4(options, 'jpg');
        return true;
      case 'a4-pdf':
        onProgress?.('Rendering A4 PDF...');
        await exportA4(options, 'pdf');
        return true;
      case 'zip':
        await exportZipBundle(options, onProgress);
        return true;
      case 'clipboard':
        return await copyHtmlToClipboard(options);
      default:
        console.error(`Unknown export format: ${format}`);
        return false;
    }
  } catch (e) {
    console.error(`Export failed (${format}):`, e);
    throw e;
  }
}
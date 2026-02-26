/**
 * Profile Generator – export / thumbnail utilities.
 *
 * Uses `renderForExport` from canvas-renderer to produce a clean
 * flattened canvas, then converts it to a downloadable file or
 * a thumbnail data-URL for persistence.
 */

import type { EditorLayer, CanvasConfig } from './editor-types';
import { renderForExport } from './canvas-renderer';

type ImageGetter = (src: string) => HTMLImageElement | null;

// ─── Export formats ──────────────────────────────────────

export type ExportFormat = 'png' | 'jpg';
export type ExportScale = 1 | 2 | 3;

export interface ExportOptions {
  format: ExportFormat;
  scale: ExportScale;
  transparent: boolean;   // only meaningful for PNG
  quality: number;        // 0-1, used for JPG
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'png',
  scale: 1,
  transparent: false,
  quality: 1.0,
};

// ─── Produce a Blob from the flattened canvas ────────────

export function exportToBlob(
  config: CanvasConfig,
  layers: EditorLayer[],
  getImage: ImageGetter,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): Promise<Blob> {
  // Transparent only applies to PNG; JPG always has a white background
  const transparent = options.format === 'png' ? options.transparent : false;

  const canvas = renderForExport(config, layers, getImage, {
    scale: options.scale,
    transparent,
  });

  const mime = options.format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = options.quality;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      mime,
      quality,
    );
  });
}

// ─── Produce a data-URL from the flattened canvas ────────

export function exportToDataURL(
  config: CanvasConfig,
  layers: EditorLayer[],
  getImage: ImageGetter,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): string {
  const transparent = options.format === 'png' ? options.transparent : false;

  const canvas = renderForExport(config, layers, getImage, {
    scale: options.scale,
    transparent,
  });

  const mime = options.format === 'jpg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mime, options.quality);
}

// ─── Trigger a browser download ──────────────────────────

export async function downloadExport(
  config: CanvasConfig,
  layers: EditorLayer[],
  getImage: ImageGetter,
  fileName: string,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): Promise<void> {
  const blob = await exportToBlob(config, layers, getImage, options);
  const ext = options.format === 'jpg' ? 'jpg' : 'png';
  const safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'profile';
  const fullName = `${safeName}_${options.scale}x.${ext}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fullName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Generate a 400px-wide thumbnail ─────────────────────

const THUMBNAIL_WIDTH = 400;

/**
 * Renders the canvas at 1× then scales down to a 400px-wide thumbnail.
 * Returns a PNG data-URL (always opaque white bg).
 */
export function generateThumbnail(
  config: CanvasConfig,
  layers: EditorLayer[],
  getImage: ImageGetter,
): string {
  // Render full-size at 1×
  const full = renderForExport(config, layers, getImage, {
    scale: 1,
    transparent: false,
  });

  // Scale to 400px wide
  const aspect = config.height / config.width;
  const thumbW = THUMBNAIL_WIDTH;
  const thumbH = Math.round(THUMBNAIL_WIDTH * aspect);

  const thumb = document.createElement('canvas');
  thumb.width = thumbW;
  thumb.height = thumbH;

  const ctx = thumb.getContext('2d')!;
  // Smooth downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full, 0, 0, thumbW, thumbH);

  return thumb.toDataURL('image/png', 1.0);
}

// ─── Convert a data-URL to a Blob ────────────────────────

export function dataURLtoBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

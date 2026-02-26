/**
 * Profile Editor – pure canvas rendering functions.
 *
 * Everything here is side-effect free (draws to a provided context)
 * and easy to unit-test in isolation.
 */

import type {
  EditorLayer,
  CanvasConfig,
  HandlePosition,
  ImageAdjustments,
} from './editor-types';
import { DEFAULT_IMAGE_ADJUSTMENTS } from './editor-types';

type ImageGetter = (src: string) => HTMLImageElement | null;

// ─── Constants ───────────────────────────────────────────
const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 24;
const SELECTION_COLOR = '#2563eb';
const GUIDE_COLOR = '#ef4444';

// ─── Main Render ─────────────────────────────────────────
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  config: CanvasConfig,
  layers: EditorLayer[],
  selectedId: string | null,
  getImage: ImageGetter,
) {
  const { width, height, zoom } = config;
  const dpr = window.devicePixelRatio || 1;

  // Size the pixel buffer
  ctx.canvas.width = width * zoom * dpr;
  ctx.canvas.height = height * zoom * dpr;
  ctx.canvas.style.width = `${width * zoom}px`;
  ctx.canvas.style.height = `${height * zoom}px`;

  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);

  // Clear
  ctx.clearRect(0, 0, width, height);

  // White canvas background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Grid
  if (config.showGrid) drawGrid(ctx, config);

  // Layers (bottom → top)
  for (const layer of layers) {
    if (!layer.visible) continue;
    drawLayer(ctx, layer, getImage);
  }

  // Safe margin guides
  if (config.showSafeMargin) drawSafeMargin(ctx, config);

  // Selection handles
  if (selectedId) {
    const sel = layers.find((l) => l.id === selectedId);
    if (sel && sel.visible) drawSelectionHandles(ctx, sel);
  }
}

// ─── Export Render (no grid / guides / handles) ──────────
/**
 * Renders all visible layers to an offscreen canvas suitable for export.
 *
 * - No grid, safe-margin guides, or selection UI
 * - Supports an integer scale multiplier (1×, 2×, 3×)
 * - Supports transparent background (skips white fill)
 *
 * Returns the canvas so the caller can call `toDataURL` or `toBlob`.
 */
export function renderForExport(
  config: CanvasConfig,
  layers: EditorLayer[],
  getImage: ImageGetter,
  options: { scale?: number; transparent?: boolean } = {},
): HTMLCanvasElement {
  const scale = options.scale ?? 1;
  const transparent = options.transparent ?? false;

  const w = config.width * scale;
  const h = config.height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  if (!transparent) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, config.width, config.height);
  }

  for (const layer of layers) {
    if (!layer.visible) continue;
    drawLayer(ctx, layer, getImage);
  }

  return canvas;
}

// ─── Grid ────────────────────────────────────────────────
function drawGrid(ctx: CanvasRenderingContext2D, config: CanvasConfig) {
  const { width, height, gridSize } = config;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = gridSize; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = gridSize; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

// ─── Safe Margin ─────────────────────────────────────────
function drawSafeMargin(ctx: CanvasRenderingContext2D, config: CanvasConfig) {
  const { width, height, safeMargin } = config;
  ctx.save();
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 0.75;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(safeMargin, safeMargin, width - safeMargin * 2, height - safeMargin * 2);
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Build a CSS `filter` string from adjustments ────────
function buildFilterString(adj: ImageAdjustments): string {
  const parts: string[] = [];
  if (adj.brightness !== 100) parts.push(`brightness(${adj.brightness}%)`);
  if (adj.contrast !== 100) parts.push(`contrast(${adj.contrast}%)`);
  if (adj.saturation !== 100) parts.push(`saturate(${adj.saturation}%)`);
  if (adj.blur > 0) parts.push(`blur(${adj.blur}px)`);
  return parts.length ? parts.join(' ') : 'none';
}

// ─── Draw a single layer ─────────────────────────────────
function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: EditorLayer,
  getImage: ImageGetter,
) {
  ctx.save();
  ctx.globalAlpha = layer.opacity;

  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;

  if (layer.rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  switch (layer.type) {
    case 'background':
    case 'foreground': {
      ctx.fillStyle = layer.fill || '#cccccc';
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      break;
    }

    case 'image': {
      if (layer.src) {
        const img = getImage(layer.src);
        if (img) {
          drawImageWithAdjustments(ctx, img, layer);
        } else {
          // Loading placeholder
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
          ctx.fillStyle = '#9ca3af';
          ctx.font = '12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'Loading…',
            layer.x + layer.width / 2,
            layer.y + layer.height / 2,
          );
        }
      } else {
        // No source – dashed placeholder
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
        ctx.setLineDash([]);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          'No image',
          layer.x + layer.width / 2,
          layer.y + layer.height / 2,
        );
      }
      break;
    }

    case 'name': {
      const text = layer.text || '';
      ctx.fillStyle = layer.fontColor || '#1a1a1a';
      ctx.font = `${layer.fontWeight || '600'} ${layer.fontSize || 24}px ${layer.fontFamily || 'Inter, sans-serif'}`;
      ctx.textAlign = layer.textAlign || 'center';
      ctx.textBaseline = 'middle';

      let textX = layer.x + layer.width / 2;
      if (layer.textAlign === 'left') textX = layer.x;
      else if (layer.textAlign === 'right') textX = layer.x + layer.width;

      ctx.fillText(text, textX, layer.y + layer.height / 2, layer.width);
      break;
    }
  }

  ctx.restore();
}

// ─── Draw an image with all adjustments applied ──────────
function drawImageWithAdjustments(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  layer: EditorLayer,
) {
  const adj: ImageAdjustments = layer.adjustments ?? DEFAULT_IMAGE_ADJUSTMENTS;

  ctx.save();

  // 1. Blend mode
  if (adj.blendMode && adj.blendMode !== 'source-over') {
    ctx.globalCompositeOperation = adj.blendMode as GlobalCompositeOperation;
  }

  // 2. Shadow (applied before the image draw so it's behind)
  if (adj.shadowEnabled) {
    ctx.shadowColor = adj.shadowColor;
    ctx.shadowBlur = adj.shadowBlur;
    ctx.shadowOffsetX = adj.shadowOffsetX;
    ctx.shadowOffsetY = adj.shadowOffsetY;
  }

  // 3. CSS filter (brightness, contrast, saturation, blur)
  const filterStr = buildFilterString(adj);
  if (filterStr !== 'none') {
    ctx.filter = filterStr;
  }

  // 4. Flip – translate to layer centre, scale, translate back
  const flipSx = adj.flipH ? -1 : 1;
  const flipSy = adj.flipV ? -1 : 1;
  if (adj.flipH || adj.flipV) {
    const fcx = layer.x + layer.width / 2;
    const fcy = layer.y + layer.height / 2;
    ctx.translate(fcx, fcy);
    ctx.scale(flipSx, flipSy);
    ctx.translate(-fcx, -fcy);
  }

  // 5. Draw — either cropped or full
  if (adj.cropEnabled) {
    const sx = adj.cropX * img.naturalWidth;
    const sy = adj.cropY * img.naturalHeight;
    const sw = adj.cropW * img.naturalWidth;
    const sh = adj.cropH * img.naturalHeight;
    ctx.drawImage(
      img,
      sx, sy, Math.max(1, sw), Math.max(1, sh), // source rect
      layer.x, layer.y, layer.width, layer.height, // dest rect
    );
  } else {
    ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
  }

  ctx.restore();
}

// ─── Selection Handles ───────────────────────────────────
function drawSelectionHandles(ctx: CanvasRenderingContext2D, layer: EditorLayer) {
  ctx.save();

  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;

  if (layer.rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // Bounding box
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);

  // Corner + edge handles
  const half = HANDLE_SIZE / 2;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1.5;

  const handles = getHandlePositions(layer);
  for (const [, hx, hy] of handles) {
    ctx.beginPath();
    ctx.rect(hx - half, hy - half, HANDLE_SIZE, HANDLE_SIZE);
    ctx.fill();
    ctx.stroke();
  }

  // Rotation handle (line + circle above top-center)
  const topCenterY = layer.y - ROTATION_HANDLE_OFFSET;
  ctx.beginPath();
  ctx.moveTo(cx, layer.y);
  ctx.lineTo(cx, topCenterY);
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, topCenterY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ─── Handle Positions (canvas space, unrotated) ──────────
export function getHandlePositions(
  layer: EditorLayer,
): [HandlePosition, number, number][] {
  const { x, y, width: w, height: h } = layer;
  return [
    ['nw', x, y],
    ['n', x + w / 2, y],
    ['ne', x + w, y],
    ['w', x, y + h / 2],
    ['e', x + w, y + h / 2],
    ['sw', x, y + h],
    ['s', x + w / 2, y + h],
    ['se', x + w, y + h],
  ];
}

// ─── Hit-test helpers ────────────────────────────────────
const HIT_PADDING = 6;

/**
 * Returns the handle under a given canvas-space point for the selected layer,
 * 'rotate' if over the rotation handle, or null.
 */
export function hitTestHandles(
  layer: EditorLayer,
  px: number,
  py: number,
): HandlePosition | 'rotate' | null {
  // Transform point into the layer's local (unrotated) coordinate system
  const [lx, ly] = toLayerLocal(layer, px, py);

  // Rotation handle
  const cx = layer.x + layer.width / 2;
  const ry = layer.y - ROTATION_HANDLE_OFFSET;
  const dx = lx - cx;
  const dy = ly - ry;
  if (dx * dx + dy * dy <= (HIT_PADDING + 5) ** 2) return 'rotate';

  // Resize handles
  const handles = getHandlePositions(layer);
  for (const [pos, hx, hy] of handles) {
    if (
      Math.abs(lx - hx) <= HANDLE_SIZE / 2 + HIT_PADDING &&
      Math.abs(ly - hy) <= HANDLE_SIZE / 2 + HIT_PADDING
    ) {
      return pos;
    }
  }
  return null;
}

/**
 * Returns true if the point is within the layer's bounding box
 * (accounting for rotation).
 */
export function hitTestLayer(layer: EditorLayer, px: number, py: number): boolean {
  const [lx, ly] = toLayerLocal(layer, px, py);
  return (
    lx >= layer.x &&
    lx <= layer.x + layer.width &&
    ly >= layer.y &&
    ly <= layer.y + layer.height
  );
}

/**
 * Rotate a point into the layer's local (unrotated) space.
 */
function toLayerLocal(layer: EditorLayer, px: number, py: number): [number, number] {
  if (layer.rotation === 0) return [px, py];
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  const rad = (-layer.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

/**
 * Get cursor style for a given handle or default.
 */
export function getCursorForHandle(
  handle: HandlePosition | 'rotate' | null,
): string {
  if (!handle) return 'default';
  if (handle === 'rotate') return 'crosshair';
  const map: Record<HandlePosition, string> = {
    nw: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    se: 'nwse-resize',
    n: 'ns-resize',
    s: 'ns-resize',
    w: 'ew-resize',
    e: 'ew-resize',
  };
  return map[handle];
}
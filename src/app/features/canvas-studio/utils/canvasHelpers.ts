import type { CanvasObjectMeta, SnapGuide } from '../types/canvasTypes';
import { SNAP_THRESHOLD } from '../types/canvasTypes';

/** Generate unique object metadata */
export function createObjectMeta(type: string, extra?: Partial<CanvasObjectMeta>): CanvasObjectMeta {
  return {
    id: crypto.randomUUID(),
    type,
    createdAt: Date.now(),
    createdBy: 'user',
    locked: false,
    ...extra,
  };
}

/** Apply metadata to a fabric object */
export function applyMeta(obj: any, type: string, extra?: Partial<CanvasObjectMeta>) {
  const meta = createObjectMeta(type, extra);
  obj.set('meta', meta);
  return meta;
}

/** Get metadata from a fabric object */
export function getMeta(obj: any): CanvasObjectMeta | undefined {
  return obj?.meta || obj?.get?.('meta');
}

// ── Snapping & Alignment ────────────────────────────

interface BBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function getBBox(obj: any): BBox {
  const bound = obj.getBoundingRect();
  return {
    left: bound.left,
    top: bound.top,
    right: bound.left + bound.width,
    bottom: bound.top + bound.height,
    centerX: bound.left + bound.width / 2,
    centerY: bound.top + bound.height / 2,
  };
}

/**
 * Calculate snap guides for a moving object against all other objects.
 * Returns { guides, snapDx, snapDy } — apply snapDx/snapDy to the moving object.
 */
export function calculateSnap(
  movingObj: any,
  allObjects: any[],
  gridSize: number | null,
): { guides: SnapGuide[]; snapDx: number; snapDy: number } {
  const guides: SnapGuide[] = [];
  let snapDx = 0;
  let snapDy = 0;
  const moving = getBBox(movingObj);

  // Snap to grid
  if (gridSize) {
    const gridSnapX = Math.round(moving.left / gridSize) * gridSize - moving.left;
    const gridSnapY = Math.round(moving.top / gridSize) * gridSize - moving.top;
    if (Math.abs(gridSnapX) < SNAP_THRESHOLD) snapDx = gridSnapX;
    if (Math.abs(gridSnapY) < SNAP_THRESHOLD) snapDy = gridSnapY;
  }

  // Snap to other objects
  for (const other of allObjects) {
    if (other === movingObj) continue;
    const target = getBBox(other);

    // Vertical guides (X-axis snapping)
    const xPairs: [number, number][] = [
      [moving.left, target.left],
      [moving.left, target.right],
      [moving.right, target.left],
      [moving.right, target.right],
      [moving.centerX, target.centerX],
    ];

    for (const [src, tgt] of xPairs) {
      const diff = tgt - src;
      if (Math.abs(diff) < SNAP_THRESHOLD && (snapDx === 0 || Math.abs(diff) < Math.abs(snapDx))) {
        snapDx = diff;
        guides.push({ orientation: 'vertical', position: tgt });
      }
    }

    // Horizontal guides (Y-axis snapping)
    const yPairs: [number, number][] = [
      [moving.top, target.top],
      [moving.top, target.bottom],
      [moving.bottom, target.top],
      [moving.bottom, target.bottom],
      [moving.centerY, target.centerY],
    ];

    for (const [src, tgt] of yPairs) {
      const diff = tgt - src;
      if (Math.abs(diff) < SNAP_THRESHOLD && (snapDy === 0 || Math.abs(diff) < Math.abs(snapDy))) {
        snapDy = diff;
        guides.push({ orientation: 'horizontal', position: tgt });
      }
    }
  }

  return { guides, snapDx, snapDy };
}

/** Draw snap guide lines on a canvas context */
export function drawGuides(ctx: CanvasRenderingContext2D, guides: SnapGuide[], canvasWidth: number, canvasHeight: number) {
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (const g of guides) {
    ctx.beginPath();
    if (g.orientation === 'vertical') {
      ctx.moveTo(g.position, 0);
      ctx.lineTo(g.position, canvasHeight);
    } else {
      ctx.moveTo(0, g.position);
      ctx.lineTo(canvasWidth, g.position);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ── Project storage ────────────────────────────

const PROJECTS_KEY = 'tech-tribune-canvas-projects';
const TEMPLATES_KEY = 'tech-tribune-canvas-templates';

export function loadProjects(): import('../types/canvasTypes').CanvasProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: import('../types/canvasTypes').CanvasProject[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 50)));
}

export function loadTemplates(): any[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: any[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}
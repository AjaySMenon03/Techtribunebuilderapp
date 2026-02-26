/**
 * Profile Editor – type definitions for the canvas-based layer editor.
 */

// ─── Layer Types ─────────────────────────────────────────
export type LayerType = 'background' | 'image' | 'foreground' | 'name';

// ─── Image Adjustments ───────────────────────────────────
export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface ImageAdjustments {
  brightness: number;    // 0–200, default 100 (CSS filter %)
  contrast: number;      // 0–200, default 100
  saturation: number;    // 0–200, default 100
  blur: number;          // 0–20 px, default 0

  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  blendMode: BlendMode;

  flipH: boolean;
  flipV: boolean;

  /** Crop – normalised 0‑1 values relative to the *source* image */
  cropEnabled: boolean;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,

  shadowEnabled: false,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 10,
  shadowOffsetX: 4,
  shadowOffsetY: 4,

  blendMode: 'source-over',

  flipH: false,
  flipV: false,

  cropEnabled: false,
  cropX: 0,
  cropY: 0,
  cropW: 1,
  cropH: 1,
};

export const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

export interface EditorLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number;  // 0-1
  visible: boolean;
  locked: boolean;

  // Background / Foreground
  fill?: string;

  // Image
  src?: string;
  adjustments?: ImageAdjustments;

  // Name (text)
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: string;
  textAlign?: CanvasTextAlign;
}

// ─── Canvas Config ───────────────────────────────────────
export interface CanvasConfig {
  width: number;
  height: number;
  zoom: number;
  gridSize: number;
  showGrid: boolean;
  showSafeMargin: boolean;
  safeMargin: number;
  snapToGrid: boolean;
}

export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  width: 400,
  height: 500,
  zoom: 1,
  gridSize: 10,
  showGrid: true,
  showSafeMargin: true,
  safeMargin: 20,
  snapToGrid: true,
};

// ─── Interaction State ───────────────────────────────────
export type HandlePosition =
  | 'nw' | 'n' | 'ne'
  | 'w'  |       'e'
  | 'sw' | 's' | 'se';

export type InteractionMode =
  | { type: 'idle' }
  | { type: 'dragging'; layerId: string; startX: number; startY: number; origX: number; origY: number }
  | { type: 'resizing'; layerId: string; handle: HandlePosition; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number }
  | { type: 'rotating'; layerId: string; startAngle: number; origRotation: number };

// ─── Editor State ────────────────────────────────────────
export interface EditorState {
  layers: EditorLayer[];
  selectedLayerId: string | null;
  canvasConfig: CanvasConfig;
  profileName: string;
}

// ─── Actions ─────────────────────────────────────────────
export type EditorAction =
  | { type: 'ADD_LAYER'; layer: EditorLayer }
  | { type: 'UPDATE_LAYER'; id: string; changes: Partial<EditorLayer> }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'DUPLICATE_LAYER'; id: string }
  | { type: 'REORDER_LAYERS'; fromIndex: number; toIndex: number }
  | { type: 'SELECT_LAYER'; id: string | null }
  | { type: 'TOGGLE_VISIBILITY'; id: string }
  | { type: 'TOGGLE_LOCK'; id: string }
  | { type: 'UPDATE_CANVAS_CONFIG'; changes: Partial<CanvasConfig> }
  | { type: 'SET_PROFILE_NAME'; name: string }
  | { type: 'LOAD_STATE'; state: EditorState };

// ─── Helpers ─────────────────────────────────────────────
let _nextId = 1;
export function generateLayerId(): string {
  return `layer-${Date.now()}-${_nextId++}`;
}

export function createDefaultLayer(type: LayerType, canvasConfig: CanvasConfig): EditorLayer {
  const id = generateLayerId();
  const base = {
    id,
    type,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  };

  switch (type) {
    case 'background':
      return {
        ...base,
        name: 'Background',
        x: 0, y: 0,
        width: canvasConfig.width,
        height: canvasConfig.height,
        fill: '#f4efe5',
      };
    case 'image':
      return {
        ...base,
        name: 'Image',
        x: canvasConfig.width / 2 - 80,
        y: canvasConfig.height / 2 - 80,
        width: 160,
        height: 160,
        src: '',
        adjustments: DEFAULT_IMAGE_ADJUSTMENTS,
      };
    case 'foreground':
      return {
        ...base,
        name: 'Foreground',
        x: 20, y: 20,
        width: canvasConfig.width - 40,
        height: 100,
        fill: 'rgba(0,0,0,0.05)',
      };
    case 'name':
      return {
        ...base,
        name: 'Name',
        x: canvasConfig.width / 2 - 100,
        y: canvasConfig.height - 80,
        width: 200,
        height: 40,
        text: 'Full Name',
        fontSize: 24,
        fontFamily: 'Inter, sans-serif',
        fontColor: '#1a1a1a',
        fontWeight: '600',
        textAlign: 'center',
      };
    default:
      return { ...base, name: type, x: 50, y: 50, width: 100, height: 100 };
  }
}

export function snapValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
// Canvas Studio – Type Definitions

export type CanvasTool =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'star'
  | 'polygon'
  | 'pen'
  | 'brush'
  | 'eraser'
  | 'text'
  | 'sticky'
  | 'image'
  | 'flowchart_start'
  | 'flowchart_process'
  | 'flowchart_decision';

export interface CanvasObjectMeta {
  id: string;
  type: string;
  createdAt: number;
  createdBy: string;
  locked: boolean;
  groupId?: string;
  isTemplate?: boolean;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface CanvasProject {
  id: string;
  name: string;
  canvasJSON: string;
  thumbnail: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'svg' | 'pdf' | 'json';
  includeBackground: boolean;
  quality: number;
  width?: number;
  height?: number;
}

export interface SnapGuide {
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export type CanvasBackground = 'light' | 'dark' | 'dots' | 'grid' | 'transparent';

export interface ClipboardData {
  json: string;
  offset: number;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface CanvasEvent {
  type: 'objectAdded' | 'objectUpdated' | 'objectRemoved' | 'viewportChanged';
  data: any;
  timestamp: number;
}

export const TOOL_SHORTCUTS: Record<string, CanvasTool> = {
  v: 'select',
  h: 'hand',
  r: 'rectangle',
  c: 'circle',
  l: 'line',
  a: 'arrow',
  s: 'star',
  t: 'text',
  n: 'sticky',
  b: 'brush',
  x: 'eraser',
};

export const STICKY_COLORS = [
  '#FEF3C7', // amber-100
  '#DBEAFE', // blue-100
  '#D1FAE5', // emerald-100
  '#FCE7F3', // pink-100
  '#EDE9FE', // violet-100
  '#FEE2E2', // red-100
  '#E0F2FE', // sky-100
  '#F3E8FF', // purple-100
];

export const GRID_SIZES = [20, 40, 80] as const;

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 5;
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

export const MAX_OBJECTS = 2000;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_HISTORY = 50;
export const MAX_PROJECTS = 50;
export const AUTOSAVE_INTERVAL = 30_000; // 30 seconds
export const SNAP_THRESHOLD = 10;
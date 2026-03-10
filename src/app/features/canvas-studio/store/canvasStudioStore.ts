import { create } from 'zustand';
import type { CanvasTool, ViewportState, CanvasProject, SnapGuide, CanvasBackground, ClipboardData } from '../types/canvasTypes';
import { MAX_HISTORY, ZOOM_MIN, ZOOM_MAX } from '../types/canvasTypes';
import { loadProjects, saveProjects } from '../utils/canvasHelpers';

interface CanvasStudioState {
  // Tool
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  previousTool: CanvasTool;

  // Viewport
  viewport: ViewportState;
  setViewport: (v: Partial<ViewportState>) => void;

  // Selection
  selectedObjectIds: string[];
  setSelectedObjectIds: (ids: string[]) => void;

  // History (undo / redo)
  historyStack: string[];
  historyIndex: number;
  pushHistory: (json: string) => void;
  undo: () => string | null;
  redo: () => string | null;

  // Grid / Snap
  showGrid: boolean;
  gridSize: number;
  snapEnabled: boolean;
  toggleGrid: () => void;
  setGridSize: (s: number) => void;
  toggleSnap: () => void;

  // Snap guides (transient)
  snapGuides: SnapGuide[];
  setSnapGuides: (g: SnapGuide[]) => void;

  // Panels
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  minimapOpen: boolean;
  toggleMinimap: () => void;

  // Projects
  projects: CanvasProject[];
  currentProjectId: string | null;
  loadProjectsFromStorage: () => void;
  saveProject: (project: CanvasProject) => void;
  deleteProject: (id: string) => void;
  setCurrentProjectId: (id: string | null) => void;

  // Dirty flag (for autosave)
  dirty: boolean;
  setDirty: (d: boolean) => void;

  // Brush settings
  brushColor: string;
  brushWidth: number;
  setBrushColor: (c: string) => void;
  setBrushWidth: (w: number) => void;

  // Object count
  objectCount: number;
  setObjectCount: (n: number) => void;

  // Canvas background
  canvasBackground: CanvasBackground;
  canvasBgColor: string;
  setCanvasBackground: (bg: CanvasBackground) => void;
  setCanvasBgColor: (color: string) => void;

  // Clipboard
  clipboard: ClipboardData | null;
  setClipboard: (data: ClipboardData | null) => void;

  // Context menu
  contextMenuPos: { x: number; y: number } | null;
  setContextMenuPos: (pos: { x: number; y: number } | null) => void;

  // Shortcuts dialog
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

export const useCanvasStudioStore = create<CanvasStudioState>((set, get) => ({
  activeTool: 'select',
  previousTool: 'select',
  setActiveTool: (tool) => set((s) => ({ activeTool: tool, previousTool: s.activeTool })),

  viewport: { zoom: 1, panX: 0, panY: 0 },
  setViewport: (v) => set((s) => ({
    viewport: {
      ...s.viewport,
      ...v,
      zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom ?? s.viewport.zoom)),
    },
  })),

  selectedObjectIds: [],
  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),

  // History
  historyStack: [],
  historyIndex: -1,
  pushHistory: (json) => {
    const { historyStack, historyIndex } = get();
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(json);
    if (newStack.length > MAX_HISTORY) newStack.shift();
    set({ historyStack: newStack, historyIndex: newStack.length - 1, dirty: true });
  },
  undo: () => {
    const { historyStack, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex });
    return historyStack[newIndex];
  },
  redo: () => {
    const { historyStack, historyIndex } = get();
    if (historyIndex >= historyStack.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex });
    return historyStack[newIndex];
  },

  // Grid
  showGrid: false,
  gridSize: 20,
  snapEnabled: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setGridSize: (s) => set({ gridSize: s }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  snapGuides: [],
  setSnapGuides: (g) => set({ snapGuides: g }),

  // Panels
  rightPanelOpen: true,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  minimapOpen: false,
  toggleMinimap: () => set((s) => ({ minimapOpen: !s.minimapOpen })),

  // Projects
  projects: [],
  currentProjectId: null,
  loadProjectsFromStorage: () => {
    const projects = loadProjects();
    set({ projects });
  },
  saveProject: (project) => {
    const { projects } = get();
    const idx = projects.findIndex((p) => p.id === project.id);
    let updated: CanvasProject[];
    if (idx >= 0) {
      updated = [...projects];
      updated[idx] = project;
    } else {
      updated = [project, ...projects];
    }
    saveProjects(updated);
    set({ projects: updated, currentProjectId: project.id, dirty: false });
  },
  deleteProject: (id) => {
    const { projects } = get();
    const updated = projects.filter((p) => p.id !== id);
    saveProjects(updated);
    set({ projects: updated });
  },
  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  dirty: false,
  setDirty: (d) => set({ dirty: d }),

  brushColor: '#000000',
  brushWidth: 3,
  setBrushColor: (c) => set({ brushColor: c }),
  setBrushWidth: (w) => set({ brushWidth: w }),

  objectCount: 0,
  setObjectCount: (n) => set({ objectCount: n }),

  // Canvas background
  canvasBackground: 'light',
  canvasBgColor: '#f8fafc',
  setCanvasBackground: (bg) => {
    const colors: Record<CanvasBackground, string> = {
      light: '#f8fafc',
      dark: '#0f172a',
      dots: '#f8fafc',
      grid: '#f8fafc',
      transparent: 'transparent',
    };
    set({ canvasBackground: bg, canvasBgColor: colors[bg] });
  },
  setCanvasBgColor: (color) => set({ canvasBgColor: color }),

  // Clipboard
  clipboard: null,
  setClipboard: (data) => set({ clipboard: data }),

  // Context menu
  contextMenuPos: null,
  setContextMenuPos: (pos) => set({ contextMenuPos: pos }),

  // Shortcuts dialog
  shortcutsOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
}));
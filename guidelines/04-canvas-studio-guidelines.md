# EM Make — Canvas Studio Guidelines

## 1. Overview

Canvas Studio is a professional infinite-canvas whiteboard module built on **Fabric.js v7**. It supports freeform drawing, shape creation, sticky notes, text, images, flowchart elements, and multi-page project management with full undo/redo history.

It lives at:
- `/canvas-studio` — Project list (`CanvasStudioPage`)
- `/canvas-studio/:id` — Canvas editor (`CanvasStudioEditorPage` → `CanvasStudio`)

---

## 2. Architecture

```
/src/app/features/canvas-studio/
  CanvasStudio.tsx              # Main orchestrator component
  CanvasProjectsList.tsx        # Project list/grid page
  index.ts                      # Public exports
  store/
    canvasStudioStore.ts        # Zustand store (all canvas state)
  types/
    canvasTypes.ts              # All TypeScript types + constants
  components/
    canvas/
      CanvasCore.tsx            # Fabric.js canvas wrapper (imperative)
      MiniMap.tsx               # Viewport minimap overlay
      WelcomeOverlay.tsx        # First-load welcome screen
      CanvasContextMenu.tsx     # Right-click context menu
    toolbar/
      FloatingToolbar.tsx       # Left-side tool palette
      TopActionBar.tsx          # Top action bar (save, export, AI, history)
      ZoomControls.tsx          # Bottom-right zoom slider + presets
    panels/
      RightPanel.tsx            # Object properties panel (fill, stroke, text)
    dialogs/
      ExportDialog.tsx          # Export modal (PNG/JPEG/SVG/PDF/JSON)
      AIGeneratorDialog.tsx     # AI content generation dialog
      SaveLoadDialog.tsx        # Save / Load project dialogs
      KeyboardShortcutsDialog.tsx # Keyboard shortcuts reference
  utils/
    canvasHelpers.ts            # localStorage project persistence helpers
    logger.ts                   # Structured logger utility
```

---

## 3. Fabric.js v7

- Canvas is managed entirely by the **Fabric.js** library via the `CanvasCore` component.
- `CanvasCore` exposes an imperative handle (`CanvasCoreHandle`) via `useImperativeHandle` / `forwardRef`.
- The parent `CanvasStudio` component holds a `canvasRef` and calls methods on it:
  - `loadJSON(json: string)` — restore a saved canvas state
  - `getJSON()` — serialise current canvas to JSON
  - `exportImage(format, options)` — export canvas as image/PDF/JSON

### Fabric.js Rules
- **Never** directly mutate Fabric canvas objects outside of `CanvasCore` — all mutations go through `canvasRef.current.xxx()` methods.
- After any Fabric object modification, call `canvas.requestRenderAll()`.
- History snapshots are taken by serialising the canvas with `canvas.toJSON()` and pushing to `useCanvasStudioStore.pushHistory()`.
- Do not use the `konva` package — Canvas Studio uses Fabric.js exclusively.

---

## 4. Zustand Store (`useCanvasStudioStore`)

File: `/src/app/features/canvas-studio/store/canvasStudioStore.ts`

### Tool State
- `activeTool: CanvasTool` — currently selected tool
- `previousTool: CanvasTool` — for tool-switch-back behaviour (e.g. Space→hand→back)
- `setActiveTool(tool)` — always saves previous tool

### Viewport
- `viewport: { zoom, panX, panY }` — read by `ZoomControls` and `MiniMap`
- `setViewport(partial)` — clamps zoom between `ZOOM_MIN` (0.1) and `ZOOM_MAX` (5.0)

### Selection
- `selectedObjectIds: string[]` — currently selected Fabric object IDs

### History (Undo/Redo)
- `historyStack: string[]` — array of serialised canvas JSON snapshots
- `historyIndex: number` — current position in stack
- `pushHistory(json)` — appends snapshot, truncates forward history, respects `MAX_HISTORY = 50`
- `undo()` — moves index back, returns the previous JSON or `null`
- `redo()` — moves index forward, returns the next JSON or `null`
- Both `undo` and `redo` return the JSON string to be loaded by `CanvasCore`

### Grid & Snap
- `showGrid: boolean` (default `false`)
- `gridSize: number` (default `20`) — available presets: `20, 40, 80`
- `snapEnabled: boolean` (default `true`)
- `snapGuides: SnapGuide[]` — transient alignment guides shown during drag

### Panels
- `rightPanelOpen: boolean` (default `true`)
- `minimapOpen: boolean` (default `false`)

### Projects
- `projects: CanvasProject[]` — loaded from localStorage
- `currentProjectId: string | null`
- `saveProject(project)` — upserts to `projects` array and persists to localStorage
- `deleteProject(id)` — removes from array and localStorage
- `loadProjectsFromStorage()` — called on mount

### Dirty Flag
- `dirty: boolean` — set on every history push; cleared on save

### Drawing
- `brushColor: string` (default `#000000`)
- `brushWidth: number` (default `3`)

### Canvas Background
- `canvasBackground: CanvasBackground` — one of `'light' | 'dark' | 'dots' | 'grid' | 'transparent'`
- `canvasBgColor: string` — actual hex colour (derived from background type)
- `setCanvasBackground(bg)` — updates both fields, uses preset colour map

### Clipboard
- `clipboard: ClipboardData | null` — `{ json: string, offset: number }` for copy/paste

---

## 5. Tools

### `CanvasTool` Type
```
select | hand | rectangle | circle | triangle | line | arrow | star | polygon |
pen | brush | eraser | text | sticky | image |
flowchart_start | flowchart_process | flowchart_decision
```

### Keyboard Shortcuts
| Key | Tool |
|---|---|
| `v` | select |
| `h` | hand (pan) |
| `r` | rectangle |
| `c` | circle |
| `l` | line |
| `a` | arrow |
| `s` | star |
| `t` | text |
| `n` | sticky note |
| `b` | brush |
| `x` | eraser |

Additional shortcuts (global):
- `Ctrl/Cmd+Z` — undo
- `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y` — redo
- `Ctrl/Cmd+C` — copy
- `Ctrl/Cmd+V` — paste
- `Ctrl/Cmd+S` — save
- `Delete / Backspace` — delete selected objects
- `Escape` — deselect / return to select tool
- `Space` (hold) — temporary switch to hand tool

---

## 6. Canvas Projects

### `CanvasProject` Type
```ts
interface CanvasProject {
  id: string;
  name: string;
  canvasJSON: string;   // Fabric.js serialised canvas
  thumbnail: string;    // base64 PNG thumbnail
  createdAt: number;    // Unix ms
  updatedAt: number;
}
```

### Limits
- Max objects per canvas: `MAX_OBJECTS = 2000`
- Max image size: `MAX_IMAGE_SIZE = 10MB`
- Max history stack: `MAX_HISTORY = 50`
- Max projects: `MAX_PROJECTS = 50`
- Autosave interval: `AUTOSAVE_INTERVAL = 30,000ms` (30 seconds)

### Persistence
- Projects are saved to `localStorage` via `saveProjects()` / `loadProjects()` in `canvasHelpers.ts`.
- This is **local-only** — projects are not synced to Supabase.
- If Supabase sync is added later, `saveProject()` in the store should be the integration point.

---

## 7. Toolbar Components

### `FloatingToolbar` (left side)
- Vertical pill with grouped tool buttons.
- Tool groups: Selection, Shapes, Drawing, Objects, Flowchart.
- Active tool is highlighted.
- Clicking a tool calls `setActiveTool(tool)`.

### `TopActionBar` (top)
- New project, Save, Undo, Redo, Export, AI Generate, Load project, Keyboard shortcuts, Object count badge, grid/snap toggles, background selector, right panel toggle, minimap toggle.
- Save button shows a `dirty` indicator (unsaved dot).

### `ZoomControls` (bottom-right)
- Zoom slider (0.1× to 5×).
- Zoom preset buttons: `0.25, 0.5, 0.75, 1, 1.5, 2, 3`.
- "Fit to screen" and "Reset to 100%" buttons.
- Zoom percentage display.

---

## 8. Canvas Backgrounds

| Value | Description |
|---|---|
| `light` | Off-white `#f8fafc` |
| `dark` | Deep navy `#0f172a` |
| `dots` | Off-white with dot pattern |
| `grid` | Off-white with grid lines |
| `transparent` | Transparent (no background fill) |

The background type also affects the canvas CSS class for dot/grid pattern rendering.

---

## 9. Right Panel

File: `/src/app/features/canvas-studio/components/panels/RightPanel.tsx`

- Shows properties of the currently selected Fabric object(s).
- Sections: Fill colour, Stroke colour & width, Opacity, Text properties (when a text object is selected), Object dimensions (W × H), Position (X, Y), Rotation.
- Updates are applied directly to the Fabric canvas via the `canvasRef`.
- When no object is selected, shows canvas background settings.

---

## 10. MiniMap

File: `/src/app/features/canvas-studio/components/canvas/MiniMap.tsx`

- A small thumbnail overview of the entire canvas shown in the bottom-left corner.
- The visible viewport region is rendered as a highlighted rectangle.
- Clicking on the minimap pans the viewport to that position.
- Toggled via `minimapOpen` in the store.

---

## 11. Context Menu

File: `/src/app/features/canvas-studio/components/canvas/CanvasContextMenu.tsx`

- Right-click context menu on the canvas.
- Items: Copy, Paste, Delete, Duplicate, Bring to Front, Send to Back, Lock/Unlock, Group/Ungroup.
- Position stored in `contextMenuPos: { x, y } | null` in the store.
- Dismissed by clicking outside or pressing Escape.

---

## 12. Sticky Notes

- Sticky notes are a special Fabric object type (`sticky`).
- Available colours (from `STICKY_COLORS`):
  - Amber, Blue, Emerald, Pink, Violet, Red, Sky, Purple (all `*-100` palette)
- Double-clicking a sticky note enters text edit mode.

---

## 13. Export Dialog

File: `/src/app/features/canvas-studio/components/dialogs/ExportDialog.tsx`

### Export Formats
| Format | Description |
|---|---|
| `png` | PNG image (with optional transparent background) |
| `jpeg` | JPEG image with quality setting |
| `svg` | SVG vector export |
| `pdf` | PDF document |
| `json` | Raw Fabric.js JSON (for backup/restore) |

- `includeBackground` toggle: if false, exports with transparent background (PNG/SVG only).
- `quality` slider: 0.1–1.0 for JPEG.
- Optional custom `width` and `height` for the output image.

---

## 14. AI Generator Dialog

File: `/src/app/features/canvas-studio/components/dialogs/AIGeneratorDialog.tsx`

- Allows users to generate design content via AI prompts.
- Input: text prompt describing what to add to the canvas.
- Output: Fabric.js objects added to the current canvas.
- Uses a stub/mock implementation unless connected to a real AI backend.

---

## 15. Snap Guides

```ts
interface SnapGuide {
  orientation: 'horizontal' | 'vertical';
  position: number; // pixels from canvas edge
}
```

- Snap guides are transient — they are set during drag operations and cleared when dragging stops.
- `SNAP_THRESHOLD = 10px` — how close an object must be before snapping activates.
- Snap guides are drawn as coloured lines overlaying the canvas.

---

## 16. Logger

File: `/src/app/features/canvas-studio/utils/logger.ts`

- Structured logger with levels: `DEBUG`, `INFO`, `WARN`, `ERROR`.
- Usage: `logger.info(message)`, `logger.warn(message)`, `logger.error(message)`.
- In production builds, `DEBUG` level is suppressed.
- Use `logger` (not `console.log`) for all Canvas Studio internal logging.

---

## 17. Object Metadata

```ts
interface CanvasObjectMeta {
  id: string;
  type: string;
  createdAt: number;
  createdBy: string;
  locked: boolean;
  groupId?: string;
  isTemplate?: boolean;
}
```

- Every Fabric object should have custom metadata attached via `fabricObject.set('meta', meta)`.
- `id` is used for selection tracking in `selectedObjectIds`.
- `locked: true` prevents move/resize/delete interactions.

---

## 18. Welcome Overlay

File: `/src/app/features/canvas-studio/components/canvas/WelcomeOverlay.tsx`

- Shown on first load of an empty canvas (no objects, no saved project loaded).
- Dismissed by clicking, pressing any key, or adding the first object.
- After dismissal, a flag is set to `localStorage` so it doesn't appear again for that user.

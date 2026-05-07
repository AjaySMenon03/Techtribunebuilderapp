# Canvas Studio — Project Documentation & Regeneration Prompt

---

## PART 1 — PROJECT DOCUMENTATION

### 1.1 Purpose
A professional infinite-canvas whiteboard built on **Fabric.js v7**. Supports freeform drawing, shapes, sticky notes, text, images, flowchart elements, multi-project management, full undo/redo, snap-to-grid, viewport minimap, AI content generation hook, and multi-format export (PNG/JPEG/SVG/PDF/JSON).

### 1.2 Tech Stack
- React 18 + TypeScript, Tailwind CSS v4
- **Fabric.js v7** (mandatory — NOT Konva)
- Zustand for canvas state
- react-router
- `jspdf` for PDF export
- `lucide-react` icons, sonner toasts, motion/react
- localStorage persistence (Supabase optional/future)

### 1.3 Routes
| Path | Page |
|---|---|
| `/canvas-studio` | Project list (`CanvasProjectsList` → `CanvasStudioPage`) |
| `/canvas-studio/:id` | Editor (`CanvasStudioEditorPage` → `CanvasStudio`) |

### 1.4 File Structure
```
/src/app/features/canvas-studio/
  CanvasStudio.tsx                # main orchestrator
  CanvasProjectsList.tsx
  index.ts
  store/
    canvasStudioStore.ts          # Zustand
  types/
    canvasTypes.ts                # types + constants
  components/
    canvas/
      CanvasCore.tsx              # Fabric.js wrapper (imperative)
      MiniMap.tsx
      WelcomeOverlay.tsx
      CanvasContextMenu.tsx
    toolbar/
      FloatingToolbar.tsx         # left tool palette
      TopActionBar.tsx            # save/export/AI/history/etc
      ZoomControls.tsx            # bottom-right
    panels/
      RightPanel.tsx              # object properties
    dialogs/
      ExportDialog.tsx
      AIGeneratorDialog.tsx
      SaveLoadDialog.tsx
      KeyboardShortcutsDialog.tsx
  utils/
    canvasHelpers.ts              # localStorage persistence
    logger.ts                     # structured logger
```

### 1.5 Fabric.js Architecture
- All Fabric mutations live inside `CanvasCore.tsx`.
- `CanvasCore` exposes an imperative handle via `forwardRef` + `useImperativeHandle`:
  ```ts
  interface CanvasCoreHandle {
    loadJSON(json: string): Promise<void>;
    getJSON(): string;
    exportImage(format: ExportFormat, options: ExportOptions): Promise<Blob>;
    addObject(...): void;
    removeSelected(): void;
    // etc
  }
  ```
- Parent `CanvasStudio` holds `canvasRef = useRef<CanvasCoreHandle>()` and calls methods on it.
- After every Fabric mutation: `canvas.requestRenderAll()`.
- History snapshots: `canvas.toJSON()` → `pushHistory(json)`.

**Hard rule:** never mutate Fabric objects directly outside `CanvasCore`.

### 1.6 Tools

```ts
type CanvasTool =
  | 'select' | 'hand'
  | 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'star' | 'polygon'
  | 'pen' | 'brush' | 'eraser'
  | 'text' | 'sticky' | 'image'
  | 'flowchart_start' | 'flowchart_process' | 'flowchart_decision';
```

**Keyboard shortcuts:**
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

**Global shortcuts:**
- `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y` redo
- `Ctrl/Cmd+C` copy, `Ctrl/Cmd+V` paste, `Ctrl/Cmd+S` save
- `Delete` / `Backspace` delete selected
- `Escape` deselect / return to select tool
- `Space` (held) temporary hand tool (auto-revert on release)

### 1.7 Zustand Store (`useCanvasStudioStore`)

**Tools**
- `activeTool`, `previousTool`
- `setActiveTool(tool)` — saves previous

**Viewport**
- `viewport: { zoom, panX, panY }`
- `setViewport(partial)` — clamps zoom to `[ZOOM_MIN=0.1, ZOOM_MAX=5.0]`

**Selection**
- `selectedObjectIds: string[]`

**History**
- `historyStack: string[]`, `historyIndex: number`
- `pushHistory(json)` — appends, truncates forward, respects `MAX_HISTORY=50`
- `undo()` returns previous JSON or null; `redo()` returns next or null

**Grid & Snap**
- `showGrid` (default `false`), `gridSize` (default `20`, presets `20/40/80`)
- `snapEnabled` (default `true`)
- `snapGuides: SnapGuide[]` — transient

**Panels**
- `rightPanelOpen` (default `true`), `minimapOpen` (default `false`)

**Projects**
- `projects: CanvasProject[]`, `currentProjectId: string | null`
- `saveProject(p)`, `deleteProject(id)`, `loadProjectsFromStorage()`

**Dirty Flag**
- `dirty` — set on every history push, cleared on save

**Drawing**
- `brushColor` (default `#000000`), `brushWidth` (default `3`)

**Canvas Background**
- `canvasBackground: 'light'|'dark'|'dots'|'grid'|'transparent'`
- `canvasBgColor: string` — actual hex
- `setCanvasBackground(bg)` — updates both via preset map

**Clipboard**
- `clipboard: { json: string, offset: number } | null`

**Context Menu**
- `contextMenuPos: { x, y } | null`

### 1.8 Canvas Project Type

```ts
interface CanvasProject {
  id: string;
  name: string;
  canvasJSON: string;     // Fabric serialised
  thumbnail: string;      // base64 PNG
  createdAt: number;
  updatedAt: number;
}
```

**Limits (constants):**
- `MAX_OBJECTS = 2000`
- `MAX_IMAGE_SIZE = 10 * 1024 * 1024` (10 MB)
- `MAX_HISTORY = 50`
- `MAX_PROJECTS = 50`
- `AUTOSAVE_INTERVAL = 30_000` (30 s)
- `SNAP_THRESHOLD = 10` (px)
- `ZOOM_MIN = 0.1`, `ZOOM_MAX = 5.0`

**Persistence:** localStorage via `saveProjects()` / `loadProjects()` in `canvasHelpers.ts`. Local-only — Supabase sync is the future integration point in `saveProject()`.

### 1.9 Toolbars

**FloatingToolbar (left side)**
Vertical pill, grouped: Selection (select, hand), Shapes (rect, circle, triangle, line, arrow, star, polygon), Drawing (pen, brush, eraser), Objects (text, sticky, image), Flowchart (flowchart_start/process/decision). Active tool highlighted.

**TopActionBar (top)**
New project, Save (with dirty dot), Undo, Redo, Export, AI Generate, Load, Keyboard shortcuts, object count badge, grid toggle, snap toggle, background selector, right panel toggle, minimap toggle.

**ZoomControls (bottom-right)**
Slider 0.1–5×; preset buttons `0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3`; "Fit to screen"; "Reset to 100%"; percentage display.

### 1.10 Canvas Backgrounds

| Value | Render |
|---|---|
| `light` | `#f8fafc` |
| `dark` | `#0f172a` |
| `dots` | off-white + dot-pattern CSS class |
| `grid` | off-white + grid-line CSS class |
| `transparent` | no fill |

### 1.11 Right Panel
Shows properties of selected Fabric object(s):
- Fill color, stroke color, stroke width
- Opacity
- Text properties (when text selected): font family, size, weight, align
- Dimensions (W × H), Position (X, Y), Rotation

Updates apply to Fabric directly via `canvasRef`. With nothing selected: shows canvas background settings.

### 1.12 MiniMap
- Bottom-left thumbnail overview.
- Visible viewport drawn as a highlighted rectangle.
- Click to pan viewport to that position.
- Toggled via `minimapOpen`.

### 1.13 Context Menu
Right-click on canvas:
- Copy, Paste, Delete, Duplicate
- Bring to Front, Send to Back
- Lock / Unlock
- Group / Ungroup

Position stored in `contextMenuPos`. Dismiss via outside click or `Escape`.

### 1.14 Sticky Notes
Special Fabric type `sticky`. Colors from `STICKY_COLORS`: Amber, Blue, Emerald, Pink, Violet, Red, Sky, Purple (all `*-100` palette tints). Double-click to enter text edit mode.

### 1.15 Export Dialog
| Format | Description |
|---|---|
| `png` | PNG, optional transparent bg |
| `jpeg` | JPEG with quality slider (0.1–1.0) |
| `svg` | SVG vector (transparent supported) |
| `pdf` | PDF via jsPDF |
| `json` | Raw Fabric JSON for backup |

Options: `includeBackground` (PNG/SVG only), `quality` (JPEG), custom `width`/`height`.

### 1.16 AI Generator Dialog
- Text-prompt input.
- Output: Fabric objects appended to current canvas.
- Stub implementation by default; pluggable backend.

### 1.17 Snap Guides

```ts
interface SnapGuide { orientation: 'horizontal'|'vertical'; position: number }
```

Set during drag, cleared on dragend. `SNAP_THRESHOLD = 10 px`. Drawn as colored lines overlay.

### 1.18 Object Metadata

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

Attach via `fabricObject.set('meta', meta)`. `id` drives `selectedObjectIds`. `locked: true` blocks move/resize/delete.

### 1.19 Welcome Overlay
- Shown on first load of an empty canvas (no objects, no project loaded).
- Dismissed by click, any keypress, or first object added.
- Sets a localStorage flag so it never re-appears for that user.

### 1.20 Logger
File: `utils/logger.ts`. Levels `DEBUG | INFO | WARN | ERROR`. `DEBUG` suppressed in prod. Use `logger.*`, never `console.log`, for Canvas Studio internals.

### 1.21 Critical Rules
1. **Fabric.js only** — no Konva.
2. **Never mutate Fabric outside `CanvasCore`** — go through the imperative ref.
3. **Always** call `canvas.requestRenderAll()` after mutations.
4. **Always** push history snapshots via `pushHistory(canvas.toJSON())`.
5. **Always** attach `meta` (with `id`) to every created Fabric object.
6. **Honor limits**: MAX_OBJECTS 2000, MAX_IMAGE_SIZE 10 MB, MAX_HISTORY 50, MAX_PROJECTS 50.

---

## PART 2 — REGENERATION PROMPT

````
You are building **Canvas Studio**, a professional infinite-canvas whiteboard module on Fabric.js v7.

## STACK (mandatory)
- React 18 + TypeScript, Tailwind CSS v4
- **Fabric.js v7** — install `fabric@^7`. NO Konva.
- Zustand for canvas state
- react-router
- jspdf for PDF export
- lucide-react, sonner, motion/react
- localStorage for project persistence (Supabase is a future hook)

## ROUTES
- `/canvas-studio` — project list (`CanvasProjectsList`)
- `/canvas-studio/:id` — editor (`CanvasStudio`)

## FILE TREE
Place under `/src/app/features/canvas-studio/` exactly as in spec: store/, types/, components/canvas/, components/toolbar/, components/panels/, components/dialogs/, utils/.

## CORE ARCHITECTURE
`CanvasCore.tsx` is a `forwardRef` component owning the Fabric canvas. Expose an imperative handle:

```ts
interface CanvasCoreHandle {
  loadJSON(json: string): Promise<void>;
  getJSON(): string;
  exportImage(format: 'png'|'jpeg'|'svg'|'pdf'|'json', options): Promise<Blob>;
  addObject(type: CanvasTool, options?): void;
  removeSelected(): void;
  copySelected(): void;
  pasteFromClipboard(): void;
  bringToFront(): void; sendToBack(): void;
  lock(): void; unlock(): void;
  group(): void; ungroup(): void;
  zoomTo(zoom: number, point?): void;
  fitToScreen(): void;
  setBackground(bg: CanvasBackground): void;
}
```

Parent `<CanvasStudio>` keeps `canvasRef = useRef<CanvasCoreHandle>(null)` and calls these. NEVER touch Fabric objects from outside `CanvasCore`. After every mutation inside CanvasCore call `canvas.requestRenderAll()`.

## TOOLS
Implement `CanvasTool = 'select'|'hand'|'rectangle'|'circle'|'triangle'|'line'|'arrow'|'star'|'polygon'|'pen'|'brush'|'eraser'|'text'|'sticky'|'image'|'flowchart_start'|'flowchart_process'|'flowchart_decision'`.

Single-letter shortcuts: v=select, h=hand, r=rect, c=circle, l=line, a=arrow, s=star, t=text, n=sticky, b=brush, x=eraser.

Global: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo, Ctrl/Cmd+C/V/S, Delete/Backspace delete, Escape deselect, Space (hold) temp hand tool.

## ZUSTAND STORE (useCanvasStudioStore)
State slices:
- Tools: activeTool, previousTool, setActiveTool(saves previous)
- Viewport: { zoom, panX, panY }; setViewport clamps zoom to [ZOOM_MIN=0.1, ZOOM_MAX=5]
- Selection: selectedObjectIds: string[]
- History: historyStack: string[], historyIndex; pushHistory truncates forward, respects MAX_HISTORY=50; undo/redo return JSON or null
- Grid/Snap: showGrid (false), gridSize (20; presets 20/40/80), snapEnabled (true), snapGuides[]
- Panels: rightPanelOpen (true), minimapOpen (false)
- Projects: projects[], currentProjectId, saveProject, deleteProject, loadProjectsFromStorage
- Dirty flag: dirty (set on history push, cleared on save)
- Drawing: brushColor (#000), brushWidth (3)
- Canvas bg: canvasBackground ('light'|'dark'|'dots'|'grid'|'transparent'), canvasBgColor (hex), setCanvasBackground updates both
- Clipboard: { json, offset } | null
- Context menu pos

## CONSTANTS (in types/canvasTypes.ts)
MAX_OBJECTS=2000, MAX_IMAGE_SIZE=10*1024*1024, MAX_HISTORY=50, MAX_PROJECTS=50, AUTOSAVE_INTERVAL=30_000, SNAP_THRESHOLD=10, ZOOM_MIN=0.1, ZOOM_MAX=5.0.

STICKY_COLORS: amber/blue/emerald/pink/violet/red/sky/purple (-100 tints).

CanvasBackground preset color map: light=#f8fafc, dark=#0f172a, dots/grid use off-white + CSS class for pattern, transparent = no fill.

## CanvasProject
{ id, name, canvasJSON: string, thumbnail: base64 PNG, createdAt: number, updatedAt: number }. Persist array via localStorage helpers in canvasHelpers.ts. Generate thumbnail by `canvas.toDataURL({ format:'png', multiplier: 0.2 })` on save.

## CanvasObjectMeta
{ id, type, createdAt, createdBy, locked, groupId?, isTemplate? }. Attach to every object: `fabricObject.set('meta', meta)`. Use `meta.id` for selection tracking. Locked=true blocks move/resize/delete (set Fabric `lockMovementX/Y/lockScaling*/lockRotation`).

## TOOLBARS
- **FloatingToolbar** (left): vertical pill, grouped (Selection, Shapes, Drawing, Objects, Flowchart). Active highlighted.
- **TopActionBar** (top): New, Save (with dirty dot), Undo, Redo, Export, AI Generate, Load, Keyboard shortcuts, object count badge, grid toggle, snap toggle, background selector, right panel toggle, minimap toggle.
- **ZoomControls** (bottom-right): slider 0.1–5x, preset buttons (0.25/0.5/0.75/1/1.5/2/3), Fit, Reset 100%, percentage display.

## RIGHT PANEL
With selection: fill, stroke + width, opacity, text props (when text selected: family/size/weight/align), W×H, X/Y, rotation. With no selection: canvas background settings. Apply changes directly via canvasRef.

## MINIMAP
Bottom-left thumbnail. Render whole canvas at small scale + a highlighted rect for the visible viewport. Clicking the minimap pans to that point. Toggled via `minimapOpen`.

## CONTEXT MENU
Right-click on canvas. Items: Copy, Paste, Delete, Duplicate, Bring to Front, Send to Back, Lock/Unlock, Group/Ungroup. Position from `contextMenuPos`. Dismiss on outside click / Escape.

## STICKY NOTES
Custom Fabric subtype `sticky`. Color picker from STICKY_COLORS. Double-click → enter Fabric text edit mode.

## SNAP GUIDES
On object:moving event, compute aligned edges/centres of nearby objects within SNAP_THRESHOLD=10 px. Push to `snapGuides`. Render as colored overlay lines. Clear on object:modified.

## EXPORT DIALOG
Formats: png (with includeBackground toggle for transparent), jpeg (quality 0.1–1.0 slider), svg (with includeBackground), pdf (via jsPDF — single page sized to canvas bounds), json (raw `canvas.toJSON()`). Optional custom width/height.

## AI GENERATOR DIALOG
Text prompt input → mock backend (return placeholder Fabric object spec) → append to canvas. Stub the API; production wires to a real service.

## CANVAS BACKGROUNDS
Implement 5 modes; for `dots` and `grid` use off-white fill plus a CSS class on the canvas wrapper that paints the pattern via `background-image: radial-gradient(...)` or `linear-gradient(...)`.

## WELCOME OVERLAY
Show on first empty canvas load (no objects + no loaded project). Dismiss on click / any key / first object added. Persist `cs-welcome-seen=1` in localStorage.

## LOGGER
utils/logger.ts with DEBUG/INFO/WARN/ERROR. Suppress DEBUG in prod (use `import.meta.env.PROD`). Use `logger` everywhere internal — no `console.log`.

## AUTOSAVE
Every 30 s, if `dirty && currentProjectId`, call `saveProject({ ...current, canvasJSON: canvasRef.current.getJSON(), updatedAt: Date.now() })` and clear `dirty`.

## CRITICAL RULES — DO NOT VIOLATE
1. Fabric.js v7 only — never use Konva.
2. All Fabric mutations go through `CanvasCore` via the ref. No direct touching from parents.
3. Always `canvas.requestRenderAll()` after mutations.
4. History snapshot = `canvas.toJSON()` → `pushHistory()`. Never store object references in history.
5. Every created object must carry `meta` with a uuid `id`.
6. Honor MAX_OBJECTS / MAX_IMAGE_SIZE / MAX_HISTORY / MAX_PROJECTS limits — show toast on hit.
7. Locking sets Fabric lock props AND `meta.locked=true`.

## ACCEPTANCE CRITERIA
- Selecting tools via toolbar OR keyboard shortcut updates `activeTool`; pen/brush enable Fabric free-drawing.
- Space (held) temporarily switches to hand; release reverts to `previousTool`.
- Drawing 5 rectangles, then Ctrl+Z 3x, returns to 2 rectangles; Ctrl+Y restores them.
- Snap guides appear when dragging an object within 10 px of another's edge/centre.
- Right panel updates an object's fill/stroke/opacity/dimensions/rotation in real time.
- Minimap shows viewport rectangle and pans on click.
- Context menu appears on right-click and dismisses on outside click / Escape.
- Export to PNG / JPEG / SVG / PDF / JSON all produce a valid file.
- Project save/load persists via localStorage; thumbnail visible in project list.
- Welcome overlay shows on first empty canvas load only.
- All limits trigger informative toasts when exceeded.
````

---

# EM Make — Profile Generator Guidelines

## 1. Overview

The Profile Generator is a canvas-based tool for creating visually branded employee profile cards. Users can compose layered images, backgrounds, foreground overlays, and name text — then export as PNG/JPG or save as reusable templates.

It lives at:
- `/profile-generator` — Profile list page
- `/profile-generator/editor?templateId=xxx` — New profile from template
- `/profile-generator/:id` — Edit existing saved profile

---

## 2. Architecture

The Profile Generator is a self-contained feature module at:
```
/src/app/features/profile-generator/
  ProfileListPage.tsx         # List of saved profiles + template picker
  ProfileEditorPage.tsx       # Three-panel editor (layers / canvas / settings)
  components/
    editor/
      EditorCanvas.tsx        # HTML Canvas renderer (draws layers)
      LayerPanel.tsx          # Layer stack list with drag-reorder
      SettingsPanel.tsx       # Per-layer settings (fill, image, text, adjustments)
      EditorToolbar.tsx       # Top action bar (save, export, undo, redo)
      AssetBrowserSheet.tsx   # Slide-in sheet to browse library assets
      ExportDialog.tsx        # Export modal (PNG/JPG format, quality)
      ImageAdjustmentsPanel.tsx # Brightness/contrast/saturation/blur/blend mode panel
      SaveTemplateDialog.tsx  # Dialog to save current state as a reusable template
    BulkActionBar.tsx         # Multi-select bulk actions on profile list
    EmptyState.tsx            # Empty state for profile list
    ProfileCard.tsx           # Profile thumbnail card (grid item)
    TemplatePicker.tsx        # Template selection modal
  hooks/
    useEditorState.ts         # useReducer-based editor state management
    useImageCache.ts          # Image preload cache for canvas performance
    useProfiles.ts            # Profile CRUD (calls pg-api.ts)
  utils/
    editor-types.ts           # Layer types, ImageAdjustments, EditorState, EditorAction
    pg-types.ts               # LibraryAsset, ProfileTemplate, SavedProfile types
    pg-api.ts                 # Supabase KV API calls for assets/templates/profiles
    constants.ts              # Canvas size presets, category lists
    canvas-renderer.ts        # Imperative canvas draw functions (per layer type)
    export-utils.ts           # generateThumbnail(), dataURLtoBlob()
    face-detection.ts         # Optional face-detection helpers for auto-crop
    mock-data.ts              # Mock assets/templates for offline/dev use
    types.ts                  # Shared utility types
```

---

## 3. Layer System

### Layer Types
```ts
type LayerType = 'background' | 'image' | 'foreground' | 'name';
```

| Type | Purpose |
|---|---|
| `background` | Solid/gradient fill covering the whole canvas |
| `image` | A raster image (photo) with full image adjustments |
| `foreground` | Solid/gradient fill overlay (e.g. coloured band) |
| `name` | Text label (person's name, title, etc.) |

### `EditorLayer` Interface
```ts
interface EditorLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number; y: number;
  width: number; height: number;
  rotation: number;    // degrees
  opacity: number;     // 0–1
  visible: boolean;
  locked: boolean;

  // Background / Foreground
  fill?: string;
  fillType?: 'solid' | 'gradient';
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;  // degrees — 0 = top-to-bottom, 90 = left-to-right

  // Image
  src?: string;
  storagePath?: string;     // Supabase Storage path for URL re-signing
  adjustments?: ImageAdjustments;

  // Name (text)
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: string;
  textAlign?: CanvasTextAlign;
}
```

### Default Layer Values
- Background default fill: `#f4efe5`
- Foreground default fill: `rgba(0,0,0,0.05)`
- Image default size: `160×160px`, centred on canvas
- Name default: `'Full Name'`, `fontSize: 24`, `fontColor: '#1a1a1a'`, `fontWeight: '600'`
- Default canvas size: `400×500px`

---

## 4. Canvas Config

```ts
interface CanvasConfig {
  width: number;      // default 400
  height: number;     // default 500
  zoom: number;       // default 1
  gridSize: number;   // default 10
  showGrid: boolean;  // default true
  showSafeMargin: boolean; // default true
  safeMargin: number; // default 20
  snapToGrid: boolean; // default true
}
```

---

## 5. Image Adjustments

All `image` layers support full non-destructive image adjustments:
```ts
interface ImageAdjustments {
  brightness: number;   // 0–200, default 100
  contrast: number;     // 0–200, default 100
  saturation: number;   // 0–200, default 100
  blur: number;         // 0–20px, default 0

  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  blendMode: BlendMode; // CSS globalCompositeOperation value

  flipH: boolean;
  flipV: boolean;

  cropEnabled: boolean;
  cropX: number;  // normalised 0–1 (relative to source image)
  cropY: number;
  cropW: number;
  cropH: number;
}
```

### Blend Modes (16 options)
`source-over`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`

---

## 6. Gradient Support

Both `background` and `foreground` layers support gradient fills:
- Set `fillType: 'gradient'` to activate.
- Requires `gradientFrom` (start colour) and `gradientTo` (end colour).
- `gradientAngle` controls direction in degrees (0° = top→bottom, 90° = left→right).
- The canvas renderer creates a `CanvasGradient` using `createLinearGradient()` based on the angle.
- The `SettingsPanel` exposes two colour pickers and an angle input when gradient mode is active.

---

## 7. Editor State (`useEditorState`)

The editor uses a `useReducer` pattern (not Zustand) for local editor state:

```ts
interface EditorState {
  layers: EditorLayer[];
  selectedLayerId: string | null;
  canvasConfig: CanvasConfig;
  profileName: string;
}
```

### Available Actions (`EditorAction`)
- `ADD_LAYER` — push a new layer to the stack
- `UPDATE_LAYER` — partial merge of changes into a layer
- `DELETE_LAYER` — remove a layer by ID
- `DUPLICATE_LAYER` — clone a layer
- `REORDER_LAYERS` — move layer by index (drag-to-reorder in `LayerPanel`)
- `SELECT_LAYER` — set `selectedLayerId`
- `TOGGLE_VISIBILITY` — flip `layer.visible`
- `TOGGLE_LOCK` — flip `layer.locked`
- `UPDATE_CANVAS_CONFIG` — partial merge of canvas settings
- `SET_PROFILE_NAME`
- `LOAD_STATE` — replace entire state (used when loading a saved profile/template)

---

## 8. Canvas Renderer

File: `/src/app/features/profile-generator/utils/canvas-renderer.ts`

- Draws all visible layers onto an HTML `<canvas>` element using the Canvas 2D API.
- Renders layers in array order (index 0 = bottom).
- For `background` / `foreground`: applies solid fill or gradient fill.
- For `image`: applies CSS-filter equivalents (brightness/contrast/saturation/blur) using `ctx.filter`, handles crop via `drawImage` with source rect, handles flip via `ctx.scale(-1,1)`, handles blend mode via `ctx.globalCompositeOperation`.
- For `name`: uses `ctx.fillText` with configured font, colour, alignment.
- Locked layers are still drawn — locking only prevents interaction in the `EditorCanvas`.
- The `EditorCanvas` component uses `useImageCache` to pre-load all layer `src` images before drawing.

---

## 9. Asset Library

File: `/src/app/features/profile-generator/utils/pg-types.ts`

```ts
interface LibraryAsset {
  id: string;
  name: string;
  type: 'foreground' | 'background';
  category: AssetCategory;
  tags: string[];
  url: string;
  storagePath: string;
  width: number; height: number;
  createdAt: string;
  createdBy: string;
}
```

### Asset Categories
`Abstract`, `Geometric`, `Gradient`, `Pattern`, `Photo`, `Texture`, `Frame`, `Overlay`, `Other`

- Assets are stored in the Supabase `pg` storage bucket.
- Asset metadata is stored in the KV store (`pg-asset:{id}`).
- The `AssetBrowserSheet` allows users to browse/filter/search library assets and apply them to the selected layer.

---

## 10. Template System

```ts
interface ProfileTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnailUrl: string | null;
  canvasConfig: CanvasConfig;
  layers: EditorLayer[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isSystem: boolean; // true = admin template, false = user-saved
}
```

### Template Categories
`Engineer Spotlight`, `Leadership Bio`, `Team Member`, `New Hire Welcome`, `Creative Portfolio`, `Minimal`, `Custom`

- Templates are stored in KV: `pg-template:{id}`.
- System templates (`isSystem: true`) are created by admins and shared across the workspace.
- Users can save their own templates via `SaveTemplateDialog`.
- Templates are selected from `TemplatePicker` when creating a new profile.

---

## 11. Saved Profiles

```ts
interface SavedProfile {
  id: string;
  name: string;
  templateId: string | null;
  canvasConfig: CanvasConfig;
  layers: EditorLayer[];
  thumbnailUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

- Saved profiles are stored in KV: `pg-profile:{id}`.
- A thumbnail PNG is auto-generated via `generateThumbnail()` when saving.
- The thumbnail is uploaded to Supabase Storage and the URL stored on the profile.

---

## 12. Export

File: `/src/app/features/profile-generator/utils/export-utils.ts`

- `generateThumbnail(canvas, options)` — renders the canvas at a reduced size (default: 400×500) and returns a data URL.
- `dataURLtoBlob(dataUrl)` — converts a data URL to a `Blob` for upload/download.
- The `ExportDialog` supports PNG and JPG formats with quality selection.
- Exports capture the canvas element directly using `canvas.toDataURL()`.

---

## 13. Interaction Model (EditorCanvas)

File: `/src/app/features/profile-generator/components/editor/EditorCanvas.tsx`

- Handles mouse/touch events for: **drag** (move layer), **resize** (8-handle bounding box), **rotate** (rotate handle above the layer).
- Interaction modes (local state, not in store):
  - `idle`
  - `dragging` — tracks `startX/Y`, `origX/Y`
  - `resizing` — tracks `handle: HandlePosition`, original bounds
  - `rotating` — tracks `startAngle`, `origRotation`
- `snapToGrid` snaps `x/y` to the nearest `gridSize` multiple using `snapValue()`.
- Locked layers: interaction is blocked — clicking a locked layer shows a "locked" toast.
- Safe margin guide is drawn as a dashed rectangle when `showSafeMargin` is true.
- Grid is drawn as a pattern of dots/lines when `showGrid` is true.

### Handle Positions
```
nw  n  ne
w       e
sw  s  se
```

---

## 14. Layer Panel

File: `/src/app/features/profile-generator/components/editor/LayerPanel.tsx`

- Lists all layers in reverse render order (topmost layer at top of list).
- Each row: drag handle, layer type icon, layer name, visibility toggle, lock toggle, delete button.
- Layers are reordered via `@dnd-kit/sortable` → dispatches `REORDER_LAYERS`.
- Double-clicking a layer name enables inline rename.

---

## 15. Mobile Layout

- Below 1024px the editor switches to a single panel with a bottom tab bar (`Layers`, `Canvas`, `Settings`).
- The canvas is always shown by default on first load on mobile.
- All panels are individually scrollable.

---

## 16. Supabase KV API

File: `/src/app/features/profile-generator/utils/pg-api.ts`

Key operations:
- `listAssets(type?)` — fetch all library assets (optionally filtered by type)
- `getAsset(id)` — fetch single asset
- `saveAsset(asset)` — upsert asset metadata
- `deleteAsset(id)` — remove asset
- `listTemplates()` — fetch all templates
- `saveTemplate(template)` — upsert template
- `deleteTemplate(id)`
- `listProfiles(userId)` — fetch profiles for a user
- `getProfile(id)` — fetch single profile
- `saveProfile(profile)` — upsert profile
- `deleteProfile(id)`

All calls go through `/supabase/functions/server/` edge functions using the KV store pattern.

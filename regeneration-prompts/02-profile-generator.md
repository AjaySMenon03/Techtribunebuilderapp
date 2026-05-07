# Profile Generator — Project Documentation & Regeneration Prompt

---

## PART 1 — PROJECT DOCUMENTATION

### 1.1 Purpose
A canvas-based editor for creating branded employee profile cards. Users compose layered images, gradient backgrounds, foreground overlays, and styled name text, then export as PNG/JPG or save as reusable templates. Includes asset library, image adjustments (brightness/contrast/saturation/blur, blend modes, crop, flip, drop shadow), gradient fills, and Supabase-backed asset/template/profile storage.

### 1.2 Tech Stack
- React 18 + TypeScript, Tailwind CSS v4
- **Local editor state:** React `useReducer` (NOT Zustand for the editor itself)
- Supabase (Storage + KV-backed edge functions)
- HTML Canvas 2D API (imperative draw — no Konva, no Fabric)
- `@dnd-kit` for layer reorder
- `lucide-react` icons, sonner toasts
- `react-router` for routing

### 1.3 Routes
| Path | Purpose |
|---|---|
| `/profile-generator` | Profile list + template picker (`ProfileListPage`) |
| `/profile-generator/editor?templateId=xxx` | New profile from template (`ProfileEditorPage`) |
| `/profile-generator/:id` | Edit existing saved profile |

### 1.4 File Structure
```
/src/app/features/profile-generator/
  ProfileListPage.tsx
  ProfileEditorPage.tsx
  components/
    BulkActionBar.tsx
    EmptyState.tsx
    ProfileCard.tsx
    TemplatePicker.tsx
    editor/
      EditorCanvas.tsx           # HTML canvas renderer + interactions
      LayerPanel.tsx              # layer stack list with dnd-kit
      SettingsPanel.tsx           # per-layer settings
      EditorToolbar.tsx           # save/export/undo/redo
      AssetBrowserSheet.tsx       # library asset slide-in
      ExportDialog.tsx
      ImageAdjustmentsPanel.tsx
      SaveTemplateDialog.tsx
  hooks/
    useEditorState.ts             # useReducer
    useImageCache.ts              # preload cache for canvas perf
    useProfiles.ts                # CRUD via pg-api
  utils/
    editor-types.ts
    pg-types.ts
    pg-api.ts                     # Supabase edge fn calls
    canvas-renderer.ts            # imperative draw functions
    export-utils.ts
    face-detection.ts             # optional auto-crop
    constants.ts
    mock-data.ts
    types.ts
```

### 1.5 Layer System

```ts
type LayerType = 'background' | 'image' | 'foreground' | 'name';

interface EditorLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number; y: number;
  width: number; height: number;
  rotation: number;       // degrees
  opacity: number;        // 0-1
  visible: boolean;
  locked: boolean;

  // Background / Foreground
  fill?: string;
  fillType?: 'solid' | 'gradient';
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number; // 0 = top→bottom, 90 = left→right

  // Image
  src?: string;
  storagePath?: string;   // Supabase storage path for re-signing URLs
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

**Defaults:**
- Background fill: `#f4efe5`
- Foreground fill: `rgba(0,0,0,0.05)`
- Image size: `160×160`, centered
- Name: `'Full Name'`, fontSize `24`, color `#1a1a1a`, weight `'600'`
- Canvas: `400×500`

### 1.6 Canvas Config

```ts
interface CanvasConfig {
  width: number;          // 400
  height: number;         // 500
  zoom: number;           // 1
  gridSize: number;       // 10
  showGrid: boolean;      // true
  showSafeMargin: boolean;// true
  safeMargin: number;     // 20
  snapToGrid: boolean;    // true
}
```

### 1.7 Image Adjustments

```ts
interface ImageAdjustments {
  brightness: number;   // 0-200 default 100
  contrast: number;     // 0-200 default 100
  saturation: number;   // 0-200 default 100
  blur: number;         // 0-20 px default 0

  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  blendMode: BlendMode;  // ctx.globalCompositeOperation value

  flipH: boolean;
  flipV: boolean;

  cropEnabled: boolean;
  cropX: number;        // 0-1 normalised
  cropY: number;
  cropW: number;
  cropH: number;
}
```

**Blend modes (16):** `source-over, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity`.

### 1.8 Gradient Fills
- Both `background` and `foreground` layers support `fillType: 'gradient'`.
- Render via `ctx.createLinearGradient()` based on `gradientAngle`:
  - 0° = top→bottom, 90° = left→right.
- Settings panel exposes two color pickers + angle input when gradient is active.

### 1.9 Editor State (`useEditorState`)
React `useReducer`:

```ts
interface EditorState {
  layers: EditorLayer[];
  selectedLayerId: string | null;
  canvasConfig: CanvasConfig;
  profileName: string;
}

type EditorAction =
  | { type:'ADD_LAYER'; layer:EditorLayer }
  | { type:'UPDATE_LAYER'; id:string; patch:Partial<EditorLayer> }
  | { type:'DELETE_LAYER'; id:string }
  | { type:'DUPLICATE_LAYER'; id:string }
  | { type:'REORDER_LAYERS'; from:number; to:number }
  | { type:'SELECT_LAYER'; id:string|null }
  | { type:'TOGGLE_VISIBILITY'; id:string }
  | { type:'TOGGLE_LOCK'; id:string }
  | { type:'UPDATE_CANVAS_CONFIG'; patch:Partial<CanvasConfig> }
  | { type:'SET_PROFILE_NAME'; name:string }
  | { type:'LOAD_STATE'; state:EditorState };
```

### 1.10 Canvas Renderer
File: `utils/canvas-renderer.ts`. Pure functions; `EditorCanvas` wires them.
- Iterates layers in array order (index 0 = bottom).
- `background`/`foreground`: solid fill via `ctx.fillStyle = layer.fill` OR gradient via `ctx.createLinearGradient(...)`.
- `image`:
  - Apply `ctx.filter = "brightness() contrast() saturate() blur()"`.
  - Crop via `drawImage(img, sx,sy,sw,sh, dx,dy,dw,dh)` using normalised crop rect.
  - Flip via `ctx.scale(±1, ±1)` with translated origin.
  - Blend via `ctx.globalCompositeOperation = blendMode`.
  - Drop shadow via `ctx.shadowColor / shadowBlur / shadowOffsetX / shadowOffsetY`.
- `name`: `ctx.font = "${weight} ${size}px ${family}"; ctx.fillStyle; ctx.textAlign; ctx.fillText(text, x, y)`.
- Locked layers still draw — locking only disables interaction.
- Use `useImageCache` to preload all `src` images before drawing.

### 1.11 Interaction Model (`EditorCanvas`)
Local component state (NOT in store):
- `idle`
- `dragging` — `startX/Y`, `origX/Y`
- `resizing` — `handle: HandlePosition`, original bounds
- `rotating` — `startAngle`, `origRotation`

Eight resize handles: `nw, n, ne, e, se, s, sw, w` + a rotate handle above the bounding box.

`snapToGrid`: snap `x/y` to nearest `gridSize` multiple via `snapValue(v, g) = Math.round(v/g)*g`.

Locked layers: clicking shows a "locked" toast; no drag/resize.

Safe margin guide drawn as a dashed rect when `showSafeMargin`. Grid drawn as dot/line pattern when `showGrid`.

### 1.12 Asset Library

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

**Categories:** `Abstract, Geometric, Gradient, Pattern, Photo, Texture, Frame, Overlay, Other`.

- Files in Supabase `pg` storage bucket.
- Metadata in KV store (`pg-asset:{id}`).
- `<AssetBrowserSheet>` — slide-in: filter by type/category, search by name/tags, click to apply to selected layer.

### 1.13 Templates

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
  isSystem: boolean;
}
```

**Categories:** `Engineer Spotlight, Leadership Bio, Team Member, New Hire Welcome, Creative Portfolio, Minimal, Custom`.

- Stored in KV (`pg-template:{id}`).
- `isSystem: true` = admin/shared; `false` = user-saved via `<SaveTemplateDialog>`.
- Selected from `<TemplatePicker>` when creating a new profile.

### 1.14 Saved Profiles

```ts
interface SavedProfile {
  id, name, templateId|null, canvasConfig, layers, thumbnailUrl|null, createdBy, createdAt, updatedAt
}
```

- Stored in KV (`pg-profile:{id}`).
- Thumbnail PNG auto-generated via `generateThumbnail(canvas, {width:400, height:500})` on save, uploaded to Supabase Storage, URL stored on profile record.

### 1.15 Export
File: `utils/export-utils.ts`.
- `generateThumbnail(canvas, options)` → data URL.
- `dataURLtoBlob(dataUrl)` → Blob.
- `<ExportDialog>`: PNG / JPG, quality slider (JPG only).
- Captures `canvas.toDataURL(mime, quality)` directly.

### 1.16 Mobile Layout
- Below 1024px: single-panel + bottom tab bar (`Layers / Canvas / Settings`).
- Canvas tab is default on first load (mobile).
- Each panel scrolls independently.

### 1.17 Supabase KV API (`pg-api.ts`)
All calls hit `/supabase/functions/server/` edge functions with KV pattern:
- `listAssets(type?)`, `getAsset(id)`, `saveAsset(asset)`, `deleteAsset(id)`
- `listTemplates()`, `saveTemplate()`, `deleteTemplate(id)`
- `listProfiles(userId)`, `getProfile(id)`, `saveProfile(profile)`, `deleteProfile(id)`

### 1.18 Critical Rules
- **No** Konva, **no** Fabric.js — pure HTML Canvas 2D.
- **Editor state uses `useReducer`**, not Zustand (Zustand is reserved for global app stores).
- **Always** preload images via `useImageCache` before rendering canvas.
- **Always** persist Supabase storage paths (`storagePath`) so URLs can be re-signed.

---

## PART 2 — REGENERATION PROMPT

````
You are building the **Profile Generator** module — a canvas-based profile-card composer with layers, gradients, image adjustments, asset library, templates, and PNG/JPG export.

## STACK (mandatory)
- React 18 + TypeScript, Tailwind CSS v4
- HTML Canvas 2D API (NO Konva, NO Fabric)
- React `useReducer` for editor state (do NOT use Zustand here)
- @dnd-kit for layer reorder
- Supabase (Storage + KV-backed edge functions at /supabase/functions/server/)
- react-router, lucide-react, sonner

## ROUTES
- `/profile-generator` — list + template picker
- `/profile-generator/editor?templateId=xxx` — new from template
- `/profile-generator/:id` — edit saved profile

## FILE TREE
Place everything under `/src/app/features/profile-generator/` exactly as in the spec (ProfileListPage, ProfileEditorPage, components/, components/editor/, hooks/, utils/).

## LAYER MODEL
Implement `EditorLayer` (in `utils/editor-types.ts`) with discriminated `type: 'background'|'image'|'foreground'|'name'`. All layers have id, name, x, y, width, height, rotation, opacity (0-1), visible, locked.

Type-specific fields:
- background/foreground: `fill`, `fillType:'solid'|'gradient'`, `gradientFrom`, `gradientTo`, `gradientAngle`
- image: `src`, `storagePath`, `adjustments: ImageAdjustments`
- name: `text`, `fontSize`, `fontFamily`, `fontColor`, `fontWeight`, `textAlign`

Defaults: background `#f4efe5`, foreground `rgba(0,0,0,0.05)`, image 160×160 centred, name "Full Name" 24px `#1a1a1a` 600.

## IMAGE ADJUSTMENTS
brightness/contrast/saturation 0-200 (100 = neutral), blur 0-20 px, shadowEnabled+color+blur+offsetX/Y, 16 blendModes (source-over, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity), flipH, flipV, cropEnabled+cropX/Y/W/H (0-1 normalised).

## GRADIENT FILLS
For background/foreground when `fillType==='gradient'`: render with `ctx.createLinearGradient(x1,y1,x2,y2)` derived from `gradientAngle` (0°=top→bottom, 90°=left→right). Add stops `0:gradientFrom`, `1:gradientTo`. SettingsPanel shows 2 color pickers + angle slider.

## CANVAS CONFIG
`{width:400, height:500, zoom:1, gridSize:10, showGrid:true, showSafeMargin:true, safeMargin:20, snapToGrid:true}`.

## EDITOR STATE
useReducer with `EditorState { layers, selectedLayerId, canvasConfig, profileName }`. Actions: ADD_LAYER, UPDATE_LAYER, DELETE_LAYER, DUPLICATE_LAYER, REORDER_LAYERS, SELECT_LAYER, TOGGLE_VISIBILITY, TOGGLE_LOCK, UPDATE_CANVAS_CONFIG, SET_PROFILE_NAME, LOAD_STATE.

## CANVAS RENDERER (utils/canvas-renderer.ts)
Pure functions taking `(ctx, layer, image?)`. Iterate visible layers in array order (0 = bottom).
- For solid fill: `ctx.fillStyle=layer.fill; ctx.fillRect(...)`.
- For gradient: build `CanvasGradient` from angle.
- For image: set `ctx.filter`, apply shadow props, set `ctx.globalCompositeOperation`, handle flip via `ctx.scale`, draw with crop rect via `drawImage(img, sx,sy,sw,sh, dx,dy,dw,dh)`.
- For name: `ctx.font = \`${weight} ${size}px ${family}\``; respect textAlign; `fillText`.
- Locked layers still render — locking only blocks interaction.

## INTERACTION (EditorCanvas)
Local state machine: idle | dragging | resizing | rotating.
8 resize handles (nw,n,ne,e,se,s,sw,w) + rotate handle above bbox.
`snapValue(v,g)=Math.round(v/g)*g` when `snapToGrid`.
Clicking locked layer → toast "Layer is locked".
Draw safe margin as dashed rect when `showSafeMargin`. Draw grid when `showGrid`.

## LAYER PANEL
- Reverse render order (top of list = top of canvas).
- Drag handle, type icon, name, visibility eye, lock, delete.
- Reorder via @dnd-kit/sortable → dispatch REORDER_LAYERS.
- Double-click name to inline-rename.

## SETTINGS PANEL
Context-sensitive per selected layer. Background/foreground: solid vs gradient toggle, color pickers, angle. Image: file upload + asset browser button + ImageAdjustmentsPanel. Name: text input, font family/weight/size/color/align. All layers: x/y/w/h/rotation/opacity sliders.

## ASSET LIBRARY
LibraryAsset { id, name, type:'foreground'|'background', category, tags[], url, storagePath, width, height, createdAt, createdBy }.
Categories: Abstract, Geometric, Gradient, Pattern, Photo, Texture, Frame, Overlay, Other.
AssetBrowserSheet: filter by type+category, search by name/tags, click to apply src+storagePath to selected layer.
Storage: Supabase `pg` bucket; metadata in KV `pg-asset:{id}`.

## TEMPLATES
ProfileTemplate { id, name, description, category, thumbnailUrl, canvasConfig, layers, createdBy, createdAt, updatedAt, isSystem }.
Categories: Engineer Spotlight, Leadership Bio, Team Member, New Hire Welcome, Creative Portfolio, Minimal, Custom.
KV `pg-template:{id}`. TemplatePicker for selection. SaveTemplateDialog to save current state.

## SAVED PROFILES
SavedProfile in KV `pg-profile:{id}`. On save: generateThumbnail at 400×500 → upload to Supabase Storage → store URL on profile.

## EXPORT
ExportDialog: PNG or JPG, quality slider (JPG only). Calls `canvas.toDataURL(mime, quality)`.

## MOBILE
Below 1024 px: single panel + bottom tab bar (Layers / Canvas / Settings). Canvas is default tab on mobile first load.

## CRITICAL RULES
1. NO Konva, NO Fabric — pure Canvas 2D.
2. Editor state uses useReducer, NOT Zustand.
3. Preload images with `useImageCache` BEFORE drawing.
4. Always persist `storagePath` so URLs can be re-signed later.
5. Locked layers must still render but reject pointer interactions.

## ACCEPTANCE CRITERIA
- Adding background/image/foreground/name layer renders correctly with the documented defaults.
- Toggling fillType to 'gradient' shows two color inputs + angle and renders a linear gradient.
- All four image adjustments (brightness/contrast/saturation/blur) apply via ctx.filter.
- All 16 blend modes work via globalCompositeOperation.
- Drag/resize/rotate work with 8 handles + rotate handle; locked layers reject these.
- Snap-to-grid quantises x/y to gridSize multiples.
- Asset browser filters and search apply src+storagePath to the selected layer.
- Saving a profile generates and uploads a 400×500 thumbnail.
- PNG and JPG export via canvas.toDataURL succeed.
- Below 1024 px: tabbed mobile layout, canvas tab default on load.
````

---

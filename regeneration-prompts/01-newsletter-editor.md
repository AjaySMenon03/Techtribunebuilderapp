# Newsletter Editor — Project Documentation & Regeneration Prompt

---

## PART 1 — PROJECT DOCUMENTATION

### 1.1 Purpose
A WYSIWYG newsletter builder featuring a three-panel editor (sections library / live preview / settings), drag-to-reorder sections, rich-text editing, real-time collaboration, mobile-responsive previews, dark mode, auto-save, and a pixel-perfect A4 export pipeline (PNG/JPG/PDF/HTML/Email/ZIP).

### 1.2 Tech Stack
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS v4 + custom CSS tokens (`/src/styles/theme.css`, `/src/styles/editor.css`)
- **State:** Zustand (`useEditorStore`, `useNewsletterStore`, `useCollabStore`)
- **Routing:** react-router (v6+)
- **Backend:** Supabase (Auth + Postgres + Storage + Realtime)
- **Rich text:** TipTap v3 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-underline`)
- **Drag and drop:** `@dnd-kit/core`, `@dnd-kit/sortable`
- **Collab:** Yjs + custom `YjsSupabaseProvider` over Supabase Realtime broadcast
- **Sanitization:** DOMPurify
- **Export:** `html-to-image`, `jspdf`, `jszip`
- **Animation:** `tw-animate-css`, `motion/react`
- **Icons:** `lucide-react`

### 1.3 Routes
| Path | Page |
|---|---|
| `/newsletters` | Newsletter list (`NewsletterListPage`) |
| `/newsletters/new` | Create new |
| `/newsletters/:id` | Editor (`EditorPage`) |

### 1.4 Three-Panel Layout
- **Left sidebar:** Section library — drag-to-reorder list, add/delete/visibility toggle per section, presence bar.
- **Centre canvas:** Live preview, switchable between `desktop (700px)`, `mobile (375px)`, `a4 (595px)`. Width-constrained `<SectionPreview>` tree with `@dnd-kit` SortableContext.
- **Right panel:** Context-sensitive settings for `selectedSectionId`. Includes mobile-override controls.

### 1.5 Responsive Behaviour
- `useIsNarrow` breakpoint = **1280px** (tablets get the mobile tabbed layout).
- Below 1280px: single visible panel + sticky bottom tab bar (`Preview / Sections / Settings`).
- Top bar uses `lg:` (1024px+) breakpoints; Draft/Published toggle moves to Settings panel on tablet.
- **Swipe gestures** on tab bar: ≥60px horizontal, >2.5× vertical ratio to avoid scroll/DnD conflicts. Position-indicator dots above bottom nav.

### 1.6 Data Model

```ts
interface Newsletter {
  id: string;
  title: string;
  month: number;
  year: number;
  content_json: Record<string, any>; // serialised Section[]
  theme_config: ThemeConfig | null;
  version: number;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Section {
  id: string;                  // crypto.randomUUID()
  baseType: SectionBaseType;
  visible: boolean;
  data: Record<string, any>;   // type-specific payload
  mobileOverrides?: MobileOverrides;
}

interface MobileOverrides {
  fontColor?: string;
  bgColor?: string;
  columns?: number;
  membersPerRow?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string;
  padding?: string;
  hidden?: boolean;
  memberCardColors?: Record<string, string>;
}
```

### 1.7 Section Types & Data Shapes

| baseType | Label | Data |
|---|---|---|
| `header` | Header | `{ title, subtitle, logoUrl, bannerUrl, fontColor, bgColor }` |
| `meet_engineer` | Meet the Engineer | `{ name, role, photoUrl, qna:[{id,question,answer}], funFacts:string[], fontColor, bgColor }` |
| `appreciation` | Appreciation | `{ members:[{id,name,photoUrl,photoUrls?:string[],message:HTML,cardColor}], fontColor, bgColor, membersPerRow:1\|2\|3\|4 }` |
| `project_update` | Project Update | `{ status:'planning'\|'in_progress'\|'completed'\|'on_hold', columns:1\|2\|3, content:HTML, fontColor, bgColor }` |
| `founder_focus` | Founder Focus | `{ quote, name, designation, textAlign, fontColor, bgColor }` |
| `divider` | Divider | `{ }` |
| `comic` | Add Image | `{ imageUrl, caption:HTML, captionPosition:'above'\|'below', captionAlign, heading, fontColor, bgColor }` |
| `footer` | Footer | `{ content:HTML, socialLinks:[{platform,url}], fontColor, bgColor }` |

**Status badge colours:** planning `#6366f1`, in_progress `#f59e0b`, completed `#22c55e`, on_hold `#ef4444`.

### 1.8 Editor Store (`useEditorStore`)
State: `sections`, `selectedSectionId`, `previewMode`, `darkModePreview`, `dirty`, `lastSavedAt`, `collabActive`.
Actions: `addSection`, `duplicateSection`, `removeSection`, `updateSectionData`, `toggleSectionVisibility`, `reorderSections`, `updateMobileOverride`, `clearMobileOverride`, `clearAllMobileOverrides`, `getSanitizedSections`.

**Collab rule:** When `collabActive`, all mutations route through `CollabDelegate` (Yjs methods) so Yjs remains source of truth.

### 1.9 Rich Text — Three-Location CSS Sync Rule
Rich text classes MUST be kept identical across:
1. `/src/styles/editor.css` — live editor in browser
2. `/src/app/lib/export/a4-dom-renderer.tsx` — `<style>` in `OffscreenNewsletter`
3. `/src/app/lib/export/css-generator.ts` — Web/Email export HTML

Class families: `.project-update-content`, `.comic-caption`, `.appreciation-message`, `.footer-content`.

**Spacing rules (everywhere):**
- `p`: `margin: 0 0 8px 0` (last-child `0`)
- `ul/ol`: `margin: 8px 0; padding-left: 24px`
- `li`: `margin: 0 0 4px 0` (last-child `0`)
- `li p`: `margin: 0`
- `h1/h2/h3`: `margin: 12px 0 8px 0` (first-child top `0`)
- Appreciation tighter: `p 0 0 4px`, `li 0 0 2px`, `font-size: 12px`

### 1.10 Auto-save & Collaboration
- **Auto-save:** every `15,000ms` when `dirty === true` → `useNewsletterStore.autoSave()` (debounced Supabase update) → `markClean(savedAt)`.
- **Collab:** Yjs `Y.Doc` synced over Supabase Realtime broadcast via `YjsSupabaseProvider`. `PresenceBar` shows remote users with cursor colours. Version history via `VersionSnapshot` + `VersionHistoryPanel`.

### 1.11 Export Pipeline
| Format | Handler | Output |
|---|---|---|
| `web-html` | `exportWebHtml()` | Standalone HTML with embedded CSS |
| `email-html` | `exportEmailHtml()` | Table-based HTML for email clients |
| `a4-png` | `captureA4Image('png')` | PNG @ pixelRatio 2 |
| `a4-jpg` | `captureA4Image('jpg')` | JPEG @ 0.92 quality |
| `a4-pdf` | `captureA4Pdf()` | Multi-page jsPDF |
| `zip` | `exportZipBundle()` | index.html + email.html + style.css + assets/ |
| `clipboard` | `copyHtmlToClipboard()` | Email HTML + plain text |

**A4 DOM Renderer (`a4-dom-renderer.tsx`):**
- Mounts `<OffscreenNewsletter>` via `ReactDOM.createRoot` into a `position:fixed; left:-99999px` div.
- Waits: 2× `requestAnimationFrame` + all `<img>` loads + `document.fonts.ready`.
- Captures with `html-to-image` (`toPng` / `toJpeg`) at `pixelRatio: 2`.
- A4 constants: width `794px`, min-height `1123px`, page padding `48px h × 40px v`, newsletter card max-width `600px`.
- Forces `previewMode='desktop'` during render, restores after.
- Multi-page PDF: slices image per page using `jsPDF.addImage` with negative Y offset.

**`A4ExportPreviewModal`:** zoom controls, dark/light toggle, PNG/JPG/PDF format tabs, one-click download. Uses `renderA4ToDataUrl()`.

### 1.12 Theming
- Default palette: bg `#f4efe5`, card `#e9e0cc`, font `#000000`.
- Heading font: `'Libre Caslon Text', serif`.
- Dark mode preview: `applyDarkModeToSection()` per visible section before rendering.

### 1.13 Typography Constants
- `BASE_LINE_HEIGHT = 1.6`
- `HEADING_LINE_HEIGHT = 1.3`
- `TIGHT_LINE_HEIGHT = 1.4`
- `isDarkBackground()` drives secondary/answer/placeholder text colour decisions.

### 1.14 File Structure
```
/src/app/
  pages/
    editor.tsx                       # /newsletters/:id
    newsletter-list.tsx
  components/editor/
    editor-top-bar.tsx
    editor-left-sidebar.tsx
    preview-canvas.tsx
    section-previews.tsx
    section-settings-panel.tsx
    rich-text-editor.tsx
    mobile-override-badge.tsx
    a4-export-preview-modal.tsx
    presence-bar.tsx
    version-history-panel.tsx
  lib/
    types.ts
    editor-types.ts
    editor-store.ts
    newsletter-store.ts
    collab-store.ts
    yjs-supabase-provider.ts
    sanitize.ts
    export/
      a4-dom-renderer.tsx
      css-generator.ts
      web-export.ts
      email-export.ts
      zip-export.ts
      pdf-export.ts
  styles/
    theme.css
    editor.css
    fonts.css
```

### 1.15 Critical Rules
- **NEVER** override `columns:1` for mobile in CSS — read from section data / mobile overrides.
- **NEVER** mutate sections directly when `collabActive` — go through `CollabDelegate`.
- **ALWAYS** sanitize HTML via `sanitizeHtml()` before persistence.
- **ALWAYS** keep the three rich-text CSS locations in sync.
- **Default exports** include the inline-style approach used by `SectionPreview` (no Tailwind in export-bound layout).

---

## PART 2 — REGENERATION PROMPT

Copy the entire block below into a new Figma Make / Claude project to regenerate this feature.

````
You are building the **Newsletter Editor** module of a web application. Implement it exactly to spec.

## STACK (mandatory)
- React 18 + TypeScript, Tailwind CSS v4, Zustand, react-router
- TipTap v3 (starter-kit, link, underline) for rich text
- @dnd-kit/core + @dnd-kit/sortable for drag-to-reorder
- DOMPurify for HTML sanitization
- html-to-image, jspdf, jszip for exports
- Supabase (auth, postgres, storage, realtime broadcast)
- Yjs + custom YjsSupabaseProvider for collaboration
- lucide-react icons, tw-animate-css, motion/react, sonner toasts

## ROUTES
- `/newsletters` — list page
- `/newsletters/new` — create
- `/newsletters/:id` — three-panel editor

## DATA MODEL
Implement these TS interfaces in `src/app/lib/editor-types.ts` and `src/app/lib/types.ts`:

```ts
interface Newsletter { id, title, month, year, content_json, theme_config, version, is_draft, created_at, updated_at, created_by }
interface Section { id: string; baseType: SectionBaseType; visible: boolean; data: Record<string,any>; mobileOverrides?: MobileOverrides }
interface MobileOverrides { fontColor?, bgColor?, columns?, membersPerRow?, textAlign?, fontSize?, padding?, hidden?, memberCardColors? }
type SectionBaseType = 'header'|'meet_engineer'|'appreciation'|'project_update'|'founder_focus'|'divider'|'comic'|'footer'
```

Each section type has its own data shape (header has title/subtitle/logoUrl/bannerUrl/fontColor/bgColor; project_update has status/columns/content/fontColor/bgColor with status enum 'planning'|'in_progress'|'completed'|'on_hold' and columns 1|2|3; etc — see full spec).

## LAYOUT
Three panels at ≥1280px wide:
- **Left:** section library list with drag handles, add button (opens picker for all baseTypes), visibility eye toggle, delete button. Drag-end calls `reorderSections(activeId, overId)`.
- **Centre:** `<PreviewCanvas>` width-constrained to one of `{desktop:700, mobile:375, a4:595}` px. Renders `<SectionPreview section={s}>` for every visible section inside `<SortableContext>`. Use INLINE STYLES for layout (not Tailwind) so live preview matches exports.
- **Right:** context-sensitive settings panel for `selectedSectionId`. Calls `updateSectionData(id, partial)` on every change. Mobile-specific fields call `updateMobileOverride(id, partial)`.

Below 1280px (`useIsNarrow`): collapse to single visible panel + sticky bottom tab bar with three tabs (Preview/Sections/Settings). Add swipe-gesture navigation: ≥60px horizontal AND >2.5× vertical ratio. Show position-indicator dots above the bottom nav. Move the Draft/Published toggle from top bar into Settings panel at this breakpoint.

## EDITOR STORE (Zustand, `useEditorStore`)
State: sections, selectedSectionId, previewMode ('desktop'|'mobile'|'a4'), darkModePreview, dirty, lastSavedAt, collabActive.
Actions: addSection, duplicateSection, removeSection, updateSectionData, toggleSectionVisibility, reorderSections, updateMobileOverride, clearMobileOverride, clearAllMobileOverrides, getSanitizedSections.

When `collabActive===true`, ALL mutations must route through a `CollabDelegate` whose `yjsXxx()` methods write to a shared Y.Doc — Yjs is then source of truth and changes flow back via observers.

## RICH TEXT
- Build `<RichTextEditor>` on TipTap v3 with bold/italic/underline/link/bulletList/orderedList/blockquote.
- Output: HTML string, sanitized via DOMPurify (`sanitizeHtml`) before save.
- Keep these four classes' CSS IDENTICAL across THREE locations (this is critical):
  1. `/src/styles/editor.css`
  2. `<style>` block inside `OffscreenNewsletter` in `a4-dom-renderer.tsx`
  3. `css-generator.ts` (web/email exports)

  Classes: `.project-update-content`, `.comic-caption`, `.appreciation-message`, `.footer-content`.

  Spacing: `p {margin:0 0 8px 0; last-child 0}`, `ul/ol {margin:8px 0; padding-left:24px}`, `li {margin:0 0 4px 0; last-child 0}`, `li p {margin:0}`, `h1/h2/h3 {margin:12px 0 8px 0; first-child top 0}`. Appreciation tighter (`p 0 0 4px`, `li 0 0 2px`, font-size 12px).

## AUTO-SAVE
Every 15,000 ms in `EditorPage`, if `dirty`, call `useNewsletterStore.autoSave()` → debounced Supabase update → on success call `markClean(savedAt)`.

## COLLABORATION
- `YjsSupabaseProvider` syncs a Y.Doc over Supabase Realtime broadcast.
- Track `localUser` and `remoteUsers` (cursor colour, name) in `useCollabStore`.
- Render `<PresenceBar>` in the top bar.
- `VersionSnapshot` + `<VersionHistoryPanel>` for browse/restore of past states.

## EXPORT PIPELINE
Build `/src/app/lib/export/` with these handlers, each consuming `ExportOptions { title, sections, theme, darkMode }`:
- `exportWebHtml()` — standalone HTML + embedded CSS
- `exportEmailHtml()` — table-based HTML
- `captureA4Image(format:'png'|'jpg')` — uses `a4-dom-renderer`
- `captureA4Pdf()` — multi-page jsPDF (slice with negative Y offset)
- `exportZipBundle()` — JSZip with index.html, email.html, style.css, assets/
- `copyHtmlToClipboard()` — clipboard write of email HTML + plain text

**A4 DOM renderer** (`a4-dom-renderer.tsx`):
- Mounts `<OffscreenNewsletter>` via `ReactDOM.createRoot` into a hidden `position:fixed; left:-99999px` div.
- Force `previewMode='desktop'` during render, restore after.
- Wait for 2× `requestAnimationFrame` + every `<img>.complete` + `document.fonts.ready` before capture.
- Capture via `html-to-image.toPng / toJpeg` at `pixelRatio: 2`.
- A4 dimensions: 794×1123 px (96 dpi), page padding 48 h × 40 v, newsletter card max-width 600 px.

`<A4ExportPreviewModal>`: live preview using `renderA4ToDataUrl()`, zoom controls, dark/light toggle, PNG/JPG/PDF tabs, one-click download.

## STYLING
- Default palette: bg `#f4efe5`, card `#e9e0cc`, font `#000000`.
- Heading font `'Libre Caslon Text', serif` (import in `/src/styles/fonts.css`).
- Typography constants: BASE_LINE_HEIGHT 1.6, HEADING_LINE_HEIGHT 1.3, TIGHT_LINE_HEIGHT 1.4.
- `isDarkBackground(hex)` utility drives secondary text colour based on bg.
- `applyDarkModeToSection()` invoked on each visible section when `darkModePreview` is on.

## CRITICAL RULES — DO NOT VIOLATE
1. **Never** force `columns:1` on mobile in CSS for the project_update section — always read columns from data + mobileOverrides.
2. **Never** bypass `CollabDelegate` when `collabActive`.
3. **Always** call `sanitizeHtml()` before persisting any TipTap output.
4. **Always** keep the three rich-text CSS locations byte-identical for the four class families.
5. **Always** use inline styles inside `SectionPreview` (no Tailwind in export-bound layout).

## FILE STRUCTURE
Create the file tree exactly as documented (pages/, components/editor/, lib/, lib/export/, styles/).

## ACCEPTANCE CRITERIA
- Live preview renders identically to A4 PNG export at 600 px card width.
- Switching `previewMode` instantly resizes the canvas to 700 / 375 / 595 px.
- Reordering sections in the sidebar reorders them in the preview.
- Auto-save fires no more than once per 15 s; manual save triggers immediately.
- Collab cursors show within 200 ms of a remote edit.
- A4 PDF is multi-page when content exceeds 1123 px.
- All four rich-text classes look identical in editor / A4 export / web export / email export.
- Mobile (<1280 px): single panel, swipeable tabs with indicator dots, Draft/Published toggle in Settings.
````

---

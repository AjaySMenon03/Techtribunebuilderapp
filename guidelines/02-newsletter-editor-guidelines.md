# EM Make — Newsletter Editor Guidelines

## 1. Overview

The Newsletter Editor is the core feature of EM Make. It provides a **three-panel layout**:
- **Left Sidebar** — section library (add/reorder/toggle visibility) + collab presence bar
- **Centre** — live preview canvas (desktop / mobile / A4 preview modes)
- **Right Panel** — section settings (context-sensitive per selected section)

On mobile (`< 1024px`) this collapses to a single visible panel with a sticky bottom tab bar (`Preview`, `Sections`, `Settings`).

---

## 2. Data Model

### Newsletter
Defined in `/src/app/lib/types.ts`:
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
```

### Section
Defined in `/src/app/lib/editor-types.ts`:
```ts
interface Section {
  id: string;           // crypto.randomUUID()
  baseType: SectionBaseType;
  visible: boolean;
  data: Record<string, any>; // type-specific payload
  mobileOverrides?: MobileOverrides;
}
```

### Section Types
| `baseType` | Label | Description |
|---|---|---|
| `header` | Header | Title, subtitle, logo, banner image |
| `meet_engineer` | Meet the Engineer | Name, role, photo, Q&A, fun facts |
| `appreciation` | Appreciation | Grid of member cards with messages |
| `project_update` | Project Update | Status badge + multi-column rich text body |
| `founder_focus` | Founder Focus | Pull-quote with name and designation |
| `divider` | Divider | Simple horizontal rule |
| `comic` | Add Image | Full-width image with rich text caption (above/below) |
| `footer` | Footer | Rich text + social links (LinkedIn, Instagram, Facebook) |

---

## 3. Section Data Shapes

### `HeaderSectionData`
```ts
{ title, subtitle, logoUrl, bannerUrl, fontColor, bgColor }
```
- `bgColor` default: `#f4efe5`
- `fontColor` default: `#000000`

### `MeetEngineerSectionData`
```ts
{ name, role, photoUrl, qna: [{id, question, answer}], funFacts: string[], fontColor, bgColor }
```

### `AppreciationSectionData`
```ts
{
  members: [{id, name, photoUrl, photoUrls?: string[], message: string (HTML), cardColor}],
  fontColor, bgColor, membersPerRow: number
}
```
- `membersPerRow`: 1–4 members displayed per row.
- Each member can have up to 4 photos in `photoUrls` (displayed in a row within the card).
- `message` is rich HTML (TipTap output).
- `cardColor` default: `#e9e0cc`

### `ProjectUpdateSectionData`
```ts
{ status: 'planning'|'in_progress'|'completed'|'on_hold', columns: 1|2|3, content: string (HTML), fontColor, bgColor }
```
- `content` flows across CSS `column-count` automatically.
- Column choice (1/2/3) must be respected in **both** desktop and mobile previews. **Do not override with 1 column on mobile in CSS.**
- Status badge colours: planning=`#6366f1`, in_progress=`#f59e0b`, completed=`#22c55e`, on_hold=`#ef4444`

### `ComicSectionData`
```ts
{ imageUrl, caption: string (HTML), captionPosition: 'above'|'below', captionAlign: 'left'|'center'|'right', heading, fontColor, bgColor }
```

### `FounderFocusSectionData`
```ts
{ quote, name, designation, textAlign: 'left'|'center'|'right', fontColor, bgColor }
```

### `FooterSectionData`
```ts
{ content: string (HTML), socialLinks: [{platform, url}], fontColor, bgColor }
```
- Default social links: LinkedIn, Instagram, Facebook (Electronikmedia accounts).

---

## 4. Editor Store (`useEditorStore`)

File: `/src/app/lib/editor-store.ts`

Key state:
- `sections: Section[]` — the live section array
- `selectedSectionId: string | null`
- `previewMode: 'desktop' | 'mobile' | 'a4'`
- `darkModePreview: boolean`
- `dirty: boolean` — unsaved changes flag
- `lastSavedAt: string | null`
- `collabActive: boolean`

Key actions:
- `addSection(baseType)` — creates a new section via `createSection()`
- `duplicateSection(id)` — deep-clones and inserts after source
- `removeSection(id)`
- `updateSectionData(id, data)` — partial merge into `section.data`
- `toggleSectionVisibility(id)`
- `reorderSections(activeId, overId)` — via `@dnd-kit`
- `updateMobileOverride(id, overrides)` — sets `mobileOverrides` fields
- `clearMobileOverride(id, key)` — removes a single override key
- `clearAllMobileOverrides(id)`
- `getSanitizedSections()` — sanitizes all HTML via DOMPurify before save

**Collab rule:** When `collabActive === true`, all mutations must go through the `CollabDelegate` (`yjsXxx` methods) so Yjs stays the source of truth.

---

## 5. Preview Canvas

File: `/src/app/components/editor/preview-canvas.tsx`

- Renders the live `SectionPreview` tree inside a width-constrained container.
- Preview widths: `desktop=700px`, `mobile=375px`, `a4=595px` (from `PREVIEW_WIDTHS`).
- Sections are wrapped with `@dnd-kit`'s `SortableContext` for drag-to-reorder.
- Dark mode applies `applyDarkModeToSection()` to each visible section before rendering.
- The preview canvas uses inline styles (not Tailwind) for section layout to match the export output exactly.

---

## 6. Section Previews

File: `/src/app/components/editor/section-previews.tsx`

- `SectionPreview` is the single component that renders every section type.
- It uses `useEditorStore()` to read `previewMode` for mobile-aware rendering.
- Typography constants used throughout:
  - `BASE_LINE_HEIGHT = 1.6`
  - `HEADING_LINE_HEIGHT = 1.3`
  - `TIGHT_LINE_HEIGHT = 1.4`
  - `HEADING_FONT = "'Libre Caslon Text', serif"`
- `isDarkBackground()` utility drives secondary/answer/placeholder text colours based on the section's `bgColor`.
- `getMemberPhotos()` (exported from `section-settings-panel.tsx`) resolves `photoUrls` with `photoUrl` fallback for Appreciation members.

---

## 7. Rich Text Editing

- Rich text fields use **TipTap v3** via the `RichTextEditor` component (`/src/app/components/editor/rich-text-editor.tsx`).
- Supported formatting: **bold**, *italic*, underline, links, bullet lists, ordered lists, blockquotes.
- TipTap output is stored as HTML strings in section data.
- All HTML is sanitized with `sanitizeHtml()` (DOMPurify) before persistence — only allowed tags/attrs are kept.

### Rich Text CSS — The Three-Location Rule

Rich text content classes must be kept in sync across:

1. **`/src/styles/editor.css`** — applies in the live editor (browser)
2. **`/src/app/lib/export/a4-dom-renderer.tsx`** — inside the `<style>` tag in `OffscreenNewsletter`
3. **`/src/app/lib/export/css-generator.ts`** — injected into Web/Email HTML exports

The four rich text class families are:
| CSS Class | Section |
|---|---|
| `.project-update-content` | Project Update body |
| `.comic-caption` | Comic/Add Image caption |
| `.appreciation-message` | Appreciation member message |
| `.footer-content` | Footer body |

**Spacing rules (consistent across all three locations):**
- `p`: `margin: 0 0 8px 0` (last-child: `margin-bottom: 0`)
- `ul/ol`: `margin: 8px 0; padding-left: 24px`
- `li`: `margin: 0 0 4px 0` (last-child: `margin-bottom: 0`)
- `li p`: `margin: 0`
- `h1/h2/h3`: `margin: 12px 0 8px 0` (first-child: `margin-top: 0`)
- Appreciation is tighter: `p margin: 0 0 4px`, `li margin: 0 0 2px`, `font-size: 12px`

---

## 8. Mobile Overrides

`MobileOverrides` interface allows per-section mobile customisation:
```ts
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
- Applied in `SectionPreview` when `previewMode === 'mobile'`.
- The `MobileOverrideBadge` component shows a visual indicator on sections that have active overrides.
- **Never hard-code `columns: 1` for mobile in CSS** — always read from section data or mobile overrides.

---

## 9. Collaboration (Yjs + Supabase Realtime)

File: `/src/app/lib/collab-store.ts`

- Uses `YjsSupabaseProvider` to sync a `Y.Doc` over Supabase Realtime broadcast.
- Presence (cursor colours, user names) is tracked via `remoteUsers` and `localUser`.
- The `PresenceBar` component (`editor-top-bar.tsx`) displays connected collaborators.
- When collab is active, `useEditorStore.collabActive = true` and all mutations route through `CollabDelegate`.
- Version history is stored as `VersionSnapshot` objects via `createSnapshot()`.
- The `VersionHistoryPanel` component allows browsing and restoring past snapshots.

---

## 10. Auto-save

- Auto-save interval: `15,000ms` (15 seconds), defined in `/src/app/pages/editor.tsx`.
- Only saves when `dirty === true`.
- Calls `useNewsletterStore().autoSave()` which debounces the Supabase `update()` call.
- After save: `markClean(savedAt)` is called on the editor store.
- Manual save is triggered by the `Save` button in `EditorTopBar`.

---

## 11. Export Pipeline

### Export Formats
| Format | Handler | Output |
|---|---|---|
| `web-html` | `exportWebHtml()` | Standalone HTML with embedded CSS |
| `email-html` | `exportEmailHtml()` | Table-based HTML for email clients |
| `a4-png` | `captureA4Image(..., 'png')` | PNG at 2× pixel ratio |
| `a4-jpg` | `captureA4Image(..., 'jpg')` | JPEG at 0.92 quality |
| `a4-pdf` | `captureA4Pdf()` | Multi-page PDF via jsPDF |
| `zip` | `exportZipBundle()` | ZIP with index.html, email.html, style.css, assets/ |
| `clipboard` | `copyHtmlToClipboard()` | Email HTML + plain text to clipboard |

### A4 DOM Renderer (`/src/app/lib/export/a4-dom-renderer.tsx`)
- Renders the **exact same** `SectionPreview` React components into a hidden off-screen container.
- Uses `ReactDOM.createRoot` → mounts `OffscreenNewsletter` into a `position: fixed; left: -99999px` div.
- Waits for React commit (two `requestAnimationFrame` calls) + all `<img>` loads + `document.fonts.ready`.
- Captures via `html-to-image` (`toPng` / `toJpeg`) at `pixelRatio: 2`.
- **A4 layout constants:**
  - Width: `794px`, Min-Height: `1123px` (96 dpi, 210×297mm)
  - Page padding: `48px` horizontal, `40px` vertical
  - Newsletter card max-width: `600px`
- During render, forces `previewMode = 'desktop'` in `useEditorStore` and restores it after.
- Multi-page PDF: calculates page count from `containerHeight`, slices image per page using `jsPDF.addImage` with negative Y offset.

### A4 Export Preview Modal (`/src/app/components/editor/a4-export-preview-modal.tsx`)
- Shows a live preview of the A4 render before download.
- Supports zoom controls, dark/light toggle, PNG/JPG/PDF format tabs, one-click download.
- Uses `renderA4ToDataUrl()` for the preview image.

### ExportOptions interface
```ts
interface ExportOptions {
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
}
```

---

## 12. Section Settings Panel

File: `/src/app/components/editor/section-settings-panel.tsx`

- Context-sensitive right panel that renders settings for the currently `selectedSectionId`.
- Calls `updateSectionData(id, {...})` on every change.
- Calls `updateMobileOverride(id, {...})` for mobile-specific fields.
- Image upload uses the `ImageUpload` component (uploads to Supabase Storage or accepts URL).
- For `appreciation` section: supports add/remove/reorder members, per-member card colour picker, multi-photo upload.

---

## 13. Left Sidebar

File: `/src/app/components/editor/editor-left-sidebar.tsx`

- Displays all sections with drag handles (via `@dnd-kit/sortable`).
- Each row shows: section icon, label, visibility toggle (eye icon), delete button.
- "Add Section" button opens a picker for all `SectionBaseType` values.
- The section list drives `reorderSections(activeId, overId)` on drag end.

---

## 14. Default Values

- Default `bgColor` for all sections: `#f4efe5`
- Default `fontColor`: `#000000`
- Default `cardColor` (appreciation members): `#e9e0cc`
- Default newsletter `ThemeConfig`: `DEFAULT_THEME` from `lib/types.ts`
- Founder/CEO default: `Bertin Dcruz, Founder and CEO, Electronikmedia`
- Default social links (footer): LinkedIn, Instagram, Facebook → Electronikmedia accounts

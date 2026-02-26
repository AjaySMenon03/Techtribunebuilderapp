# Tech Tribune Builder - Project Documentation & Changelog

**Project:** Tech Tribune Builder - Newsletter Editor
**Last Updated:** February 24, 2026
**Stack:** React, TailwindCSS v4, TipTap v3, @dnd-kit, Supabase, Zustand, React Router

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Section Types](#section-types)
3. [Core Features](#core-features)
4. [Export Engine](#export-engine)
5. [Dark Mode System](#dark-mode-system)
6. [Authentication](#authentication)
7. [Detailed Changelog](#detailed-changelog)

---

## Architecture Overview

### Layout
- **Three-panel editor layout:**
  - **Left Sidebar** - Section list with drag-and-drop reordering (`w-56 lg:w-64`)
  - **Center Panel** - Live preview canvas with responsive padding
  - **Right Panel** - Section settings panel (`w-72 lg:w-80`, visible at `md` breakpoint)

### State Management
- **Zustand** for global state (auth, workspace, editor)
- Auto-save functionality
- Manual save with version increment

### Backend
- **Supabase** for database, auth, edge functions, and storage
- Dual-header auth pattern with `X-User-Token`
- KV store for data persistence
- Asset uploads convert `arrayBuffer` to `Uint8Array` before passing to Supabase Storage

### Routing
- **React Router** (Data mode with `RouterProvider`)
- Pages: Dashboard, Archive, Settings, Editor, Login

---

## Section Types

The editor supports the following structured section types:

| Section Type | Key Features |
|---|---|
| **Header** | Three-column bar layout, title at 2rem Libre Caslon Text, `fontColor`/`bgColor` fields |
| **Meet the Engineer** | Q&A system with 4-column CSS grid layout, `fontColor`/`bgColor` fields |
| **Appreciation** | Per-member `cardColor`, "Members Per Row" (1-3) with grid layout, `fontColor`/`bgColor` fields |
| **Project Update** | CSS `column-count`, single rich text `content` field, status badge in heading row, tightened bullet spacing, `fontColor`/`bgColor` fields |
| **Add Image (Comic)** | Renamed from "Comic" in `SECTION_TYPE_LABELS`, editable `heading` field, `fontColor`/`bgColor` (default `#f4efe5`) |
| **Footer** | `fontColor` (default `#000000`) and `bgColor` (default `#f4efe5`) with color pickers in settings |
| **Founder Focus** | Card with 20px Inter Light quote, `textAlign` field, `fontColor`/`bgColor` fields |
| **Divider** | Minimal `<hr>` element |

### Default Theme Values
- `card_color`: `#e9e0cc`
- All section `bgColor` defaults: `#f4efe5`

---

## Core Features

### Editor
- Section duplication
- Drag-and-drop reordering via `@dnd-kit`
- Auto-save and manual save with version increment
- TipTap v3 rich text editing with content sync (`isInternalUpdate` ref guard)
- `immediatelyRender: false` on TipTap for SSR safety
- `ErrorBoundary` wrapping for stability
- All section headings use **Libre Caslon Text** Google Font across all four rendering surfaces
- All section heading icons removed
- All section heading divider lines removed
- `@tailwindcss/typography` installed for prose styling

### TipTap Configuration
- `StarterKit` configured with `link: false` and `underline: false` to avoid duplicate extensions

### Image Handling
- Image compression preserves PNG/WebP transparency
- Asset uploads: server converts `arrayBuffer` to `Uint8Array`, calls `ensureBucket()` before each upload, handles `signError` explicitly
- Frontend `uploadAsset` checks `Content-Type` before calling `res.json()`

### UI Components
- `Button` wrapped with `forwardRef` for Radix `asChild` compatibility

---

## Export Engine

### Supported Formats (7 total)
Comprehensive export engine across five files under `/src/app/lib/export/`:

| File | Purpose |
|---|---|
| `a4-renderer.ts` | A4 PNG/JPG/PDF exports |
| `web-renderer.ts` | Web-optimized HTML export |
| `email-renderer.ts` | Email-compatible HTML export |
| `css-generator.ts` | CSS generation with `skipFontImports` option |
| (UI) `export-dropdown.tsx` | Export dropdown UI component |

### Export Propagation
- All three export surfaces (web-renderer, email-renderer, css-generator) have complete color/style propagation
- Dark mode color mapping applied in preview canvas and all export renderers

### A4 Renderer Details
- Fetches Google Fonts CSS as text and injects as same-origin `<style>` tag (with `skipFonts: true` for `html-to-image`) to avoid CORS `SecurityError`
- CSS generator has `skipFontImports` option to strip `@import url(...)` rules
- Blank canvas fix adds `position: 'static', left: 'auto', top: 'auto', zIndex: 'auto'` style overrides to `toPng`/`toJpeg` (not yet runtime-tested)

---

## Dark Mode System

### Smart Color Mapping
Located in `editor-types.ts` via `applyDarkModeToSection` / `applyDarkModeToSections`:

| Light Mode | Dark Mode | Usage |
|---|---|---|
| `#f4efe5` | `#1e1e2e` | Section backgrounds |
| `#000000` | `#e0e0e0` | Font colors |
| `#e9e0cc` | `#2a2a3d` | Card colors |

- Preserves user-customized colors (only remaps default palette values)
- Applied in preview canvas and all export renderers
- Dark mode toggle functional: adds/removes `dark` class on `<html>`
- Moon/Sun icon indicator in UI
- Layout component persists theme across navigation by watching `workspace.theme`

---

## Authentication

- Supabase Auth with dual-header pattern (`X-User-Token`)
- Sign up via server-side `/signup` route using `auth.admin.createUser` with `email_confirm: true`
- Sign in via frontend Supabase client `signInWithPassword`
- Session persistence via `auth.getSession()`
- Protected server routes validate via `auth.getUser(accessToken)`

---

## Detailed Changelog

### Round 1: Initial Build
- Set up three-panel editor layout (left sidebar, center preview, right settings)
- Implemented all 8 section types with structured schemas
- Integrated TipTap v3 for rich text editing
- Added @dnd-kit for drag-and-drop section reordering
- Zustand state management with auto-save
- Manual save with version increment
- Supabase backend integration (KV store, auth, storage)
- React Router data mode routing

### Round 2: TipTap & DnD Stability Fixes
- TipTap content sync with `isInternalUpdate` ref guard to prevent infinite loops
- Added `immediatelyRender: false` to TipTap for SSR compatibility
- Wrapped editor components with `ErrorBoundary`
- @dnd-kit performance optimizations
- `Button` component wrapped with `forwardRef` for Radix `asChild` compatibility
- TipTap v3 `StarterKit` configured with `link: false` and `underline: false` to avoid duplicate extensions

### Round 3: Visual Design & Section Enhancements
- All section heading icons removed
- All section headings use Libre Caslon Text Google Font across all four rendering surfaces
- All section heading divider lines removed
- Header: three-column bar layout, title at 2rem Libre Caslon Text
- Meet the Engineer: Q&A system with 4-column CSS grid layout
- Appreciation: per-member `cardColor`, "Members Per Row" (1-3) with grid layout
- Project Update: CSS `column-count`, single rich text `content` field, status badge in heading row, tightened bullet spacing
- Founder Focus: card with 20px Inter Light quote, `textAlign` field
- Divider: minimal `<hr>` element
- Comic renamed to "Add Image" in `SECTION_TYPE_LABELS` with editable `heading` field

### Round 4: Color System & Theme
- Added `fontColor`/`bgColor` fields to: header, meet_engineer, appreciation, project_update, founder_focus, comic, footer
- Footer: `fontColor` default `#000000`, `bgColor` default `#f4efe5` with color pickers
- Default `card_color` in `DEFAULT_THEME`: `#e9e0cc`
- All section `bgColor` defaults: `#f4efe5`
- Image compression preserves PNG/WebP transparency
- Installed `@tailwindcss/typography`

### Round 5: Export Engine
- Built comprehensive export engine (7 formats, 5 files)
- A4 renderer with Google Fonts injection workaround for CORS
- CSS generator with `skipFontImports` option
- Web renderer for HTML export
- Email renderer for email-compatible HTML
- Export dropdown UI component

### Round 6: Dark Mode
- Smart dark mode color mapping system (`applyDarkModeToSection`/`applyDarkModeToSections`)
- Remaps default light palette to dark equivalents while preserving custom colors
- Applied across preview canvas and all export renderers
- Complete export propagation across all three export surfaces

### Round 7: Asset Upload Hardening
- Server: converts `arrayBuffer` to `Uint8Array` before Supabase Storage upload
- Server: calls `ensureBucket()` before each upload
- Server: handles `signError` explicitly
- Frontend: `uploadAsset` checks `Content-Type` before calling `res.json()`

### Round 8: A4 Export Fixes
- Blank canvas fix: `position: 'static', left: 'auto', top: 'auto', zIndex: 'auto'` overrides
- Google Fonts CSS fetched as text, injected as same-origin `<style>` tag
- `skipFonts: true` passed to `html-to-image` to avoid CORS SecurityError
- Status: Not yet runtime-tested

### Round 9: Responsiveness & Settings Polish (Latest)
**Files Modified:**
- `/src/app/pages/settings.tsx` - Logo placeholder uses `object-contain` instead of `object-cover`
- `/src/app/pages/layout.tsx` - Dark mode toggle persists across navigation
- `/src/app/pages/editor.tsx` - Three-panel layout made responsive
- `/src/app/pages/dashboard.tsx` - Consistent responsive padding with `pb-20`
- `/src/app/pages/archive.tsx` - Consistent responsive padding with `pb-20`
- `/src/app/components/editor/preview-canvas.tsx` - Reduced mobile padding
- `/src/app/components/editor/editor-top-bar.tsx` - Top bar elements tightened for small screens
- `/src/app/components/editor/editor-left-sidebar.tsx` - Responsive sidebar width
- `/src/app/components/sidebar-nav.tsx` - Sidebar logo uses `object-contain`

**Changes:**
- Settings page logo: `object-contain` for proper image fitting
- Dark mode toggle: functional with Moon/Sun icon, adds/removes `dark` class on `<html>`
- Editor layout: responsive three-panel (settings at `md` breakpoint `w-72 lg:w-80`, sidebar `w-56 lg:w-64`)
- Dashboard/Archive: consistent responsive padding with `pb-20` bottom padding
- Sidebar nav logo: `object-contain` to prevent cropping
- Status: Not yet runtime-tested

---

## File Structure (Key Files)

```
/src/app/
  App.tsx                          # Main entry, RouterProvider
  store.ts                         # Zustand stores (auth, workspace, editor)
  routes.ts                        # React Router configuration
  /components/
    sidebar-nav.tsx                # Main sidebar navigation
    /editor/
      preview-canvas.tsx           # Live preview canvas
      editor-top-bar.tsx           # Editor toolbar
      editor-left-sidebar.tsx      # Section list with DnD
      export-dropdown.tsx          # Export UI
    /ui/                           # Shared UI components (Button, etc.)
  /lib/
    editor-types.ts                # Section types, dark mode mapping
    /export/
      a4-renderer.ts              # A4 format exports
      web-renderer.ts             # Web HTML export
      email-renderer.ts           # Email HTML export
      css-generator.ts            # CSS generation
  /pages/
    dashboard.tsx                  # Newsletter dashboard
    archive.tsx                    # Archived newsletters
    settings.tsx                   # Workspace settings
    editor.tsx                     # Main editor page
    layout.tsx                     # App layout with dark mode persistence
/supabase/functions/server/
  index.tsx                        # Hono server
  kv_store.tsx                     # KV store utilities (protected)
```

---

*This document was auto-generated on February 24, 2026.*

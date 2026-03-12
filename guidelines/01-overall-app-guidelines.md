# EM Make — Overall Application Guidelines

## 1. Project Identity

- **App name:** EM Make (formerly Tech Tribune Builder)
- **Purpose:** An all-in-one newsletter editor, profile generator, and infinite canvas whiteboard — built for the Electronikmedia team.
- **Default workspace:** `Electronikmedia` (set in `/src/app/lib/types.ts` → `DEFAULT_WORKSPACE`)

---

## 2. Technology Stack

| Concern | Library / Tool |
|---|---|
| UI Framework | React 18 + TypeScript |
| Styling | Tailwind CSS v4 (`tw-animate-css` for animations) |
| Routing | `react-router` (Data Mode — `createBrowserRouter`) |
| State Management | Zustand (multiple named stores) |
| Rich Text | TipTap v3 |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Backend / Auth | Supabase (Postgres, Auth, Storage, Realtime) |
| Real-time Collab | Yjs + custom `YjsSupabaseProvider` |
| Infinite Canvas | Fabric.js v7 |
| Image Capture | `html-to-image` |
| PDF Export | `jsPDF` |
| ZIP Bundling | `JSZip` |
| File Saving | `file-saver` |
| Animations | `motion/react` (Motion package) |
| Icons | `lucide-react` |
| Toasts | `sonner` |

---

## 3. Directory Structure

```
/src
  /app
    /components        # Shared UI components (editor widgets, ui/ primitives)
    /features          # Feature modules (profile-generator, canvas-studio)
    /lib               # Core logic (stores, export pipeline, Supabase client)
    /pages             # Route-level page components
    /store.ts          # Root Zustand stores (auth, newsletter, workspace)
    /routes.ts         # All react-router routes
  /styles              # Global CSS (editor.css, theme.css, fonts.css, index.css)
  /imports             # SVG assets imported from Figma
/guidelines            # AI guidelines (this folder)
/supabase              # Supabase edge functions
/utils/supabase        # Supabase project info helper
```

---

## 4. Routing

- All routes are defined in `/src/app/routes.ts` using `createBrowserRouter`.
- The root layout (`AppLayout`) wraps all authenticated pages and provides the sidebar.
- The entry point is `/src/app/App.tsx` which uses `<RouterProvider router={router} />`.
- Unauthenticated users are redirected to `/login`.
- The `<AuthGuard>` component in `auth-guard.tsx` protects all authenticated routes.

### Route Map
| Path | Page |
|---|---|
| `/login` | Login |
| `/dashboard` | Newsletter dashboard |
| `/editor/:id` | Newsletter editor |
| `/archive` | Archived newsletters |
| `/settings` | Workspace settings |
| `/profile-generator` | Profile list |
| `/profile-generator/editor` | New profile editor |
| `/profile-generator/:id` | Existing profile editor |
| `/canvas-studio` | Canvas project list |
| `/canvas-studio/:id` | Canvas Studio editor |

---

## 5. Authentication

- Supabase Auth is used (`/src/app/lib/supabase.ts`).
- The `useAuthStore` Zustand store (in `/src/app/store.ts`) holds the current `user` session.
- Auth state is initialized in `App.tsx` via `supabase.auth.onAuthStateChange`.
- The login page (`/src/app/pages/login.tsx`) handles sign-in/sign-up flows.
- Always check `useAuthStore()` for the current user — do not call `supabase.auth.getUser()` inside components directly.

---

## 6. Zustand Stores

The app has multiple Zustand stores — each serving a distinct domain:

| Store | File | Purpose |
|---|---|---|
| `useAuthStore` | `store.ts` | Current Supabase user session |
| `useNewsletterStore` | `store.ts` | Newsletter CRUD + list |
| `useWorkspaceStore` | `store.ts` | Workspace name, logo, theme config |
| `useEditorStore` | `lib/editor-store.ts` | Active newsletter's section state |
| `useCollabStore` | `lib/collab-store.ts` | Yjs collab, presence, version snapshots |
| `useCanvasStudioStore` | `features/canvas-studio/store/canvasStudioStore.ts` | Canvas tools, history, projects |

**Rules:**
- Never duplicate state across stores.
- Collab mutations always go through `yjsXxx` actions in `useCollabStore` when collab is active (check `collabActive` flag first).
- `useEditorStore.getState()` is safe to call outside React components (e.g., in export utilities).

---

## 7. Dark Mode

- Dark mode is toggled per-newsletter preview via `darkModePreview` in `useEditorStore`.
- The global light palette defaults are defined in `editor-types.ts` → `DARK_MODE_BG_MAP / DARK_MODE_FONT_MAP / DARK_MODE_CARD_MAP`.
- Only **default** palette colours are remapped in dark mode; custom user colours pass through unchanged.
- The `applyDarkModeToSection()` and `applyDarkModeToSections()` helpers handle this transformation at the section level.
- For export, dark mode is also supported with an `effectiveTheme()` helper in `a4-dom-renderer.tsx`.
- Default light colours:
  - Background: `#f4efe5` → dark: `#1e1e2e`
  - Card: `#e9e0cc` → dark: `#2a2a3d`
  - Font: `#000000` → dark: `#e0e0e0`

---

## 8. Theme System

- `ThemeConfig` (in `lib/types.ts`) holds: `background_color`, `card_color`, `text_color`, `accent_color`, `font_family`, `dark_mode_enabled`.
- `DEFAULT_THEME` uses the Electronikmedia brand palette (`#f4efe5` / `#e9e0cc`).
- Theme is set at workspace level (`useWorkspaceStore`) and can be overridden per-newsletter.
- Font: default `Inter`. Use the font family defined in the theme throughout the preview and export pipeline.

---

## 9. Styling Conventions

- **Tailwind CSS v4** is used for all styling. Do not create a `tailwind.config.js`.
- Custom CSS tokens live in `/src/styles/theme.css` — do not modify unless changing brand design.
- Rich text content CSS (spacing, list styles, blockquotes) is duplicated in **three places** for consistency across all contexts:
  1. `/src/styles/editor.css` — live editor preview
  2. `/src/app/lib/export/a4-dom-renderer.tsx` — A4 image/PDF render
  3. `/src/app/lib/export/css-generator.ts` — Web/Email HTML export
- **Always keep these three in sync** when making any rich text spacing or typography changes.
- Font imports go in `/src/styles/fonts.css` only.
- Heading font: `'Libre Caslon Text', serif` (constant `HEADING_FONT` in `section-previews.tsx`).

---

## 10. Mobile Responsiveness

- All pages use `useIsMobile()` (breakpoint: 768px for the sidebar; 1024px for the editor three-panel layout).
- In the Newsletter Editor and Profile Editor, the three-panel layout collapses to a single visible panel with a sticky bottom tab bar on mobile.
- Newsletter sections support `mobileOverrides` (stored on each `Section`) which let users set different colours, layout columns, visibility, etc. for mobile preview.
- The `mobile-override-badge.tsx` component shows a visual indicator when a section has overrides active.
- **Do not force sections to 1 column on mobile** in CSS — column count is respected from the section data (and `mobileOverrides`).

---

## 11. Supabase Integration

- Supabase client: `/src/app/lib/supabase.ts`
- Supabase project info (URL, anon key): `/utils/supabase/info.tsx`
- KV store (edge function): `/supabase/functions/server/kv_store.tsx` — used by the Profile Generator for asset and template storage.
- Realtime collab uses a custom `YjsSupabaseProvider` (`/src/app/lib/yjs-supabase-provider.ts`) that syncs a Yjs document over Supabase Realtime broadcast channels.
- Supabase Storage buckets: `pg` bucket for Profile Generator assets (foreground/background images, profile thumbnails).

---

## 12. Error Handling

- Use `<ErrorBoundary>` (`/src/app/components/error-boundary.tsx`) to wrap major page components.
- All async operations (save, export, load) should be wrapped in `try/catch` with `toast.error(...)` for user feedback.
- Use `toast.success(...)` for positive confirmations.
- Use `sonner`'s `toast` — import as: `import { toast } from "sonner"`.

---

## 13. General Coding Rules

- Always use absolute paths starting from `/src` for imports within the project.
- Do not write all code in `App.tsx` — create separate components in `/src/app/components` or feature sub-folders.
- Keep files under ~400 lines. Extract helper functions and sub-components when files grow large.
- All `Section` IDs and entity IDs use `crypto.randomUUID()`.
- All HTML user content passes through `sanitizeHtml()` from `editor-types.ts` (uses DOMPurify) before saving.
- Use `key={id}` on all list-rendered React elements.
- Use the `ImageWithFallback` component from `/src/app/components/figma/ImageWithFallback.tsx` instead of raw `<img>` tags for any new images.
- Never hallucinate image URLs — use the `unsplash_tool` or existing `figma:asset` imports.

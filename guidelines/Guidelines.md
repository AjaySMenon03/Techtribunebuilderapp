# EM Make — AI Guidelines Index

This folder contains comprehensive guidelines for the EM Make application. Each file covers a specific feature area.

---

## Files

| File | Covers |
|---|---|
| [`01-overall-app-guidelines.md`](./01-overall-app-guidelines.md) | Tech stack, routing, auth, dark mode, state management, theming, Supabase, coding rules |
| [`02-newsletter-editor-guidelines.md`](./02-newsletter-editor-guidelines.md) | Section types, editor store, preview canvas, rich text, export pipeline, collab, auto-save |
| [`03-profile-generator-guidelines.md`](./03-profile-generator-guidelines.md) | Layer system, canvas renderer, image adjustments, gradient support, templates, asset library, export |
| [`04-canvas-studio-guidelines.md`](./04-canvas-studio-guidelines.md) | Fabric.js, tools, history, projects, toolbar, panels, snap guides, export |

---

## Quick Reference

- **App name:** EM Make (formerly Tech Tribune Builder)
- **Owner:** Electronikmedia
- **Main stack:** React 18 + TypeScript + Tailwind CSS v4 + Zustand + Supabase + react-router
- **Features:** Newsletter Editor · Profile Generator · Canvas Studio
- **Rich text CSS rule:** Always keep `/src/styles/editor.css`, `/src/app/lib/export/a4-dom-renderer.tsx`, and `/src/app/lib/export/css-generator.ts` in sync for all rich text spacing changes.
- **Default palette:** Background `#f4efe5` · Card `#e9e0cc` · Font `#000000`
- **Heading font:** `'Libre Caslon Text', serif`

/**
 * Profile Generator – Asset Library & Template Engine types.
 *
 * Cleanly separated from editor-types.ts (which is canvas/layer-only).
 * Data stored in KV under prefixes:
 *   pg-asset:{id}      – library assets
 *   pg-template:{id}   – layer-stack templates
 *   pg-profile:{id}    – saved profiles (with their own layer copy)
 */

import type { EditorLayer, CanvasConfig } from './editor-types';

// ─── Asset Library ───────────────────────────────────────

export type AssetType = 'foreground' | 'background';

export interface LibraryAsset {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  tags: string[];
  url: string;
  storagePath: string;
  width: number;
  height: number;
  createdAt: string;
  createdBy: string;
}

export const ASSET_CATEGORIES = [
  'Abstract',
  'Geometric',
  'Gradient',
  'Pattern',
  'Photo',
  'Texture',
  'Frame',
  'Overlay',
  'Other',
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// ─── Template Engine ─────────────────────────────────────

export interface ProfileTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  canvasConfig: CanvasConfig;
  layers: EditorLayer[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isSystem: boolean; // admin-created (true) vs user-saved (false)
}

export const TEMPLATE_CATEGORIES = [
  'Engineer Spotlight',
  'Leadership Bio',
  'Team Member',
  'New Hire Welcome',
  'Creative Portfolio',
  'Minimal',
  'Custom',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

// ─── Saved Profile ───────────────────────────────────────

export interface SavedProfile {
  id: string;
  name: string;
  templateId: string | null;   // which template it was created from
  canvasConfig: CanvasConfig;
  layers: EditorLayer[];
  thumbnailUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

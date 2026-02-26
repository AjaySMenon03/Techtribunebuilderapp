/**
 * Profile Generator – API layer for Asset Library, Templates & Profiles.
 *
 * Uses the same apiRequest helper pattern as /src/app/lib/api.ts
 * but scoped to the /pg/* routes.
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '../../../lib/supabase';
import type { LibraryAsset, ProfileTemplate, SavedProfile } from './pg-types';
import type { EditorLayer, CanvasConfig } from './editor-types';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-607373f0/pg`;

// ─── Auth helpers (mirrors lib/api.ts pattern) ───────────

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
  };
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['X-User-Token'] = session.access_token;
    }
  } catch {
    /* fallback to anon */
  }
  return headers;
}

async function getUploadHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${publicAnonKey}`,
  };
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['X-User-Token'] = session.access_token;
    }
  } catch {
    /* fallback */
  }
  return headers;
}

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers as Record<string, string>) },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`[pg-api] ${path}:`, data);
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ─── Assets ──────────────────────────────────────────────

export async function fetchAssets(): Promise<LibraryAsset[]> {
  const d = await request<{ assets: LibraryAsset[] }>('/assets');
  return d.assets ?? [];
}

export async function createAsset(
  file: File,
  meta: { name: string; type: 'foreground' | 'background'; category: string; tags: string[] },
): Promise<LibraryAsset> {
  // Need image dimensions before uploading
  const dims = await getImageDimensions(file);
  const headers = await getUploadHeaders();
  const form = new FormData();
  form.append('file', file);
  form.append(
    'meta',
    JSON.stringify({ ...meta, width: dims.width, height: dims.height }),
  );
  const res = await fetch(`${BASE}/assets`, {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Asset upload failed');
  return data.asset;
}

export async function updateAsset(
  id: string,
  changes: Partial<LibraryAsset>,
): Promise<LibraryAsset> {
  const d = await request<{ asset: LibraryAsset }>(`/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
  return d.asset;
}

export async function deleteAsset(id: string): Promise<void> {
  await request(`/assets/${id}`, { method: 'DELETE' });
}

// ─── Templates ───────────────────────────────────────────

export async function fetchTemplates(): Promise<ProfileTemplate[]> {
  const d = await request<{ templates: ProfileTemplate[] }>('/templates');
  return d.templates ?? [];
}

export async function fetchTemplate(id: string): Promise<ProfileTemplate> {
  const d = await request<{ template: ProfileTemplate }>(`/templates/${id}`);
  return d.template;
}

export async function createTemplate(payload: {
  name: string;
  description?: string;
  category?: string;
  canvasConfig: CanvasConfig;
  layers: EditorLayer[];
  isSystem?: boolean;
}): Promise<ProfileTemplate> {
  const d = await request<{ template: ProfileTemplate }>('/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return d.template;
}

export async function updateTemplate(
  id: string,
  changes: Partial<ProfileTemplate>,
): Promise<ProfileTemplate> {
  const d = await request<{ template: ProfileTemplate }>(`/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
  return d.template;
}

export async function deleteTemplate(id: string): Promise<void> {
  await request(`/templates/${id}`, { method: 'DELETE' });
}

export async function duplicateTemplate(id: string): Promise<ProfileTemplate> {
  const d = await request<{ template: ProfileTemplate }>(`/templates/${id}/duplicate`, {
    method: 'POST',
  });
  return d.template;
}

// ─── Profiles ────────────────────────────────────────────

export async function fetchProfiles(): Promise<SavedProfile[]> {
  const d = await request<{ profiles: SavedProfile[] }>('/profiles');
  return d.profiles ?? [];
}

export async function fetchProfile(id: string): Promise<SavedProfile> {
  const d = await request<{ profile: SavedProfile }>(`/profiles/${id}`);
  return d.profile;
}

export async function createProfile(payload: {
  name: string;
  templateId: string | null;
  canvasConfig: CanvasConfig;
  layers: EditorLayer[];
}): Promise<SavedProfile> {
  const d = await request<{ profile: SavedProfile }>('/profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return d.profile;
}

export async function updateProfile(
  id: string,
  changes: Partial<SavedProfile>,
): Promise<SavedProfile> {
  const d = await request<{ profile: SavedProfile }>(`/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
  return d.profile;
}

export async function deleteProfile(id: string): Promise<void> {
  await request(`/profiles/${id}`, { method: 'DELETE' });
}

// ─── Helpers ─────────────────────────────────────────────

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// ─── Thumbnail Upload ────────────────────────────────────

/**
 * Uploads a thumbnail Blob (PNG) to the PG storage bucket via the
 * generic `/pg/upload` endpoint and returns the signed URL.
 */
export async function uploadThumbnail(blob: Blob): Promise<string> {
  const headers = await getUploadHeaders();
  const form = new FormData();
  form.append('file', blob, `thumbnail-${Date.now()}.png`);
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Thumbnail upload failed');
  return data.url;
}

/**
 * Uploads an image File to PG storage and returns
 * both the signed URL and the storage path (for re-signing later).
 */
export async function uploadImageFile(file: File): Promise<{ url: string; path: string }> {
  const headers = await getUploadHeaders();
  const form = new FormData();
  form.append('file', file, file.name);
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Image upload failed');
  return { url: data.url, path: data.path };
}
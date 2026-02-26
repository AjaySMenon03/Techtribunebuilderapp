/**
 * Collaboration Zustand store.
 * Manages: Yjs provider lifecycle, presence, version history.
 */
import { create } from 'zustand';
import * as Y from 'yjs';
import { YjsSupabaseProvider, type CollabUser } from './yjs-supabase-provider';
import type { Section } from './editor-types';
import { useEditorStore } from './editor-store';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from './supabase';

export type { CollabUser };

export interface VersionSnapshot {
  id: string;
  newsletterId: string;
  version: number;
  title: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  sectionsCount: number;
  sections: Section[];
}

interface CollabState {
  // Provider
  provider: YjsSupabaseProvider | null;
  ydoc: Y.Doc | null;
  connected: boolean;
  synced: boolean;

  // Presence
  remoteUsers: CollabUser[];
  localUser: CollabUser | null;

  // Versions
  versions: VersionSnapshot[];
  versionsLoading: boolean;
  showVersionHistory: boolean;
  comparingVersionId: string | null;

  // Actions
  initCollaboration: (
    newsletterId: string,
    userId: string,
    userName: string,
    initialSections: Section[],
  ) => void;
  destroyCollaboration: () => void;
  setEditingSection: (sectionId: string | null, field?: string | null) => void;

  // Yjs-backed mutations (these write to Y.Doc → trigger sync)
  yjsSetSections: (sections: Section[]) => void;
  yjsUpdateSection: (id: string, updates: Partial<Section>) => void;
  yjsUpdateSectionData: (id: string, data: Record<string, any>) => void;
  yjsAddSection: (section: Section) => void;
  yjsRemoveSection: (id: string) => void;
  yjsReorderSections: (activeId: string, overId: string) => void;
  yjsToggleVisibility: (id: string) => void;

  // Version actions
  setShowVersionHistory: (show: boolean) => void;
  setComparingVersionId: (id: string | null) => void;
  fetchVersions: (newsletterId: string) => Promise<void>;
  createSnapshot: (
    newsletterId: string,
    version: number,
    title: string,
    userId: string,
    userName: string,
  ) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
}

/** Helper to read sections from Y.Doc */
function readSectionsFromYDoc(ydoc: Y.Doc): Section[] {
  const ySections = ydoc.getArray<any>('sections');
  const result: Section[] = [];
  for (let i = 0; i < ySections.length; i++) {
    const item = ySections.get(i);
    if (item && typeof item === 'object') {
      result.push(JSON.parse(JSON.stringify(item)));
    }
  }
  return result;
}

/** Helper to replace all sections in Y.Doc */
function writeSectionsToYDoc(ydoc: Y.Doc, sections: Section[]) {
  const ySections = ydoc.getArray<any>('sections');
  ydoc.transact(() => {
    ySections.delete(0, ySections.length);
    for (const section of sections) {
      ySections.push([JSON.parse(JSON.stringify(section))]);
    }
  });
}

/** Sync Y.Doc sections → editor Zustand store (read projection) */
function syncYDocToEditorStore(ydoc: Y.Doc) {
  const sections = readSectionsFromYDoc(ydoc);
  const editorStore = useEditorStore.getState();
  // Only update if actually different to avoid re-render loops
  const current = editorStore.sections;
  if (JSON.stringify(current) !== JSON.stringify(sections)) {
    editorStore.setSections(sections);
    editorStore.markDirty();
  }
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const newArr = [...arr];
  const [item] = newArr.splice(from, 1);
  newArr.splice(to, 0, item);
  return newArr;
}

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-607373f0`;

async function getToken(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    // Try explicit refresh if session exists but token may be stale
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.access_token) return refreshData.session.access_token;
    return publicAnonKey;
  } catch {
    return publicAnonKey;
  }
}

async function versionApiRequest(path: string, options: RequestInit = {}) {
  const token = await getToken();
  // Use the dual-header pattern: publicAnonKey in Authorization (for the
  // Edge Function gateway), real user token in X-User-Token (for Hono handler).
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...options.headers as Record<string, string>,
  };
  if (token !== publicAnonKey) {
    headers['X-User-Token'] = token;
  }
  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Retry on 401: refresh token and try again
  if (res.status === 401) {
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.access_token) {
        headers['X-User-Token'] = refreshData.session.access_token;
        res = await fetch(`${BASE_URL}${path}`, {
          ...options,
          headers,
        });
      }
    } catch (refreshError) {
      console.warn('[versionApiRequest] Token refresh failed:', refreshError);
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const useCollabStore = create<CollabState>((set, get) => ({
  provider: null,
  ydoc: null,
  connected: false,
  synced: false,
  remoteUsers: [],
  localUser: null,
  versions: [],
  versionsLoading: false,
  showVersionHistory: false,
  comparingVersionId: null,

  initCollaboration: (newsletterId, userId, userName, initialSections) => {
    // Clean up existing
    const existing = get().provider;
    if (existing) existing.destroy();

    const ydoc = new Y.Doc();

    // Initialize Y.Doc with current sections
    writeSectionsToYDoc(ydoc, initialSections);

    // Observe Y.Doc changes → sync to editor store
    ydoc.getArray('sections').observe(() => {
      syncYDocToEditorStore(ydoc);
    });

    // Also do deep observation
    ydoc.getArray('sections').observeDeep(() => {
      syncYDocToEditorStore(ydoc);
    });

    const provider = new YjsSupabaseProvider(
      newsletterId,
      userId,
      userName,
      ydoc,
      {
        onRemoteUpdate: () => {
          // Y.Doc observer handles sync to editor store
        },
        onPresenceChange: (users) => {
          set({ remoteUsers: users });
        },
        onSynced: () => {
          set({ synced: true });
          // Sync initial state to editor store
          syncYDocToEditorStore(ydoc);
        },
      },
    );

    provider.connect();

    set({
      provider,
      ydoc,
      connected: true,
      synced: false,
      localUser: provider.getLocalUser(),
    });
  },

  destroyCollaboration: () => {
    const { provider, ydoc } = get();
    if (provider) provider.destroy();
    if (ydoc) ydoc.destroy();
    set({
      provider: null,
      ydoc: null,
      connected: false,
      synced: false,
      remoteUsers: [],
      localUser: null,
    });
  },

  setEditingSection: (sectionId, field = null) => {
    const { provider } = get();
    if (provider) {
      provider.setEditingSection(sectionId, field);
    }
  },

  // -- Yjs-backed mutations --

  yjsSetSections: (sections) => {
    const { ydoc } = get();
    if (!ydoc) {
      useEditorStore.getState().setSections(sections);
      return;
    }
    writeSectionsToYDoc(ydoc, sections);
  },

  yjsUpdateSection: (id, updates) => {
    const { ydoc } = get();
    if (!ydoc) return;
    const sections = readSectionsFromYDoc(ydoc);
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    sections[idx] = { ...sections[idx], ...updates };
    writeSectionsToYDoc(ydoc, sections);
  },

  yjsUpdateSectionData: (id, data) => {
    const { ydoc } = get();
    if (!ydoc) return;
    const sections = readSectionsFromYDoc(ydoc);
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    sections[idx] = { ...sections[idx], data: { ...sections[idx].data, ...data } };
    writeSectionsToYDoc(ydoc, sections);
  },

  yjsAddSection: (section) => {
    const { ydoc } = get();
    if (!ydoc) return;
    const ySections = ydoc.getArray<any>('sections');
    ySections.push([JSON.parse(JSON.stringify(section))]);
  },

  yjsRemoveSection: (id) => {
    const { ydoc } = get();
    if (!ydoc) return;
    const ySections = ydoc.getArray<any>('sections');
    for (let i = 0; i < ySections.length; i++) {
      const item = ySections.get(i);
      if (item && item.id === id) {
        ySections.delete(i, 1);
        break;
      }
    }
  },

  yjsReorderSections: (activeId, overId) => {
    if (activeId === overId) return;
    const { ydoc } = get();
    if (!ydoc) return;
    const sections = readSectionsFromYDoc(ydoc);
    const oldIdx = sections.findIndex((s) => s.id === activeId);
    const newIdx = sections.findIndex((s) => s.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(sections, oldIdx, newIdx);
    writeSectionsToYDoc(ydoc, reordered);
  },

  yjsToggleVisibility: (id) => {
    const { ydoc } = get();
    if (!ydoc) return;
    const sections = readSectionsFromYDoc(ydoc);
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    sections[idx] = { ...sections[idx], visible: !sections[idx].visible };
    writeSectionsToYDoc(ydoc, sections);
  },

  // -- Version History --

  setShowVersionHistory: (show) => set({ showVersionHistory: show }),
  setComparingVersionId: (id) => set({ comparingVersionId: id }),

  fetchVersions: async (newsletterId) => {
    set({ versionsLoading: true });
    try {
      const data = await versionApiRequest(`/newsletters/${newsletterId}/versions`);
      set({ versions: data.versions || [], versionsLoading: false });
    } catch (e) {
      console.error('Error fetching versions:', e);
      set({ versionsLoading: false });
    }
  },

  createSnapshot: async (newsletterId, version, title, userId, userName) => {
    const { ydoc } = get();
    const sections = ydoc ? readSectionsFromYDoc(ydoc) : useEditorStore.getState().sections;

    try {
      await versionApiRequest(`/newsletters/${newsletterId}/versions`, {
        method: 'POST',
        body: JSON.stringify({
          version,
          title,
          sections,
          createdBy: userId,
          createdByName: userName,
        }),
      });
      // Refresh versions list
      await get().fetchVersions(newsletterId);
    } catch (e) {
      console.error('Error creating snapshot:', e);
      throw e;
    }
  },

  restoreVersion: async (versionId) => {
    const { versions, ydoc } = get();
    const version = versions.find((v) => v.id === versionId);
    if (!version || !version.sections) return;

    // Write restored sections to Y.Doc → syncs to all peers
    if (ydoc) {
      writeSectionsToYDoc(ydoc, version.sections);
    } else {
      useEditorStore.getState().setSections(version.sections);
    }
    useEditorStore.getState().markDirty();
  },
}));
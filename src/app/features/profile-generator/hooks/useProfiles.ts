/**
 * Profile Generator – profile state hook
 *
 * Fetches saved profiles + templates from the backend (Supabase KV via pg-api).
 * Enriches profiles with template category/label for filtering and display.
 * Provides filtered list + CRUD operations that stay in sync.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Profile } from '../utils/types';
import type { SavedProfile, ProfileTemplate } from '../utils/pg-types';
import * as pgApi from '../utils/pg-api';

interface UseProfilesOptions {
  searchQuery?: string;
  categoryFilter?: string; // 'all' or a category name
}

/** Map backend SavedProfile → enriched Profile for the list UI */
function toProfile(
  sp: SavedProfile,
  templateMap: Map<string, ProfileTemplate>,
): Profile {
  const tpl = sp.templateId ? templateMap.get(sp.templateId) : null;
  return {
    id: sp.id,
    name: sp.name,
    templateId: sp.templateId ?? '',
    templateLabel: tpl?.name ?? (sp.templateId ? 'Custom' : 'Blank'),
    category: tpl?.category ?? 'Custom',
    thumbnailUrl: sp.thumbnailUrl ?? null,
    createdAt: sp.createdAt,
  };
}

export function useProfiles({ searchQuery = '', categoryFilter = 'all' }: UseProfilesOptions = {}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const didFetch = useRef(false);
  const templateMapRef = useRef<Map<string, ProfileTemplate>>(new Map());

  // ─── Filtered view ──────────────────────────────────────
  const filtered = useMemo(() => {
    let result = profiles;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.templateLabel.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter);
    }

    return result;
  }, [profiles, searchQuery, categoryFilter]);

  // Collect active categories for the filter dropdown
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of profiles) {
      if (p.category) cats.add(p.category);
    }
    return Array.from(cats).sort();
  }, [profiles]);

  // ─── Fetch from backend ─────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch templates and profiles in parallel
      const [savedProfiles, templates] = await Promise.all([
        pgApi.fetchProfiles(),
        pgApi.fetchTemplates().catch(() => [] as ProfileTemplate[]),
      ]);

      // Build template lookup map
      const tplMap = new Map<string, ProfileTemplate>();
      for (const t of templates) {
        tplMap.set(t.id, t);
      }
      templateMapRef.current = tplMap;

      setProfiles(savedProfiles.map((sp) => toProfile(sp, tplMap)));
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Mutations (optimistic + backend) ───────────────────

  const duplicateProfile = useCallback(
    async (id: string) => {
      const source = profiles.find((p) => p.id === id);
      if (!source) return;

      const tempId = `p-${Date.now()}`;
      const optimistic: Profile = {
        ...source,
        id: tempId,
        name: `${source.name} (Copy)`,
        createdAt: new Date().toISOString(),
      };
      setProfiles((prev) => [optimistic, ...prev]);

      try {
        const full = await pgApi.fetchProfile(id);
        const created = await pgApi.createProfile({
          name: `${full.name} (Copy)`,
          templateId: full.templateId,
          canvasConfig: full.canvasConfig,
          layers: full.layers,
        });
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === tempId ? toProfile(created, templateMapRef.current) : p,
          ),
        );
      } catch (err) {
        console.error('Duplicate failed:', err);
        setProfiles((prev) => prev.filter((p) => p.id !== tempId));
        throw err;
      }
    },
    [profiles],
  );

  const deleteProfile = useCallback(async (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));

    try {
      await pgApi.deleteProfile(id);
    } catch (err) {
      console.error('Delete failed:', err);
      try {
        const [savedProfiles, templates] = await Promise.all([
          pgApi.fetchProfiles(),
          pgApi.fetchTemplates().catch(() => [] as ProfileTemplate[]),
        ]);
        const tplMap = new Map<string, ProfileTemplate>();
        for (const t of templates) tplMap.set(t.id, t);
        templateMapRef.current = tplMap;
        setProfiles(savedProfiles.map((sp) => toProfile(sp, tplMap)));
      } catch {
        /* ignore */
      }
      throw err;
    }
  }, []);

  const deleteMany = useCallback(async (ids: Set<string>) => {
    setProfiles((prev) => prev.filter((p) => !ids.has(p.id)));

    try {
      await Promise.allSettled(
        Array.from(ids).map((id) => pgApi.deleteProfile(id)),
      );
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  }, []);

  // ─── Load on mount ──────────────────────────────────────
  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      refresh();
    }
  }, [refresh]);

  return {
    profiles: filtered,
    allProfiles: profiles,
    activeCategories,
    loading,
    refresh,
    duplicateProfile,
    deleteProfile,
    deleteMany,
  };
}

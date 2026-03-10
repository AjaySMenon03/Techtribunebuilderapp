/**
 * Hook for mobile-aware section data editing.
 *
 * Desktop-first model:
 *  - Desktop mode: reads/writes `section.data` directly
 *  - Mobile mode: reads effective data (desktop + mobile overrides merged),
 *    writes create/update mobile overrides only
 *
 * Usage in settings components:
 *   const { val, set, isOverridden, clearOverride, isMobile } = useMobileAwareField(section, 'fontColor');
 */
import { useCallback, useMemo } from 'react';
import { useEditorStore } from './editor-store';
import type { Section, MobileOverrides } from './editor-types';

// Keys that can be overridden on mobile — must match MobileOverrides keys
const OVERRIDABLE_KEYS: Set<string> = new Set([
  'fontColor',
  'bgColor',
  'columns',
  'membersPerRow',
  'textAlign',
  'fontSize',
  'padding',
  'hidden',
]);

export function useMobileAwareField(section: Section, key: string) {
  const previewMode = useEditorStore((s) => s.previewMode);
  const updateSectionData = useEditorStore((s) => s.updateSectionData);
  const updateMobileOverride = useEditorStore((s) => s.updateMobileOverride);
  const clearMobileOverrideFn = useEditorStore((s) => s.clearMobileOverride);

  const isMobile = previewMode === 'mobile';
  const overrides = section.mobileOverrides || {};
  const isOverridable = OVERRIDABLE_KEYS.has(key);
  const hasOverride = isOverridable && overrides[key as keyof MobileOverrides] !== undefined;

  // Effective value: in mobile mode, overlay override on top of desktop value
  const val = useMemo(() => {
    if (isMobile && hasOverride) {
      return overrides[key as keyof MobileOverrides];
    }
    return section.data[key];
  }, [isMobile, hasOverride, overrides, key, section.data]);

  const set = useCallback(
    (value: any) => {
      if (isMobile && isOverridable) {
        // Write to mobile overrides
        updateMobileOverride(section.id, { [key]: value } as Partial<MobileOverrides>);
      } else {
        // Write to desktop data
        updateSectionData(section.id, { [key]: value });
      }
    },
    [isMobile, isOverridable, section.id, key, updateMobileOverride, updateSectionData],
  );

  const clearOverride = useCallback(() => {
    clearMobileOverrideFn(section.id, key as keyof MobileOverrides);
  }, [clearMobileOverrideFn, section.id, key]);

  return {
    val,
    set,
    isOverridden: isMobile && hasOverride,
    isOverridable: isMobile && isOverridable,
    clearOverride,
    isMobile,
  };
}

/**
 * Returns the effective section data for preview rendering.
 * In mobile mode, merges mobile overrides on top of desktop data.
 */
export function getEffectiveSectionData(section: Section, isMobile: boolean): Record<string, any> {
  if (!isMobile || !section.mobileOverrides) return section.data;
  const merged = { ...section.data };
  const overrides = section.mobileOverrides;
  for (const key of OVERRIDABLE_KEYS) {
    const val = overrides[key as keyof MobileOverrides];
    if (val !== undefined) {
      merged[key] = val;
    }
  }
  return merged;
}

/**
 * Returns count of active mobile overrides for a section.
 */
export function getMobileOverrideCount(section: Section): number {
  if (!section.mobileOverrides) return 0;
  return Object.values(section.mobileOverrides).filter((v) => v !== undefined).length;
}

/**
 * Returns a new Section with mobile overrides applied to its data.
 * Useful for preview rendering and export.
 */
export function getEffectiveSection(section: Section, isMobile: boolean): Section {
  const effectiveData = getEffectiveSectionData(section, isMobile);
  if (effectiveData === section.data) return section;
  return { ...section, data: effectiveData };
}
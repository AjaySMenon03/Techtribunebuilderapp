import { create } from 'zustand';
import type { Section, SectionBaseType, PreviewMode, AppreciationMember, MobileOverrides } from './editor-types';
import { createSection, sanitizeSections } from './editor-types';

// --- Collab delegate: avoids circular imports ---
// The collab-store registers itself here when collab is active.

export interface CollabDelegate {
  yjsSetSections: (sections: Section[]) => void;
  yjsUpdateSection: (id: string, updates: Partial<Section>) => void;
  yjsUpdateSectionData: (id: string, data: Record<string, any>) => void;
  yjsAddSection: (section: Section) => void;
  yjsRemoveSection: (id: string) => void;
  yjsReorderSections: (activeId: string, overId: string) => void;
  yjsToggleVisibility: (id: string) => void;
}

let _collabDelegate: CollabDelegate | null = null;

export function registerCollabDelegate(delegate: CollabDelegate | null) {
  _collabDelegate = delegate;
}

// --- Editor State ---

interface EditorState {
  sections: Section[];
  selectedSectionId: string | null;
  collabActive: boolean;
  previewMode: PreviewMode;
  darkModePreview: boolean;
  dirty: boolean;
  lastSavedAt: string | null;

  // Section CRUD
  setSections: (sections: Section[]) => void;
  addSection: (baseType: SectionBaseType) => void;
  duplicateSection: (id: string) => void;
  removeSection: (id: string) => void;
  updateSectionData: (id: string, data: Record<string, any>) => void;
  toggleSectionVisibility: (id: string) => void;
  reorderSections: (activeId: string, overId: string) => void;

  // Appreciation member helpers
  addAppreciationMember: (sectionId: string) => void;
  removeAppreciationMember: (sectionId: string, memberId: string) => void;
  updateAppreciationMember: (sectionId: string, memberId: string, updates: Partial<AppreciationMember>) => void;
  reorderAppreciationMembers: (sectionId: string, activeId: string, overId: string) => void;

  // Selection
  selectSection: (id: string | null) => void;
  selectedSection: () => Section | null;

  // Preview
  setPreviewMode: (mode: PreviewMode) => void;
  toggleDarkModePreview: () => void;

  // Dirty tracking
  markDirty: () => void;
  markClean: (savedAt: string) => void;

  // Collab
  setCollabActive: (active: boolean) => void;

  // Mobile overrides
  updateMobileOverride: (id: string, overrides: Partial<MobileOverrides>) => void;
  clearMobileOverride: (id: string, key: keyof MobileOverrides) => void;
  clearAllMobileOverrides: (id: string) => void;

  // Get sanitized sections for saving
  getSanitizedSections: () => Section[];
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const newArr = [...arr];
  const [item] = newArr.splice(from, 1);
  newArr.splice(to, 0, item);
  return newArr;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  sections: [],
  selectedSectionId: null,
  collabActive: false,
  previewMode: 'desktop',
  darkModePreview: false,
  dirty: false,
  lastSavedAt: null,

  setSections: (sections) => set({ sections }),

  setCollabActive: (active) => set({ collabActive: active }),

  addSection: (baseType) => {
    const section = createSection(baseType);
    if (get().collabActive && _collabDelegate) {
      _collabDelegate.yjsAddSection(section);
      set({ selectedSectionId: section.id, dirty: true });
      return;
    }
    set((s) => ({
      sections: [...s.sections, section],
      selectedSectionId: section.id,
      dirty: true,
    }));
  },

  duplicateSection: (id) => {
    const { sections, collabActive } = get();
    const source = sections.find((s) => s.id === id);
    if (!source) return;
    const dup: Section = {
      ...JSON.parse(JSON.stringify(source)),
      id: crypto.randomUUID(),
    };
    const idx = sections.findIndex((s) => s.id === id);
    const newSections = [...sections];
    newSections.splice(idx + 1, 0, dup);

    if (collabActive && _collabDelegate) {
      _collabDelegate.yjsSetSections(newSections);
      set({ selectedSectionId: dup.id, dirty: true });
      return;
    }
    set({ sections: newSections, selectedSectionId: dup.id, dirty: true });
  },

  removeSection: (id) => {
    if (get().collabActive && _collabDelegate) {
      _collabDelegate.yjsRemoveSection(id);
      set((s) => ({
        selectedSectionId: s.selectedSectionId === id ? null : s.selectedSectionId,
        dirty: true,
      }));
      return;
    }
    set((s) => ({
      sections: s.sections.filter((sec) => sec.id !== id),
      selectedSectionId: s.selectedSectionId === id ? null : s.selectedSectionId,
      dirty: true,
    }));
  },

  updateSectionData: (id, data) => {
    if (get().collabActive && _collabDelegate) {
      _collabDelegate.yjsUpdateSectionData(id, data);
      set({ dirty: true });
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, data: { ...sec.data, ...data } } : sec,
      ),
      dirty: true,
    }));
  },

  toggleSectionVisibility: (id) => {
    if (get().collabActive && _collabDelegate) {
      _collabDelegate.yjsToggleVisibility(id);
      set({ dirty: true });
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, visible: !sec.visible } : sec,
      ),
      dirty: true,
    }));
  },

  reorderSections: (activeId, overId) => {
    if (activeId === overId) return;
    if (get().collabActive && _collabDelegate) {
      _collabDelegate.yjsReorderSections(activeId, overId);
      set({ dirty: true });
      return;
    }
    const { sections } = get();
    const oldIdx = sections.findIndex((s) => s.id === activeId);
    const newIdx = sections.findIndex((s) => s.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;
    set({ sections: arrayMove(sections, oldIdx, newIdx), dirty: true });
  },

  // Appreciation member helpers
  addAppreciationMember: (sectionId) => {
    const member: AppreciationMember = {
      id: crypto.randomUUID(),
      name: '',
      photoUrl: '',
      photoUrls: [],
      message: '',
      cardColor: '#e9e0cc',
    };
    const { collabActive, sections } = get();
    if (collabActive && _collabDelegate) {
      const section = sections.find((s) => s.id === sectionId);
      if (section) {
        _collabDelegate.yjsUpdateSectionData(sectionId, {
          members: [...(section.data.members || []), member],
        });
        set({ dirty: true });
      }
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, data: { ...sec.data, members: [...(sec.data.members || []), member] } }
          : sec,
      ),
      dirty: true,
    }));
  },

  removeAppreciationMember: (sectionId, memberId) => {
    const { collabActive, sections } = get();
    if (collabActive && _collabDelegate) {
      const section = sections.find((s) => s.id === sectionId);
      if (section) {
        _collabDelegate.yjsUpdateSectionData(sectionId, {
          members: (section.data.members || []).filter((m: AppreciationMember) => m.id !== memberId),
        });
        set({ dirty: true });
      }
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              data: {
                ...sec.data,
                members: (sec.data.members || []).filter((m: AppreciationMember) => m.id !== memberId),
              },
            }
          : sec,
      ),
      dirty: true,
    }));
  },

  updateAppreciationMember: (sectionId, memberId, updates) => {
    const { collabActive, sections } = get();
    if (collabActive && _collabDelegate) {
      const section = sections.find((s) => s.id === sectionId);
      if (section) {
        _collabDelegate.yjsUpdateSectionData(sectionId, {
          members: (section.data.members || []).map((m: AppreciationMember) =>
            m.id === memberId ? { ...m, ...updates } : m,
          ),
        });
        set({ dirty: true });
      }
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              data: {
                ...sec.data,
                members: (sec.data.members || []).map((m: AppreciationMember) =>
                  m.id === memberId ? { ...m, ...updates } : m,
                ),
              },
            }
          : sec,
      ),
      dirty: true,
    }));
  },

  reorderAppreciationMembers: (sectionId, activeId, overId) => {
    if (activeId === overId) return;
    const { sections, collabActive } = get();
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const members = [...(section.data.members || [])];
    const oldIdx = members.findIndex((m: AppreciationMember) => m.id === activeId);
    const newIdx = members.findIndex((m: AppreciationMember) => m.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(members, oldIdx, newIdx);
    if (collabActive && _collabDelegate) {
      _collabDelegate.yjsUpdateSectionData(sectionId, { members: reordered });
      set({ dirty: true });
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, data: { ...sec.data, members: reordered } } : sec,
      ),
      dirty: true,
    }));
  },

  selectSection: (id) => set({ selectedSectionId: id }),

  selectedSection: () => {
    const { sections, selectedSectionId } = get();
    return sections.find((s) => s.id === selectedSectionId) || null;
  },

  setPreviewMode: (mode) => set({ previewMode: mode }),
  toggleDarkModePreview: () => set((s) => ({ darkModePreview: !s.darkModePreview })),

  markDirty: () => set({ dirty: true }),
  markClean: (savedAt) => set({ dirty: false, lastSavedAt: savedAt }),

  // Mobile overrides
  updateMobileOverride: (id, overrides) => {
    const { collabActive, sections } = get();
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    const merged = { ...(section.mobileOverrides || {}), ...overrides };
    if (collabActive && _collabDelegate) {
      _collabDelegate.yjsUpdateSection(id, { mobileOverrides: merged });
      set({ dirty: true });
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, mobileOverrides: merged } : sec,
      ),
      dirty: true,
    }));
  },

  clearMobileOverride: (id, key) => {
    const { collabActive, sections } = get();
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    const current = { ...(section.mobileOverrides || {}) };
    delete current[key];
    if (collabActive && _collabDelegate) {
      _collabDelegate.yjsUpdateSection(id, { mobileOverrides: current });
      set({ dirty: true });
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, mobileOverrides: current } : sec,
      ),
      dirty: true,
    }));
  },

  clearAllMobileOverrides: (id) => {
    const { collabActive } = get();
    if (collabActive && _collabDelegate) {
      _collabDelegate.yjsUpdateSection(id, { mobileOverrides: undefined });
      set({ dirty: true });
      return;
    }
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, mobileOverrides: undefined } : sec,
      ),
      dirty: true,
    }));
  },

  getSanitizedSections: () => sanitizeSections(get().sections),
}));
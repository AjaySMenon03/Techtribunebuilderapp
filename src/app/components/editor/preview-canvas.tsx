import { useEditorStore } from '../../lib/editor-store';
import { useCollabStore } from '../../lib/collab-store';
import { PREVIEW_WIDTHS, applyDarkModeToSection } from '../../lib/editor-types';
import { SectionPreview } from './section-previews';
import type { ThemeConfig } from '../../lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Plus } from 'lucide-react';

interface PreviewCanvasProps {
  theme: ThemeConfig;
  className?: string;
}

export function PreviewCanvas({ theme, className }: PreviewCanvasProps) {
  const { sections, previewMode, darkModePreview, selectedSectionId, selectSection } = useEditorStore();
  const remoteUsers = useCollabStore((s) => s.remoteUsers);

  const width = PREVIEW_WIDTHS[previewMode];

  // Apply dark mode overrides
  const effectiveTheme: ThemeConfig = darkModePreview
    ? {
        ...theme,
        background_color: '#1a1a2e',
        card_color: '#16213e',
        text_color: '#e0e0e0',
        accent_color: theme.accent_color === '#000000' ? '#ffffff' : theme.accent_color,
      }
    : theme;

  const visibleSections = sections.filter((s) => s.visible);

  // Build map of sectionId → editing users
  const editingUsersMap: Record<string, { name: string; color: string }[]> = {};
  for (const user of remoteUsers) {
    if (user.editingSectionId) {
      if (!editingUsersMap[user.editingSectionId]) {
        editingUsersMap[user.editingSectionId] = [];
      }
      editingUsersMap[user.editingSectionId].push({ name: user.name, color: user.color });
    }
  }

  return (
    <ScrollArea className={`flex-1 h-full ${className || ''}`}>
      <div className="flex justify-center py-4 sm:py-8 px-2 sm:px-6 min-h-full" style={{ backgroundColor: '#f0f0f0' }}>
        <div
          className="shadow-lg rounded-lg overflow-hidden"
          style={{
            width,
            maxWidth: '100%',
            backgroundColor: effectiveTheme.background_color,
            fontFamily: effectiveTheme.font_family,
          }}
        >
          {visibleSections.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 text-center"
              style={{ color: effectiveTheme.text_color }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${effectiveTheme.accent_color}15` }}
              >
                <Plus className="w-7 h-7" style={{ color: effectiveTheme.accent_color }} />
              </div>
              <p className="text-sm opacity-60">Add sections from the left panel</p>
              <p className="text-xs opacity-40 mt-1">They will appear here as a live preview</p>
            </div>
          ) : (
            <div>
              {visibleSections.map((section) => {
                const editingUsers = editingUsersMap[section.id] || [];
                return (
                  <div key={section.id} className="relative">
                    {/* Editing user badges on preview */}
                    {editingUsers.length > 0 && (
                      <div className="absolute top-1 left-1 z-10 flex items-center gap-1">
                        {editingUsers.map((eu, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white shadow-sm"
                            style={{ backgroundColor: eu.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                            {eu.name.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Colored left border for editing indicator */}
                    {editingUsers.length > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 z-10"
                        style={{ backgroundColor: editingUsers[0].color }}
                      />
                    )}
                    <SectionPreview
                      section={applyDarkModeToSection(section, darkModePreview)}
                      theme={effectiveTheme}
                      selected={section.id === selectedSectionId}
                      onClick={() => selectSection(section.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useNewsletterStore, useWorkspaceStore, useAuthStore } from '../store';
import { useEditorStore, registerCollabDelegate } from '../lib/editor-store';
import { useCollabStore } from '../lib/collab-store';
import { EditorTopBar } from '../components/editor/editor-top-bar';
import { EditorLeftSidebar } from '../components/editor/editor-left-sidebar';
import { PreviewCanvas } from '../components/editor/preview-canvas';
import { SectionSettingsPanel } from '../components/editor/section-settings-panel';
import { VersionHistoryPanel } from '../components/editor/version-history-panel';
import { Loader2, Layers, Eye, Settings2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '../components/ui/use-mobile';
import { Button } from '../components/ui/button';

const AUTO_SAVE_INTERVAL = 15_000; // 15 seconds

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Auth
  const { user } = useAuthStore();

  // Global stores
  const { currentNewsletter, fetchOne, update, autoSave, loading: nlLoading } = useNewsletterStore();
  const { workspace } = useWorkspaceStore();

  // Editor store
  const {
    sections,
    dirty,
    lastSavedAt,
    setSections,
    getSanitizedSections,
    markDirty,
    markClean,
    setCollabActive,
    selectedSectionId,
  } = useEditorStore();

  // Collab store
  const {
    initCollaboration,
    destroyCollaboration,
    setEditingSection,
    createSnapshot,
    showVersionHistory,
    connected: collabConnected,
  } = useCollabStore();

  // Local state
  const [title, setTitle] = useState('');
  const [isDraft, setIsDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'preview' | 'sections' | 'settings'>('preview');
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch newsletter on mount
  useEffect(() => {
    if (id) fetchOne(id);
    return () => {
      // Reset editor state when leaving
      setSections([]);
      setCollabActive(false);
      registerCollabDelegate(null);
      destroyCollaboration();
    };
  }, [id, fetchOne, setSections, setCollabActive, destroyCollaboration]);

  // Load newsletter data into editor store + initialize collab
  useEffect(() => {
    if (currentNewsletter && !initialLoaded) {
      setTitle(currentNewsletter.title);
      setIsDraft(currentNewsletter.is_draft);
      const content = currentNewsletter.content_json;
      const initialSections = (content?.sections && Array.isArray(content.sections))
        ? content.sections
        : [];

      setSections(initialSections);
      markClean(currentNewsletter.updated_at);
      setInitialLoaded(true);

      // Initialize Yjs collaboration
      if (user && id) {
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

        // Register the collab delegate
        const collabState = useCollabStore.getState();
        registerCollabDelegate({
          yjsSetSections: collabState.yjsSetSections,
          yjsUpdateSection: collabState.yjsUpdateSection,
          yjsUpdateSectionData: collabState.yjsUpdateSectionData,
          yjsAddSection: collabState.yjsAddSection,
          yjsRemoveSection: collabState.yjsRemoveSection,
          yjsReorderSections: collabState.yjsReorderSections,
          yjsToggleVisibility: collabState.yjsToggleVisibility,
        });

        initCollaboration(id, user.id, userName, initialSections);
        setCollabActive(true);
      }
    }
  }, [currentNewsletter, initialLoaded, setSections, markClean, user, id, initCollaboration, setCollabActive]);

  // Track which section the local user is editing
  useEffect(() => {
    if (collabConnected) {
      setEditingSection(selectedSectionId);
    }
  }, [selectedSectionId, collabConnected, setEditingSection]);

  // Track title/draft changes as dirty
  const titleRef = useRef(title);
  const draftRef = useRef(isDraft);
  useEffect(() => {
    if (initialLoaded) {
      if (titleRef.current !== title || draftRef.current !== isDraft) {
        markDirty();
      }
      titleRef.current = title;
      draftRef.current = isDraft;
    }
  }, [title, isDraft, initialLoaded, markDirty]);

  // Build the save payload
  const buildPayload = useCallback(() => {
    const sanitizedSections = getSanitizedSections();
    return {
      title,
      is_draft: isDraft,
      content_json: { sections: sanitizedSections },
    };
  }, [title, isDraft, getSanitizedSections]);

  // Manual save (increments version) + creates version snapshot
  const handleManualSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      await update(id, buildPayload());
      const newsletter = useNewsletterStore.getState().currentNewsletter;
      const newVersion = newsletter?.version || 1;

      // Create version snapshot
      if (user) {
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        try {
          await createSnapshot(id, newVersion, title || 'Untitled', user.id, userName);
        } catch (e) {
          console.error('Failed to create version snapshot:', e);
          // Don't fail the save for this
        }
      }

      markClean(new Date().toISOString());
      toast.success(`Saved! (v${newVersion})`);
    } catch (err: any) {
      console.error('Manual save error:', err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [id, update, buildPayload, markClean, user, title, createSnapshot]);

  // Auto-save (doesn't increment version)
  const handleAutoSave = useCallback(async () => {
    if (!id || !dirty || saving || autoSaving) return;
    setAutoSaving(true);
    try {
      await autoSave(id, buildPayload());
      markClean(new Date().toISOString());
    } catch (err: any) {
      console.error('Auto-save error:', err);
    } finally {
      setAutoSaving(false);
    }
  }, [id, dirty, saving, autoSaving, autoSave, buildPayload, markClean]);

  // Auto-save timer
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      handleAutoSave();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [handleAutoSave]);

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Get effective theme
  const theme = currentNewsletter?.theme_config || workspace.theme;

  if (nlLoading && !initialLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!currentNewsletter && initialLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Newsletter not found</p>
      </div>
    );
  }

  // Edge case: loading finished but no newsletter and not yet initialized
  if (!currentNewsletter && !nlLoading && !initialLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Newsletter not found</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <EditorTopBar
        title={title}
        version={currentNewsletter?.version || 1}
        isDraft={isDraft}
        saving={saving || autoSaving}
        dirty={dirty}
        lastSavedAt={lastSavedAt}
        theme={theme}
        onSave={handleManualSave}
        onToggleDraft={setIsDraft}
        onTitleChange={setTitle}
      />

      {/* Three-panel layout (desktop) / Single panel with bottom nav (mobile) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Section list */}
        {isMobile ? (
          mobilePanel === 'sections' && (
            <div className="w-full h-full overflow-hidden flex flex-col">
              <EditorLeftSidebar className="w-full flex-1" />
            </div>
          )
        ) : (
          <EditorLeftSidebar />
        )}

        {/* Center: Live preview */}
        {isMobile ? (
          mobilePanel === 'preview' && (
            <div className="w-full h-full overflow-hidden">
              <PreviewCanvas theme={theme} className="w-full h-full" />
            </div>
          )
        ) : (
          <PreviewCanvas theme={theme} />
        )}

        {/* Right: Section settings */}
        {isMobile ? (
          mobilePanel === 'settings' && (
            <div className="w-full h-full bg-card overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold">Section Settings</h3>
              </div>
              <div className="flex-1 overflow-hidden">
                <SectionSettingsPanel />
              </div>
            </div>
          )
        ) : (
          <div className="w-72 lg:w-80 border-l border-border bg-card shrink-0 overflow-hidden hidden md:flex flex-col">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">Section Settings</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <SectionSettingsPanel />
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom navigation bar — sticky at the bottom */}
      {isMobile && (
        <div className="flex border-t border-border bg-card shrink-0 safe-area-bottom">
          <button
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              mobilePanel === 'sections'
                ? 'text-primary bg-primary/5'
                : 'text-muted-foreground'
            }`}
            onClick={() => setMobilePanel('sections')}
            aria-label="Sections panel"
          >
            <Layers className="w-4 h-4" />
            <span>Sections</span>
          </button>
          <button
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              mobilePanel === 'preview'
                ? 'text-primary bg-primary/5'
                : 'text-muted-foreground'
            }`}
            onClick={() => setMobilePanel('preview')}
            aria-label="Preview panel"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              mobilePanel === 'settings'
                ? 'text-primary bg-primary/5'
                : 'text-muted-foreground'
            }`}
            onClick={() => setMobilePanel('settings')}
            aria-label="Settings panel"
          >
            <Settings2 className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      )}

      {/* Version History Panel (overlay) */}
      {id && <VersionHistoryPanel newsletterId={id} />}
    </div>
  );
}

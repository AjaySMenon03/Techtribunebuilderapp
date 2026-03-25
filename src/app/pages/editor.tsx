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
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';

const AUTO_SAVE_INTERVAL = 15_000; // 15 seconds

const PANEL_ORDER = ['sections', 'preview', 'settings'] as const;
type MobilePanel = typeof PANEL_ORDER[number];

/** Use 1280px breakpoint so all tablets (landscape + portrait) get the mobile panel layout */
function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1280 : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    setIsNarrow(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isNarrow;
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsNarrow();
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
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('preview');
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Swipe gesture tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const navigatePanel = useCallback((dir: 'left' | 'right') => {
    setMobilePanel((current) => {
      const idx = PANEL_ORDER.indexOf(current);
      const next = dir === 'left' ? idx + 1 : idx - 1;
      if (next < 0 || next >= PANEL_ORDER.length) return current;
      return PANEL_ORDER[next];
    });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;
      // Require ≥60px horizontal movement and horizontal > 2.5× vertical (avoids scroll conflicts)
      if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 2.5) {
        navigatePanel(dx < 0 ? 'left' : 'right');
      }
    },
    [navigatePanel],
  );

  // Fetch newsletter on mount
  useEffect(() => {
    if (id) fetchOne(id);
    return () => {
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

      if (user && id) {
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
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
    if (collabConnected) setEditingSection(selectedSectionId);
  }, [selectedSectionId, collabConnected, setEditingSection]);

  // Track title/draft changes as dirty
  const titleRef = useRef(title);
  const draftRef = useRef(isDraft);
  useEffect(() => {
    if (initialLoaded) {
      if (titleRef.current !== title || draftRef.current !== isDraft) markDirty();
      titleRef.current = title;
      draftRef.current = isDraft;
    }
  }, [title, isDraft, initialLoaded, markDirty]);

  // Build the save payload
  const buildPayload = useCallback(() => {
    const sanitizedSections = getSanitizedSections();
    return { title, is_draft: isDraft, content_json: { sections: sanitizedSections } };
  }, [title, isDraft, getSanitizedSections]);

  // Manual save
  const handleManualSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      await update(id, buildPayload());
      const newsletter = useNewsletterStore.getState().currentNewsletter;
      const newVersion = newsletter?.version || 1;
      if (user) {
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        try {
          await createSnapshot(id, newVersion, title || 'Untitled', user.id, userName);
        } catch (e) {
          console.error('Failed to create version snapshot:', e);
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

  // Auto-save
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

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => { handleAutoSave(); }, AUTO_SAVE_INTERVAL);
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current); };
  }, [handleAutoSave]);

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleManualSave(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

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

  const currentPanelIndex = PANEL_ORDER.indexOf(mobilePanel);

  return (
    <div className="h-full flex flex-col relative">
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

      {/* Three-panel layout (desktop) / Single panel with swipe + bottom nav (mobile/tablet) */}
      <div
        className="flex-1 flex overflow-hidden min-h-0"
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
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
              {/* Settings header */}
              <div className="px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold">Section Settings</h3>
              </div>

              {/* Draft / Published toggle — visible here on tablet since top bar hides it */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isDraft
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {isDraft ? 'Draft' : 'Published'}
                </span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground" style={{ fontWeight: 'var(--font-weight-normal)' }}>Draft</Label>
                  <Switch
                    checked={!isDraft}
                    onCheckedChange={(v) => setIsDraft(!v)}
                    className="scale-90"
                  />
                  <Label className="text-xs text-muted-foreground" style={{ fontWeight: 'var(--font-weight-normal)' }}>Published</Label>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <SectionSettingsPanel />
              </div>
            </div>
          )
        ) : (
          <div className="w-72 xl:w-80 border-l border-border bg-card shrink-0 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">Section Settings</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <SectionSettingsPanel />
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom navigation bar */}
      {isMobile && (
        <div className="flex border-t border-border bg-card shrink-0 safe-area-bottom">
          {PANEL_ORDER.map((panel, idx) => {
            const isActive = mobilePanel === panel;
            const Icon = panel === 'sections' ? Layers : panel === 'preview' ? Eye : Settings2;
            const label = panel === 'sections' ? 'Sections' : panel === 'preview' ? 'Preview' : 'Settings';
            return (
              <button
                key={panel}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 text-xs font-medium transition-colors relative ${
                  isActive ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                }`}
                onClick={() => setMobilePanel(panel)}
                aria-label={`${label} panel`}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
                )}
                <Icon className="w-4 h-4" />
                <span className="mt-0.5">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Swipe hint dots (shown briefly on mobile) */}
      {isMobile && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
          {PANEL_ORDER.map((_, idx) => (
            <span
              key={idx}
              className={`rounded-full transition-all duration-300 ${
                idx === currentPanelIndex
                  ? 'w-4 h-1.5 bg-primary/60'
                  : 'w-1.5 h-1.5 bg-primary/20'
              }`}
            />
          ))}
        </div>
      )}

      {/* Version History Panel (overlay) */}
      {id && <VersionHistoryPanel newsletterId={id} />}
    </div>
  );
}
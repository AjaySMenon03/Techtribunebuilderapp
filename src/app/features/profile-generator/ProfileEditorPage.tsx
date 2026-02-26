/**
 * ProfileEditorPage – full three-panel canvas editor.
 *
 * Responsive: on mobile/tablet (<1024px) the layout switches to a single
 * visible panel with a sticky bottom tab bar (Layers / Canvas / Settings),
 * matching the newsletter editor's mobile pattern.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Layers, Eye, Settings2 } from 'lucide-react';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { LayerPanel } from './components/editor/LayerPanel';
import { SettingsPanel } from './components/editor/SettingsPanel';
import { EditorToolbar } from './components/editor/EditorToolbar';
import { AssetBrowserSheet } from './components/editor/AssetBrowserSheet';
import { SaveTemplateDialog } from './components/editor/SaveTemplateDialog';
import { ExportDialog } from './components/editor/ExportDialog';
import { useEditorState } from './hooks/useEditorState';
import { useImageCache } from './hooks/useImageCache';
import type { EditorLayer, LayerType } from './utils/editor-types';
import {
  DEFAULT_CANVAS_CONFIG,
  DEFAULT_IMAGE_ADJUSTMENTS,
  generateLayerId,
} from './utils/editor-types';
import type { LibraryAsset } from './utils/pg-types';
import * as pgApi from './utils/pg-api';
import { generateThumbnail, dataURLtoBlob } from './utils/export-utils';

/** Detect if viewport is narrow (mobile/tablet) */
function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

type MobileTab = 'layers' | 'canvas' | 'settings';

export function ProfileEditorPage() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const profileId = searchParams.get('id');

  const isMobile = useIsMobile();

  const {
    state,
    dispatch,
    selectedLayer,
    addLayer,
    addImageLayer,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    selectLayer,
    toggleVisibility,
    toggleLock,
    reorderLayers,
    updateCanvasConfig,
    setProfileName,
  } = useEditorState();

  const { getImage, preload } = useImageCache();

  // ─── Mobile tab state ──────────────────────────────────
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');

  // When a layer is selected on mobile, switch to settings tab
  useEffect(() => {
    if (isMobile && state.selectedLayerId) {
      setMobileTab('settings');
    }
  }, [isMobile, state.selectedLayerId]);

  // ─── Dialogs / sheets ─────────────────────────────────
  const [assetBrowserOpen, setAssetBrowserOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [assetBrowserReplaceMode, setAssetBrowserReplaceMode] = useState(false);

  // ─── Load template or profile on mount ─────────────────
  useEffect(() => {
    if (initialLoaded) return;

    async function load() {
      try {
        if (profileId) {
          const profile = await pgApi.fetchProfile(profileId);
          const layers: EditorLayer[] = profile.layers || [];

          // Detect image layers with stale blob URLs (from previous sessions).
          // These are unrecoverable — clear the src so the canvas shows a
          // placeholder, and warn the user to re-upload.
          let staleBlobCount = 0;
          for (const layer of layers) {
            if (
              layer.type === 'image' &&
              layer.src?.startsWith('blob:') &&
              !layer.storagePath
            ) {
              layer.src = '';
              staleBlobCount++;
            }
          }
          if (staleBlobCount > 0) {
            toast.warning(
              `${staleBlobCount} image${staleBlobCount > 1 ? 's have' : ' has'} expired and need${staleBlobCount > 1 ? '' : 's'} to be re-uploaded.`,
              { duration: 6000 },
            );
          }

          dispatch({
            type: 'LOAD_STATE',
            state: {
              layers,
              selectedLayerId: null,
              canvasConfig: profile.canvasConfig || DEFAULT_CANVAS_CONFIG,
              profileName: profile.name,
            },
          });
          setLoadedProfileId(profile.id);
        } else if (templateId) {
          const template = await pgApi.fetchTemplate(templateId);
          dispatch({
            type: 'LOAD_STATE',
            state: {
              layers: template.layers || [],
              selectedLayerId: null,
              canvasConfig: template.canvasConfig || DEFAULT_CANVAS_CONFIG,
              profileName: 'Untitled Profile',
            },
          });
        }
      } catch (err) {
        console.error('Failed to load editor data:', err);
      }
    }
    load();
    setInitialLoaded(true);
  }, [profileId, templateId, dispatch, initialLoaded]);

  // Preload images whenever layers change
  // Skip blob URLs — they are either freshly created (already preloaded
  // explicitly by handleAddImageFile) or stale from a previous session.
  useEffect(() => {
    for (const layer of state.layers) {
      if (layer.type === 'image' && layer.src && !layer.src.startsWith('blob:')) {
        preload(layer.src);
      }
    }
  }, [state.layers, preload]);

  // ─── Memoised callbacks ────────────────────────────────
  const handleAddLayer = useCallback(
    (type: LayerType) => addLayer(type),
    [addLayer],
  );

  const handleAddImageLayer = useCallback(
    (src: string, w: number, h: number) => {
      addImageLayer(src, w, h);
      preload(src);
    },
    [addImageLayer, preload],
  );

  /**
   * Upload a file to persistent storage, then create an image layer
   * with the signed URL + storagePath so it survives across sessions.
   */
  const handleAddImageFile = useCallback(
    async (file: File) => {
      // 1. Get dimensions from the file
      const blobUrl = URL.createObjectURL(file);
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => resolve({ w: 200, h: 200 });
        img.src = blobUrl;
      });

      // 2. Create layer with blob URL for instant preview
      const layer = addImageLayer(blobUrl, dims.w, dims.h);
      preload(blobUrl);

      // 3. Upload to storage in the background
      try {
        const { url: signedUrl, path: storagePath } = await pgApi.uploadImageFile(file);
        // 4. Swap blob URL → persistent signed URL + store storagePath
        updateLayer(layer.id, { src: signedUrl, storagePath });
        preload(signedUrl);
        // Revoke the temporary blob URL
        URL.revokeObjectURL(blobUrl);
      } catch (err: any) {
        console.error('Image upload failed:', err);
        toast.error(`Image upload failed: ${err.message || 'Unknown error'}`);
        // Layer stays with blob URL — will work this session but won't persist
      }
    },
    [addImageLayer, updateLayer, preload],
  );

  const handleUpdateLayer = useCallback(
    (id: string, changes: Partial<EditorLayer>) => updateLayer(id, changes),
    [updateLayer],
  );

  // ─── Insert asset from library ─────────────────────────
  const handleInsertAsset = useCallback(
    (asset: LibraryAsset) => {
      if (assetBrowserReplaceMode && state.selectedLayerId) {
        const layer = state.layers.find(
          (l) => l.id === state.selectedLayerId && l.type === 'image',
        );
        if (layer) {
          updateLayer(layer.id, {
            src: asset.url,
            name: asset.name,
            storagePath: asset.storagePath,
          });
          preload(asset.url);
          toast.success(`Replaced with "${asset.name}"`);
          setAssetBrowserReplaceMode(false);
          return;
        }
      }

      const cc = state.canvasConfig;

      if (asset.type === 'background') {
        const layer: EditorLayer = {
          id: generateLayerId(),
          type: 'image',
          name: asset.name,
          x: 0,
          y: 0,
          width: cc.width,
          height: cc.height,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          src: asset.url,
          storagePath: asset.storagePath,
          adjustments: DEFAULT_IMAGE_ADJUSTMENTS,
        };
        dispatch({ type: 'ADD_LAYER', layer });
      } else {
        const maxW = cc.width * 0.6;
        const maxH = cc.height * 0.6;
        const scale = Math.min(
          maxW / (asset.width || 200),
          maxH / (asset.height || 200),
          1,
        );
        const w = Math.round((asset.width || 200) * scale);
        const h = Math.round((asset.height || 200) * scale);
        const layer: EditorLayer = {
          id: generateLayerId(),
          type: 'image',
          name: asset.name,
          x: Math.round((cc.width - w) / 2),
          y: Math.round((cc.height - h) / 2),
          width: w,
          height: h,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          src: asset.url,
          storagePath: asset.storagePath,
          adjustments: DEFAULT_IMAGE_ADJUSTMENTS,
        };
        dispatch({ type: 'ADD_LAYER', layer });
      }
      preload(asset.url);
      toast.success(`Added "${asset.name}" from library`);
    },
    [
      state.canvasConfig,
      state.selectedLayerId,
      state.layers,
      assetBrowserReplaceMode,
      dispatch,
      preload,
      updateLayer,
    ],
  );

  const handleReplaceFromLibrary = useCallback(() => {
    setAssetBrowserReplaceMode(true);
    setAssetBrowserOpen(true);
  }, []);

  // ─── Save profile to backend (with thumbnail) ─────────
  const handleSaveProfile = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      let thumbnailUrl: string | null = null;
      try {
        const thumbDataUrl = generateThumbnail(
          state.canvasConfig,
          state.layers,
          getImage,
        );
        const thumbBlob = dataURLtoBlob(thumbDataUrl);
        thumbnailUrl = await pgApi.uploadThumbnail(thumbBlob);
      } catch (thumbErr) {
        console.warn('Thumbnail generation failed:', thumbErr);
      }

      if (loadedProfileId) {
        await pgApi.updateProfile(loadedProfileId, {
          name: state.profileName,
          canvasConfig: state.canvasConfig,
          layers: state.layers,
          thumbnailUrl,
        });
        toast.success('Profile saved');
      } else {
        const created = await pgApi.createProfile({
          name: state.profileName,
          templateId,
          canvasConfig: state.canvasConfig,
          layers: state.layers,
        });
        if (thumbnailUrl) {
          await pgApi.updateProfile(created.id, { thumbnailUrl });
        }
        setLoadedProfileId(created.id);
        toast.success('Profile created');
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [saving, loadedProfileId, state, templateId, getImage]);

  // ─── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        state.selectedLayerId &&
        !inInput
      ) {
        const sel = state.layers.find((l) => l.id === state.selectedLayerId);
        if (sel && !sel.locked) {
          e.preventDefault();
          deleteLayer(sel.id);
        }
      }
      if (e.key === 'Escape') selectLayer(null);
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && state.selectedLayerId) {
        e.preventDefault();
        duplicateLayer(state.selectedLayerId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProfile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !inInput) {
        e.preventDefault();
        setExportOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    state.selectedLayerId,
    state.layers,
    deleteLayer,
    selectLayer,
    duplicateLayer,
    handleSaveProfile,
  ]);

  // ─── Zoom via scroll wheel ─────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const next = Math.min(3, Math.max(0.25, state.canvasConfig.zoom + delta));
      updateCanvasConfig({ zoom: Math.round(next * 100) / 100 });
    },
    [state.canvasConfig.zoom, updateCanvasConfig],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Toolbar */}
      <EditorToolbar
        profileName={state.profileName}
        canvasConfig={state.canvasConfig}
        onSetProfileName={setProfileName}
        onUpdateCanvas={updateCanvasConfig}
        onSaveAsTemplate={() => setSaveTemplateOpen(true)}
        onSaveProfile={handleSaveProfile}
        onExport={() => setExportOpen(true)}
        isMobile={isMobile}
      />

      {/* Three-panel body (desktop) / single panel (mobile) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left – Layer Panel */}
        {isMobile ? (
          mobileTab === 'layers' && (
            <div className="w-full h-full overflow-hidden flex flex-col">
              <LayerPanel
                layers={state.layers}
                selectedLayerId={state.selectedLayerId}
                onSelectLayer={(id) => {
                  selectLayer(id);
                  if (id) setMobileTab('settings');
                }}
                onToggleVisibility={toggleVisibility}
                onToggleLock={toggleLock}
                onDeleteLayer={deleteLayer}
                onDuplicateLayer={duplicateLayer}
                onReorderLayers={reorderLayers}
                onAddLayer={handleAddLayer}
                onAddImageLayer={handleAddImageLayer}
                onAddImageFile={handleAddImageFile}
                onOpenAssetBrowser={() => setAssetBrowserOpen(true)}
              />
            </div>
          )
        ) : (
          <LayerPanel
            layers={state.layers}
            selectedLayerId={state.selectedLayerId}
            onSelectLayer={selectLayer}
            onToggleVisibility={toggleVisibility}
            onToggleLock={toggleLock}
            onDeleteLayer={deleteLayer}
            onDuplicateLayer={duplicateLayer}
            onReorderLayers={reorderLayers}
            onAddLayer={handleAddLayer}
            onAddImageLayer={handleAddImageLayer}
            onAddImageFile={handleAddImageFile}
            onOpenAssetBrowser={() => setAssetBrowserOpen(true)}
          />
        )}

        {/* Centre – Canvas */}
        {isMobile ? (
          mobileTab === 'canvas' && (
            <div
              className="flex-1 w-full overflow-auto bg-muted/30 flex items-center justify-center min-w-0"
              onWheel={handleWheel}
            >
              <div className="p-4">
                <EditorCanvas
                  layers={state.layers}
                  canvasConfig={state.canvasConfig}
                  selectedLayerId={state.selectedLayerId}
                  getImage={getImage}
                  onSelectLayer={selectLayer}
                  onUpdateLayer={handleUpdateLayer}
                />
              </div>
            </div>
          )
        ) : (
          <div
            className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center min-w-0"
            onWheel={handleWheel}
          >
            <div className="p-8">
              <EditorCanvas
                layers={state.layers}
                canvasConfig={state.canvasConfig}
                selectedLayerId={state.selectedLayerId}
                getImage={getImage}
                onSelectLayer={selectLayer}
                onUpdateLayer={handleUpdateLayer}
              />
            </div>
          </div>
        )}

        {/* Right – Settings Panel */}
        {isMobile ? (
          mobileTab === 'settings' && (
            <div className="w-full h-full overflow-hidden flex flex-col">
              <SettingsPanel
                selectedLayer={selectedLayer}
                canvasConfig={state.canvasConfig}
                onUpdateLayer={handleUpdateLayer}
                onUpdateCanvas={updateCanvasConfig}
                getImage={getImage}
                onReplaceFromLibrary={handleReplaceFromLibrary}
              />
            </div>
          )
        ) : (
          <SettingsPanel
            selectedLayer={selectedLayer}
            canvasConfig={state.canvasConfig}
            onUpdateLayer={handleUpdateLayer}
            onUpdateCanvas={updateCanvasConfig}
            getImage={getImage}
            onReplaceFromLibrary={handleReplaceFromLibrary}
          />
        )}
      </div>

      {/* Mobile bottom navigation bar — sticky footer */}
      {isMobile && (
        <div className="flex border-t border-border bg-card shrink-0">
          <button
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              mobileTab === 'layers'
                ? 'text-primary bg-primary/5'
                : 'text-muted-foreground'
            }`}
            onClick={() => setMobileTab('layers')}
            aria-label="Layers panel"
          >
            <Layers className="w-4 h-4" />
            <span>Layers</span>
          </button>
          <button
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              mobileTab === 'canvas'
                ? 'text-primary bg-primary/5'
                : 'text-muted-foreground'
            }`}
            onClick={() => setMobileTab('canvas')}
            aria-label="Canvas panel"
          >
            <Eye className="w-4 h-4" />
            <span>Canvas</span>
          </button>
          <button
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              mobileTab === 'settings'
                ? 'text-primary bg-primary/5'
                : 'text-muted-foreground'
            }`}
            onClick={() => setMobileTab('settings')}
            aria-label="Settings panel"
          >
            <Settings2 className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      )}

      {/* Asset Browser Sheet */}
      <AssetBrowserSheet
        open={assetBrowserOpen}
        onClose={() => {
          setAssetBrowserOpen(false);
          setAssetBrowserReplaceMode(false);
        }}
        onInsertAsset={handleInsertAsset}
        isAdmin={!assetBrowserReplaceMode}
        replaceMode={assetBrowserReplaceMode}
      />

      {/* Save as Template Dialog */}
      <SaveTemplateDialog
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        editorState={state}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        profileName={state.profileName}
        canvasConfig={state.canvasConfig}
        layers={state.layers}
        getImage={getImage}
      />
    </div>
  );
}
import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStudioStore } from './store/canvasStudioStore';
import CanvasCore from './components/canvas/CanvasCore';
import type { CanvasCoreHandle } from './components/canvas/CanvasCore';
import FloatingToolbar from './components/toolbar/FloatingToolbar';
import TopActionBar from './components/toolbar/TopActionBar';
import ZoomControls from './components/toolbar/ZoomControls';
import RightPanel from './components/panels/RightPanel';
import MiniMap from './components/canvas/MiniMap';
import WelcomeOverlay from './components/canvas/WelcomeOverlay';
import CanvasContextMenu from './components/canvas/CanvasContextMenu';
import ExportDialog from './components/dialogs/ExportDialog';
import AIGeneratorDialog from './components/dialogs/AIGeneratorDialog';
import { SaveDialog, LoadDialog } from './components/dialogs/SaveLoadDialog';
import KeyboardShortcutsDialog from './components/dialogs/KeyboardShortcutsDialog';
import { logger } from './utils/logger';
import { toast } from 'sonner';

interface CanvasStudioProps {
  projectId?: string;
}

export default function CanvasStudio({ projectId }: CanvasStudioProps) {
  const canvasRef = useRef<CanvasCoreHandle>(null);
  const { loadProjectsFromStorage, saveProject, currentProjectId, projects, setActiveTool, activeTool, objectCount, setCurrentProjectId } = useCanvasStudioStore();

  const [exportOpen, setExportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);

  // Load saved projects on mount
  useEffect(() => {
    loadProjectsFromStorage();
    logger.info('Canvas Studio mounted');
  }, [loadProjectsFromStorage]);

  // Set project ID from route
  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
    }
  }, [projectId, setCurrentProjectId]);

  // Load existing project JSON when mounting with a project ID
  useEffect(() => {
    if (!projectId) return;
    const project = projects.find((p) => p.id === projectId);
    if (project && project.canvasJSON && canvasRef.current) {
      canvasRef.current.loadJSON(project.canvasJSON).catch(() => {
        logger.warn('Failed to load project JSON');
      });
    }
  }, [projectId, projects]);

  // Handle autosave
  const handleAutoSave = useCallback((json: string) => {
    const state = useCanvasStudioStore.getState();
    const id = state.currentProjectId || crypto.randomUUID();
    const existing = state.projects.find((p) => p.id === id);
    saveProject({
      id,
      name: existing?.name || 'Untitled Canvas',
      canvasJSON: json,
      thumbnail: canvasRef.current?.toDataURL('png', 0.2) || '',
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  }, [saveProject]);

  // G key for AI
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setAiOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Handle tool actions that need canvas ref
  useEffect(() => {
    if (activeTool === 'text') {
      canvasRef.current?.addText();
    } else if (activeTool === 'sticky') {
      canvasRef.current?.addStickyNote();
    } else if (activeTool === 'flowchart_start') {
      canvasRef.current?.addFlowchartShape('start');
    } else if (activeTool === 'flowchart_process') {
      canvasRef.current?.addFlowchartShape('process');
    } else if (activeTool === 'flowchart_decision') {
      canvasRef.current?.addFlowchartShape('decision');
    }
  }, [activeTool]);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Main workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative min-w-0">
          <CanvasCore ref={canvasRef} onSave={handleAutoSave} />

          {/* Welcome overlay (when canvas is empty) */}
          <WelcomeOverlay visible={objectCount === 0} />

          {/* Top action bar (glassmorphic) */}
          <TopActionBar
            canvasRef={canvasRef}
            onExport={() => setExportOpen(true)}
            onAI={() => setAiOpen(true)}
            onSave={() => setSaveOpen(true)}
            projectName={currentProject?.name}
          />

          {/* Floating toolbar at bottom (FigJam-style) */}
          <FloatingToolbar canvasRef={canvasRef} />

          {/* Zoom controls */}
          <ZoomControls canvasRef={canvasRef} />

          {/* MiniMap */}
          <MiniMap getCanvas={() => canvasRef.current?.getCanvas() ?? null} />

          {/* Context menu */}
          <CanvasContextMenu canvasRef={canvasRef} />
        </div>

        {/* Right panel */}
        <RightPanel canvasRef={canvasRef} />
      </div>

      {/* Dialogs */}
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} canvasRef={canvasRef} />
      <AIGeneratorDialog open={aiOpen} onOpenChange={setAiOpen} canvasRef={canvasRef} />
      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} canvasRef={canvasRef} />
      <LoadDialog open={loadOpen} onOpenChange={setLoadOpen} canvasRef={canvasRef} />
      <KeyboardShortcutsDialog />
    </div>
  );
}

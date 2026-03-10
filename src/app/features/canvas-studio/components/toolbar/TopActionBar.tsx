import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Undo2,
  Redo2,
  Grid3x3,
  Magnet,
  Download,
  Sparkles,
  Save,
  ArrowLeft,
  Keyboard,
  PanelRight,
  Settings2,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../components/ui/popover';
import { Label } from '../../../../components/ui/label';
import { Slider } from '../../../../components/ui/slider';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';
import type { CanvasCoreHandle } from '../canvas/CanvasCore';
import type { CanvasBackground } from '../../types/canvasTypes';

interface TopActionBarProps {
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
  onExport: () => void;
  onAI: () => void;
  onSave: () => void;
  projectName?: string;
}

function ActionBtn({
  icon,
  label,
  onClick,
  active,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
            active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
          } ${className || ''}`}
          onClick={onClick}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs backdrop-blur-xl bg-background/90 border-white/20">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function TopActionBar({ canvasRef, onExport, onAI, onSave, projectName }: TopActionBarProps) {
  const navigate = useNavigate();
  const {
    showGrid, toggleGrid, snapEnabled, toggleSnap,
    rightPanelOpen, toggleRightPanel,
    setShortcutsOpen,
    canvasBackground, setCanvasBackground,
    canvasBgColor, setCanvasBgColor,
    gridSize, setGridSize,
    brushColor, setBrushColor,
    brushWidth, setBrushWidth,
    activeTool,
  } = useCanvasStudioStore();

  const handleUndo = () => {
    const json = useCanvasStudioStore.getState().undo();
    if (json) canvasRef.current?.loadJSON(json);
  };

  const handleRedo = () => {
    const json = useCanvasStudioStore.getState().redo();
    if (json) canvasRef.current?.loadJSON(json);
  };

  const bgOptions: { value: CanvasBackground; label: string; preview: string }[] = [
    { value: 'light', label: 'Light', preview: 'bg-slate-50' },
    { value: 'dark', label: 'Dark', preview: 'bg-slate-900' },
    { value: 'dots', label: 'Dots', preview: 'bg-slate-50' },
    { value: 'grid', label: 'Grid', preview: 'bg-slate-50' },
    { value: 'transparent', label: 'None', preview: 'bg-[repeating-conic-gradient(#e2e8f0_0%_25%,transparent_0%_50%)]' },
  ];

  const showBrushSettings = activeTool === 'brush' || activeTool === 'pen' || activeTool === 'eraser';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Back + Project name */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-lg">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  onClick={() => navigate('/canvas-studio')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Back to Projects</TooltipContent>
            </Tooltip>
            <span className="text-sm font-medium text-foreground max-w-[160px] truncate px-1">
              {projectName || 'Untitled Canvas'}
            </span>
          </div>
        </div>

        {/* Center: Undo/Redo */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-lg pointer-events-auto">
          <ActionBtn icon={<Undo2 className="w-3.5 h-3.5" />} label="Undo (Ctrl+Z)" onClick={handleUndo} />
          <ActionBtn icon={<Redo2 className="w-3.5 h-3.5" />} label="Redo (Ctrl+Y)" onClick={handleRedo} />

          <div className="w-px h-5 bg-border/30 mx-0.5" />

          <ActionBtn icon={<Grid3x3 className="w-3.5 h-3.5" />} label="Toggle Grid" onClick={toggleGrid} active={showGrid} />
          <ActionBtn icon={<Magnet className="w-3.5 h-3.5" />} label="Toggle Snap" onClick={toggleSnap} active={snapEnabled} />

          {/* Canvas settings popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-all">
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="center"
              sideOffset={8}
              className="w-56 p-3 backdrop-blur-2xl bg-white/85 dark:bg-slate-900/85 border-white/20 dark:border-white/10 shadow-2xl rounded-xl"
            >
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Background</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {bgOptions.map((opt) => (
                      <Tooltip key={opt.value}>
                        <TooltipTrigger asChild>
                          <button
                            className={`w-full aspect-square rounded-lg border-2 transition-all ${
                              canvasBackground === opt.value
                                ? 'border-primary shadow-sm scale-105'
                                : 'border-border/30 hover:border-border'
                            } ${opt.preview}`}
                            onClick={() => setCanvasBackground(opt.value)}
                          >
                            {opt.value === 'dots' && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="grid grid-cols-3 gap-0.5">
                                  {[...Array(9)].map((_, i) => <div key={i} className="w-0.5 h-0.5 rounded-full bg-slate-300" />)}
                                </div>
                              </div>
                            )}
                            {opt.value === 'grid' && (
                              <div className="w-full h-full rounded-md border border-slate-200 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:6px_6px]" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px]">{opt.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                {(canvasBackground === 'grid' || canvasBackground === 'dots') && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[10px] text-muted-foreground">Grid Size</Label>
                      <span className="text-[10px] text-muted-foreground">{gridSize}px</span>
                    </div>
                    <Slider
                      value={[gridSize]}
                      onValueChange={([v]) => setGridSize(v)}
                      min={10}
                      max={80}
                      step={10}
                    />
                  </div>
                )}

                {showBrushSettings && (
                  <>
                    <div className="w-full h-px bg-border/30" />
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Brush</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brushColor}
                          onChange={(e) => setBrushColor(e.target.value)}
                          className="w-6 h-6 rounded border border-border cursor-pointer p-0"
                        />
                        <Slider
                          value={[brushWidth]}
                          onValueChange={([v]) => setBrushWidth(v)}
                          min={1}
                          max={30}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-4 text-right">{brushWidth}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-lg">
            <ActionBtn
              icon={<Keyboard className="w-3.5 h-3.5" />}
              label="Shortcuts (?)"
              onClick={() => setShortcutsOpen(true)}
            />
            <ActionBtn
              icon={<PanelRight className="w-3.5 h-3.5" />}
              label="Properties Panel"
              onClick={toggleRightPanel}
              active={rightPanelOpen}
            />

            <div className="w-px h-5 bg-border/30 mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
                  onClick={onAI}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium hidden sm:inline">AI</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">AI Generate (G)</TooltipContent>
            </Tooltip>

            <ActionBtn icon={<Save className="w-3.5 h-3.5" />} label="Save (Ctrl+S)" onClick={onSave} />
            <ActionBtn icon={<Download className="w-3.5 h-3.5" />} label="Export" onClick={onExport} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

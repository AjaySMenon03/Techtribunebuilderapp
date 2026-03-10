import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Map,
} from 'lucide-react';
import { Point } from 'fabric';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../components/ui/tooltip';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';
import { ZOOM_PRESETS, ZOOM_MIN, ZOOM_MAX } from '../../types/canvasTypes';
import type { CanvasCoreHandle } from '../canvas/CanvasCore';

interface ZoomControlsProps {
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

export default function ZoomControls({ canvasRef }: ZoomControlsProps) {
  const { viewport, setViewport, minimapOpen, toggleMinimap, objectCount } = useCanvasStudioStore();

  const zoomTo = (z: number) => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    const cx = canvas.getWidth() / 2;
    const cy = canvas.getHeight() / 2;
    const point = new Point(cx, cy);
    canvas.zoomToPoint(point, zoom);
    setViewport({
      zoom,
      panX: canvas.viewportTransform![4],
      panY: canvas.viewportTransform![5],
    });
  };

  const zoomIn = () => zoomTo(viewport.zoom * 1.25);
  const zoomOut = () => zoomTo(viewport.zoom / 1.25);
  const fitScreen = () => canvasRef.current?.fitToScreen();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute bottom-5 left-4 z-20 flex items-center gap-1 bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-xl px-1.5 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors" onClick={zoomOut}>
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Zoom Out</TooltipContent>
        </Tooltip>

        <button
          onClick={() => zoomTo(1)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground tabular-nums min-w-[3.2rem] text-center transition-colors"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors" onClick={zoomIn}>
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Zoom In</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border/30 mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors" onClick={fitScreen}>
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Fit to Screen</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${minimapOpen ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'}`}
              onClick={toggleMinimap}
            >
              <Map className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Toggle Minimap</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border/30 mx-0.5" />

        <span className="text-[10px] text-muted-foreground tabular-nums px-1">{objectCount} obj</span>
      </div>
    </TooltipProvider>
  );
}

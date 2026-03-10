import { useCallback, useRef, useState } from 'react';
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Triangle,
  Minus,
  ArrowRight,
  Star,
  Hexagon,
  Pen,
  Paintbrush,
  Eraser,
  Type,
  StickyNote,
  ImagePlus,
  Diamond,
  PlayCircle,
  SquareIcon,
  ChevronDown,
  Shapes,
  PenLine,
  Workflow,
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
import { useCanvasStudioStore } from '../../store/canvasStudioStore';
import type { CanvasTool } from '../../types/canvasTypes';
import type { CanvasCoreHandle } from '../canvas/CanvasCore';
import { MAX_IMAGE_SIZE } from '../../types/canvasTypes';
import { toast } from 'sonner';

interface FloatingToolbarProps {
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

// Tool button for the floating bar
function ToolBtn({
  tool,
  icon,
  label,
  shortcut,
  onClick,
}: {
  tool: CanvasTool;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
}) {
  const { activeTool, setActiveTool } = useCanvasStudioStore();
  const isActive = activeTool === tool;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
            isActive
              ? 'bg-primary text-primary-foreground shadow-md scale-105'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
          }`}
          onClick={() => {
            setActiveTool(tool);
            onClick?.();
          }}
        >
          {icon}
          {isActive && (
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-foreground" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs backdrop-blur-xl bg-background/90 border-white/20">
        {label}
        {shortcut && <kbd className="ml-1.5 px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/50">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

// Separator
function Sep() {
  return <div className="w-px h-6 bg-border/40 mx-0.5 shrink-0" />;
}

// Shape submenu items
const SHAPE_TOOLS: { tool: CanvasTool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
  { tool: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle', shortcut: 'R' },
  { tool: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Circle', shortcut: 'C' },
  { tool: 'triangle', icon: <Triangle className="w-4 h-4" />, label: 'Triangle' },
  { tool: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line', shortcut: 'L' },
  { tool: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Arrow', shortcut: 'A' },
  { tool: 'star', icon: <Star className="w-4 h-4" />, label: 'Star', shortcut: 'S' },
  { tool: 'polygon', icon: <Hexagon className="w-4 h-4" />, label: 'Polygon' },
];

const DRAW_TOOLS: { tool: CanvasTool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
  { tool: 'pen', icon: <Pen className="w-4 h-4" />, label: 'Pen' },
  { tool: 'brush', icon: <Paintbrush className="w-4 h-4" />, label: 'Brush', shortcut: 'B' },
  { tool: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser', shortcut: 'X' },
];

const FLOW_TOOLS: { tool: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { tool: 'flowchart_start', icon: <PlayCircle className="w-4 h-4" />, label: 'Start / End' },
  { tool: 'flowchart_process', icon: <SquareIcon className="w-4 h-4" />, label: 'Process' },
  { tool: 'flowchart_decision', icon: <Diamond className="w-4 h-4" />, label: 'Decision' },
];

function ToolGroupPopover({
  tools,
  groupIcon,
  groupLabel,
  groupTools,
}: {
  tools: typeof SHAPE_TOOLS;
  groupIcon: React.ReactNode;
  groupLabel: string;
  groupTools: CanvasTool[];
}) {
  const { activeTool, setActiveTool } = useCanvasStudioStore();
  const [open, setOpen] = useState(false);
  const isGroupActive = groupTools.includes(activeTool);
  const activeInGroup = tools.find((t) => t.tool === activeTool);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className={`relative flex items-center gap-0.5 h-9 px-2 rounded-xl transition-all duration-200 ${
                isGroupActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
              }`}
            >
              {activeInGroup ? activeInGroup.icon : groupIcon}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs backdrop-blur-xl bg-background/90 border-white/20">
          {groupLabel}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        className="w-auto p-1.5 backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 border-white/20 dark:border-white/10 shadow-2xl rounded-2xl"
      >
        <div className="flex gap-0.5">
          {tools.map((t) => (
            <Tooltip key={t.tool}>
              <TooltipTrigger asChild>
                <button
                  className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 ${
                    activeTool === t.tool
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setActiveTool(t.tool);
                    setOpen(false);
                  }}
                >
                  {t.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {t.label}
                {t.shortcut && <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px] font-mono">{t.shortcut}</kbd>}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function FloatingToolbar({ canvasRef }: FloatingToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be under 10MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const url = URL.createObjectURL(file);
    canvasRef.current?.addImage(url);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [canvasRef]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Cursor tools */}
          <ToolBtn tool="select" icon={<MousePointer2 className="w-4 h-4" />} label="Select" shortcut="V" />
          <ToolBtn tool="hand" icon={<Hand className="w-4 h-4" />} label="Hand" shortcut="H" />

          <Sep />

          {/* Shapes group */}
          <ToolGroupPopover
            tools={SHAPE_TOOLS}
            groupIcon={<Shapes className="w-4 h-4" />}
            groupLabel="Shapes"
            groupTools={SHAPE_TOOLS.map((t) => t.tool)}
          />

          <Sep />

          {/* Drawing group */}
          <ToolGroupPopover
            tools={DRAW_TOOLS}
            groupIcon={<PenLine className="w-4 h-4" />}
            groupLabel="Drawing"
            groupTools={DRAW_TOOLS.map((t) => t.tool)}
          />

          <Sep />

          {/* Content tools */}
          <ToolBtn tool="text" icon={<Type className="w-4 h-4" />} label="Text" shortcut="T" />
          <ToolBtn tool="sticky" icon={<StickyNote className="w-4 h-4" />} label="Sticky Note" shortcut="N" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-200"
                onClick={handleImageUpload}
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs backdrop-blur-xl bg-background/90 border-white/20">
              Upload Image
            </TooltipContent>
          </Tooltip>

          <Sep />

          {/* Flowchart group */}
          <ToolGroupPopover
            tools={FLOW_TOOLS}
            groupIcon={<Workflow className="w-4 h-4" />}
            groupLabel="Flowchart"
            groupTools={FLOW_TOOLS.map((t) => t.tool)}
          />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </TooltipProvider>
  );
}

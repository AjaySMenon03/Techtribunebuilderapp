import { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  FlipHorizontal,
  FlipVertical,
  PanelRightClose,
  Layers,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Columns3,
  Rows3,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Slider } from '../../../../components/ui/slider';
import { Separator } from '../../../../components/ui/separator';
import { ScrollArea } from '../../../../components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../components/ui/tooltip';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';
import type { CanvasCoreHandle } from '../canvas/CanvasCore';
import { getMeta } from '../../utils/canvasHelpers';

interface RightPanelProps {
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

interface ObjectProps {
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  locked: boolean;
  type: string;
}

export default function RightPanel({ canvasRef }: RightPanelProps) {
  const { rightPanelOpen, toggleRightPanel, selectedObjectIds } = useCanvasStudioStore();
  const [props, setProps] = useState<ObjectProps | null>(null);
  const [layers, setLayers] = useState<{ id: string; type: string; name: string }[]>([]);
  const [showLayers, setShowLayers] = useState(false);

  const hasMultiSelect = selectedObjectIds.length > 1;

  const getActiveObject = useCallback(() => {
    return canvasRef.current?.getCanvas()?.getActiveObject() ?? null;
  }, [canvasRef]);

  // Sync selected object properties
  useEffect(() => {
    const obj = getActiveObject();
    if (!obj) {
      setProps(null);
      return;
    }
    const meta = getMeta(obj);
    const bound = obj.getBoundingRect();
    setProps({
      left: Math.round(obj.left ?? 0),
      top: Math.round(obj.top ?? 0),
      width: Math.round(bound.width),
      height: Math.round(bound.height),
      angle: Math.round(obj.angle ?? 0),
      fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
      stroke: typeof obj.stroke === 'string' ? obj.stroke : '#000000',
      strokeWidth: obj.strokeWidth ?? 0,
      opacity: Math.round((obj.opacity ?? 1) * 100),
      locked: meta?.locked ?? false,
      type: meta?.type ?? obj.type ?? 'unknown',
    });
  }, [selectedObjectIds, getActiveObject]);

  // Refresh layers list
  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const objects = canvas.getObjects().filter((o: any) => !o._isGuide && !o._isTemp);
    setLayers(
      objects.map((o: any, i: number) => {
        const meta = getMeta(o);
        return {
          id: meta?.id ?? `obj-${i}`,
          type: meta?.type ?? o.type ?? 'unknown',
          name: `${(meta?.type ?? o.type ?? 'Object').charAt(0).toUpperCase() + (meta?.type ?? o.type ?? 'object').slice(1)} ${i + 1}`,
        };
      }).reverse()
    );
  }, [selectedObjectIds, canvasRef]);

  const updateProp = useCallback((key: string, value: any) => {
    const obj = getActiveObject();
    if (!obj) return;
    obj.set(key as any, value);
    obj.setCoords();
    canvasRef.current?.getCanvas()?.requestRenderAll();
    canvasRef.current?.saveSnapshot();
    setProps((p) => p ? { ...p, [key]: value } : p);
  }, [getActiveObject, canvasRef]);

  const toggleLock = () => {
    const obj = getActiveObject();
    if (!obj) return;
    const meta = getMeta(obj);
    const newLocked = !(meta?.locked);
    if (meta) meta.locked = newLocked;
    obj.set({ selectable: !newLocked, evented: !newLocked, lockMovementX: newLocked, lockMovementY: newLocked, lockRotation: newLocked, lockScalingX: newLocked, lockScalingY: newLocked });
    canvasRef.current?.getCanvas()?.requestRenderAll();
    setProps((p) => p ? { ...p, locked: newLocked } : p);
    canvasRef.current?.saveSnapshot();
  };

  if (!rightPanelOpen) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-64 border-l border-border/30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col h-full shrink-0 transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLayers(false)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all duration-200 ${!showLayers ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              Properties
            </button>
            <button
              onClick={() => setShowLayers(true)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 ${showLayers ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <Layers className="w-3 h-3" />Layers
            </button>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={toggleRightPanel}>
            <PanelRightClose className="w-3.5 h-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {showLayers ? (
            <div className="p-2 space-y-0.5">
              {layers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No objects on canvas</p>
              ) : (
                layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 ${
                      selectedObjectIds.includes(layer.id) ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <span className="text-muted-foreground text-[9px] uppercase font-mono w-12 truncate">{layer.type}</span>
                    <span className="truncate flex-1">{layer.name}</span>
                  </div>
                ))
              )}
            </div>
          ) : !props ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-xs">Select an object to edit</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Properties will appear here</p>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {/* Type badge */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md">{props.type}</span>
                {selectedObjectIds.length > 1 && (
                  <span className="text-[9px] text-muted-foreground">({selectedObjectIds.length} selected)</span>
                )}
              </div>

              {/* Alignment tools (visible when multi-select) */}
              {hasMultiSelect && (
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Align</Label>
                  <div className="flex gap-0.5">
                    {[
                      { align: 'left' as const, icon: <AlignStartVertical className="w-3.5 h-3.5" />, tip: 'Align Left' },
                      { align: 'center' as const, icon: <AlignCenterVertical className="w-3.5 h-3.5" />, tip: 'Align Center' },
                      { align: 'right' as const, icon: <AlignEndVertical className="w-3.5 h-3.5" />, tip: 'Align Right' },
                      { align: 'top' as const, icon: <AlignStartHorizontal className="w-3.5 h-3.5" />, tip: 'Align Top' },
                      { align: 'middle' as const, icon: <AlignCenterHorizontal className="w-3.5 h-3.5" />, tip: 'Align Middle' },
                      { align: 'bottom' as const, icon: <AlignEndHorizontal className="w-3.5 h-3.5" />, tip: 'Align Bottom' },
                    ].map((a) => (
                      <Tooltip key={a.align}>
                        <TooltipTrigger asChild>
                          <button
                            className="flex items-center justify-center w-8 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            onClick={() => canvasRef.current?.alignObjects(a.align)}
                          >
                            {a.icon}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px]">{a.tip}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center justify-center gap-1 h-7 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-[10px]"
                          onClick={() => canvasRef.current?.distributeObjects('horizontal')}
                        >
                          <Columns3 className="w-3.5 h-3.5" />
                          Distribute H
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">Distribute Horizontally</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center justify-center gap-1 h-7 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-[10px]"
                          onClick={() => canvasRef.current?.distributeObjects('vertical')}
                        >
                          <Rows3 className="w-3.5 h-3.5" />
                          Distribute V
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">Distribute Vertically</TooltipContent>
                    </Tooltip>
                  </div>
                  <Separator className="mt-2 opacity-30" />
                </div>
              )}

              {/* Transform */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Transform</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">X</Label>
                    <Input
                      type="number"
                      value={props.left}
                      onChange={(e) => updateProp('left', Number(e.target.value))}
                      className="h-7 text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Y</Label>
                    <Input
                      type="number"
                      value={props.top}
                      onChange={(e) => updateProp('top', Number(e.target.value))}
                      className="h-7 text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">W</Label>
                    <Input type="number" value={props.width} readOnly className="h-7 text-xs bg-muted/30 rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">H</Label>
                    <Input type="number" value={props.height} readOnly className="h-7 text-xs bg-muted/30 rounded-lg" />
                  </div>
                </div>
                <div className="mt-1.5">
                  <Label className="text-[10px] text-muted-foreground">Rotation</Label>
                  <Input
                    type="number"
                    value={props.angle}
                    onChange={(e) => updateProp('angle', Number(e.target.value))}
                    className="h-7 text-xs rounded-lg"
                    min={0}
                    max={360}
                  />
                </div>
                <div className="flex gap-1 mt-1.5">
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs rounded-lg border-border/40" onClick={() => updateProp('flipX', !getActiveObject()?.flipX)}>
                    <FlipHorizontal className="w-3 h-3 mr-1" />Flip H
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs rounded-lg border-border/40" onClick={() => updateProp('flipY', !getActiveObject()?.flipY)}>
                    <FlipVertical className="w-3 h-3 mr-1" />Flip V
                  </Button>
                </div>
              </div>

              <Separator className="opacity-30" />

              {/* Style */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Style</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground w-10">Fill</Label>
                    <input
                      type="color"
                      value={props.fill}
                      onChange={(e) => updateProp('fill', e.target.value)}
                      className="w-7 h-7 rounded-lg border border-border/40 cursor-pointer p-0.5"
                    />
                    <Input
                      value={props.fill}
                      onChange={(e) => updateProp('fill', e.target.value)}
                      className="h-7 text-xs font-mono flex-1 rounded-lg"
                      maxLength={7}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground w-10">Stroke</Label>
                    <input
                      type="color"
                      value={props.stroke}
                      onChange={(e) => updateProp('stroke', e.target.value)}
                      className="w-7 h-7 rounded-lg border border-border/40 cursor-pointer p-0.5"
                    />
                    <Input
                      value={props.stroke}
                      onChange={(e) => updateProp('stroke', e.target.value)}
                      className="h-7 text-xs font-mono flex-1 rounded-lg"
                      maxLength={7}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground w-10">Width</Label>
                    <Slider
                      value={[props.strokeWidth]}
                      onValueChange={([v]) => updateProp('strokeWidth', v)}
                      min={0}
                      max={20}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground w-4 text-right tabular-nums">{props.strokeWidth}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground w-10">Opacity</Label>
                    <Slider
                      value={[props.opacity]}
                      onValueChange={([v]) => updateProp('opacity', v / 100)}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground w-6 text-right tabular-nums">{props.opacity}%</span>
                  </div>
                </div>
              </div>

              <Separator className="opacity-30" />

              {/* Actions */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Actions</Label>
                <div className="grid grid-cols-2 gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs justify-start rounded-lg border-border/40" onClick={() => canvasRef.current?.bringToFront()}>
                    <ChevronsUp className="w-3 h-3 mr-1" />Front
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs justify-start rounded-lg border-border/40" onClick={() => canvasRef.current?.sendToBack()}>
                    <ChevronsDown className="w-3 h-3 mr-1" />Back
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs justify-start rounded-lg border-border/40" onClick={() => canvasRef.current?.bringForward()}>
                    <ChevronUp className="w-3 h-3 mr-1" />Forward
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs justify-start rounded-lg border-border/40" onClick={() => canvasRef.current?.sendBackward()}>
                    <ChevronDown className="w-3 h-3 mr-1" />Backward
                  </Button>
                </div>
                <div className="flex gap-1 mt-1.5">
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs rounded-lg border-border/40" onClick={toggleLock}>
                    {props.locked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                    {props.locked ? 'Unlock' : 'Lock'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs rounded-lg border-border/40" onClick={() => canvasRef.current?.duplicateSelected()}>
                    <Copy className="w-3 h-3 mr-1" />Copy
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 text-xs px-2 rounded-lg" onClick={() => canvasRef.current?.deleteSelected()}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

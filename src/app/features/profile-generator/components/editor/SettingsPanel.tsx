/**
 * Profile Editor – Settings Panel (right sidebar, 300px).
 *
 * Shows contextual properties for the selected layer, or
 * canvas settings when no layer is selected.
 */

import { memo, useCallback, useRef } from 'react';
import {
  Square,
  Image as ImageIcon,
  Layers,
  Type,
  Upload,
  FolderOpen,
} from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Button } from '../../../../components/ui/button';
import { Slider } from '../../../../components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { EditorLayer, CanvasConfig } from '../../utils/editor-types';
import { ImageAdjustmentsPanel } from './ImageAdjustmentsPanel';

// ─── Props ───────────────────────────────────────────────
interface SettingsPanelProps {
  selectedLayer: EditorLayer | null;
  canvasConfig: CanvasConfig;
  onUpdateLayer: (id: string, changes: Partial<EditorLayer>) => void;
  onUpdateCanvas: (changes: Partial<CanvasConfig>) => void;
  getImage: (src: string) => HTMLImageElement | null;
  onReplaceFromLibrary?: () => void;
}

// ─── Number input helper ─────────────────────────────────
function NumInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        className="h-7 text-xs"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────
export const SettingsPanel = memo(function SettingsPanel({
  selectedLayer,
  canvasConfig,
  onUpdateLayer,
  onUpdateCanvas,
  getImage,
  onReplaceFromLibrary,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback(
    (changes: Partial<EditorLayer>) => {
      if (selectedLayer) onUpdateLayer(selectedLayer.id, changes);
    },
    [selectedLayer, onUpdateLayer],
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedLayer) return;
      const url = URL.createObjectURL(file);
      update({ src: url });
      e.target.value = '';
    },
    [selectedLayer, update],
  );

  // ── No selection → Canvas Settings ──
  if (!selectedLayer) {
    return (
      <div className="w-full lg:w-[300px] h-full bg-card border-l border-border flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Canvas Settings
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <Section title="Dimensions">
            <div className="grid grid-cols-2 gap-2">
              <NumInput
                label="Width"
                value={canvasConfig.width}
                onChange={(v) => onUpdateCanvas({ width: Math.max(100, v) })}
                min={100}
                max={2000}
              />
              <NumInput
                label="Height"
                value={canvasConfig.height}
                onChange={(v) => onUpdateCanvas({ height: Math.max(100, v) })}
                min={100}
                max={2000}
              />
            </div>
          </Section>

          <Section title="Grid">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Grid</Label>
              <input
                type="checkbox"
                checked={canvasConfig.showGrid}
                onChange={(e) => onUpdateCanvas({ showGrid: e.target.checked })}
                className="accent-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Snap to Grid</Label>
              <input
                type="checkbox"
                checked={canvasConfig.snapToGrid}
                onChange={(e) => onUpdateCanvas({ snapToGrid: e.target.checked })}
                className="accent-primary"
              />
            </div>
            <NumInput
              label="Grid Size"
              value={canvasConfig.gridSize}
              onChange={(v) => onUpdateCanvas({ gridSize: Math.max(5, v) })}
              min={5}
              max={100}
            />
          </Section>

          <Section title="Safe Margin">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Guides</Label>
              <input
                type="checkbox"
                checked={canvasConfig.showSafeMargin}
                onChange={(e) =>
                  onUpdateCanvas({ showSafeMargin: e.target.checked })
                }
                className="accent-primary"
              />
            </div>
            <NumInput
              label="Margin (px)"
              value={canvasConfig.safeMargin}
              onChange={(v) => onUpdateCanvas({ safeMargin: Math.max(0, v) })}
              min={0}
              max={100}
            />
          </Section>
        </div>
      </div>
    );
  }

  // ── Layer selected → Layer Settings ──
  const layer = selectedLayer;
  const typeIcon = {
    background: <Square className="w-3.5 h-3.5 text-amber-500" />,
    image: <ImageIcon className="w-3.5 h-3.5 text-blue-500" />,
    foreground: <Layers className="w-3.5 h-3.5 text-purple-500" />,
    name: <Type className="w-3.5 h-3.5 text-emerald-500" />,
  }[layer.type];

  return (
    <div className="w-full lg:w-[300px] h-full bg-card border-l border-border flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        {typeIcon}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {layer.type} Settings
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Name */}
        <Section title="Layer">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Name</Label>
            <Input
              value={layer.name}
              className="h-7 text-xs"
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
        </Section>

        {/* Position & Size */}
        <Section title="Transform">
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="X" value={Math.round(layer.x)} onChange={(v) => update({ x: v })} />
            <NumInput label="Y" value={Math.round(layer.y)} onChange={(v) => update({ y: v })} />
            <NumInput
              label="Width"
              value={Math.round(layer.width)}
              onChange={(v) => update({ width: Math.max(10, v) })}
              min={10}
            />
            <NumInput
              label="Height"
              value={Math.round(layer.height)}
              onChange={(v) => update({ height: Math.max(10, v) })}
              min={10}
            />
          </div>
          <NumInput
            label="Rotation (deg)"
            value={Math.round(layer.rotation)}
            onChange={(v) => update({ rotation: v })}
            min={-360}
            max={360}
          />
        </Section>

        {/* Opacity */}
        <Section title="Appearance">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">
                Opacity
              </Label>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {Math.round(layer.opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[layer.opacity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => update({ opacity: v / 100 })}
            />
          </div>
        </Section>

        {/* Type-specific settings */}
        {(layer.type === 'background' || layer.type === 'foreground') && (
          <Section title="Fill">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={layer.fill || '#cccccc'}
                onChange={(e) => update({ fill: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0"
              />
              <Input
                value={layer.fill || '#cccccc'}
                className="h-7 text-xs flex-1"
                onChange={(e) => update({ fill: e.target.value })}
              />
            </div>
          </Section>
        )}

        {layer.type === 'image' && (
          <>
            <Section title="Image Source">
              {layer.src ? (
                <div className="space-y-2">
                  <div className="w-full h-24 rounded border border-border overflow-hidden bg-muted">
                    <img
                      src={layer.src}
                      alt="Layer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {onReplaceFromLibrary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={onReplaceFromLibrary}
                    >
                      <FolderOpen className="w-3 h-3 mr-1.5" />
                      Replace Image
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3 h-3 mr-1.5" />
                    Upload from Device
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {onReplaceFromLibrary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={onReplaceFromLibrary}
                    >
                      <FolderOpen className="w-3 h-3 mr-1.5" />
                      Choose from Library
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3 h-3 mr-1.5" />
                    Upload from Device
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </Section>

            {/* Image adjustments – only show when there's an image loaded */}
            {layer.src && (
              <ImageAdjustmentsPanel
                layer={layer}
                onUpdateLayer={onUpdateLayer}
                getImage={getImage}
              />
            )}
          </>
        )}

        {layer.type === 'name' && (
          <>
            <Section title="Text">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Content
                </Label>
                <Input
                  value={layer.text || ''}
                  className="h-7 text-xs"
                  onChange={(e) => update({ text: e.target.value })}
                />
              </div>
            </Section>

            <Section title="Typography">
              <NumInput
                label="Font Size"
                value={layer.fontSize ?? 24}
                onChange={(v) => update({ fontSize: Math.max(8, v) })}
                min={8}
                max={200}
              />
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Font Family
                </Label>
                <Input
                  value={layer.fontFamily || 'Inter, sans-serif'}
                  className="h-7 text-xs"
                  onChange={(e) => update({ fontFamily: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Font Weight
                </Label>
                <Select
                  value={layer.fontWeight || '600'}
                  onValueChange={(v) => update({ fontWeight: v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">Light</SelectItem>
                    <SelectItem value="400">Regular</SelectItem>
                    <SelectItem value="500">Medium</SelectItem>
                    <SelectItem value="600">Semibold</SelectItem>
                    <SelectItem value="700">Bold</SelectItem>
                    <SelectItem value="800">Extra Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Text Align
                </Label>
                <Select
                  value={layer.textAlign || 'center'}
                  onValueChange={(v) =>
                    update({ textAlign: v as CanvasTextAlign })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={layer.fontColor || '#1a1a1a'}
                  onChange={(e) => update({ fontColor: e.target.value })}
                  className="w-8 h-8 rounded border border-border cursor-pointer p-0"
                />
                <div className="flex-1 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Color
                  </Label>
                  <Input
                    value={layer.fontColor || '#1a1a1a'}
                    className="h-7 text-xs"
                    onChange={(e) => update({ fontColor: e.target.value })}
                  />
                </div>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
});
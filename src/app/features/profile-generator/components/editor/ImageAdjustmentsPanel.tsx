/**
 * Profile Editor – Image Adjustments sub-panel.
 *
 * Rendered inside SettingsPanel when an image layer is selected.
 * All controls update the layer's `adjustments` object.
 */

import { memo, useCallback, useState } from 'react';
import {
  Sun,
  Contrast,
  Droplets,
  CircleDot,
  FlipHorizontal2,
  FlipVertical2,
  Crop,
  Focus,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Slider } from '../../../../components/ui/slider';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { EditorLayer, ImageAdjustments, BlendMode } from '../../utils/editor-types';
import { DEFAULT_IMAGE_ADJUSTMENTS, BLEND_MODE_OPTIONS } from '../../utils/editor-types';
import { detectFaceAndCrop } from '../../utils/face-detection';

// ─── Props ───────────────────────────────────────────────
interface ImageAdjustmentsPanelProps {
  layer: EditorLayer;
  onUpdateLayer: (id: string, changes: Partial<EditorLayer>) => void;
  getImage: (src: string) => HTMLImageElement | null;
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

// ─── Slider row ──────────────────────────────────────────
function AdjSlider({
  icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          {icon}
          {label}
        </Label>
        <span className="text-[11px] text-muted-foreground tabular-nums min-w-[36px] text-right">
          {Math.round(value)}{unit ?? ''}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step ?? 1}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export const ImageAdjustmentsPanel = memo(function ImageAdjustmentsPanel({
  layer,
  onUpdateLayer,
  getImage,
}: ImageAdjustmentsPanelProps) {
  const [faceDetecting, setFaceDetecting] = useState(false);

  const adj: ImageAdjustments = layer.adjustments ?? DEFAULT_IMAGE_ADJUSTMENTS;

  /** Merge a partial update into the full adjustments object. */
  const updateAdj = useCallback(
    (partial: Partial<ImageAdjustments>) => {
      onUpdateLayer(layer.id, {
        adjustments: { ...adj, ...partial },
      });
    },
    [layer.id, adj, onUpdateLayer],
  );

  const resetAll = useCallback(() => {
    onUpdateLayer(layer.id, {
      adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
    });
  }, [layer.id, onUpdateLayer]);

  // ── Face detection ──
  const handleAutoFaceCenter = useCallback(async () => {
    if (!layer.src) return;
    const img = getImage(layer.src);
    if (!img) return;

    setFaceDetecting(true);
    try {
      const aspect = layer.width / layer.height;
      const crop = await detectFaceAndCrop(img, aspect);
      updateAdj({
        cropEnabled: true,
        cropX: crop.cropX,
        cropY: crop.cropY,
        cropW: crop.cropW,
        cropH: crop.cropH,
      });
    } catch (err) {
      console.error('Face detection failed:', err);
    } finally {
      setFaceDetecting(false);
    }
  }, [layer.src, layer.width, layer.height, getImage, updateAdj]);

  const isDefault = (key: keyof ImageAdjustments) =>
    adj[key] === DEFAULT_IMAGE_ADJUSTMENTS[key];

  return (
    <>
      {/* ─── Colour Adjustments ──────────────────────── */}
      <Section title="Adjustments">
        <AdjSlider
          icon={<Sun className="w-3 h-3" />}
          label="Brightness"
          value={adj.brightness}
          min={0}
          max={200}
          unit="%"
          onChange={(v) => updateAdj({ brightness: v })}
        />
        <AdjSlider
          icon={<Contrast className="w-3 h-3" />}
          label="Contrast"
          value={adj.contrast}
          min={0}
          max={200}
          unit="%"
          onChange={(v) => updateAdj({ contrast: v })}
        />
        <AdjSlider
          icon={<Droplets className="w-3 h-3" />}
          label="Saturation"
          value={adj.saturation}
          min={0}
          max={200}
          unit="%"
          onChange={(v) => updateAdj({ saturation: v })}
        />
        <AdjSlider
          icon={<CircleDot className="w-3 h-3" />}
          label="Blur"
          value={adj.blur}
          min={0}
          max={20}
          step={0.5}
          unit="px"
          onChange={(v) => updateAdj({ blur: v })}
        />
      </Section>

      {/* ─── Shadow ──────────────────────────────────── */}
      <Section title="Shadow">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Enable Shadow</Label>
          <input
            type="checkbox"
            checked={adj.shadowEnabled}
            onChange={(e) => updateAdj({ shadowEnabled: e.target.checked })}
            className="accent-primary"
          />
        </div>

        {adj.shadowEnabled && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={adj.shadowColor.startsWith('rgba') ? '#000000' : adj.shadowColor}
                onChange={(e) => updateAdj({ shadowColor: e.target.value })}
                className="w-7 h-7 rounded border border-border cursor-pointer p-0 shrink-0"
              />
              <div className="flex-1 space-y-0.5">
                <Label className="text-[11px] text-muted-foreground">Color</Label>
                <Input
                  value={adj.shadowColor}
                  className="h-7 text-xs"
                  onChange={(e) => updateAdj({ shadowColor: e.target.value })}
                />
              </div>
            </div>
            <AdjSlider
              icon={null}
              label="Blur"
              value={adj.shadowBlur}
              min={0}
              max={50}
              unit="px"
              onChange={(v) => updateAdj({ shadowBlur: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Offset X</Label>
                <Input
                  type="number"
                  value={adj.shadowOffsetX}
                  className="h-7 text-xs"
                  onChange={(e) => updateAdj({ shadowOffsetX: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Offset Y</Label>
                <Input
                  type="number"
                  value={adj.shadowOffsetY}
                  className="h-7 text-xs"
                  onChange={(e) => updateAdj({ shadowOffsetY: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ─── Blend Mode ──────────────────────────────── */}
      <Section title="Blend Mode">
        <Select
          value={adj.blendMode}
          onValueChange={(v) => updateAdj({ blendMode: v as BlendMode })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLEND_MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* ─── Flip ────────────────────────────────────── */}
      <Section title="Flip">
        <div className="flex gap-2">
          <Button
            variant={adj.flipH ? 'secondary' : 'outline'}
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => updateAdj({ flipH: !adj.flipH })}
          >
            <FlipHorizontal2 className="w-3.5 h-3.5 mr-1.5" />
            Horizontal
          </Button>
          <Button
            variant={adj.flipV ? 'secondary' : 'outline'}
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => updateAdj({ flipV: !adj.flipV })}
          >
            <FlipVertical2 className="w-3.5 h-3.5 mr-1.5" />
            Vertical
          </Button>
        </div>
      </Section>

      {/* ─── Crop ────────────────────────────────────── */}
      <Section title="Crop">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <Crop className="w-3 h-3" />
            Enable Crop
          </Label>
          <input
            type="checkbox"
            checked={adj.cropEnabled}
            onChange={(e) => updateAdj({ cropEnabled: e.target.checked })}
            className="accent-primary"
          />
        </div>

        {adj.cropEnabled && (
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">X (%)</Label>
                <Input
                  type="number"
                  value={Math.round(adj.cropX * 100)}
                  min={0}
                  max={99}
                  className="h-7 text-xs"
                  onChange={(e) =>
                    updateAdj({ cropX: Math.min(0.99, Math.max(0, Number(e.target.value) / 100)) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Y (%)</Label>
                <Input
                  type="number"
                  value={Math.round(adj.cropY * 100)}
                  min={0}
                  max={99}
                  className="h-7 text-xs"
                  onChange={(e) =>
                    updateAdj({ cropY: Math.min(0.99, Math.max(0, Number(e.target.value) / 100)) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Width (%)</Label>
                <Input
                  type="number"
                  value={Math.round(adj.cropW * 100)}
                  min={1}
                  max={100}
                  className="h-7 text-xs"
                  onChange={(e) =>
                    updateAdj({ cropW: Math.min(1, Math.max(0.01, Number(e.target.value) / 100)) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Height (%)</Label>
                <Input
                  type="number"
                  value={Math.round(adj.cropH * 100)}
                  min={1}
                  max={100}
                  className="h-7 text-xs"
                  onChange={(e) =>
                    updateAdj({ cropH: Math.min(1, Math.max(0.01, Number(e.target.value) / 100)) })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Auto-face-centre button */}
        {layer.src && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 mt-1"
            onClick={handleAutoFaceCenter}
            disabled={faceDetecting}
          >
            {faceDetecting ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Focus className="w-3 h-3 mr-1.5" />
            )}
            Auto Face Center
          </Button>
        )}
      </Section>

      {/* ─── Reset ───────────────────────────────────── */}
      <div className="pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
          onClick={resetAll}
        >
          <RotateCcw className="w-3 h-3 mr-1.5" />
          Reset All Adjustments
        </Button>
      </div>
    </>
  );
});

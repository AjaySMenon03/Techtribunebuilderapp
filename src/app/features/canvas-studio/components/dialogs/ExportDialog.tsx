import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Slider } from '../../../../components/ui/slider';
import { Switch } from '../../../../components/ui/switch';
import { Download } from 'lucide-react';
import type { CanvasCoreHandle } from '../canvas/CanvasCore';
import type { ExportOptions } from '../../types/canvasTypes';
import { toast } from 'sonner';
import { logger } from '../../utils/logger';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

export default function ExportDialog({ open, onOpenChange, canvasRef }: ExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'png',
    includeBackground: true,
    quality: 1,
  });

  const formats = [
    { value: 'png', label: 'PNG' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'svg', label: 'SVG' },
    { value: 'json', label: 'JSON' },
  ] as const;

  const handleExport = () => {
    const ref = canvasRef.current;
    if (!ref) return;

    try {
      let data: string;
      let filename: string;
      let mimeType: string;

      switch (options.format) {
        case 'png':
        case 'jpeg': {
          data = ref.toDataURL(options.format, options.quality);
          filename = `canvas-export.${options.format}`;
          // Download
          const link = document.createElement('a');
          link.download = filename;
          link.href = data;
          link.click();
          toast.success(`Exported as ${options.format.toUpperCase()}`);
          logger.info('Export completed', { format: options.format });
          onOpenChange(false);
          return;
        }
        case 'svg': {
          data = ref.toSVG();
          filename = 'canvas-export.svg';
          mimeType = 'image/svg+xml';
          break;
        }
        case 'json': {
          data = ref.toJSON();
          filename = 'canvas-export.json';
          mimeType = 'application/json';
          break;
        }
        default:
          return;
      }

      const blob = new Blob([data], { type: mimeType! });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename!;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${options.format.toUpperCase()}`);
      logger.info('Export completed', { format: options.format });
      onOpenChange(false);
    } catch (err) {
      logger.error('Export failed', err);
      toast.error('Export failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border-white/20 dark:border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Canvas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Format */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Format</Label>
            <div className="flex gap-1.5">
              {formats.map((f) => (
                <Button
                  key={f.value}
                  variant={options.format === f.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => setOptions((o) => ({ ...o, format: f.value }))}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Quality (for raster formats) */}
          {(options.format === 'png' || options.format === 'jpeg') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Quality</Label>
                <span className="text-xs text-muted-foreground">{Math.round(options.quality * 100)}%</span>
              </div>
              <Slider
                value={[options.quality]}
                onValueChange={([v]) => setOptions((o) => ({ ...o, quality: v }))}
                min={0.1}
                max={1}
                step={0.05}
              />
            </div>
          )}

          {/* Include background */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Include Background</Label>
            <Switch
              checked={options.includeBackground}
              onCheckedChange={(v) => setOptions((o) => ({ ...o, includeBackground: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
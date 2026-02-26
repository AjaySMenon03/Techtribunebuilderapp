/**
 * Export Dialog – lets users choose format, scale, and transparency,
 * shows a live preview, and triggers a download.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Switch } from '../../../../components/ui/switch';
import { Badge } from '../../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Download, Loader2, Image as ImageIcon, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import type { EditorLayer, CanvasConfig } from '../../utils/editor-types';
import {
  downloadExport,
  exportToDataURL,
  type ExportFormat,
  type ExportScale,
  type ExportOptions,
} from '../../utils/export-utils';

type ImageGetter = (src: string) => HTMLImageElement | null;

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  profileName: string;
  canvasConfig: CanvasConfig;
  layers: EditorLayer[];
  getImage: ImageGetter;
}

export function ExportDialog({
  open,
  onClose,
  profileName,
  canvasConfig,
  layers,
  getImage,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<ExportScale>(1);
  const [transparent, setTransparent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  // Transparent toggle is only valid for PNG
  const effectiveTransparent = format === 'png' ? transparent : false;

  // Generate a preview data-URL (small, always 1× for perf)
  useEffect(() => {
    if (!open) return;
    try {
      const url = exportToDataURL(canvasConfig, layers, getImage, {
        format,
        scale: 1, // preview is always 1× for speed
        transparent: effectiveTransparent,
        quality: 1.0,
      });
      // Revoke previous object URL if it was a blob URL
      if (prevUrlRef.current && prevUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
      prevUrlRef.current = url;
      setPreviewUrl(url);
    } catch (e) {
      console.error('Preview generation failed:', e);
      setPreviewUrl(null);
    }
  }, [open, format, effectiveTransparent, canvasConfig, layers, getImage]);

  // Output dimensions
  const outputWidth = canvasConfig.width * scale;
  const outputHeight = canvasConfig.height * scale;

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const options: ExportOptions = {
        format,
        scale,
        transparent: effectiveTransparent,
        quality: 1.0,
      };
      await downloadExport(canvasConfig, layers, getImage, profileName, options);
      toast.success(`Exported ${profileName} as ${format.toUpperCase()} at ${scale}x`);
      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error(err.message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  }, [format, scale, effectiveTransparent, canvasConfig, layers, getImage, profileName, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Profile
          </DialogTitle>
          <DialogDescription>
            Download your profile as a high-quality image file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Preview */}
          <div className="rounded-lg border border-border overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)_0_0/16px_16px]">
            <div className="flex items-center justify-center p-4 min-h-[180px] max-h-[280px]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Export preview"
                  className="max-w-full max-h-[260px] object-contain shadow-sm"
                  style={{ imageRendering: 'auto' }}
                />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <FileImage className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs">Generating preview...</p>
                </div>
              )}
            </div>
          </div>

          {/* Controls grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Format */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5" />
                      PNG
                    </span>
                  </SelectItem>
                  <SelectItem value="jpg">
                    <span className="flex items-center gap-2">
                      <FileImage className="w-3.5 h-3.5" />
                      JPG
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scale */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Scale</Label>
              <Select
                value={String(scale)}
                onValueChange={(v) => setScale(Number(v) as ExportScale)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x (Standard)</SelectItem>
                  <SelectItem value="2">2x (Retina)</SelectItem>
                  <SelectItem value="3">3x (High-DPI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transparent background */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm font-medium">Transparent Background</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {format === 'jpg'
                  ? 'Not available for JPG format'
                  : 'Remove white background (PNG only)'}
              </p>
            </div>
            <Switch
              checked={effectiveTransparent}
              onCheckedChange={setTransparent}
              disabled={format === 'jpg'}
            />
          </div>

          {/* Output info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">Output:</span>
              {outputWidth} &times; {outputHeight}px
            </div>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {format.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {scale}x
            </Badge>
            {effectiveTransparent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Transparent
              </Badge>
            )}
            <span className="ml-auto font-medium">Quality: 100%</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            Download {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

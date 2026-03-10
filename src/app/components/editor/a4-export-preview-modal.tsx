/**
 * A4 Export Preview Modal.
 *
 * Shows a pixel-perfect preview of the newsletter rendered at A4 dimensions
 * using the same React components as the live editor canvas.  The user can
 * switch between PNG / JPG / PDF, toggle dark mode, zoom the preview, and
 * download — all with a single-click flow.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Slider } from '../ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Download,
  Image,
  FileImage,
  FileDown,
  Loader2,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Maximize,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Section } from '../../lib/editor-types';
import type { ThemeConfig } from '../../lib/types';
import {
  renderA4ToDataUrl,
  captureA4Image,
  captureA4Pdf,
  A4_WIDTH,
  A4_HEIGHT,
} from '../../lib/export/a4-dom-renderer';

// ── Types ─────────────────────────────────────────────────��─────────

interface A4ExportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
}

type TabFormat = 'png' | 'jpg' | 'pdf';

const FORMAT_META: Record<TabFormat, { label: string; desc: string; icon: React.ReactNode }> = {
  png: { label: 'PNG', desc: 'High-res lossless image', icon: <Image className="w-3.5 h-3.5" /> },
  jpg: { label: 'JPG', desc: 'Compressed image', icon: <FileImage className="w-3.5 h-3.5" /> },
  pdf: { label: 'PDF', desc: 'Print-ready document', icon: <FileDown className="w-3.5 h-3.5" /> },
};

// ── Component ───────────────────────────────────────────────────────

export function A4ExportPreviewModal({
  open,
  onOpenChange,
  title,
  sections,
  theme,
  darkMode: initialDark,
}: A4ExportPreviewModalProps) {
  const [format, setFormat] = useState<TabFormat>('png');
  const [darkMode, setDarkMode] = useState(initialDark);
  const [zoom, setZoom] = useState(0.55);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Sync initial dark mode when modal opens
  useEffect(() => {
    if (open) setDarkMode(initialDark);
  }, [open, initialDark]);

  // ── Render preview whenever modal opens or dark mode toggles ──────

  useEffect(() => {
    if (!open) {
      // Cleanup on close
      cleanupRef.current?.();
      cleanupRef.current = null;
      setPreviewUrl(null);
      setDownloaded(false);
      return;
    }

    let cancelled = false;

    async function render() {
      setRendering(true);
      setProgress('Rendering preview…');
      try {
        const result = await renderA4ToDataUrl(
          { title, sections, theme, darkMode },
          'png',
          (s) => { if (!cancelled) setProgress(s); },
        );
        if (cancelled) {
          result.cleanup();
          return;
        }
        // Keep cleanup reference so we can unmount the React tree
        cleanupRef.current?.();
        cleanupRef.current = result.cleanup;
        setPreviewUrl(result.dataUrl);
      } catch (err) {
        console.error('A4 preview render error:', err);
        if (!cancelled) toast.error('Failed to render A4 preview');
      } finally {
        if (!cancelled) {
          setRendering(false);
          setProgress('');
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [open, darkMode, sections, theme, title]);

  // ── Zoom helpers ──────────────────────────────────────────────────

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.1, 1.5)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.1, 0.2)), []);
  const zoomFit = useCallback(() => setZoom(0.55), []);

  // ── Download ──────────────────────────────────────────────────────

  const slug = (title || 'newsletter').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'newsletter';

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setProgress('Exporting…');
    try {
      const opts = { title, sections, theme, darkMode };

      if (format === 'pdf') {
        const blob = await captureA4Pdf(opts, (s) => setProgress(s));
        saveAs(blob, `${slug}-a4.pdf`);
      } else {
        const blob = await captureA4Image(opts, format, (s) => setProgress(s));
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        saveAs(new Blob([blob], { type: mime }), `${slug}-a4.${format}`);
      }

      setDownloaded(true);
      toast.success(`A4 ${format.toUpperCase()} exported!`);
      setTimeout(() => setDownloaded(false), 2500);
    } catch (err: any) {
      console.error('A4 export error:', err);
      toast.error(err.message || 'Export failed');
    } finally {
      setDownloading(false);
      setProgress('');
    }
  }, [format, title, sections, theme, darkMode, slug]);

  // ── Render ────────────────────────────────────────────────────────

  const previewW = A4_WIDTH * zoom;
  const previewH = previewUrl ? undefined : A4_HEIGHT * zoom;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[96vw] !w-[1000px] !max-h-[94vh] flex flex-col !p-0 !gap-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <DialogHeader className="!gap-0.5">
            <DialogTitle className="!text-base">A4 Export Preview</DialogTitle>
            <DialogDescription className="!text-xs">
              Pixel-perfect preview — what you see is exactly what you'll download
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            {/* Dark / Light toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setDarkMode(!darkMode)}
                    disabled={rendering}
                  >
                    {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{darkMode ? 'Switch to light' : 'Switch to dark'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Format tabs */}
            <Tabs value={format} onValueChange={(v) => setFormat(v as TabFormat)}>
              <TabsList className="h-8">
                {(Object.keys(FORMAT_META) as TabFormat[]).map((f) => (
                  <TabsTrigger key={f} value={f} className="h-7 px-2.5 gap-1 text-xs">
                    {FORMAT_META[f].icon}
                    <span className="hidden sm:inline">{FORMAT_META[f].label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* ── Preview area ── */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 bg-muted/40 overflow-auto flex justify-center items-start p-6"
        >
          {rendering ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{progress || 'Rendering…'}</p>
            </div>
          ) : previewUrl ? (
            <div
              className="shadow-2xl rounded-lg overflow-hidden transition-all duration-200 shrink-0"
              style={{
                width: previewW,
                backgroundColor: darkMode ? '#111827' : '#f0f0f0',
              }}
            >
              <img
                src={previewUrl}
                alt="A4 Preview"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
                draggable={false}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
              <Image className="w-8 h-8 opacity-40" />
              <p className="text-sm">No preview available</p>
            </div>
          )}
        </div>

        {/* ── Action bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-card shrink-0">
          {/* Left: zoom controls */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={zoomOut}>
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={0.2}
              max={1.5}
              step={0.05}
              className="w-28"
            />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={zoomIn}>
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={zoomFit}>
                    <Maximize className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit to view</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="text-[11px] text-muted-foreground ml-1 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Centre: info badges */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {darkMode ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              {darkMode ? 'Dark' : 'Light'}
            </span>
            <span>•</span>
            <span>A4 (210 × 297 mm)</span>
            <span>•</span>
            <span>{FORMAT_META[format].desc}</span>
          </div>

          {/* Right: download */}
          <div className="flex items-center gap-2">
            {(downloading || rendering) && progress && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mr-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {progress}
              </span>
            )}

            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleDownload}
              disabled={downloading || rendering || !previewUrl}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : downloaded ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="text-xs">
                {downloading ? 'Exporting…' : downloaded ? 'Done!' : `Download ${FORMAT_META[format].label}`}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
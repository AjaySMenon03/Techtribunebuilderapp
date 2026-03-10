/**
 * Export Dropdown UI component.
 * Provides all export format options with progress feedback and dark/light mode toggle.
 * Email HTML opens an in-app preview modal.
 * A4 formats (PNG / JPG / PDF) open the pixel-perfect A4 Export Preview modal.
 */
import { useState, useCallback } from 'react';
import { useEditorStore } from '../../lib/editor-store';
import type { ThemeConfig } from '../../lib/types';
import type { ExportFormat } from '../../lib/export/export-engine';
import { exportNewsletter } from '../../lib/export/export-engine';
import { EmailPreviewModal } from './email-preview-modal';
import { A4ExportPreviewModal } from './a4-export-preview-modal';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Download,
  FileText,
  Mail,
  Image,
  FileImage,
  FileDown,
  FolderArchive,
  Clipboard,
  Loader2,
  Sun,
  Moon,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportDropdownProps {
  title: string;
  theme: ThemeConfig;
}

interface ExportItem {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const WEB_EXPORTS: ExportItem[] = [
  {
    format: 'web-html',
    label: 'Web HTML',
    description: 'Editable semantic HTML + CSS',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    format: 'email-html',
    label: 'Email HTML',
    description: 'Preview & export for Gmail/Outlook',
    icon: <Mail className="w-4 h-4" />,
  },
];

const IMAGE_EXPORTS: ExportItem[] = [
  {
    format: 'a4-png',
    label: 'A4 PNG',
    description: 'High-res transparent image',
    icon: <Image className="w-4 h-4" />,
  },
  {
    format: 'a4-jpg',
    label: 'A4 JPG',
    description: 'Compressed image',
    icon: <FileImage className="w-4 h-4" />,
  },
  {
    format: 'a4-pdf',
    label: 'A4 PDF',
    description: 'Print-ready document',
    icon: <FileDown className="w-4 h-4" />,
  },
];

const BUNDLE_EXPORTS: ExportItem[] = [
  {
    format: 'zip',
    label: 'ZIP Bundle',
    description: 'HTML + CSS + assets',
    icon: <FolderArchive className="w-4 h-4" />,
  },
  {
    format: 'clipboard',
    label: 'Copy HTML',
    description: 'Copy to clipboard',
    icon: <Clipboard className="w-4 h-4" />,
  },
];

export function ExportDropdown({ title, theme }: ExportDropdownProps) {
  const sections = useEditorStore((s) => s.sections);

  const [exporting, setExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [progress, setProgress] = useState('');
  const [exportDarkMode, setExportDarkMode] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [a4PreviewOpen, setA4PreviewOpen] = useState(false);

  // ── Handle non-A4 / non-email exports directly ───────────────────

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (exporting) return;

    const visibleSections = sections.filter((s) => s.visible);
    if (visibleSections.length === 0) {
      toast.error('No visible sections to export');
      return;
    }

    // Email HTML → open its own preview modal
    if (format === 'email-html') {
      setEmailPreviewOpen(true);
      return;
    }

    // A4 formats → open A4 Export Preview modal
    if (format === 'a4-png' || format === 'a4-jpg' || format === 'a4-pdf') {
      setA4PreviewOpen(true);
      return;
    }

    // Everything else → direct export
    setExporting(true);
    setExportingFormat(format);
    setProgress('Starting export...');

    try {
      const success = await exportNewsletter(format, {
        title,
        sections,
        theme,
        darkMode: exportDarkMode,
      }, (step) => setProgress(step));

      if (success) {
        if (format === 'clipboard') {
          toast.success('HTML copied to clipboard!');
        } else {
          toast.success('Export complete!');
        }
      } else {
        toast.error('Export failed');
      }
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
      setExportingFormat(null);
      setProgress('');
    }
  }, [exporting, sections, title, theme, exportDarkMode]);

  // ── Render helpers ────────────────────────────────────────────────

  const renderExportItem = (item: ExportItem) => {
    const isActive = exportingFormat === item.format;
    return (
      <DropdownMenuItem
        key={item.format}
        onSelect={(e) => {
          e.preventDefault();
          handleExport(item.format);
        }}
        disabled={exporting}
        className="flex items-start gap-3 py-2.5 px-3 cursor-pointer"
      >
        <span className="mt-0.5 text-muted-foreground">
          {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : item.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-none mb-0.5">{item.label}</p>
          <p className="text-xs text-muted-foreground leading-tight">{item.description}</p>
        </div>
      </DropdownMenuItem>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="text-xs hidden sm:inline">
              {exporting ? 'Exporting...' : 'Export'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Dark mode toggle for export */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Export theme</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExportDarkMode(!exportDarkMode);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border border-border hover:bg-accent transition-colors"
            >
              {exportDarkMode ? (
                <>
                  <Moon className="w-3 h-3" />
                  Dark
                </>
              ) : (
                <>
                  <Sun className="w-3 h-3" />
                  Light
                </>
              )}
            </button>
          </div>

          <DropdownMenuSeparator />

          {/* Web exports */}
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            Web & Email
          </DropdownMenuLabel>
          {WEB_EXPORTS.map(renderExportItem)}

          <DropdownMenuSeparator />

          {/* A4 Print — now opens preview modal */}
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            A4 Print
          </DropdownMenuLabel>

          {/* "Preview Export" button — opens the full A4 modal */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              const visibleSections = sections.filter((s) => s.visible);
              if (visibleSections.length === 0) {
                toast.error('No visible sections to export');
                return;
              }
              setA4PreviewOpen(true);
            }}
            className="flex items-start gap-3 py-2.5 px-3 cursor-pointer bg-primary/[0.04] hover:bg-primary/[0.08] border border-primary/10 rounded-md mx-1 mb-1"
          >
            <span className="mt-0.5 text-primary">
              <Eye className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none mb-0.5 text-primary">Preview Export</p>
              <p className="text-xs text-muted-foreground leading-tight">
                Pixel-perfect A4 preview before download
              </p>
            </div>
          </DropdownMenuItem>

          {IMAGE_EXPORTS.map(renderExportItem)}

          <DropdownMenuSeparator />

          {/* Bundle & Clipboard */}
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            Bundle & Clipboard
          </DropdownMenuLabel>
          {BUNDLE_EXPORTS.map(renderExportItem)}

          {/* Progress indicator */}
          {exporting && progress && (
            <>
              <DropdownMenuSeparator />
              <div className="flex items-center gap-2 px-3 py-2">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">{progress}</span>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Email Preview Modal */}
      <EmailPreviewModal
        open={emailPreviewOpen}
        onOpenChange={setEmailPreviewOpen}
        options={{
          title,
          sections,
          theme,
          darkMode: exportDarkMode,
        }}
      />

      {/* A4 Export Preview Modal */}
      <A4ExportPreviewModal
        open={a4PreviewOpen}
        onOpenChange={setA4PreviewOpen}
        title={title}
        sections={sections}
        theme={theme}
        darkMode={exportDarkMode}
      />
    </>
  );
}

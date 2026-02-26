import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useNewsletterStore, useWorkspaceStore } from '../store';
import type { Newsletter } from '../lib/types';
import { DEFAULT_THEME, MONTHS } from '../lib/types';
import { exportWebHtml, exportEmailHtml } from '../lib/export/export-engine';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Eye,
  Download,
  Copy,
  Loader2,
  Archive as ArchiveIcon,
  Calendar,
  FileText,
  Mail,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

export function ArchivePage() {
  const navigate = useNavigate();
  const { newsletters, loading, fetchAll, duplicate } = useNewsletterStore();
  const { workspace } = useWorkspaceStore();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Only show published (non-draft) newsletters, plus optionally all
  const publishedNewsletters = newsletters.filter((n) => !n.is_draft);
  const allNewsletters = newsletters;

  // Group by year
  const grouped = allNewsletters.reduce(
    (acc, nl) => {
      const year = nl.year || 'Unknown';
      if (!acc[year]) acc[year] = [];
      acc[year].push(nl);
      return acc;
    },
    {} as Record<string | number, typeof allNewsletters>,
  );

  const sortedYears = Object.keys(grouped)
    .sort((a, b) => Number(b) - Number(a));

  const handleDuplicate = async (id: string) => {
    try {
      await duplicate(id);
      toast.success('Issue duplicated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate');
    }
  };

  const handleDownload = useCallback(async (nl: Newsletter, format: 'web' | 'email') => {
    const sections = nl.content_json?.sections || [];
    if (sections.length === 0) {
      toast.error('This newsletter has no sections to export');
      return;
    }

    setDownloadingId(nl.id);
    try {
      const theme = nl.theme_config || workspace.theme || DEFAULT_THEME;
      const options = {
        title: nl.title,
        sections,
        theme,
        darkMode: false,
      };

      if (format === 'web') {
        await exportWebHtml(options);
      } else {
        await exportEmailHtml(options);
      }
      toast.success('Download started!');
    } catch (err: any) {
      console.error('Archive download error:', err);
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  }, [workspace.theme]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold">Archive</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse all newsletter issues ({allNewsletters.length} total)
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : allNewsletters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ArchiveIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No issues yet</h3>
          <p className="text-muted-foreground mb-4">
            Create newsletters from the Dashboard to see them here
          </p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedYears.map((year) => (
            <div key={year}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                {year}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {grouped[year]
                  .sort((a, b) => b.month - a.month)
                  .map((nl) => {
                    const monthName = MONTHS[(nl.month || 1) - 1];
                    const isDownloading = downloadingId === nl.id;
                    return (
                      <div
                        key={nl.id}
                        className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Colored header bar */}
                        <div
                          className="h-2"
                          style={{
                            backgroundColor:
                              nl.theme_config?.accent_color || '#000',
                          }}
                        />

                        <div className="p-4">
                          {/* Icon + title */}
                          <div className="flex items-start gap-3 mb-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor:
                                  nl.theme_config?.accent_color || '#000',
                              }}
                            >
                              <FileText className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold line-clamp-2">
                                {nl.title}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {monthName} {nl.year}
                              </p>
                            </div>
                          </div>

                          {/* Status + version */}
                          <div className="flex items-center gap-2 mb-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                nl.is_draft
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {nl.is_draft ? 'Draft' : 'Published'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              v{nl.version}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => navigate(`/editor/${nl.id}`)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isDownloading}
                                >
                                  {isDownloading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownload(nl, 'web')}>
                                  <Globe className="w-3.5 h-3.5 mr-2" />
                                  Web HTML
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(nl, 'email')}>
                                  <Mail className="w-3.5 h-3.5 mr-2" />
                                  Email HTML
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicate(nl.id)}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
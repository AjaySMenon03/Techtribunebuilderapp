/**
 * Template Picker – shown when creating a new profile.
 *
 * Users must select a template (or "Blank") before entering the editor.
 * Templates are fetched from the backend. Admin can also manage templates
 * from here.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Search,
  Plus,
  Copy,
  Trash2,
  Loader2,
  LayoutTemplate,
  FileStack,
  Sparkles,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { toast } from 'sonner';
import type { ProfileTemplate } from '../utils/pg-types';
import { TEMPLATE_CATEGORIES } from '../utils/pg-types';
import * as pgApi from '../utils/pg-api';
import { DEFAULT_CANVAS_CONFIG } from '../utils/editor-types';

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: ProfileTemplate | null) => void; // null = blank
  isAdmin?: boolean;
}

export function TemplatePicker({ open, onClose, onSelect, isAdmin }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<ProfileTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch templates
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pgApi.fetchTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Filter
  const filtered = useMemo(() => {
    let result = templates;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    if (catFilter !== 'all') {
      result = result.filter((t) => t.category === catFilter);
    }
    return result;
  }, [templates, search, catFilter]);

  const handleDuplicate = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setActionLoading(id);
      try {
        const dup = await pgApi.duplicateTemplate(id);
        setTemplates((prev) => [dup, ...prev]);
        toast.success('Template duplicated');
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setActionLoading(id);
      try {
        await pgApi.deleteTemplate(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast.success('Template deleted');
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const usedCategories = useMemo(
    () => [...new Set(templates.map((t) => t.category))].sort(),
    [templates],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" aria-hidden="true" />
            Choose a Template
          </DialogTitle>
          <DialogDescription>
            Select a template to start your profile, or begin with a blank canvas.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              aria-label="Search templates"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs" aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {usedCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto min-h-0 mt-2 -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
              {/* Blank template card */}
              <button
                className="group border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 focus-visible:border-primary/50 focus-visible:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors min-h-[140px]"
                onClick={() => onSelect(null)}
                aria-label="Start with a blank canvas"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-medium">Blank Canvas</span>
                <span className="text-[10px] text-muted-foreground">Start from scratch</span>
              </button>

              {filtered.map((tpl) => (
                <div
                  key={tpl.id}
                  role="button"
                  tabIndex={0}
                  className="group border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all text-left relative cursor-pointer"
                  onClick={() => onSelect(tpl)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(tpl);
                    }
                  }}
                >
                  {/* Thumbnail */}
                  <div className="h-24 bg-muted/50 flex items-center justify-center overflow-hidden">
                    {tpl.thumbnailUrl ? (
                      <img
                        src={tpl.thumbnailUrl}
                        alt={tpl.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileStack className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{tpl.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {tpl.category}
                      </Badge>
                      {tpl.isSystem && (
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      )}
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {tpl.layers.length} layers
                      </span>
                    </div>
                    {tpl.description && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                    )}
                  </div>

                  {/* Admin actions overlay */}
                  {isAdmin && (
                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 rounded bg-card/80 border border-border text-muted-foreground hover:text-foreground"
                        title="Duplicate"
                        onClick={(e) => handleDuplicate(tpl.id, e)}
                        disabled={actionLoading === tpl.id}
                      >
                        {actionLoading === tpl.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        className="p-1 rounded bg-card/80 border border-border text-muted-foreground hover:text-destructive"
                        title="Delete"
                        onClick={(e) => handleDelete(tpl.id, e)}
                        disabled={actionLoading === tpl.id}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filtered.length === 0 && !loading && (
                <div className="col-span-full flex flex-col items-center py-10 text-muted-foreground">
                  <LayoutTemplate className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs">No templates found</p>
                  <p className="text-[10px] mt-0.5">
                    {templates.length === 0
                      ? 'Create your first template from the editor'
                      : 'Try adjusting your search'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
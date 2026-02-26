/**
 * Template Settings – manage profile generator template names (CRUD).
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  LayoutTemplate,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProfileTemplate } from '../../features/profile-generator/utils/pg-types';
import { TEMPLATE_CATEGORIES } from '../../features/profile-generator/utils/pg-types';
import * as pgApi from '../../features/profile-generator/utils/pg-api';

interface TemplateFormState {
  name: string;
  description: string;
  category: string;
}

const EMPTY_FORM: TemplateFormState = {
  name: '',
  description: '',
  category: 'Custom',
};

export function TemplateSettings() {
  const [templates, setTemplates] = useState<ProfileTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] =
    useState<ProfileTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pgApi.fetchTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtered templates
  const filtered = templates.filter((t) => {
    const matchSearch =
      !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || t.category === catFilter;
    return matchSearch && matchCat;
  });

  // ─── Handlers ──────────────────────────────────────────
  const openAdd = () => {
    setDialogMode('add');
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (t: ProfileTemplate) => {
    setDialogMode('edit');
    setForm({
      name: t.name,
      description: t.description,
      category: t.category,
    });
    setEditingId(t.id);
    setDialogOpen(true);
  };

  const openDelete = (t: ProfileTemplate) => {
    setDeletingTemplate(t);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (dialogMode === 'add') {
        const created = await pgApi.createTemplate({
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
          canvasConfig: {
            width: 800,
            height: 800,
            zoom: 1,
            showGrid: false,
            snapToGrid: true,
            gridSize: 20,
            showSafeMargin: false,
            safeMargin: 40,
          },
          layers: [],
          isSystem: true,
        });
        setTemplates((prev) => [created, ...prev]);
        toast.success(`Template "${form.name}" created`);
      } else if (editingId) {
        const updated = await pgApi.updateTemplate(editingId, {
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
        });
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingId ? updated : t)),
        );
        toast.success(`Template "${form.name}" updated`);
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    setDeleting(true);
    try {
      await pgApi.deleteTemplate(deletingTemplate.id);
      setTemplates((prev) =>
        prev.filter((t) => t.id !== deletingTemplate.id),
      );
      toast.success(`Template "${deletingTemplate.name}" deleted`);
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Profile Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create, rename and delete templates for the profile generator.
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template List */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground text-center px-4">
            <LayoutTemplate className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">
              {templates.length === 0
                ? 'No templates yet'
                : 'No matching templates'}
            </p>
            <p className="text-xs mt-1">
              {templates.length === 0
                ? 'Click "Add Template" to create your first one.'
                : 'Try a different search or filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg bg-muted/50 border border-border flex items-center justify-center shrink-0 overflow-hidden">
                  {t.thumbnailUrl ? (
                    <img
                      src={t.thumbnailUrl}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {t.category}
                    </Badge>
                    {t.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {t.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <span>{t.layers.length} layers</span>
                  {t.isSystem && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      System
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openEdit(t)}
                    title="Edit template"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => openDelete(t)}
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Add / Edit Dialog ─────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? 'New Template' : 'Edit Template'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'add'
                ? 'Create a new profile generator template.'
                : 'Update template details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Team Spotlight"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              {dialogMode === 'add' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Template
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>"{deletingTemplate?.name}"</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingTemplate(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

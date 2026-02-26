/**
 * Asset Library Settings – full asset management with upload, edit, delete.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Search,
  Upload,
  Loader2,
  Image as ImageIcon,
  Layers,
  Trash2,
  Tag,
  X,
  Plus,
  Pencil,
  AlertTriangle,
  Grid3X3,
  List,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  LibraryAsset,
  AssetType,
} from '../../features/profile-generator/utils/pg-types';
import { ASSET_CATEGORIES } from '../../features/profile-generator/utils/pg-types';
import * as pgApi from '../../features/profile-generator/utils/pg-api';

type ViewMode = 'grid' | 'list';

export function AssetLibrarySettings() {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AssetType>('all');
  const [catFilter, setCatFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<AssetType>('foreground');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploadTags, setUploadTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<LibraryAsset | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AssetType>('foreground');
  const [editCategory, setEditCategory] = useState('Other');
  const [editTags, setEditTags] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<LibraryAsset | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pgApi.fetchAssets();
      setAssets(data);
    } catch (err) {
      console.error('Failed to load assets:', err);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtered
  const filtered = useMemo(() => {
    let result = assets;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.category.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== 'all') {
      result = result.filter((a) => a.type === typeFilter);
    }
    if (catFilter !== 'all') {
      result = result.filter((a) => a.category === catFilter);
    }
    return result;
  }, [assets, search, typeFilter, catFilter]);

  // ─── Upload ────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
    } else {
      setPreviewUrl(null);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadName('');
    setUploadType('foreground');
    setUploadCategory('Other');
    setUploadTags('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const tags = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const asset = await pgApi.createAsset(selectedFile, {
        name: uploadName || selectedFile.name,
        type: uploadType,
        category: uploadCategory,
        tags,
      });
      setAssets((prev) => [asset, ...prev]);
      toast.success('Asset uploaded');
      setUploadOpen(false);
      resetUploadForm();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ─── Edit ──────────────────────────────────────────────
  const openEdit = (asset: LibraryAsset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditType(asset.type);
    setEditCategory(asset.category);
    setEditTags(asset.tags.join(', '));
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingAsset || !editName.trim()) return;
    setEditSaving(true);
    try {
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await pgApi.updateAsset(editingAsset.id, {
        name: editName.trim(),
        type: editType,
        category: editCategory,
        tags,
      });
      setAssets((prev) =>
        prev.map((a) => (a.id === editingAsset.id ? updated : a)),
      );
      toast.success('Asset updated');
      setEditOpen(false);
      setEditingAsset(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update asset');
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────
  const openDelete = (asset: LibraryAsset) => {
    setDeletingAsset(asset);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAsset) return;
    setDeleting(true);
    try {
      await pgApi.deleteAsset(deletingAsset.id);
      setAssets((prev) => prev.filter((a) => a.id !== deletingAsset.id));
      toast.success(`Asset "${deletingAsset.name}" deleted`);
      setDeleteOpen(false);
      setDeletingAsset(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete asset');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Asset Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload, organize and manage profile generator assets.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetUploadForm();
            setUploadOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Upload Asset
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as any)}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="foreground">Foreground</SelectItem>
            <SelectItem value="background">Background</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ASSET_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-lg overflow-hidden shrink-0">
          <button
            className={`p-2 transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            className={`p-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{assets.length} total assets</span>
        <span>
          {assets.filter((a) => a.type === 'foreground').length} foreground
        </span>
        <span>
          {assets.filter((a) => a.type === 'background').length} background
        </span>
        {filtered.length !== assets.length && (
          <span className="text-primary font-medium">
            {filtered.length} shown
          </span>
        )}
      </div>

      {/* Asset display */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground text-center px-4">
            <Layers className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">
              {assets.length === 0 ? 'No assets yet' : 'No matching assets'}
            </p>
            <p className="text-xs mt-1">
              {assets.length === 0
                ? 'Click "Upload Asset" to add your first one.'
                : 'Try a different search or filter.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
            {filtered.map((asset) => (
              <div
                key={asset.id}
                className="group border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all relative"
              >
                <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{asset.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-3.5"
                    >
                      {asset.type === 'foreground' ? 'FG' : 'BG'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {asset.category}
                    </span>
                  </div>
                  {asset.tags.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-1 overflow-hidden">
                      <Tag className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                      <span className="text-[9px] text-muted-foreground truncate">
                        {asset.tags.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover actions */}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 rounded bg-card/90 border border-border text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                    onClick={() => openEdit(asset)}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    className="p-1 rounded bg-card/90 border border-border text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                    onClick={() => openDelete(asset)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {asset.type === 'foreground' ? 'FG' : 'BG'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {asset.category}
                    </span>
                    {asset.tags.length > 0 && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        {asset.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block shrink-0">
                  {asset.width}x{asset.height}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openEdit(asset)}
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => openDelete(asset)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Upload Dialog ─────────────────────────────── */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          if (!o) resetUploadForm();
          setUploadOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Asset</DialogTitle>
            <DialogDescription>
              Add a new image to the asset library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File picker + preview */}
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-40 mx-auto rounded object-contain"
                  />
                  <button
                    className="absolute top-0 right-0 p-0.5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to choose a file
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    PNG, JPG, SVG, WebP
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Asset name"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={uploadType}
                  onValueChange={(v) => setUploadType(v as AssetType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foreground">Foreground</SelectItem>
                    <SelectItem value="background">Background</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={uploadCategory}
                  onValueChange={setUploadCategory}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g. gradient, blue, abstract"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadOpen(false);
                resetUploadForm();
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1.5" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ───────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update asset details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editingAsset && (
              <div className="w-full h-32 rounded-lg border border-border overflow-hidden bg-muted/30">
                <img
                  src={editingAsset.url}
                  alt={editingAsset.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Asset name"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editType}
                  onValueChange={(v) => setEditType(v as AssetType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foreground">Foreground</SelectItem>
                    <SelectItem value="background">Background</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="e.g. gradient, blue, abstract"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ───────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Asset
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>"{deletingAsset?.name}"</strong>? This will remove it from
              the library permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeletingAsset(null);
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

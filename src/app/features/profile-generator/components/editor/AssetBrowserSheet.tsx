/**
 * Asset Browser – slide-out Sheet for browsing and inserting library assets.
 *
 * Opens from the Layer Panel. Users can search, filter by type/category/tag,
 * and click an asset to insert it as a layer. Admin can also upload new assets.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../../../../components/ui/sheet';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Badge } from '../../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import {
  Search,
  Upload,
  Loader2,
  Image as ImageIcon,
  Layers,
  Trash2,
  Tag,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LibraryAsset, AssetType } from '../../utils/pg-types';
import { ASSET_CATEGORIES } from '../../utils/pg-types';
import * as pgApi from '../../utils/pg-api';

interface AssetBrowserSheetProps {
  open: boolean;
  onClose: () => void;
  onInsertAsset: (asset: LibraryAsset) => void;
  isAdmin?: boolean;
  replaceMode?: boolean;
}

export function AssetBrowserSheet({
  open,
  onClose,
  onInsertAsset,
  isAdmin,
  replaceMode,
}: AssetBrowserSheetProps) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AssetType>('all');
  const [catFilter, setCatFilter] = useState('all');

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<AssetType>('foreground');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploadTags, setUploadTags] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pgApi.fetchAssets();
      setAssets(data);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

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

  const handleUpload = useCallback(async () => {
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
      // Reset form
      setShowUpload(false);
      setSelectedFile(null);
      setUploadName('');
      setUploadTags('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, uploadName, uploadType, uploadCategory, uploadTags]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await pgApi.deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success('Asset deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-[380px] sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <SheetTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {replaceMode ? 'Replace Image' : 'Asset Library'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {replaceMode
              ? 'Select an uploaded asset to replace the current image'
              : 'Browse and insert foreground/background assets'}
          </SheetDescription>
        </SheetHeader>

        {/* Filters */}
        <div className="px-4 py-2.5 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {!replaceMode && (
            <div className="flex gap-2">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as any)}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="foreground">Foreground</SelectItem>
                  <SelectItem value="background">Background</SelectItem>
                </SelectContent>
              </Select>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="h-7 text-xs flex-1">
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
            </div>
          )}
        </div>

        {/* Admin Upload Section – hidden in replace mode */}
        {isAdmin && !replaceMode && (
          <div className="px-4 py-2 border-b border-border">
            {!showUpload ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="w-3 h-3 mr-1.5" />
                Upload New Asset
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Upload Asset</Label>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setShowUpload(false);
                      setSelectedFile(null);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Input
                  placeholder="Asset name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="h-7 text-xs"
                />

                <div className="flex gap-2">
                  <Select
                    value={uploadType}
                    onValueChange={(v) => setUploadType(v as AssetType)}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="foreground">Foreground</SelectItem>
                      <SelectItem value="background">Background</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger className="h-7 text-xs flex-1">
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

                <Input
                  placeholder="Tags (comma-separated)"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="h-7 text-xs"
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => fileRef.current?.click()}
                  >
                    {selectedFile ? selectedFile.name : 'Choose File'}
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-7"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}
          </div>
        )}

        {/* Asset Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground text-center">
              <Layers className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">
                {assets.length === 0 ? 'No assets yet' : 'No matching assets'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  className="group border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all text-left relative cursor-pointer"
                  onClick={() => {
                    onInsertAsset(asset);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onInsertAsset(asset);
                      onClose();
                    }
                  }}
                >
                  <div className="h-20 bg-muted/30 flex items-center justify-center overflow-hidden">
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] font-medium truncate">{asset.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[8px] px-1 py-0 h-3.5"
                      >
                        {asset.type === 'foreground' ? 'FG' : 'BG'}
                      </Badge>
                      <span className="text-[8px] text-muted-foreground truncate">
                        {asset.category}
                      </span>
                    </div>
                    {asset.tags.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5 overflow-hidden">
                        <Tag className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                        <span className="text-[8px] text-muted-foreground truncate">
                          {asset.tags.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      className="absolute top-1 right-1 p-0.5 rounded bg-card/80 border border-border text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete asset"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(asset.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
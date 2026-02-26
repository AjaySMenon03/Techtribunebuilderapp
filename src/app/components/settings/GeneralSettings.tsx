/**
 * General Settings – workspace name & logo upload.
 */
import { useState, useRef } from 'react';
import { useWorkspaceStore } from '../../store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Upload, Loader2, Newspaper, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export function GeneralSettings() {
  const { workspace, update, uploadLogo } = useWorkspaceStore();
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({ name });
      toast.success('Workspace name saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB');
      return;
    }
    setUploading(true);
    try {
      await uploadLogo(file);
      toast.success('Logo uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">General</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your workspace name and branding.
        </p>
      </div>

      {/* Workspace Name */}
      <section className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </h3>
        <div className="space-y-2">
          <Label>Workspace Name</Label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your workspace name"
              className="flex-1"
            />
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {workspace.logo_url ? (
              <div className="w-16 h-16 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                <ImageWithFallback
                  src={workspace.logo_url}
                  alt="Workspace logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-dashed border-border shrink-0">
                <Newspaper className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Max 5MB. PNG, JPG, SVG.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

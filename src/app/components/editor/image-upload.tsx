import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import * as api from '../../lib/api';
import { toast } from 'sonner';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  aspectLabel?: string;
  maxSizeMb?: number;
}

/** Compress image client-side before upload. Returns a File. */
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  // Determine output format — preserve PNG/WebP for transparency support
  const supportsTransparency = file.type === 'image/png' || file.type === 'image/webp';
  const outputMime = supportsTransparency ? file.type : 'image/jpeg';
  const outputExt = supportsTransparency
    ? (file.type === 'image/png' ? '.png' : '.webp')
    : '.jpg';

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      // For JPEG (no transparency), fill white background first
      if (!supportsTransparency) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, outputExt), { type: outputMime }));
          } else {
            resolve(file);
          }
        },
        outputMime,
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function ImageUpload({ value, onChange, aspectLabel, maxSizeMb = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast.error(`Image must be under ${maxSizeMb}MB`);
        return;
      }
      setUploading(true);
      try {
        const compressed = await compressImage(file);
        const url = await api.uploadAsset(compressed);
        onChange(url);
        toast.success('Image uploaded!');
      } catch (err: any) {
        console.error('Image upload error:', err);
        toast.error(err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onChange, maxSizeMb],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-border">
          <img src={value} alt="Uploaded" className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              Replace
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onChange('')}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
          }`}
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Drag & drop or <span className="text-primary font-medium">click to upload</span>
              </p>
              {aspectLabel && (
                <p className="text-xs text-muted-foreground/60">{aspectLabel}</p>
              )}
            </div>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
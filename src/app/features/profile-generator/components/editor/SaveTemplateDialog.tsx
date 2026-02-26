/**
 * Save As Template – dialog for saving current editor state as a template.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { TEMPLATE_CATEGORIES } from '../../utils/pg-types';
import * as pgApi from '../../utils/pg-api';
import type { EditorState } from '../../utils/editor-types';

interface SaveTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  editorState: EditorState;
}

export function SaveTemplateDialog({
  open,
  onClose,
  editorState,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState(editorState.profileName || 'My Template');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Custom');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }
    setSaving(true);
    try {
      await pgApi.createTemplate({
        name: name.trim(),
        description: description.trim(),
        category,
        canvasConfig: editorState.canvasConfig,
        layers: editorState.layers,
        isSystem: false,
      });
      toast.success('Template saved successfully');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }, [name, description, category, editorState, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save the current layer stack as a reusable template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm">
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

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            This template will include {editorState.layers.length} layer
            {editorState.layers.length !== 1 ? 's' : ''} and canvas size{' '}
            {editorState.canvasConfig.width}&times;{editorState.canvasConfig.height}.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { ScrollArea } from '../../../../components/ui/scroll-area';
import { Save, Trash2, FolderOpen } from 'lucide-react';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';
import type { CanvasCoreHandle } from '../canvas/CanvasCore';
import type { CanvasProject } from '../../types/canvasTypes';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

export function SaveDialog({ open, onOpenChange, canvasRef }: SaveDialogProps) {
  const { currentProjectId, projects, saveProject } = useCanvasStudioStore();
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const [name, setName] = useState(currentProject?.name || '');

  const handleSave = () => {
    const ref = canvasRef.current;
    if (!ref) return;
    const json = ref.toJSON();
    const thumbnail = ref.toDataURL('png', 0.3);
    const project: CanvasProject = {
      id: currentProjectId || crypto.randomUUID(),
      name: name || 'Untitled Canvas',
      canvasJSON: json,
      thumbnail,
      createdAt: currentProject?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    saveProject(project);
    toast.success('Project saved');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border-white/20 dark:border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Project
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Project Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Canvas Project"
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface LoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

export function LoadDialog({ open, onOpenChange, canvasRef }: LoadDialogProps) {
  const { projects, deleteProject, setCurrentProjectId, loadProjectsFromStorage } = useCanvasStudioStore();

  const handleLoad = async (project: CanvasProject) => {
    const ref = canvasRef.current;
    if (!ref) return;
    try {
      await ref.loadJSON(project.canvasJSON);
      setCurrentProjectId(project.id);
      toast.success(`Loaded "${project.name}"`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to load project');
    }
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    loadProjectsFromStorage();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border-white/20 dark:border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Open Project
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No saved projects yet</p>
              <p className="text-xs mt-1">Save your canvas to see it here</p>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleLoad(p)}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-12 rounded bg-muted overflow-hidden shrink-0 border border-border">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">No preview</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Updated {format(p.updatedAt, 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
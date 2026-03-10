import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ArrowUpDown,
  Shapes,
  Clock,
  Calendar,
  SortAsc,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useCanvasStudioStore } from './store/canvasStudioStore';
import type { CanvasProject } from './types/canvasTypes';
import { format } from 'date-fns';
import { toast } from 'sonner';

type SortBy = 'updatedAt' | 'createdAt' | 'name';
type ViewMode = 'grid' | 'list';

export default function CanvasProjectsList() {
  const navigate = useNavigate();
  const { projects, loadProjectsFromStorage, deleteProject, saveProject, setCurrentProjectId } = useCanvasStudioStore();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

  useEffect(() => {
    loadProjectsFromStorage();
  }, [loadProjectsFromStorage]);

  const filtered = projects
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'createdAt') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });

  const handleNewProject = () => {
    const id = crypto.randomUUID();
    setCurrentProjectId(id);
    navigate(`/canvas-studio/${id}`);
  };

  const handleOpen = (project: CanvasProject) => {
    setCurrentProjectId(project.id);
    navigate(`/canvas-studio/${project.id}`);
  };

  const handleDuplicate = (project: CanvasProject) => {
    const dup: CanvasProject = {
      ...project,
      id: crypto.randomUUID(),
      name: `${project.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveProject(dup);
    toast.success('Project duplicated');
  };

  const handleDelete = () => {
    if (!deleteDialogId) return;
    deleteProject(deleteDialogId);
    setDeleteDialogId(null);
    toast.success('Project deleted');
  };

  const handleRename = (id: string) => {
    if (!renameName.trim()) return;
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    saveProject({ ...project, name: renameName.trim(), updatedAt: Date.now() });
    setRenameId(null);
    toast.success('Project renamed');
  };

  const sortOptions: { value: SortBy; label: string; icon: React.ReactNode }[] = [
    { value: 'updatedAt', label: 'Last Modified', icon: <Clock className="w-3.5 h-3.5" /> },
    { value: 'createdAt', label: 'Date Created', icon: <Calendar className="w-3.5 h-3.5" /> },
    { value: 'name', label: 'Name', icon: <SortAsc className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Shapes className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Canvas Studio</h1>
                <p className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <Button
              onClick={handleNewProject}
              className="gap-2 rounded-xl shadow-md"
            >
              <Plus className="w-4 h-4" />
              New Canvas
            </Button>
          </div>

          {/* Search & Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="pl-9 h-9 rounded-xl bg-white/80 dark:bg-slate-800/80 border-border/50"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-border/50">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="text-xs hidden sm:inline">
                    {sortOptions.find((s) => s.value === sortBy)?.label}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {sortOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`gap-2 text-xs ${sortBy === opt.value ? 'bg-muted' : ''}`}
                  >
                    {opt.icon}
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center rounded-xl border border-border/50 overflow-hidden">
              <button
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Shapes className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground/70 mb-1">
                {search ? 'No matching projects' : 'No projects yet'}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {search ? 'Try a different search term' : 'Create your first canvas to get started'}
              </p>
              {!search && (
                <Button onClick={handleNewProject} variant="outline" className="gap-2 rounded-xl">
                  <Plus className="w-4 h-4" />
                  Create Canvas
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="group relative rounded-2xl border border-border/40 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm overflow-hidden hover:border-border hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => handleOpen(project)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {project.thumbnail ? (
                      <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shapes className="w-10 h-10 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    {renameId === project.id ? (
                      <input
                        autoFocus
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        onBlur={() => handleRename(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(project.id);
                          if (e.key === 'Escape') setRenameId(null);
                        }}
                        className="text-sm font-medium w-full bg-transparent border-b border-primary outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-sm font-medium truncate text-foreground">{project.name}</h3>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(project.updatedAt, 'MMM d, yyyy')}
                    </p>
                  </div>

                  {/* Actions menu */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="w-7 h-7 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl min-w-[140px]">
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameId(project.id);
                            setRenameName(project.name);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(project);
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-xs text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialogId(project.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleOpen(project)}
                >
                  <div className="w-14 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-border/30">
                    {project.thumbnail ? (
                      <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shapes className="w-4 h-4 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {renameId === project.id ? (
                      <input
                        autoFocus
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        onBlur={() => handleRename(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(project.id);
                          if (e.key === 'Escape') setRenameId(null);
                        }}
                        className="text-sm font-medium w-full bg-transparent border-b border-primary outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-sm font-medium truncate">{project.name}</h3>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Updated {format(project.updatedAt, 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameId(project.id);
                        setRenameName(project.name);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(project);
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialogId(project.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this canvas project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

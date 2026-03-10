import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useEditorStore } from '../../lib/editor-store';
import { useCollabStore } from '../../lib/collab-store';
import type { PreviewMode } from '../../lib/editor-types';
import type { ThemeConfig } from '../../lib/types';
import { PresenceBar } from './presence-bar';
import { ExportDropdown } from './export-dropdown';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  ArrowLeft,
  Save,
  Loader2,
  Monitor,
  Smartphone,
  FileText,
  Moon,
  Sun,
  Clock,
  Check,
  History,
} from 'lucide-react';

interface EditorTopBarProps {
  title: string;
  version: number;
  isDraft: boolean;
  saving: boolean;
  dirty: boolean;
  lastSavedAt: string | null;
  theme: ThemeConfig;
  onSave: () => void;
  onToggleDraft: (isDraft: boolean) => void;
  onTitleChange?: (title: string) => void;
}

const previewModes: { value: PreviewMode; label: string; icon: React.ReactNode }[] = [
  { value: 'desktop', label: 'Desktop (700px)', icon: <Monitor className="w-4 h-4" /> },
  { value: 'mobile', label: 'Mobile (375px)', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'a4', label: 'A4 (595px)', icon: <FileText className="w-4 h-4" /> },
];

export function EditorTopBar({
  title,
  version,
  isDraft,
  saving,
  dirty,
  lastSavedAt,
  theme,
  onSave,
  onToggleDraft,
  onTitleChange,
}: EditorTopBarProps) {
  const navigate = useNavigate();
  const { previewMode, setPreviewMode, darkModePreview, toggleDarkModePreview } = useEditorStore();
  const { showVersionHistory, setShowVersionHistory } = useCollabStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  const currentMode = previewModes.find((m) => m.value === previewMode)!;

  const handleTitleSubmit = () => {
    setEditingTitle(false);
    if (onTitleChange && titleDraft.trim()) {
      onTitleChange(titleDraft.trim());
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSubmit();
    if (e.key === 'Escape') {
      setTitleDraft(title);
      setEditingTitle(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 border-b border-border bg-card shrink-0 min-w-0">
      {/* Left - back + title */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="h-8 px-2 shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Back</span>
        </Button>

        <Separator orientation="vertical" className="h-5 hidden sm:block" />

        {editingTitle ? (
          <Input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={handleTitleSubmit}
            className="text-sm font-medium w-28 sm:w-52 h-8 px-2"
          />
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              className="text-sm font-medium truncate max-w-[80px] sm:max-w-[200px] hover:underline text-left"
              onClick={() => {
                setTitleDraft(title);
                setEditingTitle(true);
              }}
              title="Click to edit title"
            >
              {title || 'Untitled'}
            </button>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">v{version}</span>
          </div>
        )}
      </div>

      {/* Save status */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        {saving ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Saving...</span>
          </>
        ) : dirty ? (
          <>
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Unsaved</span>
          </>
        ) : lastSavedAt ? (
          <>
            <Check className="w-3 h-3 text-green-500" />
            <span className="hidden sm:inline">Saved {formatTime(lastSavedAt)}</span>
          </>
        ) : null}
      </div>

      {/* Presence (hidden on very small screens) */}
      <div className="hidden md:flex items-center">
        <Separator orientation="vertical" className="h-5 mr-2" />
        <PresenceBar />
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Version history */}
        <Button
          variant={showVersionHistory ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0 sm:w-auto sm:px-2.5 sm:gap-1.5"
          onClick={() => setShowVersionHistory(!showVersionHistory)}
        >
          <History className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">Versions</span>
        </Button>

        {/* Preview mode - hidden on mobile since there's a tab bar */}
        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:w-auto sm:px-2.5 sm:gap-1.5">
                {currentMode.icon}
                <span className="text-xs hidden sm:inline">
                  {currentMode.value === 'desktop' ? 'Desktop' : currentMode.value === 'mobile' ? 'Mobile' : 'A4'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {previewModes.map((mode) => (
                <DropdownMenuItem key={mode.value} onClick={() => setPreviewMode(mode.value)}>
                  <span className="mr-2">{mode.icon}</span>
                  {mode.label}
                  {mode.value === previewMode && <Check className="w-3.5 h-3.5 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dark mode toggle */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={toggleDarkModePreview}
          title={darkModePreview ? 'Light preview' : 'Dark preview'}
        >
          {darkModePreview ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Separator orientation="vertical" className="h-5 hidden sm:block" />

        {/* Export */}
        <ExportDropdown title={title} theme={theme} />

        {/* Draft / Published */}
        <div className="hidden md:flex items-center gap-1.5 ml-1">
          <Label className="text-xs text-muted-foreground">Draft</Label>
          <Switch
            checked={!isDraft}
            onCheckedChange={(v) => onToggleDraft(!v)}
            className="scale-90"
          />
          <Label className="text-xs text-muted-foreground">Published</Label>
        </div>

        {/* Save button */}
        <Button onClick={onSave} disabled={saving} size="sm" className="h-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="hidden sm:inline ml-1.5">Save</span>
        </Button>
      </div>
    </div>
  );
}
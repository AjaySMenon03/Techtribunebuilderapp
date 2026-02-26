/**
 * Profile Editor – Top Toolbar.
 *
 * Responsive: on mobile, hides secondary controls (grid, snap, ruler, reset).
 * Panel navigation is handled by the bottom tab bar in ProfileEditorPage.
 */

import { memo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  RulerIcon,
  Maximize2,
  RotateCcw,
  Save,
  FileStack,
  Download,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Separator } from '../../../../components/ui/separator';
import type { CanvasConfig } from '../../utils/editor-types';
import { PROFILE_GENERATOR_ROUTE } from '../../utils/constants';

interface EditorToolbarProps {
  profileName: string;
  canvasConfig: CanvasConfig;
  onSetProfileName: (name: string) => void;
  onUpdateCanvas: (changes: Partial<CanvasConfig>) => void;
  onSaveAsTemplate?: () => void;
  onSaveProfile?: () => void;
  onExport?: () => void;
  isMobile?: boolean;
}

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export const EditorToolbar = memo(function EditorToolbar({
  profileName,
  canvasConfig,
  onSetProfileName,
  onUpdateCanvas,
  onSaveAsTemplate,
  onSaveProfile,
  onExport,
  isMobile,
}: EditorToolbarProps) {
  const navigate = useNavigate();

  const zoomIn = () => {
    const idx = ZOOM_STEPS.findIndex((z) => z >= canvasConfig.zoom);
    const next = ZOOM_STEPS[Math.min(idx + 1, ZOOM_STEPS.length - 1)];
    if (next !== undefined) onUpdateCanvas({ zoom: next });
  };

  const zoomOut = () => {
    const idx = ZOOM_STEPS.findIndex((z) => z >= canvasConfig.zoom);
    const next = ZOOM_STEPS[Math.max(idx - 1, 0)];
    if (next !== undefined) onUpdateCanvas({ zoom: next });
  };

  const resetZoom = () => onUpdateCanvas({ zoom: 1 });

  return (
    <div className="h-11 border-b border-border bg-card flex items-center px-2 sm:px-3 gap-1 sm:gap-2 shrink-0 overflow-x-auto">
      {/* Back */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => navigate(PROFILE_GENERATOR_ROUTE)}
        title="Back to Profiles"
        aria-label="Back to Profiles"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-5 shrink-0" />

      {/* Profile name */}
      <Input
        value={profileName}
        onChange={(e) => onSetProfileName(e.target.value)}
        className="h-7 w-28 sm:w-48 text-xs font-medium border-transparent hover:border-border focus:border-ring shrink-0"
        aria-label="Profile name"
      />

      <div className="flex-1 min-w-2" />

      {/* Desktop-only: Grid/guide toggles */}
      {!isMobile && (
        <div className="flex items-center gap-1">
          <Button
            variant={canvasConfig.showGrid ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            title="Toggle Grid"
            onClick={() => onUpdateCanvas({ showGrid: !canvasConfig.showGrid })}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant={canvasConfig.showSafeMargin ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            title="Toggle Safe Margin Guides"
            onClick={() =>
              onUpdateCanvas({ showSafeMargin: !canvasConfig.showSafeMargin })
            }
          >
            <RulerIcon className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant={canvasConfig.snapToGrid ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            title="Snap to Grid"
            onClick={() =>
              onUpdateCanvas({ snapToGrid: !canvasConfig.snapToGrid })
            }
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-5" />
        </div>
      )}

      {/* Zoom */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={zoomOut}
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>

        <button
          onClick={resetZoom}
          className="text-xs tabular-nums text-muted-foreground hover:text-foreground min-w-[44px] text-center"
          title="Reset Zoom"
          aria-label={`Zoom ${Math.round(canvasConfig.zoom * 100)}%, click to reset`}
        >
          {Math.round(canvasConfig.zoom * 100)}%
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={zoomIn}
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Desktop-only: Reset */}
      {!isMobile && (
        <div className="flex items-center gap-1">
          <Separator orientation="vertical" className="h-5" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={resetZoom}
            title="Reset View"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      )}

      <Separator orientation="vertical" className="h-5 shrink-0" />

      {/* Save / Export */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onSaveProfile}
          title="Save Profile"
          aria-label="Save profile"
        >
          <Save className="w-3.5 h-3.5" />
        </Button>

        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSaveAsTemplate}
            title="Save as Template"
            aria-label="Save as template"
          >
            <FileStack className="w-3.5 h-3.5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onExport}
          title="Export Profile"
          aria-label="Export profile"
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
});

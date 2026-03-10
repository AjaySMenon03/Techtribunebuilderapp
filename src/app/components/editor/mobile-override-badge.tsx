/**
 * Visual indicator for mobile-overridden fields in the settings panel.
 * Shows a small phone badge next to overridden fields, with a reset button.
 */
import { Smartphone, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface MobileOverrideBadgeProps {
  /** True when in mobile mode and this field has a mobile-specific override */
  isOverridden: boolean;
  /** True when in mobile mode and this field CAN be overridden */
  isOverridable: boolean;
  /** Callback to reset this field's mobile override back to desktop value */
  onClear: () => void;
}

export function MobileOverrideBadge({ isOverridden, isOverridable, onClear }: MobileOverrideBadgeProps) {
  if (!isOverridable) return null;

  if (isOverridden) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 gap-0.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              <Smartphone className="w-3 h-3" />
              <RotateCcw className="w-2.5 h-2.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Mobile override active. Click to reset to desktop value.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // In mobile mode but not yet overridden — show subtle hint
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center text-muted-foreground/40">
            <Smartphone className="w-3 h-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">Editing in mobile mode. Changes here will only apply to mobile.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Banner shown at the top of the settings panel when in mobile preview mode.
 */
interface MobileBannerProps {
  overrideCount: number;
  onClearAll: () => void;
}

export function MobileEditingBanner({ overrideCount, onClearAll }: MobileBannerProps) {
  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-blue-700">Mobile Editing Mode</p>
          <p className="text-[10px] text-blue-600/70">
            Changes to style properties only affect mobile view.
            {overrideCount > 0 && ` ${overrideCount} override${overrideCount > 1 ? 's' : ''} active.`}
          </p>
        </div>
      </div>
      {overrideCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 shrink-0"
          onClick={onClearAll}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset all
        </Button>
      )}
    </div>
  );
}

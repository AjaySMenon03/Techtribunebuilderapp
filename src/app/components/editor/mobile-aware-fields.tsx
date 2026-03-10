/**
 * Reusable mobile-aware field wrapper components for the settings panel.
 * These read the current preview mode and route edits to either desktop data
 * or mobile overrides accordingly.
 */
import type { Section } from '../../lib/editor-types';
import { useMobileAwareField } from '../../lib/use-mobile-aware-data';
import { MobileOverrideBadge } from './mobile-override-badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/**
 * A color picker field that is mobile-override aware.
 * In mobile mode, edits write to mobileOverrides; shows badge indicator.
 */
export function MobileAwareColorField({
  section,
  fieldKey,
  label,
  defaultValue,
}: {
  section: Section;
  fieldKey: string;
  label: string;
  defaultValue: string;
}) {
  const { val, set, isOverridden, isOverridable, clearOverride } = useMobileAwareField(section, fieldKey);
  const value = val || defaultValue;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <MobileOverrideBadge isOverridden={isOverridden} isOverridable={isOverridable} onClear={clearOverride} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => set(e.target.value)}
          className={`w-8 h-8 rounded border cursor-pointer p-0.5 ${
            isOverridden ? 'border-blue-400 ring-1 ring-blue-300' : 'border-border'
          }`}
        />
        <Input
          value={value}
          onChange={(e) => set(e.target.value)}
          className={`text-xs flex-1 font-mono ${isOverridden ? 'border-blue-300' : ''}`}
          maxLength={7}
        />
      </div>
    </div>
  );
}

/**
 * Mobile-aware column selector (1/2/3).
 */
export function MobileAwareColumnSelector({
  section,
  fieldKey,
  label,
  max = 3,
  singular = 'column',
  plural = 'columns',
}: {
  section: Section;
  fieldKey: string;
  label: string;
  max?: number;
  singular?: string;
  plural?: string;
}) {
  const { val, set, isOverridden, isOverridable, clearOverride } = useMobileAwareField(section, fieldKey);
  const current = Math.min(Math.max(val || 1, 1), max);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{label}</Label>
        <MobileOverrideBadge isOverridden={isOverridden} isOverridable={isOverridable} onClear={clearOverride} />
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => set(n)}
            className={`flex-1 h-8 rounded-md border text-xs font-medium transition-colors ${
              current === n
                ? isOverridden
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-muted'
            }`}
          >
            {n} {n === 1 ? singular : plural}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Mobile-aware text alignment selector.
 */
export function MobileAwareAlignmentSelector({
  section,
  fieldKey = 'textAlign',
  label = 'Alignment',
  options,
}: {
  section: Section;
  fieldKey?: string;
  label?: string;
  options: Array<{ value: string; icon: React.ComponentType<{ className?: string }>; label: string }>;
}) {
  const { val, set, isOverridden, isOverridable, clearOverride } = useMobileAwareField(section, fieldKey);
  const current = val || 'center';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <MobileOverrideBadge isOverridden={isOverridden} isOverridable={isOverridable} onClear={clearOverride} />
      </div>
      <div className="flex items-center gap-1">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = current === opt.value;
          return (
            <button
              key={opt.value}
              className={`flex-1 h-8 rounded-md border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                isActive
                  ? isOverridden
                    ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-300/30'
                    : 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30'
                  : 'bg-background border-border hover:bg-muted'
              }`}
              onClick={() => set(opt.value)}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Mobile-aware visibility toggle for a section (hide on mobile).
 */
export function MobileVisibilityToggle({ section }: { section: Section }) {
  const { val, set, isOverridden, isOverridable, clearOverride } = useMobileAwareField(section, 'hidden');
  const isHidden = val === true;

  if (!isOverridable) return null;

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Hide on mobile</Label>
        <MobileOverrideBadge isOverridden={isOverridden} isOverridable={isOverridable} onClear={clearOverride} />
      </div>
      <button
        onClick={() => set(!isHidden)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          isHidden
            ? isOverridden ? 'bg-blue-500' : 'bg-primary'
            : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            isHidden ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Mobile-aware padding selector.
 */
export function MobileAwarePaddingField({ section }: { section: Section }) {
  const { val, set, isOverridden, isOverridable, clearOverride } = useMobileAwareField(section, 'padding');
  const current = val || '24px';

  if (!isOverridable) return null;

  const options = [
    { value: '12px', label: 'Compact' },
    { value: '24px', label: 'Normal' },
    { value: '32px', label: 'Spacious' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Padding</Label>
        <MobileOverrideBadge isOverridden={isOverridden} isOverridable={isOverridable} onClear={clearOverride} />
      </div>
      <div className="flex items-center gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => set(opt.value)}
            className={`flex-1 h-8 rounded-md border text-xs font-medium transition-colors ${
              current === opt.value
                ? isOverridden
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

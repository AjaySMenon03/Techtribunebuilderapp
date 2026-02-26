/**
 * Theme Settings – colors, font, dark mode, preview.
 */
import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../store';
import type { ThemeConfig } from '../../lib/types';
import { DEFAULT_THEME } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Palette,
  RotateCcw,
  Moon,
  Sun,
  Save,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';

const FONT_OPTIONS = [
  'Inter',
  'Arial',
  'Georgia',
  'Helvetica',
  'Times New Roman',
  'Roboto',
  'Open Sans',
  'Lato',
  'Merriweather',
  'Playfair Display',
];

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm min-w-0"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export function ThemeSettings() {
  const { workspace, update } = useWorkspaceStore();
  const [theme, setTheme] = useState<ThemeConfig>(
    workspace.theme || DEFAULT_THEME,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTheme(workspace.theme || DEFAULT_THEME);
  }, [workspace.theme]);

  useEffect(() => {
    if (theme.dark_mode_enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme.dark_mode_enabled]);

  const updateThemeField = (field: keyof ThemeConfig, value: any) => {
    setTheme((prev) => ({ ...prev, [field]: value }));
  };

  const resetTheme = () => {
    setTheme({ ...DEFAULT_THEME });
    toast.info('Theme reset to defaults');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({ theme });
      toast.success('Theme saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize colors, fonts, and appearance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetTheme}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Colors */}
      <section className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Colors
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorField
            label="Background Color"
            value={theme.background_color}
            onChange={(v) => updateThemeField('background_color', v)}
          />
          <ColorField
            label="Card Color"
            value={theme.card_color}
            onChange={(v) => updateThemeField('card_color', v)}
          />
          <ColorField
            label="Text Color"
            value={theme.text_color}
            onChange={(v) => updateThemeField('text_color', v)}
          />
          <ColorField
            label="Accent Color"
            value={theme.accent_color}
            onChange={(v) => updateThemeField('accent_color', v)}
          />
        </div>

        <Separator />

        {/* Font family */}
        <div className="space-y-2">
          <Label>Font Family</Label>
          <Select
            value={theme.font_family}
            onValueChange={(v) => updateThemeField('font_family', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>
                  <span style={{ fontFamily: f }}>{f}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Dark mode toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                theme.dark_mode_enabled
                  ? 'bg-indigo-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {theme.dark_mode_enabled ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <Label className="block text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">
                Toggle dark mode for the app interface
              </p>
            </div>
          </div>
          <Switch
            checked={theme.dark_mode_enabled}
            onCheckedChange={(v) => updateThemeField('dark_mode_enabled', v)}
          />
        </div>
      </section>

      {/* Live Preview */}
      <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </h3>
        </div>
        <div
          className="rounded-lg p-4 sm:p-6 border"
          style={{
            backgroundColor: theme.background_color,
            fontFamily: theme.font_family,
            color: theme.text_color,
          }}
        >
          <div
            className="rounded-lg p-4 sm:p-5 shadow-sm"
            style={{ backgroundColor: theme.card_color }}
          >
            <h3
              className="text-base sm:text-lg font-semibold mb-2"
              style={{ color: theme.text_color }}
            >
              Tech Tribune - Preview
            </h3>
            <p
              className="text-xs sm:text-sm mb-3"
              style={{ color: theme.text_color, opacity: 0.7 }}
            >
              This is how your newsletter cards will appear with the current
              theme settings.
            </p>
            <div
              className="inline-block px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-white"
              style={{ backgroundColor: theme.accent_color }}
            >
              Read More
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

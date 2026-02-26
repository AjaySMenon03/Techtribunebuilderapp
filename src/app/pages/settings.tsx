/**
 * Settings Page – menu-driven layout with sidebar navigation.
 *
 * Sections:
 *  1. General       – workspace name & logo
 *  2. Theme         – colors, fonts, dark mode, preview
 *  3. Templates     – profile generator template CRUD
 *  4. Asset Library  – upload / manage profile generator assets
 */
import { useState } from 'react';
import { cn } from '../components/ui/utils';
import {
  Settings2,
  Palette,
  LayoutTemplate,
  ImageIcon,
} from 'lucide-react';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { ThemeSettings } from '../components/settings/ThemeSettings';
import { TemplateSettings } from '../components/settings/TemplateSettings';
import { AssetLibrarySettings } from '../components/settings/AssetLibrarySettings';

type Section = 'general' | 'theme' | 'templates' | 'assets';

const MENU_ITEMS: {
  id: Section;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Workspace & branding',
    icon: <Settings2 className="w-4 h-4" />,
  },
  {
    id: 'theme',
    label: 'Theme',
    description: 'Colors & typography',
    icon: <Palette className="w-4 h-4" />,
  },
  {
    id: 'templates',
    label: 'Profile Templates',
    description: 'Manage template names',
    icon: <LayoutTemplate className="w-4 h-4" />,
  },
  {
    id: 'assets',
    label: 'Asset Library',
    description: 'Upload & organise assets',
    icon: <ImageIcon className="w-4 h-4" />,
  },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>('general');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border bg-background shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Configure your workspace, theme and profile generator.
        </p>
      </div>

      {/* ── Body: Sidebar + Content ─────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar Menu */}
        <aside className="w-56 lg:w-64 border-r border-border bg-card/50 shrink-0 overflow-y-auto hidden sm:block">
          <nav className="p-3 space-y-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  activeSection === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0',
                    activeSection === item.id
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      activeSection === item.id && 'font-semibold',
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar (visible on small screens) */}
        <div className="sm:hidden border-b border-border bg-card/50 w-full shrink-0 overflow-x-auto absolute z-10">
          <div className="flex px-2 py-1.5 gap-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  activeSection === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl sm:pt-6 pt-14">
            {activeSection === 'general' && <GeneralSettings />}
            {activeSection === 'theme' && <ThemeSettings />}
            {activeSection === 'templates' && <TemplateSettings />}
            {activeSection === 'assets' && <AssetLibrarySettings />}
          </div>
        </main>
      </div>
    </div>
  );
}

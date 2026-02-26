export interface ThemeConfig {
  background_color: string;
  card_color: string;
  text_color: string;
  accent_color: string;
  font_family: string;
  dark_mode_enabled: boolean;
}

export interface Newsletter {
  id: string;
  title: string;
  month: number;
  year: number;
  content_json: Record<string, any>;
  theme_config: ThemeConfig | null;
  version: number;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface WorkspaceSettings {
  name: string;
  logo_url: string | null;
  theme: ThemeConfig;
}

export const DEFAULT_THEME: ThemeConfig = {
  background_color: '#f4efe5',
  card_color: '#e9e0cc',
  text_color: '#000000',
  accent_color: '#000000',
  font_family: 'Inter',
  dark_mode_enabled: false,
};

export const DEFAULT_WORKSPACE: WorkspaceSettings = {
  name: 'Electronikmedia',
  logo_url: null,
  theme: { ...DEFAULT_THEME },
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
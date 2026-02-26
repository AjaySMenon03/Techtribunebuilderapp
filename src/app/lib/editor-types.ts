import DOMPurify from 'dompurify';

// --- Section Base Types ---

export type SectionBaseType =
  | 'header'
  | 'meet_engineer'
  | 'appreciation'
  | 'project_update'
  | 'founder_focus'
  | 'divider'
  | 'comic'
  | 'footer';

export const SECTION_TYPE_LABELS: Record<SectionBaseType, string> = {
  header: 'Header',
  meet_engineer: 'Meet the Engineer',
  appreciation: 'Appreciation',
  project_update: 'Project Update',
  founder_focus: 'Founder Focus',
  divider: 'Divider',
  comic: 'Add Image',
  footer: 'Footer',
};

export const SECTION_TYPE_ICONS: Record<SectionBaseType, string> = {
  header: 'Newspaper',
  meet_engineer: 'UserCircle',
  appreciation: 'Heart',
  project_update: 'Rocket',
  founder_focus: 'Quote',
  divider: 'Minus',
  comic: 'Smile',
  footer: 'ArrowDown',
};

// --- Section Data Shapes ---

export interface HeaderSectionData {
  title: string;
  subtitle: string;
  logoUrl: string;
  bannerUrl: string;
  fontColor: string;
  bgColor: string;
}

export interface MeetEngineerSectionData {
  name: string;
  role: string;
  photoUrl: string;
  qna: Array<{ id: string; question: string; answer: string }>;
  funFacts: string[];
  fontColor: string;
  bgColor: string;
}

export interface AppreciationMember {
  id: string;
  name: string;
  photoUrl: string;
  message: string; // HTML
  cardColor: string;
}

export interface AppreciationSectionData {
  members: AppreciationMember[];
  fontColor: string;
  bgColor: string;
  membersPerRow: number;
}

export interface ProjectUpdateSectionData {
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  columns: number; // 1–3
  content: string; // HTML - auto-flows across columns via CSS column-count
  fontColor: string;
  bgColor: string;
}

export interface ComicSectionData {
  imageUrl: string;
  caption: string;
  heading: string;
  fontColor: string;
  bgColor: string;
}

export interface FounderFocusSectionData {
  quote: string;
  name: string;
  designation: string;
  textAlign: 'left' | 'center' | 'right';
  fontColor: string;
  bgColor: string;
}

export interface DividerSectionData {
  // Simple divider — no configurable data needed
}

export interface FooterSectionData {
  content: string; // HTML
  socialLinks: Array<{ platform: string; url: string }>;
  fontColor: string;
  bgColor: string;
}

// --- Unified Section Type ---

export interface Section {
  id: string;
  baseType: SectionBaseType;
  visible: boolean;
  data: Record<string, any>;
}

export interface NewsletterContent {
  sections: Section[];
}

// --- Preview Modes ---

export type PreviewMode = 'desktop' | 'mobile' | 'a4';

export const PREVIEW_WIDTHS: Record<PreviewMode, number> = {
  desktop: 600,
  mobile: 375,
  a4: 595,
};

// --- Default Section Data Factories ---

export function createDefaultSectionData(baseType: SectionBaseType): Record<string, any> {
  switch (baseType) {
    case 'header':
      return {
        title: 'Tech Tribune',
        subtitle: 'Monthly Engineering Newsletter',
        logoUrl: '',
        bannerUrl: '',
        fontColor: '#000000',
        bgColor: '#f4efe5',
      } satisfies HeaderSectionData;
    case 'meet_engineer':
      return {
        name: '',
        role: '',
        photoUrl: '',
        qna: [],
        funFacts: [],
        fontColor: '#000000',
        bgColor: '#f4efe5',
      } satisfies MeetEngineerSectionData;
    case 'appreciation':
      return { members: [], fontColor: '#000000', bgColor: '#f4efe5', membersPerRow: 2 } satisfies AppreciationSectionData;
    case 'project_update':
      return {
        status: 'in_progress',
        columns: 1,
        content: '<p>Describe the project update...</p>',
        fontColor: '#000000',
        bgColor: '#f4efe5',
      } satisfies ProjectUpdateSectionData;
    case 'founder_focus':
      return {
        quote: '',
        name: 'Bertin Dcruz',
        designation: 'Founder and CEO, Electronikmedia',
        textAlign: 'center',
        fontColor: '#000000',
        bgColor: '#f4efe5',
      } satisfies FounderFocusSectionData;
    case 'divider':
      return {} satisfies DividerSectionData;
    case 'comic':
      return { imageUrl: '', caption: '', heading: 'title', fontColor: '#000000', bgColor: '#f4efe5' } satisfies ComicSectionData;
    case 'footer':
      return {
        content: '<p>Visit the website: www.electronikmedia.com</p>',
        socialLinks: [
          { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/electronikmedia/?viewAsMember=true' },
          { platform: 'Instagram', url: 'https://www.instagram.com/electronikmedia/' },
          { platform: 'Facebook', url: 'https://www.facebook.com/electronikmedia/' },
        ],
        fontColor: '#000000',
        bgColor: '#f4efe5',
      } satisfies FooterSectionData;
    default:
      return {};
  }
}

export function createSection(baseType: SectionBaseType): Section {
  return {
    id: crypto.randomUUID(),
    baseType,
    visible: true,
    data: createDefaultSectionData(baseType),
  };
}

// --- Sanitization ---

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'hr', 'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
  });
}

export function sanitizeSections(sections: Section[]): Section[] {
  return sections.map((section) => {
    const data = { ...section.data };
    // Sanitize any HTML string fields
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'string' && data[key].includes('<')) {
        data[key] = sanitizeHtml(data[key]);
      }
      // Handle nested member arrays (appreciation)
      if (key === 'members' && Array.isArray(data[key])) {
        data[key] = data[key].map((m: any) => ({
          ...m,
          message: typeof m.message === 'string' ? sanitizeHtml(m.message) : m.message,
        }));
      }
    }
    return { ...section, data };
  });
}

// --- Status Labels ---

export const PROJECT_STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning', color: '#6366f1' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'completed', label: 'Completed', color: '#22c55e' },
  { value: 'on_hold', label: 'On Hold', color: '#ef4444' },
];

// --- Dark Mode Color Mapping ---
// Default light palette values that should be swapped in dark mode.
// Any section still using these defaults gets dark-mode equivalents.
// Custom colors chosen by the user are preserved.

const DARK_MODE_BG_MAP: Record<string, string> = {
  '#f4efe5': '#1e1e2e', // default section bg → dark
  '#e9e0cc': '#2a2a3d', // default card color → dark card
};

const DARK_MODE_FONT_MAP: Record<string, string> = {
  '#000000': '#e0e0e0', // default black text → light
};

const DARK_MODE_CARD_MAP: Record<string, string> = {
  '#e9e0cc': '#2a2a3d', // default card → dark card
};

/**
 * Apply dark mode color remapping to a section's data.
 * Only swaps colours that match known light-mode defaults;
 * user-customised colours pass through unchanged.
 */
function remapDataForDarkMode(data: Record<string, any>): Record<string, any> {
  const out = { ...data };
  if (out.bgColor && DARK_MODE_BG_MAP[out.bgColor.toLowerCase()]) {
    out.bgColor = DARK_MODE_BG_MAP[out.bgColor.toLowerCase()];
  }
  if (out.fontColor && DARK_MODE_FONT_MAP[out.fontColor.toLowerCase()]) {
    out.fontColor = DARK_MODE_FONT_MAP[out.fontColor.toLowerCase()];
  }
  // Appreciation per-member cardColor
  if (Array.isArray(out.members)) {
    out.members = out.members.map((m: any) => {
      const cardColor = m.cardColor?.toLowerCase();
      if (cardColor && DARK_MODE_CARD_MAP[cardColor]) {
        return { ...m, cardColor: DARK_MODE_CARD_MAP[cardColor] };
      }
      return m;
    });
  }
  return out;
}

/**
 * Apply dark mode to a full Section object.
 * Returns the section unchanged when darkMode is false.
 */
export function applyDarkModeToSection(section: Section, darkMode: boolean): Section {
  if (!darkMode) return section;
  return { ...section, data: remapDataForDarkMode(section.data) };
}

/**
 * Apply dark mode remapping to an array of sections (for export).
 */
export function applyDarkModeToSections(sections: Section[], darkMode: boolean): Section[] {
  if (!darkMode) return sections;
  return sections.map((s) => applyDarkModeToSection(s, true));
}
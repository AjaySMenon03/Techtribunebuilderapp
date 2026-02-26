/**
 * Web HTML Renderer.
 * Generates clean semantic HTML with external CSS class references.
 * All section types supported: header, meet_engineer, appreciation, project_update, comic, footer, founder_focus, divider.
 */
import type { Section } from '../editor-types';
import { SECTION_TYPE_LABELS, PROJECT_STATUS_OPTIONS, applyDarkModeToSections } from '../editor-types';
import type { ThemeConfig } from '../types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isColorDark(color: string): boolean {
  const hex = color.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

function renderHeader(data: any): string {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const parts: string[] = [];
  parts.push(`<div class="newsletter-header" style="background-color:${bgColor};color:${fontColor};">`);
  parts.push('  <div class="header-bar">');
  parts.push('    <div class="header-left">');
  if (data.logoUrl) {
    parts.push(`      <img src="${escapeHtml(data.logoUrl)}" alt="Logo" class="header-logo" />`);
  }
  parts.push('    </div>');
  parts.push('    <div class="header-center">');
  parts.push(`      <h1 style="color:${fontColor};">${escapeHtml(data.title || 'Newsletter Title')}</h1>`);
  parts.push('    </div>');
  parts.push('    <div class="header-right">');
  parts.push(`      <p class="subtitle" style="color:${fontColor};">${escapeHtml(data.subtitle || 'Subtitle')}</p>`);
  parts.push('    </div>');
  parts.push('  </div>');
  if (data.bannerUrl) {
    parts.push(`  <img src="${escapeHtml(data.bannerUrl)}" alt="Banner" class="header-banner" />`);
  }
  parts.push('</div>');
  return parts.join('\n');
}

function renderMeetEngineer(section: Section): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const isDark = isColorDark(bgColor);
  const roleColor = isDark ? 'rgba(255,255,255,0.55)' : '#6b7280';
  const answerColor = isDark ? 'rgba(255,255,255,0.7)' : '#4b5563';
  const placeholderBg = isDark ? '#374151' : '#e5e7eb';
  const parts: string[] = [];
  parts.push(`<div class="newsletter-section newsletter-section--engineer" style="background-color:${bgColor};color:${fontColor};">`);
  parts.push(`  <div class="section-heading">`);
  parts.push(`    <h2 style="color:${fontColor};">${escapeHtml(SECTION_TYPE_LABELS[section.baseType])}</h2>`);
  parts.push('  </div>');
  parts.push('  <div class="engineer-grid">');
  // Left column — profile
  parts.push('    <div class="engineer-profile">');
  if (data.photoUrl) {
    parts.push(`      <img src="${escapeHtml(data.photoUrl)}" alt="${escapeHtml(data.name || 'Engineer')}" class="engineer-photo" />`);
  } else {
    parts.push(`      <div class="engineer-placeholder" style="background-color:${placeholderBg};"></div>`);
  }
  parts.push(`      <div>`);
  parts.push(`        <h3 class="engineer-name" style="color:${fontColor};">${escapeHtml(data.name || 'Engineer Name')}</h3>`);
  parts.push(`        <p class="engineer-role" style="color:${roleColor};">${escapeHtml(data.role || 'Role')}</p>`);
  parts.push(`      </div>`);
  parts.push('    </div>');
  // Right column — Q&A
  parts.push('    <div class="engineer-qna">');
  if (data.qna?.length > 0) {
    parts.push('      <div class="qna-list">');
    data.qna.forEach((item: any) => {
      parts.push('        <div class="qna-item">');
      parts.push(`          <p class="qna-question" style="color:${fontColor};">Q: ${escapeHtml(item.question || 'Question?')}</p>`);
      parts.push(`          <p class="qna-answer" style="color:${answerColor};">A: ${escapeHtml(item.answer || 'Answer...')}</p>`);
      parts.push('        </div>');
    });
    parts.push('      </div>');
  }
  parts.push('    </div>');
  parts.push('  </div>');
  if (data.funFacts?.length > 0) {
    parts.push(`  <div class="fun-facts" style="color:${fontColor};">`);
    parts.push(`    <p class="fun-facts-label">Fun Facts</p>`);
    parts.push('    <ul>');
    data.funFacts.forEach((f: string) => {
      parts.push(`      <li>${escapeHtml(f)}</li>`);
    });
    parts.push('    </ul>');
    parts.push('  </div>');
  }
  parts.push('</div>');
  return parts.join('\n');
}

function renderAppreciation(section: Section): string {
  const data = section.data;
  const members = data.members || [];
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const isDark = isColorDark(bgColor);
  const membersPerRow = Math.min(Math.max(data.membersPerRow || 2, 1), 3);
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const parts: string[] = [];
  parts.push(`<div class="newsletter-section newsletter-section--appreciation" style="background-color:${bgColor};color:${fontColor};">`);
  parts.push(`  <div class="section-heading">`);
  parts.push(`    <h2 style="color:${fontColor};">${escapeHtml(SECTION_TYPE_LABELS[section.baseType])}</h2>`);
  parts.push('  </div>');
  if (members.length === 0) {
    parts.push('  <p style="text-align:center;opacity:0.5;font-style:italic;padding:16px 0;">No members added yet</p>');
  } else {
    parts.push(`  <div class="appreciation-grid" style="grid-template-columns:repeat(${membersPerRow},minmax(0,1fr));">`);
    members.forEach((m: any) => {
      const cardBg = m.cardColor || '#e9e0cc';
      const cardDark = isColorDark(cardBg);
      const cardPlaceholderBg = cardDark ? '#374151' : '#e5e7eb';
      parts.push(`    <div class="appreciation-card" style="background-color:${cardBg};border-color:${borderColor};">`);
      if (m.photoUrl) {
        parts.push(`      <img src="${escapeHtml(m.photoUrl)}" alt="${escapeHtml(m.name || 'Member')}" class="appreciation-photo" />`);
      } else {
        parts.push(`      <div class="appreciation-placeholder" style="background-color:${cardPlaceholderBg};"></div>`);
      }
      parts.push(`      <p class="member-name" style="color:${fontColor};">${escapeHtml(m.name || 'Name')}</p>`);
      if (m.message) {
        parts.push(`      <div class="member-message rich-text" style="color:${fontColor};">${m.message}</div>`);
      }
      parts.push('    </div>');
    });
    parts.push('  </div>');
  }
  parts.push('</div>');
  return parts.join('\n');
}

function renderProjectUpdate(section: Section): string {
  const data = section.data;
  const status = PROJECT_STATUS_OPTIONS.find((s) => s.value === data.status);
  const columns: number = Math.min(Math.max(data.columns || 1, 1), 3);
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  // Support legacy contentColumns array or single content field
  const content: string = data.content
    || (data.contentColumns ? data.contentColumns.filter(Boolean).join('') : '')
    || '<p><em>No content yet</em></p>';

  const parts: string[] = [];
  parts.push(`<div class="newsletter-section" style="background-color:${bgColor};color:${fontColor};">`);
  // Heading row with status badge on the right
  parts.push(`  <div class="section-heading" style="display:flex;align-items:center;justify-content:space-between;">`);
  parts.push(`    <h2 style="color:${fontColor};">${escapeHtml(SECTION_TYPE_LABELS[section.baseType])}</h2>`);
  if (status) {
    parts.push(`    <span class="status-badge" style="background-color:${status.color};margin-left:12px;">${escapeHtml(status.label)}</span>`);
  }
  parts.push('  </div>');
  const columnStyle = columns > 1 ? ` style="column-count:${columns};column-gap:12px;color:${fontColor};"` : ` style="color:${fontColor};"`;
  parts.push(`  <div class="project-content rich-text"${columnStyle}>${content}</div>`);
  parts.push('</div>');
  return parts.join('\n');
}

function renderComic(section: Section): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const isDark = isColorDark(bgColor);
  const heading = data.heading || 'title';
  const placeholderBg = isDark ? '#374151' : '#f3f4f6';
  const parts: string[] = [];
  parts.push(`<div class="newsletter-section" style="background-color:${bgColor};color:${fontColor};">`);
  parts.push(`  <div class="section-heading">`);
  parts.push(`    <h2 style="color:${fontColor};">${escapeHtml(heading)}</h2>`);
  parts.push('  </div>');
  parts.push('  <div class="comic-section">');
  if (data.imageUrl) {
    parts.push(`    <img src="${escapeHtml(data.imageUrl)}" alt="Comic" class="comic-image" />`);
  } else {
    parts.push(`    <div class="comic-placeholder" style="background-color:${placeholderBg};"></div>`);
  }
  if (data.caption) {
    parts.push(`    <p class="comic-caption" style="color:${fontColor};">${escapeHtml(data.caption)}</p>`);
  }
  parts.push('  </div>');
  parts.push('</div>');
  return parts.join('\n');
}

function renderFounderFocus(section: Section): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const textAlign = data.textAlign || 'center';
  const parts: string[] = [];
  parts.push(`<div class="newsletter-section newsletter-section--founder-focus" style="background-color:${bgColor};color:${fontColor};">`);
  parts.push(`  <div class="section-heading">`);
  parts.push(`    <h2 style="color:${fontColor};">${escapeHtml(SECTION_TYPE_LABELS[section.baseType])}</h2>`);
  parts.push('  </div>');
  parts.push(`  <div class="founder-focus-card" style="text-align:${textAlign};">`);
  if (data.quote) {
    parts.push(`    <blockquote class="founder-quote" style="color:${fontColor};">"${escapeHtml(data.quote)}"</blockquote>`);
  }
  parts.push(`    <p class="founder-name" style="color:${fontColor};">${escapeHtml(data.name || 'Founder Name')}</p>`);
  parts.push(`    <p class="founder-designation" style="color:${fontColor};">${escapeHtml(data.designation || 'Designation')}</p>`);
  parts.push('  </div>');
  parts.push('</div>');
  return parts.join('\n');
}

function renderDivider(darkMode: boolean): string {
  const color = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
  return `<div class="newsletter-divider"><hr style="border:none;border-top:1px solid ${color};margin:0;" /></div>`;
}

function renderFooter(section: Section, theme: ThemeConfig): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const parts: string[] = [];
  parts.push(`<div class="newsletter-footer" style="background-color:${bgColor};color:${fontColor};">`);
  parts.push(`  <div class="footer-content rich-text">${data.content || '<p>Visit the website: www.electronikmedia.com</p>'}</div>`);
  if (data.socialLinks?.length > 0) {
    parts.push('  <div class="social-links">');
    data.socialLinks.forEach((link: any) => {
      parts.push(`    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" style="color:${fontColor};">${escapeHtml(link.platform)}</a>`);
    });
    parts.push('  </div>');
  }
  parts.push('</div>');
  return parts.join('\n');
}

function renderSection(section: Section, theme: ThemeConfig, darkMode: boolean): string {
  switch (section.baseType) {
    case 'header':
      return renderHeader(section.data);
    case 'meet_engineer':
      return renderMeetEngineer(section);
    case 'appreciation':
      return renderAppreciation(section);
    case 'project_update':
      return renderProjectUpdate(section);
    case 'founder_focus':
      return renderFounderFocus(section);
    case 'divider':
      return renderDivider(darkMode);
    case 'comic':
      return renderComic(section);
    case 'footer':
      return renderFooter(section, theme);
    default:
      return '';
  }
}

export interface WebHtmlOptions {
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
  /** If true, includes inline <link> to style.css. If false, returns body content only. */
  includeWrapper?: boolean;
}

/**
 * Generates complete web HTML document.
 */
export function generateWebHtml(options: WebHtmlOptions): string {
  const { title, sections, theme, darkMode, includeWrapper = true } = options;
  const visibleSections = applyDarkModeToSections(sections.filter((s) => s.visible), darkMode);
  const fontFamily = theme.font_family || 'Inter';

  const sectionHtml = visibleSections
    .map((s) => renderSection(s, theme, darkMode))
    .join('\n\n');

  const bodyContent = `<div class="newsletter-container">\n${sectionHtml}\n</div>`;

  if (!includeWrapper) return bodyContent;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title || 'Newsletter')}</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
</head>
<body>
${bodyContent}
</body>
</html>`;
}

/**
 * Generates just the body content HTML (for clipboard copy).
 */
export function generateBodyHtml(options: Omit<WebHtmlOptions, 'includeWrapper'>): string {
  return generateWebHtml({ ...options, includeWrapper: false });
}

export { escapeHtml };

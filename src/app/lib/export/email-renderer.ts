/**
 * Email HTML Renderer.
 * Generates table-based email HTML with fully inline CSS.
 * Compatible with Gmail, Outlook, Apple Mail.
 *
 * ── Visual parity with EditorCanvas (section-previews.tsx) ──
 * Every font-size, padding, max-height, border-radius, image dimension,
 * and color opacity is matched to the React preview so the Email Preview
 * Modal produces an identical visual at both Desktop (700px) and
 * Mobile (375px) viewports.
 *
 * Layout:
 * - Fluid container: max-width 700px, width 100%
 * - Responsive @media queries for mobile stacking (< 480px)
 * - Table-based layout with inline CSS
 * - Email-safe fallback font stack
 * - Outlook MSO conditional comments for fixed-width fallback
 * - Images have explicit dimensions + max-width:100%
 */
import type { Section } from '../editor-types';
import { SECTION_TYPE_LABELS, PROJECT_STATUS_OPTIONS, applyDarkModeToSections } from '../editor-types';
import type { MobileOverrides } from '../editor-types';
import type { ThemeConfig } from '../types';
import { escapeHtml } from './web-renderer';
import { type CssThemeVars, themeVars } from './css-generator';

const EMAIL_FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const EMAIL_HEADING_FONT = "'Libre Caslon Text', Georgia, 'Times New Roman', serif";

/** Max width for the email container (used in Outlook fallback) */
const MAX_WIDTH = 700;

function v(theme: ThemeConfig, darkMode: boolean): CssThemeVars {
  return themeVars(theme, darkMode);
}

function isColorDark(color: string): boolean {
  const hex = color.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/** Convert HTML rich text to email-safe HTML (strip classes, add inline styles) */
function emailRichText(html: string, tv: CssThemeVars): string {
  if (!html) return '';
  const pStyle = `margin:0 0 8px 0;font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:1.6;color:${tv.textColor};`;
  const liStyle = `margin-bottom:2px;font-size:14px;line-height:1.6;color:${tv.textColor};`;

  let result = html
    .replace(/<a /g, `<a style="color:${tv.accentColor};text-decoration:underline;" `)
    .replace(/<strong>/g, '<strong style="font-weight:700;">')
    .replace(/<em>/g, '<em style="font-style:italic;">')
    .replace(/<u>/g, '<u style="text-decoration:underline;">')
    .replace(/<p(?:\s+style="([^"]*)")?>/g, (_match, existingStyle) =>
      `<p style="${pStyle}${existingStyle || ''}">`
    )
    .replace(/<ul>/g, `<ul style="padding-left:24px;margin:0 0 8px 0;list-style-type:disc;">`)
    .replace(/<ol>/g, `<ol style="padding-left:24px;margin:0 0 8px;list-style-type:decimal;">`)
    .replace(/<li>/g, `<li style="${liStyle}">`)
    .replace(/<blockquote>/g, `<blockquote style="border-left:3px solid ${tv.accentColor}40;padding-left:16px;margin:8px 0;font-style:italic;opacity:0.8;">`);
  return result;
}

// ─── Section table wrapper ────────────────────────────────
// All sections use width="100%" — the outer container constrains them.

function sectionTable(bgColor: string, content: string, cssClass = ''): string {
  // Matches preview canvas: p-6 = padding 24px
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${bgColor};"${cssClass ? ` class="${cssClass}"` : ''}>
  <tr>
    <td style="padding:24px;font-family:${EMAIL_FONT_STACK};">
${content}
    </td>
  </tr>
</table>`;
}

// ────────────────────────────────────────────────────
// HEADER  – matches HeaderPreview exactly
// Preview: px-5 py-4 = 20px / 16px
//          Logo: h-8 = 32px
//          Title: 2rem = 32px, Libre Caslon Text
//          Subtitle: text-xs = 12px, opacity-80
//          Banner: max-h-40 = 160px, object-cover, full width
//          Sides: w-1/4 = 25%
// ────────────────────────────────────────────────────

function renderEmailHeader(data: any, tv: CssThemeVars): string {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${bgColor};">
  <tr>
    <td style="padding:0;">
      <!--[if mso]>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="25%" valign="middle" style="padding:16px 0 16px 20px;">
      <![endif]-->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" class="responsive-header">
        <tr>
          <td class="header-logo-cell" valign="middle" style="padding:16px 0 16px 20px;font-family:${EMAIL_FONT_STACK};color:${fontColor};width:25%;">
            ${data.logoUrl ? `<img src="${escapeHtml(data.logoUrl)}" alt="Logo" class="email-logo" height="32" style="height:32px;display:block;object-fit:contain;max-width:100%;" />` : '&nbsp;'}
          </td>
          <td class="header-title-cell" valign="middle" align="center" style="padding:16px 12px;font-family:${EMAIL_HEADING_FONT};color:${fontColor};">
            <h1 style="font-size:2rem;font-weight:700;margin:0;color:${fontColor};font-family:${EMAIL_HEADING_FONT};line-height:1.2;">${escapeHtml(data.title || 'Newsletter Title')}</h1>
          </td>
          <td class="header-subtitle-cell" valign="middle" align="right" style="padding:16px 20px 16px 0;font-family:${EMAIL_FONT_STACK};color:${fontColor};width:25%;">
            <p style="font-size:12px;opacity:0.8;margin:0;color:${fontColor};font-family:${EMAIL_FONT_STACK};line-height:1.3;">${escapeHtml(data.subtitle || 'Subtitle')}</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
  ${data.bannerUrl ? `<tr>
    <td style="padding:0;line-height:0;font-size:0;">
      <img src="${escapeHtml(data.bannerUrl)}" alt="Banner" width="${MAX_WIDTH}" style="width:100%;max-height:160px;object-fit:cover;display:block;" />
    </td>
  </tr>` : ''}
</table>`;
}

// ────────────────────────────────────────────────────
// SECTION HEADING – matches SectionHeading
// Preview: text-lg = 18px, font-bold, HEADING_FONT, mb-4
// ────────────────────────────────────────────────────

function renderEmailSectionHeading(label: string, color: string): string {
  return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
        <tr>
          <td style="font-size:18px;font-weight:700;color:${color};font-family:${EMAIL_HEADING_FONT};">
            ${escapeHtml(label)}
          </td>
        </tr>
      </table>`;
}

function renderEmailHeadingWithStatus(label: string, color: string, status: { label: string; color: string } | undefined): string {
  return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
        <tr>
          <td style="font-size:18px;font-weight:700;color:${color};font-family:${EMAIL_HEADING_FONT};">
            ${escapeHtml(label)}
          </td>
          ${status ? `<td align="right" style="white-space:nowrap;">
            <span style="font-size:12px;font-weight:500;padding:2px 10px;border-radius:9999px;color:#ffffff;background-color:${status.color};display:inline-block;">${escapeHtml(status.label)}</span>
          </td>` : ''}
        </tr>
      </table>`;
}

// ────────────────────────────────────────────────────
// MEET THE ENGINEER – matches MeetEngineerPreview
// Preview: grid-cols-4 = 1:3 ratio
//   Photo: 150×150, border-radius 15px, box-shadow
//   Name: 16px bold
//   Role: 14px (text-sm), secondary color
//   Q&A question: 14px bold, line-height 1.6
//   Q&A answer: 14px, line-height 1.7, answer color
//   Fun facts label: 12px (text-xs), uppercase, tracking-wide, opacity 60
//   Fun facts items: 14px (text-sm), list-disc, opacity 80
// ────────────────────────────────────────────────────

function renderEmailMeetEngineer(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const isDark = isColorDark(bgColor);
  const roleColor = isDark ? 'rgba(255,255,255,0.55)' : '#6b7280';
  const answerColor = isDark ? 'rgba(255,255,255,0.7)' : '#4b5563';
  const placeholderBg = isDark ? '#374151' : '#e5e7eb';
  const qnaHtml = data.qna?.length > 0
    ? data.qna.map((item: any) => `
      <tr>
        <td style="padding-bottom:20px;">
          <p style="font-size:14px;font-weight:700;margin:0 0 4px;line-height:1.6;font-family:${EMAIL_FONT_STACK};color:${fontColor};">Q: ${escapeHtml(item.question || 'Question?')}</p>
          <p style="font-size:14px;margin:0;line-height:1.7;font-family:${EMAIL_FONT_STACK};color:${answerColor};">A: ${escapeHtml(item.answer || 'Answer...')}</p>
        </td>
      </tr>`).join('')
    : '';
  const funFactsHtml = data.funFacts?.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
        <tr>
          <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.6;padding-bottom:4px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">Fun Facts</td>
        </tr>
        ${data.funFacts.map((f: string) => `
        <tr>
          <td style="font-size:14px;padding:1px 0 1px 16px;opacity:0.8;font-family:${EMAIL_FONT_STACK};color:${fontColor};">&bull; ${escapeHtml(f)}</td>
        </tr>`).join('')}
      </table>`
    : '';

  // Use 25% / 75% to match grid-cols-4 (1:3)
  const innerContent = `
      ${renderEmailSectionHeading(SECTION_TYPE_LABELS[section.baseType], fontColor)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" class="engineer-layout">
        <tr>
          <td class="engineer-photo-cell" width="25%" valign="top" style="padding-right:24px;width:25%;">
            ${data.photoUrl
              ? `<img src="${escapeHtml(data.photoUrl)}" alt="${escapeHtml(data.name || 'Engineer')}" width="150" height="150" style="width:150px;height:150px;max-width:100%;border-radius:15px;object-fit:cover;display:block;box-shadow:0 2px 8px rgba(0,0,0,0.08);" />`
              : `<div style="width:150px;height:150px;border-radius:15px;background-color:${placeholderBg};box-shadow:0 2px 8px rgba(0,0,0,0.08);display:inline-block;"></div>`
            }
            <h3 style="font-size:16px;font-weight:700;margin:16px 0 0;line-height:1.3;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(data.name || 'Engineer Name')}</h3>
            <p style="font-size:14px;margin:2px 0 0;font-family:${EMAIL_FONT_STACK};color:${roleColor};">${escapeHtml(data.role || 'Role')}</p>
          </td>
          <td class="engineer-qna-cell" valign="top" style="font-family:${EMAIL_FONT_STACK};color:${fontColor};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${qnaHtml}
            </table>
          </td>
        </tr>
      </table>
      ${funFactsHtml}`;

  return sectionTable(bgColor, innerContent);
}

// ────────────────────────────────────────────────────
// APPRECIATION – matches AppreciationPreview
// Preview: CSS grid repeat(membersPerRow)
//   Card: p-3 = 12px, border-radius 15px, border 1px
//   Photo: w-14 h-14 = 56×56, border-radius 15px
//   Name: text-sm font-semibold = 14px 600
//   Message: text-xs = 12px, opacity 70
// ────────────────────────────────────────────────────

function renderEmailAppreciation(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const members = data.members || [];
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const membersPerRow = Math.min(Math.max(data.membersPerRow || 2, 1), 3);
  const colWidth = membersPerRow === 1 ? '100%' : membersPerRow === 2 ? '50%' : '33%';

  if (members.length === 0) {
    const emptyContent = `
      ${renderEmailSectionHeading(SECTION_TYPE_LABELS[section.baseType], fontColor)}
      <p style="text-align:center;opacity:0.5;font-style:italic;padding:16px 0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">No members added yet</p>`;
    return sectionTable(bgColor, emptyContent);
  }

  function renderMemberCell(m: any): string {
    const cardBg = m.cardColor || '#e9e0cc';
    const cardDark = isColorDark(cardBg);
    const cardPlaceholderBg = cardDark ? '#374151' : '#e5e7eb';
    const cardBorder = isColorDark(bgColor) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    // Resolve photos: photoUrls array > single photoUrl > empty
    const photos: string[] =
      (m.photoUrls && m.photoUrls.length > 0) ? m.photoUrls
        : m.photoUrl ? [m.photoUrl]
        : [];

    let photosHtml: string;
    if (photos.length > 0) {
      const imgTags = photos.map((url: string, idx: number) =>
        `<img src="${escapeHtml(url)}" alt="${escapeHtml(m.name || 'Member')} ${idx + 1}" width="56" height="56" style="width:56px;height:56px;border-radius:15px;object-fit:cover;display:inline-block;" />`
      ).join(`<!--[if mso]>&nbsp;<![endif]--><span style="display:inline-block;width:6px;"></span>`);
      photosHtml = `<div style="text-align:center;margin-bottom:8px;font-size:0;line-height:0;">${imgTags}</div>`;
    } else {
      photosHtml = `<div style="width:56px;height:56px;border-radius:15px;background-color:${cardPlaceholderBg};margin:0 auto 8px;"></div>`;
    }

    return `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:15px;background-color:${cardBg};border:1px solid ${cardBorder};">
              <tr>
                <td align="center" style="padding:12px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
                  ${photosHtml}
                  <p style="font-size:14px;font-weight:600;margin:0;font-family:${EMAIL_FONT_STACK};color:${fontColor};word-wrap:break-word;overflow-wrap:break-word;">${escapeHtml(m.name || 'Name')}</p>
                  ${m.message ? `<div style="font-size:12px;opacity:0.7;margin-top:4px;color:${fontColor};word-wrap:break-word;overflow-wrap:break-word;">${emailRichText(m.message, tv)}</div>` : ''}
                </td>
              </tr>
            </table>`;
  }

  const rows: string[] = [];
  for (let i = 0; i < members.length; i += membersPerRow) {
    const cells: string[] = [];
    for (let j = 0; j < membersPerRow; j++) {
      const m = members[i + j];
      if (m) {
        cells.push(`<td class="appreciation-cell" width="${colWidth}" valign="top" style="padding:4px;">${renderMemberCell(m)}</td>`);
      } else {
        cells.push(`<td class="appreciation-cell" width="${colWidth}" style="padding:4px;"></td>`);
      }
    }
    rows.push(`<tr class="appreciation-row">${cells.join('')}</tr>`);
  }

  const gridContent = `
      ${renderEmailSectionHeading(SECTION_TYPE_LABELS[section.baseType], fontColor)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" class="appreciation-grid">
        ${rows.join('')}
      </table>`;

  return sectionTable(bgColor, gridContent);
}

// ────────────────────────────────────────────────────
// PROJECT UPDATE – matches ProjectUpdatePreview
// Preview: text-sm = 14px, leading-relaxed = 1.625
//   column-count: columns, column-gap 12px
// ────────────────────────────────────────────────────

function renderEmailProjectUpdate(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const status = PROJECT_STATUS_OPTIONS.find((s) => s.value === data.status);
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  const columns: number = Math.min(Math.max(data.columns || 1, 1), 3);
  const content: string = data.content
    || (data.contentColumns ? data.contentColumns.filter(Boolean).join('') : '')
    || '<p><em>No content yet</em></p>';

  const sectionTv = { ...tv, textColor: fontColor, cardColor: bgColor, accentColor: fontColor };

  // Use CSS column-count to match preview canvas behavior
  const columnStyle = columns > 1
    ? `column-count:${columns};column-gap:12px;`
    : '';

  const innerContent = `
      ${renderEmailHeadingWithStatus(SECTION_TYPE_LABELS[section.baseType], fontColor, status)}
      <div style="font-size:14px;line-height:1.625;color:${fontColor};${columnStyle}">${emailRichText(content, sectionTv)}</div>`;

  return sectionTable(bgColor, innerContent);
}

// ───────────────────────────────────────────────────
// COMIC – matches ComicPreview
// Preview: text-center
//   Image: max-w-full rounded-lg mb-2
//   Placeholder: h-48 = 192px
//   Caption: text-sm italic opacity-70
// ────────────────────────────────────────────────────

function renderEmailComic(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const heading = data.heading || 'title';
  const placeholderBg = isColorDark(bgColor) ? '#374151' : '#e5e7eb';

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${bgColor};">
  <tr>
    <td align="center" style="padding:24px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      ${renderEmailSectionHeading(heading, fontColor)}
      ${data.imageUrl
        ? `<img src="${escapeHtml(data.imageUrl)}" alt="Comic" width="${MAX_WIDTH - 48}" style="max-width:100%;border-radius:8px;margin-bottom:8px;display:block;" />`
        : `<div style="width:100%;height:192px;background-color:${placeholderBg};border-radius:8px;margin-bottom:8px;"></div>`
      }
      ${data.caption ? `<p style="font-size:14px;font-style:italic;opacity:0.7;margin:0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(data.caption)}</p>` : ''}
    </td>
  </tr>
</table>`;
}

// ────────────────────────────────────────────────────
// FOUNDER FOCUS – matches FounderFocusPreview
// Preview: border-radius 15px
//   Quote: 20px, weight 300, Inter, italic, lineHeight 1.3
//   Name: text-sm font-bold = 14px 700
//   Designation: text-xs = 12px, opacity-70
// ────────────────────────────────────────────────────

function renderEmailFounderFocus(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const textAlign = data.textAlign || 'center';

  const innerContent = `
      ${renderEmailSectionHeading(SECTION_TYPE_LABELS[section.baseType], fontColor)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:15px;background-color:${bgColor};">
        <tr>
          <td align="${textAlign}" style="padding:0;font-family:${EMAIL_FONT_STACK};color:${fontColor};text-align:${textAlign};">
            ${data.quote ? `<p style="font-size:20px;font-weight:300;font-style:italic;line-height:1.3;margin:0 0 12px;font-family:'Inter',${EMAIL_FONT_STACK};color:${fontColor};">"${escapeHtml(data.quote)}"</p>` : ''}
            <p style="font-size:14px;font-weight:700;margin:0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(data.name || 'Founder Name')}</p>
            <p style="font-size:12px;opacity:0.7;margin:2px 0 0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(data.designation || 'Designation')}</p>
          </td>
        </tr>
      </table>`;

  return sectionTable(bgColor, innerContent);
}

// ────────────────────────────────────────────────────
// DIVIDER – matches DividerPreview
// Preview: padding 10px 20px, borderTop 1px solid accent+30
// ────────────────────────────────────────────────────

function renderEmailDivider(): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
  <tr>
    <td style="padding:10px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-top:1px solid rgba(0,0,0,0.15);font-size:0;line-height:0;height:1px;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// ────────────────────────────────────────────────────
// FOOTER – matches FooterPreview
// Preview: p-5 = 20px, text-center, text-sm = 14px
//   Content: leading-relaxed, opacity-70, mb-3
//   Social links: text-xs = 12px, font-medium, opacity 60
// ────────────────────────────────────────────────────

function renderEmailFooter(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const footerTv = { ...tv, textColor: fontColor };
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${bgColor};">
  <tr>
    <td align="center" style="padding:20px;font-family:${EMAIL_FONT_STACK};color:${fontColor};font-size:14px;">
      <div style="line-height:1.625;opacity:0.7;margin-bottom:12px;">${emailRichText(data.content || '<p>Thanks for reading!</p>', footerTv)}</div>
      ${data.socialLinks?.length > 0 ? `
      <table cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 0;" class="social-links-table">
        <tr>
          ${data.socialLinks.map((link: any) =>
            `<td style="padding:0 8px;"><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;font-weight:500;color:${fontColor};text-decoration:underline;opacity:0.6;font-family:${EMAIL_FONT_STACK};">${escapeHtml(link.platform)}</a></td>`
          ).join('')}
        </tr>
      </table>` : ''}
    </td>
  </tr>
</table>`;
}

function renderEmailSection(section: Section, tv: CssThemeVars): string {
  // Wrap each section with a unique class for per-section mobile overrides
  const sectionClass = `section-${section.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const hasHiddenMobile = section.mobileOverrides?.hidden === true;
  const wrapperClass = `${sectionClass}${hasHiddenMobile ? ' mobile-hidden' : ''}`;

  let html = '';
  switch (section.baseType) {
    case 'header':
      html = renderEmailHeader(section.data, tv);
      break;
    case 'meet_engineer':
      html = renderEmailMeetEngineer(section, tv);
      break;
    case 'appreciation':
      html = renderEmailAppreciation(section, tv);
      break;
    case 'project_update':
      html = renderEmailProjectUpdate(section, tv);
      break;
    case 'founder_focus':
      html = renderEmailFounderFocus(section, tv);
      break;
    case 'divider':
      html = renderEmailDivider();
      break;
    case 'comic':
      html = renderEmailComic(section, tv);
      break;
    case 'footer':
      html = renderEmailFooter(section, tv);
      break;
    default:
      html = '';
  }

  // Wrap in a div with the section class for mobile targeting
  if (html) {
    return `<div class="${wrapperClass}">${html}</div>`;
  }
  return html;
}

export interface EmailHtmlOptions {
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
}

/**
 * Generates responsive @media CSS for mobile email clients.
 * Only clients that support <style> blocks benefit (Gmail app, Apple Mail, etc.).
 * Outlook ignores these — it gets the MSO conditional fixed-width fallback.
 *
 * Breakpoint: 480px — matches the preview canvas mobile viewport (375px)
 * so both the editor canvas and the email preview modal show the same
 * stacking / sizing behaviour.
 */
function responsiveCss(sections: Section[]): string {
  // Generate per-section mobile override CSS
  const sectionOverrideCss = sections
    .filter((s) => s.mobileOverrides && Object.keys(s.mobileOverrides).length > 0)
    .map((s) => {
      const cls = `.section-${s.id.replace(/[^a-zA-Z0-9]/g, '')}`;
      const ov = s.mobileOverrides!;
      const rules: string[] = [];

      if (ov.hidden) {
        rules.push(`${cls}.mobile-hidden { display: none !important; max-height: 0 !important; overflow: hidden !important; mso-hide: all !important; }`);
      }
      if (ov.bgColor) {
        rules.push(`${cls} table[style*="background-color"] { background-color: ${ov.bgColor} !important; }`);
        rules.push(`${cls} > table { background-color: ${ov.bgColor} !important; }`);
      }
      if (ov.fontColor) {
        rules.push(`${cls} td { color: ${ov.fontColor} !important; }`);
        rules.push(`${cls} p, ${cls} h1, ${cls} h2, ${cls} h3, ${cls} span, ${cls} div { color: ${ov.fontColor} !important; }`);
      }
      if (ov.padding) {
        rules.push(`${cls} td[style*="padding:24px"] { padding: ${ov.padding} !important; }`);
        rules.push(`${cls} td[style*="padding:20px"] { padding: ${ov.padding} !important; }`);
      }
      if (ov.textAlign) {
        rules.push(`${cls} td { text-align: ${ov.textAlign} !important; }`);
      }
      if (ov.fontSize) {
        rules.push(`${cls} td, ${cls} p, ${cls} div { font-size: ${ov.fontSize} !important; }`);
      }
      // Appreciation: membersPerRow override → force single-column stacking
      if (ov.membersPerRow !== undefined) {
        const mpr = Number(ov.membersPerRow);
        if (mpr === 1) {
          // Stack all appreciation cells vertically
          rules.push(`${cls} .appreciation-row td.appreciation-cell { display: block !important; width: 100% !important; padding: 4px 0 !important; }`);
        } else if (mpr === 2) {
          rules.push(`${cls} .appreciation-row td.appreciation-cell { width: 50% !important; }`);
        } else if (mpr === 3) {
          rules.push(`${cls} .appreciation-row td.appreciation-cell { width: 33% !important; }`);
        }
      }
      // Project Update: columns override → collapse to 1
      if (ov.columns !== undefined) {
        const cols = Number(ov.columns);
        if (cols === 1) {
          rules.push(`${cls} div[style*="column-count"] { column-count: 1 !important; }`);
        } else {
          rules.push(`${cls} div[style*="column-count"] { column-count: ${cols} !important; }`);
        }
      }

      return rules.join('\n      ');
    })
    .filter(Boolean)
    .join('\n      ');

  return `
    /* ─── Responsive: stack on mobile ─── */
    @media only screen and (max-width: 480px) {
      /* Force full-width on the inner container */
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }

      /* ── Header: stack logo / title / subtitle ── */
      .responsive-header td {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        padding: 8px 16px !important;
      }
      .header-logo-cell img {
        display: block !important;
        margin: 0 auto !important;
        height: 32px !important;
      }
      .header-title-cell h1 {
        font-size: 1.5rem !important;
      }
      .header-subtitle-cell {
        padding-top: 0 !important;
        padding-bottom: 8px !important;
      }

      /* ── Meet the Engineer: stack photo + Q&A ── */
      .engineer-layout td {
        display: block !important;
        width: 100% !important;
        padding-right: 0 !important;
      }
      .engineer-photo-cell {
        text-align: left !important;
        padding-bottom: 16px !important;
      }
      .engineer-photo-cell img,
      .engineer-photo-cell div[style*="border-radius"] {
        width: 100px !important;
        height: 100px !important;
      }

      /* ── Appreciation: keep grid, don't stack ── */
      /* Preview canvas keeps grid at mobile, email should match */

      /* ── Section padding ── */
      td[style*="padding:24px"] {
        padding: 16px !important;
      }

      /* ── Images: ensure they scale (except fixed-size elements) ── */
      img:not(.header-logo-cell img) {
        max-width: 100% !important;
      }
      /* Banner images should scale height */
      img[alt="Banner"] {
        height: auto !important;
      }

      /* ── Column-count collapse ── */
      div[style*="column-count"] {
        column-count: 1 !important;
      }

      /* ── Per-section mobile overrides ── */
      ${sectionOverrideCss}
    }`;
}

/**
 * Generates complete responsive email-safe HTML document.
 * Fluid table layout (max-width: 700px), inline CSS, email-safe fonts.
 * Outlook gets a fixed-width MSO wrapper; modern clients get @media queries.
 */
export function generateEmailHtml(options: EmailHtmlOptions): string {
  const { title, sections, theme, darkMode } = options;
  const tv = v(theme, darkMode);
  const visibleSections = applyDarkModeToSections(sections.filter((s) => s.visible), darkMode);

  const sectionHtml = visibleSections
    .map((s) => renderEmailSection(s, tv))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${escapeHtml(title || 'Newsletter')}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Client-specific resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    /* Reset */
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; max-width: 100%; }
    /* Logo images should keep their fixed height */
    img.email-logo { height: 32px !important; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    /* Gmail fixes */
    u + #body a { color: inherit; text-decoration: none; font-size: inherit; font-weight: inherit; line-height: inherit; }
    /* Dark mode overrides for email clients that support it */
    ${darkMode ? `
    @media (prefers-color-scheme: dark) {
      .dark-bg { background-color: ${tv.bgColor} !important; }
      .dark-text { color: ${tv.textColor} !important; }
    }` : ''}
    ${responsiveCss(sections)}
  </style>
</head>
<body id="body" style="margin:0;padding:0;background-color:#f0f0f0;font-family:${EMAIL_FONT_STACK};">
  <!-- Visually hidden preheader text -->
  <div style="display:none;font-size:1px;color:#f0f0f0;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(title || 'Newsletter')}
  </div>
  <!-- Wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f0f0;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <!--[if mso]>
        <table role="presentation" width="${MAX_WIDTH}" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr>
        <td>
        <![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="email-container dark-bg" style="width:100%;max-width:${MAX_WIDTH}px;background-color:${tv.bgColor};border-radius:8px;overflow:hidden;">
          <tr>
            <td>
${sectionHtml}
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
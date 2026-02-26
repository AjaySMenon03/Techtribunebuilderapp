/**
 * Email HTML Renderer.
 * Generates table-based email HTML with fully inline CSS.
 * Compatible with Gmail, Outlook, Apple Mail.
 *
 * Constraints:
 * - No flex/grid - pure table layout
 * - All CSS inline
 * - Inter replaced with email-safe fallback stack
 * - Fixed 600px container
 * - Images have explicit dimensions
 */
import type { Section } from '../editor-types';
import { SECTION_TYPE_LABELS, PROJECT_STATUS_OPTIONS, applyDarkModeToSections } from '../editor-types';
import type { ThemeConfig } from '../types';
import { escapeHtml } from './web-renderer';
import { type CssThemeVars, themeVars } from './css-generator';

const EMAIL_FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const EMAIL_HEADING_FONT = "'Libre Caslon Text', Georgia, 'Times New Roman', serif";

function v(theme: ThemeConfig, darkMode: boolean): CssThemeVars {
  return themeVars(theme, darkMode);
}

function isColorDark(color: string): boolean {
  const hex = color.replace('#', '');
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
    // Handle <p> with and without existing style - use single regex to avoid double-replacement
    .replace(/<p(?:\s+style="([^"]*)")?>/g, (_match, existingStyle) =>
      `<p style="${pStyle}${existingStyle || ''}">`
    )
    .replace(/<ul>/g, `<ul style="padding-left:24px;margin:0 0 8px 0;list-style-type:disc;">`)
    .replace(/<ol>/g, `<ol style="padding-left:24px;margin:0 0 8px;list-style-type:decimal;">`)
    .replace(/<li>/g, `<li style="${liStyle}">`)
    .replace(/<blockquote>/g, `<blockquote style="border-left:3px solid ${tv.accentColor}40;padding-left:16px;margin:8px 0;font-style:italic;opacity:0.8;">`);
  return result;
}

function renderEmailHeader(data: any, tv: CssThemeVars): string {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;background-color:${bgColor};">
  <tr>
    <td width="150" valign="middle" style="padding:16px 0 16px 20px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      ${data.logoUrl ? `<img src="${escapeHtml(data.logoUrl)}" alt="Logo" height="32" style="height:32px;display:block;object-fit:contain;" />` : '&nbsp;'}
    </td>
    <td valign="middle" align="center" style="padding:16px 12px;font-family:${EMAIL_HEADING_FONT};color:${fontColor};">
      <h1 style="font-size:2rem;font-weight:700;margin:0;color:${fontColor};font-family:${EMAIL_HEADING_FONT};line-height:1.2;">${escapeHtml(data.title || 'Newsletter Title')}</h1>
    </td>
    <td width="150" valign="middle" align="right" style="padding:16px 20px 16px 0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      <p style="font-size:12px;opacity:0.8;margin:0;color:${fontColor};font-family:${EMAIL_FONT_STACK};line-height:1.3;">${escapeHtml(data.subtitle || 'Subtitle')}</p>
    </td>
  </tr>
  ${data.bannerUrl ? `<tr>
    <td colspan="3" style="padding:0;line-height:0;font-size:0;">
      <img src="${escapeHtml(data.bannerUrl)}" alt="Banner" width="600" style="width:100%;max-height:160px;object-fit:cover;display:block;" />
    </td>
  </tr>` : ''}
</table>`;
}

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

/** Render heading row with status badge on the right (for Project Update) */
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
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
        <tr>
          <td colspan="2" style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.6;padding-bottom:4px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">Fun Facts</td>
        </tr>
        ${data.funFacts.map((f: string) => `
        <tr>
          <td colspan="2" style="font-size:14px;padding:1px 0 1px 16px;opacity:0.8;font-family:${EMAIL_FONT_STACK};color:${fontColor};">&bull; ${escapeHtml(f)}</td>
        </tr>`).join('')}
      </table>`
    : '';
  return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;background-color:${bgColor};">
  <tr>
    <td style="padding:24px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      ${renderEmailSectionHeading(SECTION_TYPE_LABELS[section.baseType], fontColor)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="150" valign="top" style="padding-right:24px;">
            ${data.photoUrl
              ? `<img src="${escapeHtml(data.photoUrl)}" alt="${escapeHtml(data.name || 'Engineer')}" width="150" height="150" style="width:150px;height:150px;border-radius:15px;object-fit:cover;display:block;box-shadow:0 2px 8px rgba(0,0,0,0.08);" />`
              : `<div style="width:150px;height:150px;border-radius:15px;background-color:${placeholderBg};display:inline-block;"></div>`
            }
            <h3 style="font-size:16px;font-weight:700;margin:16px 0 0;line-height:1.3;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(data.name || 'Engineer Name')}</h3>
            <p style="font-size:14px;margin:0;font-family:${EMAIL_FONT_STACK};color:${roleColor};">${escapeHtml(data.role || 'Role')}</p>
          </td>
          <td valign="top" style="font-family:${EMAIL_FONT_STACK};color:${fontColor};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${qnaHtml}
            </table>
          </td>
        </tr>
      </table>
      ${funFactsHtml}
    </td>
  </tr>
</table>`;
}

function renderEmailAppreciation(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const members = data.members || [];
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const membersPerRow = Math.min(Math.max(data.membersPerRow || 2, 1), 3);
  const colWidth = membersPerRow === 1 ? '100%' : membersPerRow === 2 ? '50%' : '33%';

  if (members.length === 0) {
    return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;background-color:${bgColor};">
  <tr>
    <td style="padding:24px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      ${renderEmailSectionHeading(SECTION_TYPE_LABELS[section.baseType], fontColor)}
      <p style="text-align:center;opacity:0.5;font-style:italic;padding:16px 0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">No members added yet</p>
    </td>
  </tr>
</table>`;
  }

  function renderMemberCell(m: any): string {
    const cardBg = m.cardColor || '#e9e0cc';
    const cardDark = isColorDark(cardBg);
    const cardPlaceholderBg = cardDark ? '#374151' : '#e5e7eb';
    const cardBorder = isColorDark(bgColor) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    return `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:15px;background-color:${cardBg};border:1px solid ${cardBorder};">
              <tr>
                <td align="center" style="padding:12px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
                  ${m.photoUrl
                    ? `<img src="${escapeHtml(m.photoUrl)}" alt="${escapeHtml(m.name || 'Member')}" width="56" height="56" style="width:56px;height:56px;border-radius:15px;object-fit:cover;display:block;margin:0 auto 8px;" />`
                    : `<div style="width:56px;height:56px;border-radius:15px;background-color:${cardPlaceholderBg};margin:0 auto 8px;"></div>`
                  }
                  <p style="font-size:14px;font-weight:600;margin:0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(m.name || 'Name')}</p>
                  ${m.message ? `<div style="font-size:12px;opacity:0.7;margin-top:4px;color:${fontColor};">${emailRichText(m.message, tv)}</div>` : ''}
                </td>
              </tr>
            </table>`;
  }

  // Build rows based on membersPerRow
  const rows: string[] = [];
  for (let i = 0; i < members.length; i += membersPerRow) {
    const cells: string[] = [];
    for (let j = 0; j < membersPerRow; j++) {
      const m = members[i + j];
      if (m) {
        cells.push(`<td width="${colWidth}" valign="top" style="padding:6px;">${renderMemberCell(m)}</td>`);
      } else {
        cells.push(`<td width="${colWidth}" style="padding:6px;"></td>`);
      }
    }
    rows.push(`<tr>${cells.join('')}</tr>`);
  }

  return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;background-color:${bgColor};">
  <tr>
    <td style="padding:24px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      ${renderEmailSectionHeading(SECTION_TYPE_LABELS[section.baseType], fontColor)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows.join('')}
      </table>
    </td>
  </tr>
</table>`;
}

function renderEmailProjectUpdate(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const status = PROJECT_STATUS_OPTIONS.find((s) => s.value === data.status);
  const columns: number = Math.min(Math.max(data.columns || 1, 1), 3);
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  // Support legacy contentColumns array or single content field
  const content: string = data.content
    || (data.contentColumns ? data.contentColumns.filter(Boolean).join('') : '')
    || '<p><em>No content yet</em></p>';

  // Use section-level colors, falling back to theme vars for rich text
  const sectionTv = { ...tv, textColor: fontColor, cardColor: bgColor, accentColor: fontColor };

  // For email, column-count CSS is not well supported, so we render as a single block
  return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;background-color:${bgColor};">
  <tr>
    <td style="padding:24px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      ${renderEmailHeadingWithStatus(SECTION_TYPE_LABELS[section.baseType], fontColor, status)}
      <div style="font-size:14px;line-height:1.6;">${emailRichText(content, sectionTv)}</div>
    </td>
  </tr>
</table>`;
}

function renderEmailComic(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const heading = data.heading || 'title';
  return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;background-color:${bgColor};">
  <tr>
    <td align="center" style="padding:24px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      ${renderEmailSectionHeading(heading, fontColor)}
      ${data.imageUrl
        ? `<img src="${escapeHtml(data.imageUrl)}" alt="Comic" width="552" style="max-width:100%;border-radius:8px;margin-bottom:8px;display:block;" />`
        : `<div style="width:100%;height:192px;background-color:#f3f4f6;border-radius:8px;margin-bottom:8px;"></div>`
      }
      ${data.caption ? `<p style="font-size:14px;font-style:italic;opacity:0.7;margin:0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(data.caption)}</p>` : ''}
    </td>
  </tr>
</table>`;
}

function renderEmailFounderFocus(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const textAlign = data.textAlign || 'center';
  return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;background-color:${bgColor};">
  <tr>
    <td style="padding:24px;font-family:${EMAIL_FONT_STACK};color:${fontColor};">
      ${renderEmailSectionHeading(SECTION_TYPE_LABELS[section.baseType], fontColor)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:15px;background-color:${bgColor};">
        <tr>
          <td align="${textAlign}" style="padding:0;font-family:${EMAIL_FONT_STACK};color:${fontColor};text-align:${textAlign};">
            ${data.quote ? `<p style="font-size:20px;font-weight:300;font-style:italic;line-height:1.3;margin:0 0 12px;font-family:'Inter',${EMAIL_FONT_STACK};color:${fontColor};">"${escapeHtml(data.quote)}"</p>` : ''}
            <p style="font-size:14px;font-weight:700;margin:0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(data.name || 'Founder Name')}</p>
            <p style="font-size:12px;opacity:0.7;margin:2px 0 0;font-family:${EMAIL_FONT_STACK};color:${fontColor};">${escapeHtml(data.designation || 'Designation')}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function renderEmailDivider(): string {
  return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
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

function renderEmailFooter(section: Section, tv: CssThemeVars): string {
  const data = section.data;
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const footerTv = { ...tv, textColor: fontColor };
  return `
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;background-color:${bgColor};">
  <tr>
    <td align="center" style="padding:24px;font-family:${EMAIL_FONT_STACK};color:${fontColor};font-size:14px;">
      <div style="line-height:1.6;opacity:0.7;margin-bottom:12px;">${emailRichText(data.content || '<p>Thanks for reading!</p>', footerTv)}</div>
      ${data.socialLinks?.length > 0 ? `
      <table cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 0;">
        <tr>
          ${data.socialLinks.map((link: any) =>
            `<td style="padding:0 8px;"><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;font-weight:500;color:${fontColor};text-decoration:underline;font-family:${EMAIL_FONT_STACK};">${escapeHtml(link.platform)}</a></td>`
          ).join('')}
        </tr>
      </table>` : ''}
    </td>
  </tr>
</table>`;
}

function renderEmailSection(section: Section, tv: CssThemeVars): string {
  switch (section.baseType) {
    case 'header':
      return renderEmailHeader(section.data, tv);
    case 'meet_engineer':
      return renderEmailMeetEngineer(section, tv);
    case 'appreciation':
      return renderEmailAppreciation(section, tv);
    case 'project_update':
      return renderEmailProjectUpdate(section, tv);
    case 'founder_focus':
      return renderEmailFounderFocus(section, tv);
    case 'divider':
      return renderEmailDivider();
    case 'comic':
      return renderEmailComic(section, tv);
    case 'footer':
      return renderEmailFooter(section, tv);
    default:
      return '';
  }
}

export interface EmailHtmlOptions {
  title: string;
  sections: Section[];
  theme: ThemeConfig;
  darkMode: boolean;
}

/**
 * Generates complete email-safe HTML document.
 * Table-based layout, inline CSS, email-safe fonts, 600px fixed width.
 */
export function generateEmailHtml(options: EmailHtmlOptions): string {
  const { title, sections, theme, darkMode } = options;
  const tv = v(theme, darkMode);
  const visibleSections = applyDarkModeToSections(sections.filter((s) => s.visible), darkMode);

  const sectionHtml = visibleSections
    .map((s) => renderEmailSection(s, tv))
    .join('\n');

  // Outlook conditional comment for fixed width
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
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
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
      <td align="center" style="padding:24px 0;">
        <!--[if mso]>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr>
        <td>
        <![endif]-->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${tv.bgColor};" class="dark-bg">
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
/**
 * CSS Generator for exported newsletters.
 * Produces a clean external stylesheet for web HTML exports.
 */
import type { ThemeConfig } from '../types';

export interface CssThemeVars {
  bgColor: string;
  cardColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
}

function themeVars(theme: ThemeConfig, darkMode: boolean): CssThemeVars {
  if (darkMode) {
    return {
      bgColor: '#1a1a2e',
      cardColor: '#16213e',
      textColor: '#e0e0e0',
      accentColor: theme.accent_color === '#000000' ? '#ffffff' : theme.accent_color,
      fontFamily: theme.font_family || 'Inter',
    };
  }
  return {
    bgColor: theme.background_color,
    cardColor: theme.card_color,
    textColor: theme.text_color,
    accentColor: theme.accent_color,
    fontFamily: theme.font_family || 'Inter',
  };
}

export function generateWebCss(theme: ThemeConfig, darkMode: boolean, options?: { skipFontImports?: boolean }): string {
  const v = themeVars(theme, darkMode);
  const fontStack = `'${v.fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
  const dividerColor = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
  const borderSubtle = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const fontImports = options?.skipFontImports ? '' : `
@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(v.fontFamily)}:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap');
`;

  return `/* Tech Tribune Newsletter Styles */
/* Generated ${new Date().toISOString()} */
${fontImports}
/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

img {
  max-width: 100%;
  height: auto;
}

body {
  font-family: ${fontStack};
  background-color: #f0f0f0;
  color: ${v.textColor};
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Container */
.newsletter-container {
  max-width: 600px;
  margin: 0 auto;
  background-color: ${v.bgColor};
}

/* Sections */
.newsletter-section {
  padding: 24px;
  color: ${v.textColor};
}

.newsletter-section + .newsletter-section {
  border-top: 1px solid ${borderSubtle};
}

/* Section heading */
.section-heading {
  margin-bottom: 16px;
}

.section-heading h2 {
  font-family: 'Libre Caslon Text', serif;
  font-size: 18px;
  font-weight: 700;
  color: ${v.accentColor};
  margin: 0;
}

/* Header */
.newsletter-header {
  color: inherit;
}

.newsletter-header .header-bar {
  display: flex;
  align-items: center;
  padding: 16px 20px;
}

.newsletter-header .header-left {
  width: 25%;
  display: flex;
  align-items: center;
}

.newsletter-header .header-center {
  flex: 1;
  text-align: center;
}

.newsletter-header .header-right {
  width: 25%;
  text-align: right;
}

.newsletter-header .header-logo {
  height: 32px;
  display: block;
  object-fit: contain;
  max-width: 100%;
}

.newsletter-header .header-banner {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  display: block;
}

.newsletter-header h1 {
  font-family: 'Libre Caslon Text', serif;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: inherit;
  line-height: 1.2;
}

.newsletter-header .subtitle {
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
  line-height: 1.3;
  color: inherit;
}

/* Meet the Engineer */
.engineer-grid {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 24px;
}

.engineer-profile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.engineer-photo {
  width: 150px;
  height: 150px;
  border-radius: 15px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.engineer-placeholder {
  width: 150px;
  height: 150px;
  border-radius: 15px;
  background-color: ${darkMode ? '#374151' : '#e5e7eb'};
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.engineer-name {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  color: inherit;
}

.engineer-role {
  font-size: 14px;
  color: ${darkMode ? 'rgba(255,255,255,0.55)' : '#6b7280'};
  margin: 2px 0 0;
}

.engineer-qna {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.qna-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.qna-item {
  margin-bottom: 0;
}

.qna-question {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 4px;
  line-height: 1.6;
  color: inherit;
}

.qna-answer {
  font-size: 14px;
  margin: 0;
  color: ${darkMode ? 'rgba(255,255,255,0.7)' : '#4b5563'};
  line-height: 1.7;
}

/* Fun Facts */
.fun-facts {
  margin-top: 20px;
}

.fun-facts-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
  margin-bottom: 4px;
}

.fun-facts ul {
  font-size: 14px;
  list-style-type: disc;
  list-style-position: inside;
  opacity: 0.8;
}

.fun-facts li {
  margin-bottom: 2px;
}

/* Appreciation */
.appreciation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.appreciation-card {
  border-radius: 15px;
  padding: 12px;
  text-align: center;
  background-color: ${darkMode ? '#2a2a3d' : '#e9e0cc'};
  border: 1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
  min-width: 0;
  overflow: hidden;
}

.appreciation-photo {
  width: 56px;
  height: 56px;
  border-radius: 15px;
  object-fit: cover;
  margin: 0 auto 8px;
  display: block;
}

.appreciation-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 15px;
  background-color: ${darkMode ? '#374151' : '#e5e7eb'};
  margin: 0 auto 8px;
}

.appreciation-card .member-name {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: inherit;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.appreciation-card .member-message {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 4px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.appreciation-card .member-message p {
  margin: 0 0 4px;
}

.appreciation-card .member-message p:last-child {
  margin-bottom: 0;
}

/* Project Update */
.status-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 9999px;
  color: #ffffff;
  display: inline-block;
  white-space: nowrap;
}

.project-content {
  font-size: 14px;
  line-height: 1.6;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  color: inherit;
}

.project-content p {
  margin: 2px 0;
}

.project-content p:last-child {
  margin-bottom: 0;
}

.project-content ul,
.project-content ol {
  margin: 4px 0;
  padding-left: 20px;
}

.project-content ul {
  list-style-type: disc;
}

.project-content ol {
  list-style-type: decimal;
}

.project-content li {
  margin: 0;
}

.project-content a {
  color: ${v.accentColor};
  text-decoration: underline;
}

/* Founder Focus */
.founder-focus-card {
  text-align: center;
  padding: 0;
  border-radius: 15px;
}

.founder-quote {
  font-size: 20px;
  font-weight: 300;
  font-family: 'Inter', sans-serif;
  font-style: italic;
  line-height: 1.3;
  margin: 0 0 12px;
  padding: 0;
  border: none;
}

.founder-name {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
}

.founder-designation {
  font-size: 12px;
  opacity: 0.7;
  margin: 2px 0 0;
}

/* Divider */
.newsletter-divider {
  padding: 10px 20px;
}

.newsletter-divider hr {
  border: none;
  border-top: 1px solid ${dividerColor};
  margin: 0;
}

/* Comic */
.comic-section {
  text-align: center;
}

.comic-image {
  max-width: 100%;
  border-radius: 8px;
  margin-bottom: 8px;
}

.comic-placeholder {
  width: 100%;
  height: 192px;
  background-color: ${darkMode ? '#374151' : '#f3f4f6'};
  border-radius: 8px;
  margin-bottom: 8px;
}

.comic-caption {
  font-size: 14px;
  font-style: italic;
  opacity: 0.7;
  color: inherit;
}

/* Footer */
.newsletter-footer {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: inherit;
}

.newsletter-footer .footer-content {
  line-height: 1.6;
  opacity: 0.7;
  margin-bottom: 12px;
}

.newsletter-footer .footer-content p {
  margin: 0 0 4px;
}

.newsletter-footer .footer-content p:last-child {
  margin-bottom: 0;
}

.social-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.social-links a {
  font-size: 12px;
  font-weight: 500;
  color: inherit;
  text-decoration: underline;
}

.social-links a:hover {
  opacity: 0.8;
}

/* Rich text content helpers */
.rich-text a {
  color: ${v.accentColor};
  text-decoration: underline;
}

.rich-text strong {
  font-weight: 700;
}

.rich-text em {
  font-style: italic;
}

.rich-text u {
  text-decoration: underline;
}

.rich-text ul, .rich-text ol {
  padding-left: 24px;
  margin: 0 0 8px;
}

.rich-text ul {
  list-style-type: disc;
}

.rich-text ol {
  list-style-type: decimal;
}

.rich-text li {
  margin-bottom: 2px;
}

.rich-text blockquote {
  border-left: 3px solid ${v.accentColor}40;
  padding-left: 16px;
  margin: 8px 0;
  font-style: italic;
  opacity: 0.8;
}

/* ─── Responsive ───────────────────────────────────────── */
@media (max-width: 640px) {
  .newsletter-container {
    width: 100% !important;
    max-width: 100% !important;
  }

  .newsletter-section {
    padding: 20px 16px;
  }

  /* Header */
  .newsletter-header .header-bar {
    flex-direction: column;
    text-align: center;
    gap: 8px;
    padding: 16px;
  }

  .newsletter-header .header-left,
  .newsletter-header .header-right {
    width: 100%;
    text-align: center;
    justify-content: center;
  }

  .newsletter-header h1 {
    font-size: 1.5rem;
  }

  /* Engineer */
  .engineer-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .engineer-photo,
  .engineer-placeholder {
    width: 100px;
    height: 100px;
  }

  /* Appreciation */
  .appreciation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .appreciation-card {
    padding: 10px;
  }

  .appreciation-photo,
  .appreciation-placeholder {
    width: 44px;
    height: 44px;
  }

  .appreciation-card .member-name {
    font-size: 12px;
  }

  .appreciation-card .member-message {
    font-size: 11px;
  }

  /* Footer */
  .newsletter-footer {
    padding: 20px 16px;
  }

  .social-links {
    flex-direction: column;
    gap: 8px;
  }

  /* Section heading */
  .section-heading h2 {
    font-size: 16px;
  }

  /* Divider */
  .newsletter-divider {
    padding: 8px 16px;
  }
}

/* Print styles */
@media print {
  body {
    background: white;
  }
  .newsletter-container {
    box-shadow: none;
    margin: 0;
    max-width: none;
  }
}
`;
}

export { themeVars };

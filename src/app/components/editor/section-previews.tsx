import type { Section } from '../../lib/editor-types';
import type { ThemeConfig } from '../../lib/types';
import { PROJECT_STATUS_OPTIONS, SECTION_TYPE_LABELS } from '../../lib/editor-types';
import { UserCircle, Heart, Smile, Linkedin, Instagram, Facebook, Globe } from 'lucide-react';

const HEADING_FONT = "'Libre Caslon Text', serif";

// Helper: determine if a color is "dark" (for choosing readable secondary text colors)
function isDarkBackground(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

function getSecondaryTextColor(bgColor: string, fontColor: string): string {
  if (isDarkBackground(bgColor)) {
    return 'rgba(255,255,255,0.55)';
  }
  return '#6b7280';
}

function getAnswerTextColor(bgColor: string, fontColor: string): string {
  if (isDarkBackground(bgColor)) {
    return 'rgba(255,255,255,0.7)';
  }
  return '#4b5563';
}

function getPlaceholderBg(bgColor: string): string {
  return isDarkBackground(bgColor) ? '#374151' : '#e5e7eb';
}

interface SectionPreviewProps {
  section: Section;
  theme: ThemeConfig;
  selected: boolean;
  onClick: () => void;
}

export function SectionPreview({ section, theme, selected, onClick }: SectionPreviewProps) {
  if (!section.visible) return null;

  const heading = section.baseType === 'comic'
    ? (section.data.heading || 'title')
    : SECTION_TYPE_LABELS[section.baseType];

  // Sections with their own bgColor/fontColor
  const hasCustomColors = section.baseType === 'meet_engineer' || section.baseType === 'appreciation' || section.baseType === 'project_update' || section.baseType === 'founder_focus' || section.baseType === 'comic';
  const sectionBg = hasCustomColors
    ? (section.data.bgColor || '#f4efe5')
    : theme.card_color;
  const sectionColor = hasCustomColors
    ? (section.data.fontColor || '#000000')
    : theme.text_color;

  return (
    <div
      className={`transition-all cursor-pointer ${
        selected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:ring-1 hover:ring-blue-300'
      }`}
      onClick={onClick}
      style={{ fontFamily: theme.font_family }}
    >
      {section.baseType === 'header' ? (
        <HeaderPreview data={section.data} theme={theme} />
      ) : section.baseType === 'footer' ? (
        <FooterPreview data={section.data} theme={theme} />
      ) : section.baseType === 'divider' ? (
        <DividerPreview theme={theme} />
      ) : (
        <div style={{ backgroundColor: sectionBg, color: sectionColor }} className="p-6">
          {section.baseType === 'project_update' ? (
            <ProjectUpdateHeading
              heading={heading}
              accent={hasCustomColors ? sectionColor : theme.accent_color}
              status={section.data.status}
            />
          ) : (
            <SectionHeading heading={heading} accent={hasCustomColors ? sectionColor : theme.accent_color} />
          )}
          {section.baseType === 'meet_engineer' && <MeetEngineerPreview data={section.data} theme={theme} />}
          {section.baseType === 'appreciation' && <AppreciationPreview data={section.data} theme={theme} />}
          {section.baseType === 'project_update' && <ProjectUpdatePreview data={section.data} theme={theme} />}
          {section.baseType === 'founder_focus' && <FounderFocusPreview data={section.data} theme={theme} />}
          {section.baseType === 'comic' && <ComicPreview data={section.data} theme={theme} />}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ heading, accent }: { heading: string; accent: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold" style={{ color: accent, fontFamily: HEADING_FONT }}>{heading}</h2>
    </div>
  );
}

function ProjectUpdateHeading({ heading, accent, status }: { heading: string; accent: string; status: string }) {
  const projectStatus = PROJECT_STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold" style={{ color: accent, fontFamily: HEADING_FONT }}>{heading}</h2>
      {projectStatus && (
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full text-white whitespace-nowrap ml-3"
          style={{ backgroundColor: projectStatus.color }}
        >
          {projectStatus.label}
        </span>
      )}
    </div>
  );
}

function HeaderPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  return (
    <div style={{ backgroundColor: bgColor, color: fontColor }}>
      {/* Top bar: Logo | Title | Subtitle */}
      <div className="flex items-center px-5 py-4">
        {/* Left: Logo */}
        <div className="w-1/4 flex items-center">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="Logo" className="h-8 object-contain" />
          ) : (
            <div className="h-8" />
          )}
        </div>
        {/* Center: Title */}
        <div className="flex-1 text-center">
          <h1 className="font-bold leading-tight" style={{ fontFamily: HEADING_FONT, fontSize: '2rem' }}>{data.title || 'Newsletter Title'}</h1>
        </div>
        {/* Right: Subtitle */}
        <div className="w-1/4 text-right">
          <p className="text-xs opacity-80 leading-tight">{data.subtitle || 'Subtitle'}</p>
        </div>
      </div>
      {/* Banner: full width, flush to top bar */}
      {data.bannerUrl && (
        <img src={data.bannerUrl} alt="Banner" className="w-full max-h-40 object-cover block" />
      )}
    </div>
  );
}

function MeetEngineerPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const qna: Array<{ id: string; question: string; answer: string }> = data.qna || [];
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  const roleColor = getSecondaryTextColor(bgColor, fontColor);
  const answerColor = getAnswerTextColor(bgColor, fontColor);
  const placeholderBg = getPlaceholderBg(bgColor);
  return (
    <div>
      {/* Grid: 4 cols on desktop, single col on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {/* Left Column — Profile */}
        <div className="sm:col-span-1 flex flex-col items-start gap-4">
          {data.photoUrl ? (
            <img
              src={data.photoUrl}
              alt={data.name}
              className="object-cover w-[100px] sm:w-[150px] h-auto aspect-square"
              style={{ borderRadius: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            />
          ) : (
            <div
              className="flex items-center justify-center w-[100px] sm:w-[150px] aspect-square"
              style={{ borderRadius: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', backgroundColor: placeholderBg }}
            >
              <UserCircle className="w-12 h-12" style={{ color: roleColor }} />
            </div>
          )}
          <div>
            <h3 className="font-bold leading-snug" style={{ fontSize: '16px', color: fontColor }}>
              {data.name || 'Engineer Name'}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: roleColor }}>
              {data.role || 'Role'}
            </p>
          </div>
        </div>

        {/* Right Column — Q&A */}
        <div className="sm:col-span-3 flex flex-col gap-5">
          {qna.length > 0 ? (
            qna.map((item) => (
              <div key={item.id}>
                <p className="font-bold text-sm mb-1" style={{ color: fontColor, lineHeight: 1.6 }}>
                  Q: {item.question || 'Question?'}
                </p>
                <p className="text-sm" style={{ color: answerColor, lineHeight: 1.7 }}>
                  A: {item.answer || 'Answer...'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm italic opacity-50">Add Q&A items in the settings panel</p>
          )}
        </div>
      </div>

      {data.funFacts?.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">Fun Facts</p>
          <ul className="text-sm list-disc list-inside space-y-0.5 opacity-80">
            {data.funFacts.map((f: string, i: number) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AppreciationPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const members = data.members || [];
  const membersPerRow = Math.min(Math.max(data.membersPerRow || 2, 1), 3);
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  if (members.length === 0) {
    return <p className="text-sm opacity-50 italic text-center py-4">No members added yet</p>;
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${membersPerRow}, minmax(0, 1fr))`,
        gap: 'calc(var(--spacing)*2)',
      }}
    >
      {members.map((m: any) => {
        const cardBg = m.cardColor || '#e9e0cc';
        const cardPlaceholderBg = getPlaceholderBg(cardBg);
        const cardSecondary = getSecondaryTextColor(cardBg, fontColor);
        return (
          <div
            key={m.id}
            className="p-3 text-center min-w-0 overflow-hidden"
            style={{
              backgroundColor: cardBg,
              borderRadius: '15px',
              border: `1px solid ${isDarkBackground(bgColor) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            {m.photoUrl ? (
              <img
                src={m.photoUrl}
                alt={m.name}
                className="w-14 h-14 object-cover mx-auto mb-2"
                style={{ borderRadius: '15px' }}
              />
            ) : (
              <div
                className="w-14 h-14 mx-auto mb-2 flex items-center justify-center"
                style={{ borderRadius: '15px', backgroundColor: cardPlaceholderBg }}
              >
                <Heart className="w-6 h-6" style={{ color: cardSecondary }} />
              </div>
            )}
            <p className="text-sm font-semibold break-words" style={{ color: fontColor }}>{m.name || 'Name'}</p>
            {m.message && (
              <div className="text-xs opacity-70 mt-1 break-words overflow-hidden" style={{ color: fontColor }} dangerouslySetInnerHTML={{ __html: m.message }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProjectUpdatePreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const columns: number = Math.min(Math.max(data.columns || 1, 1), 3);
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  // Support legacy contentColumns array or single content field
  const content: string = data.content
    || (data.contentColumns ? data.contentColumns.filter(Boolean).join('') : '')
    || '<p><em>No content yet</em></p>';

  return (
    <div>
      <div
        className="text-sm leading-relaxed break-words overflow-hidden max-w-none [&_p]:my-0.5 [&_li]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:pl-5 [&_ol]:list-decimal [&_a]:underline"
        style={{
          columnCount: columns,
          columnGap: 'calc(var(--spacing)*3)',
          color: fontColor,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

function FounderFocusPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  const textAlign = data.textAlign || 'center';
  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: fontColor,
        borderRadius: '15px',
        textAlign,
      }}
    >
      {data.quote ? (
        <p className="italic" style={{ color: fontColor, fontSize: '20px', fontWeight: 300, fontFamily: "'Inter', sans-serif", lineHeight: 1.3 }}>
          "{data.quote}"
        </p>
      ) : (
        <p className="opacity-50 italic py-2" style={{ fontSize: '1.5rem' }}>Add a quote...</p>
      )}
      <div className="mt-3">
        <p className="text-sm font-bold" style={{ color: fontColor }}>{data.name || 'Founder Name'}</p>
        <p className="text-xs opacity-70">{data.designation || 'Designation'}</p>
      </div>
    </div>
  );
}

function ComicPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const placeholderBg = getPlaceholderBg(bgColor);
  return (
    <div className="text-center">
      {data.imageUrl ? (
        <img src={data.imageUrl} alt="Comic" className="max-w-full mx-auto rounded-lg mb-2" />
      ) : (
        <div className="w-full h-48 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: placeholderBg }}>
          <Smile className="w-12 h-12" style={{ color: getSecondaryTextColor(bgColor, fontColor) }} />
        </div>
      )}
      {data.caption && <p className="text-sm italic opacity-70" style={{ color: fontColor }}>{data.caption}</p>}
    </div>
  );
}

function FooterPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';

  const getSocialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('linkedin')) return <Linkedin className="w-4 h-4" />;
    if (p.includes('instagram')) return <Instagram className="w-4 h-4" />;
    if (p.includes('facebook')) return <Facebook className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  return (
    <div
      className="p-5 text-center text-sm"
      style={{ backgroundColor: bgColor, color: fontColor }}
    >
      <div className="leading-relaxed opacity-70 mb-3" dangerouslySetInnerHTML={{ __html: data.content || '<p>Visit the website: www.electronikmedia.com</p>' }} />
      {data.socialLinks?.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-2">
          {data.socialLinks.map((link: any, i: number) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: fontColor }}
            >
              {getSocialIcon(link.platform)}
              {link.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function DividerPreview({ theme }: { theme: ThemeConfig }) {
  return (
    <div style={{ padding: '10px 20px' }}>
      <hr
        style={{
          border: 'none',
          borderTop: `1px solid ${theme.accent_color}30`,
          margin: 0,
        }}
      />
    </div>
  );
}
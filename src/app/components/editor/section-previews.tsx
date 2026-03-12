import type { Section } from '../../lib/editor-types';
import type { ThemeConfig } from '../../lib/types';
import { PROJECT_STATUS_OPTIONS, SECTION_TYPE_LABELS } from '../../lib/editor-types';
import { useEditorStore } from '../../lib/editor-store';
import { getMemberPhotos } from './section-settings-panel';
import { UserCircle, Heart, Smile, Linkedin, Instagram, Facebook, Globe } from 'lucide-react';

const HEADING_FONT = "'Libre Caslon Text', serif";

// Typography constants for consistent rendering
const BASE_LINE_HEIGHT = 1.6;
const HEADING_LINE_HEIGHT = 1.3;
const TIGHT_LINE_HEIGHT = 1.4;

// Helper: determine if a color is "dark" (for choosing readable secondary text colors)
function isDarkBackground(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

function getSecondaryTextColor(bgColor: string, _fontColor: string): string {
  if (isDarkBackground(bgColor)) {
    return 'rgba(255,255,255,0.55)';
  }
  return '#6b7280';
}

function getAnswerTextColor(bgColor: string, _fontColor: string): string {
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
        <div style={{ backgroundColor: sectionBg, color: sectionColor, padding: section.data.padding || undefined }} className={section.data.padding ? '' : 'p-6'}>
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
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: accent, fontFamily: HEADING_FONT, margin: 0 }}>{heading}</h2>
    </div>
  );
}

function ProjectUpdateHeading({ heading, accent, status }: { heading: string; accent: string; status: string }) {
  const projectStatus = PROJECT_STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: accent, fontFamily: HEADING_FONT, margin: 0 }}>{heading}</h2>
      {projectStatus && (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            padding: '2px 10px',
            borderRadius: '9999px',
            color: '#ffffff',
            backgroundColor: projectStatus.color,
            whiteSpace: 'nowrap',
            marginLeft: '12px',
          }}
        >
          {projectStatus.label}
        </span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// HEADER — matches email renderEmailHeader exactly
// Desktop: flex row — 25% logo | flex title | 25% subtitle
// Mobile: stacked center
// ────────────────────────────────────────────────────

function HeaderPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const previewMode = useEditorStore((s) => s.previewMode);
  const isMobile = previewMode === 'mobile';

  if (isMobile) {
    return (
      <div style={{ backgroundColor: bgColor, color: fontColor }}>
        <div style={{ textAlign: 'center', padding: '8px 16px' }}>
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="Logo" style={{ height: '32px', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
          ) : (
            <div style={{ height: '32px' }} />
          )}
        </div>
        <div style={{ textAlign: 'center', padding: '8px 16px' }}>
          <h1 style={{ fontFamily: HEADING_FONT, fontSize: '1.5rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{data.title || 'Newsletter Title'}</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '0 16px 8px' }}>
          <p style={{ fontSize: '12px', opacity: 0.8, margin: 0, lineHeight: 1.3 }}>{data.subtitle || 'Subtitle'}</p>
        </div>
        {data.bannerUrl && (
          <img src={data.bannerUrl} alt="Banner" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }} />
        )}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor, color: fontColor }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ width: '25%', display: 'flex', alignItems: 'center' }}>
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="Logo" style={{ height: '32px', objectFit: 'contain', display: 'block', maxWidth: '100%' }} />
          ) : (
            <div style={{ height: '32px' }} />
          )}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontFamily: HEADING_FONT, fontSize: '2rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{data.title || 'Newsletter Title'}</h1>
        </div>
        <div style={{ width: '25%', textAlign: 'right' }}>
          <p style={{ fontSize: '12px', opacity: 0.8, margin: 0, lineHeight: 1.3 }}>{data.subtitle || 'Subtitle'}</p>
        </div>
      </div>
      {data.bannerUrl && (
        <img src={data.bannerUrl} alt="Banner" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// MEET THE ENGINEER — matches email renderEmailMeetEngineer
// Desktop: 25% photo column | 75% Q&A column
// Mobile: stacked, photo 100px
// ────────────────────────────────────────────────────

function MeetEngineerPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const qna: Array<{ id: string; question: string; answer: string }> = data.qna || [];
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  const roleColor = getSecondaryTextColor(bgColor, fontColor);
  const answerColor = getAnswerTextColor(bgColor, fontColor);
  const placeholderBg = getPlaceholderBg(bgColor);
  const previewMode = useEditorStore((s) => s.previewMode);
  const isMobile = previewMode === 'mobile';

  const photoSize = isMobile ? 100 : 150;

  return (
    <div>
      <div style={{
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: isMobile ? undefined : '25% 1fr',
        gap: '24px',
      }}>
        {/* Left Column — Profile */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'flex-start' : 'flex-start',
          gap: '16px',
          marginBottom: isMobile ? '16px' : undefined,
        }}>
          {data.photoUrl ? (
            <img
              src={data.photoUrl}
              alt={data.name}
              style={{
                width: `${photoSize}px`,
                height: `${photoSize}px`,
                objectFit: 'cover',
                borderRadius: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: `${photoSize}px`,
                height: `${photoSize}px`,
                borderRadius: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                backgroundColor: placeholderBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCircle style={{ width: '48px', height: '48px', color: roleColor }} />
            </div>
          )}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0', lineHeight: 1.3, color: fontColor }}>
              {data.name || 'Engineer Name'}
            </h3>
            <p style={{ fontSize: '14px', margin: '2px 0 0', color: roleColor }}>
              {data.role || 'Role'}
            </p>
          </div>
        </div>

        {/* Right Column — Q&A */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {qna.length > 0 ? (
            qna.map((item) => (
              <div key={item.id}>
                <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.6, color: fontColor }}>
                  Q: {item.question || 'Question?'}
                </p>
                <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.7, color: answerColor }}>
                  A: {item.answer || 'Answer...'}
                </p>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '14px', fontStyle: 'italic', opacity: 0.5 }}>Add Q&A items in the settings panel</p>
          )}
        </div>
      </div>

      {data.funFacts?.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: '4px' }}>Fun Facts</p>
          <ul style={{ fontSize: '14px', listStyleType: 'disc', listStylePosition: 'inside', opacity: 0.8, margin: 0, padding: 0 }}>
            {data.funFacts.map((f: string, i: number) => (
              <li key={i} style={{ marginBottom: '2px' }}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────
// APPRECIATION — matches email renderEmailAppreciation
// Grid with membersPerRow columns, same card sizing
// ────────────────────────────────────────────────────

function AppreciationPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const members = data.members || [];
  const membersPerRow = Math.min(Math.max(data.membersPerRow || 2, 1), 3);
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';

  if (members.length === 0) {
    return <p style={{ fontSize: '14px', opacity: 0.5, fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No members added yet</p>;
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${membersPerRow}, minmax(0, 1fr))`,
        gap: '8px',
      }}
    >
      {members.map((m: any) => {
        const cardBg = m.cardColor || '#e9e0cc';
        const cardPlaceholderBg = getPlaceholderBg(cardBg);
        const cardSecondary = getSecondaryTextColor(cardBg, fontColor);
        const photos = getMemberPhotos(m);
        return (
          <div
            key={m.id}
            style={{
              padding: '12px',
              textAlign: 'center',
              backgroundColor: cardBg,
              borderRadius: '15px',
              border: `1px solid ${isDarkBackground(bgColor) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {photos.length > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                {photos.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`${m.name || 'Member'} ${idx + 1}`}
                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '15px', display: 'block' }}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '15px',
                  backgroundColor: cardPlaceholderBg,
                  margin: '0 auto 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart style={{ width: '24px', height: '24px', color: cardSecondary }} />
              </div>
            )}
            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: fontColor, wordWrap: 'break-word', overflowWrap: 'break-word' }}>{m.name || 'Name'}</p>
            {m.message && (
              <div className="appreciation-message" style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px', color: fontColor, wordWrap: 'break-word', overflowWrap: 'break-word' }} dangerouslySetInnerHTML={{ __html: m.message }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────
// PROJECT UPDATE — matches email renderEmailProjectUpdate
// ────────────────────────────────────────────────────

function ProjectUpdatePreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const previewMode = useEditorStore((s) => s.previewMode);
  const isMobile = previewMode === 'mobile';
  const columns: number = Math.min(Math.max(data.columns || 1, 1), 3);
  const fontColor = data.fontColor || '#000000';
  // Support legacy contentColumns array or single content field
  const content: string = data.content
    || (data.contentColumns ? data.contentColumns.filter(Boolean).join('') : '')
    || '<p><em>No content yet</em></p>';

  return (
    <div
      className="project-update-content"
      style={{
        fontSize: '14px',
        lineHeight: 1.625,
        color: fontColor,
        columnCount: columns,
        columnGap: '12px',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        overflow: 'hidden',
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

// ────────────────────────────────────────────────────
// FOUNDER FOCUS — matches email renderEmailFounderFocus
// ────────────────────────────────────────────────────

function FounderFocusPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const fontColor = data.fontColor || '#000000';
  const bgColor = data.bgColor || '#f4efe5';
  const textAlign = (data.textAlign || 'center') as 'left' | 'center' | 'right';
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
        <p style={{ color: fontColor, fontSize: '20px', fontWeight: 300, fontFamily: "'Inter', sans-serif", fontStyle: 'italic', lineHeight: 1.3, margin: '0 0 12px' }}>
          "{data.quote}"
        </p>
      ) : (
        <p style={{ fontSize: '1.5rem', opacity: 0.5, fontStyle: 'italic', padding: '8px 0' }}>Add a quote...</p>
      )}
      <div>
        <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: fontColor }}>{data.name || 'Founder Name'}</p>
        <p style={{ fontSize: '12px', opacity: 0.7, margin: '2px 0 0' }}>{data.designation || 'Designation'}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// COMIC — matches email renderEmailComic
// ────────────────────────────────────────────────────

function ComicPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';
  const placeholderBg = getPlaceholderBg(bgColor);
  const captionPosition = data.captionPosition || 'below';
  const captionAlign = data.captionAlign || 'center';

  const imageElement = data.imageUrl ? (
    <img src={data.imageUrl} alt="Comic" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: captionPosition === 'below' ? '8px' : '0', marginTop: captionPosition === 'above' ? '8px' : '0', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
  ) : (
    <div style={{ width: '100%', height: '192px', borderRadius: '8px', backgroundColor: placeholderBg, marginBottom: captionPosition === 'below' ? '8px' : '0', marginTop: captionPosition === 'above' ? '8px' : '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Smile style={{ width: '48px', height: '48px', color: getSecondaryTextColor(bgColor, fontColor) }} />
    </div>
  );

  const captionElement = data.caption ? (
    <div
      className="comic-caption"
      style={{ fontSize: '14px', color: fontColor, margin: 0, textAlign: captionAlign }}
      dangerouslySetInnerHTML={{ __html: data.caption }}
    />
  ) : null;

  return (
    <div style={{ textAlign: 'center' }}>
      {captionPosition === 'above' ? (
        <>
          {captionElement}
          {imageElement}
        </>
      ) : (
        <>
          {imageElement}
          {captionElement}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// FOOTER — matches email renderEmailFooter
// Padding: 20px, center aligned
// ────────────────────────────────────────────────────

function FooterPreview({ data, theme }: { data: any; theme: ThemeConfig }) {
  const bgColor = data.bgColor || '#f4efe5';
  const fontColor = data.fontColor || '#000000';

  const getSocialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('linkedin')) return <Linkedin style={{ width: '16px', height: '16px' }} />;
    if (p.includes('instagram')) return <Instagram style={{ width: '16px', height: '16px' }} />;
    if (p.includes('facebook')) return <Facebook style={{ width: '16px', height: '16px' }} />;
    return <Globe style={{ width: '16px', height: '16px' }} />;
  };

  return (
    <div
      style={{ padding: '20px', textAlign: 'center', fontSize: '14px', backgroundColor: bgColor, color: fontColor }}
    >
      <div className="footer-content" style={{ lineHeight: 1.625, opacity: 0.7, marginBottom: '12px' }} dangerouslySetInnerHTML={{ __html: data.content || '<p>Visit the website: www.electronikmedia.com</p>' }} />
      {data.socialLinks?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
          {data.socialLinks.map((link: any, i: number) => (
            <a
              key={link.id || i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, opacity: 0.6, color: fontColor, textDecoration: 'underline' }}
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

// ───────────────────────────────────────────────────
// DIVIDER — matches email renderEmailDivider
// ────────────────────────────────────────────────────

function DividerPreview({ theme }: { theme: ThemeConfig }) {
  return (
    <div style={{ padding: '10px 20px' }}>
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid rgba(0,0,0,0.15)',
          margin: 0,
        }}
      />
    </div>
  );
}
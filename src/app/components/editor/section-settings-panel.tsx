import type { Section, AppreciationMember } from '../../lib/editor-types';
import { SECTION_TYPE_LABELS, PROJECT_STATUS_OPTIONS } from '../../lib/editor-types';
import { useEditorStore } from '../../lib/editor-store';
import { RichTextEditor } from './rich-text-editor';
import { ImageUpload } from './image-upload';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Plus, Trash2, GripVertical, X, Settings2, Palette, AlignLeft, AlignCenter, AlignRight, Image, FileText } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { MobileEditingBanner } from './mobile-override-badge';
import { MobileAwareColorField, MobileAwareColumnSelector, MobileAwareAlignmentSelector, MobileVisibilityToggle, MobileAwarePaddingField } from './mobile-aware-fields';
import { getMobileOverrideCount } from '../../lib/use-mobile-aware-data';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SectionSettingsPanel() {
  const section = useEditorStore((s) => s.selectedSection());
  const previewMode = useEditorStore((s) => s.previewMode);
  const clearAllMobileOverrides = useEditorStore((s) => s.clearAllMobileOverrides);

  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Settings2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Select a section to edit its settings</p>
      </div>
    );
  }

  const isMobile = previewMode === 'mobile';
  const overrideCount = getMobileOverrideCount(section);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Mobile editing banner */}
        {isMobile && (
          <MobileEditingBanner
            overrideCount={overrideCount}
            onClearAll={() => clearAllMobileOverrides(section.id)}
          />
        )}

        {/* Section type label */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {SECTION_TYPE_LABELS[section.baseType]}
          </h3>
        </div>

        {/* Mobile visibility + padding (shown in mobile mode for all section types) */}
        {isMobile && section.baseType !== 'divider' && (
          <>
            <MobileVisibilityToggle section={section} />
            <MobileAwarePaddingField section={section} />
            <Separator />
          </>
        )}

        {/* Type-specific settings */}
        {section.baseType === 'header' && <HeaderSettings section={section} />}
        {section.baseType === 'meet_engineer' && <MeetEngineerSettings section={section} />}
        {section.baseType === 'appreciation' && <AppreciationSettings section={section} />}
        {section.baseType === 'project_update' && <ProjectUpdateSettings section={section} />}
        {section.baseType === 'founder_focus' && <FounderFocusSettings section={section} />}
        {section.baseType === 'divider' && <DividerSettings />}
        {section.baseType === 'comic' && <ComicSettings section={section} />}
        {section.baseType === 'footer' && <FooterSettings section={section} />}
      </div>
    </ScrollArea>
  );
}

// --- Shared Color Section ---
function SectionColorFields({ section }: { section: Section }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
        <Label className="text-xs font-semibold">Section Colors</Label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MobileAwareColorField section={section} fieldKey="fontColor" label="Font Color" defaultValue="#000000" />
        <MobileAwareColorField section={section} fieldKey="bgColor" label="Background" defaultValue="#f4efe5" />
      </div>
    </div>
  );
}

// --- Header ---

function HeaderSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;
  return (
    <div className="space-y-4">
      <Field label="Title">
        <Input value={d.title || ''} onChange={(e) => updateData(section.id, { title: e.target.value })} className="text-sm" />
      </Field>
      <Field label="Subtitle">
        <Input value={d.subtitle || ''} onChange={(e) => updateData(section.id, { subtitle: e.target.value })} className="text-sm" />
      </Field>
      <Field label="Logo">
        <ImageUpload value={d.logoUrl || ''} onChange={(url) => updateData(section.id, { logoUrl: url })} aspectLabel="Recommended: square" />
      </Field>
      <Field label="Banner Image">
        <ImageUpload value={d.bannerUrl || ''} onChange={(url) => updateData(section.id, { bannerUrl: url })} aspectLabel="Recommended: 700x200" />
      </Field>

      <Separator />
      <SectionColorFields section={section} />
    </div>
  );
}

// --- Meet Engineer ---

function MeetEngineerSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;
  return (
    <div className="space-y-4">
      <Field label="Name">
        <Input value={d.name || ''} onChange={(e) => updateData(section.id, { name: e.target.value })} className="text-sm" />
      </Field>
      <Field label="Role">
        <Input value={d.role || ''} onChange={(e) => updateData(section.id, { role: e.target.value })} className="text-sm" />
      </Field>
      <Field label="Photo">
        <ImageUpload value={d.photoUrl || ''} onChange={(url) => updateData(section.id, { photoUrl: url })} aspectLabel="Square crop recommended" />
      </Field>

      <Separator />
      <SectionColorFields section={section} />
      <Separator />

      <QnAList sectionId={section.id} items={d.qna || []} />
      <FunFactsList sectionId={section.id} facts={d.funFacts || []} />
    </div>
  );
}

function QnAList({ sectionId, items }: { sectionId: string; items: Array<{ id: string; question: string; answer: string }> }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const addItem = () =>
    updateData(sectionId, { qna: [...items, { id: crypto.randomUUID(), question: '', answer: '' }] });
  const removeItem = (id: string) =>
    updateData(sectionId, { qna: items.filter((item) => item.id !== id) });
  const updateItem = (id: string, field: 'question' | 'answer', val: string) =>
    updateData(sectionId, { qna: items.map((item) => (item.id === id ? { ...item, [field]: val } : item)) });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Q&A ({items.length})</Label>
        <Button variant="ghost" size="sm" onClick={addItem} className="h-6 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add Q&A
        </Button>
      </div>
      {items.map((item) => (
        <div key={item.id} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Question & Answer</span>
            <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="h-6 w-6 p-0">
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
          <Input
            value={item.question}
            onChange={(e) => updateItem(item.id, 'question', e.target.value)}
            placeholder="Enter question..."
            className="text-sm"
          />
          <Textarea
            value={item.answer}
            onChange={(e) => updateItem(item.id, 'answer', e.target.value)}
            placeholder="Enter answer..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3 italic">
          Add questions & answers for this engineer
        </p>
      )}
    </div>
  );
}

function FunFactsList({ sectionId, facts }: { sectionId: string; facts: string[] }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const addFact = () => updateData(sectionId, { funFacts: [...facts, ''] });
  const removeFact = (i: number) => updateData(sectionId, { funFacts: facts.filter((_, idx) => idx !== i) });
  const updateFact = (i: number, val: string) => updateData(sectionId, { funFacts: facts.map((f, idx) => (idx === i ? val : f)) });
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Fun Facts</Label>
        <Button variant="ghost" size="sm" onClick={addFact} className="h-6 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>
      {facts.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input value={f} onChange={(e) => updateFact(i, e.target.value)} placeholder={`Fact ${i + 1}`} className="text-sm flex-1" />
          <Button variant="ghost" size="sm" onClick={() => removeFact(i)} className="h-8 w-8 p-0 shrink-0">
            <X className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// --- Appreciation ---

function AppreciationSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const { addAppreciationMember, removeAppreciationMember, updateAppreciationMember } = useEditorStore();
  const d = section.data;
  const members: AppreciationMember[] = d.members || [];

  return (
    <div className="space-y-4">
      <SectionColorFields section={section} />

      <Separator />

      {/* Members Per Row */}
      <MobileAwareColumnSelector
        section={section}
        fieldKey="membersPerRow"
        label="Members Per Row"
      />

      <Separator />

      {/* Members */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Members ({members.length})</Label>
        <Button variant="outline" size="sm" onClick={() => addAppreciationMember(section.id)} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add Member
        </Button>
      </div>
      {members.map((m) => (
        <div key={m.id} className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
              <span className="text-xs font-medium">{m.name || 'New Member'}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeAppreciationMember(section.id, m.id)} className="h-6 w-6 p-0">
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
          <Input
            value={m.name || ''}
            onChange={(e) => updateAppreciationMember(section.id, m.id, { name: e.target.value })}
            placeholder="Name"
            className="text-sm"
          />
          <MemberPhotosField
            member={m}
            sectionId={section.id}
            onUpdate={updateAppreciationMember}
          />
          {/* Card Color */}
          <div className="space-y-1.5">
            <Label className="text-xs">Card Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={m.cardColor || '#e9e0cc'}
                onChange={(e) => updateAppreciationMember(section.id, m.id, { cardColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={m.cardColor || '#e9e0cc'}
                onChange={(e) => updateAppreciationMember(section.id, m.id, { cardColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
          <RichTextEditor
            content={m.message || ''}
            onChange={(html) => updateAppreciationMember(section.id, m.id, { message: html })}
            placeholder="Appreciation message..."
            compact
            sectionId={section.id}
            fieldName={`member-${m.id}`}
          />
        </div>
      ))}
      {members.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 italic">
          Add team members to appreciate
        </p>
      )}
    </div>
  );
}

// --- Project Update ---

function ProjectUpdateSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;

  return (
    <div className="space-y-4">
      {/* 1. Status */}
      <Field label="Status">
        <Select value={d.status || 'in_progress'} onValueChange={(v) => updateData(section.id, { status: v })}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Separator />

      {/* 2. Content Columns */}
      <MobileAwareColumnSelector
        section={section}
        fieldKey="columns"
        label="Content Columns"
      />
      <p className="text-[10px] text-muted-foreground">Content auto-flows across columns</p>

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs">Content</Label>
        <RichTextEditor
          content={d.content || ''}
          onChange={(html) => updateData(section.id, { content: html })}
          placeholder="Write your update..."
          compact
          sectionId={section.id}
          fieldName="content"
        />
      </div>

      <Separator />

      {/* 3. Section Colors */}
      <SectionColorFields section={section} />
    </div>
  );
}

// --- Founder Focus ---

function FounderFocusSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;
  const alignOptions = [
    { value: 'left', icon: AlignLeft, label: 'Left' },
    { value: 'center', icon: AlignCenter, label: 'Center' },
    { value: 'right', icon: AlignRight, label: 'Right' },
  ];
  return (
    <div className="space-y-4">
      <Field label="Quote">
        <Textarea
          value={d.quote || ''}
          onChange={(e) => updateData(section.id, { quote: e.target.value })}
          placeholder="Enter a quote..."
          className="text-sm min-h-[80px] resize-y"
        />
      </Field>
      <Field label="Name">
        <Input value={d.name || ''} onChange={(e) => updateData(section.id, { name: e.target.value })} className="text-sm" />
      </Field>
      <Field label="Designation">
        <Input value={d.designation || ''} onChange={(e) => updateData(section.id, { designation: e.target.value })} className="text-sm" />
      </Field>

      {/* Text Alignment */}
      <MobileAwareAlignmentSelector
        section={section}
        fieldKey="textAlign"
        label="Alignment"
        options={alignOptions}
      />

      {/* Section Colors */}
      <Separator />
      <SectionColorFields section={section} />
    </div>
  );
}

// --- Divider ---

function DividerSettings() {
  return (
    <div className="py-4 text-center">
      <p className="text-xs text-muted-foreground italic">
        Simple horizontal divider with 10px top and bottom padding. No settings required.
      </p>
    </div>
  );
}

// --- Comic ---

// Sortable component items for drag-and-drop reordering
interface ComicItem {
  id: string;
  type: 'image' | 'caption';
}

function SortableComicItem({
  item,
  section,
  onUpdate,
}: {
  item: ComicItem;
  section: Section;
  onUpdate: (sectionId: string, data: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };

  const d = section.data;

  return (
    <div ref={setNodeRef} style={style} className="border border-border rounded-lg p-3 bg-muted/10">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing shrink-0 p-0.5 text-muted-foreground/50 hover:text-muted-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          {item.type === 'image' ? (
            <Image className="w-3.5 h-3.5 text-primary" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-primary" />
          )}
          <Label className="text-xs font-semibold">
            {item.type === 'image' ? 'Image' : 'Caption'}
          </Label>
        </div>
      </div>

      {item.type === 'image' ? (
        <ImageUpload
          value={d.imageUrl || ''}
          onChange={(url) => onUpdate(section.id, { imageUrl: url })}
          aspectLabel="Any size"
        />
      ) : (
        <div className="space-y-3">
          <RichTextEditor
            content={d.caption || ''}
            onChange={(html) => onUpdate(section.id, { caption: html })}
            placeholder="Write your caption with rich formatting..."
            compact
            sectionId={section.id}
            fieldName="comic-caption"
          />
          {/* Caption Alignment */}
          <div className="space-y-1.5">
            <Label className="text-xs">Caption Alignment</Label>
            <div className="flex items-center gap-1">
              {[
                { value: 'left', icon: AlignLeft, label: 'Left' },
                { value: 'center', icon: AlignCenter, label: 'Center' },
                { value: 'right', icon: AlignRight, label: 'Right' },
              ].map((opt) => {
                const Icon = opt.icon;
                const isActive = (d.captionAlign || 'center') === opt.value;
                return (
                  <Button
                    key={opt.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onUpdate(section.id, { captionAlign: opt.value })}
                    className="h-8 px-3 flex-1"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComicSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;

  // Build sortable items based on captionPosition
  const captionPosition = d.captionPosition || 'below';
  const items: ComicItem[] = useMemo(() => {
    if (captionPosition === 'above') {
      return [
        { id: 'caption', type: 'caption' as const },
        { id: 'image', type: 'image' as const },
      ];
    }
    return [
      { id: 'image', type: 'image' as const },
      { id: 'caption', type: 'caption' as const },
    ];
  }, [captionPosition]);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        // Toggle position
        const newPosition = captionPosition === 'above' ? 'below' : 'above';
        updateData(section.id, { captionPosition: newPosition });
      }
    },
    [captionPosition, section.id, updateData],
  );

  return (
    <div className="space-y-4">
      <Field label="Section Heading">
        <Input
          value={d.heading || 'title'}
          onChange={(e) => updateData(section.id, { heading: e.target.value })}
          placeholder="Section heading"
          className="text-sm"
        />
      </Field>

      <Separator />

      {/* Drag-and-drop reorder interface */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Content Layout</Label>
        <p className="text-[10px] text-muted-foreground mb-2">
          Drag to reorder image and caption
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableComicItem
                  key={item.id}
                  item={item}
                  section={section}
                  onUpdate={updateData}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Section Colors */}
      <Separator />
      <SectionColorFields section={section} />
    </div>
  );
}

// --- Footer ---

/** Ensure every social link has a unique id (backward compat with old data). */
function ensureLinkIds(links: any[]): any[] {
  let changed = false;
  const result = links.map((l) => {
    if (l.id) return l;
    changed = true;
    return { ...l, id: crypto.randomUUID() };
  });
  return changed ? result : links;
}

function SortableSocialLink({
  link,
  index,
  onUpdate,
  onRemove,
}: {
  link: any;
  index: number;
  onUpdate: (i: number, field: string, val: string) => void;
  onRemove: (i: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5">
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing shrink-0 p-0.5 text-muted-foreground/50 hover:text-muted-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Input
        value={link.platform || ''}
        onChange={(e) => onUpdate(index, 'platform', e.target.value)}
        placeholder="Platform"
        className="text-sm w-24"
      />
      <Input
        value={link.url || ''}
        onChange={(e) => onUpdate(index, 'url', e.target.value)}
        placeholder="https://..."
        className="text-sm flex-1"
      />
      <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-8 w-8 p-0 shrink-0">
        <X className="w-3.5 h-3.5 text-destructive" />
      </Button>
    </div>
  );
}

function FooterSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;
  const rawLinks = d.socialLinks || [];

  // Compute links with stable ids (pure, no side effects)
  const links = useMemo(() => ensureLinkIds(rawLinks), [rawLinks]);

  // Persist ids back to the store if they were missing (side effect, runs after render)
  useEffect(() => {
    if (links !== rawLinks && rawLinks.length > 0) {
      updateData(section.id, { socialLinks: links });
    }
  }, [links, rawLinks, section.id, updateData]);

  const linkIds = useMemo(() => links.map((l: any) => l.id), [links]);

  const addLink = useCallback(
    () => updateData(section.id, { socialLinks: [...links, { id: crypto.randomUUID(), platform: '', url: '' }] }),
    [links, section.id, updateData],
  );
  const removeLink = useCallback(
    (i: number) => updateData(section.id, { socialLinks: links.filter((_: any, idx: number) => idx !== i) }),
    [links, section.id, updateData],
  );
  const updateLink = useCallback(
    (i: number, field: string, val: string) => {
      updateData(section.id, {
        socialLinks: links.map((l: any, idx: number) => (idx === i ? { ...l, [field]: val } : l)),
      });
    },
    [links, section.id, updateData],
  );

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = links.findIndex((l: any) => l.id === active.id);
        const newIndex = links.findIndex((l: any) => l.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          updateData(section.id, { socialLinks: arrayMove(links, oldIndex, newIndex) });
        }
      }
    },
    [links, section.id, updateData],
  );

  return (
    <div className="space-y-4">
      <Field label="Footer Content">
        <RichTextEditor content={d.content || ''} onChange={(html) => updateData(section.id, { content: html })} compact sectionId={section.id} fieldName="footer-content" />
      </Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Social Links</Label>
          <Button variant="ghost" size="sm" onClick={addLink} className="h-6 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        {links.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={linkIds} strategy={verticalListSortingStrategy}>
              {links.map((link: any, i: number) => (
                <SortableSocialLink
                  key={link.id}
                  link={link}
                  index={i}
                  onUpdate={updateLink}
                  onRemove={removeLink}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2 italic">
            No social links added yet
          </p>
        )}
      </div>

      {/* Section Colors */}
      <Separator />
      <SectionColorFields section={section} />
    </div>
  );
}

// --- Shared ---

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// --- Member Photos Field ---

const MAX_MEMBER_PHOTOS = 4;

/** Resolve the effective photo URLs for a member (backward compat). */
export function getMemberPhotos(member: { photoUrl?: string; photoUrls?: string[] }): string[] {
  if (member.photoUrls && member.photoUrls.length > 0) {
    return member.photoUrls;
  }
  if (member.photoUrl) {
    return [member.photoUrl];
  }
  return [];
}

function MemberPhotosField({
  member,
  sectionId,
  onUpdate,
}: {
  member: AppreciationMember;
  sectionId: string;
  onUpdate: (sectionId: string, memberId: string, data: Partial<AppreciationMember>) => void;
}) {
  const photos = getMemberPhotos(member);
  const canAdd = photos.length < MAX_MEMBER_PHOTOS;

  const syncPhotos = useCallback(
    (newPhotos: string[]) => {
      onUpdate(sectionId, member.id, {
        photoUrls: newPhotos,
        photoUrl: newPhotos[0] || '',
      });
    },
    [sectionId, member.id, onUpdate],
  );

  const addPhoto = useCallback(
    (url: string) => {
      if (photos.length >= MAX_MEMBER_PHOTOS) return;
      syncPhotos([...photos, url]);
    },
    [photos, syncPhotos],
  );

  const removePhoto = useCallback(
    (idx: number) => {
      syncPhotos(photos.filter((_, i) => i !== idx));
    },
    [photos, syncPhotos],
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Photos ({photos.length}/{MAX_MEMBER_PHOTOS})</Label>
      </div>

      {/* Photo thumbnails row */}
      {photos.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {photos.map((url, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                className="w-14 h-14 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add photo (reuse ImageUpload for a new slot) */}
      {canAdd && (
        <ImageUpload
          value=""
          onChange={(url) => { if (url) addPhoto(url); }}
          aspectLabel={photos.length === 0 ? 'Square' : `Add photo (${photos.length}/${MAX_MEMBER_PHOTOS})`}
        />
      )}
    </div>
  );
}
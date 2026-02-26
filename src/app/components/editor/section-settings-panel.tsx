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
import { Plus, Trash2, GripVertical, X, Settings2, Palette, LayoutGrid, Columns, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';

export function SectionSettingsPanel() {
  const section = useEditorStore((s) => s.selectedSection());
  const updateData = useEditorStore((s) => s.updateSectionData);

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

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Section type label */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {SECTION_TYPE_LABELS[section.baseType]}
          </h3>
        </div>

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
        <ImageUpload value={d.bannerUrl || ''} onChange={(url) => updateData(section.id, { bannerUrl: url })} aspectLabel="Recommended: 600x200" />
      </Field>

      {/* Section Colors */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold">Section Colors</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>
        {/* Color preview strip */}
        <div
          className="h-6 rounded-md border border-border flex items-center justify-center text-xs font-medium"
          style={{ backgroundColor: d.bgColor || '#f4efe5', color: d.fontColor || '#000000' }}
        >
          Preview
        </div>
      </div>
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

      {/* Section Colors */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold">Section Colors</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>
        {/* Color preview strip */}
        <div
          className="h-6 rounded-md border border-border flex items-center justify-center text-xs font-medium"
          style={{ backgroundColor: d.bgColor || '#f4efe5', color: d.fontColor || '#000000' }}
        >
          Preview
        </div>
      </div>
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
      {/* Section Colors */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold">Section Colors</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>
        {/* Color preview strip */}
        <div
          className="h-6 rounded-md border border-border flex items-center justify-center text-xs font-medium"
          style={{ backgroundColor: d.bgColor || '#f4efe5', color: d.fontColor || '#000000' }}
        >
          Preview
        </div>
      </div>

      <Separator />

      {/* Members Per Row */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold">Members Per Row</Label>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => updateData(section.id, { membersPerRow: n })}
              className={`flex-1 h-8 rounded-md border text-xs font-medium transition-colors ${
                (d.membersPerRow || 2) === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              {n} {n === 1 ? 'column' : 'columns'}
            </button>
          ))}
        </div>
      </div>

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
          <ImageUpload
            value={m.photoUrl || ''}
            onChange={(url) => updateAppreciationMember(section.id, m.id, { photoUrl: url })}
            aspectLabel="Square"
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
  const columns: number = Math.min(Math.max(d.columns || 1, 1), 3);

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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Columns className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold">Content Columns</Label>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => updateData(section.id, { columns: n })}
              className={`flex-1 h-8 rounded-md border text-xs font-medium transition-colors ${
                columns === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              {n} {n === 1 ? 'column' : 'columns'}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Content auto-flows across columns</p>
      </div>

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
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold">Section Colors</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>
        {/* Color preview strip */}
        <div
          className="h-6 rounded-md border border-border flex items-center justify-center text-xs font-medium"
          style={{ backgroundColor: d.bgColor || '#f4efe5', color: d.fontColor || '#000000' }}
        >
          Preview
        </div>
      </div>
    </div>
  );
}

// --- Founder Focus ---

function FounderFocusSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;
  const textAlign = d.textAlign || 'center';
  const alignOptions: Array<{ value: string; icon: typeof AlignLeft; label: string }> = [
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
      <Field label="Alignment">
        <div className="flex items-center gap-1">
          {alignOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = textAlign === opt.value;
            return (
              <Button
                key={opt.value}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                className={`flex-1 gap-1.5 ${isActive ? 'ring-2 ring-primary/30' : ''}`}
                onClick={() => updateData(section.id, { textAlign: opt.value })}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs">{opt.label}</span>
              </Button>
            );
          })}
        </div>
      </Field>

      {/* Section Colors */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold">Section Colors</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.fontColor || '#000000'}
                onChange={(e) => updateData(section.id, { fontColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
              />
              <Input
                value={d.bgColor || '#f4efe5'}
                onChange={(e) => updateData(section.id, { bgColor: e.target.value })}
                className="text-xs flex-1 font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>
        {/* Color preview strip */}
        <div
          className="h-6 rounded-md border border-border flex items-center justify-center text-xs font-medium"
          style={{ backgroundColor: d.bgColor || '#f4efe5', color: d.fontColor || '#000000' }}
        >
          Preview
        </div>
      </div>
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

function ComicSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;
  const fontColor = d.fontColor || '#000000';
  const bgColor = d.bgColor || '#f4efe5';
  return (
    <div className="space-y-4">
      <Field label="Section Heading">
        <Input value={d.heading || 'title'} onChange={(e) => updateData(section.id, { heading: e.target.value })} placeholder="Section heading" className="text-sm" />
      </Field>
      <Field label="Image">
        <ImageUpload value={d.imageUrl || ''} onChange={(url) => updateData(section.id, { imageUrl: url })} aspectLabel="Any size" />
      </Field>
      <Field label="Caption">
        <Input value={d.caption || ''} onChange={(e) => updateData(section.id, { caption: e.target.value })} placeholder="Optional caption" className="text-sm" />
      </Field>

      {/* Section Colors */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Section Colors</p>
        <div className="space-y-3">
          <Field label="Font Color">
            <div className="flex items-center gap-2">
              <input type="color" value={fontColor} onChange={(e) => updateData(section.id, { fontColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border" />
              <Input value={fontColor} onChange={(e) => updateData(section.id, { fontColor: e.target.value })} className="text-xs font-mono flex-1" />
            </div>
          </Field>
          <Field label="Background Color">
            <div className="flex items-center gap-2">
              <input type="color" value={bgColor} onChange={(e) => updateData(section.id, { bgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border" />
              <Input value={bgColor} onChange={(e) => updateData(section.id, { bgColor: e.target.value })} className="text-xs font-mono flex-1" />
            </div>
          </Field>
          <div className="h-3 rounded-md border border-border" style={{ background: `linear-gradient(to right, ${bgColor}, ${fontColor})` }} />
        </div>
      </div>
    </div>
  );
}

// --- Footer ---

function FooterSettings({ section }: { section: Section }) {
  const updateData = useEditorStore((s) => s.updateSectionData);
  const d = section.data;
  const links = d.socialLinks || [];
  const fontColor = d.fontColor || '#000000';
  const bgColor = d.bgColor || '#f4efe5';

  const addLink = () => updateData(section.id, { socialLinks: [...links, { platform: '', url: '' }] });
  const removeLink = (i: number) => updateData(section.id, { socialLinks: links.filter((_: any, idx: number) => idx !== i) });
  const updateLink = (i: number, field: string, val: string) => {
    updateData(section.id, {
      socialLinks: links.map((l: any, idx: number) => (idx === i ? { ...l, [field]: val } : l)),
    });
  };

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
        {links.map((link: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              value={link.platform || ''}
              onChange={(e) => updateLink(i, 'platform', e.target.value)}
              placeholder="Platform"
              className="text-sm w-24"
            />
            <Input
              value={link.url || ''}
              onChange={(e) => updateLink(i, 'url', e.target.value)}
              placeholder="https://..."
              className="text-sm flex-1"
            />
            <Button variant="ghost" size="sm" onClick={() => removeLink(i)} className="h-8 w-8 p-0 shrink-0">
              <X className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Section Colors */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Section Colors</p>
        <div className="space-y-3">
          <Field label="Font Color">
            <div className="flex items-center gap-2">
              <input type="color" value={fontColor} onChange={(e) => updateData(section.id, { fontColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border" />
              <Input value={fontColor} onChange={(e) => updateData(section.id, { fontColor: e.target.value })} className="text-xs font-mono flex-1" />
            </div>
          </Field>
          <Field label="Background Color">
            <div className="flex items-center gap-2">
              <input type="color" value={bgColor} onChange={(e) => updateData(section.id, { bgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border" />
              <Input value={bgColor} onChange={(e) => updateData(section.id, { bgColor: e.target.value })} className="text-xs font-mono flex-1" />
            </div>
          </Field>
          <div className="h-3 rounded-md border border-border" style={{ background: `linear-gradient(to right, ${bgColor}, ${fontColor})` }} />
        </div>
      </div>
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
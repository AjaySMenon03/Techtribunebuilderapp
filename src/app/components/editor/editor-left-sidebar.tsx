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
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useMemo } from 'react';
import { useEditorStore } from '../../lib/editor-store';
import { useCollabStore } from '../../lib/collab-store';
import {
  SECTION_TYPE_LABELS,
  type SectionBaseType,
  type Section,
} from '../../lib/editor-types';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Plus,
  GripVertical,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Newspaper,
  UserCircle,
  Heart,
  Rocket,
  Smile,
  ArrowDown,
  Layers,
  Quote,
  Minus,
} from 'lucide-react';

const SECTION_ICONS: Record<SectionBaseType, React.ReactNode> = {
  header: <Newspaper className="w-3.5 h-3.5" />,
  meet_engineer: <UserCircle className="w-3.5 h-3.5" />,
  appreciation: <Heart className="w-3.5 h-3.5" />,
  project_update: <Rocket className="w-3.5 h-3.5" />,
  founder_focus: <Quote className="w-3.5 h-3.5" />,
  divider: <Minus className="w-3.5 h-3.5" />,
  comic: <Smile className="w-3.5 h-3.5" />,
  footer: <ArrowDown className="w-3.5 h-3.5" />,
};

const ADDABLE_SECTIONS: SectionBaseType[] = [
  'header',
  'founder_focus',
  'meet_engineer',
  'appreciation',
  'project_update',
  'comic',
  'footer',
  'divider',
];

export function EditorLeftSidebar({ className }: { className?: string }) {
  const { sections, selectedSectionId, selectSection, addSection, reorderSections } = useEditorStore();
  const remoteUsers = useCollabStore((s) => s.remoteUsers);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderSections(String(active.id), String(over.id));
    }
  }, [reorderSections]);

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  // Build map of sectionId → editing users
  const editingUsersMap: Record<string, { name: string; color: string }[]> = {};
  for (const user of remoteUsers) {
    if (user.editingSectionId) {
      if (!editingUsersMap[user.editingSectionId]) {
        editingUsersMap[user.editingSectionId] = [];
      }
      editingUsersMap[user.editingSectionId].push({ name: user.name, color: user.color });
    }
  }

  return (
    <div className={`${className || 'w-56 lg:w-64'} border-r border-border bg-card flex flex-col shrink-0 overflow-hidden ${className?.includes('flex-1') ? '' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Sections</span>
          <span className="text-xs text-muted-foreground">({sections.length})</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Plus className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ADDABLE_SECTIONS.map((type) => (
              <DropdownMenuItem key={type} onClick={() => addSection(type)}>
                <span className="mr-2">{SECTION_ICONS[type]}</span>
                {SECTION_TYPE_LABELS[type]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sortable list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {sections.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-muted-foreground mb-2">No sections yet</p>
              <p className="text-xs text-muted-foreground/60">Click + to add your first section</p>
            </div>
          ) : (
            <TooltipProvider delayDuration={300}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                  {sections.map((section) => (
                    <SortableSectionItem
                      key={section.id}
                      section={section}
                      isSelected={section.id === selectedSectionId}
                      onSelect={() => selectSection(section.id)}
                      editingUsers={editingUsersMap[section.id] || []}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </TooltipProvider>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SortableSectionItem({
  section,
  isSelected,
  onSelect,
  editingUsers,
}: {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  editingUsers: { name: string; color: string }[];
}) {
  const { duplicateSection, removeSection, toggleSectionVisibility } = useEditorStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const label = SECTION_TYPE_LABELS[section.baseType];
  const hasEditingUsers = editingUsers.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-1.5 px-2 py-2 rounded-lg mb-1 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-accent border border-transparent'
      } ${!section.visible ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      {/* Editing indicator (left border) */}
      {hasEditingUsers && (
        <div
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
          style={{ backgroundColor: editingUsers[0].color }}
        />
      )}

      {/* Drag handle */}
      <button
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Icon */}
      <span className={isSelected ? 'text-primary' : 'text-muted-foreground'}>
        {SECTION_ICONS[section.baseType]}
      </span>

      {/* Label */}
      <span className="flex-1 text-xs font-medium truncate">{label}</span>

      {/* Editing users indicators */}
      {hasEditingUsers && (
        <div className="flex items-center -space-x-1 mr-0.5 shrink-0">
          {editingUsers.slice(0, 2).map((eu, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-card"
                  style={{ backgroundColor: eu.color }}
                >
                  {eu.name[0]?.toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {eu.name} is editing...
              </TooltipContent>
            </Tooltip>
          ))}
          {editingUsers.length > 2 && (
            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground border border-card">
              +{editingUsers.length - 2}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background"
          onClick={(e) => { e.stopPropagation(); toggleSectionVisibility(section.id); }}
          title={section.visible ? 'Hide' : 'Show'}
        >
          {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background"
          onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }}
          title="Duplicate"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
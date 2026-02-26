/**
 * Profile Editor – Layer Panel (left sidebar, 250px).
 *
 * Lists all layers with drag-to-reorder via @dnd-kit,
 * visibility toggle, lock toggle, and per-layer actions.
 */

import { memo, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  GripVertical,
  Image as ImageIcon,
  Square,
  Type,
  Layers,
  Plus,
  ImagePlus,
  Library,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu';
import type { EditorLayer, LayerType } from '../../utils/editor-types';

// ─── Props ───────────────────────────────────────────────
interface LayerPanelProps {
  layers: EditorLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onReorderLayers: (from: number, to: number) => void;
  onAddLayer: (type: LayerType) => void;
  onAddImageLayer: (src: string, w: number, h: number) => void;
  onOpenAssetBrowser?: () => void;
}

// ─── Icon per type ───────────────────────────────────────
function LayerIcon({ type }: { type: LayerType }) {
  switch (type) {
    case 'background':
      return <Square className="w-3.5 h-3.5 text-amber-500" />;
    case 'image':
      return <ImageIcon className="w-3.5 h-3.5 text-blue-500" />;
    case 'foreground':
      return <Layers className="w-3.5 h-3.5 text-purple-500" />;
    case 'name':
      return <Type className="w-3.5 h-3.5 text-emerald-500" />;
    default:
      return <Square className="w-3.5 h-3.5" />;
  }
}

// ─── Sortable Layer Item ─────────────────────────────────
interface SortableItemProps {
  layer: EditorLayer;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableLayerItem({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-accent text-foreground'
      } ${!layer.visible ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <button
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Icon + name */}
      <LayerIcon type={layer.type} />
      <span className="flex-1 truncate text-xs font-medium">{layer.name}</span>

      {/* Quick actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          className="p-0.5 rounded hover:bg-accent/80 text-muted-foreground hover:text-foreground"
          title={layer.visible ? 'Hide' : 'Show'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
        >
          {layer.visible ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
        </button>
        <button
          className="p-0.5 rounded hover:bg-accent/80 text-muted-foreground hover:text-foreground"
          title={layer.locked ? 'Unlock' : 'Lock'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
        >
          {layer.locked ? (
            <Lock className="w-3 h-3 text-amber-500" />
          ) : (
            <Unlock className="w-3 h-3" />
          )}
        </button>

        {/* More actions – only show on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          <button
            className="p-0.5 rounded hover:bg-accent/80 text-muted-foreground hover:text-foreground"
            title="Duplicate"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────
export const LayerPanel = memo(function LayerPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  onDuplicateLayer,
  onReorderLayers,
  onAddLayer,
  onAddImageLayer,
  onOpenAssetBrowser,
}: LayerPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const fromIndex = layers.findIndex((l) => l.id === active.id);
      const toIndex = layers.findIndex((l) => l.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        onReorderLayers(fromIndex, toIndex);
      }
    },
    [layers, onReorderLayers],
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        onAddImageLayer(url, img.naturalWidth, img.naturalHeight);
      };
      img.src = url;
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [onAddImageLayer],
  );

  // Layers are displayed top→bottom (reverse of render order)
  const displayLayers = [...layers].reverse();

  return (
    <div className="w-full lg:w-[250px] h-full bg-card border-r border-border flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Layers
        </h3>

        {/* Add layer dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onAddLayer('background')}>
              <Square className="w-4 h-4 mr-2 text-amber-500" />
              Background
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="w-4 h-4 mr-2 text-blue-500" />
              Image (Upload)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onOpenAssetBrowser?.()}
            >
              <Library className="w-4 h-4 mr-2 text-blue-500" />
              Image (Library)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddLayer('foreground')}>
              <Layers className="w-4 h-4 mr-2 text-purple-500" />
              Foreground
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddLayer('name')}>
              <Type className="w-4 h-4 mr-2 text-emerald-500" />
              Name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Layers className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No layers yet</p>
            <p className="text-[10px] mt-1">Add a layer to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayLayers.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {displayLayers.map((layer) => (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  isSelected={layer.id === selectedLayerId}
                  onSelect={() => onSelectLayer(layer.id)}
                  onToggleVisibility={() => onToggleVisibility(layer.id)}
                  onToggleLock={() => onToggleLock(layer.id)}
                  onDelete={() => onDeleteLayer(layer.id)}
                  onDuplicate={() => onDuplicateLayer(layer.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Asset Library quick-access */}
      {onOpenAssetBrowser && (
        <div className="px-3 py-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7"
            onClick={onOpenAssetBrowser}
          >
            <Library className="w-3 h-3 mr-1.5" />
            Asset Library
          </Button>
        </div>
      )}
    </div>
  );
});
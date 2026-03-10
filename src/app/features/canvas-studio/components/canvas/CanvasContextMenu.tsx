import { useEffect, useRef } from 'react';
import {
  Copy,
  Clipboard,
  Trash2,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Group,
  Ungroup,
  Maximize2,
  ClipboardCopy,
} from 'lucide-react';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';
import type { CanvasCoreHandle } from './CanvasCore';

interface CanvasContextMenuProps {
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export default function CanvasContextMenu({ canvasRef }: CanvasContextMenuProps) {
  const { contextMenuPos, setContextMenuPos, selectedObjectIds, clipboard } = useCanvasStudioStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const hasSelection = selectedObjectIds.length > 0;
  const hasMultiple = selectedObjectIds.length > 1;

  // Close on click outside / escape
  useEffect(() => {
    if (!contextMenuPos) return;

    const handleClick = () => setContextMenuPos(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenuPos(null);
    };
    const handleScroll = () => setContextMenuPos(null);

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenuPos, setContextMenuPos]);

  if (!contextMenuPos) return null;

  const handleCopy = () => {
    const canvas = canvasRef.current?.getCanvas();
    const active = canvas?.getActiveObject();
    if (active) {
      active.clone().then((cloned: any) => {
        const json = JSON.stringify(cloned.toJSON(['meta']));
        useCanvasStudioStore.getState().setClipboard({ json, offset: 0 });
      });
    }
    setContextMenuPos(null);
  };

  const handlePaste = () => {
    const { clipboard } = useCanvasStudioStore.getState();
    if (!clipboard) return;
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    import('fabric').then((fabric) => {
      const newOffset = clipboard.offset + 20;
      fabric.util.enlivenObjects([JSON.parse(clipboard.json)]).then((objects: any[]) => {
        objects.forEach((obj: any) => {
          obj.set({ left: (obj.left ?? 0) + newOffset, top: (obj.top ?? 0) + newOffset });
          canvas.add(obj);
          canvas.setActiveObject(obj);
        });
        canvas.requestRenderAll();
        canvasRef.current?.saveSnapshot();
        useCanvasStudioStore.getState().setClipboard({ ...clipboard, offset: newOffset });
      });
    });
    setContextMenuPos(null);
  };

  const items: (MenuItem | 'divider')[] = [
    {
      label: 'Copy', icon: <Copy className="w-3.5 h-3.5" />, shortcut: 'Ctrl+C',
      action: handleCopy, disabled: !hasSelection,
    },
    {
      label: 'Paste', icon: <Clipboard className="w-3.5 h-3.5" />, shortcut: 'Ctrl+V',
      action: handlePaste, disabled: !clipboard,
    },
    {
      label: 'Duplicate', icon: <ClipboardCopy className="w-3.5 h-3.5" />, shortcut: 'Ctrl+D',
      action: () => { canvasRef.current?.duplicateSelected(); setContextMenuPos(null); },
      disabled: !hasSelection,
    },
    'divider',
    {
      label: 'Bring to Front', icon: <ChevronsUp className="w-3.5 h-3.5" />,
      action: () => { canvasRef.current?.bringToFront(); setContextMenuPos(null); },
      disabled: !hasSelection,
    },
    {
      label: 'Bring Forward', icon: <ChevronUp className="w-3.5 h-3.5" />, shortcut: 'Ctrl+]',
      action: () => { canvasRef.current?.bringForward(); setContextMenuPos(null); },
      disabled: !hasSelection,
    },
    {
      label: 'Send Backward', icon: <ChevronDown className="w-3.5 h-3.5" />, shortcut: 'Ctrl+[',
      action: () => { canvasRef.current?.sendBackward(); setContextMenuPos(null); },
      disabled: !hasSelection,
    },
    {
      label: 'Send to Back', icon: <ChevronsDown className="w-3.5 h-3.5" />,
      action: () => { canvasRef.current?.sendToBack(); setContextMenuPos(null); },
      disabled: !hasSelection,
    },
    'divider',
    {
      label: 'Group', icon: <Group className="w-3.5 h-3.5" />, shortcut: 'Ctrl+G',
      action: () => { canvasRef.current?.groupSelected(); setContextMenuPos(null); },
      disabled: !hasMultiple,
    },
    {
      label: 'Ungroup', icon: <Ungroup className="w-3.5 h-3.5" />,
      action: () => { canvasRef.current?.ungroupSelected(); setContextMenuPos(null); },
      disabled: !hasSelection,
    },
    {
      label: 'Select All', icon: <Maximize2 className="w-3.5 h-3.5" />, shortcut: 'Ctrl+A',
      action: () => { canvasRef.current?.selectAll(); setContextMenuPos(null); },
    },
    'divider',
    {
      label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, shortcut: 'Del',
      action: () => { canvasRef.current?.deleteSelected(); setContextMenuPos(null); },
      disabled: !hasSelection, danger: true,
    },
  ];

  // Position the menu so it doesn't go off screen
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: contextMenuPos.x,
    top: contextMenuPos.y,
    zIndex: 100,
  };

  return (
    <div ref={menuRef} style={menuStyle} onClick={(e) => e.stopPropagation()}>
      <div className="min-w-[200px] py-1 rounded-xl backdrop-blur-2xl bg-white/85 dark:bg-slate-900/85 border border-white/30 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {items.map((item, i) => {
          if (item === 'divider') {
            return <div key={`div-${i}`} className="h-px bg-border/30 my-1 mx-2" />;
          }
          return (
            <button
              key={item.label}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors ${
                item.disabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : item.danger
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled) item.action();
              }}
              disabled={item.disabled}
            >
              <span className="text-muted-foreground">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-[10px] text-muted-foreground/60 font-mono">{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

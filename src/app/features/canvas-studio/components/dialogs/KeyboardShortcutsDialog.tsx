import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';

const sections = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: ['V'], desc: 'Select' },
      { keys: ['H'], desc: 'Hand / Pan' },
      { keys: ['R'], desc: 'Rectangle' },
      { keys: ['C'], desc: 'Circle' },
      { keys: ['L'], desc: 'Line' },
      { keys: ['A'], desc: 'Arrow' },
      { keys: ['S'], desc: 'Star' },
      { keys: ['T'], desc: 'Text' },
      { keys: ['N'], desc: 'Sticky Note' },
      { keys: ['B'], desc: 'Brush' },
      { keys: ['X'], desc: 'Eraser' },
    ],
  },
  {
    title: 'Canvas',
    shortcuts: [
      { keys: ['Space', 'Drag'], desc: 'Pan canvas' },
      { keys: ['Ctrl', 'Scroll'], desc: 'Zoom in / out' },
      { keys: ['Ctrl', 'A'], desc: 'Select all' },
      { keys: ['Del'], desc: 'Delete selected' },
      { keys: ['G'], desc: 'AI Generator' },
      { keys: ['?'], desc: 'This dialog' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], desc: 'Undo' },
      { keys: ['Ctrl', 'Y'], desc: 'Redo' },
      { keys: ['Ctrl', 'C'], desc: 'Copy' },
      { keys: ['Ctrl', 'V'], desc: 'Paste' },
      { keys: ['Ctrl', 'D'], desc: 'Duplicate' },
      { keys: ['Ctrl', ']'], desc: 'Bring forward' },
      { keys: ['Ctrl', '['], desc: 'Send backward' },
    ],
  },
];

export default function KeyboardShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useCanvasStudioStore();

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-lg backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border-white/20 dark:border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="w-5 h-5 text-muted-foreground" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-3">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((s) => (
                  <div key={s.desc} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground/80">{s.desc}</span>
                    <div className="flex items-center gap-0.5">
                      {s.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-md bg-muted/80 text-[10px] font-mono text-muted-foreground border border-border/50 shadow-sm">
                            {key}
                          </kbd>
                          {i < s.keys.length - 1 && <span className="text-[10px] text-muted-foreground/40 mx-0.5">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

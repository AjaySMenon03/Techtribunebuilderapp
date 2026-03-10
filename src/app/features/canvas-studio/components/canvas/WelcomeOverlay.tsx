import {
  MousePointer2,
  Shapes,
  Type,
  StickyNote,
  Sparkles,
  Hand,
} from 'lucide-react';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';

interface WelcomeOverlayProps {
  visible: boolean;
}

const tips = [
  { icon: <MousePointer2 className="w-4 h-4" />, label: 'Select', shortcut: 'V', desc: 'Click to select objects' },
  { icon: <Hand className="w-4 h-4" />, label: 'Pan', shortcut: 'Space + Drag', desc: 'Navigate the canvas' },
  { icon: <Shapes className="w-4 h-4" />, label: 'Shapes', shortcut: 'R / C / L', desc: 'Draw shapes on canvas' },
  { icon: <Type className="w-4 h-4" />, label: 'Text', shortcut: 'T', desc: 'Add text blocks' },
  { icon: <StickyNote className="w-4 h-4" />, label: 'Sticky', shortcut: 'N', desc: 'Add sticky notes' },
  { icon: <Sparkles className="w-4 h-4" />, label: 'AI', shortcut: 'G', desc: 'Generate with AI' },
];

export default function WelcomeOverlay({ visible }: WelcomeOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-6 max-w-md px-8 animate-in fade-in-0 duration-500">
        {/* Logo / title area */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Shapes className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-foreground/80">Canvas Studio</h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Start creating by selecting a tool from the toolbar below, or try these shortcuts:
          </p>
        </div>

        {/* Quick tips grid */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {tips.map((tip) => (
            <div
              key={tip.label}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/30 dark:border-white/10"
            >
              <div className="text-muted-foreground">{tip.icon}</div>
              <span className="text-[11px] font-medium text-foreground/70">{tip.label}</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-muted/80 text-[9px] font-mono text-muted-foreground border border-border/50">
                {tip.shortcut}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/60">
          Press <kbd className="px-1 py-0.5 rounded bg-muted/60 text-[10px] font-mono border border-border/30">?</kbd> for all shortcuts
        </p>
      </div>
    </div>
  );
}

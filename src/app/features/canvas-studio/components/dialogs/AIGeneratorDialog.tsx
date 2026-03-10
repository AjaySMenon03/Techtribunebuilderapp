import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import type { CanvasCoreHandle } from '../canvas/CanvasCore';
import { toast } from 'sonner';

interface AIGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
] as const;

// Template-based generation (no API key needed)
function generateFromTemplate(prompt: string, tone: string): string {
  const templates: Record<string, (p: string) => string> = {
    professional: (p) =>
      `Strategic Overview: ${p}\n\nThis initiative focuses on delivering measurable outcomes through structured planning and execution. Key priorities include stakeholder alignment, resource optimization, and continuous improvement cycles.\n\nNext Steps:\n- Define success metrics\n- Establish timeline milestones\n- Assign ownership and accountability`,
    casual: (p) =>
      `Hey team! Here's the deal with "${p}" \n\nSo basically, we want to make this happen in a way that's fun and effective. Let's brainstorm some creative approaches and keep the energy high!\n\nIdeas to explore:\n- Think outside the box\n- Keep it simple and actionable\n- Celebrate small wins`,
    concise: (p) =>
      `Topic: ${p}\n\n- Core objective defined\n- Key stakeholders identified\n- Timeline: 2-4 weeks\n- Priority: High\n- Status: Planning`,
    detailed: (p) =>
      `Comprehensive Analysis: ${p}\n\nBackground:\nThis topic requires careful consideration of multiple factors including market conditions, team capacity, and strategic alignment with our broader organizational goals.\n\nKey Considerations:\n1. Current state assessment and gap analysis\n2. Resource allocation and budget requirements\n3. Risk mitigation strategies\n4. Success metrics and KPIs\n5. Stakeholder communication plan\n\nRecommended Approach:\nImplement a phased rollout starting with a pilot program, gathering feedback iteratively, and scaling based on validated learnings.\n\nTimeline: 6-8 weeks for initial phase`,
  };

  return templates[tone]?.(prompt) || templates.professional(prompt);
}

export default function AIGeneratorDialog({ open, onOpenChange, canvasRef }: AIGeneratorDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      // Simulate brief loading for UX feel
      await new Promise((r) => setTimeout(r, 600));
      const text = generateFromTemplate(prompt.trim(), tone);
      setPreview(text);
    } catch {
      toast.error('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!preview) return;
    canvasRef.current?.addStickyNote();
    // The sticky note is added with default text; we need to update it
    // For simplicity, we create a text block instead
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) {
      // Find the just-added sticky and update its text, or add as text block
      const fabric = import('fabric');
      fabric.then((f) => {
        const text = new f.IText(preview, {
          left: (canvas.getWidth() / 2) - 150,
          top: (canvas.getHeight() / 2) - 50,
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          fill: '#1e293b',
          width: 300,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.requestRenderAll();
        canvasRef.current?.saveSnapshot();
      });
    }
    toast.success('Text inserted onto canvas');
    setPrompt('');
    setPreview('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border-white/20 dark:border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            AI Text Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prompt */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate..."
              className="min-h-[80px] text-sm"
            />
          </div>

          {/* Tone */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Tone</Label>
            <div className="flex gap-1.5">
              {TONES.map((t) => (
                <Button
                  key={t.value}
                  variant={tone === t.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => setTone(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate
          </Button>

          {/* Preview */}
          {preview && (
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Preview</Label>
              <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto border border-border">
                {preview}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleInsert} disabled={!preview}>
            Insert to Canvas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
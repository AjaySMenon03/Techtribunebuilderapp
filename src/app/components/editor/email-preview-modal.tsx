/**
 * Email Preview Modal.
 * Renders the generated email HTML inside an iframe for accurate preview,
 * with Desktop / Mobile viewport toggle and Download / Copy / Send Test actions.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { generateEmailHtml, type EmailHtmlOptions } from '../../lib/export/email-renderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Monitor,
  Smartphone,
  Download,
  Clipboard,
  Send,
  Check,
  Loader2,
  X,
  Moon,
  Sun,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: EmailHtmlOptions;
}

type ViewportMode = 'desktop' | 'mobile';

export function EmailPreviewModal({ open, onOpenChange, options }: EmailPreviewModalProps) {
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [darkMode, setDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  // Reset dark mode to match options when modal opens
  useEffect(() => {
    if (open) {
      setDarkMode(options.darkMode);
    }
  }, [open, options.darkMode]);

  // Generate the email HTML with current dark mode state
  const emailHtml = generateEmailHtml({ ...options, darkMode });

  // Write HTML into iframe when it changes
  useEffect(() => {
    if (!open || showSource) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Use srcdoc for reliable initial render
    iframe.srcdoc = emailHtml;
  }, [emailHtml, open, showSource]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([emailHtml], { type: 'text/html;charset=utf-8' });
    const safeName = (options.title || 'newsletter')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    saveAs(blob, `${safeName}-email.html`);
    toast.success('Email HTML downloaded!');
  }, [emailHtml, options.title]);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([emailHtml], { type: 'text/html' }),
          'text/plain': new Blob([emailHtml], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(emailHtml);
      }
      setCopied(true);
      toast.success('Email HTML copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
      toast.error('Failed to copy — try downloading instead');
    }
  }, [emailHtml]);

  const handleSendTest = useCallback(async () => {
    if (!testEmail.trim() || !testEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSending(true);
    // Simulate sending — in production this would call a Supabase Edge Function
    // that forwards to SendGrid/Resend/Mailgun etc.
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setSendTestOpen(false);
    setTestEmail('');
    toast.success(`Test email sent to ${testEmail}`, {
      description: 'Note: This is a demo. Connect an SMTP service for real delivery.',
    });
  }, [testEmail]);

  const viewportWidth = viewport === 'desktop' ? '700px' : '375px';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[1100px] !max-h-[92vh] flex flex-col !p-0 !gap-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <DialogHeader className="!gap-0.5">
            <DialogTitle className="!text-base">Email Preview</DialogTitle>
            <DialogDescription className="!text-xs">
              Preview how your newsletter will look in email clients
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            {/* Dark / Light toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setDarkMode(!darkMode)}
                  >
                    {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{darkMode ? 'Light mode' : 'Dark mode'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Viewport toggle */}
            <Tabs value={viewport} onValueChange={(v) => setViewport(v as ViewportMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="desktop" className="h-7 px-2.5 gap-1 text-xs">
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </TabsTrigger>
                <TabsTrigger value="mobile" className="h-7 px-2.5 gap-1 text-xs">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Source toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showSource ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowSource(!showSource)}
                  >
                    <Code className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showSource ? 'Show preview' : 'View source'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* ── Preview Area ── */}
        <div className="flex-1 min-h-0 bg-muted/40 overflow-auto flex justify-center p-4">
          {showSource ? (
            <textarea
              ref={sourceRef}
              readOnly
              value={emailHtml}
              className="w-full h-full font-mono text-xs bg-background border border-border rounded-lg p-4 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              spellCheck={false}
            />
          ) : (
            <div
              className="transition-all duration-300 ease-in-out bg-white rounded-lg shadow-lg overflow-hidden shrink-0"
              style={{
                width: viewportWidth,
                maxWidth: '100%',
                height: 'fit-content',
                minHeight: '400px',
              }}
            >
              <iframe
                ref={iframeRef}
                title="Email Preview"
                sandbox="allow-same-origin"
                className="w-full border-0"
                style={{
                  minHeight: '500px',
                  height: '70vh',
                  maxHeight: 'calc(92vh - 180px)',
                }}
              />
            </div>
          )}
        </div>

        {/* ── Action Bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-card shrink-0">
          {/* Left side: info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {darkMode ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              {darkMode ? 'Dark' : 'Light'}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              {viewport === 'desktop' ? '700px fluid' : '375px mobile'}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              {Math.round(emailHtml.length / 1024)}KB HTML
            </span>
          </div>

          {/* Right side: actions */}
          <div className="flex items-center gap-2">
            {/* Send Test Email */}
            {sendTestOpen ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
                  className="h-8 w-44 text-xs"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleSendTest}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1 text-xs">Send</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => { setSendTestOpen(false); setTestEmail(''); }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setSendTestOpen(true)}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="text-xs hidden sm:inline">Send Test</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send a test email</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Copy to clipboard */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Clipboard className="w-3.5 h-3.5" />
                    )}
                    <span className="text-xs hidden sm:inline">
                      {copied ? 'Copied!' : 'Copy HTML'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy email HTML to clipboard</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Download */}
            <Button size="sm" className="h-8 gap-1.5" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" />
              <span className="text-xs">Download</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
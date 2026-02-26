import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MONTHS } from '../lib/types';
import type { Newsletter } from '../lib/types';
import {
  MoreHorizontal,
  Copy,
  Trash2,
  Pencil,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface NewsletterCardProps {
  newsletter: Newsletter;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  showActions?: boolean;
}

export function NewsletterCard({
  newsletter,
  onDuplicate,
  onDelete,
  showActions = true,
}: NewsletterCardProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const monthName = MONTHS[(newsletter.month || 1) - 1] || 'Unknown';
  const dateLabel = `${monthName} ${newsletter.year}`;
  const sectionCount = newsletter.content_json?.sections?.length ?? 0;

  return (
    <>
      <div
        className="group bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
        onClick={() => navigate(`/editor/${newsletter.id}`)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: newsletter.theme_config?.accent_color || '#000' }}
          >
            <FileText className="w-5 h-5 text-white" />
          </div>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-accent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => navigate(`/editor/${newsletter.id}`)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(newsletter.id)}>
                  <Copy className="w-4 h-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold mb-1 line-clamp-2">{newsletter.title}</h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dateLabel}
          </span>
          <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              newsletter.is_draft
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {newsletter.is_draft ? 'Draft' : 'Published'}
          </span>
          <span className="text-xs text-muted-foreground">v{newsletter.version}</span>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Newsletter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{newsletter.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(newsletter.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
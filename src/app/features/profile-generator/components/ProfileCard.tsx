import { useState, useCallback } from 'react';
import type { Profile } from '../utils/types';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Calendar,
  Tag,
  User,
} from 'lucide-react';

interface ProfileCardProps {
  profile: Profile;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProfileCard({
  profile,
  selected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
}: ProfileCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const dateFormatted = new Date(profile.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onEdit(profile.id);
      }
    },
    [onEdit, profile.id],
  );

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
    },
    [],
  );

  const handleCheckboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Prevent card's onKeyDown from firing when toggling checkbox
      e.stopPropagation();
    },
    [],
  );

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Edit profile: ${profile.name}`}
        className={`group relative bg-card border rounded-xl overflow-hidden hover:shadow-md focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all cursor-pointer ${
          selected
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border'
        }`}
        onClick={() => onEdit(profile.id)}
        onKeyDown={handleKeyDown}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {profile.thumbnailUrl ? (
            <img
              src={profile.thumbnailUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-12 h-12 text-muted-foreground/40" aria-hidden="true" />
            </div>
          )}

          {/* Checkbox overlay — always visible on mobile (touch), hover on desktop */}
          <div
            className={`absolute top-2 left-2 sm:top-3 sm:left-3 z-10 transition-opacity ${
              selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
            }`}
            onClick={handleCheckboxClick}
            onTouchEnd={handleCheckboxClick}
            onKeyDown={handleCheckboxKeyDown}
          >
            <div className="bg-white/90 dark:bg-black/70 backdrop-blur-sm rounded-md p-1.5 sm:p-1">
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(profile.id)}
                aria-label={`Select ${profile.name}`}
              />
            </div>
          </div>

          {/* Actions menu overlay — always visible on mobile, hover on desktop */}
          <div
            className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-10 transition-opacity ${
              'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md bg-white/90 dark:bg-black/70 backdrop-blur-sm text-foreground hover:bg-white dark:hover:bg-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Actions for ${profile.name}`}
                >
                  <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(profile.id)}>
                  <Pencil className="w-4 h-4 mr-2" aria-hidden="true" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(profile.id)}>
                  <Copy className="w-4 h-4 mr-2" aria-hidden="true" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4">
          <h3 className="text-sm font-semibold truncate mb-1.5">
            {profile.name}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate max-w-[140px]" title={profile.category || profile.templateLabel}>
              <Tag className="w-3 h-3 shrink-0" aria-hidden="true" />
              {profile.category || profile.templateLabel || 'Custom'}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              <time dateTime={profile.createdAt}>{dateFormatted}</time>
            </span>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{profile.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(profile.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

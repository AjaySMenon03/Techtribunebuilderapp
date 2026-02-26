import { useState } from 'react';
import { Button } from '../../../components/ui/button';
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
import { Trash2, X } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  onDeleteSelected,
  onClearSelection,
}: BulkActionBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-3 bg-card border border-border rounded-xl px-3 sm:px-5 py-2.5 sm:py-3 shadow-lg max-w-[calc(100vw-2rem)]"
        role="status"
        aria-live="polite"
      >
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedCount} selected
        </span>

        <div className="w-px h-5 bg-border" aria-hidden="true" />

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirm(true)}
          aria-label={`Delete ${selectedCount} selected profile${selectedCount > 1 ? 's' : ''}`}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Delete
        </Button>

        <Button variant="ghost" size="sm" onClick={onClearSelection} aria-label="Clear selection">
          <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Profile{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected profile{selectedCount > 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteSelected}
            >
              Delete {selectedCount} Profile{selectedCount > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
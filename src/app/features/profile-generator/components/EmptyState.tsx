import { UserPlus, Users } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface EmptyStateProps {
  onCreateProfile: () => void;
}

export function EmptyState({ onCreateProfile }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
      {/* Illustration circle */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-muted/60 flex items-center justify-center">
          <Users className="w-10 h-10 text-muted-foreground/60" />
        </div>
        {/* Small decorative badge */}
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
          <UserPlus className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-1">No profiles created yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md text-sm leading-relaxed">
        Create team member profile cards to feature in your newsletters. Choose from
        templates, customise details, and export ready-to-use profile sections.
      </p>
      <Button onClick={onCreateProfile} size="lg">
        <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
        Create First Profile
      </Button>
    </div>
  );
}
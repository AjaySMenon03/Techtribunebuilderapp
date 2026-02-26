import { useCollabStore } from '../../lib/collab-store';
import { SECTION_TYPE_LABELS } from '../../lib/editor-types';
import { useEditorStore } from '../../lib/editor-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Users, Wifi, WifiOff } from 'lucide-react';

export function PresenceBar() {
  const { remoteUsers, localUser, connected, synced } = useCollabStore();
  const sections = useEditorStore((s) => s.sections);

  const getSectionLabel = (sectionId: string | null): string => {
    if (!sectionId) return '';
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return '';
    return SECTION_TYPE_LABELS[section.baseType] || '';
  };

  const allUsers = localUser ? [localUser, ...remoteUsers] : remoteUsers;

  if (allUsers.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {connected && synced ? (
                <Wifi className="w-3.5 h-3.5 text-green-500" />
              ) : connected ? (
                <Wifi className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {connected && synced
              ? 'Realtime sync active'
              : connected
                ? 'Syncing...'
                : 'Offline'}
          </TooltipContent>
        </Tooltip>

        {/* User count */}
        {remoteUsers.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{allUsers.length}</span>
          </div>
        )}

        {/* User avatars */}
        <div className="flex items-center -space-x-1.5">
          {allUsers.map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <div
                  className="relative flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white border-2 border-card shrink-0 cursor-default transition-transform hover:scale-110 hover:z-10"
                  style={{ backgroundColor: user.color }}
                >
                  {getInitials(user.name)}
                  {user.editingSectionId && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card animate-pulse"
                      style={{ backgroundColor: user.color }}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="font-medium text-xs">
                  {user.name}
                  {user.userId === localUser?.userId ? ' (you)' : ''}
                </p>
                {user.editingSectionId && (
                  <p className="text-[10px] opacity-70 mt-0.5">
                    Editing: {getSectionLabel(user.editingSectionId)}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
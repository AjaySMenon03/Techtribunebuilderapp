import { useEffect, useMemo, useState } from 'react';
import { useCollabStore, type VersionSnapshot } from '../../lib/collab-store';
import { SECTION_TYPE_LABELS } from '../../lib/editor-types';
import { useEditorStore } from '../../lib/editor-store';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  History,
  X,
  RotateCcw,
  ChevronRight,
  Clock,
  User,
  Layers,
  GitCompare,
  ArrowLeft,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface VersionHistoryPanelProps {
  newsletterId: string;
}

export function VersionHistoryPanel({ newsletterId }: VersionHistoryPanelProps) {
  const {
    versions,
    versionsLoading,
    showVersionHistory,
    setShowVersionHistory,
    fetchVersions,
    restoreVersion,
    comparingVersionId,
    setComparingVersionId,
  } = useCollabStore();

  const currentSections = useEditorStore((s) => s.sections);

  useEffect(() => {
    if (showVersionHistory && newsletterId) {
      fetchVersions(newsletterId);
    }
  }, [showVersionHistory, newsletterId, fetchVersions]);

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersion(versionId);
      toast.success('Version restored!');
      setShowVersionHistory(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to restore version');
    }
  };

  if (!showVersionHistory) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {comparingVersionId ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setComparingVersionId(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <History className="w-4 h-4 text-muted-foreground" />
          )}
          <h3 className="text-sm font-semibold">
            {comparingVersionId ? 'Version Diff' : 'Version History'}
          </h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setShowVersionHistory(false); setComparingVersionId(null); }}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {comparingVersionId ? (
          <VersionDiff
            versionId={comparingVersionId}
            versions={versions}
            currentSections={currentSections}
          />
        ) : (
          <VersionList
            versions={versions}
            loading={versionsLoading}
            onRestore={handleRestore}
            onCompare={(id) => setComparingVersionId(id)}
          />
        )}
      </ScrollArea>
    </div>
  );
}

function VersionList({
  versions,
  loading,
  onRestore,
  onCompare,
}: {
  versions: VersionSnapshot[];
  loading: boolean;
  onRestore: (id: string) => void;
  onCompare: (id: string) => void;
}) {
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <History className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No versions yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Save manually to create version snapshots
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {versions.map((version, idx) => (
        <div
          key={version.id}
          className="border border-border rounded-lg p-3 bg-background hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  v{version.version}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {version.title}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(version.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {version.createdByName}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {version.sectionsCount} sections
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {confirmRestore === version.id ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 text-[10px] px-2"
                  onClick={() => { onRestore(version.id); setConfirmRestore(null); }}
                >
                  Confirm Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setConfirmRestore(null)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={() => setConfirmRestore(version.id)}
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </Button>
                {idx < versions.length - 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2 gap-1"
                    onClick={() => onCompare(version.id)}
                  >
                    <GitCompare className="w-3 h-3" />
                    Diff
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Basic diff view comparing a version with the previous one */
function VersionDiff({
  versionId,
  versions,
  currentSections,
}: {
  versionId: string;
  versions: VersionSnapshot[];
  currentSections: any[];
}) {
  const diffData = useMemo(() => {
    const vIdx = versions.findIndex((v) => v.id === versionId);
    if (vIdx === -1) return null;

    const current = versions[vIdx];
    // Compare with the next version (older) or current editor state
    const previous = vIdx < versions.length - 1
      ? versions[vIdx + 1]
      : null;

    const currentSecs = current.sections || [];
    const prevSecs = previous?.sections || [];

    const currentIds = new Set(currentSecs.map((s) => s.id));
    const prevIds = new Set(prevSecs.map((s) => s.id));

    const added = currentSecs.filter((s) => !prevIds.has(s.id));
    const removed = prevSecs.filter((s) => !currentIds.has(s.id));
    const modified = currentSecs.filter((s) => {
      if (!prevIds.has(s.id)) return false;
      const prev = prevSecs.find((p) => p.id === s.id);
      return prev && JSON.stringify(prev) !== JSON.stringify(s);
    });
    const unchanged = currentSecs.filter((s) => {
      const prev = prevSecs.find((p) => p.id === s.id);
      return prev && JSON.stringify(prev) === JSON.stringify(s);
    });

    return {
      current,
      previous,
      added,
      removed,
      modified,
      unchanged,
    };
  }, [versionId, versions]);

  if (!diffData) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Version not found
      </div>
    );
  }

  const { current, previous, added, removed, modified, unchanged } = diffData;

  return (
    <div className="p-4 space-y-4">
      {/* Diff header */}
      <div className="flex items-center gap-2 text-xs">
        <span className="bg-muted px-2 py-1 rounded font-medium">
          v{previous?.version ?? '0'}
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">
          v{current.version}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <DiffStat label="Added" count={added.length} color="text-green-600" icon={<Plus className="w-3 h-3" />} />
        <DiffStat label="Removed" count={removed.length} color="text-red-500" icon={<Minus className="w-3 h-3" />} />
        <DiffStat label="Modified" count={modified.length} color="text-amber-500" icon={<RefreshCw className="w-3 h-3" />} />
      </div>

      <Separator />

      {/* Added sections */}
      {added.length > 0 && (
        <DiffGroup title="Added" color="bg-green-500/10 border-green-500/20 text-green-700" sections={added} />
      )}

      {/* Removed sections */}
      {removed.length > 0 && (
        <DiffGroup title="Removed" color="bg-red-500/10 border-red-500/20 text-red-600" sections={removed} />
      )}

      {/* Modified sections */}
      {modified.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-amber-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Modified ({modified.length})
          </h4>
          {modified.map((section) => {
            const prev = previous?.sections?.find((s: any) => s.id === section.id);
            return (
              <ModifiedSectionDiff key={section.id} current={section} previous={prev} />
            );
          })}
        </div>
      )}

      {/* Unchanged */}
      {unchanged.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {unchanged.length} section{unchanged.length !== 1 ? 's' : ''} unchanged
        </p>
      )}
    </div>
  );
}

function DiffStat({ label, count, color, icon }: { label: string; count: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/50">
      <div className={`flex items-center justify-center gap-1 ${color} mb-0.5`}>
        {icon}
        <span className="text-lg font-bold">{count}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function DiffGroup({ title, color, sections }: { title: string; color: string; sections: any[] }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold flex items-center gap-1">
        {title} ({sections.length})
      </h4>
      {sections.map((section) => (
        <div key={section.id} className={`text-xs px-3 py-2 rounded-md border ${color}`}>
          <span className="font-medium">
            {SECTION_TYPE_LABELS[section.baseType] || section.baseType}
          </span>
          <span className="opacity-60 ml-1.5">({section.baseType})</span>
        </div>
      ))}
    </div>
  );
}

function ModifiedSectionDiff({ current, previous }: { current: any; previous: any }) {
  const changes: string[] = [];

  if (current.visible !== previous?.visible) {
    changes.push(`Visibility: ${previous?.visible ? 'visible' : 'hidden'} -> ${current.visible ? 'visible' : 'hidden'}`);
  }

  // Compare data fields
  const currentData = current.data || {};
  const prevData = previous?.data || {};
  const allKeys = new Set([...Object.keys(currentData), ...Object.keys(prevData)]);
  for (const key of allKeys) {
    if (JSON.stringify(currentData[key]) !== JSON.stringify(prevData[key])) {
      changes.push(`${key} changed`);
    }
  }

  return (
    <div className="text-xs px-3 py-2 rounded-md border border-amber-500/20 bg-amber-500/5">
      <div className="font-medium text-amber-700 mb-1">
        {SECTION_TYPE_LABELS[current.baseType] || current.baseType}
      </div>
      {changes.length > 0 ? (
        <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
          {changes.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-muted-foreground">Content changed</p>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
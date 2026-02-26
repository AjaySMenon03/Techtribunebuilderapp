import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  Search,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';

import { EmptyState } from './components/EmptyState';
import { ProfileCard } from './components/ProfileCard';
import { BulkActionBar } from './components/BulkActionBar';
import { TemplatePicker } from './components/TemplatePicker';

import { useProfiles } from './hooks/useProfiles';
import { PROFILE_CATEGORIES } from './utils/types';
import { PROFILE_EDITOR_ROUTE } from './utils/constants';
import type { ProfileTemplate } from './utils/pg-types';

export function ProfileListPage() {
  const navigate = useNavigate();

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // --- Multi-select ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Template picker ---
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // --- Data ---
  const {
    profiles,
    allProfiles,
    activeCategories,
    loading,
    duplicateProfile,
    deleteProfile,
    deleteMany,
  } = useProfiles({ searchQuery, categoryFilter });

  // --- Handlers ---
  const handleCreateProfile = () => {
    setTemplatePickerOpen(true);
  };

  const handleTemplateSelected = useCallback(
    (template: ProfileTemplate | null) => {
      setTemplatePickerOpen(false);
      if (template) {
        navigate(`${PROFILE_EDITOR_ROUTE}?templateId=${template.id}`);
      } else {
        // Blank canvas
        navigate(PROFILE_EDITOR_ROUTE);
      }
    },
    [navigate],
  );

  const handleEdit = (id: string) => {
    navigate(`/profile-generator/editor?id=${id}`);
  };

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        await duplicateProfile(id);
        toast.success('Profile duplicated');
      } catch {
        toast.error('Failed to duplicate profile');
      }
    },
    [duplicateProfile],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteProfile(id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success('Profile deleted');
      } catch {
        toast.error('Failed to delete profile');
      }
    },
    [deleteProfile],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === profiles.length && profiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(profiles.map((p) => p.id)));
    }
  }, [profiles, selectedIds.size]);

  const handleBulkDelete = useCallback(() => {
    deleteMany(selectedIds);
    const count = selectedIds.size;
    setSelectedIds(new Set());
    toast.success(`${count} profile${count > 1 ? 's' : ''} deleted`);
  }, [deleteMany, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const hasFilters = searchQuery.trim() !== '' || categoryFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
  };

  // Show the empty state only if there are no profiles at all (not just filtered to zero)
  const isCompletelyEmpty = allProfiles.length === 0;
  const isFilteredEmpty = !isCompletelyEmpty && profiles.length === 0;

  const allVisibleSelected = profiles.length > 0 && selectedIds.size === profiles.length;

  // Build the category options: merge static categories with any active categories from data
  const categoryOptions = (() => {
    const options = new Set<string>();
    for (const cat of PROFILE_CATEGORIES) {
      if (cat !== 'All Categories') options.add(cat);
    }
    for (const cat of activeCategories) {
      options.add(cat);
    }
    return Array.from(options).sort();
  })();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      {/* ───── Top bar ───── */}
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        {/* Row 1: Title + CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Profile Generator</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Create and manage team member profile cards
            </p>
          </div>

          {!isCompletelyEmpty && (
            <Button onClick={handleCreateProfile} className="shrink-0 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Create Profile
            </Button>
          )}
        </div>

        {/* Row 2: Search + Filter (only when there are profiles) */}
        {!isCompletelyEmpty && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* Select-all checkbox */}
            {profiles.length > 0 && (
              <div
                className="hidden sm:flex items-center gap-2 shrink-0 pr-1"
                title={allVisibleSelected ? 'Deselect all' : 'Select all'}
              >
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label={allVisibleSelected ? 'Deselect all profiles' : 'Select all profiles'}
                />
              </div>
            )}

            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <Input
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search profiles"
              />
            </div>

            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                <X className="w-4 h-4 mr-1" aria-hidden="true" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ───── Results count ───── */}
      {!isCompletelyEmpty && !loading && (
        <p className="text-xs text-muted-foreground mb-3" aria-live="polite">
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
          {hasFilters ? ' matching filters' : ''}
        </p>
      )}

      {/* ───── Content ───── */}
      {loading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading profiles">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="sr-only">Loading profiles...</span>
        </div>
      ) : isCompletelyEmpty ? (
        <EmptyState onCreateProfile={handleCreateProfile} />
      ) : isFilteredEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
          <h3 className="text-lg font-semibold mb-1">No matching profiles</h3>
          <p className="text-muted-foreground mb-4 max-w-sm text-sm">
            Try adjusting your search or category filter
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" aria-hidden="true" />
            Clear Filters
          </Button>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          role="list"
          aria-label="Profile cards"
        >
          {profiles.map((profile) => (
            <div key={profile.id} role="listitem">
              <ProfileCard
                profile={profile}
                selected={selectedIds.has(profile.id)}
                onToggleSelect={toggleSelect}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* ───── Bulk action bar ───── */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeleteSelected={handleBulkDelete}
        onClearSelection={clearSelection}
      />

      {/* ───── Template Picker ───── */}
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleTemplateSelected}
        isAdmin // TODO: restrict based on user role
      />
    </div>
  );
}

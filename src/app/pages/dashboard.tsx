import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useNewsletterStore } from '../store';
import { NewsletterCard } from '../components/newsletter-card';
import { MONTHS } from '../lib/types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Plus, Search, Loader2, Newspaper, X } from 'lucide-react';
import { toast } from 'sonner';

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    loading,
    searchQuery,
    filterMonth,
    filterYear,
    setSearchQuery,
    setFilterMonth,
    setFilterYear,
    fetchAll,
    create,
    duplicate,
    remove,
    filteredNewsletters,
  } = useNewsletterStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1));
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const newsletters = filteredNewsletters();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    setCreating(true);
    try {
      const newsletter = await create({
        title: newTitle.trim(),
        month: parseInt(newMonth),
        year: parseInt(newYear),
      });
      toast.success('Newsletter created!');
      setShowCreate(false);
      setNewTitle('');
      navigate(`/editor/${newsletter.id}`);
    } catch (err: any) {
      console.error('Create error:', err);
      toast.error(err.message || 'Failed to create newsletter');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicate(id);
      toast.success('Newsletter duplicated!');
    } catch (err: any) {
      console.error('Duplicate error:', err);
      toast.error(err.message || 'Failed to duplicate');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success('Newsletter deleted');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete');
    }
  };

  const hasFilters = searchQuery || filterMonth !== null || filterYear !== null;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterMonth(null);
    setFilterYear(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Newsletter</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your newsletters</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Newsletter
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search newsletters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filterMonth !== null ? String(filterMonth) : 'all'}
            onValueChange={(v) => setFilterMonth(v === 'all' ? null : parseInt(v))}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterYear !== null ? String(filterYear) : 'all'}
            onValueChange={(v) => setFilterYear(v === 'all' ? null : parseInt(v))}
          >
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="shrink-0"
          >
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : newsletters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Newspaper className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {hasFilters ? 'No matching newsletters' : 'No newsletters yet'}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            {hasFilters
              ? 'Try adjusting your search or filters'
              : 'Create your first newsletter to get started'}
          </p>
          {!hasFilters && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Newsletter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {newsletters.map((newsletter) => (
            <NewsletterCard
              key={newsletter.id}
              newsletter={newsletter}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Newsletter</DialogTitle>
            <DialogDescription>
              Start a new newsletter issue. You can edit the content later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Tech Tribune - March 2026"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={newMonth} onValueChange={setNewMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={newYear} onValueChange={setNewYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ConfirmDialog } from '@/components/domain/ConfirmDialog';
import { categoriesApi } from '@/api/categories.api';
import { parseApiError } from '@/utils/error';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/domain.types';

interface EditorState {
  open: boolean;
  editing: Category | null;
}

const initialEditor: EditorState = { open: false, editing: null };

export function CategoriesPage() {
  const qc = useQueryClient();
  const [editor, setEditor] = useState<EditorState>(initialEditor);
  const [deactivateTarget, setDeactivateTarget] = useState<Category | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: () => categoriesApi.list(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const createMutation = useMutation({
    mutationFn: (input: {
      name: string; slug?: string; icon?: string; sort_order?: number;
    }) => categoriesApi.create(input),
    onSuccess: () => {
      toast.success('Category created');
      setEditor(initialEditor);
      refresh();
    },
    onError: (err) => toast.error(parseApiError(err).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof categoriesApi.update>[1] }) =>
      categoriesApi.update(id, input),
    onSuccess: () => {
      toast.success('Category updated');
      setEditor(initialEditor);
      refresh();
    },
    onError: (err) => toast.error(parseApiError(err).message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.deactivate(id),
    onSuccess: () => {
      toast.success('Category deactivated');
      setDeactivateTarget(null);
      refresh();
    },
    onError: (err) => toast.error(parseApiError(err).message),
  });

  const categories = data?.categories ?? [];

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage food categories used for filtering and tagging menu items."
        actions={
          <Button onClick={() => setEditor({ open: true, editing: null })}>
            <Plus className="mr-2 h-4 w-4" />
            New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            title="No categories yet"
            description="Create your first category — e.g. Tagine, Couscous, Pastilla."
            actionLabel="New category"
            onAction={() => setEditor({ open: true, editing: null })}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3',
                    !c.is_active && 'opacity-60'
                  )}
                >
                  <span className="text-2xl">{c.icon ?? '🍽️'}</span>
                  <div className="flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">/{c.slug}</p>
                  </div>
                  <Badge
                    className={
                      c.is_active
                        ? 'border-green-200 bg-green-100 text-green-800'
                        : 'border-stone-300 bg-stone-100 text-stone-700'
                    }
                  >
                    {c.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditor({ open: true, editing: c })}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {c.is_active ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeactivateTarget(c)}
                      aria-label="Deactivate"
                    >
                      <PowerOff className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateMutation.mutate({ id: c.id, input: { is_active: true } })}
                      aria-label="Reactivate"
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <CategoryEditor
        state={editor}
        onClose={() => setEditor(initialEditor)}
        onCreate={(input) => createMutation.mutate(input)}
        onUpdate={(id, input) => updateMutation.mutate({ id, input })}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`Deactivate ${deactivateTarget?.name}?`}
        description="This category will be hidden from public browse. Existing items keep the reference. You can reactivate later."
        confirmLabel="Deactivate"
        destructive
        onConfirm={async () => {
          if (deactivateTarget) await deactivateMutation.mutateAsync(deactivateTarget.id);
        }}
      />
    </div>
  );
}

/* ── Inline editor (create + edit) ───────────────────────────────────── */

interface EditorProps {
  state: EditorState;
  onClose: () => void;
  onCreate: (input: { name: string; slug?: string; icon?: string; sort_order?: number }) => void;
  onUpdate: (id: string, input: Parameters<typeof categoriesApi.update>[1]) => void;
  submitting: boolean;
}

function CategoryEditor({ state, onClose, onCreate, onUpdate, submitting }: EditorProps) {
  const [name, setName] = useState(state.editing?.name ?? '');
  const [slug, setSlug] = useState(state.editing?.slug ?? '');
  const [icon, setIcon] = useState(state.editing?.icon ?? '');
  const [sortOrder, setSortOrder] = useState(state.editing?.sort_order ?? 0);

  // Re-sync fields when editing target changes
  if (state.open && state.editing && state.editing.name !== name && name === '') {
    setName(state.editing.name);
    setSlug(state.editing.slug);
    setIcon(state.editing.icon ?? '');
    setSortOrder(state.editing.sort_order);
  }

  if (!state.open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      ...(slug.trim() && { slug: slug.trim() }),
      ...(icon.trim() && { icon: icon.trim() }),
      sort_order: Number(sortOrder) || 0,
    };
    if (state.editing) onUpdate(state.editing.id, payload);
    else onCreate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {state.editing ? 'Edit category' : 'New category'}
          </h2>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (optional — auto-generated)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-from-name"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="icon">Icon (emoji)</Label>
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={10}
                  placeholder="🥘"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sort">Sort order</Label>
                <Input
                  id="sort"
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || name.trim().length < 2}>
                {submitting ? 'Saving…' : state.editing ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

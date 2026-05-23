import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import type { ReactNode } from 'react';

interface ToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function DataTableToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  actions,
}: ToolbarProps) {
  const [local, setLocal] = useState(search);
  const debounced = useDebounce(local, 300);

  // Sync external resets (e.g., navigation) back into the local input.
  useEffect(() => {
    setLocal(search);
  }, [search]);

  // Fire the change only when the debounced value differs from the prop.
  useEffect(() => {
    if (debounced !== search) {
      onSearchChange?.(debounced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="mb-3 flex items-center gap-2">
      {onSearchChange && (
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
          {local && (
            <button
              type="button"
              onClick={() => setLocal('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {filters}
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}

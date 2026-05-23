import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface TableUrlStateOptions {
  defaultLimit?: number;
  defaultPage?: number;
}

/**
 * URL is the source of truth for list-page state — page, limit, search, and
 * any string filters live as `?key=value` query params (per admin
 * architecture §10). Shareable, bookmarkable, refresh-safe.
 */
export function useTableUrlState({ defaultLimit = 20, defaultPage = 1 }: TableUrlStateOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = useMemo(() => {
    const n = parseInt(searchParams.get('page') ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : defaultPage;
  }, [searchParams, defaultPage]);

  const limit = useMemo(() => {
    const n = parseInt(searchParams.get('limit') ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : defaultLimit;
  }, [searchParams, defaultLimit]);

  const search = searchParams.get('search') ?? '';

  /**
   * Read any string filter from the URL.
   * Example: `getFilter('status')` → `'pending'`
   */
  const getFilter = useCallback(
    (key: string): string | undefined => searchParams.get(key) ?? undefined,
    [searchParams]
  );

  /** Update one or more params at once. Empty/null values are removed. */
  const setParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);

  const setSearch = useCallback(
    (next: string) => setParams({ search: next || null, page: null }), // reset to page 1
    [setParams]
  );

  const setFilter = useCallback(
    (key: string, value: string | null) => setParams({ [key]: value, page: null }),
    [setParams]
  );

  return { page, limit, search, getFilter, setPage, setSearch, setFilter, setParams };
}

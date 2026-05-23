import { useEffect, useState } from 'react';

/**
 * Returns `value` but debounced — only updates after `delayMs` of no changes.
 * Used by search inputs to avoid hammering the API on every keystroke.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

import { useEffect, useState } from 'react';

/**
 * Debounce a value — returns a value that lags `delay` ms behind the input.
 * Used by SearchScreen to avoid a network call on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

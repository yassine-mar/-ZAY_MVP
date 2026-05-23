import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * The standard shadcn `cn()` utility — merges Tailwind classes intelligently
 * so later classes correctly override earlier ones (handles modifier conflicts).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

import { PHONE_DIAL_CODE } from '@/constants/config';

/**
 * Format a stored phone number for display.
 *   "+212612345678" → "+212 6 12 34 56 78"
 *   "612345678"      → "+212 6 12 34 56 78"
 * Falls back to the original input if it doesn't look like an MA number.
 */
export function formatPhone(input: string | null | undefined): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');

  // Normalize to 9 national digits.
  let national = digits;
  if (digits.startsWith('212')) national = digits.slice(3);
  if (national.length !== 9) return input;

  const a = national.slice(0, 1);
  const b = national.slice(1, 3);
  const c = national.slice(3, 5);
  const d = national.slice(5, 7);
  const e = national.slice(7, 9);
  return `${PHONE_DIAL_CODE} ${a} ${b} ${c} ${d} ${e}`;
}

/**
 * Strip everything but digits and prepend +212. Used by PhoneInput when
 * storing the raw value in the form state.
 */
export function normalizePhoneForStorage(input: string): string {
  const digits = input.replace(/\D/g, '');
  const national = digits.startsWith('212') ? digits.slice(3) : digits;
  return `${PHONE_DIAL_CODE}${national}`;
}

/** Strip a stored phone to its 9 national digits for editable display. */
export function nationalDigitsOnly(input: string | null | undefined): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  return digits.startsWith('212') ? digits.slice(3) : digits;
}

/** Format an integer count of MAD. */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format an ISO timestamp as "Jan 6, 14:32". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * "5 min ago", "2 h ago", "Yesterday", "3 d ago". Falls back to date.
 */
export function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMin = Math.floor((now - t) / 60_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} d ago`;

  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

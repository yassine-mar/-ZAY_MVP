import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatCurrency(amount: number | string, currency = 'MAD'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return `0 ${currency}`;
  return `${n.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(value: string | Date | null | undefined, pattern = 'PP'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, pattern);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, 'PP HH:mm');
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  // +212612345678 → +212 6 12 34 56 78
  if (/^\+212[5-7]\d{8}$/.test(phone)) {
    return phone.replace(/^(\+212)(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5 $6');
  }
  return phone;
}

export function truncate(value: string | null | undefined, max = 40): string {
  if (!value) return '';
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

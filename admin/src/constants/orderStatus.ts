import type { OrderStatus, SellerStatus, UserStatus, UserRole } from '@/types/domain.types';

/**
 * Color-coded status mapping — color + label + icon (per design system §13).
 * Never rely on color alone. Tailwind class strings keep TypeScript inference simple.
 */

interface StatusStyle {
  label: string;
  bg: string;
  text: string;
  border: string;
}

export const ORDER_STATUS_STYLES: Record<OrderStatus, StatusStyle> = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200'  },
  accepted:  { label: 'Accepted',  bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200'   },
  preparing: { label: 'Preparing', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  ready:     { label: 'Ready',     bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  delivered: { label: 'Delivered', bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200'  },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-200'    },
};

export const SELLER_STATUS_STYLES: Record<SellerStatus, StatusStyle> = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  approved:  { label: 'Approved',  bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  rejected:  { label: 'Rejected',  bg: 'bg-red-100',   text: 'text-red-800',   border: 'border-red-200'   },
  suspended: { label: 'Suspended', bg: 'bg-stone-200', text: 'text-stone-700', border: 'border-stone-300' },
};

export const USER_STATUS_STYLES: Record<UserStatus, StatusStyle> = {
  active:    { label: 'Active',    bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  suspended: { label: 'Suspended', bg: 'bg-red-100',   text: 'text-red-800',   border: 'border-red-200'   },
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  customer: 'Customer',
  seller: 'Seller',
  admin: 'Admin',
};

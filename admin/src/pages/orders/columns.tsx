import { type ColumnDef } from '@tanstack/react-table';
import type { Order } from '@/types/domain.types';
import { OrderStatusBadge } from '@/components/domain/OrderStatusBadge';
import { formatCurrency, formatRelative, truncate } from '@/utils/format';

export const orderColumns: ColumnDef<Order>[] = [
  {
    accessorKey: 'id',
    header: 'Order',
    cell: ({ row }) => (
      <span className="font-mono text-xs">#{row.original.id.slice(0, 8)}</span>
    ),
  },
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <span className="text-sm">
        {truncate((row.original as any).customer_name ?? row.original.customer?.name, 24) || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'seller',
    header: 'Seller',
    cell: ({ row }) => (
      <span className="text-sm">
        {truncate((row.original as any).seller_business_name ?? row.original.seller?.business_name, 24) || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'total_amount',
    header: 'Total',
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.total_amount)}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Placed',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatRelative(row.original.created_at)}
      </span>
    ),
  },
];

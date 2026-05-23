import { type ColumnDef } from '@tanstack/react-table';
import type { Seller } from '@/types/domain.types';
import { SellerStatusBadge } from '@/components/domain/SellerStatusBadge';
import { formatRelative } from '@/utils/format';

export const sellerColumns: ColumnDef<Seller>[] = [
  {
    accessorKey: 'business_name',
    header: 'Business',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.business_name}</p>
        <p className="text-xs text-muted-foreground">{row.original.email ?? ''}</p>
      </div>
    ),
  },
  {
    accessorKey: 'city',
    header: 'City',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <SellerStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'created_at',
    header: 'Registered',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatRelative(row.original.created_at)}
      </span>
    ),
  },
];

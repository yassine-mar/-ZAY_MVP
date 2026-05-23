import { type ColumnDef } from '@tanstack/react-table';
import type { User } from '@/types/domain.types';
import { UserStatusBadge, UserRoleBadge } from '@/components/domain/UserStatusBadge';
import { formatRelative, formatPhone } from '@/utils/format';

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{formatPhone(row.original.phone)}</span>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <UserRoleBadge role={row.original.role} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatRelative(row.original.created_at)}
      </span>
    ),
  },
];

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { DataTablePagination } from '@/components/tables/DataTablePagination';
import { DataTableToolbar } from '@/components/tables/DataTableToolbar';
import { Button } from '@/components/ui/button';
import { useTableUrlState } from '@/hooks/useTableUrlState';
import { usersApi } from '@/api/users.api';
import { userColumns } from './columns';
import { PATHS } from '@/routes/paths';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/domain.types';

const ROLE_TABS: Array<{ label: string; value: UserRole | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Customers', value: 'customer' },
  { label: 'Sellers', value: 'seller' },
  { label: 'Admins', value: 'admin' },
];

export function UsersListPage() {
  const navigate = useNavigate();
  const { page, search, getFilter, setPage, setSearch, setFilter } = useTableUrlState();
  const role = getFilter('role') as UserRole | undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, role, search }],
    queryFn: () => usersApi.list({
      page,
      limit: 20,
      ...(role && { role }),
      ...(search && { search }),
    }),
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Search and manage every account on the platform."
      />

      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, or phone…"
        filters={
          <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
            {ROLE_TABS.map((tab) => {
              const isActive = tab.value === 'all' ? !role : role === tab.value;
              return (
                <Button
                  key={tab.value}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-7 px-3', isActive && 'shadow-sm')}
                  onClick={() => setFilter('role', tab.value === 'all' ? null : tab.value)}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
        }
      />

      <DataTable
        columns={userColumns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="No users in this view"
        onRowClick={(user) => navigate(PATHS.USER_DETAIL(user.id))}
      />

      <DataTablePagination
        pagination={data?.pagination}
        onPageChange={setPage}
      />
    </div>
  );
}

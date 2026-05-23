import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { DataTablePagination } from '@/components/tables/DataTablePagination';
import { DataTableToolbar } from '@/components/tables/DataTableToolbar';
import { Button } from '@/components/ui/button';
import { useTableUrlState } from '@/hooks/useTableUrlState';
import { sellersApi } from '@/api/sellers.api';
import { sellerColumns } from './columns';
import { PATHS } from '@/routes/paths';
import { cn } from '@/lib/utils';
import type { SellerStatus } from '@/types/domain.types';

const TABS: Array<{ label: string; value: SellerStatus | 'all' }> = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'All', value: 'all' },
];

export function SellersListPage() {
  const navigate = useNavigate();
  const { page, getFilter, setPage, setFilter } = useTableUrlState();
  const status = (getFilter('status') as SellerStatus | undefined) ?? 'pending';

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', { page, status }],
    queryFn: () => sellersApi.list({
      page,
      limit: 20,
      ...(status !== ('all' as SellerStatus) && { status }),
    }),
  });

  return (
    <div>
      <PageHeader
        title="Sellers"
        description="Approve new applications, manage approved sellers, and track suspensions."
      />

      <DataTableToolbar
        filters={
          <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
            {TABS.map((tab) => {
              const isActive = (status as string) === tab.value
                || (tab.value === 'all' && !getFilter('status'));
              return (
                <Button
                  key={tab.value}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-7 px-3', isActive && 'shadow-sm')}
                  onClick={() => setFilter('status', tab.value === 'all' ? null : tab.value)}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
        }
      />

      <DataTable
        columns={sellerColumns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="No sellers in this view"
        emptyDescription="When sellers register, they'll appear here for approval."
        onRowClick={(seller) => navigate(PATHS.SELLER_DETAIL(seller.id))}
      />

      <DataTablePagination
        pagination={data?.pagination}
        onPageChange={setPage}
      />
    </div>
  );
}

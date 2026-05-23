import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { DataTablePagination } from '@/components/tables/DataTablePagination';
import { DataTableToolbar } from '@/components/tables/DataTableToolbar';
import { Button } from '@/components/ui/button';
import { useTableUrlState } from '@/hooks/useTableUrlState';
import { ordersApi } from '@/api/orders.api';
import { orderColumns } from './columns';
import { PATHS } from '@/routes/paths';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/domain.types';

const STATUS_TABS: Array<{ label: string; value: OrderStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'accepted' }, // shown as one of the in-flight states
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function OrdersListPage() {
  const navigate = useNavigate();
  const { page, getFilter, setPage, setFilter } = useTableUrlState();
  const status = getFilter('status') as OrderStatus | undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { page, status }],
    queryFn: () => ordersApi.list({
      page,
      limit: 20,
      ...(status && { status }),
    }),
  });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order across the platform. Click a row to see the full timeline."
      />

      <DataTableToolbar
        filters={
          <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
            {STATUS_TABS.map((tab) => {
              const isActive = tab.value === 'all' ? !status : status === tab.value;
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
        columns={orderColumns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="No orders in this view"
        onRowClick={(order) => navigate(PATHS.ORDER_DETAIL(order.id))}
      />

      <DataTablePagination
        pagination={data?.pagination}
        onPageChange={setPage}
      />
    </div>
  );
}

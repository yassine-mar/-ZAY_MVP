import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { OrderStatusBadge } from '@/components/domain/OrderStatusBadge';
import { ConfirmDialog } from '@/components/domain/ConfirmDialog';
import { ordersApi } from '@/api/orders.api';
import { formatCurrency, formatDateTime, formatPhone, formatRelative } from '@/utils/format';
import { parseApiError } from '@/utils/error';
import { PATHS } from '@/routes/paths';

const TERMINAL = new Set(['delivered', 'cancelled']);

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => ordersApi.forceCancel(id!, reason),
    onSuccess: () => {
      toast.success('Order cancelled');
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast.error(parseApiError(err).message),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Order not found.</p>
        <Button asChild><Link to={PATHS.ORDERS}>Back to orders</Link></Button>
      </div>
    );
  }

  const { order, history } = data;
  const canCancel = !TERMINAL.has(order.status);

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2"
        onClick={() => navigate(PATHS.ORDERS)}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to orders
      </Button>

      <PageHeader
        title={`Order #${order.id.slice(0, 8)}`}
        description={`Placed ${formatRelative(order.created_at)} · ${formatCurrency(order.total_amount)}`}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Name" value={order.customer?.name ?? '—'} />
            <DetailRow label="Phone" value={formatPhone(order.customer?.phone)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Seller</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Business" value={order.seller?.business_name ?? '—'} />
            <DetailRow label="City" value={order.seller?.city ?? '—'} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Delivery address</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{order.delivery_address.street}</p>
            {order.delivery_address.district && <p>{order.delivery_address.district}</p>}
            <p>{order.delivery_address.city}</p>
            {order.delivery_address.landmark && (
              <p className="text-muted-foreground">Landmark: {order.delivery_address.landmark}</p>
            )}
            {order.delivery_address.notes && (
              <p className="text-muted-foreground">Notes: {order.delivery_address.notes}</p>
            )}
            {order.customer_notes && (
              <p className="mt-3 rounded-md bg-muted/50 p-3 text-xs italic">
                Customer note: {order.customer_notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Status history</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">
                      {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : entry.to_status}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.changed_at)}</p>
                    {entry.note && <p className="mt-1 text-sm">{entry.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {canCancel && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Admin actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Force cancel order
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Both the customer and the seller will be notified with your reason.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Force cancel this order?"
        description="This is irreversible. Both parties will be notified."
        destructive
        requireReason
        reasonLabel="Reason for cancellation"
        confirmLabel="Force cancel"
        onConfirm={async (reason) => { await cancelMutation.mutateAsync(reason!); }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 break-words">{value}</span>
    </div>
  );
}

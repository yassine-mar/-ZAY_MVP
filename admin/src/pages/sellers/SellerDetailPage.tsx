import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { SellerStatusBadge } from '@/components/domain/SellerStatusBadge';
import { ConfirmDialog } from '@/components/domain/ConfirmDialog';
import { sellersApi } from '@/api/sellers.api';
import { formatDateTime, formatPhone, formatRelative } from '@/utils/format';
import { parseApiError } from '@/utils/error';
import { PATHS } from '@/routes/paths';

type Action = 'approve' | 'reject' | 'suspend' | null;

export function SellerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [action, setAction] = useState<Action>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seller', id],
    queryFn: () => sellersApi.get(id!),
    enabled: !!id,
  });

  const seller = data?.seller;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['seller', id] });
    qc.invalidateQueries({ queryKey: ['sellers'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => sellersApi.approve(id!),
    onSuccess: () => { toast.success('Seller approved'); invalidate(); },
    onError: (err) => toast.error(parseApiError(err).message),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => sellersApi.reject(id!, reason),
    onSuccess: () => { toast.success('Seller rejected'); invalidate(); },
    onError: (err) => toast.error(parseApiError(err).message),
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => sellersApi.suspend(id!, reason),
    onSuccess: () => { toast.success('Seller suspended'); invalidate(); },
    onError: (err) => toast.error(parseApiError(err).message),
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (isError || !seller) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Seller not found.</p>
        <Button asChild>
          <Link to={PATHS.SELLERS}>Back to sellers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2"
        onClick={() => navigate(PATHS.SELLERS)}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to sellers
      </Button>

      <PageHeader
        title={seller.business_name}
        description={`Registered ${formatRelative(seller.created_at)}`}
        actions={<SellerStatusBadge status={seller.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Business</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Bio" value={seller.bio ?? '—'} />
            <DetailRow label="City" value={seller.city} />
            <DetailRow label="Address" value={seller.address} />
            <DetailRow label="Delivery radius" value={`${seller.delivery_radius_km} km`} />
            <DetailRow
              label="Open now"
              value={seller.is_open ? 'Yes' : 'No'}
            />
            {seller.specialties && seller.specialties.length > 0 && (
              <DetailRow label="Specialties" value={seller.specialties.join(', ')} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Owner</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Email" value={seller.email ?? '—'} />
            <DetailRow label="Phone" value={formatPhone(seller.phone)} />
            <DetailRow label="Registered" value={formatDateTime(seller.created_at)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Audit trail</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <TimelineEntry label="Registered" date={seller.created_at} />
            {seller.approved_at && (
              <TimelineEntry label="Approved" date={seller.approved_at} />
            )}
            {seller.rejected_at && (
              <TimelineEntry
                label="Rejected"
                date={seller.rejected_at}
                detail={seller.rejection_reason}
              />
            )}
            {seller.suspended_at && (
              <TimelineEntry
                label="Suspended"
                date={seller.suspended_at}
                detail={seller.suspension_reason}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {seller.status === 'pending' && (
              <>
                <Button onClick={() => setAction('approve')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="destructive" onClick={() => setAction('reject')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            {seller.status === 'approved' && (
              <Button variant="destructive" onClick={() => setAction('suspend')}>
                <Ban className="mr-2 h-4 w-4" />
                Suspend
              </Button>
            )}
            {(seller.status === 'rejected' || seller.status === 'suspended') && (
              <p className="text-sm text-muted-foreground">
                No actions available for this status.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={action === 'approve'}
        onOpenChange={(open) => !open && setAction(null)}
        title={`Approve ${seller.business_name}?`}
        description="The seller will be notified and can start accepting orders immediately."
        confirmLabel="Approve seller"
        onConfirm={async () => { await approveMutation.mutateAsync(); }}
      />

      <ConfirmDialog
        open={action === 'reject'}
        onOpenChange={(open) => !open && setAction(null)}
        title={`Reject ${seller.business_name}?`}
        description="The seller will be notified with the reason you provide."
        confirmLabel="Reject seller"
        destructive
        requireReason
        reasonLabel="Reason for rejection (10–500 characters)"
        onConfirm={async (reason) => { await rejectMutation.mutateAsync(reason!); }}
      />

      <ConfirmDialog
        open={action === 'suspend'}
        onOpenChange={(open) => !open && setAction(null)}
        title={`Suspend ${seller.business_name}?`}
        description="All active orders will continue. The seller cannot accept new orders."
        confirmLabel="Suspend seller"
        destructive
        requireReason
        reasonLabel="Reason for suspension"
        onConfirm={async (reason) => { await suspendMutation.mutateAsync(reason!); }}
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

function TimelineEntry({
  label, date, detail,
}: { label: string; date: string; detail?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(date)}</p>
        {detail && <p className="mt-1 text-sm">{detail}</p>}
      </div>
    </div>
  );
}

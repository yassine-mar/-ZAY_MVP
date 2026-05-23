import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserStatusBadge, UserRoleBadge } from '@/components/domain/UserStatusBadge';
import { ConfirmDialog } from '@/components/domain/ConfirmDialog';
import { usersApi } from '@/api/users.api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDateTime, formatPhone, formatRelative } from '@/utils/format';
import { parseApiError } from '@/utils/error';
import { PATHS } from '@/routes/paths';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [suspendOpen, setSuspendOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => usersApi.suspend(id!, reason),
    onSuccess: () => {
      toast.success('User suspended');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(parseApiError(err).message),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">User not found.</p>
        <Button asChild><Link to={PATHS.USERS}>Back to users</Link></Button>
      </div>
    );
  }

  const { user } = data;
  const isSelf = me?.id === user.id;
  const canSuspend = user.status === 'active' && !isSelf;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2"
        onClick={() => navigate(PATHS.USERS)}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to users
      </Button>

      <PageHeader
        title={user.name}
        description={`Joined ${formatRelative(user.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <UserRoleBadge role={user.role} />
            <UserStatusBadge status={user.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="Phone" value={formatPhone(user.phone)} />
            <DetailRow label="Role" value={user.role} />
            <DetailRow label="Status" value={user.status} />
            <DetailRow label="Joined" value={formatDateTime(user.created_at)} />
          </CardContent>
        </Card>

        {user.order_summary && (
          <Card>
            <CardHeader><CardTitle>Order activity</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DetailRow label="Total orders" value={String(user.order_summary.total_orders)} />
              <DetailRow label="Cancelled" value={String(user.order_summary.cancelled_orders)} />
              <DetailRow
                label="Total spent"
                value={formatCurrency(user.order_summary.total_spent)}
              />
            </CardContent>
          </Card>
        )}

        {user.suspended_at && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-destructive" />
                Suspension
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Suspended at:</span> {formatDateTime(user.suspended_at)}</p>
              {user.suspension_reason && (
                <p className="rounded-md bg-muted/50 p-3">{user.suspension_reason}</p>
              )}
            </CardContent>
          </Card>
        )}

        {canSuspend && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setSuspendOpen(true)}>
                <Ban className="mr-2 h-4 w-4" />
                Suspend account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title={`Suspend ${user.name}?`}
        description="The user will be signed out and unable to log in until reactivated."
        destructive
        requireReason
        reasonLabel="Reason for suspension"
        confirmLabel="Suspend account"
        onConfirm={async (reason) => { await suspendMutation.mutateAsync(reason!); }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 break-words capitalize">{value}</span>
    </div>
  );
}

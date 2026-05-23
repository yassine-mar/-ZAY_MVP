import { Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SELLER_STATUS_STYLES } from '@/constants/orderStatus';
import type { SellerStatus } from '@/types/domain.types';

const ICONS: Record<SellerStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  suspended: Ban,
};

export function SellerStatusBadge({ status }: { status: SellerStatus }) {
  const style = SELLER_STATUS_STYLES[status];
  const Icon = ICONS[status];
  return (
    <Badge className={cn(style.bg, style.text, style.border)}>
      <Icon className="h-3 w-3" />
      {style.label}
    </Badge>
  );
}

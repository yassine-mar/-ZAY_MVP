import { Clock, CheckCircle2, ChefHat, PackageCheck, Truck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_STYLES } from '@/constants/orderStatus';
import type { OrderStatus } from '@/types/domain.types';

const ICONS: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  accepted: CheckCircle2,
  preparing: ChefHat,
  ready: PackageCheck,
  delivered: Truck,
  cancelled: XCircle,
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const style = ORDER_STATUS_STYLES[status];
  const Icon = ICONS[status];
  return (
    <Badge className={cn(style.bg, style.text, style.border)}>
      <Icon className="h-3 w-3" />
      {style.label}
    </Badge>
  );
}

import { Badge } from '@/components/ui/Badge';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import type { OrderStatus } from '@/types/domain.types';

interface Props {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: Props) {
  const meta = ORDER_STATUS_META[status];
  return <Badge label={meta.label} color={meta.color} bg={meta.bg} />;
}

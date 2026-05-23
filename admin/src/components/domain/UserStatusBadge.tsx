import { CheckCircle2, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { USER_STATUS_STYLES, USER_ROLE_LABEL } from '@/constants/orderStatus';
import type { UserRole, UserStatus } from '@/types/domain.types';

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const style = USER_STATUS_STYLES[status];
  const Icon = status === 'active' ? CheckCircle2 : Ban;
  return (
    <Badge className={cn(style.bg, style.text, style.border)}>
      <Icon className="h-3 w-3" />
      {style.label}
    </Badge>
  );
}

export function UserRoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge className="border-stone-300 bg-stone-100 text-stone-700">
      {USER_ROLE_LABEL[role]}
    </Badge>
  );
}

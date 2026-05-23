import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Tag,
  BarChart3,
  ChevronLeft,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useQuery } from '@tanstack/react-query';
import { sellersApi } from '@/api/sellers.api';
import { PATHS } from '@/routes/paths';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: PATHS.DASHBOARD,  label: 'Dashboard',  icon: LayoutDashboard },
  { to: PATHS.SELLERS,    label: 'Sellers',    icon: Store },
  { to: PATHS.USERS,      label: 'Users',      icon: Users },
  { to: PATHS.ORDERS,     label: 'Orders',     icon: Package },
  { to: PATHS.CATEGORIES, label: 'Categories', icon: Tag },
  { to: PATHS.ANALYTICS,  label: 'Analytics',  icon: BarChart3 },
] as const;

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);

  // Pending sellers badge — refetches every minute while focused.
  const { data: pendingData } = useQuery({
    queryKey: ['sellers', 'pending-count'],
    queryFn: () => sellersApi.list({ status: 'pending', page: 1, limit: 1 }),
    refetchInterval: 60_000,
  });
  const pendingCount = pendingData?.pagination?.total ?? 0;

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      <div className={cn('flex h-14 items-center border-b', collapsed ? 'justify-center' : 'justify-between px-4')}>
        {!collapsed && (
          <span className="font-serif text-lg font-bold tracking-tight text-primary">
            @ZAY <span className="text-sm font-medium text-muted-foreground">admin</span>
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle sidebar"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{label}</span>
                {label === 'Sellers' && pendingCount > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {pendingCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

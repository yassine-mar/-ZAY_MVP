import { useQuery } from '@tanstack/react-query';
import { Users, Store, ShoppingBag, DollarSign, Clock } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/charts/MetricCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { analyticsApi } from '@/api/analytics.api';
import { formatCurrency } from '@/utils/format';

export function DashboardPage() {
  const overview = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview(),
    refetchInterval: 60_000,
  });

  const trends = useQuery({
    queryKey: ['analytics', 'orders', 30],
    queryFn: () => analyticsApi.orderTrends(30),
  });

  const topSellers = useQuery({
    queryKey: ['analytics', 'top-sellers', 5],
    queryFn: () => analyticsApi.topSellers(5),
  });

  const o = overview.data?.overview;
  const t = trends.data?.trends ?? [];
  const ts = topSellers.data?.top_sellers ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform health, today's activity, and revenue at a glance."
      />

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview.isLoading || !o ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <MetricCard
              label="Total users"
              value={o.users.total.toLocaleString()}
              icon={Users}
              caption={`${o.users.new_this_month} new this month`}
            />
            <MetricCard
              label="Orders today"
              value={o.orders.today.toLocaleString()}
              icon={ShoppingBag}
              caption={
                o.orders.auto_cancelled_today > 0
                  ? `${o.orders.auto_cancelled_today} auto-cancelled`
                  : 'No auto-cancellations today'
              }
            />
            <MetricCard
              label="GMV this month"
              value={formatCurrency(o.revenue.this_month)}
              icon={DollarSign}
              caption={`AOV: ${formatCurrency(o.revenue.avg_order_value)}`}
            />
            <MetricCard
              label="Pending sellers"
              value={o.users.sellers.pending}
              icon={Store}
              caption={`${o.users.sellers.approved} approved, ${o.users.sellers.suspended} suspended`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Orders trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Orders — last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : t.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Not enough data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={t} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)}
                    className="text-xs"
                  />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(14 92% 47%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top sellers */}
        <Card>
          <CardHeader>
            <CardTitle>Top sellers</CardTitle>
          </CardHeader>
          <CardContent>
            {topSellers.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : ts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No orders yet
              </p>
            ) : (
              <ol className="space-y-3">
                {ts.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.business_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.order_count} orders · {formatCurrency(s.revenue)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

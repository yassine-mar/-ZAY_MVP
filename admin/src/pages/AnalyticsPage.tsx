import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { analyticsApi } from '@/api/analytics.api';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';

const RANGE_OPTIONS = [
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
] as const;

export function AnalyticsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const trends = useQuery({
    queryKey: ['analytics', 'orders', days],
    queryFn: () => analyticsApi.orderTrends(days),
  });

  const topSellers = useQuery({
    queryKey: ['analytics', 'top-sellers', 10],
    queryFn: () => analyticsApi.topSellers(10),
  });

  const t = trends.data?.trends ?? [];
  const ts = topSellers.data?.top_sellers ?? [];

  // Aggregate totals for the selected window (cheap derived state).
  const totalOrders = t.reduce((sum, p) => sum + p.orders, 0);
  const avgPerDay = t.length > 0 ? Math.round(totalOrders / t.length) : 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Trends and performance across the platform — drill into a custom window."
        actions={
          <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
            {RANGE_OPTIONS.map((opt) => {
              const isActive = days === opt.days;
              return (
                <Button
                  key={opt.days}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-7 px-3', isActive && 'shadow-sm')}
                  onClick={() => setDays(opt.days)}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        }
      />

      {/* Window summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Orders ({days}d)
            </p>
            {trends.isLoading ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{totalOrders.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Avg orders / day
            </p>
            {trends.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{avgPerDay.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders trend chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order volume — last {days} days</CardTitle>
        </CardHeader>
        <CardContent>
          {trends.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : t.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Not enough data for this window yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
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

      {/* Top 10 sellers — bar chart + table side-by-side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 sellers — revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topSellers.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : ts.length === 0 ? (
              <EmptyState
                title="No revenue yet"
                description="Once orders start flowing, top performers will appear here."
              />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={ts}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis
                    type="category"
                    dataKey="business_name"
                    width={110}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="revenue" fill="hsl(14 92% 47%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 sellers — leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {topSellers.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : ts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No orders yet.
              </p>
            ) : (
              <ol className="space-y-3">
                {ts.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        i < 3
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.business_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.order_count} orders
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(s.revenue)}
                    </span>
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

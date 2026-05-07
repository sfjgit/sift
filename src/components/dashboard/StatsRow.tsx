'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { TrendingUp, AlertTriangle, Clock, BarChart2, Users, Briefcase } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  alert,
  accent,
  onClick,
  loading,
}: {
  label: string;
  value?: number;
  sub?: string;
  icon?: React.ElementType;
  alert?: boolean;
  accent?: boolean;
  onClick?: () => void;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-24 rounded-xl" />;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border p-4 transition-all',
        alert && (value ?? 0) > 0
          ? 'border-destructive/25 bg-destructive/5'
          : accent
            ? 'border-primary/20 bg-primary/5'
            : 'bg-card border-border',
        onClick && 'cursor-pointer hover:shadow-sm hover:border-primary/30'
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-medium',
            alert && (value ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        {Icon && (
          <Icon
            className={cn(
              'h-3.5 w-3.5',
              alert && (value ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground/50'
            )}
          />
        )}
      </div>
      <span
        className={cn(
          'text-3xl font-bold tabular-nums leading-none',
          alert && (value ?? 0) > 0 ? 'text-destructive' : 'text-foreground'
        )}
      >
        {(value ?? 0).toLocaleString()}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function StatsRow({ buId, status }: { buId?: string; status?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const { data: stats, isLoading } = useDashboardStats(
    // @ts-expect-error err
    { buId, status }
  );

  const navigate = (extra: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <StatCard
        label="Active"
        value={stats?.active}
        sub="requirements"
        icon={BarChart2}
        accent
        loading={isLoading}
        onClick={() => navigate({ status: 'ACTIVE' })}
      />
      <StatCard
        label="Pending"
        value={stats?.pendingApproval}
        sub="need approval"
        icon={Clock}
        loading={isLoading}
        onClick={() => navigate({ status: 'PENDING_APPROVAL' })}
      />
      <StatCard
        label="Breached"
        value={stats?.breached}
        sub="deadline passed"
        icon={AlertTriangle}
        alert
        loading={isLoading}
      />
      <StatCard
        label="High priority"
        value={stats?.highPriority}
        sub="active reqs"
        alert
        loading={isLoading}
        onClick={() => navigate({ status: 'ACTIVE', priority: 'HIGH' })}
      />
      <StatCard
        label="Draft"
        value={stats?.draft}
        loading={isLoading}
        onClick={() => navigate({ status: 'DRAFT' })}
      />
      <StatCard
        label="On hold"
        value={stats?.onHold}
        loading={isLoading}
        onClick={() => navigate({ status: 'ON_HOLD' })}
      />
      <StatCard
        label="This week"
        value={stats?.thisWeek}
        sub="new reqs"
        icon={TrendingUp}
        loading={isLoading}
      />
      <StatCard
        label="Total"
        value={stats?.totalRequirements}
        sub="all time"
        icon={Users}
        loading={isLoading}
      />
    </div>
  );
}

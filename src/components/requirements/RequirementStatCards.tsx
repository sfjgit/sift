// components/requirements/RequirementStatCards.tsx
'use client';

import type { RequirementStats } from './types';

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: number | string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${alert ? 'text-destructive' : ''}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function RequirementStatCards({ stats }: { stats: RequirementStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Active"
        value={stats.byStatus.ACTIVE ?? 0}
        sub={`${stats.byPriority.HIGH ?? 0} high priority`}
      />
      <StatCard label="Pending approval" value={stats.byStatus.PENDING_APPROVAL ?? 0} />
      <StatCard
        label="Breached"
        value={stats.breached}
        alert={stats.breached > 0}
        sub="respondBy overdue"
      />
      <StatCard label="This week" value={stats.recentlyCreated} sub="created" />
    </div>
  );
}

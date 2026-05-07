'use client';

import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequirements } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';
import type { RequirementSummary, ReqStatus, Priority } from '@/types/dashboard';

const STATUS_CLS: Record<ReqStatus, string> = {
  ACTIVE:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  PENDING_APPROVAL:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
  ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
  CLOSED: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400',
};

const PRI_DOT: Record<Priority, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-zinc-400',
};

const PRI_CLS: Record<Priority, string> = {
  HIGH: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  LOW: 'text-zinc-500 bg-zinc-50 border-zinc-200',
};

function ReqRow({ req }: { req: RequirementSummary }) {
  const fillPct =
    req.totalOpenings > 0 ? Math.round((req.filledOpenings / req.totalOpenings) * 100) : 0;

  const topAssignee = req.assignments?.[0]?.assignedTo;

  return (
    <Link
      href={`/requirements/${req.id}`}
      className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
    >
      <span className={cn('h-2 w-2 rounded-full shrink-0 mt-2', PRI_DOT[req.priority])} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-mono text-[11px] text-muted-foreground">{req.reqCode}</span>
          {(req.isRespondByBreached || req.isTurnaroundBreached) && (
            <span className="flex items-center gap-0.5 text-[10px] text-destructive font-medium">
              <AlertTriangle className="h-2.5 w-2.5" />
              Breached
            </span>
          )}
        </div>

        <p className="text-sm font-semibold leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {req.title}
        </p>

        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs text-muted-foreground">
          <span>{req.client.name}</span>
          {req.businessUnit && (
            <>
              <span>·</span>
              <span>{req.businessUnit.name}</span>
            </>
          )}
          {req.serviceLine && (
            <>
              <span>·</span>
              <span>{req.serviceLine.name}</span>
            </>
          )}
          <span>·</span>
          <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
          {topAssignee && (
            <>
              <span>·</span>
              <span className="text-foreground/70">
                {topAssignee.firstName} {topAssignee.lastName}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0', STATUS_CLS[req.status])}
          >
            {req.status.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', PRI_CLS[req.priority])}>
            {req.priority}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                fillPct >= 100 ? 'bg-emerald-500' : fillPct > 50 ? 'bg-primary' : 'bg-amber-400'
              )}
              style={{ width: `${Math.min(fillPct, 100)}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {req.filledOpenings}/{req.totalOpenings}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
          {req.activeApplications > 0 && <span>{req.activeApplications} in pipeline</span>}
          {req.respondBy && (
            <span className={cn(req.isRespondByBreached ? 'text-destructive' : '')}>
              Due {format(new Date(req.respondBy), 'dd MMM')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function RequirementsSkeletonRows() {
  return (
    <div className="divide-y divide-border px-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-3.5">
          <Skeleton className="h-2 w-2 rounded-full mt-2 shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-1 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RequirementsSection({
  buId,
  status,
  priority,
}: {
  buId?: string;
  status?: string;
  priority?: string;
}) {
  const { data: reqs, isLoading } = useRequirements({ buId, status, priority, limit: 10 });

  if (isLoading) return <RequirementsSkeletonRows />;

  if (!reqs || reqs.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No requirements found for the selected filters.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {reqs.map(req => (
        <ReqRow key={req.id} req={req} />
      ))}
    </div>
  );
}

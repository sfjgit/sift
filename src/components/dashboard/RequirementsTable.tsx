import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { RequirementSummary, ReqStatus, Priority } from '@/types/dashboard';
import { cn } from '@/lib/utils';

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

interface RequirementsTableProps {
  requirements: RequirementSummary[];
  showAssignee?: boolean;
}

export function RequirementsTable({ requirements, showAssignee = false }: RequirementsTableProps) {
  if (requirements.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No requirements found for the selected filters.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {requirements.map(req => {
        const topAssignee = req.assignments?.[0]?.assignedTo;
        const fillPct =
          req.totalOpenings > 0 ? Math.round((req.filledOpenings / req.totalOpenings) * 100) : 0;

        return (
          <Link
            key={req.id}
            href={`/requirements/${req.id}`}
            className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
          >
            {/* priority dot */}
            <span className={cn('h-2 w-2 rounded-full shrink-0 mt-2', PRI_DOT[req.priority])} />

            {/* main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-mono text-[11px] text-muted-foreground">{req.reqCode}</span>
                {(req.isRespondByBreached || req.isTurnaroundBreached) && (
                  <span className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Breached
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                {req.title}
              </p>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs text-muted-foreground">
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
                {showAssignee && topAssignee && (
                  <>
                    <span>·</span>
                    <span className="text-foreground/80">
                      {topAssignee.firstName} {topAssignee.lastName}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* right side */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0', STATUS_CLS[req.status])}
                >
                  {req.status.replace(/_/g, ' ')}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0', PRI_CLS[req.priority])}
                >
                  {req.priority}
                </Badge>
              </div>

              {/* fill progress */}
              <div className="flex items-center gap-2">
                <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      fillPct >= 100
                        ? 'bg-emerald-500'
                        : fillPct > 50
                          ? 'bg-primary'
                          : 'bg-amber-400'
                    )}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {req.filledOpenings}/{req.totalOpenings}
                </span>
              </div>

              {/* candidate counts */}
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
      })}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMyAssignments } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';
import type { AssignmentSummary, CandidateStage } from '@/types/dashboard';

const STAGE_CLS: Record<CandidateStage, string> = {
  SOURCED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  SCREENING: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  SUBMITTED: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  INTERVIEW_SCHEDULED: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  INTERVIEW_DONE: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  OFFER_ROLLED: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  OFFER_ACCEPTED: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  JOINED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  REJECTED: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  WITHDRAWN: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
};

function AssignmentNode({ a, depth = 0 }: { a: AssignmentSummary; depth?: number }) {
  return (
    <div className={cn(depth > 0 && 'ml-5 border-l border-border/60 pl-4')}>
      <div className="flex items-start gap-2 py-2">
        {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold">
              {a.assignedTo.firstName} {a.assignedTo.lastName}
            </span>

            {a.allocatedOpenings != null && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {a.filledOpenings}/{a.allocatedOpenings} filled
              </Badge>
            )}

            {a.breachedAt && (
              <span className="flex items-center gap-0.5 text-[10px] text-destructive font-medium">
                <AlertTriangle className="h-2.5 w-2.5" />
                Breached
              </span>
            )}

            {a.deadline && !a.breachedAt && (
              <span className="text-[11px] text-muted-foreground">
                Due {format(new Date(a.deadline), 'dd MMM')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
            <span>{a.submissionsCount} submissions</span>
            <span>{a.interviewsCount} interviews</span>
          </div>

          {/* candidates */}
          {a.candidates && a.candidates.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.candidates.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1"
                >
                  <span className="text-[11px] font-medium">{c.candidateName}</span>
                  <span
                    className={cn(
                      'text-[10px] rounded px-1 py-0.5 font-medium',
                      STAGE_CLS[c.currentStage]
                    )}
                  >
                    {c.currentStage.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* child assignments */}
      {a.children?.map(child => (
        <AssignmentNode key={child.id} a={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function MyAssignmentsSection() {
  const { data: assignments, isLoading } = useMyAssignments();

  if (isLoading || !assignments || assignments.length === 0) return null;

  // group by requirement
  const byReq = new Map<
    string,
    { req: AssignmentSummary['requirement']; assignments: AssignmentSummary[] }
  >();

  assignments.forEach(a => {
    const reqId = (a as any).requirement?.id ?? a.requirementId;
    const req = (a as any).requirement;
    if (!byReq.has(reqId)) byReq.set(reqId, { req, assignments: [] });
    byReq.get(reqId)!.assignments.push(a);
  });

  return (
    <div className="rounded-xl border bg-card flex flex-col">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold">My assignments</h2>
      </div>
      <div className="divide-y divide-border">
        {Array.from(byReq.values()).map(({ req, assignments: tree }) => (
          <div key={req?.id} className="px-5 py-4">
            {req && (
              <Link href={`/requirements/${req.id}`} className="flex items-center gap-2 mb-3 group">
                <span className="font-mono text-[11px] text-muted-foreground">{req.reqCode}</span>
                <span className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-1">
                  {req.title}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">· {req.client?.name}</span>
              </Link>
            )}
            <div className="space-y-1">
              {tree
                .filter(a => a.depth === 0)
                .map(a => (
                  <AssignmentNode key={a.id} a={a} depth={0} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

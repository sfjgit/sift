// File: RunsList.tsx
// Path: src/features/clients/detail/RunsList.tsx
//
// Pipeline runs for one client / SPOC. Full detail lives on /pipeline-runs.

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { GitBranch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StepRunBadge } from '@/components/common/badges';
import { EmptyState } from '@/components/common/states';
import { pipelineApi } from '@/lib/api/endpoints';
import { fmtRelative, fullName } from '@/lib/format';

export function RunsList({ clientId, spocId }: { clientId?: string; spocId?: string }) {
  const q = useQuery({
    queryKey: ['step-runs', clientId ?? '', spocId ?? ''],
    queryFn: () => pipelineApi.runs({ clientId, spocId, limit: 25 }),
  });

  if (q.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!q.data?.data.length)
    return <EmptyState icon={GitBranch} title="No pipeline runs yet" description="Enrichment runs for this record show up here." />;

  return (
    <ul className="divide-y rounded-xl border bg-card shadow-card">
      {q.data.data.map(r => (
        <li key={r.id}>
          <Link href={`/pipeline-runs?run=${r.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-accent/40">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{r.step.label}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {r.note ?? r.errorMessage ?? (r.spoc ? fullName(r.spoc) : 'Client-level step')}
              </span>
            </span>
            {r.status === 'RUNNING' && r.progress !== null && (
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-info/15">
                <span className="block h-full rounded-full bg-info" style={{ width: `${r.progress}%` }} />
              </span>
            )}
            <StepRunBadge status={r.status} />
            <span className="w-28 text-right text-xs text-muted-foreground">
              {fullName(r.requestedBy)} · {fmtRelative(r.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

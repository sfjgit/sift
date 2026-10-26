// File: RunsList.tsx
// Path: src/features/clients/detail/RunsList.tsx
//
// Pipeline runs for one client / SPOC. `onOpen` opens the run in place;
// without it a row links to /pipeline-runs. Polls while a run is active.

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { GitBranch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StepRunBadge } from '@/components/common/badges';
import { EmptyState } from '@/components/common/states';
import { pipelineApi } from '@/lib/api/endpoints';
import { fmtRelative, fullName } from '@/lib/format';
import { isActive } from '@/app/(app)/pipeline-runs/_components/runFormat';

const ROW = 'flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-accent/40';

function RowLink({ id, onOpen, children }: { id: string; onOpen?: (id: string) => void; children: React.ReactNode }) {
  return onOpen ? (
    <button type="button" onClick={() => onOpen(id)} className={ROW}>
      {children}
    </button>
  ) : (
    <Link href={`/pipeline-runs?run=${id}`} className={ROW}>
      {children}
    </Link>
  );
}

export function RunsList({
  clientId,
  spocId,
  onOpen,
}: {
  clientId?: string;
  spocId?: string;
  onOpen?: (runId: string) => void;
}) {
  const q = useQuery({
    queryKey: ['step-runs', clientId ?? '', spocId ?? ''],
    queryFn: () => pipelineApi.runs({ clientId, spocId, limit: 25 }),
    refetchInterval: query => (query.state.data?.data.some(r => isActive(r.status)) ? 5000 : false),
  });

  if (q.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!q.data?.data.length)
    return <EmptyState icon={GitBranch} title="No pipeline runs yet" description="Enrichment runs for this record show up here." />;

  return (
    <ul className="divide-y rounded-xl border bg-card shadow-card">
      {q.data.data.map(r => (
        <li key={r.id}>
          <RowLink id={r.id} onOpen={onOpen}>
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
          </RowLink>
        </li>
      ))}
    </ul>
  );
}

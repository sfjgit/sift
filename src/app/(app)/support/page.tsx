// File: page.tsx
// Path: src/app/(app)/support/page.tsx
//
// Support tickets. Everyone sees their own; people with support.manage see
// all of them. Bugs and ideas are separate pipelines (tabs), each with its own
// status steps.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bug, Camera, Film, Lightbulb, MessageSquare, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState } from '@/components/common/states';
import { openReport } from '@/features/support/ReportProblem';
import { STATUS_TONE, SEVERITY_TONE, SEVERITY_LABEL } from '@/features/support/tones';
import { Pill } from '@/components/common/badges';
import { supportApi } from '@/lib/api/endpoints';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TicketKind } from '@/types/support';

export default function SupportPage() {
  const [kind, setKind] = useState<TicketKind>('BUG');
  const [status, setStatus] = useState<string>('open');
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState('');
  const query = useQuery({
    queryKey: ['tickets', kind, status, mine, q],
    queryFn: () =>
      supportApi.list({
        kind,
        status,
        mine: mine ? 'true' : undefined,
        q: q || undefined,
        limit: 100,
      }),
    placeholderData: prev => prev,
  });
  const meta = query.data?.meta;
  const count = (st: string) =>
    meta?.counts.filter(c => c.kind === kind && c.status === st).reduce((s, c) => s + c.count, 0) ??
    0;
  const pipeline = meta?.pipeline[kind] ?? [];
  const label = (st: string) => meta?.labels[st] ?? st;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Support tickets"
        description={
          meta?.support
            ? 'Every problem and idea people reported. Open one to see its screenshot, replay and the automatic diagnosis.'
            : 'The problems and ideas you sent, and where each one is.'
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void openReport('FEATURE')}>
              <Lightbulb /> Suggest a feature
            </Button>
            <Button size="sm" onClick={() => void openReport('BUG')}>
              <Plus /> Report a problem
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={kind}
          onChange={k => {
            setKind(k);
            setStatus('open');
          }}
          options={[
            { value: 'BUG', label: 'Problems', icon: Bug },
            { value: 'FEATURE', label: 'Ideas', icon: Lightbulb },
          ]}
        />
        {meta?.support && (
          <Segmented
            value={mine ? 'mine' : 'all'}
            onChange={v => setMine(v === 'mine')}
            options={[
              { value: 'all', label: 'Everyone’s' },
              { value: 'mine', label: 'Mine' },
            ]}
          />
        )}
        <div className="relative ml-auto w-64">
          <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search or #number"
            className="h-8 pl-8"
          />
        </div>
      </div>

      {/* the pipeline: one chip per step, with how many are in it */}
      <div className="flex flex-wrap gap-1.5">
        {['open', ...pipeline, 'closed'].map(st => (
          <button
            key={st}
            type="button"
            onClick={() => setStatus(st)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[12.5px] transition-colors',
              status === st ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            {st === 'open' ? 'All open' : st === 'closed' ? 'All closed' : label(st)}
            {st !== 'open' && st !== 'closed' && (
              <span className="ml-1.5 tabular opacity-70">{count(st)}</span>
            )}
          </button>
        ))}
      </div>

      {query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={kind === 'BUG' ? Bug : Lightbulb}
          title={kind === 'BUG' ? 'No problems here' : 'No ideas here'}
          description="Use the buttons above (or Help → Report a problem, Ctrl+Shift+B) to send one."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {query.data.data.map(t => (
            <li key={t.id}>
              <Link
                href={`/support/${t.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <span className="w-12 shrink-0 text-sm text-muted-foreground tabular">
                  #{t.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.reporter} · {fmtRelative(t.createdAt)}
                    {t.assignee?.name && ` · with ${t.assignee.name}`}
                    {t.pageUrl && ` · ${new URL(t.pageUrl, location.origin).pathname}`}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  {t.hasScreenshot && <Camera className="size-3.5" aria-label="Screenshot" />}
                  {t.recordings > 0 && <Film className="size-3.5" aria-label="Replay" />}
                  {t.comments > 0 && (
                    <span className="flex items-center gap-0.5 text-xs">
                      <MessageSquare className="size-3.5" /> {t.comments}
                    </span>
                  )}
                </span>
                {t.severity && (
                  <Pill tone={SEVERITY_TONE[t.severity]} dot={false}>
                    {SEVERITY_LABEL[t.severity]}
                  </Pill>
                )}
                
                <Pill tone={STATUS_TONE[t.status] ?? 'neutral'}>{label(t.status)}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

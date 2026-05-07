'use client';

import { cn } from '@/lib/utils';
import type { DashboardStats } from '@/types/dashboard';

const STAGES = [
  { key: 'sourced', label: 'Sourced', color: 'bg-zinc-400' },
  { key: 'screening', label: 'Screening', color: 'bg-blue-400' },
  { key: 'submitted', label: 'Submitted', color: 'bg-indigo-400' },
  { key: 'interviewScheduled', label: 'Interview', color: 'bg-violet-400' },
  { key: 'interviewDone', label: 'Done', color: 'bg-purple-400' },
  { key: 'offerRolled', label: 'Offer', color: 'bg-amber-400' },
  { key: 'offerAccepted', label: 'Accepted', color: 'bg-emerald-400' },
  { key: 'joined', label: 'Joined', color: 'bg-emerald-600' },
] as const;

interface PipelineFunnelProps {
  pipeline?: DashboardStats['pipeline'];
  loading?: boolean;
}

export function PipelineFunnel({ pipeline, loading }: PipelineFunnelProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        {STAGES.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-20 shrink-0">{s.label}</span>
            <div className="flex-1 h-5 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!pipeline) return null;

  const max = Math.max(...STAGES.map(s => pipeline[s.key] ?? 0), 1);

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      {STAGES.map(s => {
        const count = pipeline[s.key] ?? 0;
        const pct = Math.round((count / max) * 100);

        return (
          <div key={s.key} className="flex items-center gap-2.5">
            <span className="text-[11px] text-muted-foreground w-20 shrink-0 text-right">
              {s.label}
            </span>
            <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-md transition-all duration-500', s.color)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums font-semibold text-foreground w-8 text-right">
              {count.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

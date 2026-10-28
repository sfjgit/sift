// File: runRules.tsx
// Path: src/features/pipeline/runRules.tsx
//
// What stops a step from running for a client right now, in one place for the
// step card, the run dialog and the clients list: no input yet, done recently
// with nothing new (re-run needs an admin), or no run slots left.

'use client';

import { CalendarClock, CheckCircle2, Gauge } from 'lucide-react';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { RunSlot, StepOverview, StepOverviewRow } from '@/types/crm';
import { STEP_META } from './stepMeta';

const PERIOD: Record<RunSlot['period'], string> = {
  DAY: 'today',
  WEEK: 'this week',
  MONTH: 'this month',
};

export function needsMissing(step: StepOverviewRow, counts: StepOverview['counts']) {
  const need = STEP_META[step.key]?.needs;
  if (need === 'spocs' && !counts.mySpocs)
    return counts.othersSpocs
      ? 'This client’s SPOCs belong to others — find your own first'
      : 'Add or find SPOCs first';
  if (need === 'approved' && !counts.myApprovedSpocs)
    return 'Approve at least one of your SPOCs first';
  if (need === 'reports' && !counts.documents) return 'Run “Find CSR reports” first';
  return null;
}

/** a slot rule with nothing left (step's own, or all steps together) */
export const fullSlot = (step: StepOverviewRow) => step.slots.find(s => s.left <= 0) ?? null;

export const slotText = (s: RunSlot) =>
  s.max === 0
    ? 'Switched off for you'
    : `${s.left} of ${s.max} ${s.stepId ? '' : 'pipeline '}run${s.max === 1 ? '' : 's'} left ${PERIOD[s.period]}`;

export function SlotChips({ slots, className }: { slots: RunSlot[]; className?: string }) {
  if (!slots.length) return null;
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {slots.map(s => (
        <span
          key={s.ruleId}
          title={`Resets ${fmtDate(s.resetsAt)}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]',
            s.left <= 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
          )}
        >
          <Gauge className="size-3" />
          {slotText(s)}
        </span>
      ))}
    </span>
  );
}

/** "Done by Priya · 27 Oct" + why it can't run again yet */
export function DoneNotice({ step, compact }: { step: StepOverviewRow; compact?: boolean }) {
  const done = step.done;
  if (!done) return null;
  const blocked = step.rerunBlocked;
  return (
    <div
      className={cn(
        'flex gap-2 rounded-lg px-3 py-2 text-xs',
        blocked ? 'border border-success/25 bg-success/8' : 'bg-muted/60',
        compact && 'px-2 py-1.5'
      )}
    >
      {blocked ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
      ) : (
        <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      )}
      <p className="min-w-0">
        <span className="font-medium">
          Done by {done.byMe ? 'you' : done.by} · {fmtDate(done.at)}
        </span>
        {done.note && <span className="text-muted-foreground"> — {done.note}</span>}
        {!compact && (
          <span className="mt-0.5 block text-muted-foreground">
            {blocked
              ? `Nothing new to work on since. It can run again from ${fmtDate(blocked.until)}.`
              : 'Something new came in since (or the re-run date passed), so it can run again.'}
          </span>
        )}
      </p>
    </div>
  );
}

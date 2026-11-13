// File: SpocStats.tsx
// Path: src/features/spocs/SpocStats.tsx
//
// The "Stats" panel above the SPOCs table (CASPA's SPOC dashboard, our way).
// It follows the table's filters and search, so there is no separate
// dashboard page: filter the table and the numbers follow. Clicking a bar
// adds that filter to the table.

'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Flag, Star, Tags, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { spocHooks } from '@/hooks/queries';
import { spocsApi } from '@/lib/api/endpoints';
import { fmtNumber, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ListParams } from '@/types/api';
import type { SpocStats as Stats, StatBucket } from '@/types/crm';

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
        <p className="text-lg leading-6 font-semibold tabular">
          {fmtNumber(value)}
          {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
        </p>
      </div>
    </div>
  );
}

/** has / missing for one field, as a thin split bar */
function Coverage({ label, has, total }: { label: string; has: number; total: number }) {
  const p = pct(has, total);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span>{label}</span>
        <span className="tabular text-muted-foreground">
          <span className="font-medium text-foreground">{fmtNumber(has)}</span> · {fmtNumber(total - has)} missing
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

/** top-N list with bars; a row is clickable when it maps to a table filter */
function TopList({
  title,
  buckets,
  total,
  onPick,
  pickedKey,
  format = l => l,
  max = 6,
}: {
  title: string;
  buckets: StatBucket[];
  total: number;
  onPick?: (b: StatBucket) => void;
  pickedKey?: string | null;
  format?: (label: string) => string;
  max?: number;
}) {
  const top = buckets.slice(0, max);
  const rest = buckets.slice(max).reduce((s, b) => s + b.count, 0);
  const peak = Math.max(1, ...top.map(b => b.count));
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{buckets.length} groups</p>
      </div>
      <ul className="space-y-1">
        {top.map(b => {
          const clickable = !!onPick && b.key !== '_none';
          const on = pickedKey === b.key;
          return (
            <li key={b.key}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onPick!(b)}
                title={clickable ? (on ? 'Filtered — click to clear' : 'Filter the table to this') : undefined}
                className={cn(
                  'relative flex w-full items-center gap-2 overflow-hidden rounded px-2 py-1 text-left text-[13px]',
                  clickable && 'hover:bg-muted',
                  on && 'ring-1 ring-primary'
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-primary/10"
                  style={{ width: `${(b.count / peak) * 100}%` }}
                />
                <span
                  className={cn('relative min-w-0 flex-1 truncate', b.key === '_none' && 'text-muted-foreground')}
                >
                  {b.key === '_none' ? 'Not set' : format(b.label)}
                </span>
                <span className="relative tabular font-medium">{fmtNumber(b.count)}</span>
                <span className="relative w-9 text-right text-xs tabular text-muted-foreground">
                  {pct(b.count, total)}%
                </span>
              </button>
            </li>
          );
        })}
        {rest > 0 && (
          <li className="px-2 pt-0.5 text-xs text-muted-foreground">
            + {fmtNumber(rest)} in {buckets.length - max} more
          </li>
        )}
        {!top.length && <li className="px-2 text-xs text-muted-foreground">Nothing to show</li>}
      </ul>
    </div>
  );
}

export function SpocStats({
  params,
  filters,
  setFilter,
}: {
  /** search + filters of the table (no paging) */
  params: ListParams;
  filters: Record<string, string>;
  setFilter: (key: string, value: string | null, label?: string) => void;
}) {
  const q = useQuery({
    queryKey: [...spocHooks.keys.all, 'stats', params],
    queryFn: () => spocsApi.stats(params),
    placeholderData: prev => prev,
  });
  const d: Stats | undefined = q.data;

  if (!d)
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );

  /** a bar toggles one value of a table filter */
  const pick = (key: string) => (b: StatBucket) =>
    setFilter(key, filters[key] === b.key ? null : b.key, b.label);

  return (
    <section
      className={cn(
        'space-y-3 rounded-xl border bg-surface p-3 transition-opacity',
        q.isFetching && 'opacity-70'
      )}
    >
      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="SPOCs" value={d.total} icon={Users} />
        <Kpi label="Clients covered" value={d.clients} icon={Building2} hint={d.clients ? `${(d.total / d.clients).toFixed(1)} per client` : undefined} />
        <Kpi label="Key accounts" value={d.keyAccounts} icon={Star} />
        <Kpi label="With projects" value={d.withProjects} icon={Tags} />
        <Kpi label="Data flagged" value={d.flagged} icon={Flag} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2.5 rounded-lg border bg-card p-3">
          <p className="text-[13px] font-semibold">Data coverage</p>
          <Coverage label="Email" has={d.has.email} total={d.total} />
          <Coverage label="Mobile" has={d.has.phone} total={d.total} />
          <Coverage label="LinkedIn" has={d.has.linkedin} total={d.total} />
          <Coverage label="Designation" has={d.has.designation} total={d.total} />
          <Coverage label="Location (state)" has={d.has.location} total={d.total} />
          <Coverage label="Sales status" has={d.has.salesStatus} total={d.total} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <TopList
            title="By sales status"
            buckets={d.by.salesStatus}
            total={d.total}
            onPick={pick('salesStatusId')}
            pickedKey={filters.salesStatusId}
          />
          <TopList
            title="By handler"
            buckets={d.by.handler}
            total={d.total}
            onPick={pick('handlerId')}
            pickedKey={filters.handlerId}
          />
          <TopList title="By client category" buckets={d.by.category} total={d.total} />
          <TopList title="By state" buckets={d.by.state} total={d.total} />
          <TopList
            title="By business unit"
            buckets={d.by.businessUnit}
            total={d.total}
            onPick={pick('businessUnitId')}
            pickedKey={filters.businessUnitId}
          />
          <TopList
            title="By data quality"
            buckets={d.by.band}
            total={d.total}
            format={titleCase}
            onPick={pick('validationBand')}
            pickedKey={filters.validationBand}
          />
        </div>
      </div>
      {d.capped && (
        <p className="text-xs text-muted-foreground">Counted on the first {fmtNumber(d.total)} SPOCs — narrow the filters for exact numbers.</p>
      )}
    </section>
  );
}

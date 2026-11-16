// File: ClientStats.tsx
// Path: src/features/clients/ClientStats.tsx
//
// The "Stats" panel above the Clients table. Like the SPOCs one it follows the
// table's filters and search — filter the table and the numbers follow — and
// clicking a bar adds that filter. Opened by the Stats button, or by telling
// the assistant "show stats".

'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, IndianRupee, Star, ThumbsUp, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Coverage, Kpi, TopList } from '@/features/spocs/SpocStats';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtInr, fmtNumber, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ListParams } from '@/types/api';
import type { StatBucket } from '@/types/crm';

export function ClientStats({
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
    queryKey: [...clientHooks.keys.all, 'stats', params],
    queryFn: () => clientsApi.stats(params),
    placeholderData: prev => prev,
  });
  const d = q.data;
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
        <Kpi label="Clients" value={d.total} icon={Building2} />
        <Kpi
          label="Active SPOCs"
          value={d.spocs}
          icon={Users}
          hint={d.total ? `${(d.spocs / d.total).toFixed(1)} per client` : undefined}
        />
        <Kpi label="Key accounts" value={d.keyAccounts} icon={Star} />
        <Kpi label="CSR eligible" value={d.csrEligible} icon={ThumbsUp} />
        {d.csrSpentRs !== null ? (
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <IndianRupee className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                CSR spent (latest)
              </p>
              <p className="text-[15px] leading-6 font-semibold tabular" title={fmtInr(d.csrSpentRs)}>
                {fmtInr(d.csrSpentRs)}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card" />
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2.5 rounded-lg border bg-card p-3">
          <p className="text-[13px] font-semibold">Data coverage</p>
          <Coverage label="Has a SPOC" has={d.has.spocs} total={d.total} />
          {d.has.csrFigures !== null && <Coverage label="CSR figures" has={d.has.csrFigures} total={d.total} />}
          <Coverage label="Website" has={d.has.website} total={d.total} />
          <Coverage label="LinkedIn page" has={d.has.linkedin} total={d.total} />
          <Coverage label="CIN" has={d.has.cin} total={d.total} />
          <Coverage label="Head office state" has={d.has.state} total={d.total} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <TopList
            title="By status"
            buckets={d.by.status}
            total={d.total}
            format={titleCase}
            onPick={pick('status')}
            pickedKey={filters.status}
          />
          <TopList
            title="By industry"
            buckets={d.by.industry}
            total={d.total}
            onPick={pick('industryId')}
            pickedKey={filters.industryId}
          />
          <TopList
            title="By category"
            buckets={d.by.category}
            total={d.total}
            onPick={pick('categoryId')}
            pickedKey={filters.categoryId}
          />
          <TopList title="By head office state" buckets={d.by.state} total={d.total} />
          <TopList
            title="By business unit"
            buckets={d.by.businessUnit}
            total={d.total}
            onPick={pick('businessUnitId')}
            pickedKey={filters.businessUnitId}
          />
          <TopList
            title="By organisation type"
            buckets={d.by.entityType}
            total={d.total}
            format={titleCase}
            onPick={pick('entityType')}
            pickedKey={filters.entityType}
          />
        </div>
      </div>
      {d.capped && (
        <p className="text-xs text-muted-foreground">
          Counted on the first {fmtNumber(d.total)} clients — narrow the filters for exact numbers.
        </p>
      )}
    </section>
  );
}

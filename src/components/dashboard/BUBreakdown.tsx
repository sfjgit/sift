'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import type { DashboardStats } from '@/types/dashboard';

interface BUBreakdownProps {
  buBreakdown?: DashboardStats['buBreakdown'];
  slBreakdown?: DashboardStats['slBreakdown'];
  loading?: boolean;
}

function BreakdownBar({
  items,
  onSelect,
  selected,
  loading,
}: {
  items: { id: string; name: string; count: number }[];
  onSelect?: (id: string) => void;
  selected?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="flex-1 h-4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-6 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No data</p>;
  }

  const max = Math.max(...items.map(i => i.count), 1);

  return (
    <div className="flex flex-col gap-1.5">
      {items.map(item => {
        const pct = Math.round((item.count / max) * 100);
        const isSelected = selected === item.id;

        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors',
              onSelect && 'cursor-pointer hover:bg-muted/50',
              isSelected && 'bg-primary/10'
            )}
            onClick={() => onSelect?.(item.id)}
          >
            <span
              className={cn(
                'text-[11px] w-28 truncate shrink-0 font-medium',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {item.name}
            </span>
            <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded transition-all duration-500',
                  isSelected ? 'bg-primary' : 'bg-primary/40'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums font-semibold w-7 text-right shrink-0">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BUBreakdown({ buBreakdown, slBreakdown, loading }: BUBreakdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selectBU = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('buId') === id) {
      params.delete('buId');
    } else {
      params.set('buId', id);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const selectSL = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('serviceLineId') === id) {
      params.delete('serviceLineId');
    } else {
      params.set('serviceLineId', id);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          By Business Unit
        </p>
        <BreakdownBar
          items={buBreakdown ?? []}
          onSelect={selectBU}
          selected={searchParams.get('buId') ?? undefined}
          loading={loading}
        />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          By Service Line
        </p>
        <BreakdownBar
          items={slBreakdown ?? []}
          onSelect={selectSL}
          selected={searchParams.get('serviceLineId') ?? undefined}
          loading={loading}
        />
      </div>
    </div>
  );
}

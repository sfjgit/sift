// File: StatusTabs.tsx
// Path: src/features/clients/StatusTabs.tsx

'use client';

import { tourTarget } from '@/features/tour/tour.constants';
import { fmtNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ClientStatus } from '@/types/crm';

const TABS: { value: ClientStatus | null; label: string; dot?: string }[] = [
  { value: null, label: 'All clients' },
  { value: 'PENDING', label: 'Pending approval', dot: 'bg-warning' },
  { value: 'ACTIVE', label: 'Active', dot: 'bg-success' },
  { value: 'INACTIVE', label: 'Inactive', dot: 'bg-muted-foreground/50' },
];

export function StatusTabs({
  value,
  onChange,
  counts,
  total,
}: {
  value: ClientStatus | null;
  onChange: (v: ClientStatus | null) => void;
  counts?: Record<ClientStatus, number>;
  total?: number;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b"
      role="tablist"
      {...tourTarget('clients-status')}
    >
      {TABS.map(t => {
        const active = value === t.value;
        const n = t.value ? counts?.[t.value] : total;
        return (
          <button
            key={t.label}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative flex items-center gap-2 px-3 pt-1 pb-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.dot && <span className={cn('size-1.5 rounded-full', t.dot)} />}
            {t.label}
            {n !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular',
                  active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {fmtNumber(n)}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

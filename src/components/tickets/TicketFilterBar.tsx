// File: TicketFilterBar.tsx
// Path: src/components/tickets/TicketFilterBar.tsx

'use client';

import { Search } from 'lucide-react';
import type { TicketFilters, TicketMeta } from '@/types/ticket.types';

interface Props {
  filters: TicketFilters;
  meta: TicketMeta | null;
  onChange: (patch: Partial<TicketFilters>) => void;
}

const select =
  'rounded-lg border px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400';

export default function TicketFilterBar({ filters, meta, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={filters.search ?? ''}
          onChange={e => onChange({ search: e.target.value, page: 1 })}
          placeholder="Search tickets…"
          className={`${select} w-full pl-9`}
        />
      </div>

      <select
        value={filters.status?.[0] ?? ''}
        onChange={e => onChange({ status: e.target.value ? [e.target.value] : [], page: 1 })}
        className={select}
      >
        <option value="">All statuses</option>
        {meta?.statuses.map(s => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      <select
        value={filters.priority?.[0] ?? ''}
        onChange={e => onChange({ priority: e.target.value ? [e.target.value] : [], page: 1 })}
        className={select}
      >
        <option value="">All priorities</option>
        {meta?.priorities.map(p => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        value={filters.categoryId ?? ''}
        onChange={e => onChange({ categoryId: e.target.value, page: 1 })}
        className={select}
      >
        <option value="">All categories</option>
        {meta?.categories.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

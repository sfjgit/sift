// File: page.tsx
// Path: src/app/(dashboard)/system-tickets/page.tsx

'use client';

import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTicketMeta, useTickets } from '@/hooks/useTickets';
import TicketTable from '@/components/tickets/TicketTable';
import TicketFilterBar from '@/components/tickets/TicketFilterBar';
import TicketDetailDrawer from '@/components/tickets/TicketDetailDrawer';
import CategoryManager from '@/components/tickets/CategoryManager';
import type { TicketFilters } from '@/types/ticket.types';

const TABS = [
  { key: '', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'ON_HOLD', label: 'On Hold' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function SystemTicketsPage() {
  const meta = useTicketMeta();
  const [tab, setTab] = useState('');
  const [view, setView] = useState<'tickets' | 'categories'>('tickets');
  const [filters, setFilters] = useState<TicketFilters>({ page: 1, limit: 20 });
  const [activeId, setActiveId] = useState<string | null>(null);

  const effectiveFilters = useMemo<TicketFilters>(
    () => ({ ...filters, status: tab ? [tab] : filters.status }),
    [filters, tab]
  );

  const { tickets, total, totalPages, loading, refetch } = useTickets(effectiveFilters);

  const patchFilters = (patch: Partial<TicketFilters>) =>
    setFilters(prev => ({ ...prev, ...patch }));

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">System Tickets</h1>
          <p className="text-sm text-gray-500">All tickets across the platform — {total} total</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-gray-600"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-6 border-b text-sm">
        {(['tickets', 'categories'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`-mb-px border-b-2 pb-2 font-medium capitalize ${
              view === v ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'categories' ? (
        <CategoryManager />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map(t => (
              <button
                key={t.key || 'all'}
                onClick={() => {
                  setTab(t.key);
                  patchFilters({ page: 1 });
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  tab === t.key
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <TicketFilterBar filters={filters} meta={meta} onChange={patchFilters} />

          <TicketTable tickets={tickets} loading={loading} onRowClick={t => setActiveId(t.id)} />

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <button
                disabled={filters.page <= 1}
                onClick={() => patchFilters({ page: filters.page - 1 })}
                className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-gray-500">
                {filters.page} / {totalPages}
              </span>
              <button
                disabled={filters.page >= totalPages}
                onClick={() => patchFilters({ page: filters.page + 1 })}
                className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <TicketDetailDrawer
        ticketId={activeId}
        isAdmin
        onClose={() => setActiveId(null)}
        onMutated={refetch}
      />
    </div>
  );
}

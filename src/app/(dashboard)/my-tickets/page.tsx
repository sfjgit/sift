// File: page.tsx
// Path: src/app/(dashboard)/my-tickets/page.tsx

'use client';

import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useTicketMeta, useTickets } from '@/hooks/useTickets';
import TicketTable from '@/components/tickets/TicketTable';
import TicketFilterBar from '@/components/tickets/TicketFilterBar';
import CreateTicketDialog from '@/components/tickets/CreateTicketDialog';
import TicketDetailDrawer from '@/components/tickets/TicketDetailDrawer';
import type { TicketFilters } from '@/types/ticket.types';

const INITIAL: TicketFilters = { page: 1, limit: 20 };

export default function MyTicketsPage() {
  const meta = useTicketMeta();
  const [filters, setFilters] = useState<TicketFilters>(INITIAL);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { tickets, total, totalPages, loading, refetch } = useTickets(filters);

  const patchFilters = (patch: Partial<TicketFilters>) =>
    setFilters(prev => ({ ...prev, ...patch }));

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">My Tickets</h1>
          <p className="text-sm text-gray-500">
            Raise a query and track its progress — {total} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-gray-600"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Raise ticket
          </button>
        </div>
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

      <CreateTicketDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refetch}
      />

      <TicketDetailDrawer
        ticketId={activeId}
        onClose={() => setActiveId(null)}
        onMutated={refetch}
      />
    </div>
  );
}

// File: TicketTable.tsx
// Path: src/components/tickets/TicketTable.tsx

'use client';

import { Paperclip } from 'lucide-react';
import { PriorityBadge, StatusBadge } from './TicketBadges';
import type { Ticket } from '@/types/ticket.types';

interface Props {
  tickets: Ticket[];
  loading: boolean;
  onRowClick: (ticket: Ticket) => void;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export default function TicketTable({ tickets, loading, onRowClick }: Props) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="rounded-lg border py-16 text-center text-sm text-gray-500">
        No tickets found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full divide-y text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Ticket</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Raised</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.map(t => (
            <tr
              key={t.id}
              onClick={() => onRowClick(t)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                {t.ticketNumber}
              </td>
              <td className="max-w-[320px] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-gray-900">{t.title}</span>
                  {!!t._count?.attachments && (
                    <span className="flex shrink-0 items-center gap-0.5 text-xs text-gray-400">
                      <Paperclip className="h-3 w-3" />
                      {t._count.attachments}
                    </span>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {t.category?.name ?? '—'}
              </td>
              <td className="px-4 py-3">
                <PriorityBadge value={t.priority} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={t.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmtDate(t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

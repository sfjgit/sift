// File: MeetingsList.tsx
// Path: src/features/clients/detail/MeetingsList.tsx
//
// Every meeting with this client (CASPA "Existing Meetings"): when, with which
// SPOC, agenda, who holds it, status and the minutes written when it was
// closed. Meetings are booked and closed from Activity & tasks.

'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineEmpty } from '@/components/common/SubSection';
import { Pill } from '@/components/common/badges';
import { downloadRecords } from '@/components/data-table/exporter';
import { useWorkTasks } from '@/features/work/WorkPanel';
import { usePermissions } from '@/features/auth/usePermissions';
import { fmtDateTime, fullName } from '@/lib/format';

const STATUS: Record<string, { label: string; tone: 'info' | 'primary' | 'success' }> = {
  OPEN: { label: 'Planned', tone: 'info' },
  IN_PROGRESS: { label: 'In progress', tone: 'primary' },
  DONE: { label: 'Held', tone: 'success' },
};

export function MeetingsList({
  clientId,
  clientName,
  onBook,
}: {
  clientId: string;
  clientName: string;
  /** opens the meeting composer in Activity & tasks */
  onBook?: () => void;
}) {
  const { data, isLoading } = useWorkTasks(clientId);
  const { isSuperAdmin } = usePermissions();
  const meetings = (data ?? [])
    .filter(t => t.kind === 'MEETING')
    .sort((a, b) => (b.dueAt ?? b.createdAt).localeCompare(a.dueAt ?? a.createdAt));

  if (isLoading) return <InlineEmpty>Loading meetings…</InlineEmpty>;

  const exportAll = () =>
    void downloadRecords(
      meetings.map(m => ({
        When: m.dueAt ? fmtDateTime(m.dueAt) : '',
        SPOC: m.spoc ? fullName(m.spoc) : '',
        Agenda: m.title,
        Notes: m.notes ?? '',
        With: fullName(m.assignee),
        Status: STATUS[m.status]?.label ?? m.status,
        Minutes: m.closeNote ?? '',
        'Booked by': fullName(m.createdBy),
      })),
      `${clientName}-meetings`.replace(/[^\w-]+/g, '-'),
      'xlsx'
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {meetings.length
            ? `${meetings.length} meeting${meetings.length === 1 ? '' : 's'} — book or close one in Activity & tasks`
            : 'No meetings yet.'}
        </p>
        <span className="flex gap-2">
          {isSuperAdmin && meetings.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportAll}>
              Export to Excel
            </Button>
          )}
          {onBook && (
            <Button size="sm" variant="outline" onClick={onBook}>
              <CalendarClock /> Book a meeting
            </Button>
          )}
        </span>
      </div>
      {meetings.length > 0 && (
        <div className="crm-box overflow-x-auto">
          <table className="crm-sheet">
            <thead>
              <tr>
                <th>When</th>
                <th>SPOC</th>
                <th>Agenda</th>
                <th>With</th>
                <th>Status</th>
                <th>Minutes / outcome</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map(m => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap tabular">
                    {m.dueAt ? fmtDateTime(m.dueAt) : '—'}
                  </td>
                  <td className="whitespace-nowrap">
                    {m.spoc ? (
                      <Link href={`/spocs/${m.spoc.id}`} className="text-primary hover:underline">
                        {fullName(m.spoc)}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-72">
                    <span className="font-medium">{m.title}</span>
                    {m.notes && (
                      <span
                        className="block truncate text-xs text-muted-foreground"
                        title={m.notes}
                      >
                        {m.notes}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{fullName(m.assignee)}</td>
                  <td>
                    <Pill tone={STATUS[m.status]?.tone ?? 'info'}>
                      {STATUS[m.status]?.label ?? m.status}
                    </Pill>
                  </td>
                  <td className="max-w-80 whitespace-pre-wrap">
                    {m.closeNote ?? <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

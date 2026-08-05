// File: TicketDetailDrawer.tsx
// Path: src/components/tickets/TicketDetailDrawer.tsx

'use client';

import { useState } from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTicketActions, useTicketDetail, useTicketMeta } from '@/hooks/useTickets';
import TicketFileUpload from './TicketFileUpload';
import { PriorityBadge, StatusBadge } from './TicketBadges';

interface Props {
  ticketId: string | null;
  isAdmin?: boolean;
  onClose: () => void;
  onMutated: () => void;
}

const input = 'w-full rounded-lg border px-3 py-2 text-sm';

export default function TicketDetailDrawer({
  ticketId,
  isAdmin = false,
  onClose,
  onMutated,
}: Props) {
  const meta = useTicketMeta();
  const { ticket, loading, refetch } = useTicketDetail(ticketId);
  const { updateTicket, addAttachments, deleteAttachment } = useTicketActions();
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  if (!ticketId) return null;

  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await updateTicket(ticketId, payload);
      toast.success('Ticket updated');
      await refetch();
      onMutated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    if (!newFiles.length) return;
    setBusy(true);
    try {
      await addAttachments(ticketId, newFiles);
      toast.success('Attachments uploaded');
      setNewFiles([]);
      await refetch();
      onMutated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setBusy(true);
    try {
      await deleteAttachment(ticketId, attachmentId);
      await refetch();
      onMutated();
    } catch {
      toast.error('Could not remove attachment');
    } finally {
      setBusy(false);
    }
  };

  const openFile = (url?: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
        <header className="sticky top-0 flex items-start justify-between border-b bg-white px-6 py-4">
          <div>
            <p className="font-mono text-xs text-gray-500">{ticket?.ticketNumber ?? '…'}</p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">
              {ticket?.title ?? 'Loading…'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </header>

        {loading || !ticket ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={ticket.status} />
              <PriorityBadge value={ticket.priority} />
              {ticket.category && (
                <span className="rounded-full border bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                  {ticket.category.name}
                </span>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase text-gray-500">Description</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {ticket.description || '—'}
              </p>
            </div>

            {isAdmin && (
              <div className="grid gap-4 rounded-lg border bg-gray-50 p-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                    Status
                  </label>
                  <select
                    value={ticket.status}
                    disabled={busy}
                    onChange={e => patch({ status: e.target.value })}
                    className={input}
                  >
                    {meta?.statuses.map(s => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                    Priority
                  </label>
                  <select
                    value={ticket.priority}
                    disabled={busy}
                    onChange={e => patch({ priority: e.target.value })}
                    className={input}
                  >
                    {meta?.priorities.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                    Category
                  </label>
                  <select
                    value={ticket.categoryId ?? ''}
                    disabled={busy}
                    onChange={e => patch({ categoryId: e.target.value || null })}
                    className={input}
                  >
                    <option value="">Unassigned</option>
                    {meta?.categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                Attachments ({ticket.attachments?.length ?? 0})
              </p>
              {ticket.attachments?.length ? (
                <ul className="divide-y rounded-lg border">
                  {ticket.attachments.map(a => (
                    <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="truncate">{a.fileName}</span>
                      <div className="flex items-center gap-3">
                        {a.url && (
                          <button
                            type="button"
                            title="Download"
                            onClick={() => openFile(a.url)}
                            className="text-gray-400 hover:text-gray-700"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remove"
                          onClick={() => handleDelete(a.id)}
                          disabled={busy}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No attachments</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-500">Add files</p>
              <TicketFileUpload files={newFiles} onChange={setNewFiles} />
              {!!newFiles.length && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={busy}
                  className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {busy ? 'Uploading…' : `Upload ${newFiles.length} file(s)`}
                </button>
              )}
            </div>

            <div className="space-y-1 border-t pt-4 text-xs text-gray-500">
              <p>Raised {new Date(ticket.createdAt).toLocaleString('en-IN')}</p>
              {ticket.resolvedAt && (
                <p>Resolved {new Date(ticket.resolvedAt).toLocaleString('en-IN')}</p>
              )}
              {ticket.closedAt && <p>Closed {new Date(ticket.closedAt).toLocaleString('en-IN')}</p>}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

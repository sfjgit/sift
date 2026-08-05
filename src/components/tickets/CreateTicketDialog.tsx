// File: CreateTicketDialog.tsx
// Path: src/components/tickets/CreateTicketDialog.tsx

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useTicketActions, useTicketMeta } from '@/hooks/useTickets';
import TicketFileUpload from './TicketFileUpload';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entityType?: string;
  entityId?: string;
}

const EMPTY = { title: '', description: '', priority: '', categoryId: '' };
const input = 'w-full rounded-lg border px-3 py-2 text-sm';

export default function CreateTicketDialog({
  open,
  onClose,
  onSuccess,
  entityType,
  entityId,
}: Props) {
  const meta = useTicketMeta();
  const { createTicket } = useTicketActions();
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (form.title.trim().length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }
    setSaving(true);
    try {
      await createTicket({ ...form, entityType, entityId }, files);
      toast.success('Ticket raised');
      setForm(EMPTY);
      setFiles([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to raise ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Raise a ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="Short summary of the issue"
              className={input}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Priority</label>
              <select value={form.priority} onChange={set('priority')} className={input}>
                <option value="">Default</option>
                {meta?.priorities.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select value={form.categoryId} onChange={set('categoryId')} className={input}>
                <option value="">Unassigned</option>
                {meta?.categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={4}
              placeholder="What happened, what did you expect, any steps to reproduce"
              className={input}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Attachments</label>
            <TicketFileUpload files={files} onChange={setFiles} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Submitting…' : 'Submit ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

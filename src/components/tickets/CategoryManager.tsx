/* eslint-disable @typescript-eslint/no-explicit-any */
// File: CategoryManager.tsx
// Path: src/components/tickets/CategoryManager.tsx

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTicketActions, useTicketCategories } from '@/hooks/useTickets';

export default function CategoryManager() {
  const { categories, loading, refetch } = useTicketCategories(true);
  const { createCategory, updateCategory } = useTicketActions();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (name.trim().length < 2) {
      toast.error('Category name is too short');
      return;
    }
    setBusy(true);
    try {
      await createCategory(name.trim());
      toast.success('Category created');
      setName('');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not create category');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    setBusy(true);
    try {
      await updateCategory(id, { isActive: !isActive });
      refetch();
    } catch {
      toast.error('Could not update category');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
      <p className="mt-1 text-xs text-gray-500">
        Inactive categories stay on old tickets but disappear from the raise form.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. Data Correction"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {loading ? (
        <div className="mt-4 h-20 animate-pulse rounded bg-gray-100" />
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {categories.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gray-400">No categories yet</li>
          )}
          {categories.map(c => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={c.isActive ? '' : 'text-gray-400 line-through'}>{c.name}</span>
                <span className="text-xs text-gray-400">{c._count?.tickets ?? 0} tickets</span>
              </div>
              <button
                onClick={() => toggle(c.id, c.isActive)}
                disabled={busy}
                className="text-xs font-medium text-gray-500 hover:text-gray-900"
              >
                {c.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

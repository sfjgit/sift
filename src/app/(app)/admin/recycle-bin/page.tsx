// File: page.tsx
// Path: src/app/(app)/admin/recycle-bin/page.tsx
//
// Recycle bin: everything deleted or changed, kept with how it was before —
// grouped by category, newest first. "Restore" puts one thing back exactly;
// "Undo the whole action" puts back everything that one action did.

'use client';

import { useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Loader2, Pencil, Plus, RotateCcw, Search, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/states';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { recycleApi, type ChangeEntry } from '@/lib/api/endpoints';
import { toApiError } from '@/lib/api/client';
import { fmtDateTime, fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

type Op = 'DELETE' | 'UPDATE' | 'CREATE';

const HIDE = new Set(['id', 'tenantId', 'createdAt', 'updatedAt', 'nameKey']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
/** fields worth showing: no ids, no empty values */
const readable = (row: Record<string, unknown>) =>
  Object.keys(row).filter(k => !HIDE.has(k) && !k.endsWith('Id') && row[k] !== null && row[k] !== '' && !(typeof row[k] === 'string' && UUID.test(row[k] as string)));
const show = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80);
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}T/.test(s) ? fmtDateTime(s) : s.slice(0, 120);
};
const fieldName = (k: string) => k.replace(/Id$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/** what a change did, field by field: "status: Active → Inactive" */
function ChangeLines({ e }: { e: ChangeEntry }) {
  if (e.op === 'DELETE' || e.op === 'CREATE') {
    const row = (e.op === 'DELETE' ? e.before : e.after) as Record<string, unknown> | null ?? {};
    const keys = readable(row).slice(0, 6);
    return (
      <p className="text-xs text-muted-foreground">
        {keys.map(k => `${fieldName(k)}: ${show(row[k])}`).join(' · ')}
      </p>
    );
  }
  const after = (e.after ?? {}) as { fields?: string[]; data?: Record<string, unknown> };
  const fields = after.fields ?? Object.keys(e.before ?? {});
  return (
    <ul className="space-y-0.5 text-xs">
      {fields.slice(0, 8).map(f => (
        <li key={f} className="text-muted-foreground">
          <span className="font-medium text-foreground">{fieldName(f)}</span>: {show(e.before?.[f])}{' '}
          <span className="text-muted-foreground/70">→</span> {f in (after.data ?? {}) ? show(after.data![f]) : 'changed'}
        </li>
      ))}
    </ul>
  );
}

function RecycleBin() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const canRestore = can('recycle_bin.restore');
  const [op, setOp] = useState<Op>('DELETE');
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const cats = useQuery({ queryKey: ['recycle', 'cats'], queryFn: recycleApi.categories });
  const list = useInfiniteQuery({
    queryKey: ['recycle', 'list', op, category, q],
    queryFn: ({ pageParam }) => recycleApi.list({ op, ...(category && { category }), ...(q && { q }), page: pageParam, limit: 50 }),
    initialPageParam: 1,
    getNextPageParam: last => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
  });
  const rows = list.data?.pages.flatMap(p => p.data) ?? [];
  const catList = (cats.data ?? []).filter(c => c.op === op).sort((a, b) => b.count - a.count);
  const totalOf = (o: Op) => (cats.data ?? []).filter(c => c.op === o).reduce((s, c) => s + c.count, 0);

  const run = async (key: string, fn: () => Promise<{ restored: number; failed: { reason: string }[] }>) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r.failed.length) toast.error(r.failed[0]!.reason, { description: r.restored ? `${r.restored} put back` : undefined });
      else toast.success(r.restored > 1 ? `${r.restored} things put back` : 'Put back');
      qc.invalidateQueries({ queryKey: ['recycle'] });
      qc.invalidateQueries();
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recycle bin"
        description="Everything deleted or changed is kept here with how it was before. Restore one thing, or undo a whole action."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Op>
          value={op}
          onChange={v => {
            setOp(v);
            setCategory(null);
          }}
          options={[
            { value: 'DELETE', label: `Deleted · ${totalOf('DELETE')}`, icon: Trash2 },
            { value: 'UPDATE', label: `Changed · ${totalOf('UPDATE')}`, icon: Pencil },
            { value: 'CREATE', label: `Added · ${totalOf('CREATE')}`, icon: Plus },
          ]}
        />
        <div className="relative ml-auto w-72 max-w-full">
          <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name…" className="h-8 pl-8" />
        </div>
      </div>

      {catList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn('rounded-full border px-2.5 py-0.5 text-[12.5px] font-medium', !category ? 'border-primary/40 bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
          >
            All
          </button>
          {catList.map(c => (
            <button
              key={c.category}
              type="button"
              onClick={() => setCategory(c.category)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[12.5px] font-medium',
                category === c.category ? 'border-primary/40 bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {c.category} <span className="tabular opacity-70">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState
          icon={ArchiveRestore}
          title={op === 'DELETE' ? 'Nothing deleted' : op === 'CREATE' ? 'Nothing added' : 'No changes'}
          description="When something is deleted or changed, it shows up here and can be put back."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card shadow-card">
          {rows.map(e => (
            <li key={e.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                  e.op === 'DELETE' ? 'bg-destructive/10 text-destructive' : e.op === 'CREATE' ? 'bg-success/12 text-success' : 'bg-primary/10 text-primary'
                )}
              >
                {e.op === 'DELETE' ? <Trash2 className="size-4" /> : e.op === 'CREATE' ? <Plus className="size-4" /> : <Pencil className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px]">
                  <span className="font-medium">{e.label ?? 'Untitled'}</span>
                  <span className="ml-2 rounded bg-muted px-1.5 py-px text-[11px] text-muted-foreground">{e.category}</span>
                  {e.source === 'ai' && <span className="ml-1 rounded bg-violet-500/10 px-1.5 py-px text-[11px] text-violet-600">by AI</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground" title={fmtDateTime(e.createdAt)}>
                  {e.op === 'DELETE' ? 'Deleted' : e.op === 'CREATE' ? 'Added' : 'Changed'} by {e.actor ?? 'someone'} · {fmtRelative(e.createdAt)}
                </p>
                <div className="mt-1">
                  <ChangeLines e={e} />
                </div>
              </div>
              {canRestore && (
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(e.id, () => recycleApi.restore(e.id))}>
                    {busy === e.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} {e.op === 'DELETE' ? 'Restore' : e.op === 'CREATE' ? 'Remove again' : 'Change back'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Put back everything this one action did"
                    disabled={!!busy}
                    onClick={() => run(`b-${e.batchId}`, () => recycleApi.undoBatch(e.batchId))}
                  >
                    {busy === `b-${e.batchId}` ? <Loader2 className="animate-spin" /> : <Undo2 />} Undo action
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {list.hasNextPage && (
        <Button variant="outline" className="w-full" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
          {list.isFetchingNextPage ? 'Loading…' : 'Load older'}
        </Button>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="recycle_bin.read">
      <RecycleBin />
    </RequirePermission>
  );
}

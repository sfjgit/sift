// File: OrgView.tsx
// Path: src/features/org/OrgView.tsx
//
// Organisation: the reporting tree as a chart — drag, zoom, fold teams, search,
// click a person for their numbers. Everyone sees themselves and the people
// below them; people with users.read see more.

'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTitle } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/states';
import { OrgChart } from '@/features/org/OrgChart';
import { PersonPanel } from '@/features/org/PersonPanel';
import type { OrgNode } from '@/features/org/types';
import { usersApi } from '@/lib/api/endpoints';

/** the org chart with totals, search and the person panel — /org and Admin → Org structure */
export function OrgView({ embedded = false }: { embedded?: boolean }) {
  const q = useQuery({ queryKey: ['org-tree'], queryFn: () => usersApi.orgTree(), staleTime: 60_000 });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const { byId, bossOf, totals } = useMemo(() => {
    const byId = new Map<string, OrgNode>();
    const bossOf = new Map<string, OrgNode>();
    const walk = (n: OrgNode) => {
      byId.set(n.id, n);
      n.children.forEach(c => (bossOf.set(c.id, n), walk(c)));
    };
    if (q.data) walk(q.data.root);
    const people = [...byId.values()].filter(n => !n.virtual);
    return {
      byId,
      bossOf,
      totals: {
        people: people.length,
        managers: people.filter(n => n.children.length).length,
        clients: people.reduce((s, n) => s + n.stats.clients, 0),
        spocs: people.reduce((s, n) => s + n.stats.spocs, 0),
        overdue: people.reduce((s, n) => s + n.stats.overdue, 0),
      },
    };
  }, [q.data]);
  const node = selected ? byId.get(selected) : undefined;

  return (
    <div
      className={
        embedded
          ? 'flex h-[calc(100vh-12rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border bg-card'
          : '-mx-4 -my-3 flex h-[calc(100vh-3.5rem)] flex-col md:-mx-5'
      }
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-card px-5 py-3">
        {!embedded && <PageTitle hint="Who reports to whom, and what each person carries">Org chart</PageTitle>}
        {q.data && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
            <span>
              <b className="text-foreground tabular-nums">{totals.people}</b> people
            </span>
            <span>
              <b className="text-foreground tabular-nums">{totals.managers}</b> with a team
            </span>
            <span>
              <b className="text-foreground tabular-nums">{totals.clients}</b> client assignments
            </span>
            <span>
              <b className="text-foreground tabular-nums">{totals.spocs}</b> SPOCs
            </span>
            {totals.overdue > 0 && (
              <span className="text-destructive">
                <b className="tabular-nums">{totals.overdue}</b> overdue tasks
              </span>
            )}
          </div>
        )}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, role, department…" className="h-8 w-60 pl-8 text-[13px]" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 p-3">
          {q.isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : q.error || !q.data ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} className="h-full" />
          ) : q.data.total === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Network className="size-10 opacity-30" />
              <p className="text-sm">No one to show yet</p>
            </div>
          ) : (
            <OrgChart tree={q.data.root} search={search} selectedId={selected} onSelect={n => setSelected(s => (s === n.id ? null : n.id))} />
          )}
        </div>
        {node && <PersonPanel node={node} boss={bossOf.get(node.id) ?? null} onClose={() => setSelected(null)} onPick={n => setSelected(n.id)} />}
      </div>
    </div>
  );
}

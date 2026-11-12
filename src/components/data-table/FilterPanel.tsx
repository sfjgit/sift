// File: FilterPanel.tsx
// Path: src/components/data-table/FilterPanel.tsx
//
// Left-hand "Filter by" panel (Zoho style): every filter is listed as a
// checkbox; ticking one opens its options right there. Changes are a draft
// until Apply, like the filter sheet. Saved views sit above the fields.

'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, RotateCcw, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { viewsApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils';
import { Control } from './FilterSheet';
import { viewKeys } from './ViewsMenu';
import type { FilterDef, TableViewConfig } from './types';
import type { TableController } from './useTableState';

const same = (a: Record<string, string>, b: Record<string, string>) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

function SavedViews({ module, table }: { module: string; table: TableController }) {
  const [open, setOpen] = useState(true);
  const { data: views = [] } = useQuery({
    queryKey: viewKeys(module),
    queryFn: () => viewsApi.list<TableViewConfig>(module),
    staleTime: 60_000,
  });
  if (!views.length) return null;
  return (
    <section className="border-b pb-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-1.5 px-4 py-2.5 text-[14px] font-semibold"
      >
        <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
        Saved views
        <span className="rounded-full bg-muted px-1.5 text-[12px] font-medium text-muted-foreground">
          {views.length}
        </span>
      </button>
      {open && (
        <ul className="px-2">
          {views.map(v => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => table.actions.applyView(v.config)}
                className="flex w-full items-center rounded-md px-3 py-1.5 text-left text-[14px] hover:bg-accent"
                title={v.isOwner ? 'Your view' : 'Shared with everyone'}
              >
                <span className="truncate">{v.name}</span>
                {!v.isOwner && (
                  <span className="ml-auto pl-2 text-[12px] text-muted-foreground">shared</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FilterPanel({
  module,
  title,
  filters,
  table,
  className,
}: {
  /** saved-view module ("clients") */
  module: string;
  /** "Filter clients by" */
  title: string;
  filters: FilterDef[];
  table: TableController;
  className?: string;
}) {
  const { state, actions } = table;
  const owned = useMemo(() => new Set(filters.map(f => f.key)), [filters]);
  const appliedOwn = useMemo(
    () => Object.fromEntries(Object.entries(state.filters).filter(([k]) => owned.has(k))),
    [state.filters, owned]
  );

  // draft follows what is applied whenever that changes elsewhere (chips, views, tabs)
  const [draft, setDraft] = useState(appliedOwn);
  const [labels, setLabels] = useState(state.filterLabels);
  const [ticked, setTicked] = useState(() => new Set(Object.keys(appliedOwn)));
  const [seen, setSeen] = useState(appliedOwn);
  if (!same(seen, appliedOwn)) {
    setSeen(appliedOwn);
    setDraft(appliedOwn);
    setLabels(state.filterLabels);
    setTicked(new Set(Object.keys(appliedOwn)));
  }

  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const out = new Map<string, FilterDef[]>();
    const needle = q.trim().toLowerCase();
    for (const f of filters) {
      if (needle && !f.label.toLowerCase().includes(needle)) continue;
      const g = f.group ?? 'Filters';
      out.set(g, [...(out.get(g) ?? []), f]);
    }
    return [...out.entries()];
  }, [filters, q]);

  const set = (key: string) => (v: string | null, label?: string) => {
    setDraft(d => {
      const n = { ...d };
      if (v) n[key] = v;
      else delete n[key];
      return n;
    });
    setLabels(l => {
      const n = { ...l };
      if (v && label) n[key] = label;
      else if (!v) delete n[key];
      return n;
    });
  };

  const tick = (key: string, on: boolean) => {
    setTicked(t => {
      const n = new Set(t);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
    if (!on) set(key)(null);
  };

  const dirty = !same(draft, appliedOwn);
  const apply = () => {
    const rest = Object.fromEntries(Object.entries(state.filters).filter(([k]) => !owned.has(k)));
    actions.setFilters({ ...rest, ...draft }, labels);
  };
  const clear = () => {
    setDraft({});
    setTicked(new Set());
    const rest = Object.fromEntries(Object.entries(state.filters).filter(([k]) => !owned.has(k)));
    actions.setFilters(rest, {});
  };

  return (
    <aside
      className={cn(
        'flex w-[17rem] shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-card',
        className
      )}
      aria-label={title}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SavedViews module={module} table={table} />

        <div className="space-y-2.5 px-4 pt-3 pb-2">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search fields"
              className="h-8 w-full rounded-md border border-input bg-transparent pr-2 pl-8 text-[14px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </div>

        {groups.map(([group, defs]) => {
          const isCollapsed = collapsed.has(group) && !q;
          const on = defs.filter(d => draft[d.key]).length;
          return (
            <section key={group} className="pb-1">
              <button
                type="button"
                onClick={() =>
                  setCollapsed(c => {
                    const n = new Set(c);
                    if (n.has(group)) n.delete(group);
                    else n.add(group);
                    return n;
                  })
                }
                className="flex w-full items-center gap-1.5 px-4 py-2 text-[14px] font-semibold"
              >
                <ChevronDown
                  className={cn('size-3.5 transition-transform', isCollapsed && '-rotate-90')}
                />
                {group}
                {on > 0 && (
                  <span className="ml-auto rounded-full bg-primary/10 px-1.5 text-[12px] font-medium text-primary">
                    {on}
                  </span>
                )}
              </button>
              {!isCollapsed && (
                <ul className="space-y-0.5 px-2">
                  {defs.map(def => {
                    const isOn = ticked.has(def.key) || !!draft[def.key];
                    return (
                      <li key={def.key} className={cn('rounded-md', isOn && 'bg-surface')}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[14px] hover:bg-accent/60">
                          <Checkbox checked={isOn} onCheckedChange={v => tick(def.key, !!v)} />
                          <span className="truncate">{def.label}</span>
                        </label>
                        {isOn && (
                          <div className="space-y-1.5 px-2 pt-1 pb-2.5">
                            {def.hint && (
                              <p className="text-[12.5px] leading-snug text-muted-foreground">
                                {def.hint}
                              </p>
                            )}
                            <Control
                              def={def}
                              value={draft[def.key]}
                              stored={labels[def.key]}
                              draft={draft}
                              onChange={set(def.key)}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
        {!groups.length && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">No field matches</p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t bg-card px-3 py-2.5">
        <Button size="sm" className="flex-1" onClick={apply} disabled={!dirty}>
          Apply filter
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={clear}
          disabled={!Object.keys(appliedOwn).length && !Object.keys(draft).length}
        >
          <RotateCcw /> Clear
        </Button>
      </div>
    </aside>
  );
}

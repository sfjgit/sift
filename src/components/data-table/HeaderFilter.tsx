// File: HeaderFilter.tsx
// Path: src/components/data-table/HeaderFilter.tsx
//
// The funnel in a column heading: sort this column, and filter by it right there —
// tick values (with how many rows have each), "contains" search, from / to numbers or dates.
// Every change applies at once through the table's normal filters (chips, URL, saved views).

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ListFilter,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ListParams } from '@/types/api';
import type { Facet, HeaderFilter as Def, SortState } from './types';

export type FacetFetcher = (field: string, params: ListParams) => Promise<Facet[]>;

export const headerFilterKeys = (d: Def): string[] =>
  d.type === 'range' ? [d.minKey, d.maxKey] : d.type === 'dates' ? [d.fromKey, d.toKey] : [d.key];

const fmt = (n: number) => n.toLocaleString('en-IN');

export function HeaderFilter({
  tableId,
  label,
  def,
  sortKey,
  numeric,
  sort,
  setSort,
  filters,
  setFilter,
  params,
  facets,
}: {
  tableId: string;
  label: string;
  def?: Def;
  sortKey?: string;
  numeric?: boolean;
  sort: SortState | null;
  setSort: (s: SortState | null) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string | null, label?: string) => void;
  params: ListParams;
  facets?: FacetFetcher;
}) {
  const [open, setOpen] = useState(false);
  const keys = def ? headerFilterKeys(def) : [];
  const active = keys.some(k => filters[k]);
  const picked =
    (def?.type === 'values' || def?.type === 'options') && filters[def.key]
      ? filters[def.key]!.split(',').length
      : 0;
  const sortedHere = !!sortKey && sort?.id === sortKey;
  const num = numeric || def?.type === 'range' || def?.type === 'dates';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={e => e.stopPropagation()}
          aria-label={`Sort or filter ${label}`}
          title={active ? `Filtered — change or clear` : `Sort or filter by ${label}`}
          className={cn(
            'relative inline-flex size-5 shrink-0 items-center justify-center rounded transition-colors',
            active
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'
          )}
        >
          <ListFilter className="size-3" />
          {picked > 1 && (
            <span className="absolute -top-1.5 -right-1.5 rounded-full bg-primary px-1 text-[9px] leading-3.5 font-semibold text-primary-foreground ring-2 ring-background">
              {picked}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="truncate text-sm font-semibold">{label}</span>
          {active && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => keys.forEach(k => setFilter(k, null))}
            >
              Clear filter
            </button>
          )}
        </div>

        {sortKey && (
          <div className="flex gap-1.5 border-b p-2">
            {[false, true].map(desc => {
              const on = sortedHere && sort!.desc === desc;
              const Icon = desc ? ArrowDownWideNarrow : ArrowUpNarrowWide;
              return (
                <button
                  key={String(desc)}
                  type="button"
                  onClick={() => setSort(on ? null : { id: sortKey, desc })}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium',
                    on ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  <Icon className="size-3.5" />
                  {num ? (desc ? 'High → Low' : 'Low → High') : desc ? 'Z → A' : 'A → Z'}
                </button>
              );
            })}
          </div>
        )}

        {def?.type === 'values' && facets && (
          <ValuesFilter
            tableId={tableId}
            def={def}
            value={filters[def.key]}
            params={params}
            facets={facets}
            enabled={open}
            onChange={(v, l) => setFilter(def.key, v, l)}
          />
        )}
        {def?.type === 'options' && (
          <div className="py-1">
            {def.options.map(o => {
              const cur = filters[def.key] ? filters[def.key]!.split(',') : [];
              const on = cur.includes(o.value);
              const next = def.multi
                ? on
                  ? cur.filter(v => v !== o.value)
                  : [...cur, o.value]
                : on
                  ? []
                  : [o.value];
              return (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={on}
                    onCheckedChange={() =>
                      setFilter(
                        def.key,
                        next.length ? next.join(',') : null,
                        def.options
                          .filter(x => next.includes(x.value))
                          .map(x => x.label)
                          .join(', ') || undefined
                      )
                    }
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        )}
        {def?.type === 'text' && (
          <TextFilter
            value={filters[def.key] ?? ''}
            placeholder={def.placeholder ?? `${label} contains…`}
            onChange={v => setFilter(def.key, v || null)}
          />
        )}
        {def?.type === 'range' && (
          <PairFilter
            type="number"
            unit={def.unit}
            from={filters[def.minKey] ?? ''}
            to={filters[def.maxKey] ?? ''}
            onFrom={v => setFilter(def.minKey, v || null)}
            onTo={v => setFilter(def.maxKey, v || null)}
          />
        )}
        {def?.type === 'dates' && (
          <PairFilter
            type="date"
            from={filters[def.fromKey] ?? ''}
            to={filters[def.toKey] ?? ''}
            onFrom={v => setFilter(def.fromKey, v || null)}
            onTo={v => setFilter(def.toKey, v || null)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function ValuesFilter({
  tableId,
  def,
  value,
  params,
  facets,
  enabled,
  onChange,
}: {
  tableId: string;
  def: Extract<Def, { type: 'values' }>;
  value?: string;
  params: ListParams;
  facets: FacetFetcher;
  enabled: boolean;
  onChange: (value: string | null, label?: string) => void;
}) {
  const [q, setQ] = useState('');
  // the server searches the values (its labels); fixed label maps (status, type) are searched here
  const serverSearch = !def.labels;
  const [dq, setDq] = useState('');
  useEffect(() => {
    if (!serverSearch) return;
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q, serverSearch]);
  const known = useRef(new Map<string, string>());
  // counts follow every other filter, not paging / sorting / this column's own filter
  const base = useMemo(() => {
    const p: Record<string, unknown> = { ...params };
    for (const k of ['page', 'limit', 'sortBy', 'sortDir', def.key]) delete p[k];
    return p as ListParams;
  }, [params, def.key]);
  const res = useQuery({
    queryKey: [tableId, 'facets', def.facet, base, dq],
    queryFn: () => facets(def.facet, dq ? { ...base, q: dq } : base),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const selected = useMemo(() => new Set(value ? value.split(',') : []), [value]);
  const name = (f: Facet) => (f.value && def.labels?.[f.value]) || f.label || f.value || '(blank)';
  const rows = (res.data ?? []).filter(f => f.value);
  const blank = (res.data ?? []).find(f => !f.value);
  const shown = rows
    .filter(f => serverSearch || !q || name(f).toLowerCase().includes(q.toLowerCase()))
    // ticked ones stay on top
    .sort((a, b) => Number(selected.has(b.value!)) - Number(selected.has(a.value!)));

  const toggle = (f: Facet) => {
    // remember labels seen, so a value ticked before a search keeps its name in the chip
    for (const r of rows) known.current.set(r.value!, name(r));
    const next = new Set(selected);
    if (next.has(f.value!)) next.delete(f.value!);
    else next.add(f.value!);
    const list = [...next];
    const labels = list.map(v => known.current.get(v) ?? v);
    onChange(list.length ? list.join(',') : null, labels.join(', ') || undefined);
  };

  return (
    <div>
      {
        <div className="relative border-b p-2">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search values"
            className="h-8 pl-7 text-sm"
          />
          {res.isFetching && !res.isLoading && (
            <Loader2 className="absolute top-1/2 right-4 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      }
      <div className="max-h-72 overflow-y-auto py-1">
        {res.isLoading && (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Counting…
          </div>
        )}
        {res.isError && (
          <div className="px-3 py-3 text-xs text-destructive">Couldn’t load values.</div>
        )}
        {!res.isLoading && !res.isError && !shown.length && (
          <div className="px-3 py-3 text-xs text-muted-foreground">No values.</div>
        )}
        {shown.map(f => (
          <label
            key={f.value}
            className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Checkbox checked={selected.has(f.value!)} onCheckedChange={() => toggle(f)} />
            <span className="min-w-0 flex-1 truncate" title={name(f)}>
              {name(f)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{fmt(f.count)}</span>
          </label>
        ))}
      </div>
      {blank && (
        <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
          {fmt(blank.count)} with no value
        </div>
      )}
    </div>
  );
}

function TextFilter({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  // cleared / changed elsewhere (chip ×, Clear filter) → show it
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value);
  }
  // applies after a short pause in typing
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <div className="relative p-2">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onChange(text.trim())}
        placeholder={placeholder}
        className="h-8 pr-7 pl-7 text-sm"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => {
            setText('');
            onChange('');
          }}
          className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function PairFilter({
  type,
  unit,
  from,
  to,
  onFrom,
  onTo,
}: {
  type: 'number' | 'date';
  unit?: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  const [a, setA] = useState(from);
  const [b, setB] = useState(to);
  const [seen, setSeen] = useState(`${from}|${to}`);
  if (seen !== `${from}|${to}`) {
    setSeen(`${from}|${to}`);
    setA(from);
    setB(to);
  }
  const field = (v: string, set: (v: string) => void, apply: (v: string) => void, ph: string) => (
    <Input
      type={type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      min={type === 'number' ? 0 : undefined}
      value={v}
      placeholder={ph}
      onChange={e => {
        set(e.target.value);
        if (type === 'date') apply(e.target.value);
      }}
      onBlur={() => type === 'number' && apply(v.trim())}
      onKeyDown={e => e.key === 'Enter' && apply(v.trim())}
      className="h-8 text-sm"
    />
  );
  return (
    <div className="space-y-1.5 p-2">
      <div className="grid grid-cols-2 gap-2">
        {field(a, setA, onFrom, 'From')}
        {field(b, setB, onTo, 'To')}
      </div>
      {unit && (
        <p className="text-[11px] text-muted-foreground">In {unit}. Press Enter to apply.</p>
      )}
    </div>
  );
}

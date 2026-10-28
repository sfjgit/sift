// File: FilterSheet.tsx
// Path: src/components/data-table/FilterSheet.tsx
//
// The filter panel: a wide sheet with one card per filter group in a grid.
// Short choice lists are pills, longer ones (pick-lists, people) are inline
// checkbox lists with search. Changes are a draft — nothing touches the table
// until Apply; Cancel throws the draft away. Values stay "a,b,c" strings.

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Check,
  GitBranch,
  ListFilter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/common/states';
import { useLookups, useMasters, useUserOptions } from '@/hooks/queries';
import { useGeoCities, useGeoCountries, useGeoStates } from '@/hooks/geo';
import { fmtDate, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FilterDef } from './types';
import type { TableController } from './useTableState';

const GROUP_ICON: Record<string, LucideIcon> = {
  Ownership: Users,
  Company: Building2,
  'Pipeline & data': GitBranch,
  Location: MapPin,
  Dates: CalendarDays,
};

const split = (v?: string) => (v ? v.split(',').filter(Boolean) : []);
const multiOf = (def: FilterDef) => 'multi' in def && !!def.multi;
const names = (stored?: string): Record<string, string> => {
  try {
    const v = stored ? JSON.parse(stored) : {};
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

type Opt = { value: string; label: string; group?: string };
type Change = (value: string | null, label?: string) => void;

/** next value after ticking / unticking one option */
const toggled = (def: FilterDef, value: string | undefined, v: string) => {
  const cur = split(value);
  if (!multiOf(def)) return cur[0] === v ? null : v;
  const next = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
  return next.join(',') || null;
};

// ── controls ─────────────────────────────────────────────────────────────────

function Pills({
  def,
  options,
  value,
  onChange,
}: {
  def: FilterDef;
  options: Opt[];
  value?: string;
  onChange: Change;
}) {
  const cur = split(value);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = cur.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(toggled(def, value, o.value))}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] transition-colors',
              on
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'bg-card hover:border-primary/40'
            )}
          >
            {on && <Check className="size-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** inline checkbox list with search; options may carry a group heading */
function CheckList({
  def,
  options,
  value,
  onChange,
  loading,
  onSearch,
  placeholder = 'Search…',
}: {
  def: FilterDef;
  options: Opt[];
  value?: string;
  onChange: (value: string | null, picked: Opt[]) => void;
  loading?: boolean;
  /** server search; without it the list filters itself */
  onSearch?: (q: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const cur = split(value);
  const shown = useMemo(
    () =>
      onSearch || !q
        ? options
        : options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())),
    [options, q, onSearch]
  );
  // what was ticked when the panel opened goes first (fixed, so rows don't jump while clicking)
  const [pinned] = useState(() => new Set(split(value)));
  const byGroup = useMemo(() => {
    const m = new Map<string, Opt[]>();
    const ordered = [...shown.filter(o => pinned.has(o.value)), ...shown.filter(o => !pinned.has(o.value))];
    for (const o of ordered) m.set(o.group ?? '', [...(m.get(o.group ?? '') ?? []), o]);
    return [...m.entries()];
  }, [shown, pinned]);
  const all = new Map(options.map(o => [o.value, o]));
  const emit = (ids: string[]) =>
    onChange(
      ids.join(',') || null,
      ids.map(i => all.get(i) ?? { value: i, label: '' })
    );

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="relative border-b">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={e => {
            setQ(e.target.value);
            onSearch?.(e.target.value);
          }}
          placeholder={placeholder}
          className="h-9 w-full bg-transparent pr-2 pl-8 text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {loading && !options.length ? (
          <div className="flex justify-center py-5">
            <Spinner />
          </div>
        ) : !shown.length ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matches</p>
        ) : (
          byGroup.map(([g, opts]) => (
            <div key={g || '_'}>
              {g && (
                <p className="sticky top-0 bg-surface px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  {g}
                </p>
              )}
              {opts.map(o => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-accent/50"
                >
                  {multiOf(def) ? (
                    <Checkbox
                      checked={cur.includes(o.value)}
                      onCheckedChange={() => emit(split(toggled(def, value, o.value) ?? ''))}
                    />
                  ) : (
                    // one value only: a radio, so it never looks like several can be ticked
                    <button
                      type="button"
                      role="radio"
                      aria-checked={cur.includes(o.value)}
                      onClick={() => emit(split(toggled(def, value, o.value) ?? ''))}
                      className="grid size-4 shrink-0 place-items-center rounded-full border border-input"
                    >
                      {cur.includes(o.value) && <span className="size-2 rounded-full bg-primary" />}
                    </button>
                  )}
                  <span className="truncate">{o.label}</span>
                </label>
              ))}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs">
        {multiOf(def) ? (
          <button
            type="button"
            className="font-medium text-primary hover:underline disabled:opacity-40"
            disabled={!shown.length}
            onClick={() => emit([...new Set([...cur, ...shown.map(o => o.value)])])}
          >
            Select shown
          </button>
        ) : (
          <span className="text-muted-foreground">Pick one</span>
        )}
        <span className="text-muted-foreground">
          {cur.length ? (
            <button type="button" className="hover:text-foreground" onClick={() => emit([])}>
              {cur.length} selected · Clear
            </button>
          ) : (
            'None selected'
          )}
        </span>
      </div>
    </div>
  );
}

function LookupList({
  def,
  type,
  value,
  onChange,
}: {
  def: FilterDef;
  type: Parameters<typeof useLookups>[0];
  value?: string;
  onChange: Change;
}) {
  const { data = [], isLoading } = useLookups(type);
  const options = useMemo(
    () => data.filter(l => l.isActive !== false).map(l => ({ value: l.id, label: l.label })),
    [data]
  );
  return (
    <CheckList
      def={def}
      options={options}
      value={value}
      loading={isLoading}
      onChange={v => onChange(v)}
    />
  );
}

function MasterList({
  def,
  kind,
  value,
  onChange,
}: {
  def: FilterDef;
  kind: Parameters<typeof useMasters>[0];
  value?: string;
  onChange: Change;
}) {
  const { data = [], isLoading } = useMasters(kind);
  const options = useMemo(
    () => data.filter(m => m.isActive).map(m => ({ value: m.id, label: m.name })),
    [data]
  );
  return (
    <CheckList
      def={def}
      options={options}
      value={value}
      loading={isLoading}
      onChange={v => onChange(v)}
    />
  );
}

/** people: server search, grouped by designation; picked names are kept for chips */
function PeopleList({
  def,
  value,
  stored,
  onChange,
}: {
  def: FilterDef;
  value?: string;
  stored?: string;
  onChange: Change;
}) {
  const [search, setSearch] = useState('');
  const [debounced] = useDebounce(search, 250);
  const purpose = def.type === 'user' ? def.purpose : undefined;
  const { data = [], isFetching } = useUserOptions(debounced, purpose ?? 'filter', true, 100);
  const known = names(stored);
  const options = useMemo(() => {
    const found: Opt[] = data
      .map(u => ({
        value: u.id,
        label: fullName(u),
        group: u.designation?.name ?? 'No designation',
      }))
      .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
    const seen = new Set(found.map(o => o.value));
    const picked = split(value)
      .filter(v => !seen.has(v))
      .map(v => ({ value: v, label: known[v] ?? 'Selected person', group: 'Selected' }));
    return [...picked, ...found];
  }, [data, value, known]);

  return (
    <CheckList
      def={def}
      options={options}
      value={value}
      loading={isFetching}
      onSearch={setSearch}
      placeholder="Search name or email"
      onChange={(v, picked) => {
        const map = { ...known };
        for (const o of picked) if (o.label) map[o.value] = o.label;
        const ids = split(v ?? '');
        onChange(
          v,
          JSON.stringify(Object.fromEntries(ids.map(i => [i, map[i] ?? 'Selected person'])))
        );
      }}
    />
  );
}

/**
 * Country / state / city: each level lists only what fits the picked parents
 * (other filters' draft values), grouped by its parent, and drops picks that no
 * longer fit when a parent changes. Values are plain names.
 */
function GeoList({
  def,
  value,
  draft,
  onChange,
}: {
  def: Extract<FilterDef, { type: 'geo' }>;
  value?: string;
  draft: Record<string, string>;
  onChange: Change;
}) {
  const countries = def.countryKey ? split(draft[def.countryKey]) : [];
  const states = def.stateKey ? split(draft[def.stateKey]) : [];
  const [search, setSearch] = useState('');
  const [q] = useDebounce(search, 200);
  const limit = states.length ? 500 : 150;

  const c = useGeoCountries(def.level === 'country');
  const st = useGeoStates(countries.length ? countries : undefined, def.level === 'state');
  const ci = useGeoCities({ countries, states, q, limit }, def.level === 'city');

  const options = useMemo<Opt[]>(() => {
    if (def.level === 'country') return (c.data ?? []).map(x => ({ value: x.name, label: x.name }));
    if (def.level === 'state')
      return (st.data ?? []).map(x => ({
        value: x.name,
        label: x.name,
        group: countries.length > 1 ? x.country : undefined,
      }));
    const found = (ci.data ?? []).map(x => ({ value: x.name, label: x.name, group: x.state }));
    // picked cities outside the current search stay visible
    const seen = new Set(found.map(o => o.value));
    return [
      ...split(value)
        .filter(v => !seen.has(v))
        .map(v => ({ value: v, label: v, group: 'Selected' })),
      ...found,
    ];
  }, [def.level, c.data, st.data, ci.data, countries.length, value]);

  // a parent changed: drop picks that don't belong to it any more
  const fullList =
    def.level === 'state' ? st.data : !q && ci.data && ci.data.length < limit ? ci.data : undefined;
  const parentSet = def.level === 'state' ? countries.length > 0 : states.length > 0;
  useEffect(() => {
    if (def.level === 'country' || !parentSet || !fullList || !value) return;
    const ok = new Set(fullList.map(x => x.name));
    const cur = split(value);
    const keep = cur.filter(v => ok.has(v));
    if (keep.length !== cur.length) onChange(keep.join(',') || null);
  }, [def.level, parentSet, fullList, value, onChange]);

  return (
    <CheckList
      def={def}
      options={options}
      value={value}
      loading={
        def.level === 'country' ? c.isLoading : def.level === 'state' ? st.isLoading : ci.isFetching
      }
      onSearch={def.level === 'city' ? setSearch : undefined}
      placeholder={
        def.level === 'city'
          ? states.length
            ? `Search cities in ${states.length === 1 ? states[0] : `${states.length} states`}`
            : 'Search cities (pick a state to see all of its cities)'
          : `Search ${def.level === 'country' ? 'countries' : 'states'}`
      }
      onChange={v => onChange(v)}
    />
  );
}

function Control({
  def,
  value,
  stored,
  draft,
  onChange,
}: {
  def: FilterDef;
  value?: string;
  stored?: string;
  draft: Record<string, string>;
  onChange: Change;
}) {
  switch (def.type) {
    case 'geo':
      return <GeoList def={def} value={value} draft={draft} onChange={onChange} />;
    case 'select':
      return def.options.length <= 8 ? (
        <Pills def={def} options={def.options} value={value} onChange={onChange} />
      ) : (
        <CheckList def={def} options={def.options} value={value} onChange={v => onChange(v)} />
      );
    case 'boolean':
      return (
        <Pills
          def={def}
          options={[
            { value: 'true', label: def.trueLabel ?? 'Yes' },
            { value: 'false', label: def.falseLabel ?? 'No' },
          ]}
          value={value}
          onChange={onChange}
        />
      );
    case 'lookup':
      return <LookupList def={def} type={def.lookupType} value={value} onChange={onChange} />;
    case 'master':
      return <MasterList def={def} kind={def.kind} value={value} onChange={onChange} />;
    case 'user':
      return <PeopleList def={def} value={value} stored={stored} onChange={onChange} />;
    case 'date':
      return (
        <Input
          type="date"
          className="h-9"
          value={value ?? ''}
          onChange={e =>
            onChange(e.target.value || null, e.target.value ? fmtDate(e.target.value) : undefined)
          }
        />
      );
    case 'text':
    case 'client':
      return (
        <Input
          className="h-9"
          value={value ?? ''}
          placeholder={'placeholder' in def ? def.placeholder : undefined}
          onChange={e => onChange(e.target.value || null)}
        />
      );
  }
}

// ── selected summary ─────────────────────────────────────────────────────────

function SelectedBar({
  filters,
  draft,
  labels,
  onRemove,
}: {
  filters: FilterDef[];
  draft: Record<string, string>;
  labels: Record<string, string>;
  onRemove: (key: string) => void;
}) {
  const active = filters.filter(f => draft[f.key]);
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b bg-surface px-6 py-2.5 text-[13px]">
      <span className="mr-1 font-medium">Selected</span>
      {!active.length && (
        <span className="text-muted-foreground">
          Nothing yet. Everything in your scope is included.
        </span>
      )}
      {active.map(f => {
        const vals = split(draft[f.key]);
        const text =
          f.type === 'select'
            ? vals.map(v => f.options.find(o => o.value === v)?.label ?? v).join(', ')
            : f.type === 'user'
              ? vals.map(v => names(labels[f.key])[v] ?? 'Selected person').join(', ')
              : f.type === 'date'
                ? fmtDate(draft[f.key])
                : f.type === 'lookup' || f.type === 'master'
                  ? `${vals.length} picked`
                  : vals.join(', ');
        return (
          <span
            key={f.key}
            className="inline-flex h-7 max-w-80 items-center gap-1 rounded-lg border border-primary/25 bg-primary/8 pr-1 pl-2 text-xs"
          >
            <span className="text-muted-foreground">{f.label}:</span>
            <span className="truncate font-medium">{text}</span>
            <button
              type="button"
              aria-label={`Remove ${f.label}`}
              onClick={() => onRemove(f.key)}
              className="rounded p-0.5 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

// ── sheet ────────────────────────────────────────────────────────────────────

export function FilterSheet({
  filters,
  table,
  open,
  focusKey,
  onOpenChange,
}: {
  filters: FilterDef[];
  table: TableController;
  open: boolean;
  /** filter to highlight (a chip was clicked) */
  focusKey?: string | null;
  onOpenChange: (o: boolean) => void;
}) {
  const { state, actions } = table;
  // draft starts from what is applied each time the sheet opens
  const [draft, setDraft] = useState(state.filters);
  const [labels, setLabels] = useState(state.filterLabels);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(state.filters);
      setLabels(state.filterLabels);
    }
  }

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

  const groups = useMemo(() => {
    const out = new Map<string, FilterDef[]>();
    for (const f of filters)
      out.set(f.group ?? 'Filters', [...(out.get(f.group ?? 'Filters') ?? []), f]);
    return [...out.entries()];
  }, [filters]);

  const apply = () => {
    // keep keys this sheet doesn't own (status tabs) as they are
    const owned = new Set(filters.map(f => f.key));
    const rest = Object.fromEntries(Object.entries(state.filters).filter(([k]) => !owned.has(k)));
    actions.setFilters({ ...rest, ...draft }, labels);
    onOpenChange(false);
  };

  const count = filters.filter(f => draft[f.key]).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[min(1200px,94vw)]"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ListFilter className="size-4.5" /> Filters
          </SheetTitle>
          <SheetDescription>
            Pick what to include. Nothing changes on the list until you apply. Several values in one
            filter mean “any of them”.
          </SheetDescription>
        </SheetHeader>

        <SelectedBar filters={filters} draft={draft} labels={labels} onRemove={k => set(k)(null)} />

        <div className="flex-1 overflow-y-auto bg-surface/40 px-6 py-5">
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map(([group, defs]) => {
              const Icon = GROUP_ICON[group] ?? SlidersHorizontal;
              return (
                <section key={group} className="rounded-xl border bg-card shadow-card">
                  <header className="flex items-center gap-2.5 border-b px-4 py-3">
                    <span className="grid size-8 place-items-center rounded-lg bg-muted">
                      <Icon className="size-4" />
                    </span>
                    <h3 className="text-[15px] font-semibold">{group}</h3>
                    {defs.some(d => draft[d.key]) && (
                      <span className="ml-auto rounded-full bg-primary/10 px-2 text-[11px] font-medium text-primary">
                        {defs.filter(d => draft[d.key]).length} on
                      </span>
                    )}
                  </header>
                  <div className="space-y-5 p-4">
                    {defs.map(def => (
                      <div
                        key={def.key}
                        className={cn(
                          'space-y-1.5',
                          focusKey === def.key &&
                            '-m-2 rounded-lg bg-primary/5 p-2 ring-1 ring-primary/30'
                        )}
                      >
                        <p className="text-[13px] font-medium">{def.label}</p>
                        {def.hint && <p className="text-xs text-muted-foreground">{def.hint}</p>}
                        <Control
                          def={def}
                          value={draft[def.key]}
                          stored={labels[def.key]}
                          draft={draft}
                          onChange={set(def.key)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft({});
              setLabels({});
            }}
            disabled={!count}
          >
            <RotateCcw /> Reset all
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={apply}>Apply filters{count ? ` (${count})` : ''}</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

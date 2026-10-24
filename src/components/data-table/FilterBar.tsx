// File: FilterBar.tsx
// Path: src/components/data-table/FilterBar.tsx
//
// "Filter" popover listing every FilterDef + removable chips for active ones.
// Chip labels resolve from cached lookups/masters; users fall back to the
// label captured when the filter was picked (also stored in saved views).

'use client';

import { useMemo, useState } from 'react';
import { ListFilter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Combobox } from '@/components/pickers/Combobox';
import { ClientPicker, LookupPicker, MasterPicker, UserPicker } from '@/components/pickers/pickers';
import { fmtDate } from '@/lib/format';
import { useLookups, useMasters } from '@/hooks/queries';
import { tourTarget } from '@/features/tour/tour.constants';
import type { FilterDef } from './types';
import type { TableController } from './useTableState';

export function FilterControl({
  def,
  value,
  label,
  onChange,
}: {
  def: FilterDef;
  value: string | undefined;
  label?: string;
  onChange: (v: string | null, label?: string) => void;
}) {
  const common = { value: value ?? null, size: 'sm' as const, placeholder: `Any ${def.label.toLowerCase()}` };
  switch (def.type) {
    case 'select':
      return <Combobox {...common} options={def.options} onChange={(v, o) => onChange(v, o?.label)} />;
    case 'lookup':
      return <LookupPicker {...common} type={def.lookupType} onChange={(v, o) => onChange(v, o?.label)} />;
    case 'master':
      return <MasterPicker {...common} kind={def.kind} onChange={(v, o) => onChange(v, o?.label)} />;
    case 'user':
      return (
        <UserPicker
          {...common}
          purpose={def.purpose}
          selectedLabel={label}
          onChange={(v, o) => onChange(v, o?.label)}
        />
      );
    case 'client':
      return <ClientPicker {...common} selectedLabel={label} onChange={(v, o) => onChange(v, o?.label)} />;
    case 'date':
      return (
        <Input
          type="date"
          className="h-7"
          value={value ?? ''}
          onChange={e => onChange(e.target.value || null, e.target.value ? fmtDate(e.target.value) : undefined)}
        />
      );
    case 'boolean':
      return (
        <Combobox
          {...common}
          options={[
            { value: 'true', label: def.trueLabel ?? 'Yes' },
            { value: 'false', label: def.falseLabel ?? 'No' },
          ]}
          onChange={v => onChange(v)}
        />
      );
    case 'text':
      return <TextFilter value={value} placeholder={def.placeholder} onChange={onChange} />;
  }
}

function TextFilter({
  value,
  placeholder,
  onChange,
}: {
  value?: string;
  placeholder?: string;
  onChange: (v: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <Input
      className="h-7"
      value={draft}
      placeholder={placeholder ?? 'Type and press Enter'}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => onChange(draft.trim() || null)}
      onKeyDown={e => e.key === 'Enter' && onChange(draft.trim() || null)}
    />
  );
}

/** Resolves a chip's display value without extra requests when possible. */
function useChipLabel(def: FilterDef, value: string, stored?: string) {
  const lookups = useLookups(def.type === 'lookup' ? def.lookupType : undefined, {
    enabled: def.type === 'lookup',
  });
  const masters = useMasters(def.type === 'master' ? def.kind : 'business-units', {
    enabled: def.type === 'master',
  });
  return useMemo(() => {
    if (def.type === 'select') return def.options.find(o => o.value === value)?.label ?? value;
    if (def.type === 'boolean') return value === 'true' ? (def.trueLabel ?? 'Yes') : (def.falseLabel ?? 'No');
    if (def.type === 'lookup') return lookups.data?.find(l => l.id === value)?.label ?? stored ?? '…';
    if (def.type === 'master') return masters.data?.find(m => m.id === value)?.name ?? stored ?? '…';
    if (def.type === 'user') return stored ?? 'Selected person';
    if (def.type === 'client') return stored ?? 'Selected client';
    if (def.type === 'date') return fmtDate(value);
    return value;
  }, [def, value, stored, lookups.data, masters.data]);
}

function FilterChip({ def, value, stored, onRemove }: { def: FilterDef; value: string; stored?: string; onRemove: () => void }) {
  const label = useChipLabel(def, value, stored);
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-lg border border-primary/25 bg-primary/8 pr-1 pl-2 text-xs">
      <span className="text-muted-foreground">{def.label}:</span>
      <span className="max-w-40 truncate font-medium text-foreground">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${def.label} filter`}
        className="rounded p-0.5 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

export function FilterButton({ filters, table }: { filters: FilterDef[]; table: TableController }) {
  const { state, actions } = table;
  const count = Object.keys(state.filters).filter(k => filters.some(f => f.key === k)).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" {...tourTarget('table-filters')}>
          <ListFilter />
          Filter
          {count > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-semibold">Filters</span>
          {count > 0 && (
            <button type="button" onClick={actions.clearFilters} className="text-xs text-primary hover:underline">
              Clear all
            </button>
          )}
        </div>
        <div className="max-h-[60vh] space-y-2.5 overflow-y-auto p-3">
          {filters.map(def => (
            <label key={def.key} className="grid grid-cols-[96px_1fr] items-center gap-2">
              <span className="truncate text-xs text-muted-foreground">{def.label}</span>
              <FilterControl
                def={def}
                value={state.filters[def.key]}
                label={state.filterLabels[def.key]}
                onChange={(v, label) => actions.setFilter(def.key, v, label)}
              />
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FilterChips({ filters, table }: { filters: FilterDef[]; table: TableController }) {
  const { state, actions } = table;
  const active = filters.filter(f => state.filters[f.key]);
  if (!active.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map(def => (
        <FilterChip
          key={def.key}
          def={def}
          value={state.filters[def.key]}
          stored={state.filterLabels[def.key]}
          onRemove={() => actions.setFilter(def.key, null)}
        />
      ))}
      <button type="button" onClick={actions.clearFilters} className="px-1 text-xs text-muted-foreground hover:text-foreground">
        Reset
      </button>
    </div>
  );
}

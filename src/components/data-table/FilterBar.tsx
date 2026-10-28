// File: FilterBar.tsx
// Path: src/components/data-table/FilterBar.tsx
//
// The filter panel itself is FilterSheet.tsx. Applied filters show as chips above
// the table — click one to open the sheet at that filter, × removes it.
// Multi filters keep "a,b,c" as their value (URL + saved views stay strings).
// Chip labels resolve from cached lookups/masters; people fall back to the
// names captured when they were picked (also stored in saved views).

'use client';

import { useMemo, useState } from 'react';
import { ListFilter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Combobox } from '@/components/pickers/Combobox';
import { MasterMultiPicker, MultiCombobox } from '@/components/pickers/MultiCombobox';
import {
  ClientPicker,
  LookupMultiPicker,
  LookupPicker,
  MasterPicker,
  UserMultiPicker,
  UserPicker,
} from '@/components/pickers/pickers';
import { fmtDate } from '@/lib/format';
import { useLookups, useMasters } from '@/hooks/queries';
import { tourTarget } from '@/features/tour/tour.constants';
import type { FilterDef } from './types';
import type { TableController } from './useTableState';

const split = (v?: string) => (v ? v.split(',').filter(Boolean) : []);
const isMulti = (def: FilterDef) => 'multi' in def && !!def.multi;

// people filters store {id: name} as JSON so chips and saved views can name them
const parseNames = (stored?: string): Record<string, string> => {
  if (!stored) return {};
  try {
    const v = JSON.parse(stored);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

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
  const common = {
    value: value ?? null,
    size: 'sm' as const,
    placeholder: `Any ${def.label.toLowerCase()}`,
  };
  const multi = {
    value: split(value),
    placeholder: `Any ${def.label.toLowerCase()}`,
    onChange: (ids: string[]) => onChange(ids.join(',') || null),
  };
  switch (def.type) {
    case 'select':
      return def.multi ? (
        <MultiCombobox {...multi} options={def.options} />
      ) : (
        <Combobox {...common} options={def.options} onChange={(v, o) => onChange(v, o?.label)} />
      );
    case 'lookup':
      return def.multi ? (
        <LookupMultiPicker {...multi} type={def.lookupType} />
      ) : (
        <LookupPicker
          {...common}
          type={def.lookupType}
          onChange={(v, o) => onChange(v, o?.label)}
        />
      );
    case 'master':
      return def.multi ? (
        <MasterMultiPicker {...multi} kind={def.kind} />
      ) : (
        <MasterPicker {...common} kind={def.kind} onChange={(v, o) => onChange(v, o?.label)} />
      );
    case 'user':
      return def.multi ? (
        <UserMultiPicker
          value={split(value)}
          labels={parseNames(label)}
          purpose={def.purpose}
          placeholder={`Anyone`}
          onChange={(ids, names) => onChange(ids.join(',') || null, JSON.stringify(names))}
        />
      ) : (
        <UserPicker
          {...common}
          purpose={def.purpose}
          selectedLabel={label}
          onChange={(v, o) => onChange(v, o?.label)}
        />
      );
    case 'client':
      return (
        <ClientPicker
          {...common}
          selectedLabel={label}
          onChange={(v, o) => onChange(v, o?.label)}
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          className="h-8"
          value={value ?? ''}
          onChange={e =>
            onChange(e.target.value || null, e.target.value ? fmtDate(e.target.value) : undefined)
          }
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
    case 'geo':
    case 'text':
      return (
        <TextFilter
          key={value ?? ''}
          value={value}
          placeholder={def.type === 'text' ? def.placeholder : undefined}
          onChange={onChange}
        />
      );
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
      className="h-8"
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
    const one = (v: string) => {
      if (def.type === 'select') return def.options.find(o => o.value === v)?.label ?? v;
      if (def.type === 'boolean')
        return v === 'true' ? (def.trueLabel ?? 'Yes') : (def.falseLabel ?? 'No');
      if (def.type === 'lookup') return lookups.data?.find(l => l.id === v)?.label ?? '…';
      if (def.type === 'master') return masters.data?.find(m => m.id === v)?.name ?? '…';
      if (def.type === 'user') return parseNames(stored)[v] ?? 'Selected person';
      if (def.type === 'date') return fmtDate(v);
      return v;
    };
    if (!isMulti(def)) {
      if (def.type === 'lookup' || def.type === 'master')
        return one(value) === '…' ? (stored ?? '…') : one(value);
      if (def.type === 'user') return stored && !stored.startsWith('{') ? stored : one(value);
      if (def.type === 'client') return stored ?? 'Selected client';
      return one(value);
    }
    const names = split(value).map(one);
    return names.length > 2
      ? `${names.slice(0, 2).join(', ')} +${names.length - 2}`
      : names.join(', ');
  }, [def, value, stored, lookups.data, masters.data]);
}

function FilterChip({
  def,
  value,
  stored,
  onOpen,
  onRemove,
}: {
  def: FilterDef;
  value: string;
  stored?: string;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const label = useChipLabel(def, value, stored);
  return (
    <span className="inline-flex h-7 items-center rounded-lg border border-primary/25 bg-primary/8 text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onOpen}
            className="flex h-full items-center gap-1 rounded-l-lg pr-1 pl-2 hover:bg-primary/12"
          >
            <span className="text-muted-foreground">{def.label}:</span>
            <span className="max-w-48 truncate font-medium text-foreground">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          {def.hint ? `${def.hint} ` : ''}Click to change.
        </TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${def.label} filter`}
        className="mr-0.5 rounded p-0.5 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

const activeCount = (filters: FilterDef[], table: TableController) =>
  Object.keys(table.state.filters).filter(k => filters.some(f => f.key === k)).length;

export function FilterButton({
  filters,
  table,
  onOpen,
}: {
  filters: FilterDef[];
  table: TableController;
  onOpen: () => void;
}) {
  const count = activeCount(filters, table);
  return (
    <Button variant="outline" size="sm" onClick={onOpen} {...tourTarget('table-filters')}>
      <ListFilter />
      Filters
      {count > 0 && (
        <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </Button>
  );
}

export function FilterChips({
  filters,
  table,
  onOpen,
}: {
  filters: FilterDef[];
  table: TableController;
  onOpen: (key: string) => void;
}) {
  const { state, actions } = table;
  const active = filters.filter(f => state.filters[f.key]);
  if (!active.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map(def => (
        <FilterChip
          key={def.key}
          def={def}
          value={state.filters[def.key]!}
          stored={state.filterLabels[def.key]}
          onOpen={() => onOpen(def.key)}
          onRemove={() => actions.setFilter(def.key, null)}
        />
      ))}
      <button
        type="button"
        onClick={actions.clearFilters}
        className="px-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Reset
      </button>
    </div>
  );
}

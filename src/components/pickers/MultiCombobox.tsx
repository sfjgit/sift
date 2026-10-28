// File: MultiCombobox.tsx
// Path: src/components/pickers/MultiCombobox.tsx
//
// Searchable multi-select: chips in the field, checkmarks in the list. The
// list stays open while picking so several values can be toggled in a row.
// MasterMultiPicker binds it to an org master (business units, service lines…).

'use client';

import { useMemo, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/common/states';
import { useMasters } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import type { MasterKind } from '@/lib/api/endpoints';
import type { ComboOption } from './Combobox';

export interface MultiComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  /** chips shown before collapsing into "+N" */
  maxChips?: number;
  /** server-side search: options are already filtered, the list doesn't filter again */
  onSearch?: (q: string) => void;
}

export function MultiCombobox({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  loading,
  disabled,
  invalid,
  className,
  id,
  maxChips = 4,
  onSearch,
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set(value), [value]);
  const byValue = useMemo(() => new Map(options.map(o => [o.value, o])), [options]);

  const toggle = (v: string) =>
    onChange(selected.has(v) ? value.filter(x => x !== v) : [...value, v]);

  const chips = value.slice(0, maxChips);
  const overflow = value.length - chips.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          aria-invalid={invalid || undefined}
          className={cn(
            'flex min-h-8 w-full min-w-0 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent py-1 pr-1 pl-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          {chips.map(v => (
            <span
              key={v}
              className="inline-flex h-5 max-w-[12rem] items-center gap-1 rounded-md bg-muted pr-0.5 pl-1.5 text-xs font-medium"
            >
              <span className="truncate">{byValue.get(v)?.label ?? '…'}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(v)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label={`Remove ${byValue.get(v)?.label ?? 'item'}`}
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
          {overflow > 0 && (
            <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-xs text-muted-foreground">
              +{overflow}
            </span>
          )}
          <PopoverTrigger asChild disabled={disabled}>
            <button
              id={id}
              type="button"
              role="combobox"
              aria-expanded={open}
              className="flex h-6 min-w-16 flex-1 items-center justify-between gap-1 rounded-md px-1 text-left outline-none disabled:cursor-not-allowed"
            >
              <span className="truncate text-muted-foreground">
                {value.length ? (value.length > 1 ? 'Add more…' : 'Add…') : placeholder}
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command shouldFilter={!onSearch}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearch} />
          <CommandList>
            {loading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {options.map(o => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ''} ${o.value}`}
                  data-checked={selected.has(o.value)}
                  onSelect={() => toggle(o.value)}
                >
                  {o.icon}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{o.label}</span>
                    {o.hint && (
                      <span className="truncate text-xs text-muted-foreground">{o.hint}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {value.length > 0 && (
            <div className="flex items-center justify-between border-t px-2 py-1.5 text-xs text-muted-foreground">
              <span>{value.length} selected</span>
              <button type="button" className="hover:text-foreground" onClick={() => onChange([])}>
                Clear
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Multi-select over an org master; inactive rows only show if already picked. */
export function MasterMultiPicker({
  kind,
  value,
  ...props
}: Omit<MultiComboboxProps, 'options'> & { kind: MasterKind }) {
  const { data = [], isLoading } = useMasters(kind);
  const options = useMemo(
    () =>
      data
        .filter(m => m.isActive || value.includes(m.id))
        .map(m => ({ value: m.id, label: m.name, hint: m.code ?? undefined })),
    [data, value]
  );
  return (
    <MultiCombobox options={options} value={value} loading={isLoading && !data.length} {...props} />
  );
}

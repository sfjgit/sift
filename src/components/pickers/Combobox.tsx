// File: Combobox.tsx
// Path: src/components/pickers/Combobox.tsx
//
// Searchable single-select. Static options filter client-side; pass
// onSearch for server-side search (the parent fetches, we just render).

'use client';

import { useState, type ReactNode } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/common/states';
import { cn } from '@/lib/utils';

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
}

export interface ComboboxProps {
  value: string | null | undefined;
  onChange: (value: string | null, option?: ComboOption) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** label for the current value when it isn't in `options` (e.g. async results) */
  selectedLabel?: string;
  onSearch?: (q: string) => void;
  loading?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  size?: 'sm' | 'default';
  id?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  selectedLabel,
  onSearch,
  loading,
  clearable = true,
  disabled,
  invalid,
  className,
  size = 'default',
  id,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  const label = current?.label ?? (value ? selectedLabel : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn(
            'group/combo flex w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50',
            size === 'sm' ? 'h-7' : 'h-8',
            className
          )}
        >
          <span className={cn('flex min-w-0 items-center gap-1.5 truncate', !label && 'text-muted-foreground')}>
            {current?.icon}
            <span className="truncate">{label ?? placeholder}</span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            {clearable && value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear"
                onClick={e => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
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
                  data-checked={o.value === value}
                  onSelect={() => {
                    onChange(o.value, o);
                    setOpen(false);
                  }}
                >
                  {o.icon}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{o.label}</span>
                    {o.hint && <span className="truncate text-xs text-muted-foreground">{o.hint}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

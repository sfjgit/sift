// File: RequirementMultiSelect.tsx
// Path: src/components/applicants/RequirementMultiSelect.tsx

'use client';

import { useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ApplicantRequirementOption } from '@/types/applicant';

interface Props {
  options: ApplicantRequirementOption[];
  value: string[]; // selected requirement ids — empty = all
  onChange: (ids: string[]) => void;
}

export function RequirementMultiSelect({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);

  const toggle = (id: string) =>
    onChange(selected.has(id) ? value.filter(v => v !== id) : [...value, id]);

  const label =
    value.length === 0
      ? 'All requirements'
      : value.length === 1
        ? (options.find(o => o.id === value[0])?.reqCode ?? '1 requirement')
        : `${value.length} requirements`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-72 justify-between text-[13px] font-normal"
        >
          <span className={value.length ? 'truncate' : 'truncate text-muted-foreground'}>
            {label}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search req code or title…" className="text-[13px]" />
          <CommandList className="max-h-72">
            <CommandEmpty className="py-8 text-center text-[13px] text-muted-foreground">
              No requirements found.
            </CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem
                  key={o.id}
                  value={`${o.reqCode} ${o.title}`}
                  onSelect={() => toggle(o.id)}
                  className="cursor-pointer gap-2.5 py-2"
                >
                  <Checkbox
                    checked={selected.has(o.id)}
                    className="pointer-events-none border-muted-foreground/60 bg-background"
                    tabIndex={-1}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{o.reqCode}</p>
                    <p className="truncate text-[12px] text-muted-foreground">{o.title}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{o.count}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        <div className="flex items-center justify-between border-t px-3 py-2 text-[12px] text-muted-foreground">
          <span>{value.length ? `${value.length} selected` : 'None selected — showing all'}</span>
          <div className="flex items-center gap-1">
            {value.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[12px]"
                onClick={() => onChange([])}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            )}
            <Button size="sm" className="h-7 text-[12px]" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

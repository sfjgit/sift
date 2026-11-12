// File: BusinessViewSelect.tsx
// Path: src/features/clients/BusinessViewSelect.tsx
//
// Which line of business the clients pages are arranged for. Only CSR exists
// today; B2G / B2I / B2B are listed so the switch is already where it will live
// — each will bring its own default columns and client-page order.

'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const VIEWS = [
  { code: 'CSR', label: 'CSR', hint: 'Corporate social responsibility', ready: true },
  { code: 'B2G', label: 'B2G', hint: 'Business to government', ready: false },
  { code: 'B2I', label: 'B2I', hint: 'Business to institutions', ready: false },
  { code: 'B2B', label: 'B2B', hint: 'Business to business', ready: false },
] as const;

export function BusinessViewSelect() {
  const current = VIEWS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative inline-flex items-center gap-1 px-1 pb-1 text-[15px] font-bold tracking-wide text-primary"
          title="The columns and client page are arranged for this line of business"
        >
          {current.label}
          <ChevronDown className="size-4 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[linear-gradient(90deg,#2563eb,#38bdf8)]"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Line of business view</DropdownMenuLabel>
        {VIEWS.map(v => (
          <DropdownMenuItem key={v.code} disabled={!v.ready} className="flex items-start gap-2">
            <span className="mt-0.5 w-4">{v.code === current.code && <Check className="size-4" />}</span>
            <span className="flex-1">
              <span className="block font-semibold">{v.label}</span>
              <span className="block text-xs text-muted-foreground">
                {v.ready ? v.hint : `${v.hint} · coming soon`}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// File: BusinessViewSelect.tsx
// Path: src/features/clients/BusinessViewSelect.tsx
//
// Which line of business the clients list is arranged for (23 Nov 2026 — real, no longer "coming soon"):
//   All clients · CSR (clients with CSR SPOCs) · B2B · B2G · B2I (by business unit)
// Picking one sets the list filter (business unit / CSR service line) and that business's columns.
// The filter is a normal list filter — it shows as a chip, stays in the link and saves with views.

'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TableController } from '@/components/data-table';
import { CLIENT_DEFAULT_COLUMNS } from '@/features/clients/columns';
import { useMasters } from '@/hooks/queries';

/** each business's own columns */
const COLUMNS: Record<string, readonly string[]> = {
  ALL: [
    ...CLIENT_DEFAULT_COLUMNS.slice(0, 8),
    'businessUnit',
    'serviceLines',
    'spocs',
    'assignees',
    'state',
  ],
  CSR: CLIENT_DEFAULT_COLUMNS,
  B2B: [
    'name',
    'keyAccount',
    'groupName',
    'category',
    'industry',
    'cin',
    'ownership',
    'serviceLines',
    'employeeSize',
    'city',
    'state',
    'website',
    'linkedin',
    'spocs',
    'assignees',
    'revenue',
    'paidUpCapital',
  ],
  B2G: [
    'name',
    'keyAccount',
    'govt_level',
    'govt_type',
    'govt_ministry',
    'govt_department',
    'govt_skillBody',
    'govt_sector',
    'govt_tenderPortal',
    'govt_priority',
    'officeEmail',
    'officePhone',
    'state',
    'city',
    'serviceLines',
    'spocs',
    'assignees',
    'website',
  ],
  B2I: [
    'name',
    'keyAccount',
    'category',
    'industry',
    'city',
    'state',
    'website',
    'linkedin',
    'serviceLines',
    'spocs',
    'assignees',
  ],
};

const HINT: Record<string, string> = {
  ALL: 'Every line of business',
  CSR: 'Clients with CSR SPOCs · CSR figures & reports',
  B2B: 'Business to business · companies',
  B2G: 'Business to government · ministries, PSUs, missions',
  B2I: 'Business to institutions · universities, colleges',
};

export function BusinessViewSelect({
  table,
  columnIds,
}: {
  table: TableController;
  columnIds: string[];
}) {
  const bus = useMasters('business-units').data ?? [];
  const sls = useMasters('service-lines').data ?? [];
  const csr = sls.find(s => s.code === 'CSR');
  const views = [
    { code: 'ALL', label: 'All clients', filters: {} as Record<string, string> },
    ...(csr ? [{ code: 'CSR', label: 'CSR', filters: { serviceLineId: csr.id } }] : []),
    ...['B2B', 'B2G', 'B2I'].flatMap(code => {
      const bu = bus.find(b => b.code === code);
      return bu
        ? [{ code, label: code, filters: { businessUnitId: bu.id } as Record<string, string> }]
        : [];
    }),
  ];
  const f = table.state.filters;
  const current =
    views.find(
      v =>
        v.code !== 'ALL' &&
        Object.entries(v.filters).every(([k, val]) => f[k] === val) &&
        !(v.code === 'CSR' ? f.businessUnitId : f.serviceLineId)
    ) ?? views[0]!;

  const pick = (v: (typeof views)[number]) => {
    const filters = { ...f };
    delete filters.businessUnitId;
    delete filters.serviceLineId;
    table.actions.setFilters({ ...filters, ...v.filters }, table.state.filterLabels);
    const cols = COLUMNS[v.code] ?? COLUMNS.ALL!;
    table.actions.setColumnVisibility(
      Object.fromEntries(columnIds.map(id => [id, cols.includes(id)]))
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative inline-flex items-center gap-1 px-1 pb-1 text-[15px] font-bold tracking-wide text-primary"
          title="Arrange the list for a line of business — its clients and its columns"
        >
          {current.label}
          <ChevronDown className="size-4 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[linear-gradient(90deg,#2563eb,#38bdf8)]"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Line of business view</DropdownMenuLabel>
        {views.map(v => (
          <DropdownMenuItem
            key={v.code}
            onSelect={() => pick(v)}
            className="flex items-start gap-2"
          >
            <span className="mt-0.5 w-4">
              {v.code === current.code && <Check className="size-4" />}
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{v.label}</span>
              <span className="block text-xs text-muted-foreground">{HINT[v.code]}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

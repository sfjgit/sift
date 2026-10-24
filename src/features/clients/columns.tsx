// File: columns.tsx
// Path: src/features/clients/columns.tsx

'use client';

import Link from 'next/link';
import { Globe } from 'lucide-react';
import { CompanyMark } from '@/components/common/CompanyMark';
import { ClientStatusBadge, CLIENT_STATUS } from '@/components/common/badges';
import { PersonCell } from '@/components/common/UserAvatar';
import type { DataColumn, FilterDef } from '@/components/data-table';
import { fmtDate, fmtRelative, fullName, hostOf, placeOf } from '@/lib/format';
import type { ClientListItem } from '@/types/crm';

export const clientFilters: FilterDef[] = [
  { key: 'industryId', label: 'Industry', type: 'lookup', lookupType: 'INDUSTRY' },
  { key: 'categoryId', label: 'Category', type: 'lookup', lookupType: 'CLIENT_CATEGORY' },
  { key: 'businessUnitId', label: 'Business unit', type: 'master', kind: 'business-units' },
  { key: 'serviceLineId', label: 'Service line', type: 'master', kind: 'service-lines' },
  { key: 'handlerId', label: 'SPOC handler', type: 'user' },
  { key: 'state', label: 'State', type: 'text', placeholder: 'e.g. Karnataka' },
  { key: 'city', label: 'City', type: 'text', placeholder: 'e.g. Bengaluru' },
];

/** status lives in the tabs above the table, but is still a URL / view filter */
export const clientFilterKeys = ['status', ...clientFilters.map(f => f.key)];

export const clientColumns = (actions?: (c: ClientListItem) => React.ReactNode): DataColumn<ClientListItem>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Client',
    meta: { label: 'Client', sortKey: 'name', locked: true },
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex min-w-[220px] items-center gap-2.5">
          <CompanyMark name={c.name} />
          <div className="min-w-0">
            <Link href={`/clients/${c.id}`} className="block truncate font-medium hover:text-primary">
              {c.name}
            </Link>
            <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {c.shortName && <span>{c.shortName}</span>}
              {c.shortName && c.website && <span>·</span>}
              {c.website && (
                <a
                  href={c.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Globe className="size-3" />
                  {hostOf(c.website)}
                </a>
              )}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status', sortKey: 'status', exportValue: c => CLIENT_STATUS[c.status].label },
    cell: ({ row }) => <ClientStatusBadge status={row.original.status} />,
  },
  {
    id: 'industry',
    accessorFn: c => c.industry?.label ?? '',
    header: 'Industry',
    meta: { label: 'Industry' },
    cell: ({ row }) => row.original.industry?.label ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: 'category',
    accessorFn: c => c.category?.label ?? '',
    header: 'Category',
    meta: { label: 'Category' },
    cell: ({ row }) => row.original.category?.label ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: 'location',
    accessorFn: c => placeOf(c.locations[0]),
    header: 'Location',
    meta: { label: 'Location' },
    cell: ({ row }) => <span className="whitespace-nowrap">{placeOf(row.original.locations[0])}</span>,
  },
  {
    id: 'spocs',
    accessorFn: c => c._count.spocs,
    header: 'SPOCs',
    meta: { label: 'SPOCs', align: 'right' },
    cell: ({ row }) => (
      <span className={row.original._count.spocs ? 'font-medium' : 'text-muted-foreground'}>{row.original._count.spocs}</span>
    ),
  },
  {
    id: 'createdBy',
    accessorFn: c => fullName(c.createdBy),
    header: 'Added by',
    meta: { label: 'Added by' },
    cell: ({ row }) => <PersonCell person={row.original.createdBy} />,
  },
  {
    id: 'createdAt',
    accessorFn: c => fmtDate(c.createdAt),
    header: 'Added',
    meta: { label: 'Added', sortKey: 'createdAt' },
    cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{fmtDate(row.original.createdAt)}</span>,
  },
  {
    id: 'updatedAt',
    accessorFn: c => fmtDate(c.updatedAt),
    header: 'Last updated',
    meta: { label: 'Last updated', sortKey: 'updatedAt', defaultHidden: true },
    cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{fmtRelative(row.original.updatedAt)}</span>,
  },
  {
    id: 'cin',
    accessorKey: 'cin',
    header: 'CIN',
    meta: { label: 'CIN', defaultHidden: true },
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.cin ?? '—'}</span>,
  },
  {
    id: 'website',
    accessorKey: 'website',
    header: 'Website',
    meta: { label: 'Website', defaultHidden: true },
    cell: ({ row }) => hostOf(row.original.website) ?? '—',
  },
  ...(actions
    ? [
        {
          id: '__actions',
          header: '',
          enableHiding: false,
          meta: { locked: true, label: 'Actions', width: 44 },
          cell: ({ row }) => <div data-no-row-click>{actions(row.original)}</div>,
        } satisfies DataColumn<ClientListItem>,
      ]
    : []),
];

// File: columns.tsx
// Path: src/features/spocs/columns.tsx

'use client';

import Link from 'next/link';
import { Linkedin, Lock, Mail, Phone, Star } from 'lucide-react';
import {
  APPROVAL,
  ApprovalBadge,
  BAND,
  BandBadge,
  EMAIL_STATUS,
  EmailStatusBadge,
  LookupBadge,
} from '@/components/common/badges';
import { PersonCell, UserAvatar } from '@/components/common/UserAvatar';
import type { DataColumn, FilterDef } from '@/components/data-table';
import { fmtDate, fmtRelative, fullName, placeOf } from '@/lib/format';
import type { Spoc } from '@/types/crm';

export const spocFilters: FilterDef[] = [
  { key: 'clientId', label: 'Client', type: 'client' },
  { key: 'handlerId', label: 'Handler', type: 'user', multi: true },
  {
    key: 'businessUnitId',
    label: 'Business unit',
    type: 'master',
    multi: true,
    kind: 'business-units',
  },
  {
    key: 'serviceLineId',
    label: 'Service line',
    type: 'master',
    multi: true,
    kind: 'service-lines',
  },
  {
    key: 'salesStatusId',
    label: 'Sales status',
    type: 'lookup',
    multi: true,
    lookupType: 'SALES_STATUS',
  },
  {
    key: 'emailStatus',
    label: 'Email status',
    type: 'select',
    multi: true,
    options: Object.entries(EMAIL_STATUS).map(([value, v]) => ({ value, label: v.label })),
  },
  {
    key: 'validationBand',
    label: 'Quality band',
    type: 'select',
    multi: true,
    options: (['READY', 'REVIEW', 'NOT_USABLE'] as const).map(value => ({
      value,
      label: BAND[value].label,
    })),
  },
  {
    key: 'approvalStatus',
    label: 'Approval',
    type: 'select',
    multi: true,
    options: (['PENDING', 'APPROVED', 'REJECTED'] as const).map(value => ({
      value,
      label: APPROVAL[value].label,
    })),
  },
  {
    key: 'isActive',
    label: 'Status',
    type: 'boolean',
    trueLabel: 'Active',
    falseLabel: 'Inactive',
  },
];

export const spocFilterKeys = spocFilters.map(f => f.key);

/** Masked contact (no spocs.view_contact) shows a lock instead of an empty cell. */
function Contact({
  value,
  icon: Icon,
  href,
}: {
  value: string | null;
  icon: typeof Mail;
  href?: string;
}) {
  if (!value)
    return (
      <span
        className="inline-flex items-center gap-1 text-muted-foreground"
        title="Hidden or not set"
      >
        <Lock className="size-3 opacity-50" />
      </span>
    );
  return (
    <a
      href={href}
      className="inline-flex max-w-56 items-center gap-1.5 truncate hover:text-primary"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{value}</span>
    </a>
  );
}

export const spocColumns = ({
  showClient = true,
  actions,
}: {
  showClient?: boolean;
  actions?: (s: Spoc) => React.ReactNode;
} = {}): DataColumn<Spoc>[] => [
  {
    id: 'name',
    accessorFn: s => fullName(s),
    header: 'SPOC',
    meta: { label: 'SPOC', sortKey: 'firstName', locked: true },
    cell: ({ row }) => {
      const s = row.original;
      return (
        <div className="flex min-w-[200px] items-center gap-2.5">
          <UserAvatar person={s} size="md" />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5">
              <Link href={`/spocs/${s.id}`} className="truncate font-medium hover:text-primary">
                {fullName(s)}
              </Link>
              {s.isPrimary && (
                <Star
                  className="size-3 shrink-0 fill-warning text-warning"
                  aria-label="Primary SPOC"
                />
              )}
              {s.linkedinUrl && (
                <a
                  href={s.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="text-muted-foreground hover:text-[#0a66c2]"
                >
                  <Linkedin className="size-3" />
                </a>
              )}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {s.designation ?? '—'}
            </span>
          </div>
        </div>
      );
    },
  },
  ...(showClient
    ? [
        {
          id: 'client',
          accessorFn: (s: Spoc) => s.client.name,
          header: 'Client',
          meta: { label: 'Client' },
          cell: ({ row }) => (
            <Link
              href={`/clients/${row.original.client.id}`}
              className="block max-w-48 truncate hover:text-primary"
            >
              {row.original.client.name}
            </Link>
          ),
        } satisfies DataColumn<Spoc>,
      ]
    : []),
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    meta: { label: 'Email' },
    cell: ({ row }) => (
      <Contact
        value={row.original.email}
        icon={Mail}
        href={row.original.email ? `mailto:${row.original.email}` : undefined}
      />
    ),
  },
  {
    id: 'phone',
    accessorKey: 'phone',
    header: 'Phone',
    meta: { label: 'Phone', defaultHidden: true },
    cell: ({ row }) => (
      <Contact
        value={row.original.phone}
        icon={Phone}
        href={row.original.phone ? `tel:${row.original.phone}` : undefined}
      />
    ),
  },
  {
    id: 'emailStatus',
    accessorKey: 'emailStatus',
    header: 'Email status',
    meta: { label: 'Email status', exportValue: s => EMAIL_STATUS[s.emailStatus].label },
    cell: ({ row }) => <EmailStatusBadge status={row.original.emailStatus} />,
  },
  {
    id: 'band',
    accessorFn: s => s.validationScore ?? '',
    header: 'Quality',
    meta: {
      label: 'Quality',
      sortKey: 'validationScore',
      exportValue: s =>
        `${BAND[s.validationBand ?? 'UNSCORED'].label}${s.validationScore !== null ? ` (${s.validationScore})` : ''}`,
    },
    cell: ({ row }) => (
      <BandBadge band={row.original.validationBand} score={row.original.validationScore} />
    ),
  },
  {
    id: 'approval',
    accessorFn: s => APPROVAL[s.approvalStatus]?.label ?? '',
    header: 'Approval',
    meta: { label: 'Approval' },
    cell: ({ row }) => (
      <span
        className="inline-flex items-center gap-1.5"
        title={row.original.reviewReason ?? undefined}
      >
        <ApprovalBadge status={row.original.approvalStatus} />
        {row.original.reviewFlag && (
          <span className="size-1.5 rounded-full bg-warning" aria-label="Flagged for review" />
        )}
      </span>
    ),
  },
  {
    id: 'salesStatus',
    accessorFn: s => s.salesStatus?.label ?? '',
    header: 'Sales status',
    meta: { label: 'Sales status' },
    cell: ({ row }) => <LookupBadge lookup={row.original.salesStatus} />,
  },
  {
    id: 'handler',
    accessorFn: s => fullName(s.handler),
    header: 'Handler',
    meta: { label: 'Handler' },
    cell: ({ row }) => <PersonCell person={row.original.handler} />,
  },
  {
    id: 'bu',
    accessorFn: s => `${s.businessUnit.name} / ${s.serviceLine.name}`,
    header: 'BU · Service line',
    meta: { label: 'BU · Service line' },
    cell: ({ row }) => (
      <span className="block max-w-52 truncate">
        {row.original.businessUnit.name}
        <span className="text-muted-foreground"> · {row.original.serviceLine.name}</span>
      </span>
    ),
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    meta: { label: 'Department', defaultHidden: true },
  },
  {
    id: 'seniority',
    accessorKey: 'seniority',
    header: 'Seniority',
    meta: { label: 'Seniority', defaultHidden: true },
  },
  {
    id: 'location',
    accessorFn: s => placeOf(s.location),
    header: 'Location',
    meta: { label: 'Location', defaultHidden: true },
    cell: ({ row }) => placeOf(row.original.location),
  },
  {
    id: 'source',
    accessorFn: s => s.source?.label ?? '',
    header: 'Source',
    meta: { label: 'Source', defaultHidden: true },
  },
  {
    id: 'createdAt',
    accessorFn: s => fmtDate(s.createdAt),
    header: 'Added',
    meta: { label: 'Added', sortKey: 'createdAt' },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {fmtDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'updatedAt',
    accessorFn: s => fmtDate(s.updatedAt),
    header: 'Updated',
    meta: { label: 'Updated', sortKey: 'updatedAt', defaultHidden: true },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {fmtRelative(row.original.updatedAt)}
      </span>
    ),
  },
  ...(actions
    ? [
        {
          id: '__actions',
          header: '',
          enableHiding: false,
          meta: { locked: true, label: 'Actions', width: 44 },
          cell: ({ row }) => <div data-no-row-click>{actions(row.original)}</div>,
        } satisfies DataColumn<Spoc>,
      ]
    : []),
];

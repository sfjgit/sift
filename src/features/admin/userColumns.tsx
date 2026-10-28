// File: userColumns.tsx
// Path: src/features/admin/userColumns.tsx

'use client';

import Link from 'next/link';
import { ActiveBadge, Pill } from '@/components/common/badges';
import { PersonCell, UserAvatar } from '@/components/common/UserAvatar';
import type { DataColumn, FilterDef } from '@/components/data-table';
import { fmtDate, fullName } from '@/lib/format';
import type { Role, UserListItem } from '@/types/org';

export const userFilters = (roles: Role[] = []): FilterDef[] => [
  {
    key: 'roleId',
    label: 'Role',
    type: 'select',
    multi: true,
    options: roles.map(r => ({ value: r.id, label: r.name })),
  },
  { key: 'departmentId', label: 'Department', type: 'master', multi: true, kind: 'departments' },
  { key: 'designationId', label: 'Designation', type: 'master', multi: true, kind: 'designations' },
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
  { key: 'reportingToId', label: 'Reports to', type: 'user', multi: true },
  {
    key: 'isActive',
    label: 'Status',
    type: 'boolean',
    trueLabel: 'Active',
    falseLabel: 'Inactive',
  },
];

export const userFilterKeys = userFilters().map(f => f.key);

const dash = <span className="text-muted-foreground">—</span>;

export const userColumns = (
  actions?: (u: UserListItem) => React.ReactNode
): DataColumn<UserListItem>[] => [
  {
    id: 'name',
    accessorFn: u => fullName(u),
    header: 'Person',
    meta: { label: 'Person', sortKey: 'firstName', locked: true },
    cell: ({ row }) => {
      const u = row.original;
      return (
        <div className="flex min-w-[220px] items-center gap-2.5">
          <UserAvatar person={u} size="md" />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5">
              <Link
                href={`/admin/users/${u.id}`}
                className="truncate font-medium hover:text-primary"
              >
                {fullName(u)}
              </Link>
              {u.isSuperAdmin && (
                <Pill tone="violet" dot={false}>
                  Super admin
                </Pill>
              )}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'employeeId',
    accessorKey: 'employeeId',
    header: 'Employee ID',
    meta: { label: 'Employee ID' },
    cell: ({ row }) =>
      row.original.employeeId ? (
        <span className="font-mono text-xs">{row.original.employeeId}</span>
      ) : (
        dash
      ),
  },
  {
    id: 'role',
    accessorFn: u => u.role?.name ?? '',
    header: 'Role',
    meta: { label: 'Role' },
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.role?.name ?? '—'}</span>,
  },
  {
    id: 'department',
    accessorFn: u => u.department?.name ?? '',
    header: 'Department',
    meta: { label: 'Department' },
    cell: ({ row }) => row.original.department?.name ?? dash,
  },
  {
    id: 'designation',
    accessorFn: u => u.designation?.name ?? '',
    header: 'Designation',
    meta: { label: 'Designation' },
    cell: ({ row }) => row.original.designation?.name ?? dash,
  },
  {
    id: 'reportingTo',
    accessorFn: u => (u.reportingTo ? fullName(u.reportingTo) : ''),
    header: 'Reports to',
    meta: { label: 'Reports to' },
    cell: ({ row }) => <PersonCell person={row.original.reportingTo} size="xs" />,
  },
  {
    id: 'spocs',
    accessorFn: u => u._count?.spocsHandled ?? 0,
    header: 'SPOCs',
    meta: { label: 'SPOCs handled', align: 'right' },
    cell: ({ row }) => {
      const n = row.original._count?.spocsHandled ?? 0;
      return <span className={n ? 'font-medium' : 'text-muted-foreground'}>{n}</span>;
    },
  },
  {
    id: 'status',
    accessorFn: u => (u.isActive ? 'Active' : 'Inactive'),
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
  },
  {
    id: 'dateOfJoin',
    accessorFn: u => fmtDate(u.dateOfJoin),
    header: 'Joined',
    meta: { label: 'Joined', sortKey: 'dateOfJoin', defaultHidden: true },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {fmtDate(row.original.dateOfJoin)}
      </span>
    ),
  },
  {
    id: 'createdAt',
    accessorFn: u => fmtDate(u.createdAt),
    header: 'Added',
    meta: { label: 'Added', sortKey: 'createdAt' },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {fmtDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'lastName',
    accessorKey: 'lastName',
    header: 'Last name',
    meta: { label: 'Last name', sortKey: 'lastName', defaultHidden: true },
    cell: ({ row }) => row.original.lastName,
  },
  {
    id: 'phone',
    accessorKey: 'phone',
    header: 'Phone',
    meta: { label: 'Phone', defaultHidden: true },
    cell: ({ row }) => row.original.phone ?? dash,
  },
  {
    id: 'workingLocation',
    accessorKey: 'workingLocation',
    header: 'Location',
    meta: { label: 'Location', defaultHidden: true },
    cell: ({ row }) => row.original.workingLocation ?? dash,
  },
  ...(actions
    ? [
        {
          id: '__actions',
          header: '',
          enableHiding: false,
          meta: { locked: true, label: 'Actions', width: 44 },
          cell: ({ row }) => <div data-no-row-click>{actions(row.original)}</div>,
        } satisfies DataColumn<UserListItem>,
      ]
    : []),
];

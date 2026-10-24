// File: authLogColumns.tsx
// Path: src/features/admin/authLogColumns.tsx
//
// Login history columns + filters, and a tiny user-agent parser so the device
// column reads "Chrome on macOS" instead of a 200-character UA string.

'use client';

import Link from 'next/link';
import { Laptop, Smartphone, Tablet } from 'lucide-react';
import { Pill, type Tone } from '@/components/common/badges';
import { PersonCell } from '@/components/common/UserAvatar';
import type { DataColumn, FilterDef } from '@/components/data-table';
import { fmtDateTime, fmtRelative, fullName } from '@/lib/format';
import type { AuthLog, AuthLogType } from '@/types/org';

export const AUTH_EVENTS: Record<AuthLogType, { label: string; tone: Tone }> = {
  LOGIN: { label: 'Signed in', tone: 'success' },
  LOGOUT: { label: 'Signed out', tone: 'neutral' },
  REFRESH: { label: 'Session refreshed', tone: 'neutral' },
  FAILED_LOGIN: { label: 'Failed sign-in', tone: 'danger' },
  PASSWORD_RESET: { label: 'Password reset', tone: 'warning' },
  PASSWORD_CHANGE: { label: 'Password changed', tone: 'info' },
  ACCOUNT_CREATED: { label: 'Account created', tone: 'primary' },
  ACCOUNT_DEACTIVATED: { label: 'Deactivated', tone: 'danger' },
  ACCOUNT_REACTIVATED: { label: 'Reactivated', tone: 'success' },
};

export const authLogFilters: FilterDef[] = [
  { key: 'userId', label: 'Person', type: 'user' },
  { key: 'departmentId', label: 'Department', type: 'master', kind: 'departments' },
  {
    key: 'type',
    label: 'Event',
    type: 'select',
    options: (Object.keys(AUTH_EVENTS) as AuthLogType[]).map(k => ({ value: k, label: AUTH_EVENTS[k].label })),
  },
  { key: 'startDate', label: 'From', type: 'date' },
  { key: 'endDate', label: 'To', type: 'date' },
];

export const authLogFilterKeys = authLogFilters.map(f => f.key);

// ── user agent → "Chrome on macOS" ──────────────────────────────────────────

export interface Device {
  browser: string | null;
  os: string | null;
  kind: 'desktop' | 'mobile' | 'tablet';
  label: string;
}

export function parseUserAgent(ua?: string | null): Device {
  if (!ua) return { browser: null, os: null, kind: 'desktop', label: 'Unknown device' };
  const browser =
    /Edg(e|A|iOS)?\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser\//.test(ua) ? 'Samsung Internet'
    : /Firefox\/|FxiOS\//.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari'
    : /PostmanRuntime/.test(ua) ? 'Postman'
    : /curl\//.test(ua) ? 'curl'
    : /node|axios|undici/i.test(ua) ? 'API client'
    : null;
  const os =
    /iPad/.test(ua) ? 'iPadOS'
    : /iPhone|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : null;
  const kind = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))
    ? 'tablet'
    : /Mobi|iPhone|Android/.test(ua)
      ? 'mobile'
      : 'desktop';
  const label = browser && os ? `${browser} on ${os}` : (browser ?? os ?? 'Unknown device');
  return { browser, os, kind, label };
}

const DEVICE_ICONS = { desktop: Laptop, mobile: Smartphone, tablet: Tablet } as const;

export const authLogColumns: DataColumn<AuthLog>[] = [
  {
    id: 'createdAt',
    accessorFn: l => fmtDateTime(l.createdAt),
    header: 'When',
    meta: { label: 'When', locked: true },
    cell: ({ row }) => (
      <span className="block min-w-[150px]">
        <span className="block whitespace-nowrap">{fmtDateTime(row.original.createdAt)}</span>
        <span className="block text-xs text-muted-foreground">{fmtRelative(row.original.createdAt)}</span>
      </span>
    ),
  },
  {
    id: 'user',
    accessorFn: l => `${fullName(l.user)} <${l.user?.email ?? ''}>`,
    header: 'Person',
    meta: { label: 'Person' },
    cell: ({ row }) =>
      row.original.user ? (
        <Link href={`/admin/users/${row.original.user.id}`} className="inline-flex hover:text-primary">
          <PersonCell person={row.original.user} sub={row.original.user.email} />
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'type',
    accessorFn: l => AUTH_EVENTS[l.type]?.label ?? l.type,
    header: 'Event',
    meta: { label: 'Event' },
    cell: ({ row }) => {
      const e = AUTH_EVENTS[row.original.type];
      return <Pill tone={e?.tone ?? 'neutral'}>{e?.label ?? row.original.type}</Pill>;
    },
  },
  {
    id: 'ip',
    accessorKey: 'ip',
    header: 'IP address',
    meta: { label: 'IP address' },
    cell: ({ row }) =>
      row.original.ip ? (
        <span className="font-mono text-xs">{row.original.ip.replace(/^::ffff:/, '')}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'device',
    accessorFn: l => parseUserAgent(l.userAgent).label,
    header: 'Device',
    meta: { label: 'Device' },
    cell: ({ row }) => {
      const d = parseUserAgent(row.original.userAgent);
      const Icon = DEVICE_ICONS[d.kind];
      return (
        <span className="flex items-center gap-1.5 whitespace-nowrap" title={row.original.userAgent ?? undefined}>
          <Icon className="size-3.5 text-muted-foreground" />
          {d.label}
        </span>
      );
    },
  },
  {
    id: 'userAgent',
    accessorKey: 'userAgent',
    header: 'User agent',
    meta: { label: 'User agent', defaultHidden: true },
    cell: ({ row }) => (
      <span className="block max-w-[320px] truncate font-mono text-[11px] text-muted-foreground" title={row.original.userAgent ?? undefined}>
        {row.original.userAgent ?? '—'}
      </span>
    ),
  },
];

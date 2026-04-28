import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  PENDING_APPROVAL: { label: 'Pending', cls: 'bg-amber-950 text-amber-400 border-amber-800' },
  ACTIVE: { label: 'Active', cls: 'bg-emerald-950 text-emerald-400 border-emerald-800' },
  ON_HOLD: { label: 'On Hold', cls: 'bg-violet-950 text-violet-400 border-violet-800' },
  CLOSED: { label: 'Closed', cls: 'bg-zinc-900 text-zinc-500 border-zinc-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-950 text-red-400 border-red-900' },
} as const;

export const PRIORITY_CONFIG = {
  HIGH: { label: 'High', dot: 'bg-red-500', text: 'text-red-400', hex: '#ef4444' },
  MEDIUM: { label: 'Medium', dot: 'bg-amber-500', text: 'text-amber-400', hex: '#f59e0b' },
  LOW: { label: 'Low', dot: 'bg-emerald-500', text: 'text-emerald-400', hex: '#10b981' },
} as const;

export const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

export const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

export const fmtRel = (d?: string | null) => {
  if (!d) return null;
  const diff = Math.round((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, urgent: true };
  if (diff === 0) return { label: 'Due today', urgent: true };
  if (diff <= 3) return { label: `${diff}d left`, urgent: true };
  return { label: `${diff}d left`, urgent: false };
};

export const fmtSalary = (min?: number | null, max?: number | null, type?: string | null) => {
  if (!min && !max) return null;
  const sfx: Record<string, string> = {
    ANNUAL: '/yr',
    MONTHLY: '/mo',
    HOURLY: '/hr',
    DAILY: '/day',
  };
  const s = type ? (sfx[type] ?? '') : '';
  const f = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
        ? `₹${(n / 1000).toFixed(0)}K`
        : `₹${n}`;
  if (min && max) return `${f(min)} – ${f(max)}${s}`;
  return min ? `${f(min)}+${s}` : `≤${f(max!)}${s}`;
};

export const fullName = (u?: { firstName: string; lastName: string } | null) =>
  u ? `${u.firstName} ${u.lastName}` : '—';

export const initials = (u?: { firstName: string; lastName: string } | null) =>
  u ? `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase() : '?';

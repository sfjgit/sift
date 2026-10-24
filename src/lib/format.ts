// File: format.ts
// Path: src/lib/format.ts
//
// Display formatters. Everything returns a string and tolerates null.

import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

type Named = { firstName?: string | null; lastName?: string | null; displayName?: string | null };

export const EMPTY = '—';

export const fullName = (p?: Named | null) =>
  p ? p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || EMPTY : EMPTY;

export const initials = (p?: Named | null) => {
  if (!p) return '?';
  const parts = [p.firstName, p.lastName].filter(Boolean) as string[];
  return (parts.map(s => s[0]).join('') || '?').slice(0, 2).toUpperCase();
};

const toDate = (d?: string | Date | null) => {
  if (!d) return null;
  const date = typeof d === 'string' ? parseISO(d) : d;
  return isValid(date) ? date : null;
};

export const fmtDate = (d?: string | Date | null) => {
  const date = toDate(d);
  return date ? format(date, 'd MMM yyyy') : EMPTY;
};

export const fmtDateTime = (d?: string | Date | null) => {
  const date = toDate(d);
  return date ? format(date, 'd MMM yyyy, h:mm a') : EMPTY;
};

export const fmtRelative = (d?: string | Date | null) => {
  const date = toDate(d);
  if (!date) return EMPTY;
  const diff = Date.now() - date.getTime();
  if (diff < 45_000) return 'just now';
  return `${formatDistanceToNowStrict(date)} ago`;
};

const nf = new Intl.NumberFormat('en-IN');
export const fmtNumber = (n?: number | string | null) =>
  n === null || n === undefined || n === '' ? EMPTY : nf.format(Number(n));

export const fmtPercent = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : '0%';

/** ₹ amounts in Indian units — 1.2 Cr, 45.3 L, 12,500 */
export const fmtInr = (v?: number | string | null) => {
  if (v === null || v === undefined || v === '') return EMPTY;
  const n = Number(v);
  if (!Number.isFinite(n)) return EMPTY;
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${nf.format(Math.round(n))}`;
};

/** "NOT_USABLE" → "Not usable" */
export const titleCase = (v?: string | null) =>
  v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase().replace(/_/g, ' ') : EMPTY;

export const hostOf = (url?: string | null) => {
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const placeOf = (l?: { city?: string | null; state?: string | null; country?: string | null } | null) =>
  l ? [l.city, l.state].filter(Boolean).join(', ') || l.country || EMPTY : EMPTY;

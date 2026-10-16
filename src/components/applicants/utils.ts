// File: utils.ts
// Path: src/components/applicants/utils.ts

// ── Tabs (frontend view keys; bucket keys like UNASSIGNED / ASSIGNED come from backend) ──
export const ALL_TAB = 'ALL';
export const REQUIREMENTS_TAB = 'REQUIREMENTS'; // every requirement in scope

export const toStatusLabel = (key: string) =>
  key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');

export const formatDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

/** Trims stray spaces in stored names (" Rakhi " + "Sen  " → "Rakhi Sen") */
export const personName = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
  u
    ? [u.firstName, u.lastName]
        .map(s => s?.trim())
        .filter(Boolean)
        .join(' ')
    : '—';

export const formatExperience = (years: number | null) =>
  years == null ? '—' : `${years} ${years === 1 ? 'yr' : 'yrs'}`;

export const toIsoStart = (date: string) =>
  date ? new Date(`${date}T00:00:00`).toISOString() : undefined;

export const toIsoEnd = (date: string) =>
  date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined;

/** Theme chart colour for the n-th series (1-based) — cycles --chart-1 … --chart-5 */
export const chartColor = (n: number) => `var(--chart-${((n - 1) % 5) + 1})`;

/** Same colour, 12% tint — for icon tiles */
export const chartTint = (n: number) => `color-mix(in oklab, ${chartColor(n)} 12%, transparent)`;

// File: utils.ts
// Path: src/components/applicants/utils.ts

export const toStatusLabel = (key: string) =>
  key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');

export const formatDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

export const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

/** Trims stray spaces in stored names (" Rakhi " + "Sen  " → "Rakhi Sen") */
export const personName = (u: { firstName?: string | null; lastName?: string | null }) =>
  [u.firstName, u.lastName]
    .map(s => s?.trim())
    .filter(Boolean)
    .join(' ');

const AVATAR_TONES = [
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
];

/** Same name → same colour, every time */
export const avatarTone = (seed: string) => {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};

export const toIsoStart = (date: string) =>
  date ? new Date(`${date}T00:00:00`).toISOString() : undefined;

export const toIsoEnd = (date: string) =>
  date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined;

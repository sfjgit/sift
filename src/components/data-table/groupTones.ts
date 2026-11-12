// File: groupTones.ts
// Path: src/components/data-table/groupTones.ts
//
// Colours of the column groups (meta.group / groupTone): the band over the
// table's headers and the dots / headings in the column bar.

import type { GroupTone } from './types';

/** band over the headers */
export const GROUP_BAND: Record<GroupTone, string> = {
  blue: 'bg-blue-50 text-blue-700 border-b-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-b-blue-800',
  green:
    'bg-emerald-50 text-emerald-700 border-b-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-b-emerald-800',
  rose: 'bg-rose-50 text-rose-700 border-b-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-b-rose-800',
  violet:
    'bg-violet-50 text-violet-700 border-b-violet-300 dark:bg-violet-950/50 dark:text-violet-300 dark:border-b-violet-800',
  amber:
    'bg-amber-50 text-amber-700 border-b-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-b-amber-800',
  slate: 'bg-slate-50 text-slate-600 border-b-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-b-slate-700',
};

/** small dot that says which group a column is in */
export const GROUP_DOT: Record<GroupTone, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-400',
};

/** group heading text in the column bar */
export const GROUP_TEXT: Record<GroupTone, string> = {
  blue: 'text-blue-700 dark:text-blue-300',
  green: 'text-emerald-700 dark:text-emerald-300',
  rose: 'text-rose-700 dark:text-rose-300',
  violet: 'text-violet-700 dark:text-violet-300',
  amber: 'text-amber-700 dark:text-amber-300',
  slate: 'text-slate-600 dark:text-slate-300',
};

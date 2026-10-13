// File: StatusPill.tsx
// Path: src/components/applicants/StatusPill.tsx

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toStatusLabel } from '@/components/applicants/utils';

export const TONE_CLASSES = {
  green:
    'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  blue: 'border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  violet:
    'border-transparent bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  gray: 'border-transparent bg-muted text-muted-foreground',
} as const;

export type PillTone = keyof typeof TONE_CLASSES;

// display-only colour mapping — unknown statuses fall back to gray
const STATUS_TONE: Record<string, PillTone> = {
  ACTIVE: 'green',
  ASSIGNED: 'green',
  PENDING_APPROVAL: 'amber',
  ON_HOLD: 'amber',
  UNASSIGNED: 'amber',
  DRAFT: 'gray',
  CLOSED: 'gray',
  CANCELLED: 'red',
};

export const getStatusTone = (status: string): PillTone => STATUS_TONE[status] ?? 'gray';

interface Props {
  status: string;
  label?: ReactNode;
  tone?: PillTone;
  className?: string;
}

export function StatusPill({ status, label, tone, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium',
        TONE_CLASSES[tone ?? getStatusTone(status)],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? toStatusLabel(status)}
    </Badge>
  );
}

// File: badges.tsx
// Path: src/components/common/badges.tsx
//
// Every status pill in the app. Colours come from one tone map so the same
// meaning always reads the same (green = good, amber = needs review ...).

import { cn } from '@/lib/utils';
import { titleCase } from '@/lib/format';
import type { ClientStatus, EmailStatus, StepRunStatus, ValidationBand } from '@/types/crm';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground ring-border',
  primary: 'bg-primary/10 text-primary ring-primary/20',
  success: 'bg-success/12 text-success ring-success/25',
  warning: 'bg-warning/15 text-[oklch(0.5_0.13_60)] dark:text-warning ring-warning/30',
  danger: 'bg-destructive/10 text-destructive ring-destructive/20',
  info: 'bg-info/12 text-info ring-info/25',
  violet: 'bg-chart-1/12 text-chart-1 ring-chart-1/25',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-muted-foreground/60',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  violet: 'bg-chart-1',
};

export function Pill({
  tone = 'neutral',
  dot = true,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[tone],
        className
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  );
}

export const CLIENT_STATUS: Record<ClientStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending approval', tone: 'warning' },
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
};

export const ClientStatusBadge = ({ status }: { status: ClientStatus }) => (
  <Pill tone={CLIENT_STATUS[status]?.tone}>{CLIENT_STATUS[status]?.label ?? status}</Pill>
);

export const EMAIL_STATUS: Record<EmailStatus, { label: string; tone: Tone }> = {
  GOOD: { label: 'Verified', tone: 'success' },
  RISKY: { label: 'Risky', tone: 'warning' },
  BAD: { label: 'Bounces', tone: 'danger' },
  UNVERIFIED: { label: 'Unverified', tone: 'neutral' },
};

export const EmailStatusBadge = ({ status }: { status: EmailStatus }) => (
  <Pill tone={EMAIL_STATUS[status]?.tone}>{EMAIL_STATUS[status]?.label ?? status}</Pill>
);

export const BAND: Record<ValidationBand | 'UNSCORED', { label: string; tone: Tone }> = {
  READY: { label: 'Ready', tone: 'success' },
  REVIEW: { label: 'Review', tone: 'warning' },
  NOT_USABLE: { label: 'Not usable', tone: 'danger' },
  UNSCORED: { label: 'Unscored', tone: 'neutral' },
};

export function BandBadge({ band, score }: { band: ValidationBand | null; score?: number | null }) {
  const b = BAND[band ?? 'UNSCORED'];
  return (
    <Pill tone={b.tone}>
      {b.label}
      {score !== null && score !== undefined && <span className="tabular opacity-70">{score}</span>}
    </Pill>
  );
}

export const STEP_STATUS: Record<StepRunStatus, { label: string; tone: Tone }> = {
  QUEUED: { label: 'Queued', tone: 'neutral' },
  RUNNING: { label: 'Running', tone: 'info' },
  DONE: { label: 'Done', tone: 'success' },
  EMPTY: { label: 'Nothing found', tone: 'neutral' },
  FAILED: { label: 'Failed', tone: 'danger' },
  STOPPED: { label: 'Stopped', tone: 'neutral' },
  DISPATCH_FAILED: { label: 'Not sent', tone: 'danger' },
  TIMED_OUT: { label: 'Timed out', tone: 'warning' },
};

export const StepRunBadge = ({ status }: { status: StepRunStatus }) => (
  <Pill tone={STEP_STATUS[status]?.tone}>{STEP_STATUS[status]?.label ?? titleCase(status)}</Pill>
);

export const ActiveBadge = ({ active, labels = ['Active', 'Inactive'] }: { active: boolean; labels?: [string, string] }) => (
  <Pill tone={active ? 'success' : 'neutral'}>{active ? labels[0] : labels[1]}</Pill>
);

/** Lookup values (sales status, source...) — tone from lookup.meta.tone if admins set one */
const LOOKUP_TONES: Tone[] = ['primary', 'info', 'violet', 'success', 'warning'];
export function LookupBadge({
  lookup,
  meta,
}: {
  lookup?: { code: string; label: string } | null;
  meta?: { tone?: Tone } | null;
}) {
  if (!lookup) return <span className="text-muted-foreground">—</span>;
  let h = 0;
  for (const c of lookup.code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return <Pill tone={meta?.tone ?? LOOKUP_TONES[h % LOOKUP_TONES.length]}>{lookup.label}</Pill>;
}

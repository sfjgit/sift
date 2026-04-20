// ─────────────────────────────────────────────────────────────
// Shared primitives — requirement detail
// ─────────────────────────────────────────────────────────────

import { ReactNode } from 'react';

// ── Section card ──────────────────────────────────────────────
export function SectionCard({
  title,
  children,
  className = '',
}: {
  title?: ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-border/60">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {title}
          </p>
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ── Info row — label + value ───────────────────────────────────
export function InfoRow({
  label,
  value,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <span className="min-w-[130px] text-[12px] text-muted-foreground/70 shrink-0 pt-px">
        {label}
      </span>
      <span className="text-[13px] text-foreground font-medium break-words">
        {value ?? <span className="text-muted-foreground/40 font-normal">—</span>}
      </span>
    </div>
  );
}

// ── Generic badge ─────────────────────────────────────────────
const badgeMap: Record<string, string> = {
  // status
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  DRAFT: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  CLOSED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  ON_HOLD: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  // priority
  HIGH: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  LOW: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  // misc
  CONTRACT: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  PERMANENT: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  CONTRACT_TO_HIRE: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  FREELANCE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  ONSITE: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  REMOTE: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  HYBRID: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  INDIVIDUAL: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  TEAM: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

export function Badge({ value }: { value: string }) {
  const cls = badgeMap[value] ?? 'bg-muted text-muted-foreground border-border';
  const label = value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cls}`}
    >
      {label}
    </span>
  );
}

// ── Divider ───────────────────────────────────────────────────
export function Divider() {
  return <div className="border-t border-border/50 my-2" />;
}

// ── Avatar initials ───────────────────────────────────────────
export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
      {initials}
    </span>
  );
}

// ── Person chip ───────────────────────────────────────────────
export function PersonChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={name} />
      <span className="text-[13px] font-medium">{name}</span>
    </span>
  );
}

// ── Salary formatter ──────────────────────────────────────────
export function formatSalary(min?: number | null, max?: number | null, type?: string | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
      : `₹${n.toLocaleString('en-IN')}`;
  const range = [min && fmt(min), max && fmt(max)].filter(Boolean).join(' – ');
  return type ? `${range} ${type}` : range;
}

// ── Date formatter ────────────────────────────────────────────
export function fmtDate(iso?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

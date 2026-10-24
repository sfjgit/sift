// File: StatCard.tsx
// Path: src/components/common/StatCard.tsx

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fmtNumber } from '@/lib/format';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  loading,
  accent = 'primary',
  className,
  ...rest
}: {
  label: string;
  value?: number | string | null;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  loading?: boolean;
  accent?: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'violet';
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>) {
  const accents = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/12',
    warning: 'text-[oklch(0.55_0.14_60)] dark:text-warning bg-warning/15',
    info: 'text-info bg-info/12',
    danger: 'text-destructive bg-destructive/10',
    violet: 'text-chart-1 bg-chart-1/12',
  } as const;

  const body = (
    <div
      className={cn(
        'group relative flex h-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-card transition-all',
        href && 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-float',
        className
      )}
      {...rest}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn('flex size-8 items-center justify-center rounded-lg', accents[accent])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <span className="tabular text-[28px] leading-none font-semibold tracking-tight">
          {typeof value === 'number' ? fmtNumber(value) : (value ?? '—')}
        </span>
      )}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      {href && (
        <ArrowUpRight className="absolute right-3 bottom-3 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}

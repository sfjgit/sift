// File: PageHeader.tsx
// Path: src/components/common/PageHeader.tsx

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-60" />}
          {c.href ? (
            <Link href={c.href} className="transition-colors hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="truncate text-foreground/80">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** the page's name: bold brand colour with a gradient underline (hover = what the page is for) */
export function PageTitle({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <h1
      title={hint}
      className={cn(
        'relative mr-2 shrink-0 pb-1 text-xl leading-tight font-bold tracking-tight text-primary',
        'after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-fuchsia-500 after:to-amber-400',
        className
      )}
    >
      {children}
    </h1>
  );
}

// Slim header for pages without a table: the coloured title, quick tabs and
// actions in one row, no border; the description shows when hovering the title.
// (Table pages put their title in the table's toolbar instead — no header row.)
export function PageHeader({
  title,
  description,
  actions,
  crumbs,
  icon,
  tabs,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
  icon?: ReactNode;
  /** quick tabs / segmented control shown in the title row (description then hides) */
  tabs?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn('flex flex-col gap-2', className)}>
      {crumbs && crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} />}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon}
          <PageTitle hint={typeof description === 'string' ? description : undefined}>
            {title}
          </PageTitle>
          {tabs}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

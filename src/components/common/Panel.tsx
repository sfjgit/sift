// File: Panel.tsx
// Path: src/components/common/Panel.tsx
//
// Card section with a header row — the building block of detail pages and
// dashboards. DetailList renders label/value pairs in a responsive grid.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  ...rest
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section className={cn('rounded-xl border bg-card shadow-card', className)} {...rest}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** span both columns */
  wide?: boolean;
  hidden?: boolean;
}

export function DetailList({ items, columns = 2 }: { items: DetailItem[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      {items
        .filter(i => !i.hidden)
        .map(i => (
          <div key={i.label} className={cn('min-w-0', i.wide && 'sm:col-span-full')}>
            <dt className="text-xs font-medium text-muted-foreground">{i.label}</dt>
            <dd className="mt-1 text-sm break-words">
              {i.value === null || i.value === undefined || i.value === '' ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                i.value
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}

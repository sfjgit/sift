// File: SubSection.tsx
// Path: src/components/common/SubSection.tsx
//
// A light heading + content block for detail pages: no card, no folding — the
// content (usually a table) carries its own frame. InlineEmpty is the one-line
// "nothing here yet" that replaces big empty boxes.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SubSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function InlineEmpty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-card/50 px-3 py-2.5 text-[13px] text-muted-foreground">
      <span>{children}</span>
      {action}
    </div>
  );
}

// File: states.tsx
// Path: src/components/common/states.tsx
//
// Empty / error / loading placeholders used by tables, panels and pages.

import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, RotateCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-16',
        className
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/10 blur-xl" />
        <div className="flex size-11 items-center justify-center rounded-xl border bg-card shadow-card">
          <Icon className="size-5 text-primary" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mx-auto max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Couldn’t load this',
  error,
  onRetry,
  className,
}: {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message = error instanceof Error ? error.message : undefined;
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {message && <p className="max-w-sm text-[13px] text-muted-foreground">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin text-muted-foreground', className)} />;
}

export function FullPageLoader({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background">
      <div className="relative size-10">
        <div className="absolute inset-0 animate-ping rounded-xl bg-primary/20" />
        <div className="relative flex size-10 items-center justify-center rounded-xl brand-gradient shadow-float">
          <Loader2 className="size-5 animate-spin text-white" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

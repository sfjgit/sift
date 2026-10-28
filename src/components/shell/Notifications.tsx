// File: Notifications.tsx
// Path: src/components/shell/Notifications.tsx

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, MessageSquareText, ShieldAlert, UserCheck, UserPlus, Workflow, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmptyState, Spinner } from '@/components/common/states';
import { notificationsApi } from '@/lib/api/endpoints';
import { notificationKeys, useUnreadCount } from '@/hooks/queries';
import { tourTarget } from '@/features/tour/tour.constants';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationSeverity } from '@/types/org';

export const notificationHref = (n: AppNotification) =>
  n.link ??
  (n.referenceType === 'CLIENT'
    ? `/clients/${n.referenceId}`
    : n.referenceType === 'SPOC'
      ? `/spocs/${n.referenceId}`
      : n.referenceType === 'SYSTEM_ALERT'
        ? '/admin/alerts'
        : `/pipeline-runs?run=${n.referenceId}`);

const ICONS = {
  SPOC_ASSIGNED: { icon: UserPlus, cls: 'bg-primary/10 text-primary' },
  NOTE_ADDED: { icon: MessageSquareText, cls: 'bg-info/12 text-info' },
  STEP_RUN_FINISHED: { icon: Workflow, cls: 'bg-success/12 text-success' },
  STEP_RUN_FAILED: { icon: XCircle, cls: 'bg-destructive/10 text-destructive' },
  SPOC_APPROVAL_NEEDED: { icon: UserCheck, cls: 'bg-warning/15 text-warning' },
  SYSTEM_ALERT: { icon: ShieldAlert, cls: 'bg-destructive/10 text-destructive' },
} as const;

// severity wins over the type's default colour
const SEVERITY_CLS: Partial<Record<NotificationSeverity, string>> = {
  SUCCESS: 'bg-success/12 text-success',
  WARNING: 'bg-warning/15 text-warning',
  ERROR: 'bg-destructive/10 text-destructive',
};

export function NotificationItem({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  const meta = ICONS[n.type] ?? ICONS.NOTE_ADDED;
  const cls = (n.severity && SEVERITY_CLS[n.severity]) ?? meta.cls;
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-muted',
        !n.isRead && 'bg-accent/40'
      )}
    >
      <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg', cls)}>
        <meta.icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-snug font-medium">{n.title}</span>
        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
        <span className="mt-1 block text-[11px] text-muted-foreground">{fmtRelative(n.createdAt)}</span>
      </span>
      {!n.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}

export function NotificationsPopover() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useUnreadCount();
  const unread = data?.meta.unread ?? 0;

  const refresh = () => qc.invalidateQueries({ queryKey: notificationKeys.all });

  const openOne = async (n: AppNotification) => {
    if (!n.isRead) {
      await notificationsApi.markRead(n.id).catch(() => undefined);
      void refresh();
    }
    router.push(notificationHref(n));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" {...tourTarget('notifications')}>
          <Bell />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] leading-4 font-bold text-primary-foreground ring-2 ring-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={async () => {
                await notificationsApi.markAllRead();
                void refresh();
              }}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : data?.data.length ? (
            data.data.map(n => <NotificationItem key={n.id} n={n} onOpen={openOne} />)
          ) : (
            <EmptyState compact icon={Bell} title="You’re all caught up" description="Assignments, notes, run results and alerts show up here." />
          )}
        </div>
        <div className="border-t p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

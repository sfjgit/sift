// File: page.tsx
// Path: src/app/(app)/notifications/page.tsx
//
// Full notification inbox. Reuses the popover's item + href so a
// notification looks and behaves the same in both places.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { EmptyState, ErrorState } from '@/components/common/states';
import { NotificationItem, notificationHref } from '@/components/shell/Notifications';
import { notificationKeys } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { notificationsApi } from '@/lib/api/endpoints';
import type { AppNotification } from '@/types/org';

const LIMIT = 20;
type Tab = 'all' | 'unread';

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [...notificationKeys.all, 'page', tab, page],
    queryFn: () => notificationsApi.list({ page, limit: LIMIT, isRead: tab === 'unread' ? false : undefined }),
    placeholderData: keepPreviousData,
  });

  const invalidate = [notificationKeys.all];
  const markAll = useAction(() => notificationsApi.markAllRead(), { success: 'All caught up', invalidate });
  const clearRead = useAction(() => notificationsApi.clearRead(), { success: 'Read notifications cleared', invalidate });
  const remove = useAction((id: string) => notificationsApi.remove(id), { success: 'Notification removed', invalidate });

  const unread = data?.meta.unread ?? 0;
  const total = data?.meta.total ?? 0;
  const pages = data?.meta.pages ?? 1;
  const items = data?.data ?? [];

  // deleting the last item on the last page → step back instead of showing an empty page
  if (data && data.meta.pages > 0 && page > data.meta.pages) setPage(data.meta.pages);

  const open = async (n: AppNotification) => {
    if (!n.isRead) {
      await notificationsApi.markRead(n.id).catch(() => undefined);
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    }
    router.push(notificationHref(n));
  };

  const switchTab = (t: string) => {
    setTab(t as Tab);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Notifications"
        description="Assignments, notes on your records and pipeline results."
        actions={
          <>
            <Button variant="outline" size="sm" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate(undefined)}>
              <CheckCheck /> Mark all read
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={clearRead.isPending || total === 0}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Clear read notifications?',
                  description: 'Every notification you’ve already read is deleted. Unread ones stay.',
                  destructive: true,
                  confirmLabel: 'Clear read',
                });
                if (ok) clearRead.mutate(undefined, { onSuccess: () => setPage(1) });
              }}
            >
              <Trash2 /> Clear read
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={switchTab}>
        <TabsList>
          <TabsTrigger value="all" className="px-3">
            All
          </TabsTrigger>
          <TabsTrigger value="unread" className="px-3">
            Unread
            {unread > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-foreground">
                {unread}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative overflow-hidden rounded-xl border bg-card shadow-card">
        {isFetching && !isLoading && (
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/10">
            <div className="h-full w-1/3 animate-[progress_1s_ease-in-out_infinite] bg-primary" />
          </div>
        )}
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-2.5 py-3">
                <Skeleton className="size-7 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={tab === 'unread' ? 'Nothing unread' : 'No notifications'}
            description={
              tab === 'unread'
                ? 'You’re all caught up.'
                : 'You’ll be notified when a SPOC is assigned to you, someone adds a note to your records, or a pipeline run finishes.'
            }
          />
        ) : (
          <ul className="divide-y divide-border/60 p-1.5">
            {items.map(n => (
              <li key={n.id} className="group relative">
                <div className="pr-10">
                  <NotificationItem n={n} onOpen={open} />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-2 right-1.5 opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Delete notification: ${n.title}`}
                  disabled={remove.isPending && remove.variables === n.id}
                  onClick={() => remove.mutate(n.id)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              Page {page} of {pages} · {total.toLocaleString('en-IN')} total
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next page"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

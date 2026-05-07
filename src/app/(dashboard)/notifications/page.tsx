// app/(dashboard)/notifications/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Trash2, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type NotifType =
  | 'REQUIREMENT_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'REQUIREMENT_CLOSED'
  | 'NOTE_ADDED'
  | 'ISSUE_RAISED'
  | 'DEADLINE_BREACHED'
  | 'DEADLINE_REMINDER';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body?: string | null;
  referenceId: string;
  referenceType: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NotifMeta {
  total: number;
  unread: number;
  page: number;
  limit: number;
  pages: number;
}

const TYPE_CONFIG: Record<NotifType, { label: string; color: string; dot: string }> = {
  REQUIREMENT_ASSIGNED: {
    label: 'Assigned',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  STATUS_CHANGED: {
    label: 'Status',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
  },
  REQUIREMENT_CLOSED: {
    label: 'Closed',
    color: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    dot: 'bg-zinc-400',
  },
  NOTE_ADDED: {
    label: 'Note',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-400',
  },
  ISSUE_RAISED: {
    label: 'Issue',
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  DEADLINE_BREACHED: {
    label: 'Breached',
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-600',
  },
  DEADLINE_REMINDER: {
    label: 'Reminder',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-400',
  },
};

export default function NotificationsPage() {
  const axios = useAxios();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (filter === 'unread') params.set('isRead', 'false');
      const res = await axios.get(`/notifications?${params}`);
      return res.data as { data: Notification[]; meta: NotifMeta };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => axios.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => axios.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteNotif = useMutation({
    mutationFn: (id: string) => axios.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const clearRead = useMutation({
    mutationFn: () => axios.delete('/notifications'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
      toast.success('Cleared read notifications');
    },
  });

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markRead.mutate(notif.id);

    // navigate based on reference type
    if (notif.referenceType === 'REQUIREMENT' || notif.referenceType === 'ASSIGNMENT') {
      router.push(`/requirements/${notif.referenceId}`);
    }
  };

  const notifications = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-0 max-w-2xl mx-auto p-6">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {(meta?.unread ?? 0) > 0 && (
              <Badge className="text-xs px-2 py-0.5 bg-destructive text-white">
                {meta!.unread}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta?.total ?? 0} total · {meta?.unread ?? 0} unread
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || (meta?.unread ?? 0) === 0}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => clearRead.mutate()}
            disabled={clearRead.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear read
          </Button>
        </div>
      </div>

      {/* filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {f}
            {f === 'unread' && (meta?.unread ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] bg-destructive text-white rounded-full px-1">
                {meta!.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <Separator className="mb-2" />

      {/* list */}
      {isLoading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3.5 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse mt-1.5 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
          <BellOff className="h-10 w-10 opacity-25" />
          <p className="text-sm font-medium">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-xs opacity-70">You're all caught up 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {notifications.map((notif, i) => {
            const config = TYPE_CONFIG[notif.type] ?? {
              label: notif.type,
              color: 'bg-muted text-muted-foreground border-border',
              dot: 'bg-zinc-400',
            };

            return (
              <div key={notif.id}>
                <div
                  className={cn(
                    'flex items-start gap-3 px-4 py-3.5 rounded-xl transition-colors cursor-pointer group',
                    !notif.isRead ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/40'
                  )}
                  onClick={() => handleClick(notif)}
                >
                  {/* unread dot */}
                  <div className="flex items-center justify-center shrink-0 mt-1.5">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full transition-all',
                        !notif.isRead ? config.dot : 'bg-transparent border border-border'
                      )}
                    />
                  </div>

                  {/* content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 py-0 shrink-0', config.color)}
                      >
                        {config.label}
                      </Badge>
                      <span
                        className={cn(
                          'text-sm font-medium leading-snug',
                          !notif.isRead ? 'text-foreground' : 'text-foreground/80'
                        )}
                      >
                        {notif.title}
                      </span>
                    </div>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notif.body}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* actions — show on hover */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={e => {
                          e.stopPropagation();
                          markRead.mutate(notif.id);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        deleteNotif.mutate(notif.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {i < notifications.length - 1 && <Separator className="mx-4 opacity-40" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

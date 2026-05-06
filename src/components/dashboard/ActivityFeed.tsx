'use client';

import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useActivityFeed } from '@/hooks/useDashboard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ACTIVITY_COLORS: Record<string, string> = {
  REQUIREMENT_CREATED: 'bg-emerald-500',
  REQUIREMENT_APPROVED: 'bg-blue-500',
  REQUIREMENT_CLOSED: 'bg-zinc-400',
  STATUS_CHANGED: 'bg-amber-400',
  MANAGER_ASSIGNED: 'bg-violet-500',
  RECRUITER_ASSIGNED: 'bg-indigo-400',
  NOTE_ADDED: 'bg-zinc-400',
  ISSUE_RAISED: 'bg-red-500',
  ISSUE_RESOLVED: 'bg-emerald-400',
  DOCUMENT_UPLOADED: 'bg-blue-400',
};

export function ActivityFeed({ buId }: { buId?: string }) {
  const { data: activities, isLoading } = useActivityFeed({ buId });
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-col px-5 py-2 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">No recent activity</p>;
  }

  return (
    <ScrollArea className="max-h-72">
      <div className="flex flex-col px-5 py-2">
        {activities.map((a, i) => (
          <div key={a.id} className="flex gap-3 py-2.5">
            <div className="flex flex-col items-center pt-1 shrink-0">
              <div
                className={cn(
                  'h-2 w-2 rounded-full ring-2 ring-background',
                  ACTIVITY_COLORS[a.type] ?? 'bg-zinc-400'
                )}
              />
              {i < activities.length - 1 && <div className="flex-1 w-px bg-border/40 mt-1" />}
            </div>
            <div className="flex flex-col gap-0.5 pb-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">{a.summary}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <button
                  onClick={() => router.push(`/requirements/${a.requirement.id}`)}
                  className="font-mono hover:text-primary hover:underline"
                >
                  {a.requirement.reqCode}
                </button>
                <span>·</span>
                <span>
                  {a.actor.firstName} {a.actor.lastName}
                </span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

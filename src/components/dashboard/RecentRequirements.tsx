/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Briefcase, Clock, ChevronRight } from 'lucide-react';
// import { requirementsApi } from '@/lib/requirements.api';
import { QUERY_KEYS } from '@/constants/modules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRequirementsApi } from '@/lib/requirements.api';

const REQ_STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  CLOSED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
};

const REQ_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function RecentRequirements() {
  //   const api = useAxios();

  const { getAll } = useRequirementsApi();

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.REQUIREMENTS, 'recent'],
    queryFn: () => getAll({ page: 1, limit: 6 }),
  });

  const items = data?.data?.data ?? [];

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-semibold">Recent Requirements</p>
        <Link href="/dashboard/requirements">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Body */}
      {isLoading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyRow msg="No requirements yet." />
      ) : (
        <div className="divide-y">
          {items.map((req: any) => (
            <Link key={req.id} href={`/dashboard/requirements/${req.id}`}>
              <div className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{req.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {req.reqCode} · {req.client?.name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0', REQ_STATUS_STYLE[req.status])}
                  >
                    {REQ_STATUS_LABEL[req.status]}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {timeAgo(req.createdAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{msg}</div>;
}

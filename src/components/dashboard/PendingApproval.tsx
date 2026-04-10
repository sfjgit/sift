'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Briefcase, Clock, ChevronRight, Circle } from 'lucide-react';
// import { useAxios } from '@/hooks/useAxios';
import { useRequirementsApi } from '@/lib/requirements.api';
import { QUERY_KEYS } from '@/constants/modules';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function PendingApproval() {
  //   const api = useAxios();

  const { getAll } = useRequirementsApi();

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.REQUIREMENTS, 'pending-approval'],
    queryFn: () => getAll({ page: 1, limit: 5, status: 'PENDING_APPROVAL' }),
    staleTime: 30_000,
  });

  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;

  // Don't render at all if loaded and empty
  if (!isLoading && items.length === 0) return null;

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50/60">
        <div className="flex items-center gap-2">
          <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
          <p className="text-sm font-semibold text-amber-800">Awaiting Approval</p>
          {total > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
              {total}
            </span>
          )}
        </div>
        <Link href="/dashboard/requirements?status=PENDING_APPROVAL">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y">
          {items.map(req => (
            <Link key={req.id} href={`/dashboard/requirements/${req.id}`}>
              <div className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{req.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {req.reqCode} · {req.client?.name} · {req.totalOpenings} opening
                    {req.totalOpenings !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  {timeAgo(req.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

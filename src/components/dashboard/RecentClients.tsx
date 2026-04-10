/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
// import { useAxios } from '@/hooks/useAxios';
import { clientsApi } from '@/lib/clients.api';
import { QUERY_KEYS } from '@/constants/modules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const CLIENT_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

export function RecentClients() {
  //   const api = useAxios();

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CLIENTS, 'recent'],
    queryFn: () => clientsApi.getAll({ page: 1, limit: 6 }),
    staleTime: 30_000,
  });

  const items = data?.data?.items ?? [];

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-semibold">Recent Clients</p>
        <Link href="/dashboard/clients">
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
        <EmptyRow msg="No clients yet." />
      ) : (
        <div className="divide-y">
          {items.map((client: any) => {
            <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
              <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 uppercase">
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{client.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[client.industry, client.businessUnit?.name].filter(Boolean).join(' · ') ||
                      '—'}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 shrink-0',
                    CLIENT_STATUS_STYLE[client.status]
                  )}
                >
                  {client.status}
                </Badge>
              </div>
            </Link>;
          })}
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
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{msg}</div>;
}

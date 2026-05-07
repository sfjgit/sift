'use client';

import Link from 'next/link';
import { useClients } from '@/hooks/useDashboard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ClientSummary } from '@/types/dashboard';

const BG_COLORS = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
];

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function ClientRow({ client, index }: { client: ClientSummary; index: number }) {
  const colorCls = BG_COLORS[index % BG_COLORS.length];
  const primarySpoc = client.spocs?.[0];

  return (
    <Link
      href={`/clients/${client.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
    >
      <div
        className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
          colorCls
        )}
      >
        {initials(client.name)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {client.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
          {client.industry && <span>{client.industry}</span>}
          {client.businessUnit && (
            <>
              <span>·</span>
              <span>{client.businessUnit.name}</span>
            </>
          )}
          {primarySpoc && (
            <>
              <span>·</span>
              <span>{/* {primarySpoc.user.firstName} {primarySpoc.user.lastName} */}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-1.5 py-0',
            client.status === 'ACTIVE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {client.status}
        </Badge>
        <span className="text-xs tabular-nums text-muted-foreground font-medium whitespace-nowrap">
          {client._count.requirements} req{client._count.requirements !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}

function ClientsSkeleton() {
  return (
    <div className="divide-y divide-border px-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ClientsSection({ buId }: { buId?: string }) {
  const { data: clients, isLoading } = useClients({ buId, limit: 8 });

  if (isLoading) return <ClientsSkeleton />;

  if (!clients || clients.length === 0) {
    return <div className="text-center py-8 text-xs text-muted-foreground">No clients found.</div>;
  }

  return (
    <div className="divide-y divide-border">
      {clients.map((c, i) => (
        <ClientRow key={c.id} client={c} index={i} />
      ))}
    </div>
  );
}

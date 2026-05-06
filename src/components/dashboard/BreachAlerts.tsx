'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';
import { useBreachAlerts } from '@/hooks/useDashboard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Priority } from '@/types/dashboard';

const PRI_DOT: Record<Priority, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-zinc-400',
};

export function BreachAlerts() {
  const { data: alerts, isLoading } = useBreachAlerts();

  if (isLoading) {
    return (
      <div className="flex flex-col divide-y divide-border">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 w-48 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
        <Clock className="h-7 w-7 opacity-30" />
        <p className="text-xs">No breach alerts 🎉</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {alerts.map(alert => (
        <Link
          key={alert.id}
          href={`/requirements/${alert.id}`}
          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
        >
          <span className={cn('h-2 w-2 rounded-full shrink-0 mt-1.5', PRI_DOT[alert.priority])} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="font-mono text-[10px] text-muted-foreground">{alert.reqCode}</span>
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 border-destructive/40 text-destructive"
              >
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                {alert.isRespondByBreached ? 'RespondBy' : 'Turnaround'}
              </Badge>
            </div>
            <p className="text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {alert.title}
            </p>
            <p className="text-[11px] text-muted-foreground">{alert.client.name}</p>
          </div>

          {alert.respondBy && (
            <span className="text-[11px] text-destructive shrink-0 tabular-nums font-medium">
              {format(new Date(alert.respondBy), 'dd MMM')}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

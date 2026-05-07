// components/clients/detail/RequirementsTab.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

interface Requirement {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  filledOpenings: number;
}

export function RequirementsTab({ requirements }: { requirements: Requirement[] }) {
  const router = useRouter();

  if (requirements.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">No requirements yet.</div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {requirements.map(r => (
        <div
          key={r.id}
          className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => router.push(`/requirements/${r.id}`)}
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{r.reqCode}</span>
              <Badge
                variant="outline"
                className={`text-xs ${r.priority === 'HIGH' ? 'border-destructive/40 text-destructive' : ''}`}
              >
                {humanize(r.priority)}
              </Badge>
            </div>
            <span className="text-sm font-medium line-clamp-1">{r.title}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs tabular-nums text-muted-foreground">
              {r.filledOpenings}/{r.totalOpenings} filled
            </span>
            <Badge
              variant={
                r.status === 'ACTIVE'
                  ? 'default'
                  : r.status === 'CLOSED' || r.status === 'CANCELLED'
                    ? 'destructive'
                    : 'secondary'
              }
              className="text-xs"
            >
              {humanize(r.status)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

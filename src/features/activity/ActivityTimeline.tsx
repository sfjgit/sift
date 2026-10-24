// File: ActivityTimeline.tsx
// Path: src/features/activity/ActivityTimeline.tsx
//
// Renders ClientActivity rows (dashboard feed, client timeline, SPOC history).

'use client';

import Link from 'next/link';
import {
  ArrowRightLeft,
  BadgeCheck,
  Building2,
  Cpu,
  FileText,
  IndianRupee,
  Mail,
  MapPin,
  MessageSquareText,
  Pencil,
  PlayCircle,
  Sprout,
  UserPlus,
  XCircle,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/states';
import { fmtDateTime, fmtRelative, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ClientActivity, ClientActivityType } from '@/types/crm';

const META: Record<ClientActivityType, { icon: LucideIcon; cls: string; verb: string }> = {
  CLIENT_CREATED: { icon: Building2, cls: 'bg-primary/10 text-primary', verb: 'Client created' },
  CLIENT_UPDATED: { icon: Pencil, cls: 'bg-muted text-muted-foreground', verb: 'Updated' },
  CLIENT_APPROVED: { icon: BadgeCheck, cls: 'bg-success/12 text-success', verb: 'Approved' },
  SPOC_ADDED: { icon: UserPlus, cls: 'bg-primary/10 text-primary', verb: 'SPOC added' },
  SPOC_UPDATED: { icon: Pencil, cls: 'bg-muted text-muted-foreground', verb: 'SPOC updated' },
  SPOC_REASSIGNED: { icon: ArrowRightLeft, cls: 'bg-info/12 text-info', verb: 'Reassigned' },
  NOTE_ADDED: { icon: MessageSquareText, cls: 'bg-warning/15 text-[oklch(0.55_0.14_60)] dark:text-warning', verb: 'Note' },
  LOCATION_ADDED: { icon: MapPin, cls: 'bg-muted text-muted-foreground', verb: 'Location added' },
  TECHNOLOGY_UPDATED: { icon: Cpu, cls: 'bg-muted text-muted-foreground', verb: 'Technology' },
  DOCUMENT_ADDED: { icon: FileText, cls: 'bg-muted text-muted-foreground', verb: 'Document' },
  FINANCIALS_UPDATED: { icon: IndianRupee, cls: 'bg-success/12 text-success', verb: 'CSR figures' },
  PROGRAMS_ADDED: { icon: Sprout, cls: 'bg-success/12 text-success', verb: 'Programs' },
  OUTREACH_GENERATED: { icon: Mail, cls: 'bg-primary/10 text-primary', verb: 'Outreach' },
  STEP_RUN_STARTED: { icon: PlayCircle, cls: 'bg-info/12 text-info', verb: 'Pipeline started' },
  STEP_RUN_FINISHED: { icon: CheckCircle2, cls: 'bg-success/12 text-success', verb: 'Pipeline finished' },
  STEP_RUN_FAILED: { icon: XCircle, cls: 'bg-destructive/10 text-destructive', verb: 'Pipeline failed' },
};

export function ActivityTimeline({
  items,
  loading,
  showClient = false,
  compact = false,
  emptyText = 'No activity yet',
}: {
  items?: ClientActivity[];
  loading?: boolean;
  showClient?: boolean;
  compact?: boolean;
  emptyText?: string;
}) {
  if (loading) {
    return (
      <ul className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (!items?.length) return <EmptyState compact title={emptyText} />;

  return (
    <ol className="relative">
      {items.map((a, idx) => {
        const m = META[a.type] ?? META.CLIENT_UPDATED;
        return (
          <li key={a.id} className={cn('relative flex gap-3', compact ? 'pb-3' : 'pb-5', 'last:pb-0')}>
            {idx < items.length - 1 && <span className="absolute top-8 bottom-0 left-3.5 w-px bg-border" aria-hidden />}
            <span className={cn('relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-lg', m.cls)}>
              <m.icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn('text-[13px] leading-snug', a.type === 'NOTE_ADDED' && 'whitespace-pre-line')}>
                {a.type !== 'NOTE_ADDED' && <span className="font-medium">{m.verb} · </span>}
                {a.summary}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span>{a.actor ? fullName(a.actor) : 'System'}</span>
                {showClient && a.client && (
                  <>
                    <span>·</span>
                    <Link href={`/clients/${a.client.id}`} className="font-medium text-foreground/80 hover:text-primary">
                      {a.client.name}
                    </Link>
                  </>
                )}
                {a.spoc && (
                  <>
                    <span>·</span>
                    <Link href={`/spocs/${a.spoc.id}`} className="hover:text-primary">
                      {fullName(a.spoc)}
                    </Link>
                  </>
                )}
                <span>·</span>
                <time dateTime={a.createdAt} title={fmtDateTime(a.createdAt)}>
                  {fmtRelative(a.createdAt)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

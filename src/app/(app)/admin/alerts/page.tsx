// File: page.tsx
// Path: src/app/(app)/admin/alerts/page.tsx
//
// Admin → System alerts: problems the CRM raised itself (engine down, runs
// failing, server errors). One row per problem — repeats bump the count —
// and the system clears an alert when the problem goes away.

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { Pill, type Tone } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { alertsApi } from '@/lib/api/endpoints';
import { fmtDateTime, fmtNumber, fmtRelative, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { NotificationSeverity, SystemAlert } from '@/types/org';

type Status = 'open' | 'resolved';

const SEVERITY: Record<NotificationSeverity, { label: string; tone: Tone; icon: typeof Info; cls: string }> = {
  ERROR: { label: 'Error', tone: 'danger', icon: XCircle, cls: 'bg-destructive/10 text-destructive' },
  WARNING: { label: 'Warning', tone: 'warning', icon: AlertTriangle, cls: 'bg-warning/15 text-warning' },
  INFO: { label: 'Info', tone: 'info', icon: Info, cls: 'bg-info/12 text-info' },
  SUCCESS: { label: 'OK', tone: 'success', icon: CheckCircle2, cls: 'bg-success/12 text-success' },
};

const SOURCE: Record<SystemAlert['source'], string> = {
  engine: 'CSR pipeline engine',
  pipeline: 'Pipeline runs',
  api: 'CRM server',
};

function AlertRow({ a, canResolve, onResolve, busy }: { a: SystemAlert; canResolve: boolean; onResolve: () => void; busy: boolean }) {
  const s = SEVERITY[a.severity];
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3.5">
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', s.cls)}>
        <s.icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-medium">{a.title}</span>
          <Pill tone={s.tone}>{s.label}</Pill>
          {a.count > 1 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground" title="Times this happened">
              ×{fmtNumber(a.count)}
            </span>
          )}
        </div>
        {a.body && <p className="text-[13px] break-words text-muted-foreground">{a.body}</p>}
        <p className="text-xs text-muted-foreground">
          {SOURCE[a.source]} · first {fmtRelative(a.firstSeenAt)} · last{' '}
          <span title={fmtDateTime(a.lastSeenAt)}>{fmtRelative(a.lastSeenAt)}</span>
          {a.resolvedAt && (
            <>
              {' '}
              · resolved {fmtRelative(a.resolvedAt)} by {a.resolvedBy ? fullName(a.resolvedBy) : 'the system'}
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {a.link && (
          <Button asChild variant="outline" size="sm">
            <Link href={a.link}>
              <ExternalLink /> Open
            </Link>
          </Button>
        )}
        {canResolve && !a.resolvedAt && (
          <Button variant="ghost" size="sm" onClick={onResolve} disabled={busy}>
            <CheckCircle2 /> Resolve
          </Button>
        )}
      </div>
    </li>
  );
}

function AlertsPage() {
  const { can } = usePermissions();
  const canResolve = can('system_alerts.manage');
  const [status, setStatus] = useState<Status>('open');
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ['system-alerts', status, page],
    queryFn: () => alertsApi.list({ status, page, limit: 25 }),
    refetchInterval: 30_000,
  });
  const resolve = useAction(alertsApi.resolve, {
    success: r => `${r.resolved} alert(s) resolved`,
    invalidate: [['system-alerts'], ['notifications']],
  });

  const rows = q.data?.data ?? [];
  const open = q.data?.meta.open ?? {};
  const openTotal = Object.values(open).reduce((n, v) => n + (v ?? 0), 0);
  const pages = q.data?.meta.pages ?? 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title="System alerts"
        description="Problems the CRM noticed on its own — pipeline engine down, runs failing, server errors. Repeats are counted on one row; alerts clear themselves when the problem goes away."
        actions={
          <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={cn(q.isFetching && 'animate-spin')} /> Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onValueChange={v => {
            setStatus(v as Status);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="open">Open{openTotal ? ` (${openTotal})` : ''}</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
        {status === 'open' && openTotal > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(['ERROR', 'WARNING', 'INFO'] as const).map(
              s => !!open[s] && <Pill key={s} tone={SEVERITY[s].tone}>{`${open[s]} ${SEVERITY[s].label.toLowerCase()}`}</Pill>
            )}
            {canResolve && (
              <Button
                variant="ghost"
                size="sm"
                disabled={resolve.isPending || !rows.length}
                onClick={() => resolve.mutate(rows.map(r => r.id))}
              >
                Resolve all on this page
              </Button>
            )}
          </div>
        )}
      </div>

      <Panel bodyClassName="p-0">
        {q.isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={status === 'open' ? CheckCircle2 : ShieldAlert}
            title={status === 'open' ? 'Nothing needs attention' : 'No resolved alerts yet'}
            description={status === 'open' ? 'The pipeline engine, runs and server are all quiet.' : undefined}
          />
        ) : (
          <ul className="divide-y">
            {rows.map(a => (
              <AlertRow
                key={a.id}
                a={a}
                canResolve={canResolve}
                busy={resolve.isPending}
                onResolve={() => resolve.mutate([a.id])}
              />
            ))}
          </ul>
        )}
      </Panel>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="system_alerts.read">
      <AlertsPage />
    </RequirePermission>
  );
}

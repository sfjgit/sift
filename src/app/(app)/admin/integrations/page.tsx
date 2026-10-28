// File: page.tsx
// Path: src/app/(app)/admin/integrations/page.tsx
//
// Admin → Integrations: the CSR pipeline engine. Live health (worker, queue,
// which API keys are set — keys themselves stay on the engine), key tests,
// callback-key rotation, and per-step on/off + client limits.

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cable, CheckCircle2, Copy, KeyRound, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { DetailList, Panel } from '@/components/common/Panel';
import { Pill, STEP_STATUS } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { useAction } from '@/hooks/useResource';
import { integrationsApi } from '@/lib/api/endpoints';
import { fmtNumber, fmtRelative } from '@/lib/format';
import type { IntegrationService, IntegrationStep, StepRunStatus } from '@/types/crm';
import { humanizeKey } from '@/app/(app)/pipeline-runs/_components/runFormat';

const KEY_LABELS: Record<string, string> = {
  apollo: 'Apollo',
  anthropic: 'Claude (Anthropic)',
  brightdata: 'Bright Data',
  bouncer: 'Bouncer',
  s3: 'File storage (S3)',
};

const Ok = ({
  ok,
  yes = 'Yes',
  no = 'No',
}: {
  ok: boolean | null | undefined;
  yes?: string;
  no?: string;
}) =>
  ok ? (
    <span className="inline-flex items-center gap-1 text-success">
      <CheckCircle2 className="size-3.5" /> {yes}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <XCircle className="size-3.5" /> {no}
    </span>
  );

function StepRow({ step }: { step: IntegrationStep }) {
  const [limit, setLimit] = useState(step.userClientLimit?.toString() ?? '');
  const [days, setDays] = useState(step.rerunAfterDays?.toString() ?? '');
  const save = useAction(
    (body: Parameters<typeof integrationsApi.updateStep>[1]) =>
      integrationsApi.updateStep(step.id, body),
    {
      success: 'Step saved',
      invalidate: [['integrations'], ['step-runs']],
    }
  );
  const commitLimit = () => {
    const v = limit.trim() === '' ? null : Number(limit);
    if (v !== null && (!Number.isInteger(v) || v < 1))
      return toast.error('Limit must be a whole number, or blank for no limit');
    if (v !== step.userClientLimit) save.mutate({ userClientLimit: v });
  };
  const commitDays = () => {
    const v = days.trim() === '' ? null : Number(days);
    if (v !== null && (!Number.isInteger(v) || v < 1))
      return toast.error('Days must be a whole number, or blank to always allow');
    if (v !== step.rerunAfterDays) save.mutate({ rerunAfterDays: v });
  };
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{step.label}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{step.key}</p>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Clients per user
        <Input
          value={limit}
          onChange={e => setLimit(e.target.value)}
          onBlur={commitLimit}
          onKeyDown={e => e.key === 'Enter' && commitLimit()}
          placeholder="No limit"
          inputMode="numeric"
          className="h-8 w-24"
          disabled={step.key === 'run_all'}
        />
      </label>
      <label
        className="flex items-center gap-2 text-xs text-muted-foreground"
        title="Once done for a client, the step is not run again for this many days unless something new came in. Admins may still run it again."
      >
        Re-run after (days)
        <Input
          value={days}
          onChange={e => setDays(e.target.value)}
          onBlur={commitDays}
          onKeyDown={e => e.key === 'Enter' && commitDays()}
          placeholder="Any time"
          inputMode="numeric"
          className="h-8 w-24"
          disabled={step.key === 'run_all'}
        />
      </label>
      <Switch
        checked={step.isActive}
        onCheckedChange={isActive => save.mutate({ isActive })}
        aria-label={`${step.label} on / off`}
      />
    </li>
  );
}

function ServicePanel({
  svc,
  last24h,
}: {
  svc: IntegrationService;
  last24h: Partial<Record<StepRunStatus, number>>;
}) {
  const confirm = useConfirm();
  const [newKey, setNewKey] = useState<string | null>(null);
  const health = useQuery({
    queryKey: ['integrations', svc.id, 'health'],
    queryFn: () => integrationsApi.health(svc.id),
    refetchInterval: 30_000,
  });
  const test = useAction(
    ({ provider }: { provider: string }) => integrationsApi.testKey(svc.id, provider),
    {
      onSuccess: (r, v) =>
        r.ok
          ? toast.success(`${KEY_LABELS[v.provider]} key works`)
          : toast.error(r.detail ?? 'Key test failed'),
    }
  );
  const rotate = useAction(() => integrationsApi.rotateKey(svc.id), {
    invalidate: [['integrations']],
    onSuccess: r => setNewKey(r.key),
  });
  const toggle = useAction(
    (isActive: boolean) => integrationsApi.updateService(svc.id, { isActive }),
    {
      success: 'Service saved',
      invalidate: [['integrations'], ['step-runs']],
    }
  );

  const e = health.data?.engine;
  return (
    <div className="space-y-4">
      <Panel
        title={svc.name}
        description={svc.baseUrl ?? 'No address set'}
        actions={
          <>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => health.refetch()}
              disabled={health.isFetching}
            >
              <RefreshCw className={health.isFetching ? 'animate-spin' : undefined} /> Check now
            </Button>
            <Switch
              checked={svc.isActive}
              onCheckedChange={v => toggle.mutate(v)}
              aria-label="Service on / off"
            />
          </>
        }
      >
        {health.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {health.data?.ok ? (
                <Pill tone="success">Online</Pill>
              ) : health.data?.reachable ? (
                <Pill tone="warning">Reachable, worker offline</Pill>
              ) : (
                <Pill tone="danger">Not reachable</Pill>
              )}
              {health.data?.error && (
                <span className="text-xs text-muted-foreground">{health.data.error}</span>
              )}
              {e?.crmMode === false && (
                <Pill tone="warning">Old pages still open (CRM_MODE off)</Pill>
              )}
            </div>
            <DetailList
              columns={3}
              items={[
                {
                  label: 'Worker',
                  value: e && <Ok ok={e.worker.online} yes="Online" no="Offline" />,
                },
                { label: 'Jobs waiting', value: e && fmtNumber(e.queued) },
                { label: 'Version', value: e?.version },
                {
                  label: 'CRM → pipeline key',
                  value: (
                    <Ok
                      ok={svc.outboundKeySet}
                      yes={`Set (${svc.outboundKeyEnv})`}
                      no={`Missing env ${svc.outboundKeyEnv ?? ''}`}
                    />
                  ),
                },
                {
                  label: 'Pipeline → CRM key',
                  value: (
                    <Ok
                      ok={svc.inboundKeySet && e?.callbackKeySet !== false}
                      yes="Set"
                      no="Missing"
                    />
                  ),
                },
                {
                  label: 'File storage',
                  value: e && (
                    <Ok ok={e.s3} yes="Set up" no="Not set — reports stay on the pipeline" />
                  ),
                },
                {
                  label: 'Last health check',
                  value: svc.lastHealthAt && fmtRelative(svc.lastHealthAt),
                },
                { label: 'Last callback', value: svc.lastUsedAt && fmtRelative(svc.lastUsedAt) },
                { label: 'Timeout', value: `${svc.timeoutMins} min` },
              ]}
            />
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="API keys"
          description="Keys are kept on the pipeline server (.env), never in the CRM."
        >
          {e ? (
            <ul className="divide-y">
              {Object.entries(KEY_LABELS).map(([k, label]) => (
                <li key={k} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span>{label}</span>
                  <span className="flex items-center gap-3">
                    <Ok ok={e.keys[k]} yes="Set" no="Not set" />
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={!e.keys[k] || (test.isPending && test.variables?.provider === k)}
                      onClick={() => test.mutate({ provider: k })}
                    >
                      {test.isPending && test.variables?.provider === k ? 'Testing…' : 'Test'}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={Cable} title="Pipeline not reachable" />
          )}
        </Panel>

        <Panel title="Credit limits" description="Set on the pipeline; shown here for reference.">
          {e ? (
            <DetailList
              items={Object.entries(e.limits).map(([k, v]) => ({
                label: humanizeKey(k),
                value: v ?? 'Default',
              }))}
            />
          ) : (
            <EmptyState compact icon={Cable} title="Pipeline not reachable" />
          )}
        </Panel>
      </div>

      <Panel
        title="Steps"
        description="Switch a step off to hide its Run button. Limits cap how many clients one user can run a step for (super admins are exempt)."
      >
        <ul className="-m-4 divide-y">
          {svc.steps.map(s => (
            <StepRow key={s.id} step={s} />
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Runs in the last 24 hours">
          {Object.keys(last24h).length ? (
            <ul className="flex flex-wrap gap-2">
              {Object.entries(last24h).map(([k, n]) => (
                <li key={k} className="inline-flex items-center gap-2">
                  <Pill tone={STEP_STATUS[k as StepRunStatus]?.tone}>
                    {STEP_STATUS[k as StepRunStatus]?.label ?? k}
                  </Pill>
                  <span className="text-sm font-medium tabular">{fmtNumber(n ?? 0)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          )}
        </Panel>
        <Panel
          title="Callback key"
          description="The key the pipeline sends with progress and results."
        >
          <Button
            size="sm"
            variant="outline"
            disabled={rotate.isPending}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Create a new callback key?',
                  description:
                    'The old key stops working at once. Results from running jobs are refused until the pipeline has the new key.',
                  confirmLabel: 'Create new key',
                  destructive: true,
                })
              )
                rotate.mutate(undefined);
            }}
          >
            <KeyRound /> Rotate key
          </Button>
        </Panel>
      </div>

      <Dialog open={!!newKey} onOpenChange={o => !o && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New callback key</DialogTitle>
            <DialogDescription>
              Put it in the pipeline’s .env as <code className="font-mono">CRM_CALLBACK_KEY</code>{' '}
              and restart it. It is not shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              readOnly
              value={newKey ?? ''}
              className="font-mono text-xs"
              onFocus={e => e.target.select()}
            />
            <Button
              size="icon"
              variant="outline"
              aria-label="Copy key"
              onClick={() =>
                newKey && navigator.clipboard.writeText(newKey).then(() => toast.success('Copied'))
              }
            >
              <Copy />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntegrationsPage() {
  const q = useQuery({ queryKey: ['integrations'], queryFn: integrationsApi.list });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        description="The CSR pipeline does the research; the CRM keeps every result and decides what is saved."
      />
      {q.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.services.length ? (
        q.data.services.map(s => <ServicePanel key={s.id} svc={s} last24h={q.data.last24h} />)
      ) : (
        <EmptyState
          icon={Cable}
          title="No pipeline connected"
          description="Run npm run seed:pipeline in crm-core-service to register the CSR pipeline."
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="integrations.manage">
      <IntegrationsPage />
    </RequirePermission>
  );
}

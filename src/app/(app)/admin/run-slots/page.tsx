// File: page.tsx
// Path: src/app/(app)/admin/run-slots/page.tsx
//
// Admin → Run slots: how many pipeline runs people may start per day / week /
// month. A rule is for one step or all steps together, and for everyone, a
// role or one person — for the same step + period the most specific wins.
// Enforced by the backend (runRules.service); super admins have no slots.

'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gauge, Info, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { Pill } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { Field } from '@/components/forms/fields';
import { Combobox } from '@/components/pickers/Combobox';
import { RolePicker, UserPicker } from '@/components/pickers/pickers';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { useAction } from '@/hooks/useResource';
import { pipelineApi, runQuotasApi } from '@/lib/api/endpoints';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { QuotaPeriod, RunQuota } from '@/types/crm';

const PERIODS: { value: QuotaPeriod; label: string; per: string }[] = [
  { value: 'DAY', label: 'Per day', per: 'a day' },
  { value: 'WEEK', label: 'Per week', per: 'a week' },
  { value: 'MONTH', label: 'Per month', per: 'a month' },
];
const PER = Object.fromEntries(PERIODS.map(p => [p.value, p.per])) as Record<QuotaPeriod, string>;

type Who = 'everyone' | 'role' | 'user';
const WHO: { value: Who; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'role', label: 'A role' },
  { value: 'user', label: 'One person' },
];

const ALL_STEPS = '__all';

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-lg border bg-surface p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground',
            value === o.value && 'bg-card font-medium text-foreground shadow-card'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AddRule({ steps }: { steps: { id: string; label: string }[] }) {
  const [who, setWho] = useState<Who>('everyone');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [stepId, setStepId] = useState<string>(ALL_STEPS);
  const [period, setPeriod] = useState<QuotaPeriod>('WEEK');
  const [max, setMax] = useState('4');

  const add = useAction(runQuotasApi.create, {
    success: 'Rule added',
    invalidate: [['run-quotas'], ['step-runs']],
    onSuccess: () => setMax('4'),
  });

  const stepOptions = useMemo(
    () => [
      { value: ALL_STEPS, label: 'All steps together' },
      ...steps.map(s => ({ value: s.id, label: s.label })),
    ],
    [steps]
  );

  const submit = () => {
    const n = Number(max);
    if (!Number.isInteger(n) || n < 0)
      return toast.error('Runs must be a whole number (0 switches the step off)');
    if (who === 'role' && !roleId) return toast.error('Pick a role');
    if (who === 'user' && !userId) return toast.error('Pick a person');
    add.mutate({
      stepId: stepId === ALL_STEPS ? null : stepId,
      roleId: who === 'role' ? roleId : null,
      userId: who === 'user' ? userId : null,
      period,
      maxRuns: n,
    });
  };

  return (
    <Panel
      title="Add a rule"
      description="Example: everyone may run Apollo 4 times a week; Managers 10."
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[auto_1fr_1fr_auto_auto_auto] lg:items-end">
        <Field label="For">
          <Segmented value={who} onChange={setWho} options={WHO} />
        </Field>
        <Field label={who === 'role' ? 'Role' : who === 'user' ? 'Person' : ' '}>
          {who === 'role' ? (
            <RolePicker value={roleId} onChange={setRoleId} placeholder="Pick a role" />
          ) : who === 'user' ? (
            <UserPicker value={userId} onChange={setUserId} placeholder="Search a person" />
          ) : (
            <p className="flex h-8 items-center text-[13px] text-muted-foreground">
              Every user except super admins
            </p>
          )}
        </Field>
        <Field label="Step">
          <Combobox
            value={stepId}
            onChange={v => setStepId(v ?? ALL_STEPS)}
            options={stepOptions}
          />
        </Field>
        <Field label="Period">
          <Segmented
            value={period}
            onChange={setPeriod}
            options={PERIODS.map(p => ({ value: p.value, label: p.label.replace('Per d', 'D').replace('Per w', 'W').replace('Per m', 'M') }))}
          />
        </Field>
        <Field label="Runs">
          <Input
            value={max}
            onChange={e => setMax(e.target.value)}
            inputMode="numeric"
            className="h-8 w-20"
          />
        </Field>
        <Button onClick={submit} disabled={add.isPending}>
          <Plus /> Add
        </Button>
      </div>
    </Panel>
  );
}

function RuleRow({ r }: { r: RunQuota }) {
  const confirm = useConfirm();
  const [max, setMax] = useState(String(r.maxRuns));
  const update = useAction(
    (body: Parameters<typeof runQuotasApi.update>[1]) => runQuotasApi.update(r.id, body),
    {
      success: 'Rule saved',
      invalidate: [['run-quotas'], ['step-runs']],
    }
  );
  const remove = useAction(() => runQuotasApi.remove(r.id), {
    success: 'Rule removed',
    invalidate: [['run-quotas'], ['step-runs']],
  });
  const commit = () => {
    const n = Number(max);
    if (!Number.isInteger(n) || n < 0) {
      setMax(String(r.maxRuns));
      return toast.error('Runs must be a whole number');
    }
    if (n !== r.maxRuns) update.mutate({ maxRuns: n });
  };

  return (
    <li className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !r.isActive && 'opacity-60')}>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
          {r.user ? fullName(r.user) : r.role ? r.role.name : 'Everyone'}
          <Pill dot={false} tone={r.user ? 'info' : r.role ? 'neutral' : 'success'}>
            {r.user ? 'Person' : r.role ? 'Role' : 'Everyone'}
          </Pill>
        </p>
        <p className="text-xs text-muted-foreground">
          {r.step ? r.step.label : 'All steps together (each run a person starts counts once)'}
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Input
          value={max}
          onChange={e => setMax(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          inputMode="numeric"
          className="h-8 w-16"
          aria-label="Runs"
        />
        runs {PER[r.period]}
      </label>
      <Switch
        checked={r.isActive}
        onCheckedChange={isActive => update.mutate({ isActive })}
        aria-label="Rule on / off"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Remove rule"
        onClick={async () => {
          if (
            await confirm({ title: 'Remove this rule?', destructive: true, confirmLabel: 'Remove' })
          )
            remove.mutate(undefined);
        }}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

function RunSlotsPage() {
  const rules = useQuery({ queryKey: ['run-quotas'], queryFn: runQuotasApi.list });
  const steps = useQuery({ queryKey: ['pipeline-steps'], queryFn: pipelineApi.steps });
  const stepList = (steps.data ?? []).map(s => ({ id: s.id, label: s.label }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Run slots"
        description="How many pipeline runs people may start — per day, week or month."
      />

      <div className="flex gap-2.5 rounded-xl border bg-card px-4 py-3 text-[13px] shadow-card">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          <li>
            For the same step and period, the{' '}
            <span className="font-medium text-foreground">most specific</span> rule wins: a person’s
            own rule, then their role’s, then the one for everyone.
          </li>
          <li>
            Runs that failed, found nothing or were skipped don’t use a slot. Slots reset at
            midnight, on Monday, and on the 1st (India time).
          </li>
          <li>
            <span className="font-medium text-foreground">Super admins</span> have no slots. To free
            someone else, give their role “Pipeline steps → No run-slot limit”.
          </li>
          <li>
            Separate from slots: a step already done for a client is not run again until its re-run
            date (Admin → Integrations) unless something new came in.
          </li>
        </ul>
      </div>

      <AddRule steps={stepList.filter(s => s.label)} />

      <Panel title="Rules" description={rules.data ? `${rules.data.length} rule(s)` : undefined}>
        {rules.isLoading ? (
          <Skeleton className="m-4 h-24" />
        ) : rules.error ? (
          <ErrorState error={rules.error} onRetry={() => rules.refetch()} />
        ) : !rules.data?.length ? (
          <EmptyState
            icon={Gauge}
            title="No run slots yet"
            description="Everyone can run steps as often as they like (re-run dates still apply)."
          />
        ) : (
          <ul className="divide-y">
            {rules.data.map(r => (
              <RuleRow key={`${r.id}:${r.maxRuns}`} r={r} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="run_slots.manage">
      <RunSlotsPage />
    </RequirePermission>
  );
}

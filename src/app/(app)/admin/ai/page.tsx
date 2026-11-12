// File: page.tsx
// Path: src/app/(app)/admin/ai/page.tsx
//
// Admin → AI assistant: system status, which modes are on, the monthly ₹
// budget, per-day quotas (default / role / person), model pricing and the
// learned command templates. The assistant itself is read-only for everyone.

'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Plus, Save, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { Pill, type Tone } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { Field } from '@/components/forms/fields';
import { UserPicker } from '@/components/pickers/pickers';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { aiApi } from '@/lib/api/endpoints';
import { fmtDate, fmtInr, fmtNumber, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  AiCommandTemplate,
  AiPricing,
  AiQuotaOverride,
  AiQuotaPeriod,
  AiSettings,
  AiUsageMode,
} from '@/types/ai';

const SETTINGS_KEY = ['ai', 'settings'];
const TEMPLATES_KEY = ['ai', 'command-templates'];
const ME_KEY = ['ai', 'me'];

const MODES: { value: AiUsageMode; label: string }[] = [
  { value: 'COMMAND', label: 'Command' },
  { value: 'CANVAS', label: 'Canvas' },
  { value: 'EXPORT', label: 'Export' },
];
const PERIODS: { value: AiQuotaPeriod; label: string }[] = [
  { value: 'DAY', label: 'Day' },
  { value: 'WEEK', label: 'Week' },
  { value: 'MONTH', label: 'Month' },
];
const PER: Record<AiQuotaPeriod, string> = { DAY: 'a day', WEEK: 'a week', MONTH: 'a month' };
const MODE_LABEL = Object.fromEntries(MODES.map(m => [m.value, m.label])) as Record<
  AiUsageMode,
  string
>;

/** '' → null (unlimited); whole number ≥ 0 → number; anything else → undefined (invalid) */
const parseLimit = (v: string): number | null | undefined => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

// ── a. system status ─────────────────────────────────────────────────────────

function SystemStatus({ system }: { system: AiSettings['system'] }) {
  const issues: { title: string; body: string; tone: 'danger' | 'warning' }[] = [];
  if (system.killSwitch)
    issues.push({
      title: 'AI is switched off on the server',
      body: 'AI_ENABLED=false — nobody can use the assistant until it is turned back on.',
      tone: 'danger',
    });
  if (!system.llmReady)
    issues.push({
      title: 'No AI model key on the server',
      body: 'ANTHROPIC_API_KEY is not set. Only learned / common commands work.',
      tone: 'warning',
    });
  if (!system.readOnlyRole)
    issues.push({
      title: 'Database read-only wall is missing',
      body: 'DATABASE_URL_AI_READONLY is not set. Required before production.',
      tone: 'danger',
    });

  return (
    <Panel title="System status" description="Set on the server — not editable here.">
      {issues.length === 0 ? (
        <p className="flex items-center gap-2 text-[14px]">
          <CheckCircle2 className="size-4 text-success" /> All set: AI on, model key present,
          read-only database user in place.
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.map(i => (
            <li
              key={i.title}
              className={cn(
                'flex gap-2 rounded-lg border px-3 py-2 text-[14px]',
                i.tone === 'danger'
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-warning/40 bg-warning/10'
              )}
            >
              <AlertTriangle
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  i.tone === 'danger' ? 'text-destructive' : 'text-warning'
                )}
              />
              <div>
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ── b. modes ─────────────────────────────────────────────────────────────────

function Modes({ setting }: { setting: AiSettings['setting'] }) {
  const update = useAction(aiApi.updateSettings, {
    success: 'Saved',
    invalidate: [SETTINGS_KEY, ME_KEY],
  });
  const pending = update.isPending ? update.variables : undefined;
  const rows = [
    {
      key: 'commandEnabled' as const,
      label: 'Command mode',
      hint: 'Ctrl/⌘+J bar that opens pages and filters.',
    },
    {
      key: 'canvasEnabled' as const,
      label: 'AI Canvas (beta)',
      hint: 'Builds read-only reports from questions.',
    },
  ];
  return (
    <Panel
      title="Modes"
      description="Who may use each mode is set per role (AI assistant permissions)."
    >
      <ul className="divide-y">
        {rows.map(r => (
          <li
            key={r.key}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <div>
              <p className="text-[14px] font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.hint}</p>
            </div>
            <Switch
              checked={pending?.[r.key] ?? setting[r.key]}
              disabled={update.isPending}
              onCheckedChange={v => update.mutate({ [r.key]: v })}
              aria-label={r.label}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ── c. budget ────────────────────────────────────────────────────────────────

function Budget({
  setting,
  budget,
}: {
  setting: AiSettings['setting'];
  budget: AiSettings['budget'];
}) {
  const [amount, setAmount] = useState(String(setting.monthlyBudgetInr));
  const [thresholds, setThresholds] = useState(setting.alertThresholds.join(', '));
  const update = useAction(aiApi.updateSettings, {
    success: 'Budget saved',
    invalidate: [SETTINGS_KEY, ME_KEY],
  });

  const save = () => {
    const n = Number(amount.replace(/[,\s₹]/g, ''));
    if (!Number.isFinite(n) || n < 0) return toast.error('Budget must be a positive amount in ₹');
    const list = thresholds
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number);
    if (list.some(t => !Number.isInteger(t) || t < 1 || t > 100))
      return toast.error('Alert thresholds are whole percentages between 1 and 100');
    update.mutate({
      monthlyBudgetInr: n,
      alertThresholds: [...new Set(list)].sort((a, b) => a - b),
    });
  };

  const pct = Math.min(100, Math.max(0, budget.usedPct));
  const parsed = Number(amount.replace(/[,\s₹]/g, ''));

  return (
    <Panel title="Budget" description="Monthly AI spend for the whole workspace, in ₹.">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
            <span>
              <span className="font-semibold">{fmtInr(budget.spentInr)}</span>{' '}
              <span className="text-muted-foreground">
                spent of {fmtInr(budget.budgetInr)} this month
              </span>
            </span>
            <Pill tone={budget.exhausted ? 'danger' : pct >= 80 ? 'warning' : 'success'}>
              {Math.round(budget.usedPct)}%
            </Pill>
          </div>
          <Progress
            value={pct}
            className={cn(
              'h-2',
              budget.exhausted && '[&_[data-slot=progress-indicator]]:bg-destructive',
              !budget.exhausted && pct >= 80 && '[&_[data-slot=progress-indicator]]:bg-warning'
            )}
          />
          <p className="text-xs text-muted-foreground">
            At 100% the AI model is blocked until the 1st; only learned / common commands keep
            working.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field
            label="Monthly budget (₹)"
            hint={Number.isFinite(parsed) && amount.trim() ? fmtInr(parsed) : undefined}
          >
            <Input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              inputMode="decimal"
              className="h-8"
            />
          </Field>
          <Field label="Alert at (% used)" hint="Comma list, e.g. 50, 80, 100">
            <Input
              value={thresholds}
              onChange={e => setThresholds(e.target.value)}
              className="h-8"
            />
          </Field>
          <Button onClick={save} disabled={update.isPending} className="sm:mb-5">
            <Save /> Save
          </Button>
        </div>
      </div>
    </Panel>
  );
}

// ── d. quotas ────────────────────────────────────────────────────────────────

const QUOTA_MODES: AiUsageMode[] = ['COMMAND', 'CANVAS', 'EXPORT'];
const cellKey = (roleId: string | null, mode: AiUsageMode) => `${roleId ?? 'default'}:${mode}`;

function Quotas({ data }: { data: AiSettings }) {
  // what each cell shows initially: the active DAY policy, else (default row) the built-in default
  const initial = useMemo(() => {
    const m: Record<string, string> = {};
    for (const mode of QUOTA_MODES) {
      const builtIn = data.defaults.quotas.find(q => q.mode === mode && q.period === 'DAY');
      m[cellKey(null, mode)] = builtIn?.maxCount == null ? '' : String(builtIn.maxCount);
    }
    for (const p of data.policies) {
      if (!p.isActive || p.period !== 'DAY') continue;
      m[cellKey(p.roleId, p.mode)] = p.maxCount == null ? '' : String(p.maxCount);
    }
    return m;
  }, [data]);
  const hasPolicy = useMemo(
    () =>
      new Set(
        data.policies
          .filter(p => p.isActive && p.period === 'DAY')
          .map(p => cellKey(p.roleId, p.mode))
      ),
    [data.policies]
  );

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [reset, setReset] = useState<Set<string>>(new Set());

  const save = useAction(aiApi.upsertQuotas, {
    success: 'Quotas saved',
    invalidate: [SETTINGS_KEY, ME_KEY],
    onSuccess: () => setReset(new Set()),
  });

  const rows = [{ id: null as string | null, name: 'Default (all roles)' }, ...data.roles];

  const onSave = () => {
    const policies: Parameters<typeof aiApi.upsertQuotas>[0] = [];
    for (const r of rows) {
      for (const mode of QUOTA_MODES) {
        const k = cellKey(r.id, mode);
        if (reset.has(k)) {
          policies.push({ roleId: r.id, mode, period: 'DAY', maxCount: null, isActive: false });
          continue;
        }
        const v = values[k] ?? '';
        if (v === (initial[k] ?? '')) continue; // unchanged
        // a role cell without its own limit that is still empty keeps following the default
        if (r.id !== null && !hasPolicy.has(k) && !v.trim()) continue;
        const n = parseLimit(v);
        if (n === undefined) {
          toast.error(
            `${r.name} · ${MODE_LABEL[mode]}: use a whole number, or leave empty for unlimited`
          );
          return;
        }
        policies.push({ roleId: r.id, mode, period: 'DAY', maxCount: n, isActive: true });
      }
    }
    if (!policies.length) return toast.info('Nothing changed');
    save.mutate(policies);
  };

  const resetRole = (roleId: string) =>
    setReset(prev => {
      const next = new Set(prev);
      QUOTA_MODES.forEach(m => {
        const k = cellKey(roleId, m);
        if (hasPolicy.has(k)) next.add(k);
      });
      return next;
    });

  return (
    <Panel
      title="Quotas (per day)"
      description="Order: a person’s override → their role → default. Super Admin is not exempt."
      actions={
        <Button size="sm" onClick={onSave} disabled={save.isPending}>
          <Save /> Save quotas
        </Button>
      }
      bodyClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Who</TableHead>
            {QUOTA_MODES.map(m => (
              <TableHead key={m}>{MODE_LABEL[m]}</TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => {
            const roleHasPolicy =
              r.id !== null && QUOTA_MODES.some(m => hasPolicy.has(cellKey(r.id, m)));
            return (
              <TableRow key={r.id ?? 'default'}>
                <TableCell className={cn('pl-4 font-medium', r.id === null && 'text-primary')}>
                  {r.name}
                </TableCell>
                {QUOTA_MODES.map(m => {
                  const k = cellKey(r.id, m);
                  const isReset = reset.has(k);
                  const inherits = r.id !== null && (!hasPolicy.has(k) || isReset);
                  return (
                    <TableCell key={m}>
                      <Input
                        value={isReset ? '' : (values[k] ?? '')}
                        onChange={e => {
                          setValues(v => ({ ...v, [k]: e.target.value }));
                          if (isReset)
                            setReset(prev => {
                              const next = new Set(prev);
                              next.delete(k);
                              return next;
                            });
                        }}
                        placeholder={inherits ? 'Default' : 'Unlimited'}
                        inputMode="numeric"
                        className="h-8 w-28"
                        aria-label={`${r.name} ${MODE_LABEL[m]} per day`}
                      />
                    </TableCell>
                  );
                })}
                <TableCell>
                  {roleHasPolicy && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Back to default (on save)"
                      aria-label={`Reset ${r.name} to default`}
                      onClick={() => resetRole(r.id!)}
                    >
                      <Undo2 />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        Empty = unlimited (0 blocks). A role cell showing “Default” follows the default row; typing
        a number gives the role its own limit; ↺ sends the role back to the default.
      </p>
    </Panel>
  );
}

// ── e. user overrides ────────────────────────────────────────────────────────

function OverrideRow({ o }: { o: AiQuotaOverride }) {
  const confirm = useConfirm();
  const remove = useAction(() => aiApi.deleteOverride(o.id), {
    success: 'Override removed',
    invalidate: [SETTINGS_KEY, ME_KEY],
  });
  return (
    <TableRow>
      <TableCell className="pl-4">
        <p className="font-medium">{o.user ? fullName(o.user) : 'Unknown user'}</p>
        {o.user && <p className="text-xs text-muted-foreground">{o.user.email}</p>}
      </TableCell>
      <TableCell>{MODE_LABEL[o.mode]}</TableCell>
      <TableCell>
        {o.maxCount == null ? 'Unlimited' : `${fmtNumber(o.maxCount)} ${PER[o.period]}`}
      </TableCell>
      <TableCell className="max-w-64 truncate text-muted-foreground" title={o.reason ?? undefined}>
        {o.reason || '—'}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remove override"
          disabled={remove.isPending}
          onClick={async () => {
            if (
              await confirm({
                title: 'Remove this override?',
                destructive: true,
                confirmLabel: 'Remove',
              })
            )
              remove.mutate(undefined);
          }}
        >
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function Overrides({ overrides }: { overrides: AiQuotaOverride[] }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiUsageMode>('COMMAND');
  const [period, setPeriod] = useState<AiQuotaPeriod>('DAY');
  const [limit, setLimit] = useState('');
  const [reason, setReason] = useState('');

  const add = useAction(aiApi.upsertOverride, {
    success: 'Override saved',
    invalidate: [SETTINGS_KEY, ME_KEY],
    onSuccess: () => {
      setLimit('');
      setReason('');
    },
  });

  const submit = () => {
    if (!userId) return toast.error('Pick a person');
    const n = parseLimit(limit);
    if (n === undefined) return toast.error('Limit must be a whole number, or empty for unlimited');
    add.mutate({
      userId,
      mode,
      period,
      maxCount: n,
      ...(reason.trim() && { reason: reason.trim() }),
    });
  };

  return (
    <Panel
      title="Person overrides"
      description="Beats the role and default limits for one person."
      bodyClassName="p-0"
    >
      <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(200px,1fr)_auto_auto_auto_minmax(160px,1fr)_auto] lg:items-end">
        <Field label="Person">
          <UserPicker value={userId} onChange={setUserId} placeholder="Search a person" />
        </Field>
        <Field label="Mode">
          <Segmented value={mode} onChange={setMode} options={MODES} />
        </Field>
        <Field label="Per">
          <Segmented value={period} onChange={setPeriod} options={PERIODS} />
        </Field>
        <Field label="Limit">
          <Input
            value={limit}
            onChange={e => setLimit(e.target.value)}
            placeholder="Unlimited"
            inputMode="numeric"
            className="h-8 w-24"
          />
        </Field>
        <Field label="Reason">
          <Input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Optional"
            className="h-8"
          />
        </Field>
        <Button onClick={submit} disabled={add.isPending}>
          <Plus /> Add
        </Button>
      </div>
      {overrides.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted-foreground">
          No overrides — everyone follows their role.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Person</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Limit</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {overrides.map(o => (
              <OverrideRow key={o.id} o={o} />
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

// ── f. pricing ───────────────────────────────────────────────────────────────

const PRICE_FIELDS = [
  { key: 'inputPerMTokUsd', label: 'Input $' },
  { key: 'outputPerMTokUsd', label: 'Output $' },
  { key: 'cacheReadPerMTokUsd', label: 'Cache read $' },
  { key: 'cacheWritePerMTokUsd', label: 'Cache write $' },
  { key: 'usdToInr', label: 'USD → ₹' },
] as const;
type PriceKey = (typeof PRICE_FIELDS)[number]['key'];

function Pricing({ pricing, defaultModel }: { pricing: AiPricing[]; defaultModel: string }) {
  const { isSuperAdmin } = usePermissions();
  const [model, setModel] = useState(defaultModel);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [prices, setPrices] = useState<Record<PriceKey, string>>(() => {
    const latest = pricing.find(p => p.isActive);
    return Object.fromEntries(
      PRICE_FIELDS.map(f => [f.key, latest ? String(latest[f.key]) : ''])
    ) as Record<PriceKey, string>;
  });

  const add = useAction(aiApi.addPricing, { success: 'Price added', invalidate: [SETTINGS_KEY] });

  const submit = () => {
    if (!model.trim()) return toast.error('Model is required');
    const nums = {} as Record<PriceKey, number>;
    for (const f of PRICE_FIELDS) {
      const n = Number(prices[f.key]);
      if (!prices[f.key].trim() || !Number.isFinite(n) || n < 0)
        return toast.error(`${f.label}: enter a number`);
      nums[f.key] = n;
    }
    add.mutate({
      provider: 'anthropic',
      model: model.trim(),
      ...nums,
      ...(effectiveFrom && { effectiveFrom: new Date(effectiveFrom).toISOString() }),
    });
  };

  const sorted = [...pricing].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  return (
    <Panel
      title="Pricing"
      description="$ per million tokens. Verify against Anthropic’s pricing page; a new row never changes old costs."
      bodyClassName="p-0"
    >
      {sorted.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted-foreground">
          No prices yet — costs can’t be worked out.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Model</TableHead>
              {PRICE_FIELDS.map(f => (
                <TableHead key={f.key} className="text-right">
                  {f.label}
                </TableHead>
              ))}
              <TableHead>From</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(p => (
              <TableRow key={p.id} className={cn(!p.isActive && 'opacity-60')}>
                <TableCell className="pl-4 font-medium">
                  {p.model}
                  <span className="ml-1.5 text-xs text-muted-foreground">{p.provider}</span>
                </TableCell>
                {PRICE_FIELDS.map(f => (
                  <TableCell key={f.key} className="text-right tabular-nums">
                    {p[f.key]}
                  </TableCell>
                ))}
                <TableCell>{fmtDate(p.effectiveFrom)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="space-y-2 border-t p-4">
        <p className="text-sm font-medium">Add price</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-[minmax(180px,1.5fr)_repeat(5,minmax(80px,1fr))_auto_auto] xl:items-end">
          <Field label="Model" className="col-span-2 md:col-span-1">
            <Input value={model} onChange={e => setModel(e.target.value)} className="h-8" />
          </Field>
          {PRICE_FIELDS.map(f => (
            <Field key={f.key} label={f.label}>
              <Input
                value={prices[f.key]}
                onChange={e => setPrices(p => ({ ...p, [f.key]: e.target.value }))}
                inputMode="decimal"
                className="h-8"
              />
            </Field>
          ))}
          <Field label="Effective from">
            <Input
              type="date"
              value={effectiveFrom}
              onChange={e => setEffectiveFrom(e.target.value)}
              className="h-8"
            />
          </Field>
          <Button onClick={submit} disabled={add.isPending || !isSuperAdmin}>
            <Plus /> Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isSuperAdmin ? 'Empty date = from now.' : 'Only a super admin can add prices.'}
        </p>
      </div>
    </Panel>
  );
}

// ── g. learned command templates ─────────────────────────────────────────────

const SOURCE_TONE: Record<AiCommandTemplate['source'], Tone> = {
  seed: 'neutral',
  llm: 'violet',
  manual: 'info',
};

function TemplateSwitch({ t }: { t: AiCommandTemplate }) {
  const set = useAction((isActive: boolean) => aiApi.setCommandTemplate(t.id, isActive), {
    success: (_r, v) => (v ? 'Template on' : 'Template off'),
    invalidate: [TEMPLATES_KEY],
  });
  return (
    <Switch
      checked={set.isPending && set.variables !== undefined ? set.variables : t.isActive}
      disabled={set.isPending}
      onCheckedChange={v => set.mutate(v)}
      aria-label="Template on / off"
    />
  );
}

function Templates() {
  const q = useQuery({ queryKey: TEMPLATES_KEY, queryFn: aiApi.commandTemplates });
  const list = [...(q.data ?? [])].sort((a, b) => b.hitCount - a.hitCount);
  return (
    <Panel
      title="Learned commands"
      description="Common phrasings answered for free, without the AI model. Names are masked as {placeholders}."
      bodyClassName="p-0"
    >
      {q.isLoading ? (
        <Skeleton className="m-4 h-24" />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing learned yet"
          description="Templates appear as people use Command mode."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Template</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Hits</TableHead>
              <TableHead className="pr-4 text-right">On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(t => (
              <TableRow key={t.id} className={cn(!t.isActive && 'opacity-60')}>
                <TableCell
                  className="max-w-md truncate pl-4 font-mono text-[13px]"
                  title={t.template}
                >
                  {t.template}
                </TableCell>
                <TableCell className="text-muted-foreground">{t.action}</TableCell>
                <TableCell>
                  <Pill dot={false} tone={SOURCE_TONE[t.source]}>
                    {t.source}
                  </Pill>
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(t.hitCount)}</TableCell>
                <TableCell className="pr-4 text-right">
                  <TemplateSwitch t={t} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

function AiSettingsPage() {
  const q = useQuery({ queryKey: SETTINGS_KEY, queryFn: aiApi.settings });
  const d = q.data;

  return (
    <div className="space-y-3">
      <PageHeader
        title="AI assistant"
        description="Modes, budget, quotas and pricing for the read-only AI assistant."
      />
      <p className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-[14px] text-muted-foreground shadow-card">
        <Sparkles className="size-4 shrink-0 text-primary" />
        The assistant is read-only for every role: it opens pages, filters and reports — it can’t
        change data.
      </p>

      {q.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : q.error || !d ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <SystemStatus system={d.system} />
          <div className="grid gap-3 lg:grid-cols-2">
            <Modes setting={d.setting} />
            <Budget
              key={`${d.setting.monthlyBudgetInr}:${d.setting.alertThresholds.join(',')}`}
              setting={d.setting}
              budget={d.budget}
            />
          </div>
          <Quotas key={JSON.stringify(d.policies)} data={d} />
          <Overrides overrides={d.overrides} />
          <Pricing key={d.pricing.length} pricing={d.pricing} defaultModel={d.defaults.model} />
          <Templates />
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="ai_assistant.settings_manage">
      <AiSettingsPage />
    </RequirePermission>
  );
}

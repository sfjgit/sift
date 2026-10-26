// File: RunStepDialog.tsx
// Path: src/features/pipeline/RunStepDialog.tsx
//
// Confirm + options before a step (or "Run all steps") is sent to the CSR
// pipeline. New SPOCs need a BU + SL: blank = the backend uses the caller's
// only BU / SL, or asks for one. Render with key={step.id} so each step
// opens with its own defaults.

'use client';

import { useState } from 'react';
import { Coins } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Field } from '@/components/forms/fields';
import { FormDialog } from '@/components/forms/FormDialog';
import { MasterPicker } from '@/components/pickers/pickers';
import { useAction } from '@/hooks/useResource';
import { pipelineApi } from '@/lib/api/endpoints';
import type { StartedRun, StepOverview } from '@/types/crm';
import { RUN_ALL_STEPS, STEP_META } from './stepMeta';

type Step = StepOverview['steps'][number];

function OptionRow({
  id,
  label,
  hint,
  paid,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  paid?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-surface px-3 py-2.5">
      <Label htmlFor={id} className="flex min-w-0 flex-col items-start gap-0.5 text-[13px] font-medium">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {paid && <Coins className="size-3.5 text-warning" aria-label="Uses paid credits" />}
        </span>
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function RunStepDialog({
  clientId,
  clientName,
  step,
  steps,
  spocIds,
  open,
  onOpenChange,
  onStarted,
}: {
  clientId: string;
  clientName: string;
  step: Step | null;
  /** every active step — "Run all steps" lists them */
  steps: Step[];
  spocIds?: string[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onStarted?: (run: StartedRun) => void;
}) {
  const key = step?.key ?? '';
  const meta = STEP_META[key];
  const isAll = key === 'run_all';
  // parent remounts this per step (key), so state starts from the step's defaults
  const [opts, setOpts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((meta?.options ?? []).map(o => [o.key, o.default]))
  );
  const [dryRun, setDryRun] = useState(false);
  const [chain, setChain] = useState<string[]>(() => RUN_ALL_STEPS.filter(k => steps.some(s => s.key === k)));
  const [bu, setBu] = useState<string | null>(null);
  const [sl, setSl] = useState<string | null>(null);

  const start = useAction(pipelineApi.start, {
    success: r => (r.duplicate ? 'Already running — showing that run' : `${r.step.label} started`),
    invalidate: [['step-runs']],
    onSuccess: r => {
      onOpenChange(false);
      onStarted?.(r);
    },
  });

  if (!step || !meta) return null;

  const createsSpocs = isAll ? chain.some(k => STEP_META[k]?.createsSpocs) : meta.createsSpocs;

  const submit = () => {
    const { find_new, ...rest } = opts;
    const options: Record<string, unknown> = { ...rest };
    if (key === 'apollo') options.mode = find_new ? 'find' : 'pipeline';
    if (dryRun) options.dryRun = true;
    if (isAll) options.steps = chain;
    start.mutate({
      stepKey: key,
      clientId,
      ...(spocIds?.length && { spocIds }),
      ...(bu && { businessUnitId: bu }),
      ...(sl && { serviceLineId: sl }),
      options,
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isAll ? `Run all steps for ${clientName}` : `${step.label} — ${clientName}`}
      description={meta.description}
      submitLabel={dryRun ? 'Estimate' : isAll ? 'Start all' : 'Start'}
      busy={start.isPending}
      onSubmit={submit}
    >
      <div className="space-y-4">
        {spocIds && spocIds.length > 0 && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[13px]">
            Only the {spocIds.length} selected SPOC{spocIds.length === 1 ? '' : 's'}.
          </p>
        )}

        {isAll && (
          <Field label="Steps" hint="They run in this order; a failed step is recorded and the next one still runs.">
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {steps
                .filter(s => RUN_ALL_STEPS.includes(s.key))
                .map(s => (
                  <li key={s.key}>
                    <Label className="flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-[13px] font-normal">
                      <Checkbox
                        checked={chain.includes(s.key)}
                        onCheckedChange={v =>
                          setChain(c => (v ? RUN_ALL_STEPS.filter(k => k === s.key || c.includes(k)) : c.filter(k => k !== s.key)))
                        }
                      />
                      {s.label}
                    </Label>
                  </li>
                ))}
            </ul>
          </Field>
        )}

        {meta.options.length > 0 && (
          <div className="space-y-2">
            {meta.options.map(o => (
              <OptionRow
                key={o.key}
                id={`opt-${o.key}`}
                label={o.label}
                hint={o.hint}
                paid={o.paid}
                checked={!!opts[o.key]}
                onChange={v => setOpts(p => ({ ...p, [o.key]: v }))}
              />
            ))}
          </div>
        )}

        {meta.dryRun && (
          <OptionRow
            id="opt-dry-run"
            label="Estimate only (dry run)"
            hint="Shows what would be done and what it would cost. Nothing is paid for or saved."
            checked={dryRun}
            onChange={setDryRun}
          />
        )}

        {createsSpocs && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business unit for new SPOCs" hint="Blank = yours, if you have one">
              <MasterPicker kind="business-units" value={bu} onChange={setBu} placeholder="My business unit" clearable />
            </Field>
            <Field label="Service line for new SPOCs" hint="Blank = yours, if you have one">
              <MasterPicker kind="service-lines" value={sl} onChange={setSl} placeholder="My service line" clearable />
            </Field>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          New SPOCs start as <span className="font-medium">pending approval</span>; existing details are never
          overwritten — differences are listed on the run for you to review.
        </p>
      </div>
    </FormDialog>
  );
}

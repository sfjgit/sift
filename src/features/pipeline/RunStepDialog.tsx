// File: RunStepDialog.tsx
// Path: src/features/pipeline/RunStepDialog.tsx
//
// Confirm + options before a step (or "Run all steps") is sent to the CSR
// pipeline. New SPOCs go under the client's BU and one of the client's
// service lines (picked for you when it has one). A client without BU / SLs
// falls back to the caller's own. Render with key={step.id} so each step
// opens with its own defaults.
//
// Shows who did the step last. Done recently with nothing new = blocked; an
// admin (step_runs.rerun) may tick "Run again anyway". Run slots left are
// shown, and a step with none left can't start.

'use client';

import { useMemo, useState } from 'react';
import { Building2, Coins } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Field } from '@/components/forms/fields';
import { FormDialog } from '@/components/forms/FormDialog';
import { MasterPicker } from '@/components/pickers/pickers';
import { Combobox } from '@/components/pickers/Combobox';
import { useAction } from '@/hooks/useResource';
import { clientHooks } from '@/hooks/queries';
import { pipelineApi } from '@/lib/api/endpoints';
import type { StartedRun, StepOverview } from '@/types/crm';
import { RUN_ALL_STEPS, STEP_META } from './stepMeta';
import { DoneNotice, fullSlot, needsMissing, SlotChips, slotText } from './runRules';

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
      <Label
        htmlFor={id}
        className="flex min-w-0 flex-col items-start gap-0.5 text-[13px] font-medium"
      >
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
  counts,
  canRerun = false,
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
  /** what the client holds — to say up front when the step has nothing to work on */
  counts?: StepOverview['counts'];
  /** super admin / step_runs.rerun */
  canRerun?: boolean;
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
  const [chain, setChain] = useState<string[]>(() =>
    RUN_ALL_STEPS.filter(k => steps.some(s => s.key === k))
  );
  const [bu, setBu] = useState<string | null>(null);
  const [sl, setSl] = useState<string | null>(null);
  const [rerun, setRerun] = useState(false);

  // the client page already has this cached
  const { data: client } = clientHooks.useDetail(clientId);
  const clientBu = client?.businessUnit ?? null;
  const slOptions = useMemo(
    () =>
      (client?.serviceLines ?? []).map(s => ({
        value: s.serviceLine.id,
        label: s.serviceLine.name,
      })),
    [client]
  );

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
  const full = fullSlot(step);
  const missing = counts && !isAll ? needsMissing(step, counts) : null;
  const blocked = !!step.rerunBlocked && !rerun;
  // inside "Run all", steps done recently are skipped (unless run again anyway)
  const chainDone = isAll ? steps.filter(s => chain.includes(s.key) && s.rerunBlocked) : [];

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
      ...(!clientBu && bu && { businessUnitId: bu }),
      ...(sl && { serviceLineId: sl }),
      ...(rerun && { rerun: true }),
      options,
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isAll ? `Run all steps for ${clientName}` : `${step.label} — ${clientName}`}
      description={meta.description}
      submitLabel={dryRun ? 'Estimate' : isAll ? 'Start all' : rerun ? 'Run again' : 'Start'}
      busy={start.isPending}
      submitDisabled={(!isAll && blocked) || !!full || !!missing}
      onSubmit={submit}
    >
      <div className="space-y-4">
        {missing && (
          <p className="rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-xs">
            {missing}.
          </p>
        )}
        {!isAll && <DoneNotice step={step} />}
        {isAll && chainDone.length > 0 && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs">
            Already done with nothing new — these will be{' '}
            <span className="font-medium">skipped</span>: {chainDone.map(s => s.label).join(', ')}.
          </p>
        )}
        {step.rerunBlocked && !isAll && !canRerun && (
          <p className="text-xs text-muted-foreground">
            Ask an admin if it must run again before then.
          </p>
        )}
        {(step.rerunBlocked || chainDone.length > 0) && canRerun && (
          <OptionRow
            id="opt-rerun"
            label="Run again anyway"
            hint="Admin only. Redoes the work although nothing new came in — paid steps spend credits again."
            checked={rerun}
            onChange={setRerun}
          />
        )}
        {full && (
          <p className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {slotText(full)}. Run slots are set by an admin.
          </p>
        )}
        <SlotChips slots={step.slots} />
        {spocIds && spocIds.length > 0 && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[13px]">
            Only the {spocIds.length} selected SPOC{spocIds.length === 1 ? '' : 's'}.
          </p>
        )}

        {isAll && (
          <Field
            label="Steps"
            hint="They run in this order; a failed step is recorded and the next one still runs."
          >
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {steps
                .filter(s => RUN_ALL_STEPS.includes(s.key))
                .map(s => (
                  <li key={s.key}>
                    <Label className="flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-[13px] font-normal">
                      <Checkbox
                        checked={chain.includes(s.key)}
                        onCheckedChange={v =>
                          setChain(c =>
                            v
                              ? RUN_ALL_STEPS.filter(k => k === s.key || c.includes(k))
                              : c.filter(k => k !== s.key)
                          )
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
            <Field
              label="Business unit for new SPOCs"
              hint={clientBu ? "The client's business unit" : 'Blank = yours, if you have one'}
            >
              {clientBu ? (
                <p className="flex h-9 items-center gap-1.5 rounded-lg border bg-muted/40 px-3 text-[13px]">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  {clientBu.name}
                </p>
              ) : (
                <MasterPicker
                  kind="business-units"
                  value={bu}
                  onChange={setBu}
                  placeholder="My business unit"
                  clearable
                />
              )}
            </Field>
            <Field
              label="Service line for new SPOCs"
              hint={
                slOptions.length === 1
                  ? "The client's only service line"
                  : slOptions.length
                    ? "Pick one of the client's service lines"
                    : 'Blank = yours, if you have one'
              }
            >
              {slOptions.length === 1 ? (
                <p className="flex h-9 items-center rounded-lg border bg-muted/40 px-3 text-[13px]">
                  {slOptions[0]!.label}
                </p>
              ) : slOptions.length ? (
                <Combobox
                  options={slOptions}
                  value={sl}
                  onChange={v => setSl(v)}
                  placeholder="Select service line"
                />
              ) : (
                <MasterPicker
                  kind="service-lines"
                  value={sl}
                  onChange={setSl}
                  placeholder="My service line"
                  clearable
                />
              )}
            </Field>
          </div>
        )}

        {(createsSpocs || meta.needs === 'spocs') && (
          <p className="text-xs text-muted-foreground">
            {createsSpocs && (
              <>
                New SPOCs start as <span className="font-medium">pending approval</span> and are
                yours (you become the handler; others don’t see them).{' '}
              </>
            )}
            It works on your own SPOCs only. Existing details are never overwritten — differences
            are listed on the run. People who are already someone else’s SPOC are skipped.
          </p>
        )}
      </div>
    </FormDialog>
  );
}

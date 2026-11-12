// File: CsrProgramDialog.tsx
// Path: src/features/clients/detail/CsrProgramDialog.tsx
//
// Add / correct one CSR programme — the columns of the project table in a
// company's annual CSR report. Amounts in ₹ crore. Saving locks the programme:
// the pipeline won't overwrite it until someone hands it back.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Segmented } from '@/components/ui/segmented';
import { FormDialog, FormGrid, FormSection } from '@/components/forms/FormDialog';
import { Field, TextAreaField, TextField, applyServerErrors } from '@/components/forms/fields';
import { Combobox, type ComboOption } from '@/components/pickers/Combobox';
import { clientHooks, useLookups } from '@/hooks/queries';
import { useGeoStates } from '@/hooks/geo';
import { clientsApi, csrAgenciesApi } from '@/lib/api/endpoints';
import { fromCroreText, lastClosedFy, toCroreText } from '@/lib/fy';
import type { ApiError } from '@/lib/api/client';
import type { ClientCsrProgram, CsrProgramInput } from '@/types/crm';
import { coordText, coordsPaired, withCoords } from '../LocationFields';
import { crore, fySchema } from './FinancialDialogs';

// 'unknown', not '': the segmented control can't show an empty value as picked
const triState = z.enum(['unknown', 'yes', 'no']);
const toTri = (v: boolean | null) => (v === null ? 'unknown' : v ? 'yes' : 'no');
const fromTri = (v: z.infer<typeof triState>) => (v === 'unknown' ? null : v === 'yes');

const placeSchema = z
  .object({
    state: z.string().trim().min(1, 'Pick a state'),
    district: z.string().trim().max(100),
    city: z.string().trim().max(100),
    latitude: coordText(90),
    longitude: coordText(180),
  })
  .superRefine(coordsPaired);

const schema = z.object({
  fy: fySchema,
  name: z.string().trim().min(1, 'Programme name is required').max(500),
  sectorIds: z.array(z.string()),
  isOngoing: triState,
  duration: z.string().trim().max(100),
  isLocalArea: triState,
  locations: z.array(placeSchema).max(100),
  locationNote: z.string().trim().max(2000),
  budget: crore(),
  spent: crore(),
  unspentTransferred: crore(),
  mode: z.enum(['UNKNOWN', 'DIRECT', 'AGENCY']),
  agencyId: z.string().nullable(),
  agencyName: z.string().trim().max(300),
  agencyRegistrationNo: z
    .string()
    .trim()
    .refine(v => !v || /^CSR\d{8}$/i.test(v), 'Use the CSR-1 number, e.g. CSR00012345'),
  beneficiaries: z.string().trim().max(1000),
  sourceUrl: z
    .string()
    .trim()
    .refine(v => !v || /^https?:\/\//i.test(v), 'Start with http:// or https://'),
});
type Values = z.infer<typeof schema>;

const defaults = (p?: ClientCsrProgram | null): Values => ({
  fy: p?.fy ?? lastClosedFy(),
  name: p?.name ?? '',
  sectorIds: p?.sectors.map(s => s.sector.id) ?? [],
  isOngoing: toTri(p?.isOngoing ?? null),
  duration: p?.duration ?? '',
  isLocalArea: toTri(p?.isLocalArea ?? null),
  locations:
    p?.locations.map(l => ({
      state: l.state,
      district: l.district ?? '',
      city: l.city ?? '',
      latitude: l.latitude != null ? String(Number(l.latitude)) : '',
      longitude: l.longitude != null ? String(Number(l.longitude)) : '',
    })) ?? [],
  locationNote: p?.locationNote ?? '',
  budget: toCroreText(p?.budgetRs),
  spent: toCroreText(p?.spentRs),
  unspentTransferred: toCroreText(p?.unspentTransferredRs),
  mode: p?.mode ?? 'UNKNOWN',
  agencyId: p?.agency?.id ?? null,
  agencyName: '',
  agencyRegistrationNo: p?.agency?.registrationNo ?? '',
  beneficiaries: p?.beneficiaries ?? '',
  sourceUrl: p?.sourceUrl ?? '',
});

const toBody = (v: Values): CsrProgramInput => ({
  fy: v.fy,
  name: v.name,
  sectorIds: v.sectorIds,
  isOngoing: fromTri(v.isOngoing),
  duration: v.duration || null,
  isLocalArea: fromTri(v.isLocalArea),
  locations: v.locations.map(l => ({
    ...withCoords(l),
    state: l.state,
    district: l.district || null,
    city: l.city || null,
  })),
  locationNote: v.locationNote || null,
  budgetRs: fromCroreText(v.budget),
  spentRs: fromCroreText(v.spent),
  unspentTransferredRs: fromCroreText(v.unspentTransferred),
  mode: v.mode === 'UNKNOWN' ? null : v.mode,
  // an existing agency, or a typed name the server finds / adds
  ...(v.mode === 'DIRECT'
    ? { agencyId: null }
    : v.agencyId
      ? { agencyId: v.agencyId }
      : v.agencyName
        ? { agencyName: v.agencyName }
        : { agencyId: null }),
  agencyRegistrationNo:
    v.mode !== 'DIRECT' && v.agencyRegistrationNo ? v.agencyRegistrationNo.toUpperCase() : null,
  beneficiaries: v.beneficiaries || null,
  sourceUrl: v.sourceUrl || null,
});

const TRI_OPTIONS = (yes: string, no: string) => [
  { value: 'unknown' as const, label: 'Not stated' },
  { value: 'yes' as const, label: yes },
  { value: 'no' as const, label: no },
];

export function CsrProgramDialog({
  clientId,
  program,
  open,
  onOpenChange,
}: {
  clientId: string;
  /** null = a new programme */
  program: ClientCsrProgram | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(program) });
  useEffect(() => {
    if (open) form.reset(defaults(program));
  }, [open, program, form]);

  const places = useFieldArray({ control: form.control, name: 'locations' });
  const [mode, sectorIds, agencyId, agencyName, isOngoing, isLocalArea, placeValues] = useWatch({
    control: form.control,
    name: ['mode', 'sectorIds', 'agencyId', 'agencyName', 'isOngoing', 'isLocalArea', 'locations'],
  });

  const sectors = useLookups('PROGRAM_SECTOR');
  const states = useGeoStates(['India']);
  const stateOpts = useMemo(
    () => (states.data ?? []).map(s => ({ value: s.name, label: s.name })),
    [states.data]
  );

  // agency picker: search the tenant's list, or keep a typed new name
  const [agencySearch, setAgencySearch] = useState('');
  const [q] = useDebounce(agencySearch, 200);
  const agencies = useQuery({
    queryKey: ['csr-agencies', q],
    queryFn: () => csrAgenciesApi.list(q || undefined),
    enabled: open && mode !== 'DIRECT',
    staleTime: 30_000,
  });
  const agencyOpts = useMemo<ComboOption[]>(() => {
    const list: ComboOption[] = (agencies.data ?? []).map(a => ({
      value: a.id,
      label: a.name,
      hint: a.registrationNo ?? undefined,
    }));
    const typed = agencySearch.trim();
    if (typed && !list.some(o => o.label.toLowerCase() === typed.toLowerCase()))
      list.unshift({ value: `new:${typed}`, label: `Add “${typed}”`, hint: 'new agency' });
    return list;
  }, [agencies.data, agencySearch]);
  const agencyLabel =
    agencyName ||
    agencies.data?.find(a => a.id === agencyId)?.name ||
    (program?.agency?.id === agencyId ? program?.agency?.name : undefined);

  const set = <K extends keyof Values>(k: K, v: Values[K]) =>
    form.setValue(k, v as never, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });

  const submit = form.handleSubmit(async v => {
    try {
      const body = toBody(v);
      if (program) await clientsApi.updateCsrProgram(clientId, program.id, body);
      else await clientsApi.createCsrProgram(clientId, body);
      toast.success(program ? 'Programme saved' : 'Programme added');
      qc.invalidateQueries({ queryKey: clientHooks.keys.all });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={program ? `CSR programme — FY ${program.fy}` : 'Add a CSR programme'}
      description="As listed in the company's annual CSR report. Amounts in ₹ crore. Saved programmes are locked — the pipeline won't overwrite them."
      onSubmit={submit}
      busy={form.formState.isSubmitting}
      submitLabel={program ? 'Save' : 'Add programme'}
    >
      <FormGrid cols={3}>
        <TextField
          form={form}
          name="name"
          label="Programme / project"
          required
          className="col-span-2"
          placeholder="e.g. Project Shiksha"
        />
        <TextField form={form} name="fy" label="Financial year" required placeholder="2025-2026" />
      </FormGrid>

      <Field label="Schedule VII activities" hint="Tick every area the project covers.">
        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {(sectors.data ?? []).map(s => (
            <label key={s.id} className="flex cursor-pointer items-start gap-2 text-[14px]">
              <Checkbox
                className="mt-0.5"
                checked={sectorIds.includes(s.id)}
                onCheckedChange={on =>
                  set('sectorIds', on ? [...sectorIds, s.id] : sectorIds.filter(id => id !== s.id))
                }
              />
              {s.label}
            </label>
          ))}
        </div>
        {program?.sectorText && (
          <p className="text-xs text-muted-foreground">Source says: “{program.sectorText}”</p>
        )}
      </Field>

      <FormSection title="Money (₹ crore)">
        <FormGrid cols={3}>
          <TextField form={form} name="budget" label="Allocated" inputMode="decimal" />
          <TextField form={form} name="spent" label="Spent in the FY" inputMode="decimal" />
          <TextField
            form={form}
            name="unspentTransferred"
            label="To Unspent CSR Account"
            inputMode="decimal"
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Project">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Duration">
            <Segmented
              value={isOngoing}
              onChange={v => set('isOngoing', v)}
              options={TRI_OPTIONS('Ongoing (multi-year)', 'One year')}
            />
          </Field>
          <TextField
            form={form}
            name="duration"
            label="Duration as reported"
            placeholder="3 years"
          />
          <Field label="In the company's local area?">
            <Segmented
              value={isLocalArea}
              onChange={v => set('isLocalArea', v)}
              options={TRI_OPTIONS('Yes', 'No')}
            />
          </Field>
          <TextField
            form={form}
            name="beneficiaries"
            label="Beneficiaries"
            placeholder="1,200 students"
          />
        </div>
      </FormSection>

      <FormSection title="Where">
        <div className="space-y-2">
          {places.fields.map((f, i) => (
            <div
              key={f.id}
              className="grid items-start gap-2 sm:grid-cols-[1.3fr_1fr_1fr_0.8fr_0.8fr_auto]"
            >
              <Field
                error={form.formState.errors.locations?.[i]?.state?.message}
                label={i === 0 ? 'State' : undefined}
              >
                <Combobox
                  value={placeValues[i]?.state || null}
                  options={stateOpts}
                  loading={states.isLoading}
                  placeholder="State"
                  searchPlaceholder="Search states…"
                  selectedLabel={placeValues[i]?.state || undefined}
                  onChange={v =>
                    form.setValue(`locations.${i}.state`, v ?? '', { shouldValidate: true })
                  }
                />
              </Field>
              <TextField
                form={form}
                name={`locations.${i}.district`}
                label={i === 0 ? 'District' : undefined}
              />
              <TextField
                form={form}
                name={`locations.${i}.city`}
                label={i === 0 ? 'City' : undefined}
              />
              <TextField
                form={form}
                name={`locations.${i}.latitude`}
                label={i === 0 ? 'Latitude' : undefined}
                inputMode="decimal"
              />
              <TextField
                form={form}
                name={`locations.${i}.longitude`}
                label={i === 0 ? 'Longitude' : undefined}
                inputMode="decimal"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={i === 0 ? 'mt-7' : ''}
                aria-label="Remove place"
                onClick={() => places.remove(i)}
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              places.append({ state: '', district: '', city: '', latitude: '', longitude: '' })
            }
          >
            <MapPin /> Add a place
          </Button>
        </div>
        <TextAreaField
          form={form}
          name="locationNote"
          label="Where, as written in the report"
          rows={2}
          placeholder="Pan-India; 12 districts of Karnataka…"
        />
      </FormSection>

      <FormSection title="Implementation">
        <Field label="Mode">
          <Segmented
            value={mode}
            onChange={v => set('mode', v)}
            options={[
              { value: 'UNKNOWN', label: 'Not stated' },
              { value: 'DIRECT', label: 'Direct (by the company)' },
              { value: 'AGENCY', label: 'Through an agency' },
            ]}
          />
        </Field>
        {mode !== 'DIRECT' && (
          <FormGrid>
            <Field label="Implementing agency">
              <Combobox
                value={agencyId ?? (agencyName ? `new:${agencyName}` : null)}
                options={agencyOpts}
                loading={agencies.isFetching && !agencies.data}
                onSearch={setAgencySearch}
                placeholder="Search or type an NGO / trust"
                searchPlaceholder="Name or CSR-1 number…"
                emptyText="Type the agency's name to add it"
                selectedLabel={agencyLabel}
                clearable
                onChange={(v, o) => {
                  if (v?.startsWith('new:')) {
                    set('agencyId', null);
                    set('agencyName', v.slice(4));
                  } else {
                    set('agencyId', v);
                    set('agencyName', '');
                    if (o?.hint) set('agencyRegistrationNo', o.hint);
                  }
                  if (v && mode === 'UNKNOWN') set('mode', 'AGENCY');
                  setAgencySearch('');
                }}
              />
            </Field>
            <TextField
              form={form}
              name="agencyRegistrationNo"
              label="CSR-1 registration no."
              placeholder="CSR00012345"
              hint="From the MCA CSR-1 filing, when known"
            />
          </FormGrid>
        )}
      </FormSection>

      <TextField form={form} name="sourceUrl" label="Source link" placeholder="https://…" />
    </FormDialog>
  );
}

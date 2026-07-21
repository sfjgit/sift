/* eslint-disable @typescript-eslint/no-explicit-any */
// File: ClientForm.tsx
// Path: app/clients/_components/ClientForm.tsx

'use client';

import { useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAxios } from '@/hooks/useAxios';

// ─── Constants ────────────────────────────────────────────────────────────────

const NONE = '__none__';

const AGREEMENT_TYPES = [
  { value: 'FIXED', label: 'Fixed percentage' },
  { value: 'BAND', label: 'Band-based' },
] as const;

const CLIENT_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
] as const;

/** '' -> null, otherwise Number(). Keeps zod's number().nullable() happy and avoids NaN. */
const numberOrNull = (v: string | number | null | undefined) =>
  v === '' || v === null || v === undefined ? null : Number(v);

// ─── Schema ───────────────────────────────────────────────────────────────────

const bandSchema = z.object({
  name: z.string().max(100).trim().optional().nullable(),
  code: z.string().min(1, 'Code is required').max(100).trim(),
  experience: z.number().min(0).optional().nullable(),
  rangeFrom: z.number().min(0).optional().nullable(),
  rangeTo: z.number().min(0).optional().nullable(),
  value: z.number().min(0).optional().nullable(),
});

// Base object stays a ZodObject so `.partial()` still works for the update schema.
const clientObject = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  vmsName: z.string().max(200).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url('Invalid URL').optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  businessUnitId: z.string().optional().nullable(),
  parentClientId: z.string().optional().nullable(),
  agreementType: z.enum(['BAND', 'FIXED']).default('FIXED'),
  notes: z.string().max(500).optional().nullable(),
  // NOTE: form field is `percentage`; map to `percentageValue` in the API payload.
  percentage: z.number().min(0).max(100).optional().nullable(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).default('PENDING'),
  bands: z.array(bandSchema).optional().nullable(),
});

// Cross-field rules: FIXED needs a percentage, BAND needs at least one band.
export const createClientSchema = clientObject.superRefine((val, ctx) => {
  if (val.agreementType === 'FIXED' && val.percentage == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['percentage'],
      message: 'Percentage is required for a fixed agreement',
    });
  }
  if (val.agreementType === 'BAND' && (!val.bands || val.bands.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bands'],
      message: 'Add at least one band',
    });
  }
});

const updateClientSchema = clientObject.partial();

export type CreateClientInput = z.infer<typeof clientObject>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  mode: 'create' | 'edit';
  defaultValues?: Partial<CreateClientInput>;
  onSubmit: (data: CreateClientInput | UpdateClientInput) => void;
  isPending: boolean;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientForm({ mode, defaultValues, onSubmit, isPending, onCancel }: Props) {
  const axios = useAxios();
  const schema = mode === 'create' ? createClientSchema : updateClientSchema;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateClientInput>({
    // @ts-expect-error schema union
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      vmsName: '',
      industry: '',
      website: '',
      country: '',
      state: '',
      city: '',
      address: '',
      businessUnitId: null,
      parentClientId: null,
      agreementType: 'FIXED',
      status: 'PENDING',
      percentage: null,
      bands: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'bands' });

  const agreementType = watch('agreementType');

  useEffect(() => {
    if (defaultValues) reset(defaultValues as CreateClientInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  // When switching to BAND with no rows yet, seed one empty row.
  useEffect(() => {
    if (agreementType === 'BAND' && fields.length === 0) {
      append({ name: '', code: '', experience: null, rangeFrom: null, rangeTo: null, value: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementType]);

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
  });

  const { data: clientsRes } = useQuery<{
    data: { id: string; name: string }[];
  }>({
    queryKey: ['clients-dropdown'],
    queryFn: async () => (await axios.get('/clients?limit=200&sortBy=name&sortDir=asc')).data,
    staleTime: 60_000,
  });

  const businessUnits = busRes?.data ?? [];
  const clients = clientsRes?.data ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Basic info */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Basic info</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label required>Client name</Label>
            <Input placeholder="Acme Corp" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>VMS name</Label>
            <Input placeholder="Name in VMS system" {...register('vmsName')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Industry</Label>
            <Input placeholder="e.g. Technology" {...register('industry')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Website</Label>
            <Input placeholder="https://example.com" {...register('website')} />
            <FieldError message={errors.website?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Business unit</Label>
            <Controller
              control={control}
              name="businessUnitId"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE}
                  onValueChange={v => field.onChange(v === NONE ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select BU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {businessUnits.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.businessUnitId?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value ?? 'PENDING'} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.status?.message} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Location */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Location</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Country</Label>
            <Input placeholder="e.g. India" {...register('country')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>State</Label>
            <Input placeholder="e.g. Karnataka" {...register('state')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>City</Label>
            <Input placeholder="e.g. Bengaluru" {...register('city')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Address</Label>
            <Input placeholder="Full address" {...register('address')} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Pricing / agreement */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Pricing &amp; agreement</SectionLabel>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label required>Agreement type</Label>
            <Controller
              control={control}
              name="agreementType"
              render={({ field }) => (
                <Select value={field.value ?? 'FIXED'} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGREEMENT_TYPES.map(a => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.agreementType?.message} />
          </div>

          {agreementType === 'FIXED' && (
            <div className="flex flex-col gap-1.5">
              <Label required>Percentage (%)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                placeholder="e.g. 8.5"
                {...register('percentage', { setValueAs: numberOrNull })}
              />
              <FieldError message={errors.percentage?.message} />
            </div>
          )}
        </div>

        {agreementType === 'BAND' && (
          <div className="flex flex-col gap-3">
            <FieldError message={(errors.bands as any)?.message} />

            {fields.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end rounded-md border p-3"
              >
                <div className="flex flex-col gap-1.5 sm:col-span-3">
                  <Label required>Code</Label>
                  <Input placeholder="B1" {...register(`bands.${index}.code`)} />
                  <FieldError message={errors.bands?.[index]?.code?.message} />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-3">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Senior" {...register(`bands.${index}.name`)} />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Exp (yrs)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    placeholder="0"
                    {...register(`bands.${index}.experience`, { setValueAs: numberOrNull })}
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-1">
                  <Label>From</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0"
                    {...register(`bands.${index}.rangeFrom`, { setValueAs: numberOrNull })}
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-1">
                  <Label>To</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0"
                    {...register(`bands.${index}.rangeTo`, { setValueAs: numberOrNull })}
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-1">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0"
                    {...register(`bands.${index}.value`, { setValueAs: numberOrNull })}
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label="Remove band"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                append({
                  name: '',
                  code: '',
                  experience: null,
                  rangeFrom: null,
                  rangeTo: null,
                  value: null,
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Add band
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Parent client */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Parent client (optional)</SectionLabel>
        <div className="flex flex-col gap-1.5">
          <Label>Parent client</Label>
          <Controller
            control={control}
            name="parentClientId"
            render={({ field }) => (
              <Select
                value={field.value ?? NONE}
                onValueChange={v => field.onChange(v === NONE ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.parentClientId?.message} />
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create client'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

// ─── detailToFormValues ───────────────────────────────────────────────────────

export function detailToFormValues(client: any): Partial<CreateClientInput> {
  return {
    name: client.name,
    vmsName: client.vmsName ?? '',
    industry: client.industry ?? '',
    website: client.website ?? '',
    country: client.country ?? '',
    state: client.state ?? '',
    city: client.city ?? '',
    address: client.address ?? '',
    businessUnitId: client.businessUnit?.id ?? null,
    parentClientId: client.parentClient?.id ?? null,
    status: client.status ?? 'PENDING',
    agreementType: client.agreementType ?? 'FIXED',
    // Prisma Decimal (percentageValue) serialises as a string over JSON -> Number it.
    percentage: client.percentageValue != null ? Number(client.percentageValue) : null,
    bands: (client.bands ?? []).map((b: any) => ({
      name: b.name ?? '',
      code: b.code,
      experience: b.experience != null ? Number(b.experience) : null,
      rangeFrom: b.rangeFrom != null ? Number(b.rangeFrom) : null,
      rangeTo: b.rangeTo != null ? Number(b.rangeTo) : null,
      value: b.value != null ? Number(b.value) : null,
    })),
  };
}

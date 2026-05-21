/* eslint-disable @typescript-eslint/no-explicit-any */
// File: ClientForm.tsx
// Path: app/clients/_components/ClientForm.tsx

'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

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

// ─── Schema ───────────────────────────────────────────────────────────────────

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  vmsName: z.string().max(200).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')).nullable(),
  country: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  businessUnitId: z.string().optional().nullable(),
  parentClientId: z.string().optional().nullable(),
});

const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
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
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) reset(defaultValues as CreateClientInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

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
  };
}

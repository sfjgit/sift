// File: ClientFormDialog.tsx
// Path: src/features/clients/ClientFormDialog.tsx
//
// Create (global, opened from quick-add / ⌘K / clients page) and edit.
// On create you can drop in the head-office city right away — it becomes the
// client's first (primary) location.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog, FormGrid, FormSection } from '@/components/forms/FormDialog';
import {
  Field,
  PickerField,
  TextField,
  applyServerErrors,
  blankToNull,
} from '@/components/forms/fields';
import { LookupPicker, MasterPicker } from '@/components/pickers/pickers';
import { MasterMultiPicker } from '@/components/pickers/MultiCombobox';
import { clientsApi } from '@/lib/api/endpoints';
import { clientHooks } from '@/hooks/queries';
import { useUi } from '@/stores/ui';
import type { ApiError } from '@/lib/api/client';
import type { ClientDetail } from '@/types/crm';
import { LocationFields, locationSchema, type LocationValues } from './LocationFields';

// accept "acme.com" — backend wants a full URL
const url = z
  .string()
  .trim()
  .transform(v => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine(v => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), 'Enter a valid URL');

const schema = z.object({
  name: z.string().trim().min(1, 'Client name is required').max(200),
  shortName: z.string().trim().max(100),
  cin: z
    .string()
    .trim()
    .max(21, 'CIN is 21 characters')
    .transform(v => v.toUpperCase()),
  website: url,
  linkedinUrl: url,
  industryId: z.string().nullable(),
  categoryId: z.string().nullable(),
  businessUnitId: z.string().nullable(),
  serviceLineIds: z.array(z.string()),
  hq: locationSchema.partial(),
});

type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

const toDefaults = (c?: ClientDetail | null): Values => ({
  name: c?.name ?? '',
  shortName: c?.shortName ?? '',
  cin: c?.cin ?? '',
  website: c?.website ?? '',
  linkedinUrl: c?.linkedinUrl ?? '',
  industryId: c?.industry?.id ?? null,
  categoryId: c?.category?.id ?? null,
  businessUnitId: c?.businessUnit?.id ?? null,
  serviceLineIds: c?.serviceLines?.map(s => s.serviceLine.id) ?? [],
  hq: { city: '', state: '', country: 'India' } as Partial<LocationValues>,
});

export function ClientFormDialog({
  client,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  client?: ClientDetail | null;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const storeOpen = useUi(s => s.clientDialog);
  const openClientDialog = useUi(s => s.openClientDialog);
  const isEdit = !!client;
  const open = openProp ?? (!isEdit && storeOpen);
  const onOpenChange = onOpenChangeProp ?? openClientDialog;

  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(client),
  });
  const busy = form.formState.isSubmitting;

  useEffect(() => {
    if (open) form.reset(toDefaults(client));
  }, [open, client, form]);

  const submit = form.handleSubmit(async v => {
    const { hq, serviceLineIds, ...rest } = v;
    const body = { ...blankToNull(rest), serviceLineIds };
    try {
      if (isEdit) {
        await clientsApi.update(client.id, body);
        toast.success('Client updated');
        qc.invalidateQueries({ queryKey: clientHooks.keys.all });
        onOpenChange(false);
        return;
      }
      const created = await clientsApi.create({ ...body, name: v.name });
      if (hq?.city || hq?.state) {
        await clientsApi
          .addLocation(created.id, { ...blankToNull(hq), isPrimary: true })
          .catch(() =>
            toast.warning(
              'Client created, but the location couldn’t be saved — add it from the profile.'
            )
          );
      }
      toast.success(`${created.name} created`, {
        description: 'It’s pending approval until someone activates it.',
      });
      qc.invalidateQueries({ queryKey: clientHooks.keys.all });
      onOpenChange(false);
      router.push(`/clients/${created.id}`);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${client.name}` : 'New client'}
      description={
        isEdit ? undefined : 'Add the company now — SPOCs, locations and technology can follow.'
      }
      onSubmit={submit}
      submitLabel={isEdit ? 'Save changes' : 'Create client'}
      busy={busy}
    >
      <FormSection title="Company">
        <TextField
          form={form}
          name="name"
          label="Client name"
          required
          autoFocus
          placeholder="e.g. ASM Technologies Ltd"
        />
        <FormGrid>
          <TextField form={form} name="shortName" label="Short name" placeholder="ASM" />
          <TextField
            form={form}
            name="cin"
            label="CIN"
            placeholder="L85110KA1992PLC013421"
            className="uppercase"
          />
        </FormGrid>
        <FormGrid>
          <PickerField
            form={form}
            name="industryId"
            label="Industry"
            render={p => <LookupPicker type="INDUSTRY" placeholder="Select industry" {...p} />}
          />
          <PickerField
            form={form}
            name="categoryId"
            label="Category"
            render={p => (
              <LookupPicker type="CLIENT_CATEGORY" placeholder="Select category" {...p} />
            )}
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Ownership">
        <FormGrid>
          <PickerField
            form={form}
            name="businessUnitId"
            label="Business unit"
            render={p => <MasterPicker kind="business-units" placeholder="Select BU" {...p} />}
          />
          <Field
            label="Service lines"
            htmlFor="serviceLineIds"
            hint="New SPOCs from pipeline runs go under one of these."
          >
            <Controller
              control={form.control}
              name="serviceLineIds"
              render={({ field }) => (
                <MasterMultiPicker
                  id="serviceLineIds"
                  kind="service-lines"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="None"
                />
              )}
            />
          </Field>
        </FormGrid>
      </FormSection>
      <FormSection title="Online">
        <FormGrid>
          <TextField
            form={form}
            name="website"
            label="Website"
            placeholder="asmltd.com"
            inputMode="url"
          />
          <TextField
            form={form}
            name="linkedinUrl"
            label="LinkedIn"
            placeholder="linkedin.com/company/…"
            inputMode="url"
          />
        </FormGrid>
      </FormSection>
      {!isEdit && (
        <FormSection title="Head office (optional)">
          <LocationFields form={form} prefix="hq" compact />
        </FormSection>
      )}
    </FormDialog>
  );
}

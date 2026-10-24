// File: SpocFormDialog.tsx
// Path: src/features/spocs/SpocFormDialog.tsx
//
// Create (global — optionally pre-filled with a client) and edit.
// Handler is chosen on create only; later changes go through "Reassign".

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog, FormGrid, FormSection } from '@/components/forms/FormDialog';
import { PickerField, SwitchField, TextAreaField, TextField, applyServerErrors, blankToNull } from '@/components/forms/fields';
import { Combobox } from '@/components/pickers/Combobox';
import { ClientPicker, LookupPicker, MasterPicker, UserPicker } from '@/components/pickers/pickers';
import { clientsApi, spocsApi } from '@/lib/api/endpoints';
import { clientHooks, spocHooks } from '@/hooks/queries';
import { useAuth } from '@/features/auth/AuthProvider';
import { fullName } from '@/lib/format';
import { useUi } from '@/stores/ui';
import type { ApiError } from '@/lib/api/client';
import type { SpocDetail } from '@/types/crm';

const optUrl = z
  .string()
  .trim()
  .transform(v => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine(v => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), 'Enter a valid URL');

const years = z
  .string()
  .trim()
  .refine(v => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) < 100), '0 – 99.9')
  .transform(v => (v ? Number(v) : null));

const schema = z.object({
  clientId: z.string({ error: 'Client is required' }).min(1, 'Client is required'),
  handlerId: z.string({ error: 'Handler is required' }).min(1, 'Handler is required'),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().max(100),
  email: z.string().trim().toLowerCase().refine(v => !v || z.email().safeParse(v).success, 'Invalid email'),
  phone: z.string().trim().max(30),
  designation: z.string().trim().max(200),
  department: z.string().trim().max(200),
  seniority: z.string().trim().max(50),
  linkedinUrl: optUrl,
  totalExpYears: years,
  currentOrgExpYears: years,
  businessUnitId: z.string({ error: 'Business unit is required' }).min(1, 'Business unit is required'),
  serviceLineId: z.string({ error: 'Service line is required' }).min(1, 'Service line is required'),
  locationId: z.string().nullable(),
  sourceId: z.string().nullable(),
  emailSourceId: z.string().nullable(),
  salesStatusId: z.string().nullable(),
  isPrimary: z.boolean(),
  notes: z.string().trim().max(2000),
});

type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

const SENIORITY = ['C-level', 'VP', 'Director', 'Head', 'Manager', 'Lead', 'Individual contributor'];

const toDefaults = (s?: SpocDetail | null, clientId?: string, meId?: string): Values => ({
  clientId: s?.client.id ?? clientId ?? '',
  handlerId: s?.handler.id ?? meId ?? '',
  firstName: s?.firstName ?? '',
  lastName: s?.lastName ?? '',
  email: s?.email ?? '',
  phone: s?.phone ?? '',
  designation: s?.designation ?? '',
  department: s?.department ?? '',
  seniority: s?.seniority ?? '',
  linkedinUrl: s?.linkedinUrl ?? '',
  totalExpYears: s?.totalExpYears ?? '',
  currentOrgExpYears: s?.currentOrgExpYears ?? '',
  businessUnitId: s?.businessUnit.id ?? '',
  serviceLineId: s?.serviceLine.id ?? '',
  locationId: s?.location?.id ?? null,
  sourceId: s?.source?.id ?? null,
  emailSourceId: s?.emailSource?.id ?? null,
  salesStatusId: s?.salesStatus?.id ?? null,
  isPrimary: s?.isPrimary ?? false,
  notes: s?.notes ?? '',
});

export function SpocFormDialog({
  spoc,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  spoc?: SpocDetail | null;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const draft = useUi(s => s.spocDialog);
  const openSpocDialog = useUi(s => s.openSpocDialog);
  const isEdit = !!spoc;
  const open = openProp ?? (!isEdit && !!draft);
  const onOpenChange = onOpenChangeProp ?? ((o: boolean) => !o && openSpocDialog(null));

  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(schema), defaultValues: toDefaults(spoc) });
  const busy = form.formState.isSubmitting;
  const clientId = useWatch({ control: form.control, name: 'clientId' });

  useEffect(() => {
    if (open) form.reset(toDefaults(spoc, draft?.clientId, user?.id));
  }, [open, spoc, draft, user, form]);

  // locations of the chosen client for the "works at" picker
  const { data: client } = useQuery({
    queryKey: clientHooks.keys.detail(clientId || ''),
    queryFn: () => clientsApi.get(clientId),
    enabled: open && !!clientId,
  });
  const locationOptions = (client?.locations ?? []).map(l => ({
    value: l.id,
    label: [l.name, l.city, l.state].filter(Boolean).join(', ') || 'Unnamed location',
    hint: [l.type?.label, l.isPrimary ? 'Primary' : null].filter(Boolean).join(' · '),
  }));

  const submit = form.handleSubmit(async v => {
    const { clientId: cid, handlerId, ...fields } = v;
    const body = blankToNull(fields);
    try {
      if (isEdit) {
        await spocsApi.update(spoc.id, body);
        toast.success('SPOC updated');
      } else {
        const created = await spocsApi.create({ ...body, clientId: cid, handlerId, firstName: v.firstName });
        toast.success(`${fullName(created)} added`, {
          action: { label: 'Open', onClick: () => router.push(`/spocs/${created.id}`) },
        });
      }
      qc.invalidateQueries({ queryKey: spocHooks.keys.all });
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
      title={isEdit ? `Edit ${fullName(spoc)}` : 'New SPOC'}
      description={
        isEdit ? undefined : 'A SPOC is a contact at a client, owned by one handler for a business unit + service line.'
      }
      onSubmit={submit}
      submitLabel={isEdit ? 'Save changes' : 'Add SPOC'}
      busy={busy}
    >
      {!isEdit && (
        <FormSection title="Ownership">
          <FormGrid>
            <PickerField
              form={form}
              name="clientId"
              label="Client"
              required
              render={p => (
                <ClientPicker
                  {...p}
                  selectedLabel={draft?.clientName}
                  clearable={false}
                  onChange={val => {
                    p.onChange(val);
                    form.setValue('locationId', null);
                  }}
                />
              )}
            />
            <PickerField
              form={form}
              name="handlerId"
              label="Handler"
              required
              hint="Who owns this relationship."
              render={p => (
                <UserPicker {...p} purpose="assign" clearable={false} selectedLabel={p.value === user?.id ? `${fullName(user)} (you)` : undefined} />
              )}
            />
          </FormGrid>
        </FormSection>
      )}

      <FormSection title="Person">
        <FormGrid>
          <TextField form={form} name="firstName" label="First name" required autoFocus={isEdit} />
          <TextField form={form} name="lastName" label="Last name" />
        </FormGrid>
        <FormGrid>
          <TextField form={form} name="designation" label="Designation" placeholder="e.g. Head of CSR" />
          <TextField form={form} name="department" label="Department" />
        </FormGrid>
        <FormGrid cols={3}>
          <TextField form={form} name="seniority" label="Seniority" list="spoc-seniority" autoComplete="off" />
          <TextField form={form} name="totalExpYears" label="Total exp. (yrs)" inputMode="decimal" />
          <TextField form={form} name="currentOrgExpYears" label="At this org (yrs)" inputMode="decimal" />
        </FormGrid>
        <datalist id="spoc-seniority">
          {SENIORITY.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </FormSection>

      <FormSection title="Contact">
        <FormGrid>
          <TextField form={form} name="email" label="Email" type="email" hint="Must be unique across all SPOCs." />
          <TextField form={form} name="phone" label="Phone" type="tel" />
        </FormGrid>
        <TextField form={form} name="linkedinUrl" label="LinkedIn" placeholder="linkedin.com/in/…" />
      </FormSection>

      <FormSection title="Business">
        <FormGrid>
          <PickerField
            form={form}
            name="businessUnitId"
            label="Business unit"
            required
            render={p => <MasterPicker kind="business-units" {...p} />}
          />
          <PickerField
            form={form}
            name="serviceLineId"
            label="Service line"
            required
            render={p => <MasterPicker kind="service-lines" {...p} />}
          />
        </FormGrid>
        <FormGrid>
          <PickerField
            form={form}
            name="salesStatusId"
            label="Sales status"
            render={p => <LookupPicker type="SALES_STATUS" {...p} />}
          />
          <PickerField
            form={form}
            name="locationId"
            label="Works at"
            hint={clientId ? undefined : 'Pick a client first'}
            render={p => (
              <Combobox
                {...p}
                options={locationOptions}
                disabled={!clientId}
                placeholder={locationOptions.length || !clientId ? 'Select location' : 'No locations on this client'}
              />
            )}
          />
        </FormGrid>
        <FormGrid>
          <PickerField form={form} name="sourceId" label="Source" render={p => <LookupPicker type="SPOC_SOURCE" {...p} />} />
          <PickerField
            form={form}
            name="emailSourceId"
            label="Email source"
            render={p => <LookupPicker type="EMAIL_SOURCE" {...p} />}
          />
        </FormGrid>
        <SwitchField form={form} name="isPrimary" label="Primary SPOC" hint="The main contact for this client." />
        <TextAreaField form={form} name="notes" label="Notes" rows={3} placeholder="Context, preferences, how you met…" />
      </FormSection>
    </FormDialog>
  );
}

// File: ClientFormDialog.tsx
// Path: src/features/clients/ClientFormDialog.tsx
//
// Create a client — a full page (/clients/new; every "New client" button, quick-add and ⌘K lead
// there) with the add-ons: registration (companies), CSR profile, government (government bodies),
// office contact and group. Editing happens on the client page itself (Edit → form).
// The head-office address entered here becomes the client's first (primary) location.

'use client';

import { usePermissions } from '@/features/auth/usePermissions';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
import { Segmented } from '@/components/ui/segmented';
import { clientsApi } from '@/lib/api/endpoints';
import { clientHooks } from '@/hooks/queries';
import { useUi } from '@/stores/ui';
import type { ApiError } from '@/lib/api/client';
import type { ClientDetail, ClientEntityType, ClientInput } from '@/types/crm';
import { ENTITY_TYPE } from './columns';
import {
  LocationFields,
  coordsPaired,
  locationSchema,
  withCoords,
  type LocationValues,
} from './LocationFields';

// accept "acme.com" — backend wants a full URL
const url = z
  .string()
  .trim()
  .transform(v => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine(v => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), 'Enter a valid URL');

// "1,200" → 1200; blank → null
const headCount = z
  .string()
  .trim()
  .transform(v => v.replace(/[,\s]/g, ''))
  .refine(v => !v || /^\d{1,8}$/.test(v), 'Whole number of employees')
  .transform(v => (v ? Number(v) : null));

const schema = z.object({
  entityType: z.enum(['COMPANY', 'GOVERNMENT', 'INSTITUTION']),
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
  employeeCount: headCount,
  employeeSizeId: z.string().nullable(),
  businessUnitId: z.string().nullable(),
  groupName: z.string().trim().max(150),
  email: z
    .string()
    .trim()
    .max(200)
    .refine(v => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter a valid email'),
  phone: z.string().trim().max(30),
  // registration (companies)
  ownership: z.enum(['', 'PRIVATE', 'CENTRAL_GOVT', 'STATE_GOVT']),
  companyClass: z.string().trim().max(150),
  yearOfIncorporation: z
    .string()
    .trim()
    .refine(v => !v || /^(18|19|20)\d{2}$/.test(v), 'A year like 1998')
    .transform(v => (v ? Number(v) : null)),
  listed: z.enum(['', 'yes', 'no']),
  // CSR profile
  csrRoleId: z.string().nullable(),
  csrEligible: z.enum(['', 'yes', 'no']),
  foundationName: z.string().trim().max(300),
  foundationWebsite: url,
  // government body
  govt: z.object({
    level: z.enum(['', 'CENTRAL', 'STATE', 'DISTRICT', 'LOCAL']),
    orgTypeId: z.string().nullable(),
    ministryName: z.string().trim().max(300),
    departmentName: z.string().trim().max(300),
    stateSkillBody: z.string().trim().max(300),
    sector: z.string().trim().max(200),
    schemeType: z.string().trim().max(100),
    tenderPortal: z.string().trim().max(300),
    tenderAuthority: z.string().trim().max(300),
    priority: z.enum(['', 'H', 'M', 'L']),
  }),
  hq: locationSchema.partial().superRefine(coordsPaired),
});

type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

const toDefaults = (c?: ClientDetail | null): Values => ({
  entityType: c?.entityType ?? 'COMPANY',
  name: c?.name ?? '',
  shortName: c?.shortName ?? '',
  cin: c?.cin ?? '',
  website: c?.website ?? '',
  linkedinUrl: c?.linkedinUrl ?? '',
  industryId: c?.industry?.id ?? null,
  categoryId: c?.category?.id ?? null,
  employeeCount: typeof c?.employeeCount === 'number' ? String(c.employeeCount) : '',
  employeeSizeId: c?.employeeSize?.id ?? null,
  businessUnitId: c?.businessUnit?.id ?? null,
  groupName: c?.groupName ?? '',
  email: c?.email ?? '',
  phone: c?.phone ?? '',
  ownership: c?.registration?.ownership ?? '',
  companyClass: c?.registration?.companyClass ?? '',
  yearOfIncorporation: c?.registration?.yearOfIncorporation
    ? String(c.registration.yearOfIncorporation)
    : '',
  listed: c?.isListed === true ? 'yes' : c?.isListed === false ? 'no' : '',
  csrRoleId: c?.csr?.csrRole?.id ?? null,
  csrEligible: c?.csrEligible === true ? 'yes' : c?.csrEligible === false ? 'no' : '',
  foundationName: c?.foundationName ?? '',
  foundationWebsite: c?.foundationWebsite ?? '',
  govt: {
    level: c?.govt?.level ?? '',
    orgTypeId: c?.govt?.orgType?.id ?? null,
    ministryName: c?.govt?.ministryName ?? '',
    departmentName: c?.govt?.departmentName ?? '',
    stateSkillBody: c?.govt?.stateSkillBody ?? '',
    sector: c?.govt?.sector ?? '',
    schemeType: c?.govt?.schemeType ?? '',
    tenderPortal: c?.govt?.tenderPortal ?? '',
    tenderAuthority: c?.govt?.tenderAuthority ?? '',
    priority: c?.govt?.priority ?? '',
  },
  hq: { city: '', district: '', state: '', country: 'India' } as Partial<LocationValues>,
});

export function ClientFormDialog({
  client,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  asPage,
}: {
  client?: ClientDetail | null;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  /** the /clients/new page */
  asPage?: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const storeOpen = useUi(s => s.clientDialog);
  const openClientDialog = useUi(s => s.openClientDialog);
  const isEdit = !!client;
  const { isSuperAdmin } = usePermissions();
  const open = asPage ? true : (openProp ?? (!isEdit && storeOpen));
  const onOpenChange = asPage
    ? (o: boolean) => !o && router.back()
    : (onOpenChangeProp ?? openClientDialog);

  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(client),
  });
  const busy = form.formState.isSubmitting;
  const entityType = useWatch({ control: form.control, name: 'entityType' });

  useEffect(() => {
    if (open) form.reset(toDefaults(client));
  }, [open, client, form]);

  const submit = form.handleSubmit(async v => {
    const { hq, govt, listed, csrEligible, ownership, ...rest } = v;
    const tri = (x: string) => (x === 'yes' ? true : x === 'no' ? false : null);
    const g = blankToNull(govt) as Record<string, unknown>;
    const hasGovt =
      v.entityType === 'GOVERNMENT' || Object.values(g).some(x => x !== null && x !== undefined);
    const body = {
      ...blankToNull(rest),
      ownership: ownership || null,
      isListed: tri(listed),
      csrEligible: tri(csrEligible),
      ...(hasGovt && { govt: g }),
    } as Partial<ClientInput>;
    try {
      if (isEdit) {
        await clientsApi.update(client.id, body);
        toast.success('Client updated');
        qc.invalidateQueries({ queryKey: clientHooks.keys.all });
        onOpenChange(false);
        return;
      }
      const created = await clientsApi.create({ ...body, name: v.name } as ClientInput);
      if (hq?.city || hq?.state) {
        await clientsApi
          .addLocation(created.id, { ...blankToNull(withCoords(hq)), isPrimary: true })
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
      size="lg"
      asPage={asPage}
    >
      <FormSection title="Organisation">
        <Field label="Type" htmlFor="entityType">
          <Controller
            control={form.control}
            name="entityType"
            render={({ field }) => (
              <Segmented<ClientEntityType>
                value={field.value}
                onChange={field.onChange}
                options={Object.entries(ENTITY_TYPE).map(([value, label]) => ({
                  value: value as ClientEntityType,
                  label,
                }))}
                className="self-start"
              />
            )}
          />
        </Field>
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
        <FormGrid>
          <TextField
            form={form}
            name="employeeCount"
            label="Employees"
            placeholder="e.g. 1,200"
            inputMode="numeric"
          />
          <PickerField
            form={form}
            name="employeeSizeId"
            label="Employee size"
            hint="Left blank, it is picked from the number of employees."
            render={p => (
              <LookupPicker type="EMPLOYEE_SIZE" placeholder="From the count" clearable {...p} />
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
          {/* service lines are automatic: they follow the SPOCs added to the client */}
        </FormGrid>
      </FormSection>
      <FormSection
        title="Contact & group"
        hint="The organisation’s own office contact — people go in as SPOCs."
      >
        <FormGrid>
          <TextField
            form={form}
            name="email"
            label="Office email"
            placeholder="info@company.com"
            inputMode="email"
          />
          <TextField
            form={form}
            name="phone"
            label="Office phone"
            placeholder="080 1234 5678"
            inputMode="tel"
          />
        </FormGrid>
        <TextField
          form={form}
          name="groupName"
          label="Company group"
          placeholder="e.g. Adani Group"
        />
      </FormSection>
      {entityType === 'COMPANY' && (
        <FormSection
          title="Registration"
          hint="Company registration (MCA). Ownership is read from the CIN when left blank."
        >
          <FormGrid>
            <Field label="Ownership" htmlFor="ownership">
              <Controller
                control={form.control}
                name="ownership"
                render={({ field }) => (
                  <Segmented<string>
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: '', label: 'From CIN' },
                      { value: 'PRIVATE', label: 'Private' },
                      { value: 'CENTRAL_GOVT', label: 'Central govt' },
                      { value: 'STATE_GOVT', label: 'State govt' },
                    ]}
                    className="self-start"
                  />
                )}
              />
            </Field>
            <Field label="Listed" htmlFor="listed">
              <Controller
                control={form.control}
                name="listed"
                render={({ field }) => (
                  <Segmented<string>
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: '', label: 'Not known' },
                      { value: 'yes', label: 'Listed' },
                      { value: 'no', label: 'Not listed' },
                    ]}
                    className="self-start"
                  />
                )}
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <TextField
              form={form}
              name="companyClass"
              label="Company class"
              placeholder="Company limited by shares"
            />
            <TextField
              form={form}
              name="yearOfIncorporation"
              label="Incorporated (year)"
              placeholder="1998"
              inputMode="numeric"
            />
          </FormGrid>
        </FormSection>
      )}
      <FormSection
        title="CSR profile"
        hint="Only if the client does CSR — figures and programmes are added on the client page."
      >
        <FormGrid>
          <PickerField
            form={form}
            name="csrRoleId"
            label="CSR role"
            render={p => (
              <LookupPicker
                type="CSR_ROLE"
                placeholder="Donor / agency / foundation"
                clearable
                {...p}
              />
            )}
          />
          <Field label="CSR eligible" htmlFor="csrEligible">
            <Controller
              control={form.control}
              name="csrEligible"
              render={({ field }) => (
                <Segmented<string>
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: '', label: 'Not marked' },
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ]}
                  className="self-start"
                />
              )}
            />
          </Field>
        </FormGrid>
        <FormGrid>
          <TextField
            form={form}
            name="foundationName"
            label="Foundation"
            placeholder="e.g. Tata Steel Foundation"
          />
          <TextField
            form={form}
            name="foundationWebsite"
            label="Foundation website"
            inputMode="url"
          />
        </FormGrid>
      </FormSection>
      {entityType === 'GOVERNMENT' && (
        <FormSection title="Government body" hint="Tier, type, ministry and how they buy.">
          <FormGrid>
            <Field label="Tier" htmlFor="govt.level">
              <Controller
                control={form.control}
                name="govt.level"
                render={({ field }) => (
                  <Segmented<string>
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'CENTRAL', label: 'Central' },
                      { value: 'STATE', label: 'State' },
                      { value: 'DISTRICT', label: 'District' },
                      { value: 'LOCAL', label: 'Local' },
                    ]}
                    className="self-start"
                  />
                )}
              />
            </Field>
            <PickerField
              form={form}
              name="govt.orgTypeId"
              label="Body type"
              render={p => (
                <LookupPicker
                  type="GOVT_ORG_TYPE"
                  placeholder="Ministry, PSU, mission …"
                  clearable
                  {...p}
                />
              )}
            />
          </FormGrid>
          <FormGrid>
            <TextField
              form={form}
              name="govt.ministryName"
              label="Ministry"
              placeholder="Ministry of Skill Development…"
            />
            <TextField form={form} name="govt.departmentName" label="Department" />
          </FormGrid>
          <FormGrid>
            <TextField
              form={form}
              name="govt.stateSkillBody"
              label="State skill body"
              placeholder="e.g. Karnataka Skill Development Corporation"
            />
            <TextField form={form} name="govt.sector" label="Sector" />
          </FormGrid>
          <FormGrid cols={3}>
            <TextField
              form={form}
              name="govt.schemeType"
              label="Scheme type"
              placeholder="Scheme / Mission / Portal"
            />
            <TextField
              form={form}
              name="govt.tenderPortal"
              label="Tender portal"
              placeholder="gem.gov.in"
            />
            <TextField form={form} name="govt.tenderAuthority" label="Tender authority" />
          </FormGrid>
          <Field label="Priority" htmlFor="govt.priority">
            <Controller
              control={form.control}
              name="govt.priority"
              render={({ field }) => (
                <Segmented<string>
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: '', label: 'Not set' },
                    { value: 'H', label: 'High' },
                    { value: 'M', label: 'Medium' },
                    { value: 'L', label: 'Low' },
                  ]}
                  className="self-start"
                />
              )}
            />
          </Field>
        </FormSection>
      )}
      <FormSection title="Online">
        <FormGrid>
          <TextField
            form={form}
            name="website"
            label="Website"
            placeholder="asmltd.com"
            inputMode="url"
            // a typed website can't be trusted: once the client exists only an admin changes it
            readOnly={isEdit && !isSuperAdmin}
            hint={
              isEdit && !isSuperAdmin
                ? 'Only an admin changes it. If it does not open, run a step — the website check finds the current one.'
                : undefined
            }
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
          <LocationFields form={form} prefix="hq" />
        </FormSection>
      )}
    </FormDialog>
  );
}

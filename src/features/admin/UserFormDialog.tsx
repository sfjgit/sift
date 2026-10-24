// File: UserFormDialog.tsx
// Path: src/features/admin/UserFormDialog.tsx
//
// Create + edit a user, matching core-service createUserBody / updateUserBody.
// No password field: on create the backend emails a set-password link.
// Email is fixed after creation; BU / service-line lists are full replace.
// isSuperAdmin is only sent by super admins (the backend 403s otherwise).

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/states';
import { FormDialog, FormGrid, FormSection } from '@/components/forms/FormDialog';
import { Field, PickerField, SwitchField, TextField, applyServerErrors, blankToNull } from '@/components/forms/fields';
import { MasterPicker, RolePicker, UserPicker } from '@/components/pickers/pickers';
import { MasterMultiPicker } from '@/components/pickers/MultiCombobox';
import { useAuth } from '@/features/auth/AuthProvider';
import { userHooks } from '@/hooks/queries';
import { usersApi } from '@/lib/api/endpoints';
import { fullName } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import type { UserDetail, UserInput } from '@/types/org';

const text = (max: number) => z.string().trim().max(max, `Max ${max} characters`);
const date = z
  .string()
  .refine(v => v === '' || !isNaN(Date.parse(v)), 'Invalid date');

const baseSchema = z.object({
  email: z.string().trim().toLowerCase(),
  firstName: text(100).min(1, 'First name is required'),
  lastName: text(100).min(1, 'Last name is required'),
  middleName: text(100),
  displayName: text(100),
  employeeId: text(50),
  phone: text(20),
  workingLocation: text(200),
  timezone: text(100),
  dateOfBirth: date,
  dateOfJoin: date,
  roleId: z.string({ error: 'Role is required' }).min(1, 'Role is required'),
  departmentId: z.string().nullable(),
  designationId: z.string().nullable(),
  reportingToId: z.string().nullable(),
  teamLeadId: z.string().nullable(),
  businessUnitIds: z.array(z.string()),
  serviceLineIds: z.array(z.string()),
  isSuperAdmin: z.boolean(),
});

// email only matters on create — same shape either way so the form types stay simple
const buildSchema = (isEdit: boolean) =>
  baseSchema.refine(v => isEdit || z.email().safeParse(v.email).success, {
    message: 'Enter a valid email',
    path: ['email'],
  });

type Values = z.input<typeof baseSchema>;
type Output = z.output<typeof baseSchema>;

const ymd = (d?: string | null) => (d ? d.slice(0, 10) : '');

const toDefaults = (u?: UserDetail | null): Values => ({
  email: u?.email ?? '',
  firstName: u?.firstName ?? '',
  lastName: u?.lastName ?? '',
  middleName: u?.middleName ?? '',
  displayName: u?.displayName ?? '',
  employeeId: u?.employeeId ?? '',
  phone: u?.phone ?? '',
  workingLocation: u?.workingLocation ?? '',
  timezone: u?.timezone ?? '',
  dateOfBirth: ymd(u?.dateOfBirth),
  dateOfJoin: ymd(u?.dateOfJoin),
  roleId: u?.role?.id ?? '',
  departmentId: u?.department?.id ?? null,
  designationId: u?.designation?.id ?? null,
  reportingToId: u?.reportingTo?.id ?? null,
  teamLeadId: u?.teamLead?.id ?? null,
  businessUnitIds: u?.businessUnits?.map(b => b.businessUnit.id) ?? [],
  serviceLineIds: u?.serviceLines?.map(s => s.serviceLine.id) ?? [],
  isSuperAdmin: u?.isSuperAdmin ?? false,
});

const TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York'];
  }
})();

export function UserFormDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null / undefined = create */
  userId?: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const isEdit = !!userId;
  const detail = userHooks.useDetail(open && userId ? userId : null);
  const user = isEdit ? detail.data : null;

  const schema = useMemo(() => buildSchema(isEdit), [isEdit]);
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(schema), defaultValues: toDefaults() });
  const busy = form.formState.isSubmitting;

  // reset once per opening (not on background refetches, which would wipe edits)
  const resetFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      resetFor.current = null;
      return;
    }
    const key = isEdit ? (user?.id ?? null) : 'new';
    if (!key || resetFor.current === key) return;
    resetFor.current = key;
    form.reset(toDefaults(user));
  }, [open, isEdit, user, form]);

  const submit = form.handleSubmit(async v => {
    const { email, businessUnitIds, serviceLineIds, isSuperAdmin, dateOfBirth, dateOfJoin, ...rest } = v;
    const body: UserInput = {
      ...blankToNull(rest),
      firstName: rest.firstName,
      lastName: rest.lastName,
      roleId: rest.roleId,
      dateOfBirth: dateOfBirth || null,
      dateOfJoin: dateOfJoin || null,
      businessUnitIds,
      serviceLineIds,
      ...(me?.isSuperAdmin && { isSuperAdmin }),
    };
    try {
      if (isEdit && userId) {
        await usersApi.update(userId, body);
        toast.success(`${fullName(body)} updated`);
      } else {
        const created = await usersApi.create({ ...body, email });
        toast.success(`${fullName(created)} added`, {
          description: `A set-password email is on its way to ${created.email}.`,
          action: { label: 'Open', onClick: () => router.push(`/admin/users/${created.id}`) },
        });
      }
      qc.invalidateQueries({ queryKey: userHooks.keys.all });
      qc.invalidateQueries({ queryKey: ['user-options'] });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  const loadingDetail = isEdit && detail.isLoading;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={isEdit ? `Edit ${user ? fullName(user) : 'user'}` : 'New user'}
      description={
        isEdit
          ? 'Changes apply on their next request — no need for them to sign out.'
          : 'They’ll get an email with a link to set their own password (valid for 24 hours).'
      }
      onSubmit={submit}
      submitLabel={isEdit ? 'Save changes' : 'Create user'}
      busy={busy || loadingDetail}
    >
      {loadingDetail ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ))}
        </div>
      ) : isEdit && detail.error ? (
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
      ) : (
        <>
          <FormSection title="Person">
            <FormGrid cols={3}>
              <TextField form={form} name="firstName" label="First name" required autoFocus />
              <TextField form={form} name="middleName" label="Middle name" />
              <TextField form={form} name="lastName" label="Last name" required />
            </FormGrid>
            <FormGrid>
              <TextField
                form={form}
                name="displayName"
                label="Display name"
                hint="Shown instead of the full name, if set."
              />
              <TextField form={form} name="employeeId" label="Employee ID" placeholder="e.g. SF-0142" />
            </FormGrid>
          </FormSection>

          <FormSection title="Contact">
            <FormGrid>
              {isEdit ? (
                <Field label="Email" hint="Email can’t be changed after the account is created.">
                  <div className="flex h-8 items-center truncate rounded-lg border bg-muted/50 px-2.5 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                </Field>
              ) : (
                <TextField
                  form={form}
                  name="email"
                  label="Work email"
                  type="email"
                  required
                  autoComplete="off"
                  hint="The set-password link goes here."
                />
              )}
              <TextField form={form} name="phone" label="Phone" type="tel" />
            </FormGrid>
            <FormGrid>
              <TextField form={form} name="workingLocation" label="Working location" placeholder="e.g. Bengaluru office" />
              <TextField
                form={form}
                name="timezone"
                label="Timezone"
                list="user-timezones"
                autoComplete="off"
                placeholder="Asia/Kolkata"
              />
            </FormGrid>
            <datalist id="user-timezones">
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
            <FormGrid>
              <TextField form={form} name="dateOfJoin" label="Date of joining" type="date" />
              <TextField form={form} name="dateOfBirth" label="Date of birth" type="date" />
            </FormGrid>
          </FormSection>

          <FormSection title="Access & organisation">
            <FormGrid>
              <PickerField
                form={form}
                name="roleId"
                label="Role"
                required
                hint="Decides what they can see and do."
                render={p => <RolePicker {...p} clearable={false} placeholder="Pick a role" />}
              />
              <PickerField
                form={form}
                name="departmentId"
                label="Department"
                render={p => <MasterPicker kind="departments" {...p} />}
              />
            </FormGrid>
            <FormGrid>
              <PickerField
                form={form}
                name="designationId"
                label="Designation"
                render={p => <MasterPicker kind="designations" {...p} />}
              />
              <PickerField
                form={form}
                name="reportingToId"
                label="Reports to"
                render={p => (
                  <UserPicker {...p} selectedLabel={user?.reportingTo ? fullName(user.reportingTo) : undefined} />
                )}
              />
            </FormGrid>
            <FormGrid>
              <PickerField
                form={form}
                name="teamLeadId"
                label="Team lead"
                render={p => <UserPicker {...p} selectedLabel={user?.teamLead ? fullName(user.teamLead) : undefined} />}
              />
              <div className="hidden sm:block" />
            </FormGrid>
            <FormGrid>
              <Field label="Business units" htmlFor="businessUnitIds" hint="Used for BU-scoped access.">
                <Controller
                  control={form.control}
                  name="businessUnitIds"
                  render={({ field }) => (
                    <MasterMultiPicker
                      id="businessUnitIds"
                      kind="business-units"
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="None"
                    />
                  )}
                />
              </Field>
              <Field label="Service lines" htmlFor="serviceLineIds">
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
            {me?.isSuperAdmin && (
              <SwitchField
                form={form}
                name="isSuperAdmin"
                label="Super admin"
                hint="Bypasses every permission check and can sign in as other users. Grant sparingly."
              />
            )}
          </FormSection>
        </>
      )}
    </FormDialog>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import type {
  UserDetailResponse,
  UserFormDataResponse,
  UserSearchResponse,
  UpdateUserPayload,
} from '@/types/user.types';

// ── Zod schema for edit form ──────────────────────────────────────────────────

const editSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Role is required'),
  roleName: z.string().min(1, 'Role is required'),
  businessUnitId: z.string().optional(),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
  reportingToId: z.string().optional(),
  dateOfJoin: z.string().optional(),
  workingLocation: z.string().optional(),
  timezone: z.string().optional(),
  displayName: z.string().optional(),
  nickName: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

// ── Helper — format ISO date to yyyy-MM-dd for input[type=date] ───────────────
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().split('T')[0];
}

export default function UserEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const permission = usePermission('users');

  const [reportingSearch, setReportingSearch] = useState('');
  const [reportingLabel, setReportingLabel] = useState('');
  const [showReportingDropdown, setShowReportingDropdown] = useState(false);

  // Redirect if no canEdit
  useEffect(() => {
    if (!permission.canEdit) router.replace(`/users/${id}`);
  }, [permission.canEdit, id, router]);

  // ── Form ──────────────────────────────────────────────────────────────────
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      roleId: '',
      roleName: '',
      businessUnitId: '',
      employeeId: '',
      phone: '',
      reportingToId: '',
      dateOfJoin: '',
      workingLocation: '',
      timezone: '',
      displayName: '',
      nickName: '',
    },
  });

  const selectedBuId = form.watch('businessUnitId');

  // ── Fetch current user data — pre-fill form ───────────────────────────────
  const userQuery = useQuery<UserDetailResponse>({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await axios.get<UserDetailResponse>(`/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Pre-fill form once data arrives
  useEffect(() => {
    const user = userQuery.data?.data;
    if (!user) return;

    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleId: user.role.id,
      roleName: user.role.name,
      businessUnitId: user.businessUnit?.id ?? '',
      employeeId: user.employeeId ?? '',
      phone: user.phone ?? '',
      reportingToId: user.reportingTo?.id ?? '',
      dateOfJoin: toDateInput(user.dateOfJoin),
      workingLocation: user.workingLocation ?? '',
      timezone: user.timezone ?? '',
      displayName: user.displayName ?? '',
      nickName: user.nickName ?? '',
    });

    // Pre-fill reporting label so it shows the current manager name
    if (user.reportingTo) {
      setReportingLabel(`${user.reportingTo.firstName} ${user.reportingTo.lastName}`);
      setReportingSearch(`${user.reportingTo.firstName} ${user.reportingTo.lastName}`);
    }
  }, [userQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Form data — roles + BUs ───────────────────────────────────────────────
  const formDataQuery = useQuery<UserFormDataResponse>({
    queryKey: ['users-form-data'],
    queryFn: async () => {
      const res = await axios.get<UserFormDataResponse>('/users/form-data');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Reporting To lazy search ──────────────────────────────────────────────
  const reportingQuery = useQuery<UserSearchResponse>({
    queryKey: ['users-search', reportingSearch, selectedBuId],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (reportingSearch) q.set('q', reportingSearch);
      if (selectedBuId) q.set('buId', selectedBuId);
      const res = await axios.get<UserSearchResponse>(`/users/search?${q}`);
      return res.data;
    },
    enabled: showReportingDropdown && reportingSearch.length > 0,
    staleTime: 30 * 1000,
  });

  // ── Update mutation ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateUserPayload) => {
      const res = await axios.put(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      router.push(`/users/${id}`);
    },
  });

  function onSubmit(values: EditFormValues) {
    const payload: UpdateUserPayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      roleId: values.roleId,
      businessUnitId: values.businessUnitId || null,
      employeeId: values.employeeId || null,
      phone: values.phone || null,
      reportingToId: values.reportingToId || null,
      dateOfJoin: values.dateOfJoin ? new Date(values.dateOfJoin).toISOString() : null,
      workingLocation: values.workingLocation || null,
      timezone: values.timezone || null,
      displayName: values.displayName || null,
      nickName: values.nickName || null,
    };
    updateMutation.mutate(payload);
  }

  const formData = formDataQuery.data?.data;
  const isLoading = userQuery.isLoading || formDataQuery.isLoading;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (userQuery.isError) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load user.{' '}
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Edit User</h1>
          <p className="text-sm text-muted-foreground">
            {userQuery.data?.data.firstName} {userQuery.data?.data.lastName}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Basic Info ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input id="firstName" {...form.register('firstName')} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input id="lastName" {...form.register('lastName')} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...form.register('displayName')}
                  placeholder="How they appear in the app"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nickName">Nick Name</Label>
                <Input id="nickName" {...form.register('nickName')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input id="employeeId" {...form.register('employeeId')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Role & Organisation ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Role & Organisation</CardTitle>
            <CardDescription className="text-xs">
              Changing role immediately affects what this user can see and do.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role */}
            <div className="space-y-1.5">
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-green-600">
                Current Role : <span className="font-medium">{userQuery.data?.data.role.name}</span>
              </p>
              <Select
                value={form.watch('roleId')}
                onValueChange={v => form.setValue('roleId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.roles ?? []).map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="font-medium">{r.name.replace(/_/g, ' ')}</span>
                      {r.description && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          — {r.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.roleId && (
                <p className="text-xs text-destructive">{form.formState.errors.roleId.message}</p>
              )}
            </div>

            {/* Business Unit */}
            <div className="space-y-1.5">
              <Label>Business Unit</Label>
              <Select
                value={form.watch('businessUnitId') || 'none'}
                onValueChange={v => {
                  form.setValue('businessUnitId', v === 'none' ? '' : v);
                  // reset reportingTo when BU changes
                  form.setValue('reportingToId', '');
                  setReportingSearch('');
                  setReportingLabel('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a Business Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No BU</SelectItem>
                  {(formData?.businessUnits ?? []).map(bu => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reporting To — lazy search */}
            <div className="space-y-1.5">
              <Label>Reporting To</Label>
              <div className="relative">
                <Input
                  placeholder="Search by name or email…"
                  value={reportingSearch}
                  onChange={e => {
                    setReportingSearch(e.target.value);
                    setShowReportingDropdown(true);
                    // If user clears input, clear the stored ID too
                    if (!e.target.value) {
                      form.setValue('reportingToId', '');
                      setReportingLabel('');
                    }
                  }}
                  onFocus={() => setShowReportingDropdown(true)}
                  onBlur={() =>
                    // Small delay so click on dropdown item registers
                    setTimeout(() => setShowReportingDropdown(false), 150)
                  }
                />

                {showReportingDropdown &&
                  reportingSearch.length > 0 &&
                  reportingQuery.data?.data &&
                  reportingQuery.data.data.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {reportingQuery.data.data
                        // Don't show the user being edited as an option
                        .filter(u => u.id !== id)
                        .map(u => (
                          <button
                            key={u.id}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              form.setValue('reportingToId', u.id);
                              setReportingSearch(`${u.firstName} ${u.lastName}`);
                              setReportingLabel(`${u.firstName} ${u.lastName}`);
                              setShowReportingDropdown(false);
                            }}
                          >
                            <span className="font-medium">
                              {u.firstName} {u.lastName}
                            </span>
                            <span className="text-muted-foreground">
                              · {u.role.name.replace(/_/g, ' ')}
                            </span>
                            {u.employeeId && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {u.employeeId}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
              </div>

              {/* Show who is currently selected */}
              {form.watch('reportingToId') && reportingLabel && (
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{reportingLabel}</span>
                  <button
                    type="button"
                    className="ml-2 text-destructive hover:underline"
                    onClick={() => {
                      form.setValue('reportingToId', '');
                      setReportingSearch('');
                      setReportingLabel('');
                    }}
                  >
                    Remove
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Additional Details ───────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateOfJoin">Date of Joining</Label>
                <Input id="dateOfJoin" type="date" {...form.register('dateOfJoin')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" {...form.register('timezone')} placeholder="Asia/Kolkata" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="workingLocation">Working Location</Label>
              <Input
                id="workingLocation"
                {...form.register('workingLocation')}
                placeholder="Bangalore, Karnataka"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {updateMutation.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {(updateMutation.error as any)?.response?.data?.message ??
              'Failed to update user. Please try again.'}
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

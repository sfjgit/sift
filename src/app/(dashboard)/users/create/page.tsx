/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import type {
  UserFormDataResponse,
  UserSearchResponse,
  CreateUserPayload,
} from '@/types/user.types';

// ── Zod schema for create form ────────────────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Role is required'),
  businessUnitId: z.string().optional(),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
  reportingToId: z.string().optional(),
  dateOfJoin: z.string().optional(),
  workingLocation: z.string().optional(),
  timezone: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

export default function UserCreatePage() {
  const router = useRouter();
  const axios = useAxios();
  const permission = usePermission('users');

  // Redirect if no canAdd
  useEffect(() => {
    if (!permission.canAdd) router.replace('/users');
  }, [permission.canAdd, router]);

  const [reportingSearch, setReportingSearch] = useState('');

  // ── Form ──────────────────────────────────────────────────────────────────
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      roleId: '',
      businessUnitId: '',
      employeeId: '',
      phone: '',
      reportingToId: '',
      dateOfJoin: '',
      workingLocation: '',
      timezone: '',
    },
  });

  const selectedBuId = form.watch('businessUnitId');

  // ── Dropdowns — roles + BUs ───────────────────────────────────────────────
  const formDataQuery = useQuery<UserFormDataResponse>({
    queryKey: ['users-form-data'],
    queryFn: async () => {
      const res = await axios.get<UserFormDataResponse>('/users/form-data');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Reporting To — lazy search ────────────────────────────────────────────
  const reportingQuery = useQuery<UserSearchResponse>({
    queryKey: ['users-search', reportingSearch, selectedBuId],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (reportingSearch) q.set('q', reportingSearch);
      if (selectedBuId) q.set('buId', selectedBuId);
      const res = await axios.get<UserSearchResponse>(`/users/search?${q}`);
      return res.data;
    },
    enabled: true,
    staleTime: 30 * 1000,
  });

  // ── Create mutation ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const res = await axios.post('/users', payload);
      return res.data;
    },
    onSuccess: () => {
      router.push('/users');
    },
  });

  function onSubmit(values: CreateFormValues) {
    const payload: CreateUserPayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      roleId: values.roleId,
      businessUnitId: values.businessUnitId || null,
      employeeId: values.employeeId || null,
      phone: values.phone || null,
      reportingToId: values.reportingToId || null,
      dateOfJoin: values.dateOfJoin || null,
      workingLocation: values.workingLocation || null,
      timezone: values.timezone || null,
    };
    createMutation.mutate(payload);
  }

  const formData = formDataQuery.data?.data;

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Create User</h1>
          <p className="text-sm text-muted-foreground">Add a new user to TalentOS</p>
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
                <Input id="firstName" {...form.register('firstName')} placeholder="Priya" />
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
                <Input id="lastName" {...form.register('lastName')} placeholder="Menon" />
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
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="priya.menon@company.com"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                {...form.register('password')}
                placeholder="Min. 8 characters"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input id="employeeId" {...form.register('employeeId')} placeholder="EMP-0099" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...form.register('phone')} placeholder="+91 98765 43210" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Role & Organisation ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Role & Organisation</CardTitle>
            <CardDescription className="text-xs">
              Controls what the user can see and do across TalentOS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role */}
            <div className="space-y-1.5">
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
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
                      <div>
                        <span className="font-medium">{r.name.replace(/_/g, ' ')}</span>
                        {r.description && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            — {r.description}
                          </span>
                        )}
                      </div>
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
                  form.setValue('reportingToId', ''); // reset when BU changes
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
              <div className="space-y-1.5">
                <Input
                  placeholder="Search by name or email…"
                  value={reportingSearch}
                  onChange={e => setReportingSearch(e.target.value)}
                />
                {reportingQuery.data?.data &&
                  reportingQuery.data.data.length > 0 &&
                  reportingSearch && (
                    <div className="rounded-md border bg-popover shadow-md">
                      {reportingQuery.data.data.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            form.setValue('reportingToId', u.id);
                            setReportingSearch(`${u.firstName} ${u.lastName}`);
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

        {/* ── Error message ────────────────────────────────────────────── */}
        {createMutation.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {(createMutation.error as any)?.response?.data?.message ??
              'Failed to create user. Please try again.'}
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create User
          </Button>
        </div>
      </form>
    </div>
  );
}

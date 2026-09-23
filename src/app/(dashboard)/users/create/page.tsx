// File: page.tsx
// Path: src/app/users/create/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAxios } from '@/hooks/useAxios';
import { UserForm, type CreateFormValues } from '@/components/users/UserForm';
import { toast } from 'sonner';

export default function CreateUserPage() {
  const router = useRouter();
  const axios = useAxios();

  const rolesQuery = useQuery<{
    data: { id: string; name: string }[];
  }>({
    queryKey: ['roles-simple'],
    queryFn: async () => (await axios.get('/roles')).data,
    staleTime: 5 * 60 * 1000,
  });

  const deptsQuery = useQuery<{
    data: { id: string; name: string }[];
  }>({
    queryKey: ['departments-simple'],
    queryFn: async () => (await axios.get('/departments')).data,
    staleTime: 5 * 60 * 1000,
  });

  const buQuery = useQuery<{
    data: { id: string; name: string }[];
  }>({
    queryKey: ['business-units-simple'],
    queryFn: async () => (await axios.get('/business-units')).data,
    staleTime: 5 * 60 * 1000,
  });

  const slQuery = useQuery<{
    data: { id: string; name: string }[];
  }>({
    queryKey: ['Service-lines-simple'],
    queryFn: async () => (await axios.get('/service-lines')).data,
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useQuery<{
    data: {
      id: string;
      firstName: string;
      lastName: string;
    }[];
  }>({
    queryKey: ['users-simple-list'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true&sortBy=firstName')).data,
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth?.toISOString() ?? null,
        dateOfJoin: values.dateOfJoin?.toISOString() ?? null,
        middleName: values.middleName || null,
        nickName: values.nickName || null,
        displayName: values.displayName || null,
        employeeId: values.employeeId || null,
        phone: values.phone || null,
        workingLocation: values.workingLocation || null,
        timezone: values.timezone || null,
        departmentId: values.departmentId || null,
        reportingToId: values.reportingToId || null,
      };

      const res = await axios.post('/users', payload);
      return res.data;
    },

    onSuccess: data => {
      toast.success('User created successfully');
      router.push(`/users/${data.data.id}`);
    },

    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to create user';

      toast.error(msg);
    },
  });

  const isLoading =
    rolesQuery.isLoading ||
    deptsQuery.isLoading ||
    buQuery.isLoading ||
    slQuery.isLoading ||
    usersQuery.isLoading;

  const userOptions = (usersQuery.data?.data ?? []).map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
  }));

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="h-full overflow-y-auto overscroll-contain">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/users')}
              className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Users
            </Button>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Create User</h1>

                <p className="text-base text-muted-foreground mt-0.5">
                  Add a new user to the organisation
                </p>
              </div>
            </div>
          </div>

          {/* ── Form card ──────────────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card shadow-sm p-8">
            {isLoading ? (
              <FormSkeleton />
            ) : (
              <UserForm
                mode="create"
                roles={rolesQuery.data?.data ?? []}
                departments={deptsQuery.data?.data ?? []}
                businessUnits={buQuery.data?.data ?? []}
                serviceLines={slQuery.data?.data ?? []}
                users={userOptions}
                isSubmitting={createMutation.isPending}
                onSubmit={values => createMutation.mutate(values as CreateFormValues)}
                onCancel={() => router.push('/users')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />

            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-px w-full" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

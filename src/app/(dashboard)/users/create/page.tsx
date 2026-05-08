/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { UserForm, type CreateFormValues } from '@/components/users/UserForm';
import { toast } from 'sonner';

// ─── Form data types ──────────────────────────────────────────────────────────

export default function CreateUserPage() {
  const router = useRouter();
  const axios = useAxios();

  const rolesQuery = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['roles-simple'],
    queryFn: async () => (await axios.get('/roles')).data,
    staleTime: 5 * 60 * 1000,
  });

  const deptsQuery = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['departments-simple'],
    queryFn: async () => (await axios.get('/departments')).data,
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useQuery<{ data: { id: string; firstName: string; lastName: string }[] }>({
    queryKey: ['users-simple-list'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true&sortBy=firstName')).data,
    staleTime: 2 * 60 * 1000,
  });

  // ── Create mutation ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth?.toISOString() ?? null,
        dateOfJoin: values.dateOfJoin?.toISOString() ?? null,
        // strip empty strings → null
        middleName: values.middleName || null,
        nickName: values.nickName || null,
        displayName: values.displayName || null,
        employeeId: values.employeeId || null,
        phone: values.phone || null,
        workingLocation: values.workingLocation || null,
        timezone: values.timezone || null,
        departmentId: values.departmentId || null,
        reportingToId: values.reportingToId || null,
        teamLeadId: values.teamLeadId || null,
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

  const isLoading = rolesQuery.isLoading || deptsQuery.isLoading || usersQuery.isLoading;

  const userOptions = (usersQuery.data?.data ?? []).map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
  }));

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-none">Create User</h1>
          <p className="mt-1 text-sm text-muted-foreground">Add a new user to the organisation</p>
        </div>
      </div>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <FormSkeleton />
      ) : (
        <UserForm
          mode="create"
          roles={rolesQuery.data?.data ?? []}
          departments={deptsQuery.data?.data ?? []}
          users={userOptions}
          isSubmitting={createMutation.isPending}
          onSubmit={values => createMutation.mutate(values as CreateFormValues)}
          onCancel={() => router.push('/users')}
        />
      )}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

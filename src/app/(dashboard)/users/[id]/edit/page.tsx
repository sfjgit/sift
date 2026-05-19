/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { UserForm, type EditFormValues } from '@/components/users/UserForm';
import { toast } from 'sonner';

interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  nickName: string | null;
  displayName: string | null;
  employeeId: string | null;
  phone: string | null;
  workingLocation: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  dateOfJoin: string | null;
  isSuperAdmin: boolean;
  role: { id: string; name: string };
  department: { id: string; name: string } | null;
  reportingTo: { id: string; firstName: string; lastName: string } | null;
  teamLead: { id: string; firstName: string; lastName: string } | null;
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();

  // ── Current user data ─────────────────────────────────────────────────────
  const userQuery = useQuery<{ success: boolean; data: UserDetail }>({
    queryKey: ['user-detail', id],
    queryFn: async () => {
      const res = await axios.get(`/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

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

  // ── Update mutation ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (values: EditFormValues) => {
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
        // @ts-expect-error err
        teamLeadId: values.teamLeadId || null,
      };
      const res = await axios.put(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      // invalidate both the card (detail page) and the list
      qc.invalidateQueries({ queryKey: ['user-card', id] });
      qc.invalidateQueries({ queryKey: ['user-detail', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
      router.push(`/users/${id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update user';
      toast.error(msg);
    },
  });

  const isLoading =
    userQuery.isLoading || rolesQuery.isLoading || deptsQuery.isLoading || usersQuery.isLoading;
  const user = userQuery.data?.data;

  // ── Build defaultValues from existing user ────────────────────────────────
  const defaultValues: Partial<EditFormValues> | undefined = user
    ? {
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        nickName: user.nickName,
        displayName: user.displayName,
        employeeId: user.employeeId,
        phone: user.phone,
        workingLocation: user.workingLocation,
        timezone: user.timezone,
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
        dateOfJoin: user.dateOfJoin ? new Date(user.dateOfJoin) : null,
        roleId: user.role.id,
        departmentId: user.department?.id ?? null,
        reportingToId: user.reportingTo?.id ?? null,
        // @ts-expect-error err
        teamLeadId: user.teamLead?.id ?? null,
        isSuperAdmin: user.isSuperAdmin,
      }
    : undefined;

  const userOptions = (usersQuery.data?.data ?? [])
    // exclude self from reporting + teamlead dropdowns
    .filter(u => u.id !== id)
    .map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }));

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <UserCog className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-none">
            {isLoading ? 'Edit User' : `Edit — ${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update profile details and organisation structure
          </p>
        </div>
      </div>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <FormSkeleton />
      ) : (
        <UserForm
          mode="edit"
          defaultValues={defaultValues}
          roles={rolesQuery.data?.data ?? []}
          departments={deptsQuery.data?.data ?? []}
          users={userOptions}
          isSubmitting={updateMutation.isPending}
          onSubmit={values => updateMutation.mutate(values as EditFormValues)}
          onCancel={() => router.push(`/users/${id}`)}
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

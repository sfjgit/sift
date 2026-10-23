// File: page.tsx
// Path: src/app/users/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { useImpersonation, isCurrentUserSuperAdmin } from '@/lib/impersonation';
import { UserFilters } from '@/components/users/UserFilters';
import { UserTable } from '@/components/users/UserTable';
import type {
  UsersListParams,
  UsersListResponse,
  UserFormDataResponse,
  UserListItem,
  UserFilterOptionsResponse,
} from '@/types/user.types';

const DEFAULT_PARAMS: UsersListParams = { page: 1, limit: 25 };

// Any non-empty value goes into the query string
function buildQs(p: Record<string, unknown>): string {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  return q.toString();
}

function UsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const axios = useAxios();
  const qc = useQueryClient();
  const permission = usePermission('users');
  const impersonation = useImpersonation();

  // Read after mount to avoid SSR/hydration mismatch
  const [isRealSuperAdmin, setIsRealSuperAdmin] = useState(false);
  useEffect(() => setIsRealSuperAdmin(isCurrentUserSuperAdmin()), []);

  // Filters live in the URL
  const params = {
    ...DEFAULT_PARAMS,
    ...Object.fromEntries(searchParams.entries()),
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 25,
  } as UsersListParams;

  const setParams = (next: UsersListParams) =>
    router.replace(`?${buildQs(next as Record<string, unknown>)}`, { scroll: false });

  const handleParamChange = (changes: Partial<UsersListParams>) =>
    setParams({ ...params, ...changes, page: changes.page ?? 1 });

  const handleReset = () => setParams(DEFAULT_PARAMS);

  const listQs = buildQs(params as Record<string, unknown>);
  const filterQs = buildQs({ ...params, page: undefined, limit: undefined });

  // ── Users list ────────────────────────────────────────────────────────────
  const usersQuery = useQuery<UsersListResponse>({
    queryKey: ['users', listQs],
    queryFn: async () => {
      const res = await axios.get<UsersListResponse>(`/users?${listQs}`);
      const d = res.data;
      return { ...d, pagination: d.pagination ?? d.meta };
    },
    placeholderData: prev => prev,
  });

  // ── Form data (BUs) ───────────────────────────────────────────────────────
  const formDataQuery = useQuery<UserFormDataResponse>({
    queryKey: ['users-form-data'],
    queryFn: async () => (await axios.get<UserFormDataResponse>('/users/form-data')).data,
    staleTime: 5 * 60 * 1000,
  });

  // ── Filter options — refetch with current filters so dropdowns cascade ────
  const filterOptionsQuery = useQuery<UserFilterOptionsResponse>({
    queryKey: ['users-filter-options', filterQs],
    queryFn: async () =>
      (await axios.get<UserFilterOptionsResponse>(`/users/filter-options?${filterQs}`)).data,
    staleTime: 5 * 60 * 1000,
    placeholderData: prev => prev,
  });

  // ── Toggle active/inactive ────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async (user: UserListItem) => {
      await axios.patch(`/users/${user.id}/toggle`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // ── Login as user (super admin only) ──────────────────────────────────────
  const loginAsMutation = useMutation({
    mutationFn: async (user: UserListItem) => {
      await impersonation.start(user.id); // redirects on success
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message ?? 'Failed to login as user');
    },
  });

  const usersData = usersQuery.data;
  const formData = formDataQuery.data?.data;
  const filterOptions = filterOptionsQuery.data?.data;

  const effectivePermissions = usersData?.permissions ?? {
    canView: permission.canView,
    canAdd: permission.canAdd,
    canEdit: permission.canEdit,
    canDelete: permission.canDelete,
    scope: permission.scope,
  };

  const pagination = usersData ? (usersData.pagination ?? (usersData as any).meta) : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">Users</h1>
            {pagination && (
              <p className="mt-1 text-sm text-muted-foreground">{pagination.total} total</p>
            )}
          </div>
        </div>

        {effectivePermissions.canAdd && (
          <Button size="sm" onClick={() => router.push('/users/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <UserFilters
        params={params}
        businessUnits={formData?.businessUnits ?? []}
        filterOptions={filterOptions}
        isLoadingOptions={filterOptionsQuery.isFetching}
        onChange={handleParamChange}
        onReset={handleReset}
      />

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {usersQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {usersQuery.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load users. Please try again.
        </div>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && usersData && pagination && (
        <UserTable
          users={usersData.data}
          pagination={pagination}
          permissions={effectivePermissions}
          onPageChange={page => handleParamChange({ page })}
          onToggle={effectivePermissions.canEdit ? toggleMutation.mutate : undefined}
          isSuperAdmin={effectivePermissions?.canEdit}
          onLoginAs={isRealSuperAdmin ? loginAsMutation.mutate : undefined}
        />
      )}
    </div>
  );
}

// Next.js requires a Suspense boundary around useSearchParams
export default function UsersPage() {
  return (
    <Suspense>
      <UsersPageContent />
    </Suspense>
  );
}

// // File: page.tsx
// // Path: src/app/users/page.tsx
// /* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

// import { Suspense } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { Plus, Users } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Skeleton } from '@/components/ui/skeleton';
// import { useAxios } from '@/hooks/useAxios';
// import { usePermission } from '@/hooks/usePermission';
// import { UserFilters } from '@/components/users/UserFilters';
// import { UserTable } from '@/components/users/UserTable';
// import type {
//   UsersListParams,
//   UsersListResponse,
//   UserFormDataResponse,
//   UserListItem,
//   UserFilterOptionsResponse,
// } from '@/types/user.types';

// const DEFAULT_PARAMS: UsersListParams = { page: 1, limit: 25 };

// // Any non-empty value goes into the query string
// function buildQs(p: Record<string, unknown>): string {
//   const q = new URLSearchParams();
//   Object.entries(p).forEach(([k, v]) => {
//     if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
//   });
//   return q.toString();
// }

// function UsersPageContent() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const axios = useAxios();
//   const qc = useQueryClient();
//   const permission = usePermission('users');

//   // Filters live in the URL
//   const params = {
//     ...DEFAULT_PARAMS,
//     ...Object.fromEntries(searchParams.entries()),
//     page: Number(searchParams.get('page')) || 1,
//     limit: Number(searchParams.get('limit')) || 25,
//   } as UsersListParams;

//   const setParams = (next: UsersListParams) =>
//     router.replace(`?${buildQs(next as Record<string, unknown>)}`, { scroll: false });

//   const handleParamChange = (changes: Partial<UsersListParams>) =>
//     setParams({ ...params, ...changes, page: changes.page ?? 1 });

//   const handleReset = () => setParams(DEFAULT_PARAMS);

//   const listQs = buildQs(params as Record<string, unknown>);
//   const filterQs = buildQs({ ...params, page: undefined, limit: undefined });

//   // ── Users list ────────────────────────────────────────────────────────────
//   const usersQuery = useQuery<UsersListResponse>({
//     queryKey: ['users', listQs],
//     queryFn: async () => {
//       const res = await axios.get<UsersListResponse>(`/users?${listQs}`);
//       const d = res.data;
//       return { ...d, pagination: d.pagination ?? d.meta };
//     },
//     placeholderData: prev => prev,
//   });

//   // ── Form data (BUs) ───────────────────────────────────────────────────────
//   const formDataQuery = useQuery<UserFormDataResponse>({
//     queryKey: ['users-form-data'],
//     queryFn: async () => (await axios.get<UserFormDataResponse>('/users/form-data')).data,
//     staleTime: 5 * 60 * 1000,
//   });

//   // ── Filter options — refetch with current filters so dropdowns cascade ────
//   const filterOptionsQuery = useQuery<UserFilterOptionsResponse>({
//     queryKey: ['users-filter-options', filterQs],
//     queryFn: async () =>
//       (await axios.get<UserFilterOptionsResponse>(`/users/filter-options?${filterQs}`)).data,
//     staleTime: 5 * 60 * 1000,
//     placeholderData: prev => prev,
//   });

//   // ── Toggle active/inactive ────────────────────────────────────────────────
//   const toggleMutation = useMutation({
//     mutationFn: async (user: UserListItem) => {
//       await axios.patch(`/users/${user.id}/toggle`);
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ['users'] });
//     },
//   });

//   const usersData = usersQuery.data;
//   const formData = formDataQuery.data?.data;
//   const filterOptions = filterOptionsQuery.data?.data;

//   const effectivePermissions = usersData?.permissions ?? {
//     canView: permission.canView,
//     canAdd: permission.canAdd,
//     canEdit: permission.canEdit,
//     canDelete: permission.canDelete,
//     scope: permission.scope,
//   };

//   const pagination = usersData ? (usersData.pagination ?? (usersData as any).meta) : null;

//   return (
//     <div className="flex flex-col gap-6 p-6">
//       {/* ── Header ───────────────────────────────────────────────────────── */}
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-3">
//           <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
//             <Users className="h-5 w-5 text-primary" />
//           </div>
//           <div>
//             <h1 className="text-xl font-semibold leading-none">Users</h1>
//             {pagination && (
//               <p className="mt-1 text-sm text-muted-foreground">{pagination.total} total</p>
//             )}
//           </div>
//         </div>

//         {effectivePermissions.canAdd && (
//           <Button size="sm" onClick={() => router.push('/users/create')}>
//             <Plus className="mr-2 h-4 w-4" />
//             Create User
//           </Button>
//         )}
//       </div>

//       {/* ── Filters ──────────────────────────────────────────────────────── */}
//       <UserFilters
//         params={params}
//         businessUnits={formData?.businessUnits ?? []}
//         filterOptions={filterOptions}
//         isLoadingOptions={filterOptionsQuery.isFetching}
//         onChange={handleParamChange}
//         onReset={handleReset}
//       />

//       {/* ── Table ────────────────────────────────────────────────────────── */}
//       {usersQuery.isLoading && (
//         <div className="space-y-3">
//           {Array.from({ length: 8 }).map((_, i) => (
//             <Skeleton key={i} className="h-14 w-full rounded-md" />
//           ))}
//         </div>
//       )}

//       {usersQuery.isError && (
//         <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
//           Failed to load users. Please try again.
//         </div>
//       )}

//       {!usersQuery.isLoading && !usersQuery.isError && usersData && pagination && (
//         <UserTable
//           users={usersData.data}
//           pagination={pagination}
//           permissions={effectivePermissions}
//           onPageChange={page => handleParamChange({ page })}
//           onToggle={effectivePermissions.canEdit ? toggleMutation.mutate : undefined}
//           isSuperAdmin={effectivePermissions?.canEdit}
//         />
//       )}
//     </div>
//   );
// }

// // Next.js requires a Suspense boundary around useSearchParams
// export default function UsersPage() {
//   return (
//     <Suspense>
//       <UsersPageContent />
//     </Suspense>
//   );
// }

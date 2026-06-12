/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/roles/[id]/edit/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAxios } from '@/hooks/useAxios';
import { useScopeOptions } from '@/hooks/useScopeOptions'; // ← NEW
import { PermissionsMatrix } from '@/components/roles/PermissionsMatrix';
import type { RoleDetailResponse, PermissionRowPayload } from '@/types/role.types';

export default function RoleEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<PermissionRowPayload[]>([]);

  // ── Fetch role ────────────────────────────────────────────────────────────
  const roleQuery = useQuery<RoleDetailResponse>({
    queryKey: ['role', id],
    queryFn: async () => (await axios.get<RoleDetailResponse>(`/roles/${id}`)).data,
    enabled: !!id,
  });

  // ── Fetch modules ─────────────────────────────────────────────────────────
  const modulesQuery = useQuery<{ success: boolean; data: string[] }>({
    queryKey: ['role-modules'],
    queryFn: async () => (await axios.get('/roles/modules')).data,
    staleTime: Infinity,
  });

  // ── Fetch scopes from API — replaces hardcoded SCOPE_OPTIONS ──────────────
  const { scopeOptions, isLoading: scopeOptionsLoading } = useScopeOptions();

  // Populate form once role loads
  useEffect(() => {
    const role = roleQuery.data?.data;
    if (!role) return;
    setName(role.name.replace(/_/g, ' '));
    setDescription(role.description ?? '');
    setPermissions(role.permissions);
  }, [roleQuery.data]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        permissions,
      };
      return (await axios.put(`/roles/${id}`, payload)).data;
    },
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['role', id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      router.push(`/roles/${id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update role'),
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (roleQuery.isLoading || modulesQuery.isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (roleQuery.isError || !roleQuery.data?.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load role.{' '}
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const role = roleQuery.data.data;
  const modules: string[] = (role as any).modules ?? modulesQuery.data?.data ?? [];
  const activeCount = permissions.filter(
    p => p.canView || p.canAdd || p.canEdit || p.canDelete
  ).length;

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* ── Role header card ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <svg
              className="h-5 w-5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">Edit Role</p>
            <p className="text-sm text-muted-foreground">
              {role.name} · {activeCount} module{activeCount !== 1 ? 's' : ''} with access
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Role details ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Role details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Role name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={role.isSystem}
              placeholder="e.g. Sales Manager"
            />
            <p className="text-xs text-muted-foreground">
              Saved as:{' '}
              <span className="font-mono">{name.trim().toUpperCase().replace(/\s+/g, '_')}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="What does this role do?"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Permissions ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Permissions</CardTitle>
          <CardDescription>
            Toggle a module on, then set what actions are allowed and the data scope per action.
            Changes take effect immediately for all users with this role.
          </CardDescription>

          {/* Scope legend — built from API data, always current */}
          {!scopeOptionsLoading && scopeOptions.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
              {scopeOptions.map(o => (
                <span key={o.value}>
                  <span className="font-mono font-semibold text-foreground">{o.value}</span> ={' '}
                  {o.desc}
                </span>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm flex items-center gap-2">
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Could not load modules from server. Check the /roles/modules endpoint.
            </div>
          ) : (
            <PermissionsMatrix
              modules={modules}
              rows={permissions}
              scopeOptions={scopeOptions} // ← from API, never hardcoded
              scopeOptionsLoading={scopeOptionsLoading}
              onChange={setPermissions}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Bottom actions ────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2 pb-6">
        <Button variant="outline" onClick={() => router.back()} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

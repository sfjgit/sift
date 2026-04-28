'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { PermissionsMatrix } from '@/components/roles/PermissionsMatrix';
import type {
  RoleDetailResponse,
  ModulesResponse,
  UpdateRolePayload,
  PermissionRowPayload,
} from '@/types/role.types';

export default function RoleEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const permission = usePermission('settings');

  useEffect(() => {
    if (!permission.canEdit) router.replace(`/roles/${id}`);
  }, [permission.canEdit, id, router]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<PermissionRowPayload[]>([]);
  const [error, setError] = useState('');

  // ── Fetch role ────────────────────────────────────────────────────────────
  const roleQuery = useQuery<RoleDetailResponse>({
    queryKey: ['role', id],
    queryFn: async () => {
      const res = await axios.get<RoleDetailResponse>(`/roles/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // ── Fetch modules ─────────────────────────────────────────────────────────
  const modulesQuery = useQuery<ModulesResponse>({
    queryKey: ['role-modules'],
    queryFn: async () => {
      const res = await axios.get<ModulesResponse>('/roles/modules');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Pre-fill from existing role
  useEffect(() => {
    const role = roleQuery.data?.data;
    if (!role) return;
    setName(
      role.name
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase())
    );
    setDescription(role.description ?? '');
    setPermissions(
      role.permissions.map(p => ({
        module: p.module,
        canView: p.canView,
        canAdd: p.canAdd,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        scope: p.scope,
      }))
    );
  }, [roleQuery.data]);

  const modules = modulesQuery.data?.data ?? [];
  const role = roleQuery.data?.data;

  // ── Update mutation ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateRolePayload) => {
      const res = await axios.put(`/roles/${id}`, payload);
      return res.data;
    },
    onSuccess: () => router.push(`/roles/${id}`),
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to update role');
    },
  });

  function handleSubmit() {
    setError('');
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }

    const payload: UpdateRolePayload = {
      name: name.trim().toUpperCase().replace(/\s+/g, '_'),
      description: description.trim() || null,
      permissions,
    };
    updateMutation.mutate(payload);
  }

  if (roleQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Edit Role</h1>
          <p className="text-sm text-muted-foreground">{role?.name.replace(/_/g, ' ')}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Role info ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Role Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={role?.isSystem} // can't rename system roles
              />
              {role?.isSystem && (
                <p className="text-xs text-muted-foreground">
                  System role names cannot be changed.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Permissions matrix ───────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Permissions</CardTitle>
            <CardDescription className="text-xs">
              Changes take effect immediately for all users with this role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modulesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <PermissionsMatrix modules={modules} rows={permissions} onChange={setPermissions} />
            )}
          </CardContent>
        </Card>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

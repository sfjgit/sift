/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { PermissionsMatrix } from '@/components/roles/PermissionsMatrix';
import { SCOPE_OPTIONS } from '@/types/role.types';
import type { ModulesResponse, CreateRolePayload, PermissionRowPayload } from '@/types/role.types';

export default function RoleCreatePage() {
  const router = useRouter();
  const axios = useAxios();
  const permission = usePermission('settings');

  useEffect(() => {
    if (!permission.canAdd) router.replace('/roles');
  }, [permission.canAdd, router]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<PermissionRowPayload[]>([]);
  const [error, setError] = useState('');

  // ── Fetch modules ─────────────────────────────────────────────────────────
  const modulesQuery = useQuery<ModulesResponse>({
    queryKey: ['role-modules'],
    queryFn: async () => (await axios.get<ModulesResponse>('/roles/modules')).data,
    staleTime: Infinity,
  });

  const modules = modulesQuery.data?.data ?? [];

  // ── Create mutation ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: CreateRolePayload) => {
      const res = await axios.post('/roles', payload);
      return res.data;
    },
    onSuccess: () => router.push('/roles'),
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to create role'),
  });

  function handleSubmit() {
    setError('');
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }
    const hasAny = permissions.some(p => p.canView || p.canAdd || p.canEdit || p.canDelete);
    if (!hasAny) {
      setError('Add at least one permission');
      return;
    }

    const payload: CreateRolePayload = {
      name: name.trim().toUpperCase().replace(/\s+/g, '_'),
      description: description.trim() || null,
      permissions,
    };
    createMutation.mutate(payload);
  }

  return (
    <div className="w-full bg-blue-50 p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Create Role</h1>
          <p className="text-sm text-muted-foreground">
            Define what users with this role can see and do
          </p>
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
                placeholder="e.g. Senior Recruiter"
              />
              <p className="text-xs text-muted-foreground">
                Stored as uppercase with underscores e.g. SENIOR_RECRUITER
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this role do?"
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
              Check View first — Add, Edit, Delete auto-require it. Scope controls how much data the
              user sees within each action.
            </CardDescription>
            {/* Scope legend */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
              {SCOPE_OPTIONS.map(o => (
                <span key={o.value}>
                  <span className="font-mono font-semibold text-foreground">{o.value}</span> ={' '}
                  {
                    // @ts-expect-error err
                    o.desc
                  }
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {modulesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              // @ts-expect-error err
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
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Role
          </Button>
        </div>
      </div>
    </div>
  );
}

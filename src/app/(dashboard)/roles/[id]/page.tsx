/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { PermissionsMatrix } from '@/components/roles/PermissionsMatrix';
import type { RoleDetailResponse } from '@/types/role.types';

function getInitials(f: string, l: string) {
  return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();
}

export default function RoleDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('settings');

  const [showDelete, setShowDelete] = useState(false);

  // ── Fetch role ────────────────────────────────────────────────────────────
  const roleQuery = useQuery<RoleDetailResponse>({
    queryKey: ['role', id],
    queryFn: async () => {
      const res = await axios.get<RoleDetailResponse>(`/roles/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.delete(`/roles/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Role deleted');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      router.push('/roles');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to delete role'),
  });

  // ── Loading / error ───────────────────────────────────────────────────────
  if (roleQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
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

  // modules always returned from API — full system list
  // @ts-expect-error err
  const modules: string[] = role.modules ?? role.permissions.map(p => p.module).sort();

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {permission.canEdit && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/roles/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {permission.canDelete && !role.isSystem && (
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* ── Role info ────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-semibold">{role.name.replace(/_/g, ' ')}</h2>
                {role.isSystem ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                  >
                    System
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Custom
                  </Badge>
                )}
              </div>
              {role.description && (
                <p className="text-sm text-muted-foreground">{role.description}</p>
              )}
            </div>

            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 justify-end">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{role._count.users}</span>
                <span>user{role._count.users !== 1 ? 's' : ''}</span>
              </div>
              <div className="mt-0.5 text-xs">
                {
                  role.permissions.filter(p => p.canView || p.canAdd || p.canEdit || p.canDelete)
                    .length
                }{' '}
                modules with access
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Permissions matrix — read only ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionsMatrix
            modules={modules}
            // @ts-expect-error err
            rows={role.permissions}
            readOnly
          />
        </CardContent>
      </Card>

      {/* ── Users assigned ───────────────────────────────────────────────── */}
      {role.users.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assigned Users ({role._count.users})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {role.users.map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[11px]">
                        {getInitials(u.firstName, u.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  {u.employeeId && (
                    <p className="text-xs text-muted-foreground font-mono">{u.employeeId}</p>
                  )}
                </div>
              ))}
              {role._count.users > 50 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing 50 of {role._count.users} users
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Delete dialog ─────────────────────────────────────────────────── */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{role.name.replace(/_/g, ' ')}</span>?
              This cannot be undone.
              {role._count.users > 0 && (
                <span className="mt-2 block text-destructive">
                  {role._count.users} user(s) are assigned — reassign them before deleting.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || role._count.users > 0}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

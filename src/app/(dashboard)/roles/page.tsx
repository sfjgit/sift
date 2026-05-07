'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Trash2, Pencil, Eye, Search, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { formatModule } from '@/types/role.types';
import type { RolesListResponse, RoleListItem } from '@/types/role.types';

export default function RolesPage() {
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('settings');

  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RoleListItem | null>(null);

  // ── Fetch roles ───────────────────────────────────────────────────────────
  const rolesQuery = useQuery<RolesListResponse>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await axios.get<RolesListResponse>('/roles');
      return res.data;
    },
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/roles/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeleteTarget(null);
    },
  });

  // ── Filter ────────────────────────────────────────────────────────────────
  const roles = rolesQuery.data?.data ?? [];
  const filtered = roles.filter(
    r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">Roles</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {roles.length} role{roles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {permission.canAdd && (
          <Button size="sm" onClick={() => router.push('/roles/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        )}
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search roles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {rolesQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {rolesQuery.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load roles.
        </div>
      )}

      {!rolesQuery.isLoading && !rolesQuery.isError && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No roles found.
                  </TableCell>
                </TableRow>
              )}

              {filtered.map(role => (
                <TableRow
                  key={role.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/roles/${role.id}`)}
                >
                  <TableCell>
                    <span className="font-medium">{role.name.replace(/_/g, ' ')}</span>
                  </TableCell>

                  <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                    <span className="block truncate">{role.description ?? '—'}</span>
                  </TableCell>

                  {/* show modules that have at least one permission enabled */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions
                        .filter(p => p.canView || p.canAdd || p.canEdit || p.canDelete)
                        .slice(0, 3)
                        .map(p => (
                          <Badge
                            key={p.module}
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            {formatModule(p.module)}
                          </Badge>
                        ))}
                      {role.permissions.filter(
                        p => p.canView || p.canAdd || p.canEdit || p.canDelete
                      ).length > 3 && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          +
                          {role.permissions.filter(
                            p => p.canView || p.canAdd || p.canEdit || p.canDelete
                          ).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center text-sm tabular-nums">
                    {role._count.users}
                  </TableCell>

                  <TableCell className="text-center">
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
                  </TableCell>

                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => router.push(`/roles/${role.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>

                        {permission.canEdit && (
                          <DropdownMenuItem onClick={() => router.push(`/roles/${role.id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}

                        {permission.canDelete && !role.isSystem && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(role)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name.replace(/_/g, ' ')}
              </span>
              ? This cannot be undone.
              {!!deleteTarget && deleteTarget._count.users > 0 && (
                <span className="mt-2 block text-destructive">
                  This role has {deleteTarget._count.users} user(s) assigned — reassign them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending || (deleteTarget?._count.users ?? 0) > 0}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAxios } from '@/hooks/useAxios';
import { UserStatusBadge } from './UserStatusBadge';
import { UserRoleBadge } from './UserRoleBadge';
import { UserTeamChips } from './UserTeamChips';
import { DeactivateDialog } from './DeactivateDialog';
import type { UserListItem, Pagination, ModulePermissions } from '@/types/user.types';

interface Props {
  users: UserListItem[];
  pagination: Pagination;
  permissions: ModulePermissions;
  onPageChange: (page: number) => void;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function UserTable({ users, pagination, permissions, onPageChange }: Props) {
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();

  const [deactivateTarget, setDeactivateTarget] = useState<UserListItem | null>(null);

  // ── Deactivate mutation ────────────────────────────────────────────────────
  const deactivateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await axios.put(`/users/${id}/deactivate`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeactivateTarget(null);
    },
  });

  // ── Reactivate mutation ────────────────────────────────────────────────────
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.put(`/users/${id}/reactivate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[220px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}

            {users.map(user => (
              <TableRow
                key={user.id}
                className="cursor-pointer"
                onClick={() => router.push(`/users/${user.id}`)}
              >
                {/* Avatar + Name + Email */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-none">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>
                  <UserRoleBadge roleName={user.role.name} isSuperAdmin={user.isSuperAdmin} />
                </TableCell>

                {/* BU */}
                <TableCell className="text-sm text-muted-foreground">
                  {user.businessUnit?.name ?? '—'}
                </TableCell>

                {/* Teams */}
                <TableCell>
                  <UserTeamChips memberships={user.teamMemberships} />
                </TableCell>

                {/* Employee ID */}
                <TableCell className="text-sm text-muted-foreground">
                  {user.employeeId ?? '—'}
                </TableCell>

                {/* Joined */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(user.dateOfJoin)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <UserStatusBadge isActive={user.isActive} />
                </TableCell>

                {/* Actions */}
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>

                      {/* Edit — only if canEdit */}
                      {permissions.canEdit && (
                        <DropdownMenuItem onClick={() => router.push(`/users/${user.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}

                      {/* Deactivate / Reactivate — only if canDelete */}
                      {permissions.canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          {user.isActive ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeactivateTarget(user)}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => reactivateMutation.mutate(user.id)}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
          <span>
            Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            users
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Deactivate confirm dialog */}
      <DeactivateDialog
        open={!!deactivateTarget}
        userName={
          deactivateTarget ? `${deactivateTarget.firstName} ${deactivateTarget.lastName}` : ''
        }
        isLoading={deactivateMutation.isPending}
        onConfirm={reason => {
          if (deactivateTarget) {
            deactivateMutation.mutate({ id: deactivateTarget.id, reason });
          }
        }}
        onCancel={() => setDeactivateTarget(null)}
      />
    </>
  );
}

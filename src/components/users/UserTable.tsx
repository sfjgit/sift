'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  MoreHorizontal,
  UserCheck,
  UserX,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Users,
  Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserListItem, UsersListPermissions } from '@/types/user.types';

interface Props {
  users: UserListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  permissions: UsersListPermissions;
  onPageChange: (page: number) => void;
  onToggle?: (user: UserListItem) => void;
}

function initials(u: UserListItem) {
  return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
}

function avatarColor(id: string) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-indigo-100 text-indigo-700',
    'bg-orange-100 text-orange-700',
  ];
  const idx = id.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function UserTable({ users, pagination, permissions, onPageChange, onToggle }: Props) {
  const router = useRouter();

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No users found</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[260px] pl-4">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Reporting To</TableHead>
              <TableHead>Team Lead</TableHead>
              <TableHead className="text-center">Reqs</TableHead>
              <TableHead className="text-center">Spocs</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              {(permissions.canEdit || permissions.canDelete) && (
                <TableHead className="w-10 pr-4" />
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.map(user => (
              <TableRow
                key={user.id}
                className="group cursor-pointer"
                onClick={() => router.push(`/users/${user.id}`)}
              >
                {/* Name + email + employeeId */}
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={`text-xs font-semibold ${avatarColor(user.id)}`}>
                        {initials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-none">
                        {user.displayName ?? `${user.firstName} ${user.lastName}`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                      {user.employeeId && (
                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                          #{user.employeeId}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>
                  <span className="text-xs font-medium">{user.role.name.replace(/_/g, ' ')}</span>
                </TableCell>

                {/* Department */}
                <TableCell>
                  {user.department ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[120px]">{user.department.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>

                {/* Reporting To */}
                <TableCell>
                  {user.reportingTo ? (
                    <span className="text-xs text-muted-foreground">
                      {user.reportingTo.firstName} {user.reportingTo.lastName}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>

                {/* Team Lead */}
                <TableCell>
                  {user.teamLead ? (
                    <span className="text-xs text-muted-foreground">
                      {user.teamLead.firstName} {user.teamLead.lastName}
                    </span>
                  ) : user._count.teamMembers > 0 ? (
                    <Badge variant="secondary" className="text-xs font-normal gap-1 px-1.5 py-0">
                      <Users className="h-3 w-3" />
                      Lead ({user._count.teamMembers})
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>

                {/* Active reqs */}
                <TableCell className="text-center">
                  {user._count.assignmentsReceived > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{user._count.assignmentsReceived}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">0</span>
                  )}
                </TableCell>

                {/* Spocs handled */}
                <TableCell className="text-center">
                  {user._count.spocsHandled > 0 ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {user._count.spocsHandled}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>

                {/* Date of join */}
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {user.dateOfJoin ? format(new Date(user.dateOfJoin), 'dd MMM yyyy') : '—'}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant={user.isActive ? 'default' : 'secondary'}
                    className={`text-xs ${
                      user.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>

                {/* Actions */}
                {(permissions.canEdit || permissions.canDelete) && (
                  <TableCell
                    className="pr-4"
                    onClick={e => e.stopPropagation()} // don't navigate on menu click
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => router.push(`/users/${user.id}`)}
                          className="gap-2 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> View profile
                        </DropdownMenuItem>

                        {permissions.canEdit && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/users/${user.id}/edit`)}
                            className="gap-2 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                        )}

                        {permissions.canEdit && onToggle && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onToggle(user)}
                              className={`gap-2 text-xs ${
                                user.isActive
                                  ? 'text-destructive focus:text-destructive'
                                  : 'text-emerald-600 focus:text-emerald-600'
                              }`}
                            >
                              {user.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5" /> Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-medium text-foreground">{pagination.total}</span>
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
              // show pages around current
              let p: number;
              if (pagination.pages <= 5) {
                p = i + 1;
              } else if (pagination.page <= 3) {
                p = i + 1;
              } else if (pagination.page >= pagination.pages - 2) {
                p = pagination.pages - 4 + i;
              } else {
                p = pagination.page - 2 + i;
              }
              return (
                <Button
                  key={p}
                  variant={p === pagination.page ? 'default' : 'outline'}
                  size="icon"
                  className="h-7 w-7 text-xs"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={pagination.page >= pagination.pages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

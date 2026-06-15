// File: UserTable.tsx
// Path: src/components/users/UserTable.tsx

'use client';

import { useState } from 'react';
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
  KeyRound,
  Eye as EyeIcon,
  EyeOff,
  Loader2,
  Network,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserListItem, UsersListPermissions } from '@/types/user.types';
import { toast } from 'sonner';
import { useAxios } from '@/hooks/useAxios';
import { ManageAssignableDMs } from './ManageAssignableDMs';

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
  isSuperAdmin?: boolean;
}

interface ResetState {
  open: boolean;
  user: UserListItem | null;
  password: string;
  confirm: string;
  show: boolean;
  showConfirm: boolean;
  loading: boolean;
}

const RESET_INIT: ResetState = {
  open: false,
  user: null,
  password: '',
  confirm: '',
  show: false,
  showConfirm: false,
  loading: false,
};

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
  return colors[id.charCodeAt(0) % colors.length];
}

export function UserTable({
  users,
  pagination,
  permissions,
  onPageChange,
  onToggle,
  isSuperAdmin = false,
}: Props) {
  const router = useRouter();
  const [reset, setReset] = useState<ResetState>(RESET_INIT);
  const axios = useAxios();

  // ── Manage DMs dialog state ───────────────────────────────────────────────
  const [dmDialog, setDmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: '', userName: '' });

  // ── Password reset validation ─────────────────────────────────────────────
  const passwordError =
    reset.password.length > 0 && reset.password.length < 8 ? 'Minimum 8 characters' : '';
  const confirmError =
    reset.confirm.length > 0 && reset.confirm !== reset.password ? 'Passwords do not match' : '';
  const canSubmit =
    reset.password.length >= 8 && reset.confirm === reset.password && !reset.loading;

  function openReset(user: UserListItem) {
    setReset({ ...RESET_INIT, open: true, user });
  }

  function closeReset() {
    if (reset.loading) return;
    setReset(RESET_INIT);
  }

  async function handleResetSubmit() {
    if (!canSubmit || !reset.user) return;
    setReset(s => ({ ...s, loading: true }));
    try {
      await axios.patch(`/users/${reset.user.id}/reset-password`, {
        newPassword: reset.password,
      });
      toast.success(
        `Password reset for ${reset.user.firstName} ${reset.user.lastName}. All sessions invalidated.`
      );
      setReset(RESET_INIT);
    } catch {
      toast.error('Network error. Please try again.');
      setReset(s => ({ ...s, loading: false }));
    }
  }

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
    <>
      <div className="flex flex-col gap-3">
        {/* ── Table ── */}
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
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
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
                        <span className="text-xs font-medium">
                          {user._count.assignmentsReceived}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">0</span>
                    )}
                  </TableCell>

                  {/* Spocs handled */}
                  <TableCell className="text-center">
                    {user._count.spocsHandled > 0 ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
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
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  {(permissions.canEdit || permissions.canDelete) && (
                    <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
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
                        <DropdownMenuContent align="end" className="w-52">
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

                          {/* ── Manage extended assignable DMs ── */}
                          {permissions.canEdit && (
                            <DropdownMenuItem
                              onClick={() =>
                                setDmDialog({
                                  open: true,
                                  userId: user.id,
                                  userName: `${user.firstName} ${user.lastName}`,
                                })
                              }
                              className="gap-2 text-xs text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                            >
                              <Network className="h-3.5 w-3.5" /> Manage assignable DMs
                            </DropdownMenuItem>
                          )}

                          {/* ── Reset password — superAdmin only ── */}
                          {isSuperAdmin && permissions.canEdit && (
                            <DropdownMenuItem
                              onClick={() => openReset(user)}
                              className="gap-2 text-xs text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                            >
                              <KeyRound className="h-3.5 w-3.5" /> Reset password
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

        {/* ── Pagination ── */}
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
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                let p: number;
                if (pagination.pages <= 5) p = i + 1;
                else if (pagination.page <= 3) p = i + 1;
                else if (pagination.page >= pagination.pages - 2) p = pagination.pages - 4 + i;
                else p = pagination.page - 2 + i;
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

      {/* ── Manage Assignable DMs Dialog ── */}
      <ManageAssignableDMs
        open={dmDialog.open}
        userId={dmDialog.userId}
        userName={dmDialog.userName}
        onClose={() => setDmDialog({ open: false, userId: '', userName: '' })}
      />

      {/* ── Reset Password Dialog ── */}
      <Dialog open={reset.open} onOpenChange={closeReset}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-amber-500" />
              Reset password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Setting a new password for{' '}
              <span className="font-medium text-foreground">
                {reset.user?.firstName} {reset.user?.lastName}
              </span>
              . All active sessions will be invalidated immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-new" className="text-xs font-medium">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="rp-new"
                  type={reset.show ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={reset.password}
                  onChange={e => setReset(s => ({ ...s, password: e.target.value }))}
                  className={`pr-9 text-sm ${passwordError ? 'border-destructive' : ''}`}
                  disabled={reset.loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setReset(s => ({ ...s, show: !s.show }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {reset.show ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <EyeIcon className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-confirm" className="text-xs font-medium">
                Confirm password
              </Label>
              <div className="relative">
                <Input
                  id="rp-confirm"
                  type={reset.showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={reset.confirm}
                  onChange={e => setReset(s => ({ ...s, confirm: e.target.value }))}
                  className={`pr-9 text-sm ${confirmError ? 'border-destructive' : ''}`}
                  disabled={reset.loading}
                  autoComplete="new-password"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleResetSubmit();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setReset(s => ({ ...s, showConfirm: !s.showConfirm }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {reset.showConfirm ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <EyeIcon className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {confirmError && <p className="text-xs text-destructive">{confirmError}</p>}
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-700">
                The user will be logged out of all devices and must sign in again with the new
                password.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={closeReset}
              disabled={reset.loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResetSubmit}
              disabled={!canSubmit}
              className="gap-1.5 text-xs min-w-[110px]"
            >
              {reset.loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resetting…
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" /> Reset password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

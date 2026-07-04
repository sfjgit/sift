/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Trash2,
  Crown,
  BadgeCheck,
  UserCircle2,
  Users,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import type {
  TeamDetailResponse,
  TeamMembersResponse,
  AvailableUsersResponse,
  AvailableUser,
  TeamMemberFull,
  TeamRole,
} from '@/types/team.types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ini = (f: string, l: string) => `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();

const ROLE_CFG: Record<TeamRole, { label: string; icon: React.ElementType; cls: string }> = {
  LEAD: { label: 'Lead', icon: Crown, cls: 'text-amber-500' },
  CO_LEAD: { label: 'Co-lead', icon: BadgeCheck, cls: 'text-blue-500' },
  MEMBER: { label: 'Member', icon: UserCircle2, cls: 'text-muted-foreground' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Remove dialog
// ─────────────────────────────────────────────────────────────────────────────

function RemoveDialog({
  member,
  teamId,
  open,
  onClose,
}: {
  member: TeamMemberFull | null;
  teamId: string;
  open: boolean;
  onClose: () => void;
}) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const removeMutation = useMutation({
    mutationFn: async () =>
      (
        await axios.delete(`/teams/${teamId}/members/${member!.user.id}`, {
          data: { reason: reason || undefined },
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['available-users', teamId] });
      onClose();
      setReason('');
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={v => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Member</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Remove{' '}
                <span className="font-medium text-foreground">
                  {member?.user.firstName} {member?.user.lastName}
                </span>{' '}
                from this team?
              </p>
              <div className="space-y-2">
                <Label className="text-xs">Reason (optional)</Label>
                <Textarea
                  placeholder="e.g. Project completed, transferred to another team…"
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onClose();
              setReason('');
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? 'Removing…' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamMembersPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('teams');

  const [search, setSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [removingMember, setRemovingMember] = useState<TeamMemberFull | null>(null);
  const [addingUsers, setAddingUsers] = useState<Map<string, TeamRole>>(new Map());

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: teamData, isLoading: loadingTeam } = useQuery<TeamDetailResponse>({
    queryKey: ['team', id],
    queryFn: async () => (await axios.get<TeamDetailResponse>(`/teams/${id}`)).data,
    enabled: !!id,
  });

  const { data: membersData, isLoading: loadingMembers } = useQuery<TeamMembersResponse>({
    queryKey: ['team-members', id],
    queryFn: async () => (await axios.get<TeamMembersResponse>(`/teams/${id}/members`)).data,
    enabled: !!id,
  });

  const { data: availableData, isLoading: loadingAvailable } = useQuery<AvailableUsersResponse>({
    queryKey: ['available-users', id, addSearch],
    queryFn: async () => {
      const params = addSearch ? `?search=${encodeURIComponent(addSearch)}` : '';
      return (await axios.get<AvailableUsersResponse>(`/teams/${id}/available-users${params}`))
        .data;
    },
    enabled: !!id,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: async (members: Array<{ userId: string; teamRole: TeamRole }>) =>
      (await axios.post(`/teams/${id}/members`, { members })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['team-members', id] });
      queryClient.invalidateQueries({ queryKey: ['available-users', id] });
      setAddingUsers(new Map());
    },
  });

  const roleChangeMutation = useMutation({
    mutationFn: async ({ userId, teamRole }: { userId: string; teamRole: TeamRole }) =>
      (await axios.patch(`/teams/${id}/members/${userId}/role`, { teamRole })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['team-members', id] });
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const team = teamData?.data;
  const members = membersData?.data ?? [];
  const available = availableData?.data ?? [];

  const filteredMembers = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      m.user.employeeId?.toLowerCase().includes(q)
    );
  });

  const leadership = filteredMembers.filter(m => m.teamRole !== 'MEMBER');
  const regular = filteredMembers.filter(m => m.teamRole === 'MEMBER');

  const toggleAddUser = (userId: string) => {
    setAddingUsers(prev => {
      const next = new Map(prev);
      if (next.has(userId)) next.delete(userId);
      else next.set(userId, 'MEMBER');
      return next;
    });
  };

  const setUserRole = (userId: string, role: TeamRole) => {
    setAddingUsers(prev => {
      const n = new Map(prev);
      n.set(userId, role);
      return n;
    });
  };

  const handleAddSelected = () => {
    if (!addingUsers.size) return;
    addMutation.mutate(
      Array.from(addingUsers.entries()).map(([userId, teamRole]) => ({ userId, teamRole }))
    );
  };

  if (loadingTeam) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-5">
      {/* Topbar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/teams/${id}`)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to {team?.name}
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Manage Members</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {team?.name} · {members.length} active member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Current members ──────────────────────────────────────────── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="text-sm font-medium">Current members ({members.length})</h2>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search members…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>

          {loadingMembers ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No members match' : 'No members yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40 max-h-[480px] overflow-y-auto">
              {/* Leadership */}
              {leadership.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-muted/30">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Leadership
                    </p>
                  </div>
                  {leadership.map(m => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      canEdit={permission.canEdit === true}
                      onRemove={() => setRemovingMember(m)}
                      onRoleChange={role =>
                        roleChangeMutation.mutate({ userId: m.user.id, teamRole: role })
                      }
                      roleChangePending={roleChangeMutation.isPending}
                    />
                  ))}
                </div>
              )}
              {/* Regular members */}
              {regular.length > 0 && (
                <div>
                  {leadership.length > 0 && (
                    <div className="px-5 py-2 bg-muted/30">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Members ({regular.length})
                      </p>
                    </div>
                  )}
                  {regular.map(m => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      canEdit={permission.canEdit === true}
                      onRemove={() => setRemovingMember(m)}
                      onRoleChange={role =>
                        roleChangeMutation.mutate({ userId: m.user.id, teamRole: role })
                      }
                      roleChangePending={roleChangeMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Add members ──────────────────────────────────────────────── */}
        {permission.canEdit && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-sm font-medium">Add members</h2>
              {addingUsers.size > 0 && (
                <Button size="sm" onClick={handleAddSelected} disabled={addMutation.isPending}>
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Add {addingUsers.size} selected
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Add search */}
            <div className="px-4 py-3 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID…"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
                {addSearch && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setAddSearch('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {loadingAvailable ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : available.length === 0 ? (
              <div className="py-10 text-center">
                <UserPlus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {addSearch ? 'No users match' : 'All BU users are already members'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-[480px] overflow-y-auto">
                {available.map(user => {
                  const isSelected = addingUsers.has(user.id);
                  const selectedRole = addingUsers.get(user.id) ?? 'MEMBER';
                  return (
                    <div
                      key={user.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                      )}
                    >
                      <button className="shrink-0" onClick={() => toggleAddUser(user.id)}>
                        <div
                          className={cn(
                            'h-4 w-4 rounded border-2 transition-colors flex items-center justify-center',
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-border hover:border-primary'
                          )}
                        >
                          {isSelected && (
                            <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                          )}
                        </div>
                      </button>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-[11px]">
                          {ini(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">
                          {user.firstName} {user.lastName}
                          {user.employeeId && (
                            <span className="ml-1.5 text-[11px] font-mono text-muted-foreground">
                              {user.employeeId}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {user.role.name.replace(/_/g, ' ')}
                        </Badge>
                        {isSelected && (
                          <Select
                            value={selectedRole}
                            onValueChange={v => setUserRole(user.id, v as TeamRole)}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LEAD">Lead</SelectItem>
                              <SelectItem value="CO_LEAD">Co-lead</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {addMutation.isError && (
              <div className="px-4 py-3 border-t border-border/40 text-xs text-destructive">
                {(addMutation.error as any)?.response?.data?.message ?? 'Failed to add members'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove dialog */}
      <RemoveDialog
        member={removingMember}
        teamId={id}
        open={!!removingMember}
        onClose={() => setRemovingMember(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Member row (extracted for cleanliness)
// ─────────────────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  canEdit,
  onRemove,
  onRoleChange,
  roleChangePending,
}: {
  member: TeamMemberFull;
  canEdit: boolean;
  onRemove: () => void;
  onRoleChange: (role: TeamRole) => void;
  roleChangePending: boolean;
}) {
  const cfg = ROLE_CFG[member.teamRole];
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-[11px]">
          {ini(member.user.firstName, member.user.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">
          {member.user.firstName} {member.user.lastName}
          {member.user.employeeId && (
            <span className="ml-1.5 text-[11px] font-mono text-muted-foreground">
              {member.user.employeeId}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.user.email}</p>
      </div>

      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-1 text-[11px] border border-border/60 rounded px-2 py-1 hover:bg-muted/40 transition-colors',
                cfg.cls
              )}
              disabled={roleChangePending}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
              <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {(['LEAD', 'CO_LEAD', 'MEMBER'] as TeamRole[]).map(role => (
              <DropdownMenuItem
                key={role}
                className={cn('text-xs', role === member.teamRole && 'font-medium')}
                onClick={() => role !== member.teamRole && onRoleChange(role)}
              >
                {ROLE_CFG[role].label}
                {role === member.teamRole && ' ✓'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className={cn('flex items-center gap-1 text-[11px]', cfg.cls)}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      )}

      {canEdit && (
        <button
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

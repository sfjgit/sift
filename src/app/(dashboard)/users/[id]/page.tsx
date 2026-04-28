'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  UserX,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Hash,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { UserStatusBadge } from '@/components/users/UserStatusBadge';
import { UserRoleBadge } from '@/components/users/UserRoleBadge';
import { DeactivateDialog } from '@/components/users/DeactivateDialog';
import { useState } from 'react';
import type { UserDetailResponse } from '@/types/user.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(f: string, l: string) {
  return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const TEAM_ROLE_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  CO_LEAD: 'Co-Lead',
  MEMBER: 'Member',
};

const SCOPE_LABEL: Record<string, string> = {
  OWN: 'Own',
  TEAM: 'Team',
  MANAGER: 'Manager',
  BU: 'BU',
  ALL: 'All',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('users');

  const [showDeactivate, setShowDeactivate] = useState(false);

  // ── Fetch user ────────────────────────────────────────────────────────────
  const userQuery = useQuery<UserDetailResponse>({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await axios.get<UserDetailResponse>(`/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // ── Deactivate ────────────────────────────────────────────────────────────
  const deactivateMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await axios.put(`/users/${id}/deactivate`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeactivate(false);
    },
  });

  // ── Reactivate ────────────────────────────────────────────────────────────
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put(`/users/${id}/reactivate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  if (userQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (userQuery.isError || !userQuery.data?.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load user.{' '}
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const user = userQuery.data.data;
  const apiPerms = userQuery.data.permissions;
  const canEdit = apiPerms?.canEdit ?? permission.canEdit;
  const canDelete = apiPerms?.canDelete ?? permission.canDelete;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* ── Back + actions ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/users/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}

          {canDelete &&
            (user.isActive ? (
              <Button variant="destructive" size="sm" onClick={() => setShowDeactivate(true)}>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Reactivate
              </Button>
            ))}
        </div>
      </div>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">
                  {user.firstName} {user.lastName}
                </h2>
                <UserStatusBadge isActive={user.isActive} />
                <UserRoleBadge roleName={user.role.name} isSuperAdmin={user.isSuperAdmin} />
              </div>
              {user.displayName && (
                <p className="text-sm text-muted-foreground mt-0.5">{user.displayName}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">
            Teams
            {user.teamMemberships.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {user.teamMemberships.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Contact info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user.phone ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user.workingLocation ?? '—'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Employment info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Employment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user.employeeId ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user.businessUnit?.name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Joined {formatDate(user.dateOfJoin)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reporting chain */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reporting Chain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Reports to */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Reports to</p>
                {user.reportingTo ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(user.reportingTo.firstName, user.reportingTo.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {user.reportingTo.firstName} {user.reportingTo.lastName}
                    </span>
                    <span className="text-muted-foreground">
                      · {user.reportingTo.role.name.replace(/_/g, ' ')}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No reporting manager</p>
                )}
              </div>

              {user.subordinates.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Direct reports ({user.subordinates.length})
                    </p>
                    <div className="space-y-2">
                      {user.subordinates.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(s.firstName, s.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {s.firstName} {s.lastName}
                          </span>
                          <span className="text-muted-foreground">
                            · {s.role.name.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Client handler entries */}
          {user.clientHandlerEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Client Handler ({user.clientHandlerEntries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {user.clientHandlerEntries.map(h => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{h.client.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {h.role}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {h.client.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TEAMS TAB ────────────────────────────────────────────────── */}
        <TabsContent value="teams" className="mt-4">
          {user.teamMemberships.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Not a member of any team.
            </div>
          ) : (
            <div className="space-y-3">
              {user.teamMemberships.map(m => (
                <Card key={m.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{m.team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.team.businessUnit?.name ?? '—'}
                        {m.team.parentTeam && ` · ${m.team.parentTeam.name}`}
                        {m.team.category && ` · ${m.team.category}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {TEAM_ROLE_LABEL[m.teamRole]}
                      </Badge>
                      <Badge variant={m.isActive ? 'secondary' : 'outline'} className="text-xs">
                        {m.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Joined {formatDate(m.joinedAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── PERMISSIONS TAB ──────────────────────────────────────────── */}
        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {user.role.name.replace(/_/g, ' ')} — Permission Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.role.permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No permissions configured.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Module</th>
                        <th className="pb-2 px-3 font-medium text-center">View</th>
                        <th className="pb-2 px-3 font-medium text-center">Add</th>
                        <th className="pb-2 px-3 font-medium text-center">Edit</th>
                        <th className="pb-2 px-3 font-medium text-center">Delete</th>
                        <th className="pb-2 pl-3 font-medium">Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {user.role.permissions.map(p => (
                        <tr key={p.module} className="text-sm">
                          <td className="py-2.5 pr-4 font-medium capitalize">
                            {p.module.replace(/_/g, ' ')}
                          </td>
                          <td className="px-3 text-center">
                            {p.canView ? (
                              <span className="text-emerald-600">✓</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-3 text-center">
                            {p.canAdd ? (
                              <span className="text-emerald-600">✓</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-3 text-center">
                            {p.canEdit ? (
                              <span className="text-emerald-600">✓</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-3 text-center">
                            {p.canDelete ? (
                              <span className="text-emerald-600">✓</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="pl-3">
                            <Badge variant="outline" className="text-xs">
                              {SCOPE_LABEL[p.scope] ?? p.scope}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACTIVITY TAB ─────────────────────────────────────────────── */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="py-4">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between py-2 border-b">
                  <span>Created at</span>
                  <span className="text-foreground">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Last updated</span>
                  <span className="text-foreground">{formatDate(user.updatedAt)}</span>
                </div>
                {user.createdBy && (
                  <div className="flex justify-between py-2">
                    <span>Created by</span>
                    <span className="text-foreground">
                      {user.createdBy.firstName} {user.createdBy.lastName}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Deactivate dialog ─────────────────────────────────────────────── */}
      <DeactivateDialog
        open={showDeactivate}
        userName={`${user.firstName} ${user.lastName}`}
        isLoading={deactivateMutation.isPending}
        onConfirm={reason => deactivateMutation.mutate(reason)}
        onCancel={() => setShowDeactivate(false)}
      />
    </div>
  );
}

// File: page.tsx
// Path: src/app/(app)/admin/roles/[id]/page.tsx
//
// Role permission editor. Edits are a local draft over the saved grants; the
// sticky bar saves them as a full replace (PUT /roles/:id/permissions).
// System roles are read-only — the backend refuses edits to them anyway.

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Info, Lock, Pencil, ShieldOff, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { Pill } from '@/components/common/badges';
import { PersonCell } from '@/components/common/UserAvatar';
import { EmptyState, ErrorState, Spinner } from '@/components/common/states';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { RequirePermission } from '@/features/auth/RequirePermission';
import {
  PermissionGrid,
  diffCount,
  grantsToMap,
  mapToGrants,
  type GrantMap,
} from '@/features/admin/PermissionGrid';
import { RoleFormDialog } from '@/features/admin/RoleFormDialog';
import { roleHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { ApiError } from '@/lib/api/client';
import { permissionsApi, rolesApi } from '@/lib/api/endpoints';
import type { PermissionScope } from '@/config/permissions';

function RoleSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: me, reload } = useAuth();
  const { data: role, isLoading, error, refetch } = roleHooks.useDetail(id);
  const scopes = useQuery({
    queryKey: ['permission-scopes'],
    queryFn: () => permissionsApi.scopes(),
    staleTime: Infinity,
  });
  const [draft, setDraft] = useState<GrantMap | null>(null);
  const [editing, setEditing] = useState(false);

  const saved = useMemo(() => grantsToMap(role?.permissions ?? []), [role?.permissions]);
  const value = draft ?? saved;
  const changes = draft ? diffCount(draft, saved) : 0;
  const { can } = usePermissions();
  // system roles are fixed; otherwise you need the right to change permissions
  const readOnly = !!role?.isSystem || !can('roles.assign_permissions');

  const scopeDescriptions = useMemo(
    () =>
      Object.fromEntries((scopes.data ?? []).map(s => [s.value, s.desc])) as Partial<
        Record<PermissionScope, string>
      >,
    [scopes.data]
  );

  const save = useAction((grants: GrantMap) => rolesApi.saveGrants(id, mapToGrants(grants)), {
    success: r => `Permissions saved · ${r.count} granted`,
    invalidate: [roleHooks.keys.all],
    onSuccess: () => {
      setDraft(null);
      // my own role changed → refresh the session's permission map
      if (me?.roleId === id) void reload();
    },
  });

  // don't lose unsaved ticks on tab close / reload
  useEffect(() => {
    if (!changes) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changes]);

  if (isLoading) return <RoleSkeleton />;
  if (error || !role) {
    if (error instanceof ApiError && error.status === 404)
      return (
        <EmptyState
          icon={ShieldOff}
          title="Role not found"
          description="It may have been deleted."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/roles">Back to roles</Link>
            </Button>
          }
          className="min-h-[60vh]"
        />
      );
    return <ErrorState error={error} onRetry={() => refetch()} className="min-h-[60vh]" />;
  }

  const userCount = role._count?.users ?? role.users.length;

  return (
    <div className="space-y-5 pb-20">
      <PageHeader
        crumbs={[{ label: 'Roles & access', href: '/admin/roles' }, { label: role.name }]}
        title={
          <span className="flex items-center gap-2">
            {role.name}
            {role.isSystem && (
              <Pill tone="neutral" dot={false}>
                <Lock className="size-3" /> System
              </Pill>
            )}
          </span>
        }
        description={role.description || 'No description'}
        actions={
          !role.isSystem &&
          can('roles.update') && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Rename
            </Button>
          )
        }
      />

      {role.isSystem && (
        <div className="flex items-start gap-3 rounded-xl border border-info/25 bg-info/8 px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            <span className="font-medium">System roles are read-only.</span>{' '}
            <span className="text-muted-foreground">
              They ship with the CRM and other features rely on them. Create a new role to customise access.
            </span>
          </p>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PermissionGrid
          value={value}
          onChange={setDraft}
          readOnly={readOnly || save.isPending}
          scopeDescriptions={scopeDescriptions}
          baseline={draft ? saved : undefined}
        />

        <div className="space-y-4 lg:sticky lg:top-4">
          <Panel
            title="People with this role"
            description={`${userCount} active ${userCount === 1 ? 'user' : 'users'}`}
            bodyClassName="p-2"
          >
            {role.users.length ? (
              <ul>
                {role.users.map(u => (
                  <li key={u.id}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="flex items-center rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                    >
                      <PersonCell person={u} sub={u.email} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 py-3 text-sm text-muted-foreground">Nobody has this role yet.</p>
            )}
            {userCount > role.users.length && (
              <Button asChild variant="ghost" size="sm" className="mt-1 w-full">
                <Link href={`/admin/users?roleId=${role.id}`}>See all {userCount}</Link>
              </Button>
            )}
          </Panel>
          <Panel title="How scopes work">
            <dl className="space-y-2 text-xs">
              {(scopes.data ?? []).map(s => (
                <div key={s.value}>
                  <dt className="font-medium">{s.label.charAt(0) + s.label.slice(1).toLowerCase()}</dt>
                  <dd className="text-muted-foreground">{s.desc}</dd>
                </div>
              ))}
              {scopes.isLoading && <Skeleton className="h-24" />}
            </dl>
          </Panel>
        </div>
      </div>

      {changes > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 animate-fade-up items-center gap-3 rounded-xl border bg-popover py-2 pr-2 pl-4 shadow-float">
          <span className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
            <span className="size-2 rounded-full bg-warning" />
            {changes} unsaved {changes === 1 ? 'change' : 'changes'}
          </span>
          <div className="h-5 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={save.isPending}>
            <Undo2 /> Discard
          </Button>
          <Button size="sm" onClick={() => draft && save.mutate(draft)} disabled={save.isPending}>
            {save.isPending && <Spinner className="text-current" />}
            Save permissions
          </Button>
        </div>
      )}

      <RoleFormDialog open={editing} onOpenChange={setEditing} role={role} />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="roles.read">
      <RoleDetailPage />
    </RequirePermission>
  );
}

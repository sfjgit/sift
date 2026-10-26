// File: page.tsx
// Path: src/app/(app)/admin/roles/page.tsx
//
// Roles as cards — counts at a glance, click through to the permission grid.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { Pill } from '@/components/common/badges';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { EmptyState, ErrorState } from '@/components/common/states';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { RoleFormDialog } from '@/features/admin/RoleFormDialog';
import { roleHooks, useRoles } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { rolesApi } from '@/lib/api/endpoints';
import type { Role } from '@/types/org';

function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: Role;
  onEdit: (r: Role) => void;
  onDelete: (r: Role) => void;
}) {
  const { can } = usePermissions();
  const canUpdate = can('roles.update');
  const canDelete = can('roles.delete');
  const users = role._count?.users ?? 0;
  const perms = role._count?.permissions ?? 0;
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-float">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {role.isSystem ? <Lock className="size-4" /> : <ShieldCheck className="size-4" />}
          </span>
          <div className="min-w-0">
            <Link
              href={`/admin/roles/${role.id}`}
              className="block truncate font-semibold after:absolute after:inset-0 after:rounded-xl hover:text-primary"
            >
              {role.name}
            </Link>
            {role.isSystem && (
              <Pill tone="neutral" dot={false} className="mt-0.5">
                System
              </Pill>
            )}
          </div>
        </div>
        {!role.isSystem && (canUpdate || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="relative z-10"
                aria-label={`Actions for ${role.name}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canUpdate && (
                <DropdownMenuItem onSelect={() => onEdit(role)}>
                  <Pencil /> Rename
                </DropdownMenuItem>
              )}
              {canUpdate && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(role)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <p className="line-clamp-2 min-h-10 text-[13px] text-muted-foreground">
        {role.description || 'No description'}
      </p>
      <div className="flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" />
          <span className="tabular font-medium text-foreground">{users}</span>{' '}
          {users === 1 ? 'user' : 'users'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <KeyRound className="size-3.5" />
          <span className="tabular font-medium text-foreground">{perms}</span>{' '}
          {perms === 1 ? 'permission' : 'permissions'}
        </span>
      </div>
    </div>
  );
}

function RolesPage() {
  const { can } = usePermissions();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: roles, isLoading, error, refetch } = useRoles();
  const [dialog, setDialog] = useState<{ role: Role | null } | null>(null);

  const remove = useAction((id: string) => rolesApi.remove(id), {
    success: 'Role deleted',
    invalidate: [roleHooks.keys.all],
  });

  const askDelete = async (r: Role) => {
    const users = r._count?.users ?? 0;
    const ok = await confirm({
      title: `Delete “${r.name}”?`,
      description: users
        ? `${users} user(s) still have this role — the server will refuse until they’re moved to another role.`
        : 'This can’t be undone. Nobody currently has this role.',
      destructive: true,
      confirmLabel: 'Delete role',
    });
    if (ok) remove.mutate(r.id);
  };

  const sorted = [...(roles ?? [])].sort(
    (a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles & access"
        description="A role is a set of permissions. Each user has exactly one; scoped permissions decide whose records they see."
        actions={
          can('roles.create') && (
            <Button onClick={() => setDialog({ role: null })}>
              <Plus /> New role
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-card shadow-card">
          <ErrorState error={error} onRetry={() => refetch()} />
        </div>
      ) : !sorted.length ? (
        <div className="rounded-xl border bg-card shadow-card">
          <EmptyState
            icon={ShieldCheck}
            title="No roles yet"
            description="Create a role, then tick what it can do."
            action={
              can('roles.create') && (
                <Button size="sm" onClick={() => setDialog({ role: null })}>
                  <Plus /> New role
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map(r => (
            <RoleCard
              key={r.id}
              role={r}
              onEdit={role => setDialog({ role })}
              onDelete={askDelete}
            />
          ))}
        </div>
      )}

      <RoleFormDialog
        open={!!dialog}
        onOpenChange={o => !o && setDialog(null)}
        role={dialog?.role}
        onCreated={r => router.push(`/admin/roles/${r.id}`)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="roles.read">
      <RolesPage />
    </RequirePermission>
  );
}

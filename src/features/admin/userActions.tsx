// File: userActions.tsx
// Path: src/features/admin/userActions.tsx
//
// Everything you can do to a user (edit, activate, reset password, sign in
// as) shared by the users list and the user detail page. Visibility mirrors
// the backend's rules so admins don't hit avoidable 400s: no self-toggle,
// super admins can't be deactivated, only super admins impersonate.

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, KeyRound, LogIn, MoreHorizontal, Pencil, PauseCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { userHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { authApi, usersApi } from '@/lib/api/endpoints';
import { fullName } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { UserFormDialog } from './UserFormDialog';

export interface ActionableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
}

export function useUserActions() {
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const { can, isSuperAdmin } = usePermissions();
  const canManage = can('admin.manage_users');

  // undefined = closed, null = create, string = edit that user
  const [formUserId, setFormUserId] = useState<string | null | undefined>(undefined);
  const [resetFor, setResetFor] = useState<ActionableUser | null>(null);

  const toggle = useAction((u: ActionableUser) => usersApi.toggle(u.id), {
    success: (_r, u) => `${fullName(u)} ${u.isActive ? 'deactivated' : 'activated'}`,
    invalidate: [userHooks.keys.all, ['user-options']],
  });
  const toggleMutate = toggle.mutate;

  const isSelf = useCallback((u: ActionableUser) => u.id === me?.id, [me?.id]);
  /** super admins can only be managed by super admins (backend: assertCanManage) */
  const canEdit = useCallback((u: ActionableUser) => canManage && (!u.isSuperAdmin || isSuperAdmin), [canManage, isSuperAdmin]);
  const canToggle = useCallback((u: ActionableUser) => canManage && !isSelf(u) && !u.isSuperAdmin, [canManage, isSelf]);
  const canReset = useCallback((u: ActionableUser) => canEdit(u) && !isSelf(u) && u.isActive, [canEdit, isSelf]);
  const canImpersonate = useCallback(
    (u: ActionableUser) => isSuperAdmin && !isSelf(u) && !u.isSuperAdmin && u.isActive,
    [isSuperAdmin, isSelf]
  );

  const requestToggle = useCallback(
    async (u: ActionableUser) => {
      const deactivating = u.isActive;
      const ok = await confirm({
        title: deactivating ? `Deactivate ${fullName(u)}?` : `Reactivate ${fullName(u)}?`,
        description: deactivating
          ? 'They’re signed out immediately and can’t sign in again until reactivated. Their clients, SPOCs and history stay as they are.'
          : 'They’ll be able to sign in again with their existing password.',
        destructive: deactivating,
        confirmLabel: deactivating ? 'Deactivate' : 'Reactivate',
      });
      if (ok) toggleMutate(u);
    },
    [confirm, toggleMutate]
  );

  const impersonate = useCallback(
    async (u: ActionableUser) => {
      const ok = await confirm({
        title: `Sign in as ${fullName(u)}?`,
        description:
          'You’ll see the CRM exactly as they do, with their permissions. Everything you do is logged against your account. Use the banner at the top to switch back.',
        confirmLabel: 'Sign in as user',
      });
      if (!ok) return;
      const t = toast.loading(`Signing in as ${fullName(u)}…`);
      try {
        await authApi.impersonate(u.id);
        window.location.href = '/dashboard';
      } catch (e) {
        toast.error((e as ApiError).message, { id: t });
      }
    },
    [confirm]
  );

  const dialogs = (
    <>
      <UserFormDialog
        open={formUserId !== undefined}
        userId={formUserId ?? null}
        onOpenChange={o => !o && setFormUserId(undefined)}
      />
      <ResetPasswordDialog user={resetFor} onOpenChange={o => !o && setResetFor(null)} />
    </>
  );

  return {
    canManage,
    canEdit,
    canToggle,
    canReset,
    canImpersonate,
    openCreate: useCallback(() => setFormUserId(null), []),
    openEdit: useCallback((u: ActionableUser) => setFormUserId(u.id), []),
    openReset: useCallback((u: ActionableUser) => setResetFor(u), []),
    requestToggle,
    impersonate,
    dialogs,
  };
}

export type UserActions = ReturnType<typeof useUserActions>;

/** "…" menu for a user row (or a detail header with showOpen={false}). */
export function UserActionsMenu({
  user,
  actions,
  showOpen = true,
  trigger,
}: {
  user: ActionableUser;
  actions: UserActions;
  showOpen?: boolean;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { canEdit, canToggle, canReset, canImpersonate } = actions;
  const any = canEdit(user) || canToggle(user) || canReset(user) || canImpersonate(user);
  if (!showOpen && !any) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${fullName(user)}`}>
            <MoreHorizontal />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {showOpen && (
          <DropdownMenuItem onSelect={() => router.push(`/admin/users/${user.id}`)}>
            <Eye /> Open profile
          </DropdownMenuItem>
        )}
        {canEdit(user) && (
          <DropdownMenuItem onSelect={() => actions.openEdit(user)}>
            <Pencil /> Edit
          </DropdownMenuItem>
        )}
        {canReset(user) && (
          <DropdownMenuItem onSelect={() => actions.openReset(user)}>
            <KeyRound /> Reset password
          </DropdownMenuItem>
        )}
        {canImpersonate(user) && (
          <DropdownMenuItem onSelect={() => void actions.impersonate(user)}>
            <LogIn /> Sign in as user
          </DropdownMenuItem>
        )}
        {canToggle(user) && (
          <>
            <DropdownMenuSeparator />
            {user.isActive ? (
              <DropdownMenuItem variant="destructive" onSelect={() => void actions.requestToggle(user)}>
                <PauseCircle /> Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => void actions.requestToggle(user)}>
                <PlayCircle className="text-success" /> Reactivate
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

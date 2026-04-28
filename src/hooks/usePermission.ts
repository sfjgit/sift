'use client';

import { useAuth } from '@/context/AuthContext';
import type { ModulePermissions, PermissionScope } from '@/types/user.types';

// ─────────────────────────────────────────
// usePermission
//
// Reads the logged-in user's permission for a
// given module directly from AuthContext.
// Used to hide/show navbar items and page-level
// buttons BEFORE any API call is made.
//
// The API also returns permissions per response —
// use those for row-level action buttons instead,
// since they reflect the actual scoped result.
//
// Usage:
//   const perm = usePermission('users');
//   if (!perm.canView) redirect('/');
//   {perm.canAdd && <Button>Create User</Button>}
// ─────────────────────────────────────────

export function usePermission(module: string): ModulePermissions {
  const { user } = useAuth();

  // Super admin — full access to everything
  if (user?.isSuperAdmin) {
    return {
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
      scope: 'ALL' as PermissionScope,
    };
  }

  const permission = user?.role?.permissions?.find(p => p.module === module);

  if (!permission) {
    return {
      canView: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
      scope: 'OWN' as PermissionScope,
    };
  }

  return {
    canView: permission.canView ?? false,
    canAdd: permission.canAdd ?? false,
    canEdit: permission.canEdit ?? false,
    canDelete: permission.canDelete ?? false,
    // @ts-expect-error err
    scope: permission.scope as PermissionScope,
  };
}

// ─────────────────────────────────────────
// usePermissions
// Get multiple modules at once — for navbar
//
// Usage:
//   const perms = usePermissions(['users', 'clients', 'teams']);
//   perms.users.canView — show Users in navbar
// ─────────────────────────────────────────

export function usePermissions(modules: string[]): Record<string, ModulePermissions> {
  const { user } = useAuth();

  const result: Record<string, ModulePermissions> = {};

  // eslint-disable-next-line @next/next/no-assign-module-variable
  for (const module of modules) {
    if (user?.isSuperAdmin) {
      result[module] = {
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        scope: 'ALL' as PermissionScope,
      };
      continue;
    }

    const permission = user?.role?.permissions?.find(p => p.module === module);

    result[module] = permission
      ? {
          canView: permission.canView ?? false,
          canAdd: permission.canAdd ?? false,
          canEdit: permission.canEdit ?? false,
          canDelete: permission.canDelete ?? false,
          // @ts-expect-error err
          scope: permission.scope as PermissionScope,
        }
      : {
          canView: false,
          canAdd: false,
          canEdit: false,
          canDelete: false,
          scope: 'OWN' as PermissionScope,
        };
  }

  return result;
}

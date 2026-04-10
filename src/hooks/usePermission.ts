'use client';

import { useAuth } from '@/context/AuthContext';

type Action = 'canView' | 'canAdd' | 'canEdit' | 'canDelete';

// Returns undefined while auth is loading — prevents permission flash
export function usePermission(module: string, action: Action): boolean | undefined {
  const { user, isLoading } = useAuth();

  if (isLoading) return undefined;
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const perm = user.role.permissions.find(p => p.module === module);
  return perm ? (perm[action] ?? false) : false;
}

// Get all 4 actions at once — use this in pages/sections
export function usePermissions(module: string) {
  const { user, isLoading } = useAuth();

  if (isLoading)
    return {
      canView: undefined,
      canAdd: undefined,
      canEdit: undefined,
      canDelete: undefined,
      scope: undefined,
    };
  if (!user)
    return { canView: false, canAdd: false, canEdit: false, canDelete: false, scope: null };

  if (user.isSuperAdmin) {
    return { canView: true, canAdd: true, canEdit: true, canDelete: true, scope: 'ALL' as const };
  }

  const perm = user.role.permissions.find(p => p.module === module);
  if (!perm)
    return { canView: false, canAdd: false, canEdit: false, canDelete: false, scope: null };

  return {
    canView: perm.canView,
    canAdd: perm.canAdd,
    canEdit: perm.canEdit,
    canDelete: perm.canDelete,
    scope: perm.scope,
  };
}

// File: usePermissions.ts
// Path: src/features/auth/usePermissions.ts

'use client';

import { useCallback } from 'react';
import { useAuth } from './AuthProvider';
import type { PermissionKey, PermissionScope } from '@/config/permissions';

export function usePermissions() {
  const { user } = useAuth();
  const map = user?.permissions;
  // super admin can do everything — same rule as the backend, and doesn't rely
  // on the permissions map listing every key
  const isSuperAdmin = !!user?.isSuperAdmin;

  /** can('spocs.assign') */
  const can = useCallback((key: PermissionKey) => isSuperAdmin || !!map?.[key], [isSuperAdmin, map]);

  const canAny = useCallback(
    (keys: PermissionKey[]) => isSuperAdmin || keys.some(k => !!map?.[k]),
    [isSuperAdmin, map]
  );

  /** Scope of a scoped grant, null if not granted (unscoped grants return null too) */
  const scopeOf = useCallback(
    (key: PermissionKey): PermissionScope | null => {
      if (isSuperAdmin) return 'ALL';
      const g = map?.[key];
      return typeof g === 'string' ? g : null;
    },
    [isSuperAdmin, map]
  );

  return { can, canAny, scopeOf, isSuperAdmin };
}

// File: usePermissions.ts
// Path: src/features/auth/usePermissions.ts

'use client';

import { useCallback } from 'react';
import { useAuth } from './AuthProvider';
import type { PermissionKey, PermissionScope } from '@/config/permissions';

export function usePermissions() {
  const { user } = useAuth();
  const map = user?.permissions;

  /** can('spocs.assign') — super admin's map already contains every key */
  const can = useCallback((key: PermissionKey) => !!map?.[key], [map]);

  const canAny = useCallback((keys: PermissionKey[]) => keys.some(k => !!map?.[k]), [map]);

  /** Scope of a scoped grant, null if not granted (unscoped grants return null too) */
  const scopeOf = useCallback(
    (key: PermissionKey): PermissionScope | null => {
      const g = map?.[key];
      return typeof g === 'string' ? g : null;
    },
    [map]
  );

  return { can, canAny, scopeOf, isSuperAdmin: !!user?.isSuperAdmin };
}

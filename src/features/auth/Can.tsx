// File: Can.tsx
// Path: src/features/auth/Can.tsx

'use client';

import type { ReactNode } from 'react';
import type { PermissionKey } from '@/config/permissions';
import { usePermissions } from './usePermissions';

/** <Can perm="clients.create"><Button/></Can> — UI only; the API still enforces. */
export function Can({
  perm,
  any,
  fallback = null,
  children,
}: {
  perm?: PermissionKey;
  any?: PermissionKey[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canAny } = usePermissions();
  const ok = (perm ? can(perm) : true) && (any ? canAny(any) : true);
  return <>{ok ? children : fallback}</>;
}

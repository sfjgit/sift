'use client';

import { usePermission } from '@/hooks/usePermission';
import type { ReactNode } from 'react';

interface PermissionGateProps {
  module: string;
  action?: 'canView' | 'canAdd' | 'canEdit' | 'canDelete';
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Wraps any element and renders it only if the user has the permission.
 *
 * Usage:
 *   <PermissionGate module="clients" action="canAdd">
 *     <AddClientButton />
 *   </PermissionGate>
 *
 * action defaults to "canView" if not provided.
 */
export default function PermissionGate({
  module,
  action = 'canView',
  fallback = null,
  children,
}: PermissionGateProps) {
  const allowed = usePermission(module);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

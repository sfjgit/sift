// File: RequirePermission.tsx
// Path: src/features/auth/RequirePermission.tsx
//
// Page-level gate. Shows a friendly "no access" screen instead of a blank
// page or a redirect loop — the API would 403 anyway.

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/states';
import type { PermissionKey } from '@/config/permissions';
import { usePermissions } from './usePermissions';

export function RequirePermission({
  perm,
  any,
  superAdmin,
  children,
}: {
  perm?: PermissionKey;
  any?: PermissionKey[];
  superAdmin?: boolean;
  children: ReactNode;
}) {
  const { can, canAny, isSuperAdmin } = usePermissions();
  const ok = (!perm || can(perm)) && (!any || canAny(any)) && (!superAdmin || isSuperAdmin);
  if (ok) return <>{children}</>;
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don’t have access to this page"
      description="Ask an admin to grant the permission on your role if you need it."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
      className="min-h-[60vh]"
    />
  );
}

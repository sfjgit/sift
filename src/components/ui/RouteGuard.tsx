'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import type { ReactNode } from 'react';

interface RouteGuardProps {
  module: string;
  children: ReactNode;
}

/**
 * Place at the top of any (dashboard) page that needs a permission check.
 *
 * Usage (in page.tsx):
 *   export default function TeamsPage() {
 *     return (
 *       <RouteGuard module="teams">
 *         <TeamsContent />
 *       </RouteGuard>
 *     );
 *   }
 */
export default function RouteGuard({ module, children }: RouteGuardProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const canView = usePermission(module, 'canView');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/sign-in');
      return;
    }
    if (!canView) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, canView, router]);

  // While auth is hydrating show nothing — avoids flash
  if (isLoading) return null;
  if (!isAuthenticated || !canView) return null;

  return <>{children}</>;
}

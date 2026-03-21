'use client';

import { useAuth } from '@/context/AuthContext';

type Action = 'canView' | 'canAdd' | 'canEdit' | 'canDelete';

export function usePermission(module: string, action: Action): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const perm = user.role.permissions.find(p => p.module === module);
  return perm ? (perm[action] ?? false) : false;
}

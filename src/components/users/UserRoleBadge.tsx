'use client';

import { Badge } from '@/components/ui/badge';

interface Props {
  roleName: string;
  isSuperAdmin?: boolean;
}

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN:
    'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-400',
  ADMIN:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400',
  DELIVERY_MANAGER:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400',
  TEAM_LEAD:
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-400',
  RECRUITER:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400',
  SALES:
    'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
};

function formatRoleName(name: string): string {
  return name
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function UserRoleBadge({ roleName, isSuperAdmin }: Props) {
  const key = isSuperAdmin ? 'SUPER_ADMIN' : roleName;
  const styles = ROLE_STYLES[key] ?? 'border-gray-200 bg-gray-50 text-gray-700';
  const label = isSuperAdmin ? 'Super Admin' : formatRoleName(roleName);

  return (
    <Badge variant="outline" className={styles}>
      {label}
    </Badge>
  );
}

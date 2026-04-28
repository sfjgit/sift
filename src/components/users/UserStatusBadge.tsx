'use client';

import { Badge } from '@/components/ui/badge';

interface Props {
  isActive: boolean;
}

export function UserStatusBadge({ isActive }: Props) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400'
      }
    >
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}

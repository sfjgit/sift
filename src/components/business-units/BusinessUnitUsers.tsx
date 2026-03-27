'use client';

import { usePermission } from '@/hooks/usePermission';
import { BUUser } from '@/lib/business-units.api';

export function BusinessUnitUsers({ users }: { users: BUUser[] }) {
  const canView = usePermission('users', 'canView');

  if (!canView || !users?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-foreground mb-3">Users</h2>

      <div className="space-y-2">
        {users.map(user => (
          <div
            key={user.id}
            className="flex items-center justify-between px-3 py-2 rounded-md border border-border"
          >
            <div>
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>

            <span className="text-xs text-muted-foreground">
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

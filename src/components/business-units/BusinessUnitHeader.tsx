'use client';

import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { EditBusinessUnitDialog } from './EditBusinessUnitDialog';
import { BusinessUnit } from '@/lib/business-units.api';

export function BusinessUnitHeader({ bu }: { bu: BusinessUnit }) {
  const canEdit = usePermission('business_units', 'canEdit');
  const canDelete = usePermission('business_units', 'canDelete');

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 flex items-start justify-between">
      {/* Left */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{bu.name}</h1>

        <p className="text-sm text-muted-foreground mt-1">Business Unit Details</p>

        <span
          className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
            bu.isActive
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {bu.isActive ? 'active' : 'inactive'}
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex gap-2">
        {canEdit && <EditBusinessUnitDialog bu={bu} />}

        {canDelete && (
          <Button size="sm" variant="destructive">
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

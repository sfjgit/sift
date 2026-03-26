'use client';

import { fmtDate } from '@/components/requirements/ui';
import { BusinessUnit } from '@/lib/business-units.api';

export function BusinessUnitOverview({ bu }: { bu: BusinessUnit }) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-foreground mb-3">Overview</h2>

      <div className="grid grid-cols-2 gap-y-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Name</p>
          <p className="text-foreground">{bu.name}</p>
        </div>

        <div>
          <p className="text-muted-foreground text-xs">Status</p>
          <p>{bu.isActive ? 'Active' : 'Inactive'}</p>
        </div>

        <div>
          <p className="text-muted-foreground text-xs">Created At</p>
          <p>{fmtDate(bu.createdAt)}</p>
        </div>

        <div>
          <p className="text-muted-foreground text-xs">Parent BU</p>
          <p>{bu.parentBUId ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { BusinessUnit } from '@/lib/business-units.api';

export function BusinessUnitChildren({ childBUs }: { childBUs: BusinessUnit[] }) {
  const canView = usePermission('business_units', 'canView');

  if (!canView || !childBUs?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-foreground mb-3">Child Business Units</h2>

      <div className="space-y-2">
        {childBUs.map(bu => (
          <Link
            key={bu.id}
            href={`/dashboard/business-units/${bu.id}`}
            className="flex items-center justify-between px-3 py-2 rounded-md border border-border hover:bg-muted/30"
          >
            <span className="text-sm">{bu.name}</span>

            <span className="text-xs text-muted-foreground">
              {bu.isActive ? 'Active' : 'Inactive'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

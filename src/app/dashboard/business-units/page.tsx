'use client';

import { usePermission } from '@/hooks/usePermission';
import { BusinessUnitList } from '@/components/business-units/BusinessUnitList';
import { CreateBusinessUnitDialog } from '@/components/business-units/CreateBusinessUnitDialog';
import { BusinessUnitDashboard } from '@/components/business-units/BusinessUnitDashboard';

export default function BusinessUnitsPage() {
  const canView = usePermission('business_units', 'canView');
  const canAdd = usePermission('business_units', 'canAdd');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Business Units
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your organization&apos;s business units
          </p>
        </div>
        {canAdd && <CreateBusinessUnitDialog />}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Content */}
      {canView ? (
        // <BusinessUnitList />
        <BusinessUnitDashboard />
      ) : (
        <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view business units.
          </p>
        </div>
      )}
    </div>
  );
}

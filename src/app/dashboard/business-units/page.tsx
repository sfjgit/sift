'use client';

import { usePermission } from '@/hooks/usePermission';

import { BusinessUnitList } from '@/components/business-units/BusinessUnitList';
import { CreateBusinessUnitDialog } from '@/components/business-units/CreateBusinessUnitDialog';

export default function BusinessUnitsPage() {
  const canView = usePermission('business_units', 'canView');
  const canAdd = usePermission('business_units', 'canAdd');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Units</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage organizational units</p>
        </div>

        {/* ✅ Create Button */}
        {canAdd && <CreateBusinessUnitDialog />}
      </div>

      {/* ✅ View Permission */}
      {canView ? (
        <BusinessUnitList />
      ) : (
        <div className="flex items-center justify-center h-32 border border-dashed rounded-xl">
          <p className="text-sm text-muted-foreground">
            You don’t have access to view business units.
          </p>
        </div>
      )}
    </div>
  );
}

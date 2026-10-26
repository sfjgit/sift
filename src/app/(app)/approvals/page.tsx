// File: page.tsx
// Path: src/app/(app)/approvals/page.tsx
//
// Approval queue: SPOCs the pipeline found or scored wait here until a person
// approves them for outreach. Only approved SPOCs get outreach emails.

'use client';

import { useMemo } from 'react';
import { BadgeCheck, CircleSlash, Clock, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, useTableState } from '@/components/data-table';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { spocColumns, spocFilterKeys, spocFilters } from '@/features/spocs/columns';
import { spocHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { spocsApi } from '@/lib/api/endpoints';
import type { Spoc, SpocApprovalStatus } from '@/types/crm';

const HIDDEN_COLUMNS = new Set(['phone', 'salesStatus', 'bu']);

function ApprovalsPage() {
  const { can } = usePermissions();
  const filters = useMemo(() => spocFilters.filter(f => f.key !== 'approvalStatus'), []);
  const table = useTableState('approvals', spocFilterKeys, {
    filters: { approvalStatus: 'PENDING' },
    sort: { id: 'validationScore', desc: true },
  });
  const query = spocHooks.useList(table.params);
  const columns = useMemo(() => spocColumns().filter(c => !HIDDEN_COLUMNS.has(c.id as string)), []);
  const status = (table.state.filters.approvalStatus as SpocApprovalStatus | undefined) ?? 'PENDING';

  const decide = useAction(
    ({ rows, decision }: { rows: Spoc[]; decision: SpocApprovalStatus; clear: () => void }) =>
      spocsApi.decide(rows.map(r => r.id), decision),
    {
      success: r => `${r.updated} SPOC${r.updated === 1 ? '' : 's'} updated`,
      invalidate: [spocHooks.keys.all],
      onSuccess: (_r, v) => v.clear(),
    }
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals"
        description="People the pipeline found or scored. Approve the ones worth contacting — only approved SPOCs get outreach emails."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<SpocApprovalStatus>
          value={status}
          onChange={v => table.actions.setFilter('approvalStatus', v)}
          options={[
            { value: 'PENDING', label: 'To approve', icon: Clock },
            { value: 'APPROVED', label: 'Approved', icon: BadgeCheck },
            { value: 'REJECTED', label: 'Rejected', icon: CircleSlash },
          ]}
        />
        {can('spocs.approve') && status === 'PENDING' && (
          <p className="text-xs text-muted-foreground">Tip: filter Quality → Ready, tick all, approve.</p>
        )}
      </div>

      <DataTable
        id="approvals"
        table={table}
        query={query}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search name, email or designation…"
        rowHref={s => `/spocs/${s.id}`}
        exportName={`spocs-${status.toLowerCase()}`}
        empty={{
          title: status === 'PENDING' ? 'Nothing waiting for approval' : 'No SPOCs here yet',
          description: status === 'PENDING' ? 'SPOCs found by pipeline runs appear here.' : undefined,
        }}
        bulkActions={
          can('spocs.approve')
            ? (rows, clear) => (
                <>
                  {status !== 'APPROVED' && (
                    <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ rows, decision: 'APPROVED', clear })}>
                      <BadgeCheck /> Approve
                    </Button>
                  )}
                  {status !== 'REJECTED' && (
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ rows, decision: 'REJECTED', clear })}>
                      <CircleSlash /> Reject
                    </Button>
                  )}
                  {status !== 'PENDING' && (
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ rows, decision: 'PENDING', clear })}>
                      <Undo2 /> Back to pending
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="spocs.read">
      <ApprovalsPage />
    </RequirePermission>
  );
}

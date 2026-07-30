'use client';

// File: RecruiterTable.tsx
// Path: src/components/reports/RecruiterTable.tsx

import { useMemo } from 'react';
import { DataTable, type ColumnDef } from './DataTable';
import { ColumnViewMenu } from './ColumnViewMenu';
import {
  FUNNEL_COLORS,
  GroupHeader,
  MiniStat,
  STATUS_STYLE,
  StageCell,
  makeExpandColumn,
  makeSelectColumn,
  makeSrColumn,
  useExpanded,
  useSelection,
} from './reportUi';
import { useReportViewStore, useReportViewsReady } from '@/stores/reportViewStore';
import type { RecruiterStat, StageMeta } from './types';

interface RecruiterTableProps {
  title: string | null;
  serviceLineId?: string;
  data: RecruiterStat[];
  stages: StageMeta[];
  onDownloadAll: (slId?: string) => void;
  onDownloadSelected: (ids: string[], slId?: string) => void;
}

export function RecruiterTable({
  title,
  serviceLineId,
  data,
  stages,
  onDownloadAll,
  onDownloadSelected,
}: RecruiterTableProps) {
  // Stage columns differ per service line, so each line keeps its own layout + views.
  const tableKey = `reports.recruiters:${serviceLineId ?? 'unassigned'}`;

  const { selected, toggle, toggleAll } = useSelection();
  const { expanded, toggleExp } = useExpanded();

  const ready = useReportViewsReady();
  const hiddenRaw = useReportViewStore(s => s.hiddenColumns[tableKey]);
  const hidden = ready ? (hiddenRaw ?? []) : [];

  const allIds = useMemo(() => data.map(r => r.id), [data]);
  const getId = (r: RecruiterStat) => r.id;

  const columns = useMemo<ColumnDef<RecruiterStat>[]>(
    () => [
      makeSelectColumn<RecruiterStat>(getId, allIds, selected, toggle, toggleAll),
      makeExpandColumn<RecruiterStat>(getId, expanded, toggleExp),
      makeSrColumn<RecruiterStat>(),
      {
        id: 'recruiter',
        label: 'Recruiter',
        frozen: true,
        locked: true,
        width: 240,
        cell: r => (
          <div className="overflow-hidden">
            <div className="truncate text-[13px] font-bold text-slate-900">{r.name}</div>
            <div className="truncate text-[11px] text-slate-400">{r.email}</div>
          </div>
        ),
      },
      {
        id: 'jobs',
        label: 'Jobs',
        align: 'center',
        group: 'Activity',
        cell: r => (
          <span className="text-[12px] font-semibold text-slate-600">
            {r.requirementBreakdown.length}
          </span>
        ),
      },
      {
        id: 'sourced',
        label: 'Sourced',
        align: 'center',
        group: 'Activity',
        cell: r => <span className="text-[15px] font-black text-slate-900">{r.sourced}</span>,
      },
      ...stages.map<ColumnDef<RecruiterStat>>((s, i) => ({
        id: `stage:${s.id}`,
        label: s.label,
        align: 'center',
        group: 'Pipeline stages',
        dotColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
        headerTitle: s.serviceLine ? `${s.label} · ${s.serviceLine.name}` : `${s.label} · Common`,
        cell: r => (
          <StageCell
            count={r.stageCounts[s.id] ?? 0}
            base={r.sourced}
            color={FUNNEL_COLORS[i % FUNNEL_COLORS.length]}
          />
        ),
      })),
      {
        id: 'active',
        label: 'Active',
        align: 'center',
        group: 'Outcome',
        cell: r => (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
            {r.active}
          </span>
        ),
      },
      {
        id: 'joined',
        label: 'Joined (total)',
        align: 'center',
        group: 'Outcome',
        headerTitle: 'Joined across every stage path — not the Joined stage count',
        cell: r => <span className="text-[13px] font-black text-emerald-700">{r.joined}</span>,
      },
      {
        id: 'dropped',
        label: 'Dropped (total)',
        align: 'center',
        group: 'Outcome',
        cell: r => (
          <span
            className={`text-[13px] font-bold ${r.dropped > 0 ? 'text-red-500' : 'text-slate-300'}`}
          >
            {r.dropped}
          </span>
        ),
      },
      {
        id: 'avgDays',
        label: 'Avg days',
        align: 'center',
        group: 'Outcome',
        headerTitle: 'Average days from sourcing to submission',
        cell: r => (
          <span className="text-[12px] font-medium text-slate-500">
            {r.avgTimeToSubmitDays != null ? `${r.avgTimeToSubmitDays}d` : '—'}
          </span>
        ),
      },
    ],
    [allIds, selected, toggle, toggleAll, expanded, toggleExp, stages]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <GroupHeader
        title={title}
        count={data.length}
        countLabel="recruiters"
        selectedCount={selected.size}
        onSelected={() => onDownloadSelected([...selected], serviceLineId)}
        onAll={() => onDownloadAll(serviceLineId)}
        rightSlot={<ColumnViewMenu tableKey={tableKey} columns={columns} />}
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={getId}
        hiddenColumns={hidden}
        maxHeight="calc(100vh - 380px)"
        emptyMessage="No recruiter activity in this window."
        isExpanded={r => expanded.has(r.id)}
        rowClassName={r => (expanded.has(r.id) ? 'bg-indigo-50' : 'hover:bg-slate-50')}
        frozenBgClass={r =>
          expanded.has(r.id) ? 'bg-indigo-50' : 'bg-white group-hover:bg-slate-50'
        }
        renderExpanded={r =>
          r.requirementBreakdown.length > 0 ? (
            <div className="space-y-1.5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Per requirement
              </p>
              {r.requirementBreakdown.map((rqi, ri) => (
                <div
                  key={rqi.requirementId}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-4 text-[11px] font-bold text-slate-300">{ri + 1}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                      {rqi.reqCode}
                    </span>
                    <span className="min-w-[120px] flex-1 truncate text-[12px] font-semibold text-slate-800">
                      {rqi.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_STYLE[rqi.status] ?? 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {rqi.status.replace(/_/g, ' ')}
                    </span>
                    {rqi.client && (
                      <span className="text-[11px] text-slate-400">{rqi.client.name}</span>
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-4 border-t border-slate-100 pt-2.5">
                    <MiniStat l="Sourced" v={rqi.sourced} />
                    <MiniStat l="Submitted" v={rqi.submitted} c="text-blue-700" />
                    <MiniStat l="Offered" v={rqi.offered} c="text-amber-700" />
                    <MiniStat l="Joined" v={rqi.joined} c="text-emerald-700" />
                    <MiniStat l="Dropped" v={rqi.dropped} c="text-red-500" />
                    <MiniStat l="Active" v={rqi.active} c="text-indigo-700" />
                  </div>

                  {stages.some(s => (rqi.stageCounts[s.id] ?? 0) > 0) && (
                    <div className="mt-2.5 flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">
                      {stages
                        .filter(s => (rqi.stageCounts[s.id] ?? 0) > 0)
                        .map(s => (
                          <span
                            key={s.id}
                            className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700"
                          >
                            {s.label}: {rqi.stageCounts[s.id]}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No requirement data for this recruiter.</p>
          )
        }
      />
    </div>
  );
}

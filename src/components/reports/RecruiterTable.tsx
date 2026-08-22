/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: RecruiterTable.tsx
// Path: src/components/reports/RecruiterTable.tsx

import { useMemo } from 'react';
import { DataTable, type ColumnDef } from './DataTable';
import { ColumnViewMenu } from './ColumnViewMenu';
import {
  DownloadMenu,
  FUNNEL_COLORS,
  GroupHeader,
  MiniStat,
  STATUS_STYLE,
  StageCell,
  StickyTableCard,
  makeExpandColumn,
  makeSelectColumn,
  makeSrColumn,
  useExpanded,
  useSelection,
  useStageSelection,
} from './reportUi';
import { useReportViewStore, useReportViewsReady } from '@/stores/reportViewStore';
import type { StageMeta } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecruiterStat = any;

interface RecruiterTableProps {
  title: string | null;
  serviceLineId?: string;
  data: RecruiterStat[];
  stages: StageMeta[];
  onDownloadAll: (
    slId?: string,
    stageIds?: string[],
    hiddenStageIds?: string[],
    hiddenCandidateCols?: string[]
  ) => void;
  onDownloadSelected: (
    ids: string[],
    slId?: string,
    stageIds?: string[],
    hiddenStageIds?: string[],
    hiddenCandidateCols?: string[]
  ) => void;
}

export function RecruiterTable({
  title,
  serviceLineId,
  data,
  stages,
  onDownloadAll,
  onDownloadSelected,
}: RecruiterTableProps) {
  const tableKey = `reports.recruiters:${serviceLineId ?? 'unassigned'}`;

  const { selected, toggle, toggleAll } = useSelection();
  const { expanded, toggleExp } = useExpanded();
  // selectedStageIds: the stages the user has highlighted in this table for export filtering
  const { selectedStageIds, toggleStage, clearStages } = useStageSelection();

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
        exportFields: [
          { label: 'Recruiter', value: r => r.name },
          { label: 'Email', value: r => r.email },
        ],
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
        exportValue: r => r.requirementBreakdown.length,
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
        exportValue: r => r.sourced,
        cell: r => <span className="text-[15px] font-black text-slate-900">{r.sourced}</span>,
      },

      // ── Stage columns — clicking the header toggles that stage for export filter ──
      ...stages.map<ColumnDef<RecruiterStat>>((s, i) => {
        const stageSelected = selectedStageIds.has(s.id);
        return {
          id: `stage:${s.id}`,
          label: s.label,
          align: 'center',
          group: 'Pipeline stages',
          dotColor: stageSelected ? '#4F46E5' : FUNNEL_COLORS[i % FUNNEL_COLORS.length],
          headerTitle: `${s.serviceLine ? `${s.label} · ${s.serviceLine.name}` : `${s.label} · Common`} — click to toggle stage in export`,
          exportValue: r => r.stageCounts[s.id] ?? 0,
          // Header has a click ring when selected — indicates "this stage will filter the candidates sheet"
          header: (
            <button
              onClick={() => toggleStage(s.id)}
              title={stageSelected ? 'Remove from export filter' : 'Add to export filter'}
              className={`flex w-full flex-col items-center gap-0.5 rounded px-1 py-0.5 transition-all ${stageSelected ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50' : 'hover:bg-slate-100'}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: stageSelected
                    ? '#4F46E5'
                    : FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                }}
              />
              <span
                className="block max-w-[100px] truncate text-[11px] font-bold uppercase tracking-widest"
                style={{ color: stageSelected ? '#4F46E5' : undefined }}
              >
                {s.label}
              </span>
            </button>
          ),
          cell: r => (
            <StageCell
              count={r.stageCounts[s.id] ?? 0}
              base={r.sourced}
              color={stageSelected ? '#4F46E5' : FUNNEL_COLORS[i % FUNNEL_COLORS.length]}
            />
          ),
        };
      }),

      {
        id: 'active',
        label: 'Active',
        align: 'center',
        group: 'Outcome',
        exportValue: r => r.active,
        cell: r => (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
            {r.active}
          </span>
        ),
      },
      {
        id: 'joined',
        label: 'Joined',
        align: 'center',
        group: 'Outcome',
        headerTitle: 'Joined across every stage path',
        exportValue: r => r.joined,
        cell: r => <span className="text-[13px] font-black text-emerald-700">{r.joined}</span>,
      },
      {
        id: 'dropped',
        label: 'Dropped',
        align: 'center',
        group: 'Outcome',
        exportValue: r => r.dropped,
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
        exportValue: r => r.avgTimeToSubmitDays ?? '',
        cell: r => (
          <span className="text-[12px] font-medium text-slate-500">
            {r.avgTimeToSubmitDays != null ? `${r.avgTimeToSubmitDays}d` : '—'}
          </span>
        ),
      },
    ],
    [
      allIds,
      selected,
      toggle,
      toggleAll,
      expanded,
      toggleExp,
      stages,
      selectedStageIds,
      toggleStage,
    ]
  );

  const stageIdsArr = [...selectedStageIds];

  // Extract stage IDs the user has hidden via the column picker
  // hidden entries for stage columns look like "stage:${stageId}"
  const hiddenStageIds = hidden
    .filter(id => id.startsWith('stage:'))
    .map(id => id.replace('stage:', ''));

  return (
    <StickyTableCard>
      <GroupHeader
        title={title}
        count={data.length}
        countLabel="recruiters"
        leftSlot={
          stageIdsArr.length > 0 ? (
            <span className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
              {stageIdsArr.length} stage{stageIdsArr.length > 1 ? 's' : ''} selected for export
              <button
                onClick={clearStages}
                className="ml-1 rounded-full p-0.5 hover:bg-indigo-200 transition-colors"
                title="Clear stage filter"
              >
                ×
              </button>
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400">
              Click stage column headers to filter candidates export
            </span>
          )
        }
        rightSlot={
          <>
            <ColumnViewMenu tableKey={tableKey} columns={columns} />
            <DownloadMenu
              scopeLabel={title ? 'This line' : 'All'}
              rowCount={data.length}
              selectedCount={selected.size}
              selectedStageIds={stageIdsArr}
              onServerAll={hiddenCandidateCols =>
                onDownloadAll(
                  serviceLineId,
                  stageIdsArr.length > 0 ? stageIdsArr : undefined,
                  hiddenStageIds.length > 0 ? hiddenStageIds : undefined,
                  hiddenCandidateCols
                )
              }
              onServerSelected={hiddenCandidateCols =>
                onDownloadSelected(
                  [...selected],
                  serviceLineId,
                  stageIdsArr.length > 0 ? stageIdsArr : undefined,
                  hiddenStageIds.length > 0 ? hiddenStageIds : undefined,
                  hiddenCandidateCols
                )
              }
              onServerStageFiltered={hiddenCandidateCols =>
                onDownloadAll(
                  serviceLineId,
                  stageIdsArr,
                  hiddenStageIds.length > 0 ? hiddenStageIds : undefined,
                  hiddenCandidateCols
                )
              }
            />
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={getId}
        hiddenColumns={hidden}
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
              {r.requirementBreakdown.map((rqi: any, ri: any) => (
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
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[rqi.status] ?? 'bg-slate-100 text-slate-500'}`}
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
    </StickyTableCard>
  );
}

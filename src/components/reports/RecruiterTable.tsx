// File: RecruiterTable.tsx
// Path: src/components/reports/RecruiterTable.tsx
//
// Changes from previous version:
//   ✅ Stage count cells are now clickable — open RecruiterCandidateDrillDialog
//   ✅ "Sourced" total cell is clickable — opens drill for all candidates
//   ✅ Expanded row has "View all candidates →" button
//   ✅ Stage column groups: Pipeline stages / Near Close / Placed
//   ✅ Outcome columns updated: placed, nearTerminal, inPipeline, offPipeline
//      (reads new field names from patched buildRecruiterRows)

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState, useCallback } from 'react';
import { DataTable, type ColumnDef } from './DataTable';
import { ColumnViewMenu } from './ColumnViewMenu';
import {
  DownloadMenu,
  FUNNEL_COLORS,
  GroupHeader,
  MiniStat,
  STATUS_STYLE,
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
import {
  RecruiterCandidateDrillDialog,
  type RecruiterDrillTarget,
} from './RecruiterCandidateDrillDialog';

type RecruiterStat = any;

// ── Module-level stable reference — never recreated ──────────────────────────
const getId = (r: RecruiterStat) => r.id;

interface RecruiterTableProps {
  title: string | null;
  serviceLineId?: string;
  data: RecruiterStat[];
  stages: StageMeta[];
  baseQs: string; // ← NEW: needed for drill dialog filters
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

// ─────────────────────────────────────────────────────────────────────────────
// CLICKABLE STAGE COUNT CELL
// ─────────────────────────────────────────────────────────────────────────────

function ClickableStageCount({
  count,
  base,
  color,
  onClick,
}: {
  count: number;
  base: number;
  color: string;
  onClick: () => void;
}) {
  if (count === 0) return <span className="text-[13px] font-semibold text-slate-200">—</span>;
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className="group flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-all hover:bg-indigo-50 hover:ring-2 hover:ring-indigo-200"
      title={`View ${count} candidate${count !== 1 ? 's' : ''} in this stage`}
    >
      <span
        className="text-[14px] font-black tabular-nums transition-colors group-hover:text-indigo-700"
        style={{ color }}
      >
        {count}
      </span>
      {base > 0 && (
        <span className="text-[9px] font-semibold text-slate-400 group-hover:text-indigo-400">
          {Math.round((count / base) * 100)}%
        </span>
      )}
    </button>
  );
}

function ClickableTotalCount({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return <span className="text-[14px] font-black text-slate-200">0</span>;
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className="group rounded-lg px-2 py-1 transition-all hover:bg-indigo-50 hover:ring-2 hover:ring-indigo-200"
      title={`View all ${count} candidates`}
    >
      <span className="text-[15px] font-black text-slate-900 group-hover:text-indigo-700">
        {count}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function RecruiterTable({
  title,
  serviceLineId,
  data,
  stages,
  baseQs,
  onDownloadAll,
  onDownloadSelected,
}: RecruiterTableProps) {
  const tableKey = `reports.recruiters:${serviceLineId ?? 'unassigned'}`;

  const { selected, toggle, toggleAll } = useSelection();
  const { expanded, toggleExp } = useExpanded();
  const { selectedStageIds, toggleStage, clearStages } = useStageSelection();

  const ready = useReportViewsReady();
  const hiddenRaw = useReportViewStore(s => s.hiddenColumns[tableKey]);
  const hidden = ready ? (hiddenRaw ?? []) : [];

  // ── Drill dialog ────────────────────────────────────────────────────────────
  const [drillTarget, setDrillTarget] = useState<RecruiterDrillTarget | null>(null);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const openDrill = useCallback((row: RecruiterStat, stageId?: string, stageLabel?: string) => {
    setDrillTarget({
      recruiterId: row.id,
      recruiterName: row.name,
      recruiterEmail: row.email,
      stageId,
      stageLabel,
    });
  }, []);

  const allIds = useMemo(() => data.map((r: any) => r.id), [data]);

  // Split stages by type — useMemo for stable references (compiler compliance)
  const pipelineStages = useMemo(
    () => stages.filter(s => !s.isTerminal && !s.isNearTerminal),
    [stages]
  );
  const nearTermStages = useMemo(
    () => stages.filter(s => s.isNearTerminal && !s.isTerminal),
    [stages]
  );
  const terminalStages = useMemo(() => stages.filter(s => s.isTerminal), [stages]);

  const columns = useMemo<ColumnDef<RecruiterStat>[]>(
    () => [
      makeSelectColumn<RecruiterStat>(getId, allIds, selected, toggle, toggleAll),
      makeExpandColumn<RecruiterStat>(getId, expanded, toggleExp),
      makeSrColumn<RecruiterStat>(),

      // ── Frozen: recruiter name ─────────────────────────────────────────────
      {
        id: 'recruiter',
        label: 'Recruiter',
        frozen: true,
        locked: true,
        width: 240,
        exportFields: [
          { label: 'Recruiter', value: (r: any) => r.name },
          { label: 'Email', value: (r: any) => r.email },
        ],
        cell: (r: any) => (
          <div className="overflow-hidden">
            <div className="truncate text-[13px] font-bold text-slate-900">{r.name}</div>
            <div className="truncate text-[11px] text-slate-700">{r.email}</div>
          </div>
        ),
      },

      // ── Activity ───────────────────────────────────────────────────────────
      {
        id: 'jobs',
        label: 'Jobs',
        align: 'center',
        group: 'Activity',
        exportValue: (r: any) => r.requirementBreakdown?.length ?? 0,
        cell: (r: any) => (
          <span className="text-[12px] font-semibold text-slate-700">
            {r.requirementBreakdown?.length ?? 0}
          </span>
        ),
      },
      {
        id: 'sourced',
        label: 'Sourced',
        align: 'center',
        group: 'Activity',
        exportValue: (r: any) => r.sourced,
        cell: (r: any) => <ClickableTotalCount count={r.sourced} onClick={() => openDrill(r)} />,
      },

      // ── Pipeline stage columns ─────────────────────────────────────────────
      ...pipelineStages.map<ColumnDef<RecruiterStat>>((s, i) => {
        const stageSelected = selectedStageIds.has(s.id);
        const color = stageSelected ? '#4F46E5' : FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        return {
          id: `stage:${s.id}`,
          label: s.label,
          align: 'center' as const,
          group: 'Pipeline stages',
          dotColor: color,
          headerTitle: `${s.serviceLine ? `${s.label} · ${s.serviceLine.name}` : `${s.label} · Common`} — click header to toggle export / click count to view candidates`,
          exportValue: (r: any) => r.stageCounts?.[s.id] ?? 0,
          header: (
            <button
              onClick={() => toggleStage(s.id)}
              title={stageSelected ? 'Remove from export filter' : 'Add to export filter'}
              className={`flex w-full flex-col items-center gap-0.5 rounded px-1 py-0.5 transition-all ${stageSelected ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50' : 'hover:bg-slate-100'}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span
                className="block max-w-25 truncate text-[11px] font-bold uppercase tracking-widest"
                style={{ color: stageSelected ? '#4F46E5' : undefined }}
              >
                {s.label}
              </span>
            </button>
          ),
          cell: (r: any) => (
            <ClickableStageCount
              count={r.stageCounts?.[s.id] ?? 0}
              base={r.sourced}
              color={color}
              onClick={() => openDrill(r, s.id, s.label)}
            />
          ),
        };
      }),

      // ── Near-terminal stage columns ────────────────────────────────────────
      ...nearTermStages.map<ColumnDef<RecruiterStat>>((s, i) => {
        const stageSelected = selectedStageIds.has(s.id);
        const color = stageSelected ? '#4F46E5' : '#D97706';
        return {
          id: `stage:${s.id}`,
          label: s.label,
          align: 'center' as const,
          group: 'Near Close',
          dotColor: color,
          headerTitle: `${s.label} — near close stage — click count to view candidates`,
          exportValue: (r: any) => r.stageCounts?.[s.id] ?? 0,
          header: (
            <button
              onClick={() => toggleStage(s.id)}
              className={`flex w-full flex-col items-center gap-0.5 rounded px-1 py-0.5 transition-all ${stageSelected ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50' : 'hover:bg-slate-100'}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span
                className="block max-w-25 truncate text-[11px] font-bold uppercase tracking-widest"
                style={{ color: stageSelected ? '#4F46E5' : '#D97706' }}
              >
                {s.label}
              </span>
              <span className="text-[8px] font-bold text-amber-600 uppercase">≈ near</span>
            </button>
          ),
          cell: (r: any) => (
            <ClickableStageCount
              count={r.stageCounts?.[s.id] ?? 0}
              base={r.sourced}
              color={color}
              onClick={() => openDrill(r, s.id, s.label)}
            />
          ),
        };
      }),

      // ── Terminal stage columns ─────────────────────────────────────────────
      ...terminalStages.map<ColumnDef<RecruiterStat>>((s, i) => {
        const stageSelected = selectedStageIds.has(s.id);
        const color = stageSelected ? '#4F46E5' : '#059669';
        return {
          id: `stage:${s.id}`,
          label: s.label,
          align: 'center' as const,
          group: 'Placed',
          dotColor: color,
          headerTitle: `${s.label} — placed / terminal stage — click count to view candidates`,
          exportValue: (r: any) => r.stageCounts?.[s.id] ?? 0,
          header: (
            <button
              onClick={() => toggleStage(s.id)}
              className={`flex w-full flex-col items-center gap-0.5 rounded px-1 py-0.5 transition-all ${stageSelected ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50' : 'hover:bg-slate-100'}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span
                className="block max-w-25 truncate text-[11px] font-bold uppercase tracking-widest"
                style={{ color: stageSelected ? '#4F46E5' : '#059669' }}
              >
                {s.label}
              </span>
              <span className="text-[8px] font-bold text-emerald-600 uppercase">✓ placed</span>
            </button>
          ),
          cell: (r: any) => (
            <ClickableStageCount
              count={r.stageCounts?.[s.id] ?? 0}
              base={r.sourced}
              color={color}
              onClick={() => openDrill(r, s.id, s.label)}
            />
          ),
        };
      }),

      // ── Outcome summary columns ────────────────────────────────────────────
      {
        id: 'placed',
        label: 'Placed',
        align: 'center',
        group: 'Outcome',
        exportValue: (r: any) => r.placed ?? r.joined ?? 0,
        cell: (r: any) => {
          const val = r.placed ?? r.joined ?? 0;
          return (
            <button
              onClick={e => {
                e.stopPropagation(); /* could drill terminal */
              }}
              className="text-[13px] font-black text-emerald-700"
            >
              {val}
            </button>
          );
        },
      },
      {
        id: 'nearTerminal',
        label: 'Near Close',
        align: 'center',
        group: 'Outcome',
        exportValue: (r: any) => r.nearTerminal ?? 0,
        cell: (r: any) => (
          <span
            className={`text-[13px] font-bold ${(r.nearTerminal ?? 0) > 0 ? 'text-amber-600' : 'text-slate-200'}`}
          >
            {r.nearTerminal ?? 0}
          </span>
        ),
      },
      {
        id: 'inPipeline',
        label: 'In Pipeline',
        align: 'center',
        group: 'Outcome',
        exportValue: (r: any) => r.inPipeline ?? r.active ?? 0,
        cell: (r: any) => (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
            {r.inPipeline ?? r.active ?? 0}
          </span>
        ),
      },
      {
        id: 'offPipeline',
        label: 'Off Pipeline',
        align: 'center',
        group: 'Outcome',
        exportValue: (r: any) => r.offPipeline ?? r.dropped ?? 0,
        cell: (r: any) => {
          const val = r.offPipeline ?? r.dropped ?? 0;
          return (
            <span
              className={`text-[13px] font-bold ${val > 0 ? 'text-red-500' : 'text-slate-200'}`}
            >
              {val}
            </span>
          );
        },
      },
      {
        id: 'avgDays',
        label: 'Avg days',
        align: 'center',
        group: 'Outcome',
        headerTitle: 'Average days from sourcing to submission',
        exportValue: (r: any) => r.avgTimeToSubmitDays ?? '',
        cell: (r: any) => (
          <span className="text-[12px] font-medium text-slate-500">
            {r.avgTimeToSubmitDays != null ? `${r.avgTimeToSubmitDays}d` : '—'}
          </span>
        ),
      },

      {
        id: 'total',
        label: 'Total',
        align: 'center',
        group: 'Outcome',
        headerTitle: 'Total count of all candidates for this recruiter across all stages',
        exportValue: (r: any) => r.sourced ?? 0,
        // cell: (r: any) => (
        //   <span className="text-[13px] font-black text-slate-700">{r.sourced ?? 0}</span>
        // ),
        cell: (r: any) => {
          // Sum only the stage columns currently visible
          const visibleStageIds = [...pipelineStages, ...nearTermStages, ...terminalStages]
            .filter(s => !hidden.includes(`stage:${s.id}`))
            .map(s => s.id);

          const rowTotal = visibleStageIds.reduce(
            (sum, sid) => sum + (r.stageCounts?.[sid] ?? 0),
            0
          );
          return <span className="text-[13px] font-black text-slate-700">{rowTotal}</span>;
        },
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
      pipelineStages,
      nearTermStages,
      terminalStages,
      selectedStageIds,
      toggleStage,
      openDrill,
      hidden,
    ]
  );

  const stageIdsArr = [...selectedStageIds];
  const hiddenStageIds = hidden
    .filter(id => id.startsWith('stage:'))
    .map(id => id.replace('stage:', ''));

  // ── Footer totals: column-wise sums across all recruiters ──────────────────
  // const footerRow = useMemo(() => {
  //   const totals: Record<string, number> = {};
  //   for (const r of data) {
  //     for (const s of stages) {
  //       const key = `stage:${s.id}`;
  //       totals[key] = (totals[key] ?? 0) + (r.stageCounts?.[s.id] ?? 0);
  //     }
  //     totals['jobs'] = (totals['jobs'] ?? 0) + (r.requirementBreakdown?.length ?? 0);
  //     totals['sourced'] = (totals['sourced'] ?? 0) + (r.sourced ?? 0);
  //     totals['placed'] = (totals['placed'] ?? 0) + (r.placed ?? r.joined ?? 0);
  //     totals['nearTerminal'] = (totals['nearTerminal'] ?? 0) + (r.nearTerminal ?? 0);
  //     totals['inPipeline'] = (totals['inPipeline'] ?? 0) + (r.inPipeline ?? r.active ?? 0);
  //     totals['offPipeline'] = (totals['offPipeline'] ?? 0) + (r.offPipeline ?? r.dropped ?? 0);
  //     totals['total'] = (totals['total'] ?? 0) + (r.sourced ?? 0);
  //   }
  //   return totals;
  // }, [data, stages]);
  // ── Footer totals: column-wise sums across all recruiters ──────────────────
  const footerRow = useMemo(() => {
    const totals: Record<string, number> = {};

    const visibleStageIds = [...pipelineStages, ...nearTermStages, ...terminalStages]
      .filter(s => !hidden.includes(`stage:${s.id}`))
      .map(s => s.id);

    for (const r of data) {
      for (const s of stages) {
        const key = `stage:${s.id}`;
        totals[key] = (totals[key] ?? 0) + (r.stageCounts?.[s.id] ?? 0);
      }
      totals['jobs'] = (totals['jobs'] ?? 0) + (r.requirementBreakdown?.length ?? 0);
      totals['sourced'] = (totals['sourced'] ?? 0) + (r.sourced ?? 0);
      totals['placed'] = (totals['placed'] ?? 0) + (r.placed ?? 0);
      totals['nearTerminal'] = (totals['nearTerminal'] ?? 0) + (r.nearClose ?? r.nearTerminal ?? 0);
      totals['inPipeline'] = (totals['inPipeline'] ?? 0) + (r.inPipeline ?? 0);
      totals['offPipeline'] = (totals['offPipeline'] ?? 0) + (r.offPipeline ?? 0);

      const rowTotal = visibleStageIds.reduce((sum, sid) => sum + (r.stageCounts?.[sid] ?? 0), 0);
      totals['total'] = (totals['total'] ?? 0) + rowTotal;
    }

    return totals;
  }, [data, stages, hidden, pipelineStages, nearTermStages, terminalStages]);
  return (
    <>
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
                >
                  ×
                </button>
              </span>
            ) : (
              <span className="text-[10px] font-medium text-slate-400">
                Click stage headers to filter export · Click counts to view candidates
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
          footerRow={footerRow}
          renderExpanded={r =>
            r.requirementBreakdown?.length > 0 ? (
              <div className="space-y-1.5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Per requirement
                  </p>
                  <button
                    onClick={() => openDrill(r)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                  >
                    View all {r.sourced} candidates →
                  </button>
                </div>
                {r.requirementBreakdown.map((rqi: any, ri: number) => (
                  <div
                    key={rqi.requirementId}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-4 text-[11px] font-bold text-slate-300">{ri + 1}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                        {rqi.reqCode}
                      </span>
                      <span className="min-w-30 flex-1 truncate text-[12px] font-semibold text-slate-800">
                        {rqi.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[rqi.status] ?? 'bg-slate-100 text-slate-500'}`}
                      >
                        {rqi.status?.replace(/_/g, ' ')}
                      </span>
                      {rqi.client && (
                        <span className="text-[11px] text-slate-400">{rqi.client.name}</span>
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-4 border-t border-slate-100 pt-2.5">
                      <MiniStat l="Sourced" v={rqi.sourced} />
                      <MiniStat l="Placed" v={rqi.placed ?? rqi.joined ?? 0} c="text-emerald-700" />
                      <MiniStat l="Near Close" v={rqi.nearTerminal ?? 0} c="text-amber-700" />
                      <MiniStat
                        l="In Pipeline"
                        v={rqi.inPipeline ?? rqi.active ?? 0}
                        c="text-indigo-700"
                      />
                      <MiniStat
                        l="Off Pipeline"
                        v={rqi.offPipeline ?? rqi.dropped ?? 0}
                        c="text-red-500"
                      />
                    </div>
                    {stages.some(s => (rqi.stageCounts?.[s.id] ?? 0) > 0) && (
                      <div className="mt-2.5 flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">
                        {stages
                          .filter(s => (rqi.stageCounts?.[s.id] ?? 0) > 0)
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

      <RecruiterCandidateDrillDialog
        target={drillTarget}
        baseQs={baseQs}
        onClose={() => setDrillTarget(null)}
      />
    </>
  );
}

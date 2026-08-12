'use client';

// File: RequirementTable.tsx
// Path: src/components/reports/RequirementTable.tsx

import { useMemo } from 'react';
import { FileDown } from 'lucide-react';
import { DataTable, type ColumnDef } from './DataTable';
import { ColumnViewMenu } from './ColumnViewMenu';
import {
  DownloadMenu,
  FUNNEL_COLORS,
  GroupHeader,
  STATUS_STYLE,
  StageCell,
  StickyTableCard,
  fmtDate,
  makeExpandColumn,
  makeSelectColumn,
  makeSrColumn,
  useExpanded,
  useSelection,
  useStageSelection,
} from './reportUi';
import { useReportViewStore, useReportViewsReady } from '@/stores/reportViewStore';
import type { RequirementRow, StageMeta } from './types';

interface RequirementTableProps {
  title: string | null;
  serviceLineId?: string;
  data: RequirementRow[];
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
  onDownloadRow: (id: string, reqCode: string) => void;
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <span className="text-slate-400">{label}: </span>
      <span className={`font-semibold ${tone ?? 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

export function RequirementTable({
  title,
  serviceLineId,
  data,
  stages,
  onDownloadAll,
  onDownloadSelected,
  onDownloadRow,
}: RequirementTableProps) {
  const tableKey = `reports.requirements:${serviceLineId ?? 'unassigned'}`;

  const { selected, toggle, toggleAll } = useSelection();
  const { expanded, toggleExp } = useExpanded();
  const { selectedStageIds, toggleStage, clearStages } = useStageSelection();

  const ready = useReportViewsReady();
  const hiddenRaw = useReportViewStore(s => s.hiddenColumns[tableKey]);
  const hidden = ready ? (hiddenRaw ?? []) : [];

  const allIds = useMemo(() => data.map(r => r.id), [data]);
  const getId = (r: RequirementRow) => r.id;

  const columns = useMemo<ColumnDef<RequirementRow>[]>(
    () => [
      makeSelectColumn<RequirementRow>(getId, allIds, selected, toggle, toggleAll),
      makeExpandColumn<RequirementRow>(getId, expanded, toggleExp),
      makeSrColumn<RequirementRow>(),
      {
        id: 'requirement',
        label: 'Requirement',
        frozen: true,
        locked: true,
        width: 280,
        exportFields: [
          { label: 'Req code', value: r => r.reqCode },
          { label: 'Title', value: r => r.title },
        ],
        cell: r => (
          <div className="overflow-hidden">
            <div className="truncate text-[13px] font-bold leading-tight text-slate-900">
              {r.title}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                {r.reqCode}
              </span>
              {r.client && (
                <span className="truncate text-[11px] text-slate-400">{r.client.name}</span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        align: 'center',
        group: 'Requirement',
        exportValue: r => r.status.replace(/_/g, ' '),
        cell: r => (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-500'}`}
          >
            {r.status.replace(/_/g, ' ')}
          </span>
        ),
      },
      {
        id: 'priority',
        label: 'Priority',
        align: 'center',
        group: 'Requirement',
        exportValue: r => r.priority,
        cell: r => <span className="text-[12px] font-semibold text-slate-600">{r.priority}</span>,
      },
      {
        id: 'createdBy',
        label: 'Created by',
        align: 'center',
        group: 'Dates',
        exportValue: r => `${r.createdBy.firstName} ${r.createdBy.lastName}`.trim(),
        cell: r => (
          <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
            {`${r.createdBy.firstName} ${r.createdBy.lastName}`.trim() || '—'}
          </span>
        ),
      },
      {
        id: 'openings',
        label: 'Openings',
        align: 'center',
        group: 'Requirement',
        exportValue: r => r.totalOpenings,
        cell: r => <span className="text-[13px] font-bold text-slate-700">{r.totalOpenings}</span>,
      },
      {
        id: 'salaryMin',
        label: 'Min Salary',
        align: 'center',
        group: 'Salary',
        exportValue: r => r.salaryMin ?? '',
        cell: r => (
          <span className="text-[13px] font-bold text-slate-700">{r.salaryMin ?? '—'}</span>
        ),
      },
      {
        id: 'salaryMax',
        label: 'Max Salary',
        align: 'center',
        group: 'Salary',
        exportValue: r => r.salaryMax ?? '',
        cell: r => (
          <span className="text-[13px] font-bold text-slate-700">{r.salaryMax ?? '—'}</span>
        ),
      },
      {
        id: 'totalCandidates',
        label: 'Total',
        align: 'center',
        group: 'Requirement',
        headerTitle: 'Total candidates in this requirement',
        exportValue: r => r.totalCandidates,
        cell: r => (
          <span className="text-[14px] font-black text-slate-900">{r.totalCandidates}</span>
        ),
      },

      // ── Stage columns — clicking header toggles stage for export filter ──────
      ...stages.map<ColumnDef<RequirementRow>>((s, i) => {
        const stageSelected = selectedStageIds.has(s.id);
        return {
          id: `stage:${s.id}`,
          label: s.label,
          align: 'center',
          group: 'Pipeline stages',
          dotColor: stageSelected ? '#4F46E5' : FUNNEL_COLORS[i % FUNNEL_COLORS.length],
          headerTitle: `${s.serviceLine ? `${s.label} · ${s.serviceLine.name}` : `${s.label} · Common`} — click to toggle in export`,
          exportValue: r => r.stageCounts[s.id] ?? 0,
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
              base={r.totalCandidates}
              color={stageSelected ? '#4F46E5' : FUNNEL_COLORS[i % FUNNEL_COLORS.length]}
            />
          ),
        };
      }),

      {
        id: 'client',
        label: 'Client',
        group: 'Ownership',
        exportValue: r => r.client?.name ?? '',
        cell: r => (
          <span className="text-[12px] font-medium text-slate-600">{r.client?.name ?? '—'}</span>
        ),
      },
      {
        id: 'businessUnit',
        label: 'Business unit',
        group: 'Ownership',
        exportValue: r => r.businessUnit?.name ?? '',
        cell: r => (
          <span className="text-[12px] font-medium text-slate-600">
            {r.businessUnit?.name ?? '—'}
          </span>
        ),
      },
      {
        id: 'respondBy',
        label: 'Respond by',
        align: 'center',
        group: 'Dates',
        exportValue: r => fmtDate(r.respondBy),
        cell: r => (
          <span
            className={`whitespace-nowrap text-[11px] font-medium ${r.isRespondByBreached ? 'font-bold text-red-500' : 'text-slate-400'}`}
          >
            {fmtDate(r.respondBy)}
            {r.isRespondByBreached ? ' ⚠' : ''}
          </span>
        ),
      },
      {
        id: 'createdAt',
        label: 'Created',
        align: 'center',
        group: 'Dates',
        exportValue: r => fmtDate(r.createdAt),
        cell: r => (
          <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
            {fmtDate(r.createdAt)}
          </span>
        ),
      },
      {
        id: 'export',
        label: 'Export',
        align: 'center',
        group: 'Actions',
        cell: r => (
          <button
            onClick={() => onDownloadRow(r.id, r.reqCode)}
            className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100"
          >
            <FileDown className="h-3 w-3" /> Excel
          </button>
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
      onDownloadRow,
    ]
  );

  const stageIdsArr = [...selectedStageIds];

  const hiddenStageIds = hidden
    .filter(id => id.startsWith('stage:'))
    .map(id => id.replace('stage:', ''));

  return (
    <StickyTableCard>
      <GroupHeader
        title={title}
        count={data.length}
        countLabel="requirements"
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
        emptyMessage="No requirements found for this window."
        isExpanded={r => expanded.has(r.id)}
        rowClassName={r =>
          [
            expanded.has(r.id) ? 'bg-indigo-50' : 'hover:bg-slate-50',
            r.isRespondByBreached ? 'border-l-2 border-l-red-400' : '',
          ]
            .filter(Boolean)
            .join(' ')
        }
        frozenBgClass={r =>
          expanded.has(r.id) ? 'bg-indigo-50' : 'bg-white group-hover:bg-slate-50'
        }
        renderExpanded={r => (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
            {r.clientSpoc && (
              <Detail label="SPOC" value={`${r.clientSpoc.firstName} ${r.clientSpoc.lastName}`} />
            )}
            {r.businessUnit && <Detail label="BU" value={r.businessUnit.name} />}
            {r.serviceLine && <Detail label="Service line" value={r.serviceLine.name} />}
            {r.city && <Detail label="City" value={r.city} />}
            <Detail label="Job type" value={r.jobType} />
            <Detail label="Remote" value={r.remoteType} />
            <Detail label="Priority" value={r.priority} />
            {r.respondBy && (
              <Detail
                label="Respond by"
                value={`${fmtDate(r.respondBy)}${r.isRespondByBreached ? ' — breached' : ''}`}
                tone={r.isRespondByBreached ? 'text-red-500' : undefined}
              />
            )}
            <Detail label="Created by" value={`${r.createdBy.firstName} ${r.createdBy.lastName}`} />
            {r.deletedAt && (
              <Detail label="Deleted" value={fmtDate(r.deletedAt)} tone="text-red-500" />
            )}
          </div>
        )}
      />
    </StickyTableCard>
  );
}

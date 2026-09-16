'use client';

// File: RequirementTable.tsx
// Path: src/components/reports/RequirementTable.tsx

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronsUpDown, ChevronUp, FileDown } from 'lucide-react';
import { DataTable, type ColumnDef } from './DataTable';
import { ColumnViewMenu } from './ColumnViewMenu';
import {
  DownloadMenu,
  FUNNEL_COLORS,
  GroupHeader,
  STATUS_STYLE,
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
import type { RequirementRow, StageMeta, SaleValueBasis } from './types';
import { RequirementCandidateDrillDialog } from './RequirementCandidateDrillDialog';
import type { RequirementDrillTarget } from './RequirementCandidateDrillDialog';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL — stable reference, not recreated per render
// ─────────────────────────────────────────────────────────────────────────────

const getId = (r: RequirementRow) => r.id;
// IDs of columns that get a sort arrow — used to inject headers outside useMemo
const SORT_COLUMN_KEYS: Record<string, SortKey> = {
  Aging: 'aging',
  openings: 'openings',
  salaryMin: 'salaryMin',
  salaryMax: 'salaryMax',
  computedSaleValue: 'computedSaleValue',
  achievedValue: 'achievedValue',
  bandCode: 'bandValue',
  totalCandidates: 'totalCandidates',
  createdAt: 'createdAt',
  reqCode: 'reqCode',
};

// Module-level — stable
const VERTICAL_SORT_COLS = new Set([
  'openings',
  'clientPct',
  // 'computedSaleValue',
  'achievedValue',
  'totalCandidates',
  'bandCode',
  'Aging',
]);

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null;
export type SortKey =
  | 'aging'
  | 'openings'
  | 'salaryMin'
  | 'salaryMax'
  | 'computedSaleValue'
  | 'achievedValue'
  | 'bandValue'
  | 'totalCandidates'
  | 'createdAt'
  | 'reqCode';

interface RequirementTableProps {
  title: string | null;
  serviceLineId?: string;
  data: RequirementRow[];
  stages: StageMeta[];
  // ── Sort state lifted up so parent re-fetches when sort changes ───────────
  sortBy: SortKey | null;
  sortDir: SortDir;
  onSortChange: (key: SortKey | null, dir: SortDir) => void;
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

// Add near the top of the file, after SortableHeader
function VerticalHeader({ label }: { label: string }) {
  return (
    <div
      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      className="text-[11px] font-bold uppercase tracking-widest text-slate-900 py-1 mx-auto"
    >
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SORT ICON
// ─────────────────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || dir === null)
    return (
      <ChevronsUpDown className="h-3 w-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
    );
  if (dir === 'asc') return <ChevronUp className="h-3 w-3 text-indigo-500" />;
  return <ChevronDown className="h-3 w-3 text-indigo-500" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTABLE HEADER
// ─────────────────────────────────────────────────────────────────────────────

function SortableHeader({
  label,
  colSortKey,
  activeSortKey,
  sortDir,
  onSort,
  vertical = false,
}: {
  label: string;
  colSortKey: SortKey;
  activeSortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  vertical?: boolean;
}) {
  const isActive = activeSortKey === colSortKey && sortDir !== null;
  return (
    <button
      onClick={() => onSort(colSortKey)}
      className={`group flex ${vertical ? 'flex-col' : 'flex-row'} items-center justify-center gap-1 w-full rounded px-1 py-0.5 hover:bg-slate-100 transition-colors select-none`}
      title={`Sort by ${label}`}
    >
      <span
        style={vertical ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : undefined}
        className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${
          isActive ? 'text-indigo-600' : 'text-slate-900 group-hover:text-slate-700'
        }`}
      >
        {label}
      </span>
      <SortIcon active={activeSortKey === colSortKey} dir={isActive ? sortDir : null} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// function fmtCurrency(n: number | null | undefined): string {
//   if (n == null) return '—';
//   if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
//   if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
//   if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
//   return `₹${n.toLocaleString('en-IN')}`;
// }
function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

const BASIS_STYLE: Record<SaleValueBasis, { label: string; cls: string }> = {
  SALE_VALUE: { label: 'Direct', cls: 'bg-emerald-50 text-emerald-700' },
  BAND: { label: 'Band', cls: 'bg-blue-50 text-blue-700' },
  FIXED_PCT: { label: 'Fixed %', cls: 'bg-indigo-50 text-indigo-700' },
  NOT_FOUND: { label: 'No data', cls: 'bg-red-50 text-red-500' },
};

function SaleValueCell({ row }: { row: RequirementRow }) {
  if (!row.computedSaleValue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-400">
        No data
      </span>
    );
  }
  const basis = row.saleValueBasis as SaleValueBasis | null;
  const basisMeta = basis ? BASIS_STYLE[basis] : null;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[13px] font-black text-emerald-700">
        {fmtCurrency(row.computedSaleValue)}
      </span>
      {basisMeta && (
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${basisMeta.cls}`}>
          {basisMeta.label}
        </span>
      )}
    </div>
  );
}

function AchievedCell({ row }: { row: RequirementRow }) {
  if (!row.terminalCount) {
    return <span className="text-[13px] font-semibold text-slate-300">—</span>;
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[13px] font-black text-purple-700">
        {fmtCurrency(row.achievedValue)}
      </span>
      <span className="text-[9px] font-bold text-purple-400">
        {row.achievedPct}% · {row.terminalCount} placed
      </span>
    </div>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <span className="text-slate-400">{label}: </span>
      <span className={`font-semibold ${tone ?? 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLICKABLE STAGE COUNT
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
  if (count === 0) return <span className="text-[13px] font-semibold text-slate-300">—</span>;
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
      <span className="text-[14px] font-black text-slate-900 group-hover:text-indigo-700">
        {count}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function RequirementTable({
  title,
  serviceLineId,
  data,
  stages,
  sortBy,
  sortDir,
  onSortChange,
  onDownloadAll,
  onDownloadSelected,
  onDownloadRow,
}: RequirementTableProps) {
  const tableKey = `reports.requirements:${serviceLineId ?? 'unassigned'}`;

  const { selected, toggle, toggleAll } = useSelection();
  const { expanded, toggleExp } = useExpanded();
  const { selectedStageIds, toggleStage, clearStages } = useStageSelection();

  // ── Sort — cycle asc → desc → null, notify parent on every change ─────────
  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortBy !== key) {
        // New column → start asc
        onSortChange(key, 'asc');
      } else if (sortDir === 'asc') {
        onSortChange(key, 'desc');
      } else if (sortDir === 'desc') {
        // Third click → clear sort
        onSortChange(null, null);
      } else {
        onSortChange(key, 'asc');
      }
    },
    [sortBy, sortDir, onSortChange]
  );

  const ready = useReportViewsReady();
  const hiddenRaw = useReportViewStore(s => s.hiddenColumns[tableKey]);
  const hidden = ready ? (hiddenRaw ?? []) : [];

  // ── Drill dialog ──────────────────────────────────────────────────────────
  const [drillTarget, setDrillTarget] = useState<RequirementDrillTarget | null>(null);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const openDrill = useCallback((row: RequirementRow, stageId?: string, stageLabel?: string) => {
    setDrillTarget({
      requirementId: row.id,
      reqCode: row.reqCode,
      reqTitle: row.title,
      stageId,
      stageLabel,
      dialogTitle: stageLabel
        ? `${stageLabel} — ${row.reqCode}`
        : `All Candidates — ${row.reqCode}`,
    });
  }, []);

  const allIds = useMemo(() => data.map(r => r.id), [data]);

  const baseColumns = useMemo<ColumnDef<RequirementRow>[]>(
    () => [
      makeSelectColumn<RequirementRow>(getId, allIds, selected, toggle, toggleAll),
      makeExpandColumn<RequirementRow>(getId, expanded, toggleExp),
      makeSrColumn<RequirementRow>(),

      // ── Frozen: Requirement title + code ──────────────────────────────────
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
            <div className="mt-0.5 flex flex-wrap items-center gap-2 gap-y-0.5">
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                {r.reqCode}
              </span>
              {/* {r.client && (
                <span className="truncate text-[11px] text-slate-400">{r.client.name}</span>
              )} */}
            </div>
          </div>
        ),
      },

      // ── Core requirement info ──────────────────────────────────────────────
      {
        id: 'createdBy',
        label: 'Created by',
        align: 'center',
        group: 'Requirement',
        exportValue: r => `${r.createdBy.firstName} ${r.createdBy.lastName}`.trim(),
        cell: r => (
          <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
            {`${r.createdBy.firstName} ${r.createdBy.lastName}`.trim() || '—'}
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
        id: 'reqCode',
        label: 'Req Code',
        align: 'center',
        group: 'Requirement',
        exportValue: r => `${r.reqCode}`.trim(),
        cell: r => (
          <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
            {`${r.reqCode}`.trim() || '—'}
          </span>
        ),
      },
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
        id: 'clientSpoc',
        label: 'Client Spoc',
        group: 'Ownership',
        exportValue: r => `${r.clientSpoc?.firstName} ${r.clientSpoc?.lastName}`.trim(),
        cell: r => (
          <span className="text-[12px] font-medium text-slate-600">
            {r.clientSpoc?.firstName ?? '—'} {r.clientSpoc?.lastName ?? '—'}
          </span>
        ),
      },
      {
        id: 'Aging',
        label: 'Age',
        align: 'center',
        group: 'Requirement',

        exportValue: r => `${r.aging}`.trim(),

        cell: r => (
          <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
            {`${r.aging}`.trim() || '—'}
          </span>
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
      // {
      //   id: 'priority',
      //   label: 'Priority',
      //   align: 'center',
      //   group: 'Requirement',
      //   exportValue: r => r.priority,
      //   cell: r => <span className="text-[12px] font-semibold text-slate-600">{r.priority}</span>,
      // },

      {
        id: 'openings',
        label: 'Openings',
        align: 'center',
        group: 'Requirement',
        header: <VerticalHeader label="Openings" />,
        exportValue: r => r.totalOpenings,
        cell: r => <span className="text-[13px] font-bold text-slate-700">{r.totalOpenings}</span>,
      },

      // ── Salary ────────────────────────────────────────────────────────────
      {
        id: 'salaryMin',
        label: 'Min Salary',
        align: 'center',
        group: 'Salary',
        exportValue: r => r.salaryMin ?? '',
        cell: r => (
          <span className="text-[12px] font-semibold text-slate-600">
            {r.salaryMin != null ? fmtCurrency(r.salaryMin) : '—'}
          </span>
        ),
      },
      {
        id: 'salaryMax',
        label: 'Max Salary',
        align: 'center',
        group: 'Salary',
        exportValue: r => r.salaryMax ?? '',
        cell: r => (
          <span className="text-[12px] font-semibold text-slate-600 ">
            {r.salaryMax != null ? fmtCurrency(r.salaryMax) : '—'}
          </span>
        ),
      },

      // ── Sale value ────────────────────────────────────────────────────────
      {
        id: 'computedSaleValue',
        label: 'Sale Value',
        align: 'center',
        group: 'Sale Value',
        headerTitle:
          'Computed sale value per requirement (Direct / Band / Fixed %) — click No data to filter',
        exportValue: r => r.computedSaleValue ?? '',
        cell: r => <SaleValueCell row={r} />,
      },
      {
        id: 'achievedValue',
        label: 'Achieved',
        align: 'center',
        group: 'Sale Value',
        headerTitle: 'Achieved value — (placed / openings) × computed sale value',
        exportValue: r => r.achievedValue ?? '',
        cell: r => <AchievedCell row={r} />,
      },
      {
        id: 'bandCode',
        label: 'Band',
        align: 'center',
        group: 'Sale Value',
        exportValue: r => (r.bandCode ? `${r.bandCode} – ${r.bandName}` : ''),
        cell: r =>
          r.bandCode ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                {r.bandCode}
              </span>
              {r.bandValue != null && (
                <span className="text-[9px] text-slate-400">{fmtCurrency(r.bandValue)}</span>
              )}
            </div>
          ) : (
            <span className="text-slate-300 text-[12px]">—</span>
          ),
      },
      {
        id: 'clientPct',
        label: 'Client %',
        align: 'center',
        group: 'Sale Value',
        exportValue: r => (r.clientPct != null ? `${r.clientPct}%` : ''),
        cell: r =>
          r.clientPct != null ? (
            <span className="text-[12px] font-bold text-indigo-700">{r.clientPct}%</span>
          ) : (
            <span className="text-slate-300 text-[12px]">—</span>
          ),
      },

      // ── Total candidates (clickable) ───────────────────────────────────────
      {
        id: 'totalCandidates',
        label: 'Total',
        align: 'center',
        group: 'Pipeline',
        headerTitle: 'Total candidates — click to view all',
        exportValue: r => r.totalCandidates,
        cell: r => <ClickableTotalCount count={r.totalCandidates} onClick={() => openDrill(r)} />,
      },

      // ── Stage columns — clicking count opens drill dialog ─────────────────
      ...stages.map<ColumnDef<RequirementRow>>((s, i) => {
        const stageSelected = selectedStageIds.has(s.id);
        const color = stageSelected ? '#4F46E5' : FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        return {
          id: `stage:${s.id}`,
          label: s.label,
          align: 'center' as const,
          group: s.isTerminal ? 'Placed' : s.isNearTerminal ? 'Near Close' : 'Pipeline stages',
          dotColor: color,
          headerTitle: `${s.serviceLine ? `${s.label} · ${s.serviceLine.name}` : `${s.label} · Common`} — click header to toggle export / click count to view candidates`,
          exportValue: (r: RequirementRow) => r.stageCounts[s.id] ?? 0,
          header: (
            <button
              onClick={() => toggleStage(s.id)}
              title={stageSelected ? 'Remove from export filter' : 'Add to export filter'}
              className={`flex w-full flex-col items-center gap-0.5 rounded px-1 py-0.5 transition-all ${stageSelected ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50' : 'hover:bg-slate-100'}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              {/* <span
                className="block max-w-25 truncate text-[11px] font-bold uppercase tracking-widest"
                style={{ color: stageSelected ? '#4F46E5' : undefined }}
              >
                {s.label}
              </span> */}
              <span
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  color: stageSelected ? '#4F46E5' : undefined,
                }}
                className="text-[11px] font-bold uppercase tracking-widest"
              >
                {s.label}
              </span>
              {s.isTerminal && (
                <span className="text-[8px] font-bold text-emerald-600 uppercase">✓ placed</span>
              )}
              {s.isNearTerminal && !s.isTerminal && (
                <span className="text-[8px] font-bold text-amber-600 uppercase">≈ near</span>
              )}
            </button>
          ),
          cell: (r: RequirementRow) => (
            <ClickableStageCount
              count={r.stageCounts[s.id] ?? 0}
              base={r.totalCandidates}
              color={color}
              onClick={() => openDrill(r, s.id, s.label)}
            />
          ),
        };
      }),

      // ── Ownership ─────────────────────────────────────────────────────────
      // {
      //   id: 'client',
      //   label: 'Client',
      //   group: 'Ownership',
      //   exportValue: r => r.client?.name ?? '',
      //   cell: r => (
      //     <span className="text-[12px] font-medium text-slate-600">{r.client?.name ?? '—'}</span>
      //   ),
      // },
      {
        id: 'businessUnit',
        label: 'BU',
        group: 'Ownership',
        exportValue: r => r.businessUnit?.name ?? '',
        cell: r => (
          <span className="text-[12px] font-medium text-slate-600">
            {r.businessUnit?.name ?? '—'}
          </span>
        ),
      },

      // ── Dates ─────────────────────────────────────────────────────────────
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

      // ── Actions ───────────────────────────────────────────────────────────
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
      openDrill,
    ]
  );

  // ── Inject sort headers — separate memo so baseColumns stays stable ────────
  const columns = useMemo<ColumnDef<RequirementRow>[]>(
    () =>
      baseColumns.map(col => {
        const colSortKey = SORT_COLUMN_KEYS[col.id];
        if (!colSortKey) return col;
        return {
          ...col,
          header: (
            <SortableHeader
              label={col.label}
              colSortKey={colSortKey}
              activeSortKey={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              vertical={VERTICAL_SORT_COLS.has(col.id)}
            />
          ),
        };
      }),
    [baseColumns, sortBy, sortDir, handleSort]
  );

  // ─────────────────────────────────────────────────────────────────────────

  const stageIdsArr = [...selectedStageIds];
  const hiddenStageIds = hidden
    .filter(id => id.startsWith('stage:'))
    .map(id => id.replace('stage:', ''));

  return (
    <>
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
              {r.computedSaleValue != null && (
                <Detail
                  label="Sale value"
                  value={`${fmtCurrency(r.computedSaleValue)} (${r.saleValueBasis})`}
                  tone="text-emerald-700"
                />
              )}
              {r.achievedValue != null && r.achievedValue > 0 && (
                <Detail
                  label="Achieved"
                  value={`${fmtCurrency(r.achievedValue)} · ${r.achievedPct}%`}
                  tone="text-purple-700"
                />
              )}
              {r.respondBy && (
                <Detail
                  label="Respond by"
                  value={`${fmtDate(r.respondBy)}${r.isRespondByBreached ? ' — breached' : ''}`}
                  tone={r.isRespondByBreached ? 'text-red-500' : undefined}
                />
              )}
              <Detail
                label="Created by"
                value={`${r.createdBy.firstName} ${r.createdBy.lastName}`}
              />
              {r.deletedAt && (
                <Detail label="Deleted" value={fmtDate(r.deletedAt)} tone="text-red-500" />
              )}
              <button
                onClick={() => openDrill(r)}
                className="ml-auto flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
              >
                View {r.totalCandidates} candidates →
              </button>
            </div>
          )}
        />
      </StickyTableCard>

      <RequirementCandidateDrillDialog target={drillTarget} onClose={() => setDrillTarget(null)} />
    </>
  );
}

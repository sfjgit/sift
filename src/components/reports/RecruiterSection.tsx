// File: RecruiterSection.tsx
// Path: src/components/reports/RecruiterSection.tsx
//
// Recruiters tab — ACTIVITY ONLY. "What happened in the selected window."
//   Data     GET /reports/recruiters/activity (fetched by the page, passed in)
//   Rows     one per person, hierarchy order (you → your reports → theirs)
//   Money    Funnel · Pipeline · Achieved per row (+ team rollup in the expand)
//   Counts   unique candidates; Placed = still placed now, Reversed shown apart
//   Drill    any count → the real stage moves behind it
//   Columns  drag headers or use the Columns panel; save layouts as views (★ default)

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { DataTable, type ColumnDef } from './DataTable';
import { ColumnViewMenu } from './ColumnViewMenu';
import {
  Empty,
  GroupHeader,
  MiniStat,
  Skel,
  StickyTableCard,
  makeExpandColumn,
  makeSelectColumn,
  makeSrColumn,
  useExpanded,
  useSelection,
} from './reportUi';
import { ActivityExportMenu } from './ActivityExportMenu';
import { useReportTableLayout } from '@/stores/reportViewStore';
import type {
  ActivityBucket,
  RecruiterActivityGroup,
  RecruiterActivityResponse,
  RecruiterActivityRow,
  SaleBucket,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// BUCKETS + FORMATTERS — stage flags only
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVITY_BUCKETS: {
  key: ActivityBucket;
  label: string;
  rowKey:
    | 'sourcedCount'
    | 'activeCount'
    | 'nearTerminalCount'
    | 'terminalCount'
    | 'offPipelineCount';
  color: string;
  hint: string;
}[] = [
  {
    key: 'sourced',
    label: 'Added',
    rowKey: 'sourcedCount',
    color: '#64748B',
    hint: 'Candidates added in the window',
  },
  {
    key: 'active',
    label: 'Active',
    rowKey: 'activeCount',
    color: '#4F46E5',
    hint: 'Moved through screening / interview stages',
  },
  {
    key: 'pipeline',
    label: 'Pipeline',
    rowKey: 'nearTerminalCount',
    color: '#D97706',
    hint: 'Moved to near-close stages',
  },
  {
    key: 'placed',
    label: 'Placed',
    rowKey: 'terminalCount',
    color: '#059669',
    hint: 'Placed in the window and still placed now',
  },
  {
    key: 'dropped',
    label: 'Dropped',
    rowKey: 'offPipelineCount',
    color: '#DC2626',
    hint: 'Moved to off-pipeline stages',
  },
];

const BUCKET_STYLE: Record<string, string> = {
  Added: 'bg-slate-100 text-slate-600',
  Active: 'bg-indigo-50 text-indigo-700',
  Pipeline: 'bg-amber-50 text-amber-700',
  Placed: 'bg-emerald-50 text-emerald-700',
  Dropped: 'bg-red-50 text-red-500',
};

function bucketOfStage(s: any): ActivityBucket {
  if (s.isTerminal) return 'placed';
  if (s.isNearTerminal) return 'pipeline';
  if (s.pipeline === false) return 'dropped';
  if (s.isSourced) return 'sourced';
  return 'active';
}

export function fmtMoney(n: number | null | undefined): string {
  if (!n) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

const getId = (r: RecruiterActivityRow) => r.id;

function inBucket(r: RecruiterActivityRow, bucket: SaleBucket) {
  if (bucket === 'terminal') return r.terminalCount > 0;
  if (bucket === 'nearTerminal') return r.nearTerminalCount > 0;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY DRILL — the real stage moves behind any number
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityDrillTarget {
  recruiterId?: string; // undefined = everyone in scope
  title: string;
  stageId?: string;
  bucket?: ActivityBucket;
}

export function ActivityDrillDrawer({
  target,
  baseQs,
  onClose,
}: {
  target: ActivityDrillTarget | null;
  baseQs: string;
  onClose: () => void;
}) {
  const axios = useAxios();
  const [query, setQuery] = useState('');

  const qs = useMemo(() => {
    if (!target) return '';
    const p = new URLSearchParams(baseQs);
    p.set('recruiterId', target.recruiterId ?? '__all__');
    if (target.stageId) p.set('stageId', target.stageId);
    if (target.bucket) p.set('bucket', target.bucket);
    return p.toString();
  }, [target, baseQs]);

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter-activity-drill', qs],
    queryFn: async () => (await axios.get(`/reports/recruiters/activity/drill?${qs}`)).data,
    enabled: !!target,
    staleTime: 60_000,
  });

  if (!target) return null;

  const rows: any[] = data?.data?.rows ?? [];
  const stageSummary: Record<string, number> = data?.data?.stageSummary ?? {};
  const term = query.trim().toLowerCase();
  const shown = term
    ? rows.filter(r =>
        [
          r.candidate.name,
          r.candidate.email,
          r.requirement.reqCode,
          r.requirement.title,
          r.client?.name,
          r.recruiterName,
          r.movedBy,
        ]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(term))
      )
    : rows;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-black text-slate-900">{target.title}</h2>
            <p className="text-[12px] text-slate-400">
              {isLoading
                ? 'Loading…'
                : `${rows.length} stage move${rows.length !== 1 ? 's' : ''} in this window${data?.data?.capped ? ' (first 3,000)' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 border-b border-slate-100 bg-slate-50 px-6 py-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search candidate, requirement, client, recruiter"
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-indigo-300"
          />
          {!isLoading && Object.keys(stageSummary).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stageSummary)
                .sort((a, b) => b[1] - a[1])
                .map(([label, count]) => (
                  <span
                    key={label}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[12px] font-bold text-slate-700"
                  >
                    {label}
                    <span className="ml-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {count}
                    </span>
                  </span>
                ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[13px] text-slate-400">
              {term ? 'No matches for that search.' : 'No activity in this window.'}
            </div>
          ) : (
            <div className="space-y-2">
              {shown.map((row: any) => (
                <div
                  key={row.logId}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-slate-900">
                        {row.candidate.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {[row.candidate.email, row.candidate.phone].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {row.reversed && (
                        <span
                          className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600"
                          title={`No longer placed. Now in: ${row.currentStageLabel ?? '—'}`}
                        >
                          Reversed
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${BUCKET_STYLE[row.toStage.bucket] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {row.toStage.bucket}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                      {row.fromStage?.label ?? 'Start'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span
                      className={`rounded px-2 py-0.5 font-bold ${
                        row.toStage.isTerminal
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.toStage.isNearTerminal
                            ? 'bg-amber-100 text-amber-800'
                            : row.toStage.pipeline === false
                              ? 'bg-red-100 text-red-700'
                              : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {row.toStage.label}
                    </span>
                    {row.movedBy && row.movedBy !== '—' && (
                      <span className="text-[11px] text-slate-400">by {row.movedBy}</span>
                    )}
                    {!target.recruiterId && row.recruiterName && (
                      <span className="text-[11px] text-slate-400">
                        · owner {row.recruiterName}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-500">
                      {row.requirement.reqCode}
                    </span>
                    <span className="truncate">{row.requirement.title}</span>
                    {row.client && <span>· {row.client.name}</span>}
                    <span className="ml-auto font-medium text-slate-500">
                      {new Date(row.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CELLS
// ─────────────────────────────────────────────────────────────────────────────

function CountCell({
  value,
  color,
  onClick,
  title,
}: {
  value: number;
  color?: string;
  onClick?: () => void;
  title?: string;
}) {
  if (!value) return <span className="text-[13px] font-semibold text-slate-200">—</span>;
  if (!onClick)
    return (
      <span className="text-[13px] font-black tabular-nums" style={{ color }}>
        {value}
      </span>
    );
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className="rounded-lg px-2 py-1 transition-all hover:bg-indigo-50 hover:ring-2 hover:ring-indigo-200"
    >
      <span className="text-[13px] font-black tabular-nums" style={{ color }}>
        {value}
      </span>
    </button>
  );
}

const MoneyCell = ({ value, strong }: { value?: number | null; strong?: boolean }) => (
  <span
    className={`text-[12px] tabular-nums ${value ? (strong ? 'font-black text-emerald-700' : 'font-semibold text-slate-800') : 'text-slate-200'}`}
  >
    {fmtMoney(value)}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// TABLE — one service line
// ─────────────────────────────────────────────────────────────────────────────

function ActivityTable({
  group,
  baseQs,
  onDrill,
}: {
  group: RecruiterActivityGroup;
  baseQs: string;
  onDrill: (t: ActivityDrillTarget) => void;
}) {
  const tableKey = `reports.recruiterActivity:${group.serviceLine?.id ?? 'unassigned'}`;
  const data = group.data;
  const { selected, toggle, toggleAll } = useSelection();
  const { expanded, toggleExp } = useExpanded();
  const { hidden, order, setOrder } = useReportTableLayout(tableKey);

  const allIds = useMemo(() => data.map(getId), [data]);

  // Stage columns grouped the same way as the buckets
  const stageGroups = useMemo(
    () =>
      ACTIVITY_BUCKETS.map(b => ({
        bucket: b,
        stages: group.stages.filter(s => bucketOfStage(s) === b.key),
      })).filter(g => g.stages.length > 0),
    [group.stages]
  );

  const baseColumns = useMemo<ColumnDef<RecruiterActivityRow>[]>(
    () => [
      makeSelectColumn<RecruiterActivityRow>(getId, allIds, selected, toggle, toggleAll),
      makeExpandColumn<RecruiterActivityRow>(getId, expanded, toggleExp),
      makeSrColumn<RecruiterActivityRow>(),
      {
        id: 'recruiter',
        label: 'Recruiter',
        frozen: true,
        locked: true,
        width: 260,
        exportFields: [
          { label: 'Recruiter', value: (r: RecruiterActivityRow) => r.name },
          { label: 'Email', value: (r: RecruiterActivityRow) => r.email },
        ],
        cell: (r: RecruiterActivityRow) => (
          <div className="overflow-hidden" style={{ paddingLeft: Math.min(r.depth ?? 0, 4) * 12 }}>
            <button
              onClick={e => {
                e.stopPropagation();
                onDrill({ recruiterId: r.id, title: `${r.name} — all activity` });
              }}
              className="block max-w-full truncate text-left text-[13px] font-bold text-slate-900 hover:text-indigo-700"
              title="Open everything this person did in the window"
            >
              {r.name}
            </button>
            <div className="truncate text-[11px] text-slate-500">
              {[r.role?.replaceAll('_', ' '), r.managerName && `reports to ${r.managerName}`]
                .filter(Boolean)
                .join(' · ') || r.email}
            </div>
          </div>
        ),
      },

      // ── Money ──────────────────────────────────────────────────────────
      {
        id: 'assignedReqs',
        label: 'Assigned reqs',
        align: 'center',
        group: 'Money',
        headerTitle: 'Requirements assigned to this person (in the window, when a window is set)',
        exportValue: (r: RecruiterActivityRow) => r.assignedReqCount,
        cell: (r: RecruiterActivityRow) => <CountCell value={r.assignedReqCount} color="#334155" />,
      },
      {
        id: 'funnel',
        label: 'Funnel',
        align: 'center',
        group: 'Money',
        headerTitle: 'Value of requirements assigned to this person',
        exportValue: (r: RecruiterActivityRow) => r.funnelValue,
        cell: (r: RecruiterActivityRow) => <MoneyCell value={r.funnelValue} />,
      },
      {
        id: 'pipelineValue',
        label: 'Pipeline',
        align: 'center',
        group: 'Money',
        headerTitle:
          'Value share of candidates moved to near-close in the window (capped at openings)',
        exportValue: (r: RecruiterActivityRow) => r.pipelineValue,
        cell: (r: RecruiterActivityRow) => <MoneyCell value={r.pipelineValue} />,
      },
      {
        id: 'achievedValue',
        label: 'Achieved',
        align: 'center',
        group: 'Money',
        headerTitle:
          'Value share of placements made in the window that still stand (capped at openings)',
        exportValue: (r: RecruiterActivityRow) => r.achievedValue,
        cell: (r: RecruiterActivityRow) => <MoneyCell value={r.achievedValue} strong />,
      },
      {
        id: 'achievedPct',
        label: 'Achieved %',
        align: 'center',
        group: 'Money',
        headerTitle: 'Achieved ÷ Funnel',
        exportValue: (r: RecruiterActivityRow) => r.achievedPct,
        cell: (r: RecruiterActivityRow) => (
          <span
            className={`text-[12px] font-bold tabular-nums ${r.achievedPct > 0 ? 'text-emerald-700' : 'text-slate-200'}`}
          >
            {r.achievedPct > 0 ? `${r.achievedPct}%` : '—'}
          </span>
        ),
      },

      // ── Activity ───────────────────────────────────────────────────────
      {
        id: 'candidates',
        label: 'Candidates',
        align: 'center',
        group: 'Activity',
        headerTitle: 'Unique candidates this person moved in the window',
        exportValue: (r: RecruiterActivityRow) => r.candidates,
        cell: (r: RecruiterActivityRow) => (
          <CountCell
            value={r.candidates}
            color="#0F172A"
            title="Open every move"
            onClick={() => onDrill({ recruiterId: r.id, title: `${r.name} — all activity` })}
          />
        ),
      },
      {
        id: 'moves',
        label: 'Moves',
        align: 'center',
        group: 'Activity',
        headerTitle: 'Total stage moves (a candidate moved 3 times = 3)',
        exportValue: (r: RecruiterActivityRow) => r.totalTransitions,
        cell: (r: RecruiterActivityRow) => <CountCell value={r.totalTransitions} color="#475569" />,
      },
      ...ACTIVITY_BUCKETS.map<ColumnDef<RecruiterActivityRow>>(b => ({
        id: `bucket:${b.key}`,
        label: b.label,
        align: 'center',
        group: 'Activity',
        dotColor: b.color,
        headerTitle: b.hint,
        exportValue: (r: RecruiterActivityRow) => r[b.rowKey],
        cell: (r: RecruiterActivityRow) => (
          <CountCell
            value={r[b.rowKey]}
            color={b.color}
            title={`Open ${b.label.toLowerCase()} moves`}
            onClick={() =>
              onDrill({ recruiterId: r.id, bucket: b.key, title: `${r.name} — ${b.label}` })
            }
          />
        ),
      })),
      {
        id: 'reversed',
        label: 'Reversed',
        align: 'center',
        group: 'Activity',
        headerTitle:
          'Placed in the window but no longer placed — never counted as Placed or Achieved',
        exportValue: (r: RecruiterActivityRow) => r.reversedCount,
        cell: (r: RecruiterActivityRow) => <CountCell value={r.reversedCount} color="#DC2626" />,
      },

      // ── Stages (unique candidates who entered the stage) ───────────────
      ...stageGroups.flatMap(g =>
        g.stages.map<ColumnDef<RecruiterActivityRow>>(s => ({
          id: `stage:${s.id}`,
          label: s.label,
          align: 'center',
          group: `${g.bucket.label} stages`,
          dotColor: g.bucket.color,
          headerTitle: `${s.label} — unique candidates who entered this stage in the window${s.isTerminal ? ' (still placed)' : ''}`,
          exportValue: (r: RecruiterActivityRow) => r.stageCounts?.[s.id] ?? 0,
          cell: (r: RecruiterActivityRow) => (
            <CountCell
              value={r.stageCounts?.[s.id] ?? 0}
              color={g.bucket.color}
              title={`${r.stageMoves?.[s.id] ?? 0} move(s) — click to open`}
              onClick={() =>
                onDrill({ recruiterId: r.id, stageId: s.id, title: `${r.name} — ${s.label}` })
              }
            />
          ),
        }))
      ),
    ],
    [allIds, selected, toggle, toggleAll, expanded, toggleExp, stageGroups, onDrill]
  );

  // Footer — count columns only. Money totals are unique per requirement, so
  // adding rows would double count; the stats panel above shows the true totals.
  const footerRow = useMemo(() => {
    const t: Record<string, number> = {};
    const add = (k: string, v: number) => (t[k] = (t[k] ?? 0) + (v ?? 0));
    for (const r of data) {
      add('candidates', r.candidates);
      add('moves', r.totalTransitions);
      add('reversed', r.reversedCount);
      for (const b of ACTIVITY_BUCKETS) add(`bucket:${b.key}`, r[b.rowKey]);
      for (const s of group.stages) add(`stage:${s.id}`, r.stageCounts?.[s.id] ?? 0);
    }
    return t;
  }, [data, group.stages]);

  const totalMoves = useMemo(() => data.reduce((n, r) => n + r.totalTransitions, 0), [data]);

  return (
    <StickyTableCard>
      <GroupHeader
        title={group.serviceLine?.name ?? null}
        count={data.length}
        countLabel="people"
        leftSlot={
          <span className="text-[10px] font-medium text-slate-400">
            Unique candidates per stage · click any number to see the moves behind it
          </span>
        }
        rightSlot={
          <>
            <ColumnViewMenu tableKey={tableKey} columns={baseColumns} />
            <ActivityExportMenu
              baseQs={baseQs}
              serviceLineId={group.serviceLine?.id}
              // @ts-expect-error err
              selectedIds={[...selected]}
              rowCount={data.length}
              transitionCount={totalMoves}
            />
          </>
        }
      />

      <DataTable
        columns={baseColumns}
        rows={data}
        rowKey={getId}
        hiddenColumns={hidden}
        columnOrder={order}
        onReorder={setOrder}
        emptyMessage="No activity in this window."
        isExpanded={r => expanded.has(r.id)}
        rowClassName={r => (expanded.has(r.id) ? 'bg-indigo-50' : 'hover:bg-slate-50')}
        frozenBgClass={r =>
          expanded.has(r.id) ? 'bg-indigo-50' : 'bg-white group-hover:bg-slate-50'
        }
        footerRow={footerRow}
        renderExpanded={r => (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <MiniStat l="Assigned reqs" v={r.assignedReqCount} />
              <MiniStat l="Candidates" v={r.candidates} />
              <MiniStat l="Placed" v={r.terminalCount} c="text-emerald-700" />
              <MiniStat l="Pipeline" v={r.nearTerminalCount} c="text-amber-600" />
              <MiniStat l="Reversed" v={r.reversedCount} c="text-red-500" />
              <MiniStat l="Placed on unassigned" v={r.unassignedPlaced} c="text-slate-500" />
              <button
                onClick={() => onDrill({ recruiterId: r.id, title: `${r.name} — all activity` })}
                className="ml-auto flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                Open activity log →
              </button>
            </div>

            {r.team ? (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Team ({r.team.members} people, each requirement counted once)
                </p>
                <div className="flex flex-wrap items-end gap-6">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">Funnel</p>
                    <p className="text-[16px] font-black text-slate-900">
                      {fmtMoney(r.team.funnelValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">Pipeline</p>
                    <p className="text-[16px] font-black text-amber-600">
                      {fmtMoney(r.team.pipelineValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">Achieved</p>
                    <p className="text-[16px] font-black text-emerald-700">
                      {fmtMoney(r.team.achievedValue)}
                      <span className="ml-1 text-[11px] font-bold text-slate-400">
                        {r.team.achievedPct}%
                      </span>
                    </p>
                  </div>
                  <MiniStat l="Reqs" v={r.team.assignedReqCount} />
                  <MiniStat l="Candidates" v={r.team.candidates} />
                  <MiniStat l="Placed" v={r.team.placed} c="text-emerald-700" />
                  <MiniStat l="Pipeline" v={r.team.pipeline} c="text-amber-600" />
                  <MiniStat l="Reversed" v={r.team.reversed} c="text-red-500" />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">No team under this person in the result.</p>
            )}
          </div>
        )}
      />
    </StickyTableCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE LINE TABS
// ─────────────────────────────────────────────────────────────────────────────

const keyOf = (g: { serviceLine: any }) => g.serviceLine?.id ?? '__none__';

function LineTabs({
  groups,
  activeKey,
  onSelect,
}: {
  groups: RecruiterActivityGroup[];
  activeKey: string;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b-2 border-slate-200">
      {groups.map(g => {
        const k = keyOf(g);
        const active = k === activeKey;
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[14px] font-bold transition-colors ${
              active
                ? 'border-indigo-600 text-indigo-800'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {g.serviceLine?.name ?? 'Unassigned'}
            <span
              className={`rounded-full px-2 py-0.5 text-[12px] font-black ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {g.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER SECTION
// ─────────────────────────────────────────────────────────────────────────────

export function RecruiterSection({
  resp,
  loading,
  baseQs,
  bucket = null,
  onDrill,
}: {
  resp?: RecruiterActivityResponse;
  loading: boolean;
  baseQs: string;
  /** Stats-panel slice from the page — keeps people with pipeline / placed moves */
  bucket?: SaleBucket;
  onDrill: (t: ActivityDrillTarget) => void;
}) {
  const [activeKey, setActiveKey] = useState('');

  const groups = useMemo(() => {
    const raw = resp?.groups ?? [];
    if (!bucket) return raw;
    return raw
      .map(g => {
        const data = g.data.filter(r => inBucket(r, bucket));
        return { ...g, data, total: data.length };
      })
      .filter(g => g.data.length > 0);
  }, [resp, bucket]);

  if (loading) return <Skel rows={8} />;

  if (!groups.length)
    return (
      <Empty
        msg={
          bucket
            ? 'Nobody has moves in this slice. Click the highlighted card again to clear it.'
            : 'No activity in your scope for this window. Widen the dates or clear filters.'
        }
      />
    );

  const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];

  return (
    <div className="space-y-3">
      {groups.length > 1 && (
        <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />
      )}
      <ActivityTable key={keyOf(active)} group={active} baseQs={baseQs} onDrill={onDrill} />
    </div>
  );
}

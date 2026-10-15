// File: RecruiterSection.tsx
// Path: src/components/reports/RecruiterSection.tsx
//
//   1. Pipeline (current state) and Stage activity (historical) views.
//   2. Buckets come from stage flags only — Placed / Pipeline / Dropped / Sourced / Active.
//   3. ActivityDrillDrawer — stage count click opens real stage moves
//      (GET /reports/recruiters/activity/drill; transfers / notes excluded).
//   4. `bucket` — set by the stats panel on the page; narrows the pipeline table to
//      recruiters with pipeline (nearTerminal) or placed (terminal) candidates.

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';
import { Empty, FUNNEL_COLORS, KPI, Skel } from '@/components/reports/reportUi';
import { RecruiterTable } from '@/components/reports/RecruiterTable';
import { ActivityExportMenu } from '@/components/reports/ActivityExportMenu';
import type { RecruiterGroup, RecruiterResponse, SaleBucket } from '@/components/reports/types';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — stage flags only
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET = {
  placed: 'Placed',
  pipeline: 'Pipeline',
  dropped: 'Dropped',
  sourced: 'Sourced',
  active: 'Active',
} as const;

function bucketLabel(s: any): string {
  if (s.isTerminal) return BUCKET.placed;
  if (s.isNearTerminal) return BUCKET.pipeline;
  if (s.pipeline === false) return BUCKET.dropped;
  if (s.isSourced) return BUCKET.sourced;
  return BUCKET.active;
}

function stageColor(s: any, i: number): string {
  if (s.isTerminal) return '#059669'; // placed
  if (s.isNearTerminal) return '#D97706'; // pipeline
  if (s.pipeline === false) return '#DC2626'; // dropped
  if (s.isSourced) return '#64748B'; // sourced
  return FUNNEL_COLORS[i % FUNNEL_COLORS.length];
}

function inBucket(row: any, bucket: SaleBucket): boolean {
  if (bucket === 'terminal') return (row.placed ?? 0) > 0;
  if (bucket === 'nearTerminal') return (row.nearTerminal ?? 0) > 0;
  return true;
}

const keyOf = (g: { serviceLine: any }) => g.serviceLine?.id ?? '__none__';
const nameOf = (g: { serviceLine: any }) => g.serviceLine?.name ?? 'Unassigned';

function LineTabs({
  groups,
  activeKey,
  onSelect,
}: {
  groups: { serviceLine: any; total: number }[];
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
            {nameOf(g)}
            <span
              className={`rounded-full px-2 py-0.5 text-[12px] font-black ${
                active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
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
// ACTIVITY DRILL DRAWER — real stage moves for one recruiter (+ optional stage)
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_TYPE_STYLE: Record<string, string> = {
  [BUCKET.placed]: 'bg-emerald-50 text-emerald-700',
  [BUCKET.pipeline]: 'bg-amber-50 text-amber-700',
  [BUCKET.dropped]: 'bg-red-50 text-red-500',
  [BUCKET.sourced]: 'bg-slate-100 text-slate-600',
  [BUCKET.active]: 'bg-indigo-50 text-indigo-700',
};

function ActivityDrillDrawer({
  recruiterId,
  recruiterName,
  stageId,
  stageLabel,
  baseQs,
  onClose,
}: {
  recruiterId: string;
  recruiterName: string;
  stageId?: string;
  stageLabel?: string;
  baseQs: string;
  onClose: () => void;
}) {
  const axios = useAxios();

  const drillQuery = useQuery({
    queryKey: ['recruiter-activity-drill', recruiterId, stageId, baseQs],
    queryFn: async () => {
      const p = new URLSearchParams(baseQs);
      p.set('recruiterId', recruiterId);
      if (stageId) p.set('stageId', stageId);
      return (await axios.get(`/reports/recruiters/activity/drill?${p}`)).data;
    },
  });

  const data = drillQuery.data?.data;
  const rows: any[] = data?.rows ?? [];
  const stageSummary: Record<string, number> = data?.stageSummary ?? {};
  const loading = drillQuery.isLoading;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-black text-slate-900">
              {recruiterName}
              {stageLabel ? ` — ${stageLabel}` : ' — All activity'}
            </h2>
            <p className="text-[12px] text-slate-400">
              {loading
                ? 'Loading…'
                : `${rows.length} stage move${rows.length !== 1 ? 's' : ''} in this window`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!loading && Object.keys(stageSummary).length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 px-6 py-3">
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

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[13px] text-slate-400">
              No activity in this window.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row: any) => {
                const stageType: string = row.toStage.bucket ?? bucketLabel(row.toStage);
                const typeStyle = STAGE_TYPE_STYLE[stageType] ?? 'bg-slate-100 text-slate-600';

                return (
                  <div
                    key={row.logId}
                    className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {row.candidate.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{row.candidate.email}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${typeStyle}`}
                      >
                        {stageType}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2 text-[12px]">
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TABLE — per-recruiter stage-entry counts
// ─────────────────────────────────────────────────────────────────────────────

function ActivityTable({ group, baseQs }: { group: any; baseQs: string }) {
  const [drillTarget, setDrillTarget] = useState<{
    recruiterId: string;
    recruiterName: string;
    stageId?: string;
    stageLabel?: string;
  } | null>(null);

  const stages: any[] = group.stages ?? [];
  const data: any[] = group.data ?? [];

  // Same precedence as the backend: placed > pipeline > dropped > sourced > active
  const terminalStages = stages.filter((s: any) => s.isTerminal);
  const pipelineStages = stages.filter((s: any) => !s.isTerminal && s.isNearTerminal);
  const droppedStages = stages.filter(
    (s: any) => !s.isTerminal && !s.isNearTerminal && s.pipeline === false
  );
  const sourcedStages = stages.filter(
    (s: any) => !s.isTerminal && !s.isNearTerminal && s.pipeline !== false && s.isSourced
  );
  const activeStages = stages.filter(
    (s: any) => !s.isTerminal && !s.isNearTerminal && s.pipeline !== false && !s.isSourced
  );

  const orderedStages = [
    ...sourcedStages,
    ...activeStages,
    ...pipelineStages,
    ...terminalStages,
    ...droppedStages,
  ];

  const columnGroups = [
    { label: BUCKET.sourced, stages: sourcedStages, cls: 'text-slate-500' },
    { label: BUCKET.active, stages: activeStages, cls: 'text-indigo-600' },
    { label: BUCKET.pipeline, stages: pipelineStages, cls: 'text-amber-600' },
    { label: BUCKET.placed, stages: terminalStages, cls: 'text-emerald-700' },
    { label: BUCKET.dropped, stages: droppedStages, cls: 'text-red-500' },
  ].filter(g => g.stages.length > 0);

  const totals = useMemo(
    () => ({
      total: data.reduce((s, r) => s + (r.totalTransitions ?? 0), 0),
      sourced: data.reduce((s, r) => s + (r.sourcedCount ?? 0), 0),
      active: data.reduce((s, r) => s + (r.activeCount ?? 0), 0),
      pipeline: data.reduce((s, r) => s + (r.nearTerminalCount ?? 0), 0),
      placed: data.reduce((s, r) => s + (r.terminalCount ?? 0), 0),
      dropped: data.reduce((s, r) => s + (r.offPipelineCount ?? 0), 0),
    }),
    [data]
  );

  if (!data.length) return <Empty msg="No stage activity in this window." />;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPI label="Total stage moves" value={totals.total} color="#4F46E5" />
        <KPI label={BUCKET.sourced} value={totals.sourced} color="#64748B" />
        <KPI label={BUCKET.active} value={totals.active} color="#0891B2" />
        <KPI label={BUCKET.pipeline} value={totals.pipeline} color="#D97706" />
        <KPI label={BUCKET.placed} value={totals.placed} color="#059669" />
        <KPI label={BUCKET.dropped} value={totals.dropped} color="#DC2626" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <span className="text-[13px] font-black text-slate-800">
              Stage activity — {group.serviceLine?.name ?? 'All'}
            </span>
            <span className="ml-2 text-[11px] font-semibold text-slate-400">
              entries into each stage · hover any cell for detail · click to open the log
            </span>
          </div>
          <ActivityExportMenu
            baseQs={baseQs}
            serviceLineId={group.serviceLine?.id}
            rowCount={data.length}
            transitionCount={totals.total}
          />
        </div>

        <div className="max-h-[70vh] overflow-auto rounded-b-xl">
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="sticky left-0 top-0 z-40 border-b border-r border-slate-200 bg-slate-50 px-4 py-2 text-left">
                  Recruiter
                </th>
                <th className="sticky top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-center">
                  Total
                </th>
                {columnGroups.map(g => (
                  <th
                    key={g.label}
                    colSpan={g.stages.length}
                    className={`sticky top-0 z-30 border-b border-l border-slate-200 bg-slate-50 px-3 py-2 text-center ${g.cls}`}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="sticky left-0 top-[29px] z-40 border-b-2 border-r border-slate-200 bg-white px-4 py-2" />
                <th className="sticky top-[29px] z-30 border-b-2 border-r border-slate-200 bg-white px-3 py-2 text-center">
                  All
                </th>
                {orderedStages.map((s: any, i: number) => (
                  <th
                    key={s.id}
                    className="sticky top-[29px] z-30 border-b-2 border-slate-200 bg-white px-2 py-2 text-center"
                    title={`${s.label}\n${bucketLabel(s)}\n${(s.grandCount ?? 0).toLocaleString('en-IN')} moves in this window${s.serviceLine ? `\nService line: ${s.serviceLine.name}` : '\nCommon to all service lines'}`}
                  >
                    <span
                      style={{ color: stageColor(s, i) }}
                      className="block max-w-[90px] truncate"
                    >
                      {s.label}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      ({(s.grandCount ?? 0).toLocaleString('en-IN')})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, ri: number) => (
                <tr key={row.recruiterId} className="group">
                  <td
                    className={`sticky left-0 z-20 border-b border-r border-slate-100 px-4 py-3 ${
                      ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    } group-hover:bg-indigo-50`}
                  >
                    <button
                      onClick={() =>
                        setDrillTarget({ recruiterId: row.recruiterId, recruiterName: row.name })
                      }
                      title={`${row.name}\n${row.email}\n\n${row.totalTransitions.toLocaleString('en-IN')} stage moves in this window\n${BUCKET.sourced} ${row.sourcedCount ?? 0} · ${BUCKET.active} ${row.activeCount ?? 0} · ${BUCKET.pipeline} ${row.nearTerminalCount ?? 0} · ${BUCKET.placed} ${row.terminalCount ?? 0} · ${BUCKET.dropped} ${row.offPipelineCount ?? 0}\n\nClick to open the full activity log`}
                      className="max-w-[200px] text-left"
                    >
                      <p className="truncate text-[13px] font-bold text-slate-900 hover:text-indigo-700">
                        {row.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">{row.email}</p>
                    </button>
                  </td>
                  <td
                    className={`sticky left-[216px] z-20 border-b border-r border-slate-200 px-3 py-3 text-center ${
                      ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    } group-hover:bg-indigo-50`}
                  >
                    <button
                      onClick={() =>
                        setDrillTarget({ recruiterId: row.recruiterId, recruiterName: row.name })
                      }
                      title={`All ${row.totalTransitions.toLocaleString('en-IN')} stage moves by ${row.name} in this window — click to open the log`}
                      className="text-[14px] font-black text-slate-900 hover:text-indigo-700"
                    >
                      {row.totalTransitions.toLocaleString('en-IN')}
                    </button>
                  </td>
                  {orderedStages.map((s: any, i: number) => {
                    const count: number = row.stageCounts?.[s.id] ?? 0;
                    const cellBg = `${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} group-hover:bg-indigo-50/40`;

                    if (count === 0) {
                      return (
                        <td
                          key={s.id}
                          className={`border-b border-slate-100 px-2 py-3 text-center ${cellBg}`}
                          title={`${row.name} — no moves into ${s.label} in this window`}
                        >
                          <span className="text-[13px] font-semibold text-slate-200">—</span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={s.id}
                        className={`border-b border-slate-100 px-2 py-3 text-center ${cellBg}`}
                      >
                        <button
                          onClick={() =>
                            setDrillTarget({
                              recruiterId: row.recruiterId,
                              recruiterName: row.name,
                              stageId: s.id,
                              stageLabel: s.label,
                            })
                          }
                          title={`${row.name}\n${s.label} (${bucketLabel(s)})\n\n${count} move${count !== 1 ? 's' : ''} into this stage in the window\n${Math.round((count / row.totalTransitions) * 100)}% of their total activity\n\nClick to see exactly which candidates and when`}
                          className="inline-flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-all hover:bg-indigo-50 hover:ring-2 hover:ring-indigo-200"
                        >
                          <span
                            className="text-[14px] font-black tabular-nums"
                            style={{ color: stageColor(s, i) }}
                          >
                            {count}
                          </span>
                          {row.totalTransitions > 0 && (
                            <span className="text-[9px] font-semibold text-slate-400">
                              {Math.round((count / row.totalTransitions) * 100)}%
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drillTarget && (
        <ActivityDrillDrawer
          recruiterId={drillTarget.recruiterId}
          recruiterName={drillTarget.recruiterName}
          stageId={drillTarget.stageId}
          stageLabel={drillTarget.stageLabel}
          baseQs={baseQs}
          onClose={() => setDrillTarget(null)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER SECTION
// ─────────────────────────────────────────────────────────────────────────────

export function RecruiterSection({
  resp,
  loading,
  reqFilter,
  onReqFilter,
  onDownloadAll,
  onDownloadSelected,
  baseQs,
  bucket = null,
}: {
  resp?: RecruiterResponse;
  loading: boolean;
  reqFilter: string;
  onReqFilter: (v: string) => void;
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
  baseQs: string;
  /** Stats-panel slice from the page — narrows the pipeline table. */
  bucket?: SaleBucket;
}) {
  const axios = useAxios();
  const [activeKey, setActiveKey] = useState<string>('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'activity'>('pipeline');

  const activityQuery = useQuery({
    queryKey: ['report-recruiters-activity', baseQs],
    queryFn: async () => (await axios.get(`/reports/recruiters/activity?${baseQs}`)).data,
    enabled: viewMode === 'activity',
    staleTime: 60_000,
  });

  const groups: RecruiterGroup[] = useMemo(() => {
    const raw = resp?.groups ?? [];
    if (!bucket) return raw;
    return raw
      .map(g => {
        const data = g.data.filter(r => inBucket(r, bucket));
        return { ...g, data, total: data.length };
      })
      .filter(g => g.data.length > 0);
  }, [resp, bucket]);

  const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];
  const rows = active?.data ?? [];

  const reqOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows)
      for (const rq of r.requirementBreakdown)
        m.set(rq.requirementId, `${rq.reqCode} · ${rq.title}`);
    return [...m.entries()].map(([id, label]) => ({ id, label }));
  }, [rows]);

  const activityGroups: any[] = activityQuery.data?.groups ?? [];
  const activityActive =
    activityGroups.find((g: any) => keyOf(g) === activeKey) ?? activityGroups[0];

  if (loading)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skel rows={6} />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`rounded-md px-4 py-2 text-[12px] font-bold transition-all ${
              viewMode === 'pipeline'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Pipeline (current state)
          </button>
          <button
            onClick={() => setViewMode('activity')}
            className={`rounded-md px-4 py-2 text-[12px] font-bold transition-all ${
              viewMode === 'activity'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Stage activity (historical)
          </button>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          {viewMode === 'pipeline'
            ? 'Where candidates sit right now'
            : 'How many times each stage was entered in this window'}
        </span>
      </div>

      {viewMode === 'pipeline' && groups.length === 0 && (
        <Empty
          msg={
            bucket
              ? 'No recruiters have candidates in this slice. Click the highlighted card again to clear it.'
              : 'No recruiter data in your scope for this window. Try Stage activity, widen the date range, or clear filters.'
          }
        />
      )}

      {viewMode === 'pipeline' && groups.length > 0 && (
        <>
          {groups.length > 1 && (
            <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />
          )}

          {reqOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-black uppercase tracking-wider text-slate-600">
                Filter by requirement
              </span>
              <Select
                value={reqFilter || 'ALL'}
                onValueChange={v => onReqFilter(v === 'ALL' ? '' : v)}
              >
                <SelectTrigger className="h-9 w-80 border-2 border-slate-200 text-[13px] font-semibold">
                  <SelectValue placeholder="All requirements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All requirements</SelectItem>
                  {reqOptions.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reqFilter && (
                <button
                  onClick={() => onReqFilter('')}
                  className="flex h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-[13px] font-semibold text-red-600 hover:bg-red-50"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          )}

          <RecruiterTable
            key={keyOf(active)}
            title={active?.serviceLine?.name ?? null}
            serviceLineId={active?.serviceLine?.id}
            data={active?.data ?? []}
            stages={active?.stages ?? []}
            baseQs={baseQs}
            onDownloadAll={onDownloadAll}
            onDownloadSelected={onDownloadSelected}
          />
        </>
      )}

      {viewMode === 'activity' && (
        <>
          {activityQuery.isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <Skel rows={6} />
            </div>
          ) : activityGroups.length === 0 ? (
            <Empty msg="No stage activity in this window." />
          ) : (
            <>
              {activityGroups.length > 1 && (
                <LineTabs
                  groups={activityGroups}
                  activeKey={keyOf(activityActive)}
                  onSelect={setActiveKey}
                />
              )}
              <ActivityTable group={activityActive} baseQs={baseQs} />
            </>
          )}
        </>
      )}
    </div>
  );
}

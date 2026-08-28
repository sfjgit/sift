/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: SalesSection.tsx
// Path: src/components/reports/SalesSection.tsx

import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Activity,
  Target,
  IndianRupee,
  Users,
  ChevronRight,
  ChevronDown,
  Medal,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, FUNNEL_COLORS } from './reportUi';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — match exactly what the controller returns
// ─────────────────────────────────────────────────────────────────────────────

interface SalesKpi {
  totalReqs: number;
  totalSaleValue: number;
  achievedSaleValue: number;
  placed: number;
  active: number;
  sourced: number;
  dropped: number;
  nearTerminal: number;
}

interface FunnelStage {
  id?: string;
  label: string;
  order: number;
  count: number;
}

interface LeaderEntry {
  userId: string;
  name: string;
  reqsCreated: number;
  placed: number;
  active: number;
  saleValue: number;
}

interface HierarchyNode {
  userId: string;
  name: string;
  depth: number;
  reqs: number;
  saleValue: number;
  placed: number;
  active: number;
}

interface StageBreakdown {
  stageId: string;
  label: string;
  order: number;
  isTerminal: boolean;
  count: number;
}

interface Assignment {
  id: string;
  depth: number;
  userId: string;
  name: string;
  role: string;
  candidateCount: number;
  placedCount: number;
}

interface ReqRow {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  totalOpenings: number;
  saleValue: number;
  createdAt: string;
  createdBy: { id: string; name: string };
  client: { id: string; name: string } | null;
  serviceLine: { id: string; name: string } | null;
  businessUnit: { id: string; name: string } | null;
  pipeline: {
    total: number;
    placed: number;
    active: number;
    dropped: number;
    sourced: number;
    nearTerminal: number;
  };
  stageBreakdown: StageBreakdown[];
  assignments: Assignment[];
}

interface SalesData {
  kpi: SalesKpi;
  funnel: FunnelStage[];
  leaderboard: LeaderEntry[];
  hierarchyTree: HierarchyNode[];
  requirements: ReqRow[];
}

interface DrillPayload {
  label: string;
  type?: string;
  stageId?: string;
  reqId?: string;
}

interface SalesSectionProps {
  data: SalesData | null;
  loading: boolean;
  onDrill: (payload: DrillPayload) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  ON_HOLD: 'bg-orange-50 text-orange-700',
  CLOSED: 'bg-red-50 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const DEPTH_LABEL: Record<number, string> = { 0: 'DM', 1: 'TL', 2: 'Recruiter' };
const DEPTH_COLOR: Record<number, string> = {
  0: 'bg-violet-100 text-violet-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-emerald-100 text-emerald-700',
};

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP HOOK — same pattern as OverviewSection
// ─────────────────────────────────────────────────────────────────────────────

function useTooltip() {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    content: '',
    visible: false,
  });

  const show = useCallback((e: React.MouseEvent, content: string) => {
    const rect = (e.currentTarget as HTMLElement)
      .closest('[data-chart-root]')
      ?.getBoundingClientRect();
    setTooltip({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
      content,
      visible: true,
    });
  }, []);

  const hide = useCallback(() => setTooltip(p => ({ ...p, visible: false })), []);
  return { tooltip, show, hide };
}

function Tooltip({
  x,
  y,
  content,
  visible,
}: {
  x: number;
  y: number;
  content: string;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-50 max-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-xl"
      style={{ left: x + 12, top: y - 8 }}
    >
      {content}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD — identical style to OverviewSection
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  trend,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: 'up' | 'down';
  icon?: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          {label}
        </span>
        {Icon && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        )}
      </div>
      <span className="text-[28px] font-black leading-none" style={{ color }}>
        {value}
      </span>
      {sub && (
        <span
          className={`flex items-center gap-1 text-[11px] font-bold ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}
        >
          {trend === 'up' && <TrendingUp className="h-3 w-3" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3" />}
          {sub}
        </span>
      )}
      {onClick && (
        <span className="text-[10px] font-semibold text-indigo-400">click to drill →</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD WRAPPER — identical to OverviewSection
// ─────────────────────────────────────────────────────────────────────────────

function Card({
  title,
  children,
  badge,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  badge?: string | number;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border-2 border-slate-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-[13px] font-black uppercase tracking-wider text-slate-700">{title}</h3>
        {badge !== undefined && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNNEL BARS — same visual as OverviewSection FunnelBars, clickable per stage
// ─────────────────────────────────────────────────────────────────────────────

function SalesFunnelBars({
  stages,
  total,
  onDrill,
}: {
  stages: FunnelStage[];
  total: number;
  onDrill: (payload: DrillPayload) => void;
}) {
  const { tooltip, show, hide } = useTooltip();
  const max = Math.max(1, ...stages.map(s => s.count));
  if (!stages.length) return <Empty msg="No pipeline data for this scope." />;

  return (
    <div className="relative space-y-2.5" data-chart-root>
      <Tooltip {...tooltip} />
      {stages.map((s, i) => {
        const barPct = Math.max((s.count / max) * 100, 3);
        const displayPct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0';
        const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        return (
          <div key={s.label + i} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-right text-[12px] font-bold text-slate-700">
              {s.label}
            </span>
            <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-slate-100">
              <div
                className="flex h-full cursor-pointer items-center justify-between rounded-lg px-3 transition-all duration-500 hover:opacity-90"
                style={{ width: `${barPct}%`, backgroundColor: color }}
                onMouseMove={e =>
                  show(e, `${s.label}: ${s.count} (${displayPct}%) — click to drill`)
                }
                onMouseLeave={hide}
                onClick={() => onDrill({ type: 'stage', stageId: (s as any).id, label: s.label })}
              >
                <span className="text-[12px] font-black text-white">{s.count}</span>
                <span className="text-[10px] font-bold text-white/80">{displayPct}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD — mirrors OverviewSection Leaderboard exactly
// ─────────────────────────────────────────────────────────────────────────────

function SalesLeaderboard({
  items,
  onDrill,
}: {
  items: LeaderEntry[];
  onDrill: (payload: DrillPayload) => void;
}) {
  const max = Math.max(1, ...items.map(i => i.saleValue));
  if (!items.length) return <Empty msg="No sales activity for this scope." />;

  return (
    <div className="space-y-2.5">
      {items.map((r, i) => {
        const barPct = Math.max((r.saleValue / max) * 100, 4);
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
        return (
          <div
            key={r.userId}
            className="flex cursor-pointer items-center gap-3 rounded-lg p-1 transition-colors hover:bg-slate-50"
            onClick={() => onDrill({ label: r.name })}
          >
            <span className="w-5 shrink-0 text-center text-[12px]">
              {medal ?? <span className="font-bold text-slate-400">{i + 1}</span>}
            </span>
            <div className="w-36 shrink-0 overflow-hidden">
              <p className="truncate text-[12px] font-bold text-slate-800">{r.name}</p>
              <p className="text-[10px] text-slate-400">{r.reqsCreated} reqs created</p>
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
              <div
                className="flex h-full items-center rounded-md px-2 transition-all"
                style={{ width: `${barPct}%`, backgroundColor: '#4F46E5' }}
              >
                <span className="text-[11px] font-black text-white">
                  {fmtCurrency(r.saleValue)}
                </span>
              </div>
            </div>
            {r.placed > 0 && (
              <span className="w-20 shrink-0 text-right text-[11px] font-black text-emerald-700">
                {r.placed} placed
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HIERARCHY TREE — mirrors OverviewSection TeamTree exactly
// ─────────────────────────────────────────────────────────────────────────────

function HierarchyTree({
  nodes,
  onDrill,
}: {
  nodes: HierarchyNode[];
  onDrill: (payload: DrillPayload) => void;
}) {
  if (!nodes.length) return null;
  const maxSv = Math.max(1, ...nodes.map(n => n.saleValue));

  return (
    <div className="space-y-3">
      {nodes.map(n => {
        const barPct = Math.max((n.saleValue / maxSv) * 100, 3);
        const depthLabel = DEPTH_LABEL[n.depth] ?? `L${n.depth}`;
        return (
          <div
            key={n.userId}
            className="cursor-pointer rounded-xl border-2 border-slate-100 bg-white p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/20"
            style={{ marginLeft: `${n.depth * 20}px` }}
            onClick={() => onDrill({ label: n.name })}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-black text-slate-900">{n.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DEPTH_COLOR[n.depth] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {depthLabel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {n.reqs} req{n.reqs !== 1 ? 's' : ''} assigned
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-black text-slate-900">{fmtCurrency(n.saleValue)}</p>
                {n.placed > 0 && (
                  <p className="text-[11px] font-bold text-emerald-700">{n.placed} placed</p>
                )}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11px] font-semibold">
              <span className="text-blue-600">{n.active} active</span>
              {n.placed > 0 && <span className="text-emerald-600">{n.placed} placed</span>}
              <span className="ml-auto text-[10px] text-indigo-400">click to drill →</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN DEFINITIONS + TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

const ALL_COLS = [
  { key: 'reqCode', label: 'Req Code', always: true },
  { key: 'title', label: 'Title', always: false },
  { key: 'client', label: 'Client', always: false },
  { key: 'serviceLine', label: 'Service Line', always: false },
  { key: 'businessUnit', label: 'Business Unit', always: false },
  { key: 'status', label: 'Status', always: false },
  { key: 'openings', label: 'Openings', always: false },
  { key: 'saleValue', label: 'Sale Value', always: false },
  { key: 'createdBy', label: 'Created By', always: false },
  { key: 'placed', label: 'Placed', always: false },
  { key: 'active', label: 'Active', always: false },
  { key: 'nearTerminal', label: 'Near Terminal', always: false },
  { key: 'dropped', label: 'Dropped', always: false },
  { key: 'total', label: 'Total Pipeline', always: false },
  { key: 'createdAt', label: 'Created On', always: false },
];

const DEFAULT_VISIBLE = new Set([
  'reqCode',
  'title',
  'client',
  'status',
  'openings',
  'saleValue',
  'placed',
  'active',
  'dropped',
  'createdBy',
]);

function ColumnToggle({
  visible,
  onChange,
}: {
  visible: Set<string>;
  onChange: (c: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex h-8 items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
      >
        Columns ({visible.size})
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Toggle Columns
            </p>
            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              {ALL_COLS.filter(c => !c.always).map(c => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={visible.has(c.key)}
                    onChange={() => {
                      const next = new Set(visible);
                      next.has(c.key) ? next.delete(c.key) : next.add(c.key);
                      onChange(next);
                    }}
                    className="accent-indigo-600"
                  />
                  <span className="text-xs text-slate-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE MINI BAR — inside table row
// ─────────────────────────────────────────────────────────────────────────────

function PipelineMiniBar({ pipeline }: { pipeline: ReqRow['pipeline'] }) {
  const { total, placed, active, nearTerminal, sourced, dropped } = pipeline;
  if (!total) return <span className="text-[11px] text-slate-400">No candidates</span>;
  const segs = [
    { v: placed, color: '#059669' },
    { v: nearTerminal, color: '#D97706' },
    { v: active, color: '#4F46E5' },
    { v: sourced, color: '#94A3B8' },
    { v: dropped, color: '#EF4444' },
  ];
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2.5 w-24 overflow-hidden rounded-full bg-slate-100">
        {segs.map(
          (s, i) =>
            s.v > 0 && (
              <div key={i} style={{ width: `${pct(s.v, total)}%`, backgroundColor: s.color }} />
            )
        )}
      </div>
      <span className="text-[11px] font-semibold text-slate-500">{total}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENTS TABLE — expandable rows
// ─────────────────────────────────────────────────────────────────────────────

function ReqTable({
  rows,
  visibleCols,
  onDrill,
}: {
  rows: ReqRow[];
  visibleCols: Set<string>;
  onDrill: (p: DrillPayload) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const cols = ALL_COLS.filter(c => c.always || visibleCols.has(c.key));

  if (!rows.length)
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-16 text-slate-400">
        <Activity className="h-10 w-10 opacity-20" />
        <p className="text-[14px] font-semibold">No requirements found for this scope.</p>
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead className="bg-slate-50">
          <tr className="border-b-2 border-slate-200">
            <th className="w-8 px-2 py-2.5" />
            {cols.map(c => (
              <th
                key={c.key}
                className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
            <th className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
              Pipeline
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isOpen = expanded.has(r.id);
            return (
              <>
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
                  onClick={() => toggle(r.id)}
                >
                  <td className="px-2 py-3 text-slate-400">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  {cols.map(c => {
                    let cell: React.ReactNode = null;
                    switch (c.key) {
                      case 'reqCode':
                        cell = (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                            {r.reqCode}
                          </span>
                        );
                        break;
                      case 'title':
                        cell = (
                          <span
                            className="max-w-[200px] truncate block font-semibold text-slate-800"
                            title={r.title}
                          >
                            {r.title}
                          </span>
                        );
                        break;
                      case 'client':
                        cell = <span className="text-slate-600">{r.client?.name ?? '—'}</span>;
                        break;
                      case 'serviceLine':
                        cell = <span className="text-slate-500">{r.serviceLine?.name ?? '—'}</span>;
                        break;
                      case 'businessUnit':
                        cell = (
                          <span className="text-slate-500">{r.businessUnit?.name ?? '—'}</span>
                        );
                        break;
                      case 'status':
                        cell = (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {r.status.replace(/_/g, ' ')}
                          </span>
                        );
                        break;
                      case 'openings':
                        cell = (
                          <span className="tabular-nums font-semibold text-slate-700">
                            {r.totalOpenings}
                          </span>
                        );
                        break;
                      case 'saleValue':
                        cell = (
                          <span className="font-black text-emerald-700">
                            {fmtCurrency(r.saleValue)}
                          </span>
                        );
                        break;
                      case 'createdBy':
                        cell = <span className="text-slate-500">{r.createdBy.name}</span>;
                        break;
                      case 'placed':
                        cell = (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDrill({
                                type: 'placed',
                                reqId: r.id,
                                label: `${r.reqCode} · Placed`,
                              });
                            }}
                            className="font-black text-emerald-700 hover:underline"
                          >
                            {r.pipeline.placed}
                          </button>
                        );
                        break;
                      case 'active':
                        cell = (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDrill({
                                type: 'active',
                                reqId: r.id,
                                label: `${r.reqCode} · Active`,
                              });
                            }}
                            className="font-bold text-indigo-600 hover:underline"
                          >
                            {r.pipeline.active}
                          </button>
                        );
                        break;
                      case 'nearTerminal':
                        cell = (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDrill({
                                type: 'nearTerminal',
                                reqId: r.id,
                                label: `${r.reqCode} · Near Terminal`,
                              });
                            }}
                            className="font-bold text-amber-600 hover:underline"
                          >
                            {r.pipeline.nearTerminal}
                          </button>
                        );
                        break;
                      case 'dropped':
                        cell = (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDrill({
                                type: 'dropped',
                                reqId: r.id,
                                label: `${r.reqCode} · Dropped`,
                              });
                            }}
                            className="text-red-500 hover:underline"
                          >
                            {r.pipeline.dropped}
                          </button>
                        );
                        break;
                      case 'total':
                        cell = (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDrill({ reqId: r.id, label: `${r.reqCode} · All Candidates` });
                            }}
                            className="font-semibold text-slate-700 hover:underline"
                          >
                            {r.pipeline.total}
                          </button>
                        );
                        break;
                      case 'createdAt':
                        cell = (
                          <span className="text-slate-400">
                            {new Date(r.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        );
                        break;
                    }
                    return (
                      <td key={c.key} className="px-3 py-3">
                        {cell}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3">
                    <PipelineMiniBar pipeline={r.pipeline} />
                  </td>
                </tr>

                {/* Expanded detail */}
                {isOpen && (
                  <tr key={r.id + '-expanded'} className="bg-slate-50/70">
                    <td colSpan={cols.length + 2} className="border-b border-slate-100 px-6 py-4">
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {/* Stage breakdown */}
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Stage Breakdown
                          </p>
                          {r.stageBreakdown.length ? (
                            <div className="space-y-1.5">
                              {r.stageBreakdown.map((s, i) => {
                                const max = Math.max(...r.stageBreakdown.map(x => x.count), 1);
                                const color = s.isTerminal
                                  ? '#059669'
                                  : FUNNEL_COLORS[i % FUNNEL_COLORS.length];
                                return (
                                  <button
                                    key={s.stageId}
                                    className="flex w-full items-center gap-2 rounded-lg p-1 transition-colors hover:bg-slate-100"
                                    onClick={() =>
                                      onDrill({
                                        stageId: s.stageId,
                                        reqId: r.id,
                                        label: `${r.reqCode} · ${s.label}`,
                                      })
                                    }
                                  >
                                    <span className="w-28 shrink-0 truncate text-right text-[11px] font-semibold text-slate-600">
                                      {s.label}
                                    </span>
                                    <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-200">
                                      <div
                                        className="flex h-full items-center rounded-md px-2"
                                        style={{
                                          width: `${Math.max((s.count / max) * 100, 5)}%`,
                                          backgroundColor: color,
                                        }}
                                      >
                                        <span className="text-[11px] font-black text-white">
                                          {s.count}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-indigo-400 shrink-0">
                                      drill →
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[12px] text-slate-400">No pipeline activity yet.</p>
                          )}
                        </div>

                        {/* Assignment chain */}
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Assignment Chain
                          </p>
                          {r.assignments.length ? (
                            <div className="space-y-2">
                              {r.assignments.map(a => (
                                <div
                                  key={a.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                                  style={{ marginLeft: `${a.depth * 16}px` }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DEPTH_COLOR[a.depth] ?? 'bg-slate-100 text-slate-600'}`}
                                    >
                                      {DEPTH_LABEL[a.depth] ?? `L${a.depth}`}
                                    </span>
                                    <div>
                                      <p className="text-[12px] font-bold text-slate-800">
                                        {a.name}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {a.role.replace(/_/g, ' ')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 text-right text-[11px]">
                                    <div>
                                      <p className="font-black text-slate-800">
                                        {a.candidateCount}
                                      </p>
                                      <p className="text-slate-400">candidates</p>
                                    </div>
                                    <div>
                                      <p className="font-black text-emerald-700">{a.placedCount}</p>
                                      <p className="text-slate-400">placed</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[12px] text-slate-400">Not assigned yet.</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEETJS EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportSales(data: SalesData, visibleCols: Set<string>) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary KPIs
  const kpiRows = [
    ['Total Requirements', data.kpi.totalReqs],
    ['Total Sale Value', data.kpi.totalSaleValue],
    ['Achieved Value', data.kpi.achievedSaleValue],
    [
      'Achievement %',
      `${data.kpi.totalSaleValue > 0 ? ((data.kpi.achievedSaleValue / data.kpi.totalSaleValue) * 100).toFixed(1) : 0}%`,
    ],
    ['Placed', data.kpi.placed],
    ['Active', data.kpi.active],
    ['Near Terminal', data.kpi.nearTerminal],
    ['Sourced', data.kpi.sourced],
    ['Dropped', data.kpi.dropped],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ...kpiRows]),
    'Summary'
  );

  // Sheet 2: Requirements (respects visible column selection)
  const colsToExport = ALL_COLS.filter(c => c.always || visibleCols.has(c.key));
  const reqHeader = [...colsToExport.map(c => c.label), 'Pipeline Total', 'Assignments'];
  const reqData = data.requirements.map(r => {
    const row: any[] = colsToExport.map(c => {
      switch (c.key) {
        case 'reqCode':
          return r.reqCode;
        case 'title':
          return r.title;
        case 'client':
          return r.client?.name ?? '';
        case 'serviceLine':
          return r.serviceLine?.name ?? '';
        case 'businessUnit':
          return r.businessUnit?.name ?? '';
        case 'status':
          return r.status;
        case 'openings':
          return r.totalOpenings;
        case 'saleValue':
          return r.saleValue;
        case 'createdBy':
          return r.createdBy.name;
        case 'placed':
          return r.pipeline.placed;
        case 'active':
          return r.pipeline.active;
        case 'nearTerminal':
          return r.pipeline.nearTerminal;
        case 'dropped':
          return r.pipeline.dropped;
        case 'total':
          return r.pipeline.total;
        case 'createdAt':
          return new Date(r.createdAt).toLocaleDateString('en-IN');
        default:
          return '';
      }
    });
    row.push(r.pipeline.total);
    row.push(
      r.assignments.map(a => `${DEPTH_LABEL[a.depth] ?? `L${a.depth}`}: ${a.name}`).join(' → ')
    );
    return row;
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([reqHeader, ...reqData]),
    'Requirements'
  );

  // Sheet 3: Stage breakdown
  const stageRows: any[][] = [['Req Code', 'Title', 'Client', 'Stage', 'Is Terminal', 'Count']];
  for (const r of data.requirements) {
    for (const s of r.stageBreakdown) {
      stageRows.push([
        r.reqCode,
        r.title,
        r.client?.name ?? '',
        s.label,
        s.isTerminal ? 'Yes' : 'No',
        s.count,
      ]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stageRows), 'Stage Breakdown');

  // Sheet 4: Leaderboard
  const lbRows = [['Name', 'Reqs Created', 'Placed', 'Active', 'Sale Value']];
  for (const e of data.leaderboard) {
    // @ts-expect-error err
    lbRows.push([e.name, e.reqsCreated, e.placed, e.active, e.saleValue]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lbRows), 'Leaderboard');

  XLSX.writeFile(wb, `sales-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function SalesSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function SalesSection({ data, loading, onDrill }: SalesSectionProps) {
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_VISIBLE));
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('saleValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredRows = useMemo(() => {
    if (!data) return [];
    let rows = data.requirements;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        r =>
          r.reqCode.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.client?.name ?? '').toLowerCase().includes(q) ||
          r.createdBy.name.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      let av = 0,
        bv = 0;
      switch (sortKey) {
        case 'saleValue':
          av = a.saleValue;
          bv = b.saleValue;
          break;
        case 'placed':
          av = a.pipeline.placed;
          bv = b.pipeline.placed;
          break;
        case 'active':
          av = a.pipeline.active;
          bv = b.pipeline.active;
          break;
        case 'createdAt':
          av = new Date(a.createdAt).getTime();
          bv = new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [data, search, sortKey, sortDir]);

  if (loading) return <SalesSkeleton />;

  if (!data || data.kpi.totalReqs === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
        <Activity className="h-12 w-12 opacity-20" />
        <p className="text-[14px] font-semibold">No sales data for this scope.</p>
        <p className="text-[12px]">Try a different date range or remove filters.</p>
      </div>
    );
  }

  const { kpi, funnel, leaderboard, hierarchyTree } = data;
  const funnelTotal = funnel.reduce((s, f) => s + f.count, 0);
  const achievedPct =
    kpi.totalSaleValue > 0 ? Math.round((kpi.achievedSaleValue / kpi.totalSaleValue) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards — 8 cards matching Overview style ─────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <KpiCard
          label="Requirements"
          value={kpi.totalReqs}
          color="#4F46E5"
          icon={Target}
          sub="in scope"
          onClick={() => onDrill({ label: 'All Requirements' })}
        />
        <KpiCard
          label="Funneel / Total Sale Value AMOUNT"
          value={fmtCurrency(kpi.totalSaleValue)}
          color="#059669"
          icon={IndianRupee}
          sub="pipeline value"
          onClick={() => onDrill({ label: 'All Pipeline' })}
        />
        <KpiCard
          label=" Achieved Amount"
          value={fmtCurrency(kpi.achievedSaleValue)}
          color="#7C3AED"
          icon={TrendingUp}
          sub={`${achievedPct}% of target`}
          trend="up"
          onClick={() => onDrill({ type: 'placed', label: 'Placed Candidates' })}
        />
        <KpiCard
          label="DEAL / JOINED / TRAINING STARTED"
          value={kpi.placed}
          color="#059669"
          icon={CheckCircle2}
          sub="candidates"
          trend="up"
          onClick={() => onDrill({ type: 'placed', label: 'Placed Candidates' })}
        />
        {/* <KpiCard
          label="Active"
          value={kpi.active}
          color="#0891B2"
          icon={Activity}
          sub="in pipeline"
          onClick={() => onDrill({ type: 'active', label: 'Active Candidates' })}
        /> */}
        <KpiCard
          label="Pipeline"
          value={kpi.nearTerminal}
          color="#D97706"
          icon={Medal}
          sub="approaching final"
          onClick={() => onDrill({ type: 'nearTerminal', label: 'Near Terminal' })}
        />
        {/* <KpiCard
          label="Sourced"
          value={kpi.sourced}
          color="#6366F1"
          icon={Users}
          sub="entry stage"
          onClick={() => onDrill({ type: 'sourced', label: 'Sourced' })}
        />
        <KpiCard
          label="Dropped"
          value={kpi.dropped}
          color="#DC2626"
          icon={XCircle}
          sub="exited"
          trend="down"
          onClick={() => onDrill({ type: 'dropped', label: 'Dropped' })}
        /> */}
      </div>

      {/* ── Achievement progress bar — mirrors overview sale value cards ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
              Total Sale Value
            </span>
          </div>
          <p className="text-[24px] font-black text-emerald-900">
            {fmtCurrency(kpi.totalSaleValue)}
          </p>
          <p className="text-[11px] text-emerald-600">
            {kpi.totalReqs} requirement{kpi.totalReqs !== 1 ? 's' : ''} in scope
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border-2 border-purple-100 bg-purple-50 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700">
              Achieved Value
            </span>
          </div>
          <p className="text-[24px] font-black text-purple-900">
            {fmtCurrency(kpi.achievedSaleValue)}
          </p>
          <p className="text-[11px] text-purple-600">{achievedPct}% of target</p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border-2 border-slate-200 bg-white p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Achievement Progress
          </span>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100, achievedPct)}%` }}
            />
          </div>
          <p className="mt-1 text-[13px] font-black text-slate-800">
            {achievedPct}%{' '}
            <span className="text-[11px] font-semibold text-slate-400">
              of {fmtCurrency(kpi.totalSaleValue)}
            </span>
          </p>
        </div>
      </div>

      {/* ── Requirements table ───────────────────────────────────────────── */}
      <div className="rounded-xl border-2 border-slate-100 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <p className="flex-1 text-[13px] font-black text-slate-700">
            Requirements
            <span className="ml-2 text-[12px] font-normal text-slate-400">
              {filteredRows.length} of {data.requirements.length}
            </span>
          </p>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 w-48 rounded-lg border-2 border-slate-200 bg-slate-50 pl-3 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
            />
          </div>

          {/* Sort */}
          <select
            value={`${sortKey}:${sortDir}`}
            onChange={e => {
              const [k, d] = e.target.value.split(':');
              setSortKey(k);
              setSortDir(d as 'asc' | 'desc');
            }}
            className="h-8 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 outline-none"
          >
            <option value="saleValue:desc">Sale Value ↓</option>
            <option value="saleValue:asc">Sale Value ↑</option>
            <option value="placed:desc">Placed ↓</option>
            <option value="active:desc">Active ↓</option>
            <option value="createdAt:desc">Newest</option>
            <option value="createdAt:asc">Oldest</option>
          </select>

          {/* Column toggle */}
          <ColumnToggle visible={visibleCols} onChange={setVisibleCols} />

          {/* Export */}
          <button
            onClick={() => exportSales(data, visibleCols)}
            className="flex h-8 items-center gap-1.5 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            Export Excel
          </button>
        </div>

        {/* Table */}
        <ReqTable rows={filteredRows} visibleCols={visibleCols} onDrill={onDrill} />

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5">
          <p className="text-[11px] text-slate-400">
            {filteredRows.length} requirement{filteredRows.length !== 1 ? 's' : ''} · Click any row
            to expand stages + assignments
          </p>
          <p className="text-[11px] font-semibold text-slate-600">
            Total pipeline:{' '}
            <span className="font-black text-slate-900">
              {data.requirements.reduce((s, r) => s + r.pipeline.total, 0)}
            </span>{' '}
            candidates · <span className="text-emerald-700">{kpi.placed} placed</span>
          </p>
        </div>
      </div>

      {/* ── Funnel + Leaderboard ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Pipeline Funnel" badge={funnelTotal}>
          <SalesFunnelBars stages={funnel} total={funnelTotal} onDrill={onDrill} />
        </Card>
        <Card title="Leaderboard by Sale Value" badge={leaderboard.length}>
          <SalesLeaderboard items={leaderboard} onDrill={onDrill} />
        </Card>
      </div>

      {/* ── Hierarchy tree ───────────────────────────────────────────────── */}
      {hierarchyTree.length > 0 && (
        <Card title="Reporting Line" badge={hierarchyTree.length}>
          <HierarchyTree nodes={hierarchyTree} onDrill={onDrill} />
        </Card>
      )}
    </div>
  );
}

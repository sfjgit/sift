/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: OverviewSection.tsx
// Path: src/components/reports/OverviewSection.tsx

import { useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Target,
  IndianRupee,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, FUNNEL_COLORS, Skel } from './reportUi';
// import type { DrillTarget } from './DrillDrawer';
import { MyRequirementsSection } from './MyRequirementsSection';
// import { StatsDrawer } from './StatsDrawer';

import type { DrillTarget } from './DrillDrawer';
import { StatsDrawer } from './StatsDrawer';
import type { StatsDrawerTarget } from './StatsDrawer';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface KpiData {
  total: number;
  placed: number;
  active: number;
  dropped: number;
  inProgress: number;
  fillRate: number;
  avgPipelineDays: number;
  totalSaleValue: number;
  totalAchievedValue: number;
  achievedPct: number;
  saleValueIncluded: number;
  saleValueOmitted: number;
  nearTerminalCount: number;
  nearTerminalPipelineValue: number;
}

interface FunnelStage {
  stageId: string;
  code: string;
  label: string;
  order: number;
  count: number;
  pct: number;
  serviceLineId: string | null;
  serviceLine: { id: string; name: string } | null;
}

interface TerminalStage {
  stageId: string;
  label: string;
  count: number;
  serviceLineId: string | null;
}

interface SlBreakdown {
  serviceLineId: string | null;
  name: string;
  total: number;
  placed: number;
  active: number;
  dropped: number;
  placementRate: number;
  funnelStages: { stageId: string; label: string; count: number }[];
  terminalStages: { stageId: string; label: string; count: number }[];
}

interface BuBreakdown {
  id: string | null;
  name: string;
  total: number;
  placed: number;
}

interface DeptBreakdown {
  id: string | null;
  name: string;
  recruiterCount: number;
  total: number;
  placed: number;
  active: number;
  placementRate: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  serviceLine?: string;
  teamSize: number;
  stats: { total: number; placed: number; active: number; placementRate: number };
}

interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  sourced: number;
  placed: number;
  active: number;
  dropped: number;
  avgPipelineDays: number;
  placementRate: number;
}

interface TimeSeries {
  bucket: string;
  count: number;
}

interface StageDetail {
  stageId: string;
  label: string;
  code: string;
  order: number;
  isNearTerminal?: boolean;
  serviceLineId: string | null;
  serviceLineName: string | null;
  count: number;
}

interface OverviewData {
  kpis: KpiData;
  funnelStages: FunnelStage[];
  terminalBreakdown: TerminalStage[];
  pipelineStageDetails: StageDetail[];
  terminalStageDetails: StageDetail[];
  byServiceLine: SlBreakdown[];
  byBusinessUnit: BuBreakdown[];
  byDepartment: DeptBreakdown[];
  timeSeries: TimeSeries[];
  timeGranularity: 'hour' | 'day';
  dispositionCounts: Record<string, number>;
  leaderboard: LeaderboardEntry[];
  teamTree: TeamMember[];
  saleValueBreakdown: Record<string, { count: number; total: number }>;
}

export interface OverviewResponse {
  success: boolean;
  data: OverviewData;
  meta: {
    window: string;
    scope: string;
    multiLine: boolean;
    hasSaleValueData: boolean;
    hasTeamTree: boolean;
    hasNearTerminal: boolean;
  };
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

function fmtBucket(b: string, gran: 'hour' | 'day'): string {
  try {
    return gran === 'hour' ? format(new Date(b), 'dd MMM HH:mm') : format(new Date(b), 'dd MMM');
  } catch {
    return b;
  }
}

const BASIS_LABEL: Record<string, { label: string; color: string }> = {
  SALE_VALUE: { label: 'Direct', color: '#059669' },
  BAND: { label: 'Band', color: '#2563EB' },
  FIXED_PCT: { label: 'Fixed %', color: '#7C3AED' },
  NOT_FOUND: { label: 'No data', color: '#94A3B8' },
};

const DISP_COLORS: Record<string, string> = {
  ACTIVE: '#3B82F6',
  PLACED: '#10B981',
  DROPPED: '#EF4444',
  DUPLICATE: '#94A3B8',
  ON_HOLD: '#F59E0B',
};

const TERMINAL_COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP HOOK
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
// KPI CARD — clickable variant
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
// CARD WRAPPER
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
// TIME SERIES CHART
// ─────────────────────────────────────────────────────────────────────────────

function TimeSeriesChart({
  points,
  granularity,
}: {
  points: TimeSeries[];
  granularity: 'hour' | 'day';
}) {
  const { tooltip, show, hide } = useTooltip();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (points.length < 2)
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-slate-400">
        Not enough data points to plot.
      </div>
    );

  const W = 640,
    H = 160,
    padX = 32,
    padY = 20;
  const max = Math.max(1, ...points.map(p => p.count));
  const stepX = (W - padX * 2) / (points.length - 1);
  const xy = points.map(
    (p, i) => [padX + i * stepX, H - padY - (p.count / max) * (H - padY * 2)] as const
  );
  const linePath = xy
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${xy[xy.length - 1][0]},${H - padY} L${xy[0][0]},${H - padY} Z`;
  const tickEvery = Math.ceil(points.length / 8);

  return (
    <div className="relative w-full overflow-x-auto" data-chart-root>
      <Tooltip {...tooltip} />
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full min-w-[480px]">
        <defs>
          <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(pct => {
          const y = H - padY - pct * (H - padY * 2);
          return (
            <line
              key={pct}
              x1={padX}
              y1={y.toFixed(1)}
              x2={W - padX}
              y2={y.toFixed(1)}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}
        <path d={areaPath} fill="url(#tsGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke="#4F46E5"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {xy.map(([x, y], i) => (
          <g key={i}>
            <rect
              x={x - stepX / 2}
              y={padY}
              width={stepX}
              height={H - padY * 2}
              fill="transparent"
              className="cursor-pointer"
              onMouseMove={e => {
                show(
                  e,
                  `${fmtBucket(points[i].bucket, granularity)}: ${points[i].count} candidates`
                );
                setHoveredIdx(i);
              }}
              onMouseLeave={() => {
                hide();
                setHoveredIdx(null);
              }}
            />
            <circle
              cx={x.toFixed(1)}
              cy={y.toFixed(1)}
              r={hoveredIdx === i ? 5 : 3}
              fill={hoveredIdx === i ? '#4F46E5' : '#fff'}
              stroke="#4F46E5"
              strokeWidth="2"
              className="pointer-events-none transition-all duration-100"
            />
          </g>
        ))}
        {points.map((p, i) =>
          i % tickEvery === 0 ? (
            <text
              key={i}
              x={(padX + i * stepX).toFixed(1)}
              y={H + 16}
              fontSize="9"
              fill="#94A3B8"
              textAnchor="middle"
              fontWeight="600"
            >
              {fmtBucket(p.bucket, granularity)}
            </text>
          ) : null
        )}
        <text x={padX - 4} y={padY} fontSize="9" fill="#94A3B8" textAnchor="end">
          {max}
        </text>
        <text x={padX - 4} y={H - padY} fontSize="9" fill="#94A3B8" textAnchor="end">
          0
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNNEL BARS — each bar clickable
// ─────────────────────────────────────────────────────────────────────────────

function FunnelBars({
  stages,
  total,
  onDrill,
}: {
  stages: FunnelStage[];
  total: number;
  onDrill: (t: DrillTarget) => void;
}) {
  const { tooltip, show, hide } = useTooltip();
  const max = Math.max(1, ...stages.map(s => s.count));
  if (!stages.length) return <Empty msg="No candidates in pipeline stages." />;

  return (
    <div className="relative space-y-2.5" data-chart-root>
      <Tooltip {...tooltip} />
      {stages.map((s, i) => {
        const barPct = Math.max((s.count / max) * 100, 3);
        const displayPct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0';
        const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        return (
          <div key={s.stageId} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-right text-[12px] font-bold text-slate-700">
              {s.label}
            </span>
            <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-slate-100">
              <div
                className="flex h-full cursor-pointer items-center justify-between rounded-lg px-3 transition-all duration-500 hover:opacity-90"
                style={{ width: `${barPct}%`, backgroundColor: color }}
                onMouseMove={e =>
                  show(e, `${s.label}: ${s.count} (${displayPct}% of total) — click to drill`)
                }
                onMouseLeave={hide}
                onClick={() =>
                  onDrill({
                    type: 'stage',
                    label: s.label,
                    stageId: s.stageId,
                    stageLabel: s.label,
                  })
                }
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
// TERMINAL BREAKDOWN — each bar clickable
// ─────────────────────────────────────────────────────────────────────────────

function TerminalBreakdown({
  stages,
  onDrill,
}: {
  stages: TerminalStage[];
  onDrill: (t: DrillTarget) => void;
}) {
  const { tooltip, show, hide } = useTooltip();
  const max = Math.max(1, ...stages.map(s => s.count));
  const total = stages.reduce((s, st) => s + st.count, 0);
  if (!stages.length) return <Empty msg="No placements recorded yet." />;

  return (
    <div className="relative space-y-3" data-chart-root>
      <Tooltip {...tooltip} />
      {stages.map((s, i) => {
        const pct = Math.max((s.count / max) * 100, 3);
        const color = TERMINAL_COLORS[i % TERMINAL_COLORS.length];
        return (
          <div key={s.stageId} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-right text-[12px] font-bold text-slate-700">
              {s.label}
            </span>
            <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-emerald-50">
              <div
                className="flex h-full cursor-pointer items-center rounded-lg px-3 transition-all duration-500 hover:opacity-90"
                style={{ width: `${pct}%`, backgroundColor: color }}
                onMouseMove={e => show(e, `${s.label}: ${s.count} placed — click to drill`)}
                onMouseLeave={hide}
                onClick={() =>
                  onDrill({
                    type: 'stage',
                    label: `Placed — ${s.label}`,
                    stageId: s.stageId,
                    stageLabel: s.label,
                  })
                }
              >
                <span className="text-[13px] font-black text-white">{s.count}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div
        className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 transition-colors hover:bg-emerald-100"
        onClick={() => onDrill({ type: 'placed', label: 'All placed candidates' })}
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="text-[13px] font-black text-emerald-800">{total} total placed</span>
        <span className="ml-auto text-[10px] font-semibold text-emerald-500">click to drill →</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPOSITION BAR
// ─────────────────────────────────────────────────────────────────────────────

function DispositionBar({ counts }: { counts: Record<string, number> }) {
  const { tooltip, show, hide } = useTooltip();
  const entries = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <Empty msg="No disposition data." />;

  return (
    <div className="space-y-4" data-chart-root>
      <Tooltip {...tooltip} />
      <div className="flex h-6 w-full overflow-hidden rounded-full">
        {entries.map(([k, v]) => {
          const pct = (v / total) * 100;
          const color = DISP_COLORS[k] ?? '#94A3B8';
          return (
            <div
              key={k}
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="cursor-default"
              onMouseMove={e => show(e, `${k.replace(/_/g, ' ')}: ${v} (${pct.toFixed(1)}%)`)}
              onMouseLeave={hide}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: DISP_COLORS[k] ?? '#94A3B8' }}
            />
            <span className="text-[12px] font-bold text-slate-700">{k.replace(/_/g, ' ')}</span>
            <span className="text-[13px] font-black text-slate-900">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALE VALUE BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────

function SaleValueBreakdown({
  breakdown,
  total,
}: {
  breakdown: Record<string, { count: number; total: number }>;
  total: number;
}) {
  const { tooltip, show, hide } = useTooltip();
  const entries = Object.entries(breakdown)
    .filter(([k, v]) => k !== 'NOT_FOUND' && v.count > 0)
    .sort((a, b) => b[1].total - a[1].total);
  if (!entries.length)
    return (
      <div className="py-4 text-center text-[13px] text-slate-400">
        No sale value data computed yet.
      </div>
    );
  const grandTotal = entries.reduce((s, [, v]) => s + v.total, 0);

  return (
    <div className="space-y-4" data-chart-root>
      <Tooltip {...tooltip} />
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        {entries.map(([k, v]) => {
          const pct = grandTotal > 0 ? (v.total / grandTotal) * 100 : 0;
          const color = BASIS_LABEL[k]?.color ?? '#94A3B8';
          return (
            <div
              key={k}
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="cursor-default"
              onMouseMove={e =>
                show(e, `${BASIS_LABEL[k]?.label ?? k}: ${fmtCurrency(v.total)} (${v.count} reqs)`)
              }
              onMouseLeave={hide}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(([k, v]) => {
          const b = BASIS_LABEL[k];
          return (
            <div key={k} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b?.color }} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {b?.label ?? k}
                </span>
              </div>
              <p className="text-[16px] font-black text-slate-900">{fmtCurrency(v.total)}</p>
              <p className="text-[11px] text-slate-400">
                {v.count} requirement{v.count !== 1 ? 's' : ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE LINE BREAKDOWN — "View candidates" button drills
// ─────────────────────────────────────────────────────────────────────────────

function ServiceLineBreakdown({
  lines,
  onDrill,
}: {
  lines: SlBreakdown[];
  onDrill: (t: DrillTarget) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(lines[0]?.name ?? null);
  if (!lines.length) return <Empty msg="No service line data." />;
  const maxTotal = Math.max(1, ...lines.map(l => l.total));

  return (
    <div className="space-y-2">
      {lines.map(sl => {
        const isOpen = expanded === sl.name;
        const barPct = Math.max((sl.total / maxTotal) * 100, 3);
        return (
          <div key={sl.name} className="overflow-hidden rounded-xl border-2 border-slate-100">
            <button
              onClick={() => setExpanded(isOpen ? null : sl.name)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="h-3 w-3 rounded-full bg-indigo-500 shrink-0" />
              <span className="flex-1 text-[13px] font-black text-slate-800">{sl.name}</span>
              <div className="flex items-center gap-4 text-[12px] font-semibold">
                <span className="text-slate-600">{sl.total} total</span>
                {sl.placed > 0 && <span className="text-emerald-700">{sl.placed} placed</span>}
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-700">
                  {sl.placementRate}%
                </span>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="border-t-2 border-slate-100 px-4 pb-4 pt-3">
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[12px] font-semibold">
                  <span className="text-blue-600">{sl.active} active</span>
                  <span className="text-red-500">{sl.dropped} dropped</span>
                  <span className="text-emerald-700">{sl.placed} placed</span>
                  <button
                    onClick={() =>
                      onDrill({
                        type: 'service_line',
                        label: sl.name,
                        drillServiceLineId: sl.serviceLineId ?? undefined,
                        drillServiceLineName: sl.name,
                      })
                    }
                    className="ml-auto flex h-7 items-center gap-1 rounded-lg bg-indigo-50 px-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    View candidates →
                  </button>
                </div>
                {sl.funnelStages.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Pipeline stages
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sl.funnelStages.map((s, idx) => (
                        <button
                          key={s.stageId}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: FUNNEL_COLORS[idx % FUNNEL_COLORS.length] }}
                          onClick={() =>
                            onDrill({
                              type: 'stage',
                              label: `${sl.name} — ${s.label}`,
                              stageId: s.stageId,
                              stageLabel: s.label,
                            })
                          }
                        >
                          {s.label}: {s.count}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {sl.terminalStages.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Placed / achieved
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sl.terminalStages.map(s => (
                        <button
                          key={s.stageId}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                          onClick={() =>
                            onDrill({
                              type: 'stage',
                              label: `${sl.name} — ${s.label}`,
                              stageId: s.stageId,
                              stageLabel: s.label,
                            })
                          }
                        >
                          {s.label}: {s.count}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD — each row clickable
// ─────────────────────────────────────────────────────────────────────────────

function Leaderboard({
  items,
  onDrill,
}: {
  items: LeaderboardEntry[];
  onDrill: (t: DrillTarget) => void;
}) {
  const max = Math.max(1, ...items.map(i => i.sourced));
  if (!items.length) return <Empty msg="No recruiter activity." />;

  return (
    <div className="space-y-2.5">
      {items.map((r, i) => {
        const barPct = Math.max((r.sourced / max) * 100, 4);
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
        return (
          <div
            key={r.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg p-1 transition-colors hover:bg-slate-50"
            onClick={() =>
              onDrill({
                type: 'recruiter',
                label: r.name,
                recruiterId: r.id,
                recruiterName: r.name,
              })
            }
          >
            <span className="w-5 shrink-0 text-center text-[12px]">
              {medal ?? <span className="font-bold text-slate-400">{i + 1}</span>}
            </span>
            <div className="w-36 shrink-0 overflow-hidden">
              <p className="truncate text-[12px] font-bold text-slate-800">{r.name}</p>
              <p className="truncate text-[10px] text-slate-400">{r.email}</p>
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
              <div
                className="flex h-full items-center rounded-md px-2 transition-all"
                style={{ width: `${barPct}%`, backgroundColor: '#4F46E5' }}
              >
                <span className="text-[11px] font-black text-white">{r.sourced}</span>
              </div>
            </div>
            {r.placed > 0 && (
              <span className="w-20 shrink-0 text-right text-[11px] font-black text-emerald-700">
                {r.placed} placed
              </span>
            )}
            {r.placementRate > 0 && (
              <span className="w-12 shrink-0 text-right text-[10px] font-bold text-slate-400">
                {r.placementRate}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM TREE — each card clickable
// ─────────────────────────────────────────────────────────────────────────────

function TeamTree({
  members,
  onDrill,
}: {
  members: TeamMember[];
  onDrill: (t: DrillTarget) => void;
}) {
  if (!members.length) return null;
  const maxTotal = Math.max(1, ...members.map(m => m.stats.total));

  return (
    <div className="space-y-3">
      {members.map(m => {
        const barPct = Math.max((m.stats.total / maxTotal) * 100, 3);
        return (
          <div
            key={m.id}
            className="cursor-pointer rounded-xl border-2 border-slate-100 bg-white p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/20"
            onClick={() =>
              onDrill({
                type: 'recruiter',
                label: `${m.name}'s team`,
                recruiterId: m.id,
                recruiterName: m.name,
              })
            }
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-black text-slate-900">{m.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {m.role && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      {m.role.replace(/_/g, ' ')}
                    </span>
                  )}
                  {m.department && (
                    <span className="text-[10px] text-slate-400">{m.department}</span>
                  )}
                  {m.teamSize > 1 && (
                    <span className="text-[10px] text-slate-400">
                      · {m.teamSize} member{m.teamSize !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-black text-slate-900">
                  {m.stats.total}{' '}
                  <span className="text-[10px] font-semibold text-slate-400">sourced</span>
                </p>
                {m.stats.placed > 0 && (
                  <p className="text-[11px] font-bold text-emerald-700">
                    {m.stats.placed} placed ({m.stats.placementRate}%)
                  </p>
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
              <span className="text-blue-600">{m.stats.active} active</span>
              {m.stats.placed > 0 && (
                <span className="text-emerald-600">{m.stats.placed} placed</span>
              )}
              <span className="ml-auto text-[10px] text-indigo-400">click to drill →</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-52 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function OverviewSection({
  data,
  loading,
  onDrill,
  baseQs,
}: {
  data?: OverviewResponse;
  loading: boolean;
  onDrill: (target: DrillTarget) => void;
  baseQs: string;
}) {
  // const { kpis } = d;
  const d = data?.data;
  const meta = data?.meta;

  // const { kpis } = d;

  const kpis: any = data?.data.kpis || {};
  const [statsDrawerTarget, setStatsDrawerTarget] = useState<StatsDrawerTarget | null>(null);

  if (loading) return <OverviewSkeleton />;

  if (!d || d.kpis.total === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
        <Activity className="h-12 w-12 opacity-20" />
        <p className="text-[14px] font-semibold">No activity in this window.</p>
        <p className="text-[12px]">Try a different date range or remove filters.</p>
      </div>
    );

  // if (loading)
  //   return (
  //     <div className="space-y-4">
  //       <div className="grid grid-cols-5 gap-3 ">
  //         {Array.from({ length: 5 }).map((_, i) => (
  //           <Skeleton key={i} className="h-24 rounded-xl bg-gray-900" />
  //         ))}
  //       </div>
  //       <Skel rows={6} />
  //     </div>
  //   );

  if (!kpis) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
        <Activity className="h-12 w-12 opacity-20" />
        <p className="text-[14px] font-semibold">No activity in this window.</p>
        <p className="text-[12px]">Try a different date range or remove filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1 — counts: Total · In Pipeline · Near Close · one card per terminal stage */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* <KpiCard
          label="Total"
          value={kpis.total}
          color="#4F46E5"
          icon={Users}
          sub="in funnel"
          onClick={() => onDrill({ type: 'active_pipeline', label: 'All pipeline candidates' })}
        />
        <KpiCard
          label="In Process"
          value={kpis.inProgress}
          color="#0891B2"
          icon={Activity}
          sub="actively moving"
          onClick={() => onDrill({ type: 'active_pipeline', label: 'In progress candidates' })}
        /> */}
        {(kpis.nearTerminalCount ?? 0) > 0 && (
          <div
            onClick={() =>
              setStatsDrawerTarget({
                drillTarget: { type: 'near_terminal', label: 'Near close candidates' },
                label: 'Pipeline Counts — Near Close',
                breakdown: (d.pipelineStageDetails ?? [])
                  .filter(s => s.isNearTerminal && s.count > 0)
                  .map(s => ({
                    serviceLineName: s.serviceLineName,
                    stageName: s.label,
                    count: s.count,
                  })),
              })
            }
            className="flex flex-col gap-2 rounded-xl border-2 border-amber-100 bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer hover:border-amber-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Pipeline Counts
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <span className="text-[28px] font-black leading-none text-amber-500">
              {kpis.nearTerminalCount}
            </span>
            <div className="flex flex-col gap-0.5">
              {(d.pipelineStageDetails ?? [])
                .filter(s => s.isNearTerminal && s.count > 0)
                .map(s => (
                  <span key={s.stageId} className="text-[10px] leading-tight text-slate-500">
                    {s.serviceLineName && (
                      <span className="mr-1 rounded bg-amber-50 px-1 text-[9px] font-black uppercase text-amber-600">
                        {s.serviceLineName}
                      </span>
                    )}
                    {s.label}: <span className="font-black text-slate-700">{s.count}</span>
                  </span>
                ))}
            </div>
            <span className="text-[10px] font-semibold text-indigo-400">click to drill →</span>
          </div>
        )}
        {(d.terminalStageDetails ?? []).filter(s => s.count > 0).length > 0 && (
          <div
            onClick={() =>
              setStatsDrawerTarget({
                drillTarget: { type: 'placed', label: 'Deals Closed' },
                label: 'Deals Closed',
                breakdown: (d.terminalStageDetails ?? [])
                  .filter(s => s.count > 0)
                  .map(s => ({
                    serviceLineName: s.serviceLineName,
                    stageName: s.label,
                    count: s.count,
                  })),
              })
            }
            className="flex flex-col gap-2 rounded-xl border-2 border-emerald-100 bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer hover:border-emerald-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Deals Closed
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <span className="text-[28px] font-black leading-none text-emerald-600">
              {kpis.placed}
            </span>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {(d.terminalStageDetails ?? [])
                .filter(s => s.count > 0)
                .map(s => (
                  <span key={s.stageId} className="text-[10px] leading-tight text-slate-500">
                    {s.serviceLineName && (
                      <span className="mr-1 rounded bg-emerald-50 px-1 text-[9px] font-black uppercase text-emerald-600">
                        {s.serviceLineName}
                      </span>
                    )}
                    {s.label}: <span className="font-black text-slate-700">{s.count}</span>
                  </span>
                ))}
            </div>
            <span className="text-[10px] font-semibold text-indigo-400">click to drill →</span>
          </div>
        )}
      </div>

      {/* Row 2 — money: Total Sale Value · Near Pipeline Value · Achieved Value */}
      {meta?.hasSaleValueData && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Total Sale Value
              </span>
            </div>
            <p className="text-[24px] font-black text-emerald-900">
              {fmtCurrency(kpis.totalSaleValue)}
            </p>
            <p className="text-[11px] text-emerald-600">
              {kpis.saleValueIncluded} computed
              {kpis.saleValueOmitted > 0 && (
                <span className="ml-1 font-bold text-amber-600">
                  · {kpis.saleValueOmitted} no data
                </span>
              )}
            </p>
          </div>
          {(kpis.nearTerminalPipelineValue ?? 0) > 0 && (
            <div className="flex flex-col gap-1 rounded-xl border-2 border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
                  Pipeline Value
                </span>
              </div>
              <p className="text-[24px] font-black text-amber-900">
                {fmtCurrency(kpis.nearTerminalPipelineValue)}
              </p>
              <p className="text-[11px] text-amber-600">in transit · near close</p>
            </div>
          )}
          <div className="flex flex-col gap-1 rounded-xl border-2 border-purple-100 bg-purple-50 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-700">
                Achieved Value
              </span>
            </div>
            <p className="text-[24px] font-black text-purple-900">
              {fmtCurrency(kpis.totalAchievedValue)}
            </p>
            <p className="text-[11px] text-purple-600">{kpis.achievedPct}% of target</p>
          </div>
        </div>
      )}

      {/* Terminal stages — real names from DB */}
      {/* {d.terminalStageDetails && d.terminalStageDetails.length > 0 && (
        <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-emerald-700">
            Achieved / Placed — {kpis.placed} total · {kpis.fillRate}% fill rate
          </p>
          <div className="flex flex-wrap gap-3">
            {d.terminalStageDetails.map(s => (
              <button
                key={s.stageId}
                onClick={() =>
                  onDrill({
                    type: 'stage',
                    label: s.label,
                    stageId: s.stageId,
                    stageLabel: s.label,
                  })
                }
                className="flex flex-col rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 text-left hover:border-emerald-400 transition-colors cursor-pointer shadow-sm"
              >
                {s.serviceLineName && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 mb-0.5">
                    {s.serviceLineName}
                  </span>
                )}
                <span className="text-[26px] font-black leading-none text-emerald-800">
                  {s.count}
                </span>
                <span className="text-[12px] font-bold text-emerald-700 mt-1">{s.label}</span>
                <span className="text-[10px] text-emerald-400 mt-0.5">click to drill →</span>
              </button>
            ))}
          </div>
        </div>
      )} */}

      {/* Near-terminal — candidates close to conversion with pipeline value */}
      {/* {(kpis.nearTerminalCount ?? 0) > 0 && (
        <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-amber-700">
            Near Conversion — about to be placed
          </p>
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="flex flex-col justify-center rounded-xl border-2 border-amber-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                Total Near
              </span>
              <span className="text-[26px] font-black leading-none text-amber-800">
                {kpis.nearTerminalCount}
              </span>
              <span className="text-[11px] font-semibold text-amber-600">candidates</span>
            </div>
            {meta?.hasSaleValueData && (kpis.nearTerminalPipelineValue ?? 0) > 0 && (
              <div className="flex flex-col justify-center rounded-xl border-2 border-amber-200 bg-white px-4 py-3 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                  Pipeline Value
                </span>
                <span className="text-[22px] font-black leading-none text-amber-800">
                  {fmtCurrency(kpis.nearTerminalPipelineValue)}
                </span>
                <span className="text-[11px] font-semibold text-amber-600">
                  estimated conversion
                </span>
              </div>
            )}
            {d.pipelineStageDetails
              ?.filter(s => s.isNearTerminal)
              .map(s => (
                <button
                  key={s.stageId}
                  onClick={() =>
                    onDrill({
                      type: 'near_terminal',
                      label: s.label,
                      stageId: s.stageId,
                      stageLabel: s.label,
                    })
                  }
                  className="flex flex-col rounded-xl border-2 border-amber-200 bg-white px-3 py-2 text-left hover:border-amber-400 transition-colors cursor-pointer shadow-sm"
                >
                  {s.serviceLineName && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 mb-0.5">
                      {s.serviceLineName}
                    </span>
                  )}
                  <span className="text-[20px] font-black leading-none text-amber-800">
                    {s.count}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 mt-1">{s.label}</span>
                  <span className="text-[9px] text-amber-400 mt-0.5">drill →</span>
                </button>
              ))}
          </div>
        </div>
      )} */}

      {/* Pipeline stages — real names, non-sourced, non-near-terminal */}
      {d.pipelineStageDetails &&
        d.pipelineStageDetails.filter(s => !s.isNearTerminal).length > 0 && (
          <div className="rounded-xl border-2 border-blue-100 bg-blue-50 p-4">
            <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-blue-700">
              Pipeline Stages — {kpis.inProgress} in progress
            </p>
            <div className="flex flex-wrap gap-2">
              {d.pipelineStageDetails
                .filter(s => !s.isNearTerminal)
                .map(s => (
                  <button
                    key={s.stageId}
                    onClick={() =>
                      onDrill({
                        type: 'stage',
                        label: s.label,
                        stageId: s.stageId,
                        stageLabel: s.label,
                      })
                    }
                    className="flex flex-col rounded-xl border-2 border-blue-200 bg-white px-3 py-2 text-left hover:border-blue-400 transition-colors cursor-pointer shadow-sm"
                  >
                    {s.serviceLineName && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 mb-0.5">
                        {s.serviceLineName}
                      </span>
                    )}
                    <span className="text-[20px] font-black leading-none text-blue-800">
                      {s.count}
                    </span>
                    <span className="text-[11px] font-bold text-blue-700 mt-1">{s.label}</span>
                    <span className="text-[9px] text-blue-400 mt-0.5">drill →</span>
                  </button>
                ))}
            </div>
          </div>
        )}

      {/* Sale value KPIs */}
      {meta?.hasSaleValueData && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Total Sale Value
              </span>
            </div>
            <p className="text-[24px] font-black text-emerald-900">
              {fmtCurrency(kpis.totalSaleValue)}
            </p>
            <p className="text-[11px] text-emerald-600">
              {kpis.saleValueIncluded} computed
              {kpis.saleValueOmitted > 0 && (
                <span className="ml-1 font-bold text-amber-600">
                  · {kpis.saleValueOmitted} no data
                </span>
              )}
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
              {fmtCurrency(kpis.totalAchievedValue)}
            </p>
            <p className="text-[11px] text-purple-600">{kpis.achievedPct}% of target</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border-2 border-slate-200 bg-white p-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Achievement Progress
            </span>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(100, kpis.achievedPct)}%` }}
              />
            </div>
            <p className="mt-1 text-[13px] font-black text-slate-800">
              {kpis.achievedPct}%{' '}
              <span className="text-[11px] font-semibold text-slate-400">
                of {fmtCurrency(kpis.totalSaleValue)} target
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Time series */}
      <Card
        title={`Candidates added — ${d.timeGranularity === 'hour' ? 'hourly' : 'daily'}`}
        badge={kpis.total}
      >
        <TimeSeriesChart points={d.timeSeries} granularity={d.timeGranularity} />
      </Card>

      {/* Pipeline funnel + Terminal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Pipeline stages" badge={kpis.inProgress}>
          <FunnelBars stages={d.funnelStages} total={kpis.total} onDrill={onDrill} />
        </Card>
        <Card title="Placed / achieved" badge={kpis.placed}>
          <TerminalBreakdown stages={d.terminalBreakdown} onDrill={onDrill} />
        </Card>
      </div>

      {/* Disposition + Sale value method */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Disposition split">
          <DispositionBar counts={d.dispositionCounts} />
        </Card>
        {meta?.hasSaleValueData ? (
          <Card title="Sale value by method">
            <SaleValueBreakdown breakdown={d.saleValueBreakdown} total={kpis.total} />
          </Card>
        ) : (
          <Card title="Business units">
            {d.byBusinessUnit.length ? (
              <div className="space-y-3">
                {d.byBusinessUnit.slice(0, 6).map(bu => {
                  const bMax = Math.max(1, ...d.byBusinessUnit.map(b => b.total));
                  return (
                    <div
                      key={bu.name}
                      className="cursor-pointer rounded-lg p-1 transition-colors hover:bg-slate-50"
                      onClick={() =>
                        onDrill({
                          type: 'business_unit',
                          label: bu.name,
                          drillBusinessUnitId: bu.id ?? undefined,
                        })
                      }
                    >
                      <div className="mb-1 flex justify-between text-[12px]">
                        <span className="font-bold text-slate-700">{bu.name}</span>
                        <span className="font-semibold text-slate-500">
                          {bu.total} · <span className="text-emerald-700">{bu.placed} placed</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${(bu.total / bMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty msg="No business unit data." />
            )}
          </Card>
        )}
      </div>

      {/* Service line breakdown */}
      {d.byServiceLine.length > 1 && (
        <Card title="By service line" badge={d.byServiceLine.length}>
          <ServiceLineBreakdown lines={d.byServiceLine} onDrill={onDrill} />
        </Card>
      )}

      {/* Department breakdown */}
      {d.byDepartment.length > 1 && (
        <Card title="By department" badge={d.byDepartment.length}>
          <div className="space-y-2">
            {d.byDepartment.slice(0, 8).map(dept => {
              const max = Math.max(1, ...d.byDepartment.map(d => d.total));
              return (
                <div
                  key={dept.name}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-1 transition-colors hover:bg-slate-50"
                  onClick={() =>
                    onDrill({
                      type: 'department',
                      label: dept.name,
                      departmentId: dept.id ?? undefined,
                      departmentName: dept.name,
                    })
                  }
                >
                  <span className="w-36 shrink-0 truncate text-right text-[12px] font-bold text-slate-700">
                    {dept.name}
                  </span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
                    <div
                      className="flex h-full items-center rounded-md px-2 transition-all"
                      style={{
                        width: `${Math.max((dept.total / max) * 100, 3)}%`,
                        backgroundColor: '#6366F1',
                      }}
                    >
                      <span className="text-[11px] font-black text-white">{dept.total}</span>
                    </div>
                  </div>
                  <span className="w-16 shrink-0 text-right text-[10px] font-semibold text-slate-400">
                    {dept.recruiterCount} rec.
                  </span>
                  {dept.placed > 0 && (
                    <span className="w-20 shrink-0 text-right text-[11px] font-black text-emerald-700">
                      {dept.placed} placed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Leaderboard + Team tree */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Top recruiters" badge={d.leaderboard.length}>
          <Leaderboard items={d.leaderboard} onDrill={onDrill} />
        </Card>
        {meta?.hasTeamTree && d.teamTree.length > 0 && (
          <Card title="My team" badge={d.teamTree.length}>
            <TeamTree members={d.teamTree} onDrill={onDrill} />
          </Card>
        )}
      </div>
      <StatsDrawer
        target={statsDrawerTarget}
        baseQs={baseQs}
        onClose={() => setStatsDrawerTarget(null)}
      />
      {/* My requirements — shown for users who create requirements (CSM/SR CSM etc.) */}
      {/* <MyRequirementsSection baseQs={baseQs} /> */}
    </div>
  );
}

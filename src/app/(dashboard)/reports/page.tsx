// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable react/no-unescaped-entities */
// 'use client';

// // File: page.tsx
// // Path: src/app/(dashboard)/reports/page.tsx
// import { Fragment } from 'react';
// import { useState, useMemo, useCallback } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import {
//   BarChart2,
//   Users,
//   FileText,
//   LayoutDashboard,
//   Download,
//   Filter,
//   TrendingUp,
//   TrendingDown,
//   AlertCircle,
//   RefreshCw,
//   X,
//   ChevronDown,
//   ChevronRight,
//   FileDown,
//   Clock,
//   CheckSquare,
//   Square,
//   Layers,
// } from 'lucide-react';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { useAxios } from '@/hooks/useAxios';
// import { useAuth } from '@/context/AuthContext';
// import { usePermission } from '@/hooks/usePermission';
// import { format } from 'date-fns';
// // ─────────────────────────────────────────────────────────────────────────────
// // FROZEN (STICKY) LEADING COLUMNS
// // left offsets are derived from the widths below — never hardcode them per cell
// // ─────────────────────────────────────────────────────────────────────────────

// const FROZEN_COLS = [
//   { key: 'select', width: 44 },
//   { key: 'expand', width: 36 },
//   { key: 'sr', width: 52 },
//   { key: 'name', width: 260 },
// ] as const;

// type FrozenKey = (typeof FROZEN_COLS)[number]['key'];

// const FROZEN_META = FROZEN_COLS.reduce(
//   (acc, col, i) => {
//     acc[col.key] = {
//       left: FROZEN_COLS.slice(0, i).reduce((s, c) => s + c.width, 0),
//       width: col.width,
//       isLast: i === FROZEN_COLS.length - 1,
//     };
//     return acc;
//   },
//   {} as Record<FrozenKey, { left: number; width: number; isLast: boolean }>
// );

// function frozen(
//   key: FrozenKey,
//   opts: { bg?: string; extra?: string } = {}
// ): { className: string; style: React.CSSProperties } {
//   const m = FROZEN_META[key];
//   return {
//     className: [
//       'sticky z-20',
//       opts.bg ?? 'bg-white group-hover:bg-slate-50',
//       m.isLast ? 'shadow-[8px_0_8px_-6px_rgba(15,23,42,0.12)]' : '',
//       opts.extra ?? '',
//     ]
//       .filter(Boolean)
//       .join(' '),
//     style: { left: m.left, width: m.width, minWidth: m.width, maxWidth: m.width },
//   };
// }
// // ─────────────────────────────────────────────────────────────────────────────
// // TYPES
// // ─────────────────────────────────────────────────────────────────────────────

// interface StageMeta {
//   id: string;
//   code: string;
//   label: string;
//   order: number;
//   isStandard: boolean;
//   isTerminal: boolean;
//   canonicalStage: string | null;
//   serviceLineId: string | null;
//   serviceLine: { id: string; name: string } | null;
// }

// interface RequirementBreakdown {
//   requirementId: string;
//   reqCode: string;
//   title: string;
//   status: string;
//   totalOpenings: number;
//   client: { id: string; name: string } | null;
//   serviceLine: { id: string; name: string } | null;
//   businessUnit: { id: string; name: string } | null;
//   sourced: number;
//   submitted: number;
//   offered: number;
//   joined: number;
//   dropped: number;
//   active: number;
//   stageCounts: Record<string, number>;
// }

// interface RecruiterStat {
//   id: string;
//   name: string;
//   email: string;
//   sourced: number;
//   submitted: number;
//   offered: number;
//   joined: number;
//   dropped: number;
//   active: number;
//   submissionRate: number;
//   offerRate: number;
//   joinRate: number;
//   avgTimeToSubmitDays: number | null;
//   stageCounts: Record<string, number>;
//   requirementBreakdown: RequirementBreakdown[];
// }

// interface ServiceLineRef {
//   id: string;
//   name: string;
// }

// interface RecruiterGroup {
//   serviceLine: ServiceLineRef | null;
//   stages: StageMeta[];
//   data: RecruiterStat[];
//   total: number;
// }

// interface RecruiterResponse {
//   success: boolean;
//   groups: RecruiterGroup[];
//   meta: { scope?: string; window: string; standardOnly?: boolean; multiLine?: boolean };
// }

// interface RequirementRow {
//   id: string;
//   reqCode: string;
//   title: string;
//   status: string;
//   priority: string;
//   totalOpenings: number;
//   totalCandidates: number;
//   city: string | null;
//   country: string | null;
//   jobType: string;
//   remoteType: string;
//   respondBy: string | null;
//   isRespondByBreached: boolean;
//   createdAt: string;
//   deletedAt: string | null;
//   client: { id: string; name: string } | null;
//   clientSpoc: { id: string; firstName: string; lastName: string; email: string } | null;
//   businessUnit: { id: string; name: string } | null;
//   serviceLine: { id: string; name: string } | null;
//   createdBy: { id: string; firstName: string; lastName: string };
//   stageCounts: Record<string, number>;
// }

// interface RequirementGroup {
//   serviceLine: ServiceLineRef | null;
//   stages: StageMeta[];
//   data: RequirementRow[];
//   total: number;
// }

// interface RequirementReportResponse {
//   success: boolean;
//   groups: RequirementGroup[];
//   meta: { total?: number; window: string; standardOnly?: boolean; multiLine?: boolean };
// }

// interface OverviewResponse {
//   success: boolean;
//   data: {
//     kpis: {
//       total: number;
//       submitted: number;
//       offered: number;
//       joined: number;
//       dropped: number;
//       active: number;
//       submissionRate: number;
//       offerRate: number;
//       joinRate: number;
//     };
//     funnel: { stageId: string; label: string; count: number }[];
//     byServiceLine: {
//       serviceLineId: string | null;
//       name: string;
//       total: number;
//       submitted: number;
//       offered: number;
//       joined: number;
//       funnel: { stageId: string; label: string; order: number; count: number }[];
//     }[];
//     byBusinessUnit: {
//       businessUnitId: string | null;
//       name: string;
//       total: number;
//       joined: number;
//     }[];
//     dispositionCounts: Record<string, number>;
//     timeSeries: { bucket: string; count: number }[];
//     timeGranularity: 'hour' | 'day';
//     leaderboard: { id: string; name: string; sourced: number; joined: number }[];
//   };
//   meta: { window: string; granularity: string; scope: string; multiLine: boolean };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // DESIGN TOKENS
// // ─────────────────────────────────────────────────────────────────────────────

// const FUNNEL_COLORS = [
//   '#4F46E5',
//   '#7C3AED',
//   '#2563EB',
//   '#0891B2',
//   '#059669',
//   '#D97706',
//   '#DC2626',
//   '#DB2777',
//   '#0284C7',
//   '#16A34A',
//   '#CA8A04',
//   '#9333EA',
// ];

// const STATUS_STYLE: Record<string, string> = {
//   ACTIVE: 'bg-emerald-50 text-emerald-700',
//   DRAFT: 'bg-slate-100 text-slate-500',
//   PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
//   ON_HOLD: 'bg-orange-50 text-orange-700',
//   CLOSED: 'bg-slate-100 text-slate-500',
//   CANCELLED: 'bg-red-50 text-red-600',
//   FILLED: 'bg-blue-50 text-blue-700',
//   REMOVED: 'bg-slate-100 text-slate-500',
// };

// function humanKey(k: string) {
//   return k
//     .split('_')
//     .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//     .join(' ');
// }

// function fmtDate(d: string | null | undefined) {
//   if (!d) return '—';
//   try {
//     return format(new Date(d), 'dd MMM yyyy');
//   } catch {
//     return '—';
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // DATE / TIME WINDOW STATE
// // ─────────────────────────────────────────────────────────────────────────────

// type WindowMode = 'preset' | 'hours' | 'range';

// interface WinState {
//   mode: WindowMode;
//   range: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth';
//   hours: number;
//   fromDate: string;
//   toDate: string;
// }

// const DEFAULT_WIN: WinState = {
//   mode: 'preset',
//   range: 'today',
//   hours: 8,
//   fromDate: '',
//   toDate: '',
// };

// const PRESETS: { k: WinState['range']; l: string }[] = [
//   { k: 'today', l: 'Today' },
//   { k: 'yesterday', l: 'Yesterday' },
//   { k: 'last7', l: 'Last 7 Days' },
//   { k: 'last30', l: 'Last 30 Days' },
//   { k: 'thisMonth', l: 'This Month' },
// ];

// const HOUR_OPTS = [8, 12, 24, 48, 72];

// function winToParams(w: WinState): Record<string, string> {
//   if (w.mode === 'hours') return { hours: String(w.hours) };
//   if (w.mode === 'range') {
//     const p: Record<string, string> = {};
//     if (w.fromDate) p.fromDate = w.fromDate;
//     if (w.toDate) p.toDate = w.toDate;
//     return p;
//   }
//   return { range: w.range };
// }

// function winLabel(w: WinState): string {
//   if (w.mode === 'hours') return `Last ${w.hours} hours`;
//   if (w.mode === 'range') {
//     if (!w.fromDate && !w.toDate) return 'All time';
//     return `${w.fromDate || 'start'} to ${w.toDate || 'now'}`;
//   }
//   return PRESETS.find(p => p.k === w.range)?.l ?? 'Today';
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // DOWNLOAD util
// // ─────────────────────────────────────────────────────────────────────────────

// function downloadBlob(data: Blob, filename: string) {
//   const url = URL.createObjectURL(data);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = filename;
//   a.click();
//   URL.revokeObjectURL(url);
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // PRIMITIVES
// // ─────────────────────────────────────────────────────────────────────────────

// function KPI({
//   label,
//   value,
//   sub,
//   color,
//   trend,
// }: {
//   label: string;
//   value: string | number;
//   sub?: string;
//   color?: string;
//   trend?: 'up' | 'down';
// }) {
//   return (
//     <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
//       <div className="flex items-center justify-between">
//         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
//           {label}
//         </span>
//         {color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
//       </div>
//       <span className="text-3xl font-black text-slate-900 leading-none mt-1">{value}</span>
//       {sub && (
//         <span
//           className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}
//         >
//           {trend === 'up' && <TrendingUp className="w-3 h-3" />}
//           {trend === 'down' && <TrendingDown className="w-3 h-3" />}
//           {sub}
//         </span>
//       )}
//     </div>
//   );
// }

// function Skel({ rows = 4 }: { rows?: number }) {
//   return (
//     <div className="space-y-3">
//       {[...Array(rows)].map((_, i) => (
//         <Skeleton key={i} className="h-8 w-full rounded-lg" />
//       ))}
//     </div>
//   );
// }

// function Empty({ msg }: { msg: string }) {
//   return (
//     <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
//       <AlertCircle className="w-10 h-10 opacity-30" />
//       <p className="text-sm font-medium">{msg}</p>
//     </div>
//   );
// }

// function Card({
//   title,
//   children,
//   action,
// }: {
//   title: string;
//   children: React.ReactNode;
//   action?: React.ReactNode;
// }) {
//   return (
//     <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
//       <div className="flex items-center justify-between mb-4">
//         <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
//         {action}
//       </div>
//       {children}
//     </div>
//   );
// }

// function MiniStat({ l, v, c = 'text-slate-800' }: { l: string; v: number; c?: string }) {
//   return (
//     <div className="flex flex-col">
//       <span className={`text-lg font-black ${c}`}>{v}</span>
//       <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{l}</span>
//     </div>
//   );
// }

// function LinePill({ name }: { name: string }) {
//   return (
//     <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-lg">
//       <Layers className="w-3.5 h-3.5" /> {name}
//     </span>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // CHARTS (dependency-free)
// // ─────────────────────────────────────────────────────────────────────────────

// function FunnelChart({ items }: { items: { label: string; count: number }[] }) {
//   const max = Math.max(1, ...items.map(i => i.count));
//   if (!items.length) return <Empty msg="No stage data." />;
//   return (
//     <div className="space-y-2">
//       {items.map((it, i) => {
//         const pct = Math.round((it.count / max) * 100);
//         const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
//         return (
//           <div key={it.label + i} className="flex items-center gap-3">
//             <span className="text-[12px] font-semibold text-slate-600 w-40 shrink-0 truncate text-right">
//               {it.label}
//             </span>
//             <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden relative">
//               <div
//                 className="h-full rounded-md transition-all duration-500 flex items-center justify-end px-2"
//                 style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }}
//               >
//                 <span className="text-[11px] font-black text-white">{it.count}</span>
//               </div>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// function TimeSeriesChart({
//   points,
//   granularity,
// }: {
//   points: { bucket: string; count: number }[];
//   granularity: 'hour' | 'day';
// }) {
//   if (points.length < 2)
//     return (
//       <div className="h-40 flex items-center justify-center text-sm text-slate-400">
//         Not enough data points to plot.
//       </div>
//     );
//   const W = 640;
//   const H = 160;
//   const pad = 24;
//   const max = Math.max(1, ...points.map(p => p.count));
//   const stepX = (W - pad * 2) / (points.length - 1);
//   const xy = points.map((p, i) => {
//     const x = pad + i * stepX;
//     const y = H - pad - (p.count / max) * (H - pad * 2);
//     return [x, y] as const;
//   });
//   const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
//   const area = `${line} L${xy[xy.length - 1][0]},${H - pad} L${xy[0][0]},${H - pad} Z`;
//   const fmtBucket = (b: string) =>
//     granularity === 'hour' ? format(new Date(b), 'dd MMM HH:mm') : format(new Date(b), 'dd MMM');
//   return (
//     <div className="w-full overflow-x-auto">
//       <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full min-w-[520px]">
//         <defs>
//           <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.35" />
//             <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
//           </linearGradient>
//         </defs>
//         <path d={area} fill="url(#tsGrad)" />
//         <path d={line} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinejoin="round" />
//         {xy.map(([x, y], i) => (
//           <g key={i}>
//             <circle cx={x} cy={y} r="3" fill="#4F46E5" />
//             <title>
//               {fmtBucket(points[i].bucket)}: {points[i].count}
//             </title>
//           </g>
//         ))}
//         {points.map((p, i) =>
//           i % Math.ceil(points.length / 8) === 0 ? (
//             <text
//               key={`t-${i}`}
//               x={pad + i * stepX}
//               y={H + 14}
//               fontSize="9"
//               fill="#94a3b8"
//               textAnchor="middle"
//             >
//               {fmtBucket(p.bucket)}
//             </text>
//           ) : null
//         )}
//       </svg>
//     </div>
//   );
// }

// function DispositionBars({ counts }: { counts: Record<string, number> }) {
//   const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
//   const total = entries.reduce((s, [, v]) => s + v, 0);
//   if (!total) return <Empty msg="No disposition data." />;
//   return (
//     <div className="space-y-3">
//       <div className="flex h-4 w-full rounded-full overflow-hidden">
//         {entries.map(([k, v], i) => (
//           <div
//             key={k}
//             style={{
//               width: `${(v / total) * 100}%`,
//               backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
//             }}
//             title={`${humanKey(k)}: ${v}`}
//           />
//         ))}
//       </div>
//       <div className="flex flex-wrap gap-x-4 gap-y-1.5">
//         {entries.map(([k, v], i) => (
//           <div key={k} className="flex items-center gap-1.5">
//             <span
//               className="w-2.5 h-2.5 rounded-sm"
//               style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
//             />
//             <span className="text-[12px] font-semibold text-slate-600">{humanKey(k)}</span>
//             <span className="text-[12px] font-black text-slate-900">{v}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function Leaderboard({
//   items,
// }: {
//   items: { id: string; name: string; sourced: number; joined: number }[];
// }) {
//   const max = Math.max(1, ...items.map(i => i.sourced));
//   if (!items.length) return <Empty msg="No recruiter activity." />;
//   return (
//     <div className="space-y-2.5">
//       {items.map((r, i) => (
//         <div key={r.id} className="flex items-center gap-3">
//           <span className="text-[11px] font-black text-slate-300 w-4">{i + 1}</span>
//           <span className="text-[12px] font-semibold text-slate-700 w-36 shrink-0 truncate">
//             {r.name}
//           </span>
//           <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
//             <div
//               className="h-full rounded bg-indigo-500 transition-all"
//               style={{ width: `${Math.max((r.sourced / max) * 100, 4)}%` }}
//             />
//           </div>
//           <span className="text-[12px] font-black text-slate-900 w-8 text-right">{r.sourced}</span>
//           {r.joined > 0 && (
//             <span className="text-[11px] font-bold text-emerald-600 w-16 text-right">
//               {r.joined} joined
//             </span>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// }

// // BU chart — total bar with joined overlaid
// function BUBarChart({
//   items,
// }: {
//   items: { businessUnitId: string | null; name: string; total: number; joined: number }[];
// }) {
//   const max = Math.max(1, ...items.map(i => i.total));
//   if (!items.length) return <Empty msg="No business unit data." />;
//   return (
//     <div className="space-y-3">
//       {items.map((b, i) => (
//         <div key={b.businessUnitId ?? `bu-${i}`}>
//           <div className="flex justify-between text-[12px] mb-1">
//             <span className="font-semibold text-slate-700">{b.name}</span>
//             <span className="text-slate-400">
//               {b.total} total ·{' '}
//               <span className="text-emerald-600 font-bold">{b.joined} joined</span>
//             </span>
//           </div>
//           <div className="h-5 bg-slate-100 rounded overflow-hidden relative">
//             <div
//               className="h-full bg-indigo-500 rounded"
//               style={{ width: `${(b.total / max) * 100}%` }}
//             />
//             <div
//               className="h-full bg-emerald-500 rounded absolute top-0 left-0"
//               style={{ width: `${(b.joined / max) * 100}%` }}
//             />
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // FILTERS BAR
// // ─────────────────────────────────────────────────────────────────────────────

// interface Filters {
//   clientId?: string;
//   serviceLineId?: string;
// }

// function FiltersBar({
//   filters,
//   onChange,
//   win,
//   onWin,
//   standardOnly,
//   onStandardOnly,
// }: {
//   filters: Filters;
//   onChange: (f: Filters) => void;
//   win: WinState;
//   onWin: (w: WinState) => void;
//   standardOnly: boolean;
//   onStandardOnly: (v: boolean) => void;
// }) {
//   const axios = useAxios();
//   const { data: clientsRes } = useQuery({
//     queryKey: ['rf-clients'],
//     queryFn: async () => (await axios.get('/clients?limit=200&status=ACTIVE')).data?.data ?? [],
//     staleTime: 300000,
//   });
//   const { data: slRes } = useQuery({
//     queryKey: ['rf-sl'],
//     queryFn: async () => (await axios.get('/service-lines')).data?.data ?? [],
//     staleTime: 300000,
//   });

//   const clients: any[] = clientsRes ?? [];
//   const sls: any[] = slRes ?? [];
//   const set = (k: keyof Filters, v: string) =>
//     onChange({ ...filters, [k]: v === 'ALL' ? undefined : v || undefined });

//   return (
//     <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
//       <div className="flex flex-wrap items-center gap-2">
//         <Clock className="w-4 h-4 text-slate-400 shrink-0" />
//         <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
//           {(
//             [
//               { k: 'preset', l: 'Quick' },
//               { k: 'hours', l: 'By Hours' },
//               { k: 'range', l: 'Custom Range' },
//             ] as { k: WindowMode; l: string }[]
//           ).map(m => (
//             <button
//               key={m.k}
//               onClick={() => onWin({ ...win, mode: m.k })}
//               className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${win.mode === m.k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
//             >
//               {m.l}
//             </button>
//           ))}
//         </div>

//         {win.mode === 'preset' &&
//           PRESETS.map(p => (
//             <button
//               key={p.k}
//               onClick={() => onWin({ ...win, range: p.k })}
//               className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${win.range === p.k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
//             >
//               {p.l}
//             </button>
//           ))}

//         {win.mode === 'hours' && (
//           <div className="flex items-center gap-2 flex-wrap">
//             {HOUR_OPTS.map(h => (
//               <button
//                 key={h}
//                 onClick={() => onWin({ ...win, hours: h })}
//                 className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${win.hours === h ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
//               >
//                 {h}h
//               </button>
//             ))}
//             <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 h-8">
//               <span className="text-[10px] font-bold text-slate-400">CUSTOM</span>
//               <input
//                 type="number"
//                 min={1}
//                 value={win.hours}
//                 onChange={e => onWin({ ...win, hours: Math.max(1, Number(e.target.value) || 1) })}
//                 className="w-14 text-xs text-slate-700 bg-transparent outline-none"
//               />
//               <span className="text-[10px] font-bold text-slate-400">hrs</span>
//             </div>
//           </div>
//         )}

//         {win.mode === 'range' && (
//           <div className="flex items-center gap-2 flex-wrap">
//             <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 h-8">
//               <span className="text-[10px] font-bold text-slate-400">FROM</span>
//               <input
//                 type="date"
//                 value={win.fromDate}
//                 onChange={e => onWin({ ...win, fromDate: e.target.value })}
//                 className="text-xs text-slate-700 bg-transparent outline-none w-28"
//               />
//             </div>
//             <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 h-8">
//               <span className="text-[10px] font-bold text-slate-400">TO</span>
//               <input
//                 type="date"
//                 value={win.toDate}
//                 onChange={e => onWin({ ...win, toDate: e.target.value })}
//                 className="text-xs text-slate-700 bg-transparent outline-none w-28"
//               />
//             </div>
//           </div>
//         )}

//         <span className="ml-auto text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
//           {winLabel(win)}
//         </span>
//       </div>

//       <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
//         <Filter className="w-4 h-4 text-slate-400 shrink-0" />
//         <Select value={filters.clientId ?? 'ALL'} onValueChange={v => set('clientId', v)}>
//           <SelectTrigger className="h-8 w-40 text-xs font-medium border-slate-200">
//             <SelectValue placeholder="All Clients" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="ALL">All Clients</SelectItem>
//             {clients.map(c => (
//               <SelectItem key={c.id} value={c.id}>
//                 {c.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <Select value={filters.serviceLineId ?? 'ALL'} onValueChange={v => set('serviceLineId', v)}>
//           <SelectTrigger className="h-8 w-44 text-xs font-medium border-slate-200">
//             <SelectValue placeholder="All Service Lines" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="ALL">All Service Lines</SelectItem>
//             {sls.map(s => (
//               <SelectItem key={s.id} value={s.id}>
//                 {s.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <button
//           onClick={() => onStandardOnly(!standardOnly)}
//           className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${standardOnly ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
//         >
//           {standardOnly ? (
//             <CheckSquare className="w-3.5 h-3.5" />
//           ) : (
//             <Square className="w-3.5 h-3.5" />
//           )}{' '}
//           Standard stages only
//         </button>

//         {(filters.clientId || filters.serviceLineId) && (
//           <button
//             onClick={() => onChange({})}
//             className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
//           >
//             <X className="w-3 h-3" /> Clear
//           </button>
//         )}
//         {!filters.serviceLineId && (
//           <span className="text-[11px] font-medium text-slate-400 ml-1">
//             Tables split by service line — pick one above to see it flat.
//           </span>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // OVERVIEW
// // ─────────────────────────────────────────────────────────────────────────────

// function OverviewSection({ data, loading }: { data?: OverviewResponse; loading: boolean }) {
//   if (loading)
//     return (
//       <div className="space-y-4">
//         <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
//           {[...Array(6)].map((_, i) => (
//             <Skeleton key={i} className="h-24 rounded-xl" />
//           ))}
//         </div>
//         <Skeleton className="h-56 rounded-xl" />
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//           <Skeleton className="h-64 rounded-xl" />
//           <Skeleton className="h-64 rounded-xl" />
//         </div>
//       </div>
//     );

//   const d = data?.data;
//   if (!d || d.kpis.total === 0) return <Empty msg="No activity in this window." />;

//   const multiLine = d.byServiceLine.length > 1;

//   return (
//     <div className="space-y-5">
//       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
//         <KPI label="Candidates" value={d.kpis.total} color="#4F46E5" />
//         <KPI
//           label="Submitted"
//           value={d.kpis.submitted}
//           color="#2563EB"
//           sub={`${d.kpis.submissionRate}% of sourced`}
//         />
//         <KPI
//           label="Offered"
//           value={d.kpis.offered}
//           color="#D97706"
//           sub={`${d.kpis.offerRate}% of submitted`}
//         />
//         <KPI
//           label="Joined"
//           value={d.kpis.joined}
//           color="#059669"
//           trend="up"
//           sub={`${d.kpis.joinRate}% of offered`}
//         />
//         <KPI label="Active" value={d.kpis.active} color="#0891B2" />
//         <KPI
//           label="Dropped"
//           value={d.kpis.dropped}
//           color="#DC2626"
//           trend={d.kpis.dropped > 0 ? 'down' : undefined}
//         />
//       </div>

//       <Card title={`Candidates Added (${d.timeGranularity === 'hour' ? 'hourly' : 'daily'})`}>
//         <TimeSeriesChart points={d.timeSeries} granularity={d.timeGranularity} />
//       </Card>

//       {multiLine ? (
//         <>
//           <Card title="By Business Unit">
//             <BUBarChart items={d.byBusinessUnit} />
//           </Card>

//           <div>
//             <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider mb-3">
//               Service Line Funnels
//             </h3>
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//               {d.byServiceLine.map(line => (
//                 <Card key={line.serviceLineId ?? 'none'} title={line.name}>
//                   <div className="flex flex-wrap gap-5 mb-4">
//                     <MiniStat l="Total" v={line.total} />
//                     <MiniStat l="Submitted" v={line.submitted} c="text-blue-700" />
//                     <MiniStat l="Offered" v={line.offered} c="text-amber-700" />
//                     <MiniStat l="Joined" v={line.joined} c="text-emerald-700" />
//                   </div>
//                   <FunnelChart items={line.funnel.map(f => ({ label: f.label, count: f.count }))} />
//                 </Card>
//               ))}
//             </div>
//           </div>
//         </>
//       ) : (
//         <Card title="Stage Funnel">
//           <FunnelChart items={d.funnel.map(f => ({ label: f.label, count: f.count }))} />
//         </Card>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//         <Card title="Disposition Split">
//           <DispositionBars counts={d.dispositionCounts} />
//         </Card>
//         <Card title="Top Recruiters">
//           <Leaderboard items={d.leaderboard} />
//         </Card>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // SELECTION
// // ─────────────────────────────────────────────────────────────────────────────

// function useSelection() {
//   const [selected, setSelected] = useState<Set<string>>(new Set());
//   const toggle = (id: string) =>
//     setSelected(p => {
//       const n = new Set(p);
//       n.has(id) ? n.delete(id) : n.add(id);
//       return n;
//     });
//   const toggleAll = (ids: string[]) =>
//     setSelected(p => (p.size === ids.length ? new Set() : new Set(ids)));
//   return { selected, toggle, toggleAll };
// }

// function SelectHeader({
//   allIds,
//   selected,
//   toggleAll,
// }: {
//   allIds: string[];
//   selected: Set<string>;
//   toggleAll: (ids: string[]) => void;
// }) {
//   const all = allIds.length > 0 && selected.size === allIds.length;
//   return (
//     <button
//       onClick={() => toggleAll(allIds)}
//       className="text-slate-400 hover:text-indigo-500 transition-colors"
//     >
//       {all ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
//     </button>
//   );
// }

// function SelectCell({
//   id,
//   selected,
//   toggle,
// }: {
//   id: string;
//   selected: Set<string>;
//   toggle: (id: string) => void;
// }) {
//   return (
//     <button
//       onClick={() => toggle(id)}
//       className="text-slate-300 hover:text-indigo-500 transition-colors"
//     >
//       {selected.has(id) ? (
//         <CheckSquare className="w-4 h-4 text-indigo-500" />
//       ) : (
//         <Square className="w-4 h-4" />
//       )}
//     </button>
//   );
// }

// function GroupHeader({
//   title,
//   count,
//   countLabel,
//   selectedCount,
//   onSelected,
//   onAll,
// }: {
//   title: string | null;
//   count: number;
//   countLabel: string;
//   selectedCount: number;
//   onSelected: () => void;
//   onAll: () => void;
// }) {
//   return (
//     <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex-wrap">
//       {title ? (
//         <LinePill name={title} />
//       ) : (
//         <span className="text-sm font-bold text-slate-700">All</span>
//       )}
//       <span className="text-[12px] font-semibold text-slate-500">
//         {count} {countLabel}
//       </span>
//       <div className="ml-auto flex items-center gap-2">
//         {selectedCount > 0 && (
//           <button
//             onClick={onSelected}
//             className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
//           >
//             <Download className="w-3.5 h-3.5" /> Download Selected ({selectedCount})
//           </button>
//         )}
//         <button
//           onClick={onAll}
//           className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
//         >
//           <Download className="w-3.5 h-3.5" /> Download {title ? 'Line' : 'All'}
//         </button>
//       </div>
//     </div>
//   );
// }

// function StageCell({ count, base, color }: { count: number; base: number; color: string }) {
//   const pct = base > 0 ? Math.round((count / base) * 100) : 0;
//   if (count <= 0) return <span className="text-slate-200 text-xs">—</span>;
//   return (
//     <div className="flex flex-col items-center gap-0.5">
//       <span className="text-[14px] font-black" style={{ color }}>
//         {count}
//       </span>
//       <span className="text-[10px] font-semibold text-slate-400">{pct}%</span>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // RECRUITER TABLE (one per service line group)
// // ─────────────────────────────────────────────────────────────────────────────

// function RecruiterTable({
//   title,
//   serviceLineId,
//   data,
//   stages,
//   onDownloadAll,
//   onDownloadSelected,
// }: {
//   title: string | null;
//   serviceLineId?: string;
//   data: RecruiterStat[];
//   stages: StageMeta[];
//   onDownloadAll: (slId?: string) => void;
//   onDownloadSelected: (ids: string[], slId?: string) => void;
// }) {
//   const { selected, toggle, toggleAll } = useSelection();
//   const [expanded, setExpanded] = useState<Set<string>>(new Set());
//   const toggleExp = (id: string) =>
//     setExpanded(p => {
//       const n = new Set(p);
//       n.has(id) ? n.delete(id) : n.add(id);
//       return n;
//     });
//   const allIds = data.map(r => r.id);
//   const TH = 'text-[11px] font-bold text-slate-500 uppercase tracking-widest';

//   return (
//     <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
//       <GroupHeader
//         title={title}
//         count={data.length}
//         countLabel="recruiters"
//         selectedCount={selected.size}
//         onSelected={() => onDownloadSelected([...selected], serviceLineId)}
//         onAll={() => onDownloadAll(serviceLineId)}
//       />
//       <div className="overflow-x-auto">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-100 bg-slate-50">
//               <th {...frozen('select', { bg: 'bg-slate-50', extra: 'px-3 py-3' })}>
//                 <SelectHeader allIds={allIds} selected={selected} toggleAll={toggleAll} />
//               </th>
//               <th {...frozen('expand', { bg: 'bg-slate-50', extra: 'px-1 py-3' })} />
//               <th {...frozen('sr', { bg: 'bg-slate-50', extra: `px-2 py-3 text-center ${TH}` })}>
//                 Sr
//               </th>
//               <th {...frozen('name', { bg: 'bg-slate-50', extra: `px-4 py-3 text-left ${TH}` })}>
//                 Recruiter
//               </th>
//               <th className={`px-3 py-3 text-center ${TH}`}>Jobs</th>
//               <th className={`px-3 py-3 text-center ${TH}`}>Sourced</th>
//               {stages.map((s, i) => (
//                 <th
//                   key={s.id}
//                   className={`px-2 py-3 text-center whitespace-nowrap max-w-[90px] ${TH}`}
//                   title={
//                     s.serviceLine ? `${s.label} · ${s.serviceLine.name}` : `${s.label} · Common`
//                   }
//                 >
//                   <div className="flex flex-col items-center gap-0.5">
//                     <div
//                       className="w-1.5 h-1.5 rounded-full"
//                       style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
//                     />
//                     <span className="block truncate max-w-[80px]">{s.label}</span>
//                   </div>
//                 </th>
//               ))}
//               <th className={`px-3 py-3 text-center ${TH}`}>Active</th>
//               <th className={`px-3 py-3 text-center ${TH}`}>Avg Days</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-50">
//             {data.map((r, idx) => {
//               const isExp = expanded.has(r.id);
//               const bg = isExp ? 'bg-indigo-50' : undefined;
//               return (
//                 <Fragment key={r.id}>
//                   <tr
//                     className={`group transition-colors ${isExp ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
//                   >
//                     <td {...frozen('select', { bg, extra: 'px-3 py-3' })}>
//                       <SelectCell id={r.id} selected={selected} toggle={toggle} />
//                     </td>
//                     <td {...frozen('expand', { bg, extra: 'px-1 py-3' })}>
//                       <button
//                         onClick={() => toggleExp(r.id)}
//                         className="text-slate-300 hover:text-indigo-500 transition-colors"
//                       >
//                         {isExp ? (
//                           <ChevronDown className="w-4 h-4" />
//                         ) : (
//                           <ChevronRight className="w-4 h-4" />
//                         )}
//                       </button>
//                     </td>
//                     <td
//                       {...frozen('sr', {
//                         bg,
//                         extra: 'px-2 py-3 text-center text-[12px] font-bold text-slate-400',
//                       })}
//                     >
//                       {idx + 1}
//                     </td>
//                     <td {...frozen('name', { bg, extra: 'px-4 py-3 overflow-hidden' })}>
//                       <div className="font-bold text-slate-900 text-[13px] truncate">{r.name}</div>
//                       <div className="text-[11px] text-slate-400 truncate">{r.email}</div>
//                     </td>
//                     <td className="px-3 py-3 text-center text-[12px] font-semibold text-slate-600">
//                       {r.requirementBreakdown.length}
//                     </td>
//                     <td className="px-3 py-3 text-center">
//                       <span className="text-[15px] font-black text-slate-900">{r.sourced}</span>
//                     </td>
//                     {stages.map((s, i) => (
//                       <td key={s.id} className="px-2 py-3 text-center">
//                         <StageCell
//                           count={r.stageCounts[s.id] ?? 0}
//                           base={r.sourced}
//                           color={FUNNEL_COLORS[i % FUNNEL_COLORS.length]}
//                         />
//                       </td>
//                     ))}
//                     <td className="px-3 py-3 text-center">
//                       <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
//                         {r.active}
//                       </span>
//                     </td>
//                     <td className="px-3 py-3 text-center text-[12px] font-medium text-slate-500">
//                       {r.avgTimeToSubmitDays != null ? `${r.avgTimeToSubmitDays}d` : '—'}
//                     </td>
//                   </tr>

//                   {isExp && (
//                     <tr className="bg-slate-50/40">
//                       <td colSpan={100} className="px-5 py-4">
//                         {r.requirementBreakdown.length > 0 ? (
//                           <div className="space-y-1.5">
//                             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
//                               Per Requirement
//                             </p>
//                             {r.requirementBreakdown.map((rqi, ri) => (
//                               <div
//                                 key={rqi.requirementId}
//                                 className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
//                               >
//                                 <div className="flex items-center gap-3 flex-wrap">
//                                   <span className="text-[11px] font-bold text-slate-300 w-4">
//                                     {ri + 1}
//                                   </span>
//                                   <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
//                                     {rqi.reqCode}
//                                   </span>
//                                   <span className="text-[12px] font-semibold text-slate-800 truncate flex-1 min-w-[120px]">
//                                     {rqi.title}
//                                   </span>
//                                   <span
//                                     className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[rqi.status] ?? 'bg-slate-100 text-slate-500'}`}
//                                   >
//                                     {rqi.status.replace(/_/g, ' ')}
//                                   </span>
//                                   {rqi.client && (
//                                     <span className="text-[11px] text-slate-400">
//                                       {rqi.client.name}
//                                     </span>
//                                   )}
//                                 </div>
//                                 <div className="flex flex-wrap gap-4 mt-2.5 pt-2.5 border-t border-slate-100">
//                                   <MiniStat l="Sourced" v={rqi.sourced} />
//                                   <MiniStat l="Submitted" v={rqi.submitted} c="text-blue-700" />
//                                   <MiniStat l="Offered" v={rqi.offered} c="text-amber-700" />
//                                   <MiniStat l="Joined" v={rqi.joined} c="text-emerald-700" />
//                                   <MiniStat l="Dropped" v={rqi.dropped} c="text-red-500" />
//                                   <MiniStat l="Active" v={rqi.active} c="text-indigo-700" />
//                                 </div>
//                                 {stages.filter(s => (rqi.stageCounts[s.id] ?? 0) > 0).length >
//                                   0 && (
//                                   <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
//                                     {stages
//                                       .filter(s => (rqi.stageCounts[s.id] ?? 0) > 0)
//                                       .map(s => (
//                                         <span
//                                           key={s.id}
//                                           className="text-[11px] font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full"
//                                         >
//                                           {s.label}: {rqi.stageCounts[s.id]}
//                                         </span>
//                                       ))}
//                                   </div>
//                                 )}
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <p className="text-xs text-slate-400">No requirement data.</p>
//                         )}
//                       </td>
//                     </tr>
//                   )}
//                 </Fragment>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // SERVICE LINE TABS  (switch one line at a time — never mixed)
// // ─────────────────────────────────────────────────────────────────────────────

// const keyOf = (g: { serviceLine: ServiceLineRef | null }) => g.serviceLine?.id ?? '__none__';
// const nameOf = (g: { serviceLine: ServiceLineRef | null }) => g.serviceLine?.name ?? 'Unassigned';

// function LineTabs({
//   groups,
//   activeKey,
//   onSelect,
// }: {
//   groups: { serviceLine: ServiceLineRef | null; total: number }[];
//   activeKey: string;
//   onSelect: (k: string) => void;
// }) {
//   return (
//     <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
//       {groups.map(g => {
//         const k = keyOf(g);
//         const active = k === activeKey;
//         return (
//           <button
//             key={k}
//             onClick={() => onSelect(k)}
//             className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
//           >
//             <Layers className={`w-3.5 h-3.5 ${active ? 'text-indigo-500' : 'text-slate-300'}`} />
//             {nameOf(g)}
//             <span
//               className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}
//             >
//               {g.total}
//             </span>
//           </button>
//         );
//       })}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // RECRUITER SECTION — service-line tab bar, one line at a time
// // ─────────────────────────────────────────────────────────────────────────────

// function RecruiterSection({
//   resp,
//   loading,
//   reqFilter,
//   onReqFilter,
//   onDownloadAll,
//   onDownloadSelected,
// }: {
//   resp?: RecruiterResponse;
//   loading: boolean;
//   reqFilter: string;
//   onReqFilter: (v: string) => void;
//   onDownloadAll: (slId?: string) => void;
//   onDownloadSelected: (ids: string[], slId?: string) => void;
// }) {
//   const [activeKey, setActiveKey] = useState<string>('');

//   if (loading)
//     return (
//       <div className="space-y-4">
//         <div className="grid grid-cols-5 gap-3">
//           {[...Array(5)].map((_, i) => (
//             <Skeleton key={i} className="h-24 rounded-xl" />
//           ))}
//         </div>
//         <Skel rows={6} />
//       </div>
//     );

//   const groups: RecruiterGroup[] = resp?.groups ?? [];
//   if (!groups.length) return <Empty msg="No recruiter data for this window." />;

//   // active group falls back to the first tab if current selection is gone
//   const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];

//   const rows = active.data;
//   const reqOptions = (() => {
//     const m = new Map<string, string>();
//     for (const r of rows)
//       for (const rq of r.requirementBreakdown)
//         m.set(rq.requirementId, `${rq.reqCode} · ${rq.title}`);
//     return [...m.entries()].map(([id, label]) => ({ id, label }));
//   })();

//   const totals = {
//     sourced: rows.reduce((s, r) => s + r.sourced, 0),
//     joined: rows.reduce((s, r) => s + r.joined, 0),
//     active: rows.reduce((s, r) => s + r.active, 0),
//     dropped: rows.reduce((s, r) => s + r.dropped, 0),
//     recruiters: new Set(rows.map(r => r.id)).size,
//   };

//   return (
//     <div className="space-y-5">
//       <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />

//       <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
//         <KPI label="Recruiters" value={totals.recruiters} color="#4F46E5" />
//         <KPI label="Sourced" value={totals.sourced} color="#0891B2" />
//         <KPI label="Active" value={totals.active} color="#059669" />
//         <KPI
//           label="Joined"
//           value={totals.joined}
//           color="#7C3AED"
//           trend="up"
//           sub={
//             totals.sourced > 0
//               ? `${((totals.joined / totals.sourced) * 100).toFixed(1)}%`
//               : undefined
//           }
//         />
//         <KPI
//           label="Dropped"
//           value={totals.dropped}
//           color="#DC2626"
//           trend={totals.dropped > 0 ? 'down' : undefined}
//         />
//       </div>

//       <div className="flex items-center gap-2 flex-wrap">
//         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
//           Within Requirement
//         </span>
//         <Select value={reqFilter || 'ALL'} onValueChange={v => onReqFilter(v === 'ALL' ? '' : v)}>
//           <SelectTrigger className="h-8 w-72 text-xs font-medium border-slate-200">
//             <SelectValue placeholder="All requirements" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="ALL">All requirements</SelectItem>
//             {reqOptions.map(o => (
//               <SelectItem key={o.id} value={o.id}>
//                 {o.label}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//         {reqFilter && (
//           <button
//             onClick={() => onReqFilter('')}
//             className="flex items-center gap-1 h-8 px-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg"
//           >
//             <X className="w-3 h-3" /> Clear
//           </button>
//         )}
//       </div>

//       <RecruiterTable
//         key={keyOf(active)}
//         title={active.serviceLine?.name ?? null}
//         serviceLineId={active.serviceLine?.id}
//         data={active.data}
//         stages={active.stages}
//         onDownloadAll={onDownloadAll}
//         onDownloadSelected={onDownloadSelected}
//       />
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // REQUIREMENT TABLE (one per service line group)
// // ─────────────────────────────────────────────────────────────────────────────

// function RequirementTable({
//   title,
//   serviceLineId,
//   data,
//   stages,
//   onDownloadAll,
//   onDownloadSelected,
//   onDownloadRow,
// }: {
//   title: string | null;
//   serviceLineId?: string;
//   data: RequirementRow[];
//   stages: StageMeta[];
//   onDownloadAll: (slId?: string) => void;
//   onDownloadSelected: (ids: string[], slId?: string) => void;
//   onDownloadRow: (id: string, reqCode: string) => void;
// }) {
//   const { selected, toggle, toggleAll } = useSelection();
//   const [expanded, setExpanded] = useState<Set<string>>(new Set());
//   const toggleExp = (id: string) =>
//     setExpanded(p => {
//       const n = new Set(p);
//       n.has(id) ? n.delete(id) : n.add(id);
//       return n;
//     });
//   const allIds = data.map(r => r.id);
//   const TH = 'text-[11px] font-bold text-slate-500 uppercase tracking-widest';

//   return (
//     <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
//       <GroupHeader
//         title={title}
//         count={data.length}
//         countLabel="requirements"
//         selectedCount={selected.size}
//         onSelected={() => onDownloadSelected([...selected], serviceLineId)}
//         onAll={() => onDownloadAll(serviceLineId)}
//       />
//       <div className="overflow-x-auto">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-100 bg-slate-50">
//               <th {...frozen('select', { bg: 'bg-slate-50', extra: 'px-3 py-3' })}>
//                 <SelectHeader allIds={allIds} selected={selected} toggleAll={toggleAll} />
//               </th>
//               <th {...frozen('expand', { bg: 'bg-slate-50', extra: 'px-1 py-3' })} />
//               <th {...frozen('sr', { bg: 'bg-slate-50', extra: `px-2 py-3 text-center ${TH}` })}>
//                 Sr
//               </th>
//               <th {...frozen('name', { bg: 'bg-slate-50', extra: `px-4 py-3 text-left ${TH}` })}>
//                 Requirement
//               </th>
//               <th className={`px-3 py-3 text-center ${TH}`}>Status</th>
//               <th className={`px-3 py-3 text-center ${TH}`}>Openings</th>
//               <th className={`px-3 py-3 text-center ${TH}`}>Total</th>
//               {stages.map((s, i) => (
//                 <th
//                   key={s.id}
//                   className={`px-2 py-3 text-center whitespace-nowrap max-w-[90px] ${TH}`}
//                   title={
//                     s.serviceLine ? `${s.label} · ${s.serviceLine.name}` : `${s.label} · Common`
//                   }
//                 >
//                   <div className="flex flex-col items-center gap-0.5">
//                     <div
//                       className="w-1.5 h-1.5 rounded-full"
//                       style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
//                     />
//                     <span className="block truncate max-w-[80px]">{s.label}</span>
//                   </div>
//                 </th>
//               ))}
//               <th className={`px-3 py-3 text-center ${TH}`}>Created</th>
//               <th className={`px-3 py-3 ${TH}`} />
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-50">
//             {data.map((r, idx) => {
//               const isExp = expanded.has(r.id);
//               const bg = isExp ? 'bg-indigo-50' : undefined;
//               return (
//                 <Fragment key={r.id}>
//                   <tr
//                     className={`group transition-colors ${isExp ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
//                   >
//                     <td
//                       {...frozen('select', {
//                         bg,
//                         extra: `px-3 py-3 ${r.isRespondByBreached ? 'border-l-2 border-l-red-400' : ''}`,
//                       })}
//                     >
//                       <SelectCell id={r.id} selected={selected} toggle={toggle} />
//                     </td>
//                     <td {...frozen('expand', { bg, extra: 'px-1 py-3' })}>
//                       <button
//                         onClick={() => toggleExp(r.id)}
//                         className="text-slate-300 hover:text-indigo-500 transition-colors"
//                       >
//                         {isExp ? (
//                           <ChevronDown className="w-4 h-4" />
//                         ) : (
//                           <ChevronRight className="w-4 h-4" />
//                         )}
//                       </button>
//                     </td>
//                     <td
//                       {...frozen('sr', {
//                         bg,
//                         extra: 'px-2 py-3 text-center text-[12px] font-bold text-slate-400',
//                       })}
//                     >
//                       {idx + 1}
//                     </td>
//                     <td {...frozen('name', { bg, extra: 'px-4 py-3 overflow-hidden' })}>
//                       <div className="font-bold text-slate-900 text-[13px] leading-tight truncate">
//                         {r.title}
//                       </div>
//                       <div className="flex items-center gap-2 mt-0.5 flex-wrap">
//                         <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
//                           {r.reqCode}
//                         </span>
//                         {r.client && (
//                           <span className="text-[11px] text-slate-400 truncate">
//                             {r.client.name}
//                           </span>
//                         )}
//                       </div>
//                     </td>
//                     <td className="px-3 py-3 text-center">
//                       <span
//                         className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-500'}`}
//                       >
//                         {r.status.replace(/_/g, ' ')}
//                       </span>
//                     </td>
//                     <td className="px-3 py-3 text-center text-[13px] font-bold text-slate-700">
//                       {r.totalOpenings}
//                     </td>
//                     <td className="px-3 py-3 text-center">
//                       <span className="text-[14px] font-black text-slate-900">
//                         {r.totalCandidates}
//                       </span>
//                     </td>
//                     {stages.map((s, i) => (
//                       <td key={s.id} className="px-2 py-3 text-center">
//                         <StageCell
//                           count={r.stageCounts[s.id] ?? 0}
//                           base={r.totalCandidates}
//                           color={FUNNEL_COLORS[i % FUNNEL_COLORS.length]}
//                         />
//                       </td>
//                     ))}
//                     <td className="px-3 py-3 text-center text-[11px] text-slate-400 font-medium whitespace-nowrap">
//                       {fmtDate(r.createdAt)}
//                     </td>
//                     <td className="px-3 py-3">
//                       <button
//                         onClick={() => onDownloadRow(r.id, r.reqCode)}
//                         className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap"
//                       >
//                         <FileDown className="w-3 h-3" /> Excel
//                       </button>
//                     </td>
//                   </tr>

//                   {isExp && (
//                     <tr className="bg-slate-50/40">
//                       <td colSpan={100} className="px-5 py-3">
//                         {/* …unchanged detail block… */}
//                       </td>
//                     </tr>
//                   )}
//                 </Fragment>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // REQUIREMENT SECTION (grouped / flat wrapper)
// // ─────────────────────────────────────────────────────────────────────────────

// function RequirementSection({
//   resp,
//   loading,
//   onDownloadRow,
//   onDownloadAll,
//   onDownloadSelected,
// }: {
//   resp?: RequirementReportResponse;
//   loading: boolean;
//   onDownloadRow: (id: string, reqCode: string) => void;
//   onDownloadAll: (slId?: string) => void;
//   onDownloadSelected: (ids: string[], slId?: string) => void;
// }) {
//   const [activeKey, setActiveKey] = useState<string>('');

//   if (loading) return <Skel rows={6} />;

//   const groups: RequirementGroup[] = resp?.groups ?? [];
//   if (!groups.length) return <Empty msg="No requirements found for this window." />;

//   const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];

//   return (
//     <div className="space-y-5">
//       <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />
//       <RequirementTable
//         key={keyOf(active)}
//         title={active.serviceLine?.name ?? null}
//         serviceLineId={active.serviceLine?.id}
//         data={active.data}
//         stages={active.stages}
//         onDownloadAll={onDownloadAll}
//         onDownloadSelected={onDownloadSelected}
//         onDownloadRow={onDownloadRow}
//       />
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // MAIN PAGE
// // ─────────────────────────────────────────────────────────────────────────────

// type TabKey = 'overview' | 'recruiters' | 'requirements';

// export default function ReportsPage() {
//   const axios = useAxios();
//   const { user } = useAuth();
//   const { canView } = usePermission('reports');
//   const hasAccess = user?.isSuperAdmin || canView;

//   const [activeTab, setActiveTab] = useState<TabKey>('overview');
//   const [filters, setFilters] = useState<Filters>({});
//   const [win, setWin] = useState<WinState>(DEFAULT_WIN);
//   const [standardOnly, setStandardOnly] = useState(false);
//   const [recReqFilter, setRecReqFilter] = useState('');
//   const [downloading, setDownloading] = useState<string | null>(null);

//   const baseParams = useMemo(() => {
//     const p = new URLSearchParams();
//     Object.entries(winToParams(win)).forEach(([k, v]) => p.set(k, v));
//     if (filters.clientId) p.set('clientId', filters.clientId);
//     if (filters.serviceLineId) p.set('serviceLineId', filters.serviceLineId);
//     if (standardOnly) p.set('standardOnly', 'true');
//     return p;
//   }, [win, filters, standardOnly]);

//   const baseQs = baseParams.toString();

//   const recParams = useMemo(() => {
//     const p = new URLSearchParams(baseQs);
//     if (recReqFilter) p.set('requirementId', recReqFilter);
//     return p.toString();
//   }, [baseQs, recReqFilter]);

//   const overviewQuery = useQuery({
//     queryKey: ['report-overview', baseQs],
//     queryFn: async () => (await axios.get(`/reports/overview?${baseQs}`)).data as OverviewResponse,
//     enabled: hasAccess && activeTab === 'overview',
//     staleTime: 60000,
//   });

//   const recruiterQuery = useQuery({
//     queryKey: ['report-recruiters', recParams],
//     queryFn: async () =>
//       (await axios.get(`/reports/recruiters?${recParams}`)).data as RecruiterResponse,
//     enabled: hasAccess && activeTab === 'recruiters',
//     staleTime: 60000,
//   });

//   const requirementQuery = useQuery({
//     queryKey: ['report-requirements', baseQs],
//     queryFn: async () =>
//       (await axios.get(`/reports/requirements?${baseQs}`)).data as RequirementReportResponse,
//     enabled: hasAccess && activeTab === 'requirements',
//     staleTime: 60000,
//   });

//   const download = useCallback(
//     async (url: string, filename: string, key: string) => {
//       if (downloading) return;
//       setDownloading(key);
//       try {
//         const res = await axios.get(url, { responseType: 'blob' });
//         downloadBlob(res.data, filename);
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setDownloading(null);
//       }
//     },
//     [axios, downloading]
//   );

//   const dateStr = new Date().toISOString().split('T')[0];

//   const handleRecruiterAll = useCallback(
//     (slId?: string) => {
//       const p = new URLSearchParams(recParams);
//       if (slId) p.set('serviceLineId', slId);
//       download(
//         `/reports/recruiters/export?${p.toString()}`,
//         `recruiter-report-${slId ? 'line' : 'all'}-${dateStr}.xlsx`,
//         'rec-all'
//       );
//     },
//     [recParams, download, dateStr]
//   );

//   const handleRecruiterSelected = useCallback(
//     (ids: string[], slId?: string) => {
//       const p = new URLSearchParams(recParams);
//       if (slId) p.set('serviceLineId', slId);
//       p.set('ids', ids.join(','));
//       download(
//         `/reports/recruiters/export?${p.toString()}`,
//         `recruiter-report-selected-${dateStr}.xlsx`,
//         'rec-sel'
//       );
//     },
//     [recParams, download, dateStr]
//   );

//   const handleRequirementAll = useCallback(
//     (slId?: string) => {
//       const p = new URLSearchParams(baseQs);
//       if (slId) p.set('serviceLineId', slId);
//       download(
//         `/reports/requirements/export?${p.toString()}`,
//         `requirements-${slId ? 'line' : 'all'}-${dateStr}.xlsx`,
//         'req-all'
//       );
//     },
//     [baseQs, download, dateStr]
//   );

//   const handleRequirementSelected = useCallback(
//     (ids: string[], slId?: string) => {
//       const p = new URLSearchParams(baseQs);
//       if (slId) p.set('serviceLineId', slId);
//       p.set('ids', ids.join(','));
//       download(
//         `/reports/requirements/export?${p.toString()}`,
//         `requirements-selected-${dateStr}.xlsx`,
//         'req-sel'
//       );
//     },
//     [baseQs, download, dateStr]
//   );

//   const handleRequirementRow = useCallback(
//     (id: string, reqCode: string) => {
//       download(
//         `/reports/requirements/${id}/export`,
//         `requirement-${reqCode}-${dateStr}.xlsx`,
//         `req-${id}`
//       );
//     },
//     [download, dateStr]
//   );

//   if (!hasAccess)
//     return (
//       <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
//         <AlertCircle className="w-10 h-10 opacity-30" />
//         <p className="text-sm font-medium">You don't have access to reports.</p>
//       </div>
//     );

//   return (
//     <div className="flex flex-col gap-6 p-6 bg-slate-50 min-h-screen">
//       <div className="flex items-start justify-between gap-4 flex-wrap">
//         <div>
//           <div className="flex items-center gap-2 mb-1">
//             <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
//               <BarChart2 className="w-4 h-4 text-white" />
//             </div>
//             <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reports</h1>
//           </div>
//           <p className="text-sm text-slate-500 font-medium">
//             Live monitoring · Recruiter performance · Requirement analytics
//           </p>
//         </div>
//         {downloading && (
//           <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
//             <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Preparing download…
//           </div>
//         )}
//       </div>

//       <FiltersBar
//         filters={filters}
//         onChange={setFilters}
//         win={win}
//         onWin={setWin}
//         standardOnly={standardOnly}
//         onStandardOnly={setStandardOnly}
//       />

//       <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)}>
//         <TabsList className="h-10 bg-white border border-slate-200 rounded-xl shadow-sm p-1 gap-0.5">
//           <TabsTrigger
//             value="overview"
//             className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
//           >
//             <LayoutDashboard className="w-3.5 h-3.5" /> Overview
//           </TabsTrigger>
//           <TabsTrigger
//             value="recruiters"
//             className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
//           >
//             <Users className="w-3.5 h-3.5" /> Recruiters
//           </TabsTrigger>
//           <TabsTrigger
//             value="requirements"
//             className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
//           >
//             <FileText className="w-3.5 h-3.5" /> Requirements
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="overview" className="mt-5">
//           <OverviewSection data={overviewQuery.data} loading={overviewQuery.isLoading} />
//         </TabsContent>

//         <TabsContent value="recruiters" className="mt-5">
//           <RecruiterSection
//             resp={recruiterQuery.data}
//             loading={recruiterQuery.isLoading}
//             reqFilter={recReqFilter}
//             onReqFilter={setRecReqFilter}
//             onDownloadAll={handleRecruiterAll}
//             onDownloadSelected={handleRecruiterSelected}
//           />
//         </TabsContent>

//         <TabsContent value="requirements" className="mt-5">
//           <RequirementSection
//             resp={requirementQuery.data}
//             loading={requirementQuery.isLoading}
//             onDownloadRow={handleRequirementRow}
//             onDownloadAll={handleRequirementAll}
//             onDownloadSelected={handleRequirementSelected}
//           />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: page.tsx
// Path: src/app/(dashboard)/reports/page.tsx

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart2,
  CheckSquare,
  Clock,
  FileText,
  Filter,
  LayoutDashboard,
  Layers,
  RefreshCw,
  Square,
  Users,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';

// ── shared report modules ────────────────────────────────────────────────────
import type {
  OverviewResponse,
  RecruiterGroup,
  RecruiterResponse,
  RequirementGroup,
  RequirementReportResponse,
  ServiceLineRef,
} from '@/components/reports/types';
import {
  Card,
  Empty,
  FUNNEL_COLORS,
  KPI,
  MiniStat,
  Skel,
  humanKey,
} from '@/components/reports/reportUi';
import { RecruiterTable } from '@/components/reports/RecruiterTable';
import { RequirementTable } from '@/components/reports/RequirementTable';

// ─────────────────────────────────────────────────────────────────────────────
// DATE / TIME WINDOW STATE
// ─────────────────────────────────────────────────────────────────────────────

type WindowMode = 'preset' | 'hours' | 'range';

interface WinState {
  mode: WindowMode;
  range: 'All time' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth';
  hours: number;
  fromDate: string;
  toDate: string;
}

const DEFAULT_WIN: WinState = {
  mode: 'preset',
  range: 'All time',
  hours: 8,
  fromDate: '',
  toDate: '',
};

const PRESETS: { k: WinState['range']; l: string }[] = [
  { k: 'All time', l: 'All time' },
  { k: 'today', l: 'Today' },
  { k: 'yesterday', l: 'Yesterday' },
  { k: 'last7', l: 'Last 7 days' },
  { k: 'last30', l: 'Last 30 days' },
  { k: 'thisMonth', l: 'This month' },
];

const HOUR_OPTS = [8, 12, 24, 48, 72];

function winToParams(w: WinState): Record<string, string> {
  if (w.mode === 'hours') return { hours: String(w.hours) };
  if (w.mode === 'range') {
    const p: Record<string, string> = {};
    if (w.fromDate) p.fromDate = w.fromDate;
    if (w.toDate) p.toDate = w.toDate;
    return p;
  }
  // return { range: w.range };
  // preset mode — only send if a preset is actually selected
  if (w.range) return { range: w.range };
  return {}; // ← no filter when nothing is selected
}

function winLabel(w: WinState): string {
  if (w.mode === 'hours') return `Last ${w.hours} hours`;
  if (w.mode === 'range') {
    if (!w.fromDate && !w.toDate) return 'All time';
    return `${w.fromDate || 'start'} to ${w.toDate || 'now'}`;
  }
  return PRESETS.find(p => p.k === w.range)?.l ?? 'All time';
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD util
// ─────────────────────────────────────────────────────────────────────────────

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARTS (dependency-free)
// ─────────────────────────────────────────────────────────────────────────────

function FunnelChart({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map(i => i.count));
  if (!items.length) return <Empty msg="No stage data." />;
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const pct = Math.round((it.count / max) * 100);
        const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        return (
          <div key={it.label + i} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-right text-[12px] font-semibold text-slate-600">
              {it.label}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
              <div
                className="flex h-full items-center justify-end rounded-md px-2 transition-all duration-500"
                style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }}
              >
                <span className="text-[11px] font-black text-white">{it.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeSeriesChart({
  points,
  granularity,
}: {
  points: { bucket: string; count: number }[];
  granularity: 'hour' | 'day';
}) {
  if (points.length < 2)
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        Not enough data points to plot.
      </div>
    );
  const W = 640;
  const H = 160;
  const pad = 24;
  const max = Math.max(1, ...points.map(p => p.count));
  const stepX = (W - pad * 2) / (points.length - 1);
  const xy = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = H - pad - (p.count / max) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = `${line} L${xy[xy.length - 1][0]},${H - pad} L${xy[0][0]},${H - pad} Z`;
  const fmtBucket = (b: string) =>
    granularity === 'hour' ? format(new Date(b), 'dd MMM HH:mm') : format(new Date(b), 'dd MMM');
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full min-w-130">
        <defs>
          <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#tsGrad)" />
        <path d={line} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinejoin="round" />
        {xy.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#4F46E5" />
            <title>
              {fmtBucket(points[i].bucket)}: {points[i].count}
            </title>
          </g>
        ))}
        {points.map((p, i) =>
          i % Math.ceil(points.length / 8) === 0 ? (
            <text
              key={`t-${i}`}
              x={pad + i * stepX}
              y={H + 14}
              fontSize="9"
              fill="#94a3b8"
              textAnchor="middle"
            >
              {fmtBucket(p.bucket)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

function DispositionBars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <Empty msg="No disposition data." />;
  return (
    <div className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {entries.map(([k, v], i) => (
          <div
            key={k}
            style={{
              width: `${(v / total) * 100}%`,
              backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
            }}
            title={`${humanKey(k)}: ${v}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([k, v], i) => (
          <div key={k} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
            />
            <span className="text-[12px] font-semibold text-slate-600">{humanKey(k)}</span>
            <span className="text-[12px] font-black text-slate-900">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Leaderboard({
  items,
}: {
  items: { id: string; name: string; sourced: number; joined: number }[];
}) {
  const max = Math.max(1, ...items.map(i => i.sourced));
  if (!items.length) return <Empty msg="No recruiter activity." />;
  return (
    <div className="space-y-2.5">
      {items.map((r, i) => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="w-4 text-[11px] font-black text-slate-300">{i + 1}</span>
          <span className="w-36 shrink-0 truncate text-[12px] font-semibold text-slate-700">
            {r.name}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded bg-indigo-500 transition-all"
              style={{ width: `${Math.max((r.sourced / max) * 100, 4)}%` }}
            />
          </div>
          <span className="w-8 text-right text-[12px] font-black text-slate-900">{r.sourced}</span>
          {r.joined > 0 && (
            <span className="w-16 text-right text-[11px] font-bold text-emerald-600">
              {r.joined} joined
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function BUBarChart({
  items,
}: {
  items: { businessUnitId: string | null; name: string; total: number; joined: number }[];
}) {
  const max = Math.max(1, ...items.map(i => i.total));
  if (!items.length) return <Empty msg="No business unit data." />;
  return (
    <div className="space-y-3">
      {items.map((b, i) => (
        <div key={b.businessUnitId ?? `bu-${i}`}>
          <div className="mb-1 flex justify-between text-[12px]">
            <span className="font-semibold text-slate-700">{b.name}</span>
            <span className="text-slate-400">
              {b.total} total ·{' '}
              <span className="font-bold text-emerald-600">{b.joined} joined</span>
            </span>
          </div>
          <div className="relative h-5 overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded bg-indigo-500"
              style={{ width: `${(b.total / max) * 100}%` }}
            />
            <div
              className="absolute left-0 top-0 h-full rounded bg-emerald-500"
              style={{ width: `${(b.joined / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};
const ALL_REPORT_STATUSES = [
  { key: 'ACTIVE', label: 'Active', dot: 'bg-emerald-500' },
  { key: 'DRAFT', label: 'Draft', dot: 'bg-slate-400' },
  { key: 'PENDING_APPROVAL', label: 'Pending', dot: 'bg-amber-500' },
  { key: 'ON_HOLD', label: 'On Hold', dot: 'bg-orange-500' },
  { key: 'CLOSED', label: 'Closed', dot: 'bg-red-500' },
  { key: 'CANCELLED', label: 'Cancelled', dot: 'bg-gray-500' },
] as const;
// ─────────────────────────────────────────────────────────────────────────────
// FILTERS BAR
// ─────────────────────────────────────────────────────────────────────────────

interface Filters {
  clientId?: string;
  serviceLineId?: string;
  createdById?: string;
  status?: string;
}

function FiltersBar({
  filters,
  onChange,
  win,
  onWin,
  standardOnly,
  onStandardOnly,
  activeTab,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  win: WinState;
  onWin: (w: WinState) => void;
  standardOnly: boolean;
  onStandardOnly: (v: boolean) => void;
  activeTab: TabKey;
}) {
  const axios = useAxios();
  const { data: clientsRes } = useQuery({
    queryKey: ['rf-clients'],
    queryFn: async () => (await axios.get('/clients?limit=200&status=ACTIVE')).data?.data ?? [],
    staleTime: 300000,
  });
  const { data: slRes } = useQuery({
    queryKey: ['rf-sl'],
    queryFn: async () => (await axios.get('/service-lines')).data?.data ?? [],
    staleTime: 300000,
  });
  const { data: createdByRes } = useQuery({
    queryKey: ['rf-created-by'],
    queryFn: async () => {
      const rows = (await axios.get('/users?limit=100&isActive=true')).data?.data ?? [];
      return rows.map((u: any) => ({
        id: u.id,
        label:
          u.displayName?.trim() || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
      }));
    },
    staleTime: 300000,
  });
  {
    /* ── Status quick-filter row ── */
  }
  <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
    <Filter className="h-4 w-4 shrink-0 text-slate-400" />
    <div className="flex items-center gap-0.5 flex-wrap">
      <button
        onClick={() => onChange({ ...filters, status: undefined })}
        className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
          !filters.status
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 bg-slate-100'
        }`}
      >
        All
      </button>
      {ALL_REPORT_STATUSES.map(s => {
        const isActive = filters.status === s.key;
        return (
          <button
            key={s.key}
            onClick={() => onChange({ ...filters, status: isActive ? undefined : s.key })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 bg-slate-100'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
            {s.label}
          </button>
        );
      })}
    </div>
  </div>;

  const clients: any[] = clientsRes ?? [];
  const sls: any[] = slRes ?? [];
  const createdBys: { id: string; label: string }[] = createdByRes ?? [];
  const set = (k: keyof Filters, v: string) =>
    onChange({ ...filters, [k]: v === 'ALL' ? undefined : v || undefined });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {(
            [
              { k: 'preset', l: 'Quick' },
              { k: 'hours', l: 'By hours' },
              { k: 'range', l: 'Custom range' },
            ] as { k: WindowMode; l: string }[]
          ).map(m => (
            <button
              key={m.k}
              onClick={() => onWin({ ...win, mode: m.k })}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                win.mode === m.k
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m.l}
            </button>
          ))}
        </div>

        {win.mode === 'preset' &&
          PRESETS.map(p => (
            <button
              key={p.k}
              onClick={() => onWin({ ...win, range: p.k })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                win.range === p.k
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.l}
            </button>
          ))}

        {win.mode === 'hours' && (
          <div className="flex flex-wrap items-center gap-2">
            {HOUR_OPTS.map(h => (
              <button
                key={h}
                onClick={() => onWin({ ...win, hours: h })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  win.hours === h
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {h}h
              </button>
            ))}
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">CUSTOM</span>
              <input
                type="number"
                min={1}
                value={win.hours}
                onChange={e => onWin({ ...win, hours: Math.max(1, Number(e.target.value) || 1) })}
                className="w-14 bg-transparent text-xs text-slate-700 outline-none"
              />
              <span className="text-[10px] font-bold text-slate-400">hrs</span>
            </div>
          </div>
        )}

        {win.mode === 'range' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">FROM</span>
              <input
                type="date"
                value={win.fromDate}
                onChange={e => onWin({ ...win, fromDate: e.target.value })}
                className="w-28 bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">TO</span>
              <input
                type="date"
                value={win.toDate}
                onChange={e => onWin({ ...win, toDate: e.target.value })}
                className="w-28 bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>
          </div>
        )}

        <span className="ml-auto rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
          {winLabel(win)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <Filter className="h-4 w-4 shrink-0 text-slate-400" />
        <Select value={filters.clientId ?? 'ALL'} onValueChange={v => set('clientId', v)}>
          <SelectTrigger className="h-8 w-40 border-slate-200 text-xs font-medium">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.serviceLineId ?? 'ALL'} onValueChange={v => set('serviceLineId', v)}>
          <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
            <SelectValue placeholder="All service lines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All service lines</SelectItem>
            {sls.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/*Created by filter*/}
        <Select value={filters.createdById ?? 'ALL'} onValueChange={v => set('createdById', v)}>
          <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
            <SelectValue placeholder="Created By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Created By</SelectItem>
            {createdBys.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ── Row 3: status — requirements tab only ── */}
        {(activeTab === 'requirements' || activeTab === 'recruiters') && (
          <>
            <Select
              value={filters.status ?? 'ALL'}
              onValueChange={v => onChange({ ...filters, status: v === 'ALL' ? undefined : v })}
            >
              <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {ALL_REPORT_STATUSES.map(s => (
                  <SelectItem key={s.key} value={s.key}>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filters.status && (
              <button
                onClick={() => onChange({ ...filters, status: undefined })}
                className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </>
        )}

        <button
          onClick={() => onStandardOnly(!standardOnly)}
          className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
            standardOnly
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {standardOnly ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}{' '}
          Standard stages only
        </button>

        {(filters.clientId || filters.serviceLineId || filters.createdById || filters.status) && (
          <button
            onClick={() => onChange({})}
            className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        {!filters.serviceLineId && (
          <span className="ml-1 text-[11px] font-medium text-slate-400">
            Tables split by service line — pick one above to see it flat.
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

function OverviewSection({ data, loading }: { data?: OverviewResponse; loading: boolean }) {
  if (loading)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );

  const d = data?.data;
  if (!d || d.kpis.total === 0) return <Empty msg="No activity in this window." />;

  const multiLine = d.byServiceLine.length > 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPI label="Candidates" value={d.kpis.total} color="#4F46E5" />
        <KPI
          label="Submitted"
          value={d.kpis.submitted}
          color="#2563EB"
          sub={`${d.kpis.submissionRate}% of sourced`}
        />
        <KPI
          label="Offered"
          value={d.kpis.offered}
          color="#D97706"
          sub={`${d.kpis.offerRate}% of submitted`}
        />
        <KPI
          label="Joined"
          value={d.kpis.joined}
          color="#059669"
          trend="up"
          sub={`${d.kpis.joinRate}% of offered`}
        />
        <KPI label="Active" value={d.kpis.active} color="#0891B2" />
        <KPI
          label="Dropped"
          value={d.kpis.dropped}
          color="#DC2626"
          trend={d.kpis.dropped > 0 ? 'down' : undefined}
        />
      </div>

      <Card title={`Candidates added (${d.timeGranularity === 'hour' ? 'hourly' : 'daily'})`}>
        <TimeSeriesChart points={d.timeSeries} granularity={d.timeGranularity} />
      </Card>

      {multiLine ? (
        <>
          <Card title="By business unit">
            <BUBarChart items={d.byBusinessUnit} />
          </Card>

          <div>
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-slate-700">
              Service line funnels
            </h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {d.byServiceLine.map(line => (
                <Card key={line.serviceLineId ?? 'none'} title={line.name}>
                  <div className="mb-4 flex flex-wrap gap-5">
                    <MiniStat l="Total" v={line.total} />
                    <MiniStat l="Submitted" v={line.submitted} c="text-blue-700" />
                    <MiniStat l="Offered" v={line.offered} c="text-amber-700" />
                    <MiniStat l="Joined" v={line.joined} c="text-emerald-700" />
                  </div>
                  <FunnelChart items={line.funnel.map(f => ({ label: f.label, count: f.count }))} />
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <Card title="Stage funnel">
          <FunnelChart items={d.funnel.map(f => ({ label: f.label, count: f.count }))} />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Disposition split">
          <DispositionBars counts={d.dispositionCounts} />
        </Card>
        <Card title="Top recruiters">
          <Leaderboard items={d.leaderboard} />
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE LINE TABS (one line at a time — never mixed)
// ─────────────────────────────────────────────────────────────────────────────

const keyOf = (g: { serviceLine: ServiceLineRef | null }) => g.serviceLine?.id ?? '__none__';
const nameOf = (g: { serviceLine: ServiceLineRef | null }) => g.serviceLine?.name ?? 'Unassigned';

function LineTabs({
  groups,
  activeKey,
  onSelect,
}: {
  groups: { serviceLine: ServiceLineRef | null; total: number }[];
  activeKey: string;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
      {groups.map(g => {
        const k = keyOf(g);
        const active = k === activeKey;
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className={`h-3.5 w-3.5 ${active ? 'text-indigo-500' : 'text-slate-300'}`} />
            {nameOf(g)}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
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
// RECRUITER SECTION
// ─────────────────────────────────────────────────────────────────────────────

function RecruiterSection({
  resp,
  loading,
  reqFilter,
  onReqFilter,
  onDownloadAll,
  onDownloadSelected,
}: {
  resp?: RecruiterResponse;
  loading: boolean;
  reqFilter: string;
  onReqFilter: (v: string) => void;
  onDownloadAll: (slId?: string) => void;
  onDownloadSelected: (ids: string[], slId?: string) => void;
}) {
  const [activeKey, setActiveKey] = useState<string>('');

  if (loading)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skel rows={6} />
      </div>
    );

  const groups: RecruiterGroup[] = resp?.groups ?? [];
  if (!groups.length) return <Empty msg="No recruiter data for this window." />;

  const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];
  const rows = active.data;

  const reqOptions = (() => {
    const m = new Map<string, string>();
    for (const r of rows)
      for (const rq of r.requirementBreakdown)
        m.set(rq.requirementId, `${rq.reqCode} · ${rq.title}`);
    return [...m.entries()].map(([id, label]) => ({ id, label }));
  })();

  const totals = {
    sourced: rows.reduce((s, r) => s + r.sourced, 0),
    joined: rows.reduce((s, r) => s + r.joined, 0),
    active: rows.reduce((s, r) => s + r.active, 0),
    dropped: rows.reduce((s, r) => s + r.dropped, 0),
    recruiters: new Set(rows.map(r => r.id)).size,
  };

  return (
    <div className="space-y-5">
      <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KPI label="Recruiters" value={totals.recruiters} color="#4F46E5" />
        <KPI label="Sourced" value={totals.sourced} color="#0891B2" />
        <KPI label="Active" value={totals.active} color="#059669" />
        <KPI
          label="Joined"
          value={totals.joined}
          color="#7C3AED"
          trend="up"
          sub={
            totals.sourced > 0
              ? `${((totals.joined / totals.sourced) * 100).toFixed(1)}%`
              : undefined
          }
        />
        <KPI
          label="Dropped"
          value={totals.dropped}
          color="#DC2626"
          trend={totals.dropped > 0 ? 'down' : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Within requirement
        </span>
        <Select value={reqFilter || 'ALL'} onValueChange={v => onReqFilter(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="h-8 w-72 border-slate-200 text-xs font-medium">
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
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-red-500 hover:bg-red-50"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <RecruiterTable
        key={keyOf(active)}
        title={active.serviceLine?.name ?? null}
        serviceLineId={active.serviceLine?.id}
        data={active.data}
        stages={active.stages}
        onDownloadAll={onDownloadAll}
        onDownloadSelected={onDownloadSelected}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT SECTION
// ─────────────────────────────────────────────────────────────────────────────

function RequirementSection({
  resp,
  loading,
  onDownloadRow,
  onDownloadAll,
  onDownloadSelected,
}: {
  resp?: RequirementReportResponse;
  loading: boolean;
  onDownloadRow: (id: string, reqCode: string) => void;
  onDownloadAll: (slId?: string) => void;
  onDownloadSelected: (ids: string[], slId?: string) => void;
}) {
  const [activeKey, setActiveKey] = useState<string>('');

  if (loading) return <Skel rows={6} />;

  const groups: RequirementGroup[] = resp?.groups ?? [];
  if (!groups.length) return <Empty msg="No requirements found for this window." />;

  const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];

  return (
    <div className="space-y-5">
      <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />
      <RequirementTable
        key={keyOf(active)}
        title={active.serviceLine?.name ?? null}
        serviceLineId={active.serviceLine?.id}
        data={active.data}
        stages={active.stages}
        onDownloadAll={onDownloadAll}
        onDownloadSelected={onDownloadSelected}
        onDownloadRow={onDownloadRow}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'recruiters' | 'requirements';

export default function ReportsPage() {
  const axios = useAxios();
  const { user } = useAuth();
  const { canView } = usePermission('reports');
  const hasAccess = user?.isSuperAdmin || canView;

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [filters, setFilters] = useState<Filters>({});
  const [win, setWin] = useState<WinState>(DEFAULT_WIN);
  const [standardOnly, setStandardOnly] = useState(false);
  const [recReqFilter, setRecReqFilter] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(winToParams(win)).forEach(([k, v]) => p.set(k, v));
    if (filters.clientId) p.set('clientId', filters.clientId);
    if (filters.serviceLineId) p.set('serviceLineId', filters.serviceLineId);
    if (filters.createdById) p.set('createdById', filters.createdById);
    if (filters.status) p.set('status', filters.status);
    if (standardOnly) p.set('standardOnly', 'true');
    return p;
  }, [win, filters, standardOnly]);

  const baseQs = baseParams.toString();

  const recParams = useMemo(() => {
    const p = new URLSearchParams(baseQs);
    if (recReqFilter) p.set('requirementId', recReqFilter);
    return p.toString();
  }, [baseQs, recReqFilter]);

  const overviewQuery = useQuery({
    queryKey: ['report-overview', baseQs],
    queryFn: async () => (await axios.get(`/reports/overview?${baseQs}`)).data as OverviewResponse,
    enabled: hasAccess && activeTab === 'overview',
    staleTime: 60000,
  });

  const recruiterQuery = useQuery({
    queryKey: ['report-recruiters', recParams],
    queryFn: async () =>
      (await axios.get(`/reports/recruiters?${recParams}`)).data as RecruiterResponse,
    enabled: hasAccess && activeTab === 'recruiters',
    staleTime: 60000,
  });

  const requirementQuery = useQuery({
    queryKey: ['report-requirements', baseQs],
    queryFn: async () =>
      (await axios.get(`/reports/requirements?${baseQs}`)).data as RequirementReportResponse,
    enabled: hasAccess && activeTab === 'requirements',
    staleTime: 60000,
  });

  const download = useCallback(
    async (url: string, filename: string, key: string) => {
      if (downloading) return;
      setDownloading(key);
      try {
        const res = await axios.get(url, { responseType: 'blob' });
        downloadBlob(res.data, filename);
      } catch (e) {
        console.error(e);
      } finally {
        setDownloading(null);
      }
    },
    [axios, downloading]
  );

  const dateStr = new Date().toISOString().split('T')[0];

  const handleRecruiterAll = useCallback(
    (slId?: string) => {
      const p = new URLSearchParams(recParams);
      if (slId) p.set('serviceLineId', slId);
      download(
        `/reports/recruiters/export?${p.toString()}`,
        `recruiter-report-${slId ? 'line' : 'all'}-${dateStr}.xlsx`,
        'rec-all'
      );
    },
    [recParams, download, dateStr]
  );

  const handleRecruiterSelected = useCallback(
    (ids: string[], slId?: string) => {
      const p = new URLSearchParams(recParams);
      if (slId) p.set('serviceLineId', slId);
      p.set('ids', ids.join(','));
      download(
        `/reports/recruiters/export?${p.toString()}`,
        `recruiter-report-selected-${dateStr}.xlsx`,
        'rec-sel'
      );
    },
    [recParams, download, dateStr]
  );

  const handleRequirementAll = useCallback(
    (slId?: string) => {
      const p = new URLSearchParams(baseQs);
      if (slId) p.set('serviceLineId', slId);
      download(
        `/reports/requirements/export?${p.toString()}`,
        `requirements-${slId ? 'line' : 'all'}-${dateStr}.xlsx`,
        'req-all'
      );
    },
    [baseQs, download, dateStr]
  );

  const handleRequirementSelected = useCallback(
    (ids: string[], slId?: string) => {
      const p = new URLSearchParams(baseQs);
      if (slId) p.set('serviceLineId', slId);
      p.set('ids', ids.join(','));
      download(
        `/reports/requirements/export?${p.toString()}`,
        `requirements-selected-${dateStr}.xlsx`,
        'req-sel'
      );
    },
    [baseQs, download, dateStr]
  );

  const handleRequirementRow = useCallback(
    (id: string, reqCode: string) => {
      download(
        `/reports/requirements/${id}/export`,
        `requirement-${reqCode}-${dateStr}.xlsx`,
        `req-${id}`
      );
    },
    [download, dateStr]
  );

  if (!hasAccess)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">You do not have access to reports.</p>
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Reports</h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Live monitoring · Recruiter performance · Requirement analytics
          </p>
        </div>
        {downloading && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Preparing download…
          </div>
        )}
      </div>

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        win={win}
        onWin={setWin}
        standardOnly={standardOnly}
        onStandardOnly={setStandardOnly}
        activeTab={activeTab}
      />

      <Tabs
        value={activeTab}
        onValueChange={v => {
          const next = v as TabKey;
          if (next !== 'requirements') setFilters(f => ({ ...f, status: undefined }));
          setActiveTab(next);
        }}
      >
        {' '}
        <TabsList className="h-10 gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <TabsTrigger
            value="overview"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="recruiters"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <Users className="h-3.5 w-3.5" /> Recruiters
          </TabsTrigger>
          <TabsTrigger
            value="requirements"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <FileText className="h-3.5 w-3.5" /> Requirements
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5">
          <OverviewSection data={overviewQuery.data} loading={overviewQuery.isLoading} />
        </TabsContent>
        <TabsContent value="recruiters" className="mt-5">
          <RecruiterSection
            resp={recruiterQuery.data}
            loading={recruiterQuery.isLoading}
            reqFilter={recReqFilter}
            onReqFilter={setRecReqFilter}
            onDownloadAll={handleRecruiterAll}
            onDownloadSelected={handleRecruiterSelected}
          />
        </TabsContent>
        <TabsContent value="requirements" className="mt-5">
          <RequirementSection
            resp={requirementQuery.data}
            loading={requirementQuery.isLoading}
            onDownloadRow={handleRequirementRow}
            onDownloadAll={handleRequirementAll}
            onDownloadSelected={handleRequirementSelected}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

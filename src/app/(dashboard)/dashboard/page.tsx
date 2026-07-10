// // File: page.tsx
// // Path: src/app/(dashboard)/dashboard/page.tsx

// 'use client';

// import { Suspense, useState, useMemo } from 'react';
// import { useRouter } from 'next/navigation';
// import { useQuery } from '@tanstack/react-query';
// import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
// import { DateRange } from 'react-day-picker';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
// import {
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
//   type ChartConfig,
// } from '@/components/ui/chart';
// import { Calendar } from '@/components/ui/calendar';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { cn } from '@/lib/utils';
// import {
//   Zap,
//   TrendingUp,
//   AlertTriangle,
//   Clock,
//   Users,
//   Briefcase,
//   CalendarIcon,
//   X,
//   ChevronRight,
//   PauseCircle,
//   Building2,
//   FileText,
//   Ban,
//   CheckCircle2,
//   AlertCircle,
// } from 'lucide-react';
// import { useAxios } from '@/hooks/useAxios';
// import { useAuth } from '@/context/AuthContext';

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface StatsData {
//   totalRequirements: number;
//   active: number;
//   pendingApproval: number;
//   draft: number;
//   onHold: number;
//   closed: number;
//   breached: number;
//   thisWeek: number;
//   highPriority: number;
//   totalClients: number;
//   totalCandidates: number;
//   buBreakdown: { id: string; name: string; count: number }[];
//   slBreakdown: { id: string; name: string; count: number }[];
// }

// interface PipelineStageOverview {
//   stageId: string;
//   code: string;
//   label: string;
//   order: number;
//   serviceLineId: string | null;
//   isTerminal: boolean;
//   total: number;
//   active: number;
//   rejected: number;
//   withdrawn: number;
//   onHold: number;
//   inactive: number;
// }

// interface PipelineOverviewData {
//   summary: {
//     totalCandidates: number;
//     activeCandidates: number;
//     inactiveCandidates: number;
//     onHold: number;
//   };
//   stages: PipelineStageOverview[];
// }

// interface Assignment {
//   id: string;
//   depth: number;
//   allocatedOpenings: number | null;
//   filledOpenings: number;
//   submissionsCount: number;
//   deadline: string | null;
//   breachedAt: string | null;
//   assignedAt: string;
//   requirement: {
//     id: string;
//     reqCode: string;
//     title: string;
//     status: string;
//     priority: string;
//     totalOpenings: number;
//     client: { id: string; name: string } | null;
//     serviceLine: { id: string; name: string } | null;
//     isRespondByBreached: boolean;
//     respondBy: string | null;
//   };
//   pipelines: { id: string }[];
// }

// interface Department {
//   id: string;
//   name: string;
//   code: string;
//   isActive: boolean;
// }

// interface HierarchyUser {
//   id: string;
//   firstName: string;
//   lastName: string;
//   employeeId: string | null;
//   isActive: boolean;
// }

// interface ResumeStats {
//   total: number;
//   bySource: { source: string; count: number }[];
//   byDepartment: { id: string; name: string; count: number }[];
//   byTeamLead: { id: string; name: string; count: number }[];
//   byBusinessUnit: { id: string; name: string; count: number }[];
//   byRecruiter: { recruiterId: string; name: string; count: number }[];
// }

// // ─── Constants ────────────────────────────────────────────────────────────────

// const STAGE_COLORS: Record<string, string> = {
//   '01': '#f97316',
//   '02': '#7c3aed',
//   '03': '#f43f5e',
//   '04': '#ec4899',
//   '05': '#06b6d4',
//   '06': '#14b8a6',
//   '07': '#3b82f6',
//   '07A': '#60a5fa',
//   '07B': '#1d4ed8',
//   '08': '#6366f1',
//   '09': '#10b981',
//   '10': '#94a3b8',
// };

// const PRESETS = [
//   { label: 'Today', from: () => new Date(), to: () => new Date() },
//   { label: 'Last 7 days', from: () => subDays(new Date(), 6), to: () => new Date() },
//   { label: 'Last 30 days', from: () => subDays(new Date(), 29), to: () => new Date() },
//   { label: 'This month', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
//   { label: 'This year', from: () => startOfYear(new Date()), to: () => new Date() },
// ];

// const SIDEBAR_STATUSES = [
//   { key: 'ACTIVE', label: 'Active', color: '#639922' },
//   { key: 'ON_HOLD', label: 'On hold', color: '#BA7517' },
//   { key: 'PENDING_APPROVAL', label: 'Pending', color: '#378ADD' },
//   { key: 'DRAFT', label: 'Draft', color: '#888780' },
//   { key: 'CLOSED', label: 'Closed', color: '#888780' },
//   { key: 'CANCELLED', label: 'Cancelled', color: '#888780' },
// ];

// // ─── Chart configs ────────────────────────────────────────────────────────────

// const funnelChartConfig: ChartConfig = {
//   active: { label: 'Active', color: '#378ADD' },
//   onHold: { label: 'On hold', color: '#EF9F27' },
//   inactive: { label: 'Inactive', color: '#e2e8f0' },
// };

// const buChartConfig: ChartConfig = {
//   count: { label: 'Requirements', color: '#7F77DD' },
// };

// const resumeChartConfig: ChartConfig = {
//   count: { label: 'Resumes parsed', color: '#10B981' },
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function greeting() {
//   const h = new Date().getHours();
//   if (h < 12) return 'Good morning';
//   if (h < 17) return 'Good afternoon';
//   return 'Good evening';
// }

// function stageColor(code: string) {
//   return STAGE_COLORS[code] ?? '#94a3b8';
// }

// const PRIORITY_COLOR: Record<string, string> = {
//   HIGH: '#E24B4A',
//   MEDIUM: '#BA7517',
//   LOW: '#639922',
// };

// // ─── Date Range Picker ────────────────────────────────────────────────────────

// function DateRangePicker({
//   range,
//   onChange,
// }: {
//   range: DateRange | undefined;
//   onChange: (r: DateRange | undefined) => void;
// }) {
//   const [open, setOpen] = useState(false);

//   const label =
//     range?.from && range?.to
//       ? `${format(range.from, 'dd MMM yy')} – ${format(range.to, 'dd MMM yy')}`
//       : range?.from
//         ? `From ${format(range.from, 'dd MMM yy')}`
//         : 'All time';

//   return (
//     <Popover open={open} onOpenChange={setOpen}>
//       <PopoverTrigger asChild>
//         <Button
//           variant="outline"
//           size="sm"
//           className={cn(
//             'h-8 gap-1.5 text-xs font-medium',
//             range?.from && 'border-primary/40 bg-primary/5 text-primary'
//           )}
//         >
//           <CalendarIcon size={13} />
//           {label}
//           {range?.from && (
//             <span
//               role="button"
//               aria-label="Clear date range"
//               onClick={e => {
//                 e.stopPropagation();
//                 onChange(undefined);
//               }}
//               className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
//             >
//               <X size={11} />
//             </span>
//           )}
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-auto p-0" align="end">
//         <div className="flex">
//           <div className="flex flex-col gap-0.5 border-r border-border p-3 w-32">
//             <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1 px-1">
//               Quick select
//             </p>
//             {PRESETS.map(p => (
//               <button
//                 key={p.label}
//                 onClick={() => {
//                   onChange({ from: p.from(), to: p.to() });
//                   setOpen(false);
//                 }}
//                 className="text-left px-2 py-1.5 rounded-md text-[12px] text-foreground hover:bg-muted transition-colors"
//               >
//                 {p.label}
//               </button>
//             ))}
//           </div>
//           <div className="p-3">
//             <Calendar
//               mode="range"
//               selected={range}
//               onSelect={onChange}
//               numberOfMonths={2}
//               disabled={{ after: new Date() }}
//               initialFocus
//             />
//             <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => {
//                   onChange(undefined);
//                   setOpen(false);
//                 }}
//               >
//                 Clear
//               </Button>
//               <Button size="sm" onClick={() => setOpen(false)}>
//                 Apply
//               </Button>
//             </div>
//           </div>
//         </div>
//       </PopoverContent>
//     </Popover>
//   );
// }

// // ─── Stat Card ────────────────────────────────────────────────────────────────

// function StatCard({
//   label,
//   value,
//   sub,
//   icon: Icon,
//   accentColor,
//   loading,
//   onClick,
// }: {
//   label: string;
//   value: number;
//   sub?: string;
//   icon: React.ElementType;
//   accentColor: string;
//   loading?: boolean;
//   onClick?: () => void;
// }) {
//   return (
//     <div
//       onClick={onClick}
//       style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
//       className={cn(
//         'bg-card border border-border rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden',
//         onClick && 'cursor-pointer hover:shadow-sm hover:border-border/80 transition-all'
//       )}
//     >
//       {/* faint icon watermark */}
//       <div
//         className="absolute right-4 top-4 opacity-[0.07]"
//         style={{ color: accentColor }}
//         aria-hidden
//       >
//         <Icon size={40} />
//       </div>

//       <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
//         {label}
//       </p>

//       {loading ? (
//         <Skeleton className="h-10 w-16 mt-1" />
//       ) : (
//         <p
//           className="text-[42px] font-semibold tabular-nums leading-none"
//           style={{ color: 'hsl(var(--foreground))' }}
//         >
//           {value}
//         </p>
//       )}

//       {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}

//       {/* bottom accent line */}
//       <div
//         className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
//         style={{ background: accentColor }}
//       />
//     </div>
//   );
// }

// // ─── Pipeline Funnel Chart ────────────────────────────────────────────────────

// function PipelineFunnelChart({
//   stages,
//   loading,
// }: {
//   stages: PipelineStageOverview[];
//   loading: boolean;
// }) {
//   if (loading) return <Skeleton className="h-[220px] w-full" />;

//   const data = stages.map(s => ({
//     name: s.label.length > 9 ? s.label.slice(0, 9) + '…' : s.label,
//     fullLabel: s.label,
//     active: s.active,
//     onHold: s.onHold,
//     inactive: s.inactive,
//     code: s.code,
//   }));

//   return (
//     <ChartContainer config={funnelChartConfig} className="h-[220px] w-full">
//       <BarChart data={data} barSize={16} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
//         <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
//         <XAxis
//           dataKey="name"
//           tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
//           tickLine={false}
//           axisLine={false}
//           interval={0}
//         />
//         <YAxis
//           tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
//           tickLine={false}
//           axisLine={false}
//           allowDecimals={false}
//         />
//         <ChartTooltip
//           content={
//             <ChartTooltipContent
//               labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
//             />
//           }
//         />
//         <Bar dataKey="active" stackId="a" fill="var(--color-active)" radius={[0, 0, 0, 0]} />
//         <Bar dataKey="onHold" stackId="a" fill="var(--color-onHold)" radius={[0, 0, 0, 0]} />
//         <Bar dataKey="inactive" stackId="a" fill="var(--color-inactive)" radius={[3, 3, 0, 0]} />
//       </BarChart>
//     </ChartContainer>
//   );
// }

// // ─── BU Breakdown Chart ───────────────────────────────────────────────────────

// function BUBreakdownChart({
//   items,
//   loading,
// }: {
//   items: { id: string; name: string; count: number }[];
//   loading: boolean;
// }) {
//   if (loading) return <Skeleton className="h-[220px] w-full" />;

//   const data = items.slice(0, 6).map(i => ({
//     name: i.name.length > 18 ? i.name.slice(0, 18) + '…' : i.name,
//     fullName: i.name,
//     count: i.count,
//   }));

//   return (
//     <ChartContainer config={buChartConfig} className="h-[220px] w-full">
//       <BarChart
//         layout="vertical"
//         data={data}
//         barSize={14}
//         margin={{ top: 4, right: 28, left: 4, bottom: 0 }}
//       >
//         <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
//         <XAxis
//           type="number"
//           tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
//           tickLine={false}
//           axisLine={false}
//           allowDecimals={false}
//         />
//         <YAxis
//           type="category"
//           dataKey="name"
//           tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
//           tickLine={false}
//           axisLine={false}
//           width={100}
//         />
//         <ChartTooltip
//           content={
//             <ChartTooltipContent
//               labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
//             />
//           }
//         />
//         <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]}>
//           {data.map((_, i) => (
//             <Cell key={i} fill="#7F77DD" fillOpacity={1 - i * 0.12} />
//           ))}
//         </Bar>
//       </BarChart>
//     </ChartContainer>
//   );
// }

// // ─── Resume Breakdown Chart (generic — dept / team-lead / BU) ────────────────

// function ResumeBreakdownChart({
//   items,
//   loading,
// }: {
//   items: { id: string; name: string; count: number }[];
//   loading: boolean;
// }) {
//   if (loading) return <Skeleton className="h-[220px] w-full" />;

//   const data = items.slice(0, 6).map(i => ({
//     name: i.name.length > 18 ? i.name.slice(0, 18) + '…' : i.name,
//     fullName: i.name,
//     count: i.count,
//   }));

//   if (data.length === 0) {
//     return (
//       <div className="flex items-center justify-center h-[220px] text-[12px] text-muted-foreground">
//         No data for this period
//       </div>
//     );
//   }

//   return (
//     <ChartContainer config={resumeChartConfig} className="h-[220px] w-full">
//       <BarChart
//         layout="vertical"
//         data={data}
//         barSize={14}
//         margin={{ top: 4, right: 28, left: 4, bottom: 0 }}
//       >
//         <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
//         <XAxis
//           type="number"
//           tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
//           tickLine={false}
//           axisLine={false}
//           allowDecimals={false}
//         />
//         <YAxis
//           type="category"
//           dataKey="name"
//           tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
//           tickLine={false}
//           axisLine={false}
//           width={100}
//         />
//         <ChartTooltip
//           content={
//             <ChartTooltipContent
//               labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
//             />
//           }
//         />
//         <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]}>
//           {data.map((_, i) => (
//             <Cell key={i} fill="#10B981" fillOpacity={1 - i * 0.12} />
//           ))}
//         </Bar>
//       </BarChart>
//     </ChartContainer>
//   );
// }

// // ─── Stage Card ───────────────────────────────────────────────────────────────

// function StageCard({
//   stage,
//   dateFrom,
//   dateTo,
// }: {
//   stage: PipelineStageOverview;
//   dateFrom?: string;
//   dateTo?: string;
// }) {
//   const router = useRouter();
//   const color = stageColor(stage.code);
//   const pct = stage.total > 0 ? Math.round((stage.active / stage.total) * 100) : 0;

//   function go() {
//     const p = new URLSearchParams({ stageId: stage.stageId });
//     if (dateFrom) p.set('dateFrom', dateFrom);
//     if (dateTo) p.set('dateTo', dateTo);
//     router.push(`/requirements?${p.toString()}`);
//   }

//   return (
//     <div
//       onClick={go}
//       className="bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:border-border/70 hover:shadow-sm transition-all group"
//       style={{ borderTopColor: color, borderTopWidth: 3 }}
//     >
//       <div className="flex items-start justify-between mb-1.5">
//         <span className="text-[10px] font-mono font-semibold tracking-wide" style={{ color }}>
//           {stage.code}
//         </span>
//         <ChevronRight
//           size={12}
//           className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-px"
//         />
//       </div>
//       <p className="text-[11.5px] text-muted-foreground leading-tight mb-3 min-h-[30px] line-clamp-2">
//         {stage.label}
//       </p>
//       <p
//         className="text-[32px] font-semibold tabular-nums leading-none mb-3"
//         style={{ color: stage.total === 0 ? 'hsl(var(--muted-foreground))' : color }}
//       >
//         {stage.total}
//       </p>
//       <div className="h-[3px] rounded-full bg-muted overflow-hidden mb-2">
//         <div
//           className="h-full rounded-full transition-all"
//           style={{ width: `${pct}%`, backgroundColor: color }}
//         />
//       </div>
//       <div className="flex justify-between text-[10px] text-muted-foreground">
//         <span>{stage.active > 0 ? `${stage.active} active` : '—'}</span>
//         <span>{stage.onHold > 0 ? `${stage.onHold} hold` : '—'}</span>
//       </div>
//     </div>
//   );
// }

// // ─── Assignment Row ───────────────────────────────────────────────────────────

// function AssignmentRow({ a }: { a: Assignment }) {
//   const router = useRouter();
//   const isBreached = a.requirement.isRespondByBreached || !!a.breachedAt;
//   const fillPct =
//     a.requirement.totalOpenings > 0
//       ? Math.round((a.filledOpenings / a.requirement.totalOpenings) * 100)
//       : 0;

//   const priorityColor = PRIORITY_COLOR[a.requirement.priority] ?? '#888780';

//   return (
//     <div
//       onClick={() => router.push(`/requirements/${a.requirement.id}`)}
//       className={cn(
//         'px-4 py-3.5 border-b border-border/60 hover:bg-muted/40 cursor-pointer transition-colors',
//         isBreached && 'border-l-2 border-l-destructive pl-[14px]'
//       )}
//     >
//       <div className="flex items-center gap-2 mb-1">
//         <p className="text-[10px] font-mono text-muted-foreground">{a.requirement.reqCode}</p>
//         {isBreached && (
//           <span className="flex items-center gap-1 text-[10px] font-medium text-destructive">
//             <AlertCircle size={10} />
//             breached
//           </span>
//         )}
//       </div>

//       <p className="text-[13px] font-semibold text-foreground leading-tight mb-1.5 flex items-center gap-1.5">
//         <span
//           className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
//           style={{ backgroundColor: priorityColor }}
//         />
//         {a.requirement.title}
//       </p>

//       <p className="text-[11px] text-muted-foreground mb-2 truncate">
//         {a.requirement.client?.name}
//         {a.requirement.serviceLine ? ` · ${a.requirement.serviceLine.name}` : ''}
//       </p>

//       <div className="flex items-center gap-2">
//         <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden">
//           <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fillPct}%` }} />
//         </div>
//         <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
//           {a.filledOpenings}/{a.requirement.totalOpenings} filled
//         </span>
//       </div>
//     </div>
//   );
// }

// // ─── Recruiter Hero (shown instead of stat grid for recruiters) ───────────────

// function RecruiterHero({ assignments, loading }: { assignments: Assignment[]; loading: boolean }) {
//   const total = assignments.length;
//   const breached = assignments.filter(
//     a => a.requirement.isRespondByBreached || !!a.breachedAt
//   ).length;
//   const submitted = assignments.reduce((s, a) => s + a.submissionsCount, 0);
//   const filled = assignments.reduce((s, a) => s + a.filledOpenings, 0);

//   return (
//     <div className="grid grid-cols-5 gap-3 px-5 py-4 shrink-0">
//       <StatCard
//         label="My assignments"
//         value={total}
//         sub="active requirements"
//         icon={Briefcase}
//         accentColor="#378ADD"
//         loading={loading}
//       />
//       <StatCard
//         label="Candidates submitted"
//         value={submitted}
//         sub="total submissions"
//         icon={Users}
//         accentColor="#639922"
//         loading={loading}
//       />
//       <StatCard
//         label="Openings filled"
//         value={filled}
//         sub="across assignments"
//         icon={CheckCircle2}
//         accentColor="#7F77DD"
//         loading={loading}
//       />
//       <StatCard
//         label="Breached"
//         value={breached}
//         sub="deadline passed"
//         icon={AlertTriangle}
//         accentColor="#E24B4A"
//         loading={loading}
//       />
//     </div>
//   );
// }

// // ─── Utility functions ───────────────────────────────────────────────────────
// function fullName(u: HierarchyUser) {
//   return `${u.firstName} ${u.lastName}`.trim();
// }

// // ─── Sidebar ──────────────────────────────────────────────────────────────────

// function Sidebar({
//   statusFilter,
//   onStatusChange,
//   buId,
//   onBuChange,
//   deptId, // ← add
//   onDeptChange, // ← add
//   serviceLineId,
//   onSlChange,
//   byStatus,
//   busData,
//   deptsData,
//   slData,
//   isRecruiter,
//   isSuperAdmin,
//   hierarchyData,
//   teamLeadId,
//   onTeamLeadChange,
//   reportingToId,
//   onReportingToChange,
// }: {
//   statusFilter: string;
//   onStatusChange: (v: string) => void;
//   buId: string;
//   onBuChange: (v: string) => void;
//   deptId: string; // ← add
//   onDeptChange: (v: string) => void;
//   serviceLineId: string;
//   onSlChange: (v: string) => void;
//   byStatus: Record<string, number>;
//   busData: { id: string; name: string }[] | undefined;
//   deptsData: Department[] | undefined;
//   slData: { id: string; name: string }[] | undefined;
//   isRecruiter: boolean;
//   isSuperAdmin: boolean | undefined;
//   teamLeadId: string;
//   onTeamLeadChange: (v: string) => void;
//   reportingToId: string;
//   onReportingToChange: (v: string) => void;
//   hierarchyData: { teamLeads: HierarchyUser[]; reportingTo: HierarchyUser[] } | undefined;
// }) {
//   const total = Object.values(byStatus).reduce((s, n) => s + n, 0);

//   return (
//     <div
//       className="bg-card border-r border-border flex flex-col"
//       style={{ height: '100%', overflow: 'hidden' }}
//     >
//       {/* Header */}
//       <div className="px-4 py-5 border-b border-border">
//         <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
//           Jobs
//         </p>
//         <p className="text-[32px] font-semibold text-foreground leading-none tabular-nums">
//           {total}
//         </p>
//         <p className="text-[11px] text-muted-foreground mt-1">requirements total</p>
//       </div>

//       <ScrollArea className="flex-1 h-full overflow-y-auto">
//         <div className="py-3 px-2">
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2 mt-1">
//             Status
//           </p>

//           {SIDEBAR_STATUSES.map(s => {
//             const count = byStatus[s.key] ?? 0;
//             const isActive = statusFilter === s.key;
//             return (
//               <button
//                 key={s.key}
//                 onClick={() => onStatusChange(statusFilter === s.key ? '' : s.key)}
//                 className={cn(
//                   'w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors',
//                   isActive
//                     ? 'bg-muted text-foreground'
//                     : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
//                 )}
//               >
//                 <span className="flex items-center gap-2.5">
//                   <span
//                     className="w-[7px] h-[7px] rounded-full shrink-0"
//                     style={{ backgroundColor: s.color }}
//                   />
//                   {s.label}
//                 </span>
//                 {count > 0 && (
//                   <span
//                     className={cn(
//                       'text-[12px] tabular-nums',
//                       isActive ? 'text-foreground font-bold' : 'text-muted-foreground'
//                     )}
//                   >
//                     {count}
//                   </span>
//                 )}
//               </button>
//             );
//           })}

//           {!isRecruiter && busData && busData.length > 0 && (
//             <>
//               <div className="h-px bg-border my-3 mx-1" />
//               <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2 flex items-center gap-1.5">
//                 <Building2 size={9} />
//                 Business Units
//               </p>
//               {[{ id: '', name: 'All BUs' }, ...busData].map(b => (
//                 <button
//                   key={b.id}
//                   onClick={() => onBuChange(b.id === buId ? '' : b.id)}
//                   className={cn(
//                     'w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] truncate transition-colors',
//                     buId === b.id
//                       ? 'bg-muted text-foreground font-semibold'
//                       : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
//                   )}
//                 >
//                   {b.name}
//                 </button>
//               ))}
//             </>
//           )}

//           {deptsData && (
//             <>
//               <div className="h-px bg-border my-3 mx-1" />
//               <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2 flex items-center gap-1.5">
//                 <Building2 size={9} />
//                 Departments
//               </p>
//               {[{ id: '', name: 'All departments' }, ...deptsData].map(d => (
//                 <button
//                   key={d.id}
//                   onClick={() => onDeptChange(d.id === deptId ? '' : d.id)}
//                   className={cn(
//                     'w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] truncate transition-colors',
//                     deptId === d.id
//                       ? 'bg-muted text-foreground font-semibold'
//                       : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
//                   )}
//                 >
//                   {d.name}
//                 </button>
//               ))}
//             </>
//           )}

//           {!isRecruiter && hierarchyData?.teamLeads && hierarchyData.teamLeads.length > 0 && (
//             <>
//               <div className="h-px bg-border my-3 mx-1" />
//               <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2 flex items-center gap-1.5">
//                 <Users size={9} />
//                 Team Lead
//               </p>
//               {[
//                 {
//                   id: '',
//                   firstName: 'All',
//                   lastName: 'team leads',
//                   employeeId: null,
//                   isActive: true,
//                 },
//                 ...hierarchyData.teamLeads,
//               ].map(t => (
//                 <button
//                   key={t.id}
//                   onClick={() => onTeamLeadChange(t.id === teamLeadId ? '' : t.id)}
//                   className={cn(
//                     'w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] truncate transition-colors',
//                     teamLeadId === t.id
//                       ? 'bg-muted text-foreground font-semibold'
//                       : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
//                   )}
//                 >
//                   {fullName(t)}
//                 </button>
//               ))}
//             </>
//           )}

//           {!isRecruiter && hierarchyData?.reportingTo && hierarchyData.reportingTo.length > 0 && (
//             <>
//               <div className="h-px bg-border my-3 mx-1" />
//               <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2 flex items-center gap-1.5">
//                 <Users size={9} />
//                 Reporting Manager
//               </p>
//               {[
//                 {
//                   id: '',
//                   firstName: 'All',
//                   lastName: 'managers',
//                   employeeId: null,
//                   isActive: true,
//                 },
//                 ...hierarchyData.reportingTo,
//               ].map(r => (
//                 <button
//                   key={r.id}
//                   onClick={() => onReportingToChange(r.id === reportingToId ? '' : r.id)}
//                   className={cn(
//                     'w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] truncate transition-colors',
//                     reportingToId === r.id
//                       ? 'bg-muted text-foreground font-semibold'
//                       : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
//                   )}
//                 >
//                   {fullName(r)}
//                 </button>
//               ))}
//             </>
//           )}

//           {!isRecruiter && slData && slData.length > 0 && (
//             <>
//               <div className="h-px bg-border my-3 mx-1" />
//               <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2">
//                 Service Lines
//               </p>
//               {[{ id: '', name: 'All service lines' }, ...slData].map(s => (
//                 <button
//                   key={s.id}
//                   onClick={() => onSlChange(s.id === serviceLineId ? '' : s.id)}
//                   className={cn(
//                     'w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] truncate transition-colors',
//                     serviceLineId === s.id
//                       ? 'bg-muted text-foreground font-semibold'
//                       : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
//                   )}
//                 >
//                   {s.name}
//                 </button>
//               ))}
//             </>
//           )}
//         </div>
//       </ScrollArea>
//     </div>
//   );
// }

// // ─── Right Panel ──────────────────────────────────────────────────────────────

// function RightPanel({
//   dateRange,
//   onDateChange,
//   assignments,
//   loading,
// }: {
//   dateRange: DateRange | undefined;
//   onDateChange: (r: DateRange | undefined) => void;
//   assignments: Assignment[];
//   loading: boolean;
// }) {
//   const breachedCount = assignments.filter(
//     a => a.requirement.isRespondByBreached || !!a.breachedAt
//   ).length;

//   // Sort: breached first, then by assigned date desc
//   const sorted = [...assignments].sort((a, b) => {
//     const aB = a.requirement.isRespondByBreached || !!a.breachedAt ? 1 : 0;
//     const bB = b.requirement.isRespondByBreached || !!b.breachedAt ? 1 : 0;
//     return bB - aB;
//   });

//   return (
//     <div
//       className="bg-card border-l border-border flex flex-col"
//       style={{ height: '100%', overflow: 'hidden' }}
//     >
//       {/* Header */}
//       <div className="px-4 py-5 border-b border-border shrink-0">
//         <div className="flex items-start justify-between mb-1">
//           <div>
//             <p className="text-[13px] font-semibold text-foreground">My assignments</p>
//             <p className="text-[11px] text-muted-foreground mt-0.5">
//               {assignments.length} active
//               {breachedCount > 0 && (
//                 <span className="text-destructive font-medium ml-1">
//                   · {breachedCount} breached
//                 </span>
//               )}
//             </p>
//           </div>
//           {breachedCount > 0 && (
//             <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded-md">
//               <AlertCircle size={11} />
//               {breachedCount}
//             </span>
//           )}
//         </div>
//       </div>

//       {/* Mini date range */}
//       <div className="px-4 py-3 border-b border-border shrink-0">
//         <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
//           Date range
//         </p>
//         <Calendar
//           mode="range"
//           selected={dateRange}
//           onSelect={onDateChange}
//           numberOfMonths={1}
//           disabled={{ after: new Date() }}
//           className="p-0 text-xs [&_td]:p-0 [&_th]:p-0 [&_button]:h-7 [&_button]:w-7 [&_button]:text-[11px]"
//         />
//         <div className="grid grid-cols-2 gap-1.5 mt-2">
//           <div
//             className={cn(
//               'px-2 py-1.5 rounded-md border text-[10.5px] text-center',
//               dateRange?.from
//                 ? 'border-primary/40 bg-primary/5 text-primary'
//                 : 'border-border text-muted-foreground'
//             )}
//           >
//             {dateRange?.from ? format(dateRange.from, 'dd MMM yy') : 'Start'}
//           </div>
//           <div
//             className={cn(
//               'px-2 py-1.5 rounded-md border text-[10.5px] text-center',
//               dateRange?.to
//                 ? 'border-primary/40 bg-primary/5 text-primary'
//                 : 'border-border text-muted-foreground'
//             )}
//           >
//             {dateRange?.to ? format(dateRange.to, 'dd MMM yy') : 'End'}
//           </div>
//         </div>
//         {dateRange?.from && (
//           <button
//             onClick={() => onDateChange(undefined)}
//             className="w-full mt-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center gap-1"
//           >
//             <X size={10} /> Clear range
//           </button>
//         )}
//       </div>

//       {/* Assignment list */}
//       <div className="flex-1 overflow-y-auto">
//         {loading ? (
//           <div className="p-4 space-y-3">
//             {[1, 2, 3, 4].map(i => (
//               <Skeleton key={i} className="h-16 w-full rounded-lg" />
//             ))}
//           </div>
//         ) : sorted.length === 0 ? (
//           <div className="flex flex-col items-center justify-center h-28 gap-2 text-muted-foreground">
//             <Briefcase size={20} className="opacity-40" />
//             <p className="text-[12px]">No active assignments</p>
//           </div>
//         ) : (
//           sorted.map(a => <AssignmentRow key={a.id} a={a} />)
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Main content ─────────────────────────────────────────────────────────────

// function MainContent({
//   stats,
//   statsLoading,
//   stages,
//   pipelineLoading,
//   dateFrom,
//   dateTo,
//   isRecruiter,
//   assignments,
//   assignmentsLoading,
//   onNavigate,
//   resumeStats,
//   resumeStatsLoading,
// }: {
//   stats: StatsData | undefined;
//   statsLoading: boolean;
//   stages: PipelineStageOverview[];
//   pipelineLoading: boolean;
//   dateFrom: string | undefined;
//   dateTo: string | undefined;
//   isRecruiter: boolean;
//   assignments: Assignment[];
//   assignmentsLoading: boolean;
//   onNavigate: (params: Record<string, string>) => void;
//   resumeStats: ResumeStats | undefined;
//   resumeStatsLoading: boolean;
// }) {
//   const [resumeBreakdownDim, setResumeBreakdownDim] = useState<
//     'department' | 'teamLead' | 'businessUnit'
//   >('department');
//   return (
//     <div className="flex flex-col overflow-y-auto bg-background" style={{ height: '100%' }}>
//       {/* ── Recruiter hero OR admin stat cards ── */}
//       {isRecruiter ? (
//         <RecruiterHero assignments={assignments} loading={assignmentsLoading} />
//       ) : (
//         <div className="grid grid-cols-5 gap-3 px-5 py-4 shrink-0">
//           <StatCard
//             label="Active requirements"
//             value={stats?.active ?? 0}
//             sub={`of ${stats?.totalRequirements ?? 0} total`}
//             icon={Zap}
//             accentColor="#639922"
//             loading={statsLoading}
//             onClick={() => onNavigate({ status: 'ACTIVE' })}
//           />
//           <StatCard
//             label="High priority"
//             value={stats?.highPriority ?? 0}
//             sub="active requirements"
//             icon={TrendingUp}
//             accentColor="#E24B4A"
//             loading={statsLoading}
//             onClick={() => onNavigate({ status: 'ACTIVE', priority: 'HIGH' })}
//           />
//           <StatCard
//             label="Breached"
//             value={stats?.breached ?? 0}
//             sub="deadline passed"
//             icon={AlertTriangle}
//             accentColor="#BA7517"
//             loading={statsLoading}
//             onClick={() => onNavigate({ breached: 'true' })}
//           />
//           <StatCard
//             label="In pipeline"
//             value={stats?.totalCandidates ?? 0}
//             sub="across all stages"
//             icon={Users}
//             accentColor="#378ADD"
//             loading={statsLoading}
//           />
//           <StatCard
//             label="Resumes parsed"
//             value={resumeStats?.total ?? 0}
//             sub="across all sources"
//             icon={FileText}
//             accentColor="#10B981"
//             loading={resumeStatsLoading}
//           />
//         </div>
//       )}

//       {/* ── Charts (non-recruiter) ── */}
//       {!isRecruiter && (
//         <div className="grid grid-cols-2 gap-3 px-5 pb-4 shrink-0">
//           {/* Pipeline funnel */}
//           <div className="bg-card border border-border rounded-xl p-5">
//             <div className="flex items-center justify-between mb-1">
//               <p className="text-[13px] font-semibold text-foreground">Pipeline funnel</p>
//               <p className="text-[11px] text-muted-foreground">candidates by stage</p>
//             </div>
//             <div className="flex gap-4 mb-3">
//               {[
//                 { color: '#378ADD', label: 'Active' },
//                 { color: '#EF9F27', label: 'On hold' },
//                 { color: '#e2e8f0', label: 'Inactive', border: true },
//               ].map(l => (
//                 <span
//                   key={l.label}
//                   className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
//                 >
//                   <span
//                     className="w-2 h-2 rounded-sm shrink-0"
//                     style={{
//                       backgroundColor: l.color,
//                       border: l.border ? '0.5px solid #cbd5e1' : undefined,
//                     }}
//                   />
//                   {l.label}
//                 </span>
//               ))}
//             </div>
//             <PipelineFunnelChart stages={stages} loading={pipelineLoading} />
//           </div>

//           {/* Resume stats */}
//           {!isRecruiter && (
//             <div className="px-5 pb-4 shrink-0">
//               <div className="bg-card border border-border rounded-xl p-5">
//                 <div className="flex items-center justify-between mb-1">
//                   <p className="text-[13px] font-semibold text-foreground">Resumes parsed</p>
//                   <Select
//                     value={resumeBreakdownDim}
//                     onValueChange={v => setResumeBreakdownDim(v as typeof resumeBreakdownDim)}
//                   >
//                     <SelectTrigger className="h-7 w-36 text-[11px]">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="department">By department</SelectItem>
//                       <SelectItem value="teamLead">By team lead</SelectItem>
//                       <SelectItem value="businessUnit">By business unit</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="flex gap-4 mb-3">
//                   <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
//                     <span
//                       className="w-2 h-2 rounded-sm shrink-0"
//                       style={{ backgroundColor: '#10B981' }}
//                     />
//                     Resumes
//                   </span>
//                   <span className="text-[11px] text-muted-foreground ml-auto">
//                     {resumeStats?.total ?? 0} total
//                   </span>
//                 </div>
//                 <ResumeBreakdownChart
//                   items={
//                     resumeBreakdownDim === 'department'
//                       ? (resumeStats?.byDepartment ?? [])
//                       : resumeBreakdownDim === 'teamLead'
//                         ? (resumeStats?.byTeamLead ?? [])
//                         : (resumeStats?.byBusinessUnit ?? [])
//                   }
//                   loading={resumeStatsLoading}
//                 />
//               </div>
//             </div>
//           )}

//           {/* BU breakdown */}
//           <div className="bg-card border border-border rounded-xl p-5">
//             <div className="flex items-center justify-between mb-1">
//               <p className="text-[13px] font-semibold text-foreground">By business unit</p>
//               <p className="text-[11px] text-muted-foreground">active requirements</p>
//             </div>
//             <div className="flex gap-4 mb-3">
//               <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
//                 <span
//                   className="w-2 h-2 rounded-sm shrink-0"
//                   style={{ backgroundColor: '#7F77DD' }}
//                 />
//                 Requirements
//               </span>
//             </div>
//             <BUBreakdownChart items={stats?.buBreakdown ?? []} loading={statsLoading} />
//           </div>
//         </div>
//       )}

//       {/* ── Stage cards ── */}
//       <div className="px-5 pb-5">
//         <div className="flex items-center justify-between mb-3">
//           <p className="text-[13px] font-semibold text-foreground">Candidate pipeline</p>
//           <p className="text-[11px] text-muted-foreground">click any stage to view candidates</p>
//         </div>

//         {pipelineLoading ? (
//           <div className="grid grid-cols-5 gap-2">
//             {Array.from({ length: 10 }).map((_, i) => (
//               <Skeleton key={i} className="h-32 rounded-xl" />
//             ))}
//           </div>
//         ) : stages.length === 0 ? (
//           <div className="flex items-center justify-center h-24 text-[12px] text-muted-foreground border border-border rounded-xl">
//             No pipeline data for this period
//           </div>
//         ) : (
//           <div className="grid grid-cols-5 gap-2">
//             {stages.map(stage => (
//               <StageCard key={stage.stageId} stage={stage} dateFrom={dateFrom} dateTo={dateTo} />
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Dashboard content ────────────────────────────────────────────────────────

// function DashboardContent() {
//   const { user } = useAuth();
//   const axios = useAxios();
//   const router = useRouter();

//   const isSuperAdmin = user?.isSuperAdmin ?? false;
//   const isRecruiter = user?.role?.name?.toLowerCase().includes('recruiter') ?? false;

//   const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
//   const [statusFilter, setStatusFilter] = useState('');
//   const [buId, setBuId] = useState('');
//   const [serviceLineId, setServiceLineId] = useState('');
//   const [deptId, setDeptId] = useState('');
//   const [teamLeadId, setTeamLeadId] = useState('');
//   const [reportingToId, setReportingToId] = useState('');

//   const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
//   const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

//   const qs = useMemo(() => {
//     const p = new URLSearchParams();
//     if (dateFrom) p.set('dateFrom', dateFrom);
//     if (dateTo) p.set('dateTo', dateTo);
//     if (teamLeadId) p.set('teamLeadId', teamLeadId);
//     if (reportingToId) p.set('reportingToId', reportingToId);
//     // if (buId) p.set('buId', buId);
//     // if (deptId) p.set('deptId', deptId);
//     // Department filter overrides BU filter
//     if (deptId) {
//       p.set('deptId', deptId);
//     } else if (buId) {
//       p.set('buId', buId);
//     }
//     if (serviceLineId) p.set('serviceLineId', serviceLineId);
//     return p.toString();
//   }, [dateFrom, dateTo, buId, deptId, teamLeadId, reportingToId, serviceLineId]);

//   const { data: hierarchyData } = useQuery({
//     queryKey: ['hierarchy-filters'],
//     queryFn: async () =>
//       (await axios.get('/users/hierarchy-filters')).data?.data as {
//         teamLeads: HierarchyUser[];
//         reportingTo: HierarchyUser[];
//       },
//     enabled: !isRecruiter,
//     staleTime: 5 * 60 * 1000,
//   });

//   const { data: stats, isLoading: statsLoading } = useQuery({
//     queryKey: ['dashboard-stats', qs],
//     queryFn: async () => (await axios.get(`/dashboard/stats?${qs}`)).data?.data as StatsData,
//     staleTime: 30_000,
//   });

//   const { data: pipelineRes, isLoading: pipelineLoading } = useQuery({
//     queryKey: ['dashboard-pipeline-overview', qs],
//     queryFn: async () =>
//       (await axios.get(`/dashboard/pipeline-overview?${qs}`)).data?.data as PipelineOverviewData,
//     staleTime: 30_000,
//   });

//   const { data: assignmentsRes, isLoading: assignmentsLoading } = useQuery({
//     queryKey: ['dashboard-my-assignments'],
//     queryFn: async () => (await axios.get('/dashboard/my-assignments')).data?.data as Assignment[],
//     staleTime: 30_000,
//   });

//   const { data: busData } = useQuery({
//     queryKey: ['bus-filter'],
//     queryFn: async () =>
//       (await axios.get('/business-units?limit=100')).data?.data as { id: string; name: string }[],
//     enabled: !isRecruiter,
//     staleTime: 5 * 60 * 1000,
//   });

//   const { data: slData } = useQuery({
//     queryKey: ['sl-filter'],
//     queryFn: async () =>
//       (await axios.get('/service-lines')).data?.data as { id: string; name: string }[],
//     enabled: !isRecruiter,
//     staleTime: 5 * 60 * 1000,
//   });

//   console.log('slData:', slData);

//   const { data: deptsData } = useQuery({
//     queryKey: ['departments-filter'],
//     queryFn: async () => (await axios.get('/departments?isActive=true')).data?.data as Department[],
//     enabled: isSuperAdmin, // ← only superadmin fetches/sees this
//     staleTime: 5 * 60 * 1000,
//   });

//   const { data: resumeStats, isLoading: resumeStatsLoading } = useQuery({
//     queryKey: ['dashboard-resume-stats', qs],
//     queryFn: async () =>
//       (await axios.get(`/dashboard/resume-stats?${qs}`)).data?.data as ResumeStats,
//     staleTime: 30_000,
//   });

//   const stages = pipelineRes?.stages ?? [];
//   const assignments = assignmentsRes ?? [];

//   const byStatus: Record<string, number> = {
//     ACTIVE: stats?.active ?? 0,
//     ON_HOLD: stats?.onHold ?? 0,
//     CLOSED: stats?.closed ?? 0,
//     PENDING_APPROVAL: stats?.pendingApproval ?? 0,
//     DRAFT: stats?.draft ?? 0,
//   };

//   function navigate(params: Record<string, string>) {
//     const p = new URLSearchParams(params);
//     if (dateFrom) p.set('dateFrom', dateFrom);
//     if (dateTo) p.set('dateTo', dateTo);
//     router.push(`/requirements?${p.toString()}`);
//   }

//   return (
//     <div
//       style={{
//         display: 'flex',
//         flexDirection: 'column',
//         height: 'calc(100vh - 64px)',
//         overflow: 'hidden',
//       }}
//     >
//       {/* ── Top bar ── */}
//       <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background shrink-0">
//         <div>
//           <p className="text-[18px] font-semibold text-foreground leading-tight">
//             {greeting()}, {user?.firstName ?? ''}
//           </p>
//           <p className="text-[12px] text-muted-foreground mt-1">
//             {isSuperAdmin
//               ? 'Full org view — all requirements, assignments and pipeline.'
//               : isRecruiter
//                 ? 'Your active assignments and candidate pipeline.'
//                 : "Here's what's happening across your requirements."}
//           </p>
//         </div>

//         <div className="flex items-center gap-2">
//           <DateRangePicker range={dateRange} onChange={setDateRange} />
//           {!isRecruiter && slData && slData.length > 0 && (
//             <Select
//               value={serviceLineId || '_all'}
//               onValueChange={v => setServiceLineId(v === '_all' ? '' : v)}
//             >
//               <SelectTrigger className="h-8 w-40 text-xs">
//                 <SelectValue placeholder="All service lines" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="_all">All service lines</SelectItem>
//                 {slData.map(s => (
//                   <SelectItem key={s.id} value={s.id}>
//                     {s.name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           )}
//         </div>
//       </div>

//       {/* ── 3-column layout ── */}
//       <div
//         style={{
//           display: 'grid',
//           gridTemplateColumns: '210px 1fr 256px',
//           flex: 1,
//           minHeight: 0,
//           overflow: 'hidden',
//         }}
//       >
//         <div style={{ height: '100%', overflow: 'hidden' }}>
//           <Sidebar
//             statusFilter={statusFilter}
//             onStatusChange={setStatusFilter}
//             buId={buId}
//             onBuChange={setBuId}
//             deptId={deptId}
//             onDeptChange={setDeptId}
//             serviceLineId={serviceLineId}
//             onSlChange={setServiceLineId}
//             byStatus={byStatus}
//             busData={busData}
//             deptsData={deptsData}
//             slData={slData}
//             isRecruiter={isRecruiter}
//             isSuperAdmin={isSuperAdmin}
//             teamLeadId={teamLeadId}
//             onTeamLeadChange={setTeamLeadId}
//             reportingToId={reportingToId}
//             onReportingToChange={setReportingToId}
//             hierarchyData={hierarchyData}
//           />
//         </div>

//         <div style={{ height: '100%', overflow: 'hidden' }}>
//           <MainContent
//             stats={stats}
//             statsLoading={statsLoading}
//             stages={stages}
//             pipelineLoading={pipelineLoading}
//             dateFrom={dateFrom}
//             dateTo={dateTo}
//             isRecruiter={isRecruiter}
//             assignments={assignments}
//             assignmentsLoading={assignmentsLoading}
//             onNavigate={navigate}
//             resumeStats={resumeStats}
//             resumeStatsLoading={resumeStatsLoading}
//           />
//         </div>

//         <div style={{ height: '100%', overflow: 'hidden' }}>
//           <RightPanel
//             dateRange={dateRange}
//             onDateChange={setDateRange}
//             assignments={assignments}
//             loading={assignmentsLoading}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function DashboardPage() {
//   return (
//     <Suspense fallback={null}>
//       <DashboardContent />
//     </Suspense>
//   );
// }

// File: page.tsx
// Path: src/app/(dashboard)/dashboard/page.tsx

'use client';

import { Suspense, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  Briefcase,
  CalendarIcon,
  X,
  ChevronRight,
  PauseCircle,
  Building2,
  FileText,
  Ban,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
// import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatsData {
  totalRequirements: number;
  active: number;
  pendingApproval: number;
  draft: number;
  onHold: number;
  closed: number;
  breached: number;
  thisWeek: number;
  highPriority: number;
  totalClients: number;
  totalCandidates: number;
  buBreakdown: { id: string; name: string; count: number }[];
  slBreakdown: { id: string; name: string; count: number }[];
}

interface PipelineStageOverview {
  stageId: string;
  code: string;
  label: string;
  order: number;
  serviceLineId: string | null;
  isTerminal: boolean;
  total: number;
  active: number;
  rejected: number;
  withdrawn: number;
  onHold: number;
  inactive: number;
}

interface PipelineOverviewData {
  summary: {
    totalCandidates: number;
    activeCandidates: number;
    inactiveCandidates: number;
    onHold: number;
  };
  stages: PipelineStageOverview[];
}

interface Assignment {
  id: string;
  depth: number;
  allocatedOpenings: number | null;
  filledOpenings: number;
  submissionsCount: number;
  deadline: string | null;
  breachedAt: string | null;
  assignedAt: string;
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    totalOpenings: number;
    client: { id: string; name: string } | null;
    serviceLine: { id: string; name: string } | null;
    isRespondByBreached: boolean;
    respondBy: string | null;
  };
  pipelines: { id: string }[];
}

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface HierarchyUser {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  isActive: boolean;
}

interface ResumeStats {
  total: number;
  bySource: { source: string; count: number }[];
  byDepartment: { id: string; name: string; count: number }[];
  byTeamLead: { id: string; name: string; count: number }[];
  byBusinessUnit: { id: string; name: string; count: number }[];
  byRecruiter: { recruiterId: string; name: string; count: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  '01': '#f97316',
  '02': '#7c3aed',
  '03': '#f43f5e',
  '04': '#ec4899',
  '05': '#06b6d4',
  '06': '#14b8a6',
  '07': '#3b82f6',
  '07A': '#60a5fa',
  '07B': '#1d4ed8',
  '08': '#6366f1',
  '09': '#10b981',
  '10': '#94a3b8',
};

const PRESETS = [
  { label: 'Today', from: () => new Date(), to: () => new Date() },
  { label: 'Last 7 days', from: () => subDays(new Date(), 6), to: () => new Date() },
  { label: 'Last 30 days', from: () => subDays(new Date(), 29), to: () => new Date() },
  { label: 'This month', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
  { label: 'This year', from: () => startOfYear(new Date()), to: () => new Date() },
];

const SIDEBAR_STATUSES = [
  { key: 'ACTIVE', label: 'Active', color: '#639922' },
  { key: 'ON_HOLD', label: 'On hold', color: '#BA7517' },
  { key: 'PENDING_APPROVAL', label: 'Pending', color: '#378ADD' },
  { key: 'DRAFT', label: 'Draft', color: '#888780' },
  { key: 'CLOSED', label: 'Closed', color: '#888780' },
  { key: 'CANCELLED', label: 'Cancelled', color: '#888780' },
];

// ─── Chart configs ────────────────────────────────────────────────────────────

const funnelChartConfig: ChartConfig = {
  active: { label: 'Active', color: '#378ADD' },
  onHold: { label: 'On hold', color: '#EF9F27' },
  inactive: { label: 'Inactive', color: '#e2e8f0' },
};

const buChartConfig: ChartConfig = {
  count: { label: 'Requirements', color: '#7F77DD' },
};

const resumeChartConfig: ChartConfig = {
  count: { label: 'Resumes parsed', color: '#10B981' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function stageColor(code: string) {
  return STAGE_COLORS[code] ?? '#94a3b8';
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#E24B4A',
  MEDIUM: '#BA7517',
  LOW: '#639922',
};

// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangePicker({
  range,
  onChange,
}: {
  range: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  const label =
    range?.from && range?.to
      ? `${format(range.from, 'dd MMM yy')} – ${format(range.to, 'dd MMM yy')}`
      : range?.from
        ? `From ${format(range.from, 'dd MMM yy')}`
        : 'All time';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-medium',
            range?.from && 'border-primary/40 bg-primary/5 text-primary'
          )}
        >
          <CalendarIcon size={13} />
          {label}
          {range?.from && (
            <span
              role="button"
              aria-label="Clear date range"
              onClick={e => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={11} />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="flex flex-col gap-0.5 border-r border-border p-3 w-32">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1 px-1">
              Quick select
            </p>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => {
                  onChange({ from: p.from(), to: p.to() });
                  setOpen(false);
                }}
                className="text-left px-2 py-1.5 rounded-md text-[12px] text-foreground hover:bg-muted transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={onChange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              initialFocus
            />
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor,
  loading,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  accentColor: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
      className={cn(
        'bg-card border border-border rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden',
        onClick && 'cursor-pointer hover:shadow-sm hover:border-border/80 transition-all'
      )}
    >
      {/* faint icon watermark */}
      <div
        className="absolute right-4 top-4 opacity-[0.07]"
        style={{ color: accentColor }}
        aria-hidden
      >
        <Icon size={40} />
      </div>

      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>

      {loading ? (
        <Skeleton className="h-10 w-16 mt-1" />
      ) : (
        <p
          className="text-[42px] font-semibold tabular-nums leading-none"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {value}
        </p>
      )}

      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}

      {/* bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
        style={{ background: accentColor }}
      />
    </div>
  );
}

// ─── Pipeline Funnel Chart ────────────────────────────────────────────────────

function PipelineFunnelChart({
  stages,
  loading,
}: {
  stages: PipelineStageOverview[];
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-[220px] w-full" />;

  const data = stages.map(s => ({
    name: s.label.length > 9 ? s.label.slice(0, 9) + '…' : s.label,
    fullLabel: s.label,
    active: s.active,
    onHold: s.onHold,
    inactive: s.inactive,
    code: s.code,
  }));

  return (
    <ChartContainer config={funnelChartConfig} className="h-[220px] w-full">
      <BarChart data={data} barSize={16} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        {/* <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          interval={0}
        /> */}
        <XAxis
          dataKey="name"
          interval={0}
          angle={-40}
          textAnchor="end"
          height={60}
          tick={{
            fontSize: 10,
            fill: 'hsl(var(--muted-foreground))',
          }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
            />
          }
        />
        <Bar dataKey="active" stackId="a" fill="var(--color-active)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="onHold" stackId="a" fill="var(--color-onHold)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="inactive" stackId="a" fill="var(--color-inactive)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

// ─── BU Breakdown Chart ───────────────────────────────────────────────────────

function BUBreakdownChart({
  items,
  loading,
}: {
  items: { id: string; name: string; count: number }[];
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-[220px] w-full" />;

  const data = items.slice(0, 6).map(i => ({
    name: i.name.length > 18 ? i.name.slice(0, 18) + '…' : i.name,
    fullName: i.name,
    count: i.count,
  }));

  return (
    <ChartContainer config={buChartConfig} className="h-[220px] w-full">
      <BarChart
        layout="vertical"
        data={data}
        barSize={14}
        margin={{ top: 4, right: 28, left: 4, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
            />
          }
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill="#7F77DD" fillOpacity={1 - i * 0.12} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ─── Resume Breakdown Chart (generic — dept / team-lead / BU) ────────────────

function ResumeBreakdownChart({
  items,
  loading,
}: {
  items: { id: string; name: string; count: number }[];
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-[220px] w-full" />;

  const data = items.slice(0, 6).map(i => ({
    name: i.name.length > 18 ? i.name.slice(0, 18) + '…' : i.name,
    fullName: i.name,
    count: i.count,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-[12px] text-muted-foreground">
        No data for this period
      </div>
    );
  }

  return (
    <ChartContainer config={resumeChartConfig} className="h-[220px] w-full">
      <BarChart
        layout="vertical"
        data={data}
        barSize={14}
        margin={{ top: 4, right: 28, left: 4, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
            />
          }
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill="#10B981" fillOpacity={1 - i * 0.12} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ─── Stage Card ───────────────────────────────────────────────────────────────

function StageCard({
  stage,
  dateFrom,
  dateTo,
}: {
  stage: PipelineStageOverview;
  dateFrom?: string;
  dateTo?: string;
}) {
  const router = useRouter();
  const color = stageColor(stage.code);
  const pct = stage.total > 0 ? Math.round((stage.active / stage.total) * 100) : 0;

  function go() {
    const p = new URLSearchParams({ stageId: stage.stageId });
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    router.push(`/requirements?${p.toString()}`);
  }

  return (
    <div
      onClick={go}
      className="bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:border-border/70 hover:shadow-sm transition-all group"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] font-mono font-semibold tracking-wide" style={{ color }}>
          {stage.code}
        </span>
        <ChevronRight
          size={12}
          className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-px"
        />
      </div>
      <p className="text-[11.5px] text-muted-foreground leading-tight mb-3 min-h-[30px] line-clamp-2">
        {stage.label}
      </p>
      <p
        className="text-[32px] font-semibold tabular-nums leading-none mb-3"
        style={{ color: stage.total === 0 ? 'hsl(var(--muted-foreground))' : color }}
      >
        {stage.total}
      </p>
      <div className="h-[3px] rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{stage.active > 0 ? `${stage.active} active` : '—'}</span>
        <span>{stage.onHold > 0 ? `${stage.onHold} hold` : '—'}</span>
      </div>
    </div>
  );
}

// ─── Assignment Row ───────────────────────────────────────────────────────────

function AssignmentRow({ a }: { a: Assignment }) {
  const router = useRouter();
  const isBreached = a.requirement.isRespondByBreached || !!a.breachedAt;
  const fillPct =
    a.requirement.totalOpenings > 0
      ? Math.round((a.filledOpenings / a.requirement.totalOpenings) * 100)
      : 0;

  const priorityColor = PRIORITY_COLOR[a.requirement.priority] ?? '#888780';

  return (
    <div
      onClick={() => router.push(`/requirements/${a.requirement.id}`)}
      className={cn(
        'px-4 py-3.5 border-b border-border/60 hover:bg-muted/40 cursor-pointer transition-colors',
        isBreached && 'border-l-2 border-l-destructive pl-[14px]'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-mono text-muted-foreground">{a.requirement.reqCode}</p>
        {isBreached && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-destructive">
            <AlertCircle size={10} />
            breached
          </span>
        )}
      </div>

      <p className="text-[13px] font-semibold text-foreground leading-tight mb-1.5 flex items-center gap-1.5">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
          style={{ backgroundColor: priorityColor }}
        />
        {a.requirement.title}
      </p>

      <p className="text-[11px] text-muted-foreground mb-2 truncate">
        {a.requirement.client?.name}
        {a.requirement.serviceLine ? ` · ${a.requirement.serviceLine.name}` : ''}
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fillPct}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {a.filledOpenings}/{a.requirement.totalOpenings} filled
        </span>
      </div>
    </div>
  );
}

// ─── Recruiter Hero (shown instead of stat grid for recruiters) ───────────────

function RecruiterHero({ assignments, loading }: { assignments: Assignment[]; loading: boolean }) {
  const total = assignments.length;
  const breached = assignments.filter(
    a => a.requirement.isRespondByBreached || !!a.breachedAt
  ).length;
  const submitted = assignments.reduce((s, a) => s + a.submissionsCount, 0);
  const filled = assignments.reduce((s, a) => s + a.filledOpenings, 0);

  return (
    <div className="grid grid-cols-5 gap-3 px-5 py-4 shrink-0">
      <StatCard
        label="My assignments"
        value={total}
        sub="active requirements"
        icon={Briefcase}
        accentColor="#378ADD"
        loading={loading}
      />
      <StatCard
        label="Candidates submitted"
        value={submitted}
        sub="total submissions"
        icon={Users}
        accentColor="#639922"
        loading={loading}
      />
      <StatCard
        label="Openings filled"
        value={filled}
        sub="across assignments"
        icon={CheckCircle2}
        accentColor="#7F77DD"
        loading={loading}
      />
      <StatCard
        label="Breached"
        value={breached}
        sub="deadline passed"
        icon={AlertTriangle}
        accentColor="#E24B4A"
        loading={loading}
      />
    </div>
  );
}

// ─── Utility functions ───────────────────────────────────────────────────────
function fullName(u: HierarchyUser) {
  return `${u.firstName} ${u.lastName}`.trim();
}

// ─── Filter Bar (all dropdown filters, top of page) ──────────────────────────

function FilterBar({
  dateRange,
  onDateChange,
  buId,
  onBuChange,
  deptId,
  onDeptChange,
  serviceLineId,
  onSlChange,
  teamLeadId,
  onTeamLeadChange,
  reportingToId,
  onReportingToChange,
  busData,
  deptsData,
  slData,
  hierarchyData,
  isRecruiter,
}: {
  dateRange: DateRange | undefined;
  onDateChange: (r: DateRange | undefined) => void;
  buId: string;
  onBuChange: (v: string) => void;
  deptId: string;
  onDeptChange: (v: string) => void;
  serviceLineId: string;
  onSlChange: (v: string) => void;
  teamLeadId: string;
  onTeamLeadChange: (v: string) => void;
  reportingToId: string;
  onReportingToChange: (v: string) => void;
  busData: { id: string; name: string }[] | undefined;
  deptsData: Department[] | undefined;
  slData: { id: string; name: string }[] | undefined;
  hierarchyData: { teamLeads: HierarchyUser[]; reportingTo: HierarchyUser[] } | undefined;
  isRecruiter: boolean;
}) {
  const hasAnyFilter =
    !!buId || !!deptId || !!teamLeadId || !!reportingToId || !!serviceLineId || !!dateRange?.from;

  function clearAll() {
    onBuChange('');
    onDeptChange('');
    onTeamLeadChange('');
    onReportingToChange('');
    onSlChange('');
    onDateChange(undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border bg-background shrink-0">
      <DateRangePicker range={dateRange} onChange={onDateChange} />

      {!isRecruiter && busData && busData.length > 0 && (
        <Select value={buId || '_all'} onValueChange={v => onBuChange(v === '_all' ? '' : v)}>
          <SelectTrigger className="h-8 w-[150px] text-xs gap-1.5">
            <Building2 size={12} className="text-muted-foreground shrink-0" />
            <SelectValue placeholder="All BUs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All BUs</SelectItem>
            {busData.map(b => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {deptsData && deptsData.length > 0 && (
        <Select value={deptId || '_all'} onValueChange={v => onDeptChange(v === '_all' ? '' : v)}>
          <SelectTrigger className="h-8 w-[170px] text-xs gap-1.5">
            <Building2 size={12} className="text-muted-foreground shrink-0" />
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All departments</SelectItem>
            {deptsData.map(d => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!isRecruiter && hierarchyData?.teamLeads && hierarchyData.teamLeads.length > 0 && (
        <Select
          value={teamLeadId || '_all'}
          onValueChange={v => onTeamLeadChange(v === '_all' ? '' : v)}
        >
          <SelectTrigger className="h-8 w-[170px] text-xs gap-1.5">
            <Users size={12} className="text-muted-foreground shrink-0" />
            <SelectValue placeholder="All team leads" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All team leads</SelectItem>
            {hierarchyData.teamLeads.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {fullName(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!isRecruiter && hierarchyData?.reportingTo && hierarchyData.reportingTo.length > 0 && (
        <Select
          value={reportingToId || '_all'}
          onValueChange={v => onReportingToChange(v === '_all' ? '' : v)}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs gap-1.5">
            <Users size={12} className="text-muted-foreground shrink-0" />
            <SelectValue placeholder="All managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All managers</SelectItem>
            {hierarchyData.reportingTo.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {fullName(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!isRecruiter && slData && slData.length > 0 && (
        <Select
          value={serviceLineId || '_all'}
          onValueChange={v => onSlChange(v === '_all' ? '' : v)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All service lines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All service lines</SelectItem>
            {slData.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasAnyFilter && (
        <button
          onClick={clearAll}
          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 ml-1"
        >
          <X size={11} /> Clear all
        </button>
      )}
    </div>
  );
}

// ─── Status Tabs ──────────────────────────────────────────────────────────────

function StatusTabs({
  statusFilter,
  onStatusChange,
  byStatus,
}: {
  statusFilter: string;
  onStatusChange: (v: string) => void;
  byStatus: Record<string, number>;
}) {
  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  const tabs = [
    { key: '_all', label: 'All', count: total },
    ...SIDEBAR_STATUSES.map(s => ({ key: s.key, label: s.label, count: byStatus[s.key] ?? 0 })),
  ];

  return (
    <div className="px-5 pt-3 shrink-0">
      {/* <Tabs
        value={statusFilter || '_all'}
        onValueChange={v => onStatusChange(v === '_all' ? '' : v)}
      >
        <TabsList className="h-9 bg-muted/50">
          {tabs.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="text-[12px] gap-1.5">
              {t.label}
              {t.count > 0 && (
                <span className="text-[10px] tabular-nums text-muted-foreground">{t.count}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs> */}
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({
  dateRange,
  onDateChange,
  assignments,
  loading,
}: {
  dateRange: DateRange | undefined;
  onDateChange: (r: DateRange | undefined) => void;
  assignments: Assignment[];
  loading: boolean;
}) {
  const breachedCount = assignments.filter(
    a => a.requirement.isRespondByBreached || !!a.breachedAt
  ).length;

  // Sort: breached first, then by assigned date desc
  const sorted = [...assignments].sort((a, b) => {
    const aB = a.requirement.isRespondByBreached || !!a.breachedAt ? 1 : 0;
    const bB = b.requirement.isRespondByBreached || !!b.breachedAt ? 1 : 0;
    return bB - aB;
  });

  return (
    <div
      className="bg-card border-l border-border flex flex-col"
      style={{ height: '100%', overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="px-4 py-5 border-b border-border shrink-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[13px] font-semibold text-foreground">My assignments</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {assignments.length} active
              {breachedCount > 0 && (
                <span className="text-destructive font-medium ml-1">
                  · {breachedCount} breached
                </span>
              )}
            </p>
          </div>
          {breachedCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded-md">
              <AlertCircle size={11} />
              {breachedCount}
            </span>
          )}
        </div>
      </div>

      {/* Mini date range */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
          Date range
        </p>
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateChange}
          numberOfMonths={1}
          disabled={{ after: new Date() }}
          className="p-0 text-xs [&_td]:p-0 [&_th]:p-0 [&_button]:h-7 [&_button]:w-7 [&_button]:text-[11px]"
        />
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <div
            className={cn(
              'px-2 py-1.5 rounded-md border text-[10.5px] text-center',
              dateRange?.from
                ? 'border-primary/40 bg-primary/5 text-primary'
                : 'border-border text-muted-foreground'
            )}
          >
            {dateRange?.from ? format(dateRange.from, 'dd MMM yy') : 'Start'}
          </div>
          <div
            className={cn(
              'px-2 py-1.5 rounded-md border text-[10.5px] text-center',
              dateRange?.to
                ? 'border-primary/40 bg-primary/5 text-primary'
                : 'border-border text-muted-foreground'
            )}
          >
            {dateRange?.to ? format(dateRange.to, 'dd MMM yy') : 'End'}
          </div>
        </div>
        {dateRange?.from && (
          <button
            onClick={() => onDateChange(undefined)}
            className="w-full mt-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center gap-1"
          >
            <X size={10} /> Clear range
          </button>
        )}
      </div>

      {/* Assignment list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 gap-2 text-muted-foreground">
            <Briefcase size={20} className="opacity-40" />
            <p className="text-[12px]">No active assignments</p>
          </div>
        ) : (
          sorted.map(a => <AssignmentRow key={a.id} a={a} />)
        )}
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function MainContent({
  stats,
  statsLoading,
  stages,
  pipelineLoading,
  dateFrom,
  dateTo,
  isRecruiter,
  assignments,
  assignmentsLoading,
  onNavigate,
  resumeStats,
  resumeStatsLoading,
}: {
  stats: StatsData | undefined;
  statsLoading: boolean;
  stages: PipelineStageOverview[];
  pipelineLoading: boolean;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  isRecruiter: boolean;
  assignments: Assignment[];
  assignmentsLoading: boolean;
  onNavigate: (params: Record<string, string>) => void;
  resumeStats: ResumeStats | undefined;
  resumeStatsLoading: boolean;
}) {
  const [resumeBreakdownDim, setResumeBreakdownDim] = useState<
    'department' | 'teamLead' | 'businessUnit'
  >('department');
  return (
    <div className="flex flex-col overflow-y-auto bg-background" style={{ height: '100%' }}>
      {/* ── Recruiter hero OR admin stat cards ── */}
      {isRecruiter ? (
        <RecruiterHero assignments={assignments} loading={assignmentsLoading} />
      ) : (
        <div className="grid grid-cols-5 gap-3 px-5 py-4 shrink-0">
          <StatCard
            label="Active requirements"
            value={stats?.active ?? 0}
            sub={`of ${stats?.totalRequirements ?? 0} total`}
            icon={Zap}
            accentColor="#639922"
            loading={statsLoading}
            onClick={() => onNavigate({ status: 'ACTIVE' })}
          />
          <StatCard
            label="High priority"
            value={stats?.highPriority ?? 0}
            sub="active requirements"
            icon={TrendingUp}
            accentColor="#E24B4A"
            loading={statsLoading}
            onClick={() => onNavigate({ status: 'ACTIVE', priority: 'HIGH' })}
          />
          <StatCard
            label="Breached"
            value={stats?.breached ?? 0}
            sub="deadline passed"
            icon={AlertTriangle}
            accentColor="#BA7517"
            loading={statsLoading}
            onClick={() => onNavigate({ breached: 'true' })}
          />
          <StatCard
            label="In pipeline"
            value={stats?.totalCandidates ?? 0}
            sub="across all stages"
            icon={Users}
            accentColor="#378ADD"
            loading={statsLoading}
          />
          <StatCard
            label="Resumes parsed"
            value={resumeStats?.total ?? 0}
            sub="across all sources"
            icon={FileText}
            accentColor="#10B981"
            loading={resumeStatsLoading}
          />
        </div>
      )}

      {/* ── Charts (non-recruiter) ── */}
      {/* {!isRecruiter && (
        <div className="grid grid-cols-2 gap-3 px-5 pb-4 shrink-0"> */}
      {/* Pipeline funnel */}
      {/* <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[13px] font-semibold text-foreground">Pipeline funnel</p>
              <p className="text-[11px] text-muted-foreground">candidates by stage</p>
            </div>
            <div className="flex gap-4 mb-3">
              {[
                { color: '#378ADD', label: 'Active' },
                { color: '#EF9F27', label: 'On hold' },
                { color: '#e2e8f0', label: 'Inactive', border: true },
              ].map(l => (
                <span
                  key={l.label}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{
                      backgroundColor: l.color,
                      border: l.border ? '0.5px solid #cbd5e1' : undefined,
                    }}
                  />
                  {l.label}
                </span>
              ))}
            </div>
            <PipelineFunnelChart stages={stages} loading={pipelineLoading} />
          </div> */}

      {/* Resume stats */}
      {/* {!isRecruiter && (
            <div className="px-5 pb-4 shrink-0">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-semibold text-foreground">Resumes parsed</p>
                  <Select
                    value={resumeBreakdownDim}
                    onValueChange={v => setResumeBreakdownDim(v as typeof resumeBreakdownDim)}
                  >
                    <SelectTrigger className="h-7 w-36 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department">By department</SelectItem>
                      <SelectItem value="teamLead">By team lead</SelectItem>
                      <SelectItem value="businessUnit">By business unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-4 mb-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: '#10B981' }}
                    />
                    Resumes
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {resumeStats?.total ?? 0} total
                  </span>
                </div>
                <ResumeBreakdownChart
                  items={
                    resumeBreakdownDim === 'department'
                      ? (resumeStats?.byDepartment ?? [])
                      : resumeBreakdownDim === 'teamLead'
                        ? (resumeStats?.byTeamLead ?? [])
                        : (resumeStats?.byBusinessUnit ?? [])
                  }
                  loading={resumeStatsLoading}
                />
              </div>
            </div>
          )} */}

      {/* BU breakdown */}
      {/* <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[13px] font-semibold text-foreground">By business unit</p>
              <p className="text-[11px] text-muted-foreground">active requirements</p>
            </div>
            <div className="flex gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: '#7F77DD' }}
                />
                Requirements
              </span>
            </div>
            <BUBreakdownChart items={stats?.buBreakdown ?? []} loading={statsLoading} />
          </div>
        </div>
      )} */}

      {!isRecruiter && (
        <div className="px-5 pb-4 shrink-0 space-y-3">
          {/* ========================= FIRST ROW ========================= */}
          {/* Pipeline funnel */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[13px] font-semibold text-foreground">Pipeline funnel</p>
              <p className="text-[11px] text-muted-foreground">candidates by stage</p>
            </div>

            <div className="flex gap-4 mb-3">
              {[
                { color: '#378ADD', label: 'Active' },
                { color: '#EF9F27', label: 'On hold' },
                { color: '#e2e8f0', label: 'Inactive', border: true },
              ].map(l => (
                <span
                  key={l.label}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{
                      backgroundColor: l.color,
                      border: l.border ? '0.5px solid #cbd5e1' : undefined,
                    }}
                  />
                  {l.label}
                </span>
              ))}
            </div>

            <PipelineFunnelChart stages={stages} loading={pipelineLoading} />
          </div>

          {/* ========================= SECOND ROW ========================= */}
          <div className="grid grid-cols-2 gap-3">
            {/* Resume stats */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold text-foreground">Resumes parsed</p>

                <Select
                  value={resumeBreakdownDim}
                  onValueChange={v => setResumeBreakdownDim(v as typeof resumeBreakdownDim)}
                >
                  <SelectTrigger className="h-7 w-36 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="department">By department</SelectItem>
                    <SelectItem value="teamLead">By team lead</SelectItem>
                    <SelectItem value="businessUnit">By business unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: '#10B981' }}
                  />
                  Resumes
                </span>

                <span className="text-[11px] text-muted-foreground ml-auto">
                  {resumeStats?.total ?? 0} total
                </span>
              </div>

              <ResumeBreakdownChart
                items={
                  resumeBreakdownDim === 'department'
                    ? (resumeStats?.byDepartment ?? [])
                    : resumeBreakdownDim === 'teamLead'
                      ? (resumeStats?.byTeamLead ?? [])
                      : (resumeStats?.byBusinessUnit ?? [])
                }
                loading={resumeStatsLoading}
              />
            </div>

            {/* BU breakdown */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold text-foreground">By business unit</p>

                <p className="text-[11px] text-muted-foreground">active requirements</p>
              </div>

              <div className="flex gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: '#7F77DD' }}
                  />
                  Requirements
                </span>
              </div>

              <BUBreakdownChart items={stats?.buBreakdown ?? []} loading={statsLoading} />
            </div>
          </div>
        </div>
      )}

      {/* ── Stage cards ── */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-foreground">Candidate pipeline</p>
          <p className="text-[11px] text-muted-foreground">click any stage to view candidates</p>
        </div>

        {pipelineLoading ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[12px] text-muted-foreground border border-border rounded-xl">
            No pipeline data for this period
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {stages.map(stage => (
              <StageCard key={stage.stageId} stage={stage} dateFrom={dateFrom} dateTo={dateTo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard content ────────────────────────────────────────────────────────

function DashboardContent() {
  const { user } = useAuth();
  const axios = useAxios();
  const router = useRouter();

  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const isRecruiter = user?.role?.name?.toLowerCase().includes('recruiter') ?? false;

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState('');
  const [buId, setBuId] = useState('');
  const [serviceLineId, setServiceLineId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [reportingToId, setReportingToId] = useState('');

  const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    if (teamLeadId) p.set('teamLeadId', teamLeadId);
    if (reportingToId) p.set('reportingToId', reportingToId);
    // if (buId) p.set('buId', buId);
    // if (deptId) p.set('deptId', deptId);
    // Department filter overrides BU filter
    if (deptId) {
      p.set('deptId', deptId);
    } else if (buId) {
      p.set('buId', buId);
    }
    if (serviceLineId) p.set('serviceLineId', serviceLineId);
    return p.toString();
  }, [dateFrom, dateTo, buId, deptId, teamLeadId, reportingToId, serviceLineId]);

  const { data: hierarchyData } = useQuery({
    queryKey: ['hierarchy-filters'],
    queryFn: async () =>
      (await axios.get('/users/hierarchy-filters')).data?.data as {
        teamLeads: HierarchyUser[];
        reportingTo: HierarchyUser[];
      },
    enabled: !isRecruiter,
    staleTime: 5 * 60 * 1000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', qs],
    queryFn: async () => (await axios.get(`/dashboard/stats?${qs}`)).data?.data as StatsData,
    staleTime: 30_000,
  });

  const { data: pipelineRes, isLoading: pipelineLoading } = useQuery({
    queryKey: ['dashboard-pipeline-overview', qs],
    queryFn: async () =>
      (await axios.get(`/dashboard/pipeline-overview?${qs}`)).data?.data as PipelineOverviewData,
    staleTime: 30_000,
  });

  const { data: assignmentsRes, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['dashboard-my-assignments'],
    queryFn: async () => (await axios.get('/dashboard/my-assignments')).data?.data as Assignment[],
    staleTime: 30_000,
  });

  const { data: busData } = useQuery({
    queryKey: ['bus-filter'],
    queryFn: async () =>
      (await axios.get('/business-units?limit=100')).data?.data as { id: string; name: string }[],
    enabled: !isRecruiter,
    staleTime: 5 * 60 * 1000,
  });

  const { data: slData } = useQuery({
    queryKey: ['sl-filter'],
    queryFn: async () =>
      (await axios.get('/service-lines')).data?.data as { id: string; name: string }[],
    enabled: !isRecruiter,
    staleTime: 5 * 60 * 1000,
  });

  console.log('slData:', slData);

  const { data: deptsData } = useQuery({
    queryKey: ['departments-filter'],
    queryFn: async () => (await axios.get('/departments?isActive=true')).data?.data as Department[],
    enabled: isSuperAdmin, // ← only superadmin fetches/sees this
    staleTime: 5 * 60 * 1000,
  });

  const { data: resumeStats, isLoading: resumeStatsLoading } = useQuery({
    queryKey: ['dashboard-resume-stats', qs],
    queryFn: async () =>
      (await axios.get(`/dashboard/resume-stats?${qs}`)).data?.data as ResumeStats,
    staleTime: 30_000,
  });

  const stages = pipelineRes?.stages ?? [];
  const assignments = assignmentsRes ?? [];

  const byStatus: Record<string, number> = {
    ACTIVE: stats?.active ?? 0,
    ON_HOLD: stats?.onHold ?? 0,
    CLOSED: stats?.closed ?? 0,
    PENDING_APPROVAL: stats?.pendingApproval ?? 0,
    DRAFT: stats?.draft ?? 0,
  };

  function navigate(params: Record<string, string>) {
    const p = new URLSearchParams(params);
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    router.push(`/requirements?${p.toString()}`);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background shrink-0">
        <div>
          <p className="text-[18px] font-semibold text-foreground leading-tight">
            {greeting()}, {user?.firstName ?? ''}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {isSuperAdmin
              ? 'Full org view — all requirements, assignments and pipeline.'
              : isRecruiter
                ? 'Your active assignments and candidate pipeline.'
                : "Here's what's happening across your requirements."}
          </p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <FilterBar
        dateRange={dateRange}
        onDateChange={setDateRange}
        buId={buId}
        onBuChange={setBuId}
        deptId={deptId}
        onDeptChange={setDeptId}
        serviceLineId={serviceLineId}
        onSlChange={setServiceLineId}
        teamLeadId={teamLeadId}
        onTeamLeadChange={setTeamLeadId}
        reportingToId={reportingToId}
        onReportingToChange={setReportingToId}
        busData={busData}
        deptsData={deptsData}
        slData={slData}
        hierarchyData={hierarchyData}
        isRecruiter={isRecruiter}
      />

      {/* ── Status tabs (non-recruiter only) ── */}
      {!isRecruiter && (
        <StatusTabs
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          byStatus={byStatus}
        />
      )}

      {/* ── 2-column layout: main + right panel ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 256px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <MainContent
            stats={stats}
            statsLoading={statsLoading}
            stages={stages}
            pipelineLoading={pipelineLoading}
            dateFrom={dateFrom}
            dateTo={dateTo}
            isRecruiter={isRecruiter}
            assignments={assignments}
            assignmentsLoading={assignmentsLoading}
            onNavigate={navigate}
            resumeStats={resumeStats}
            resumeStatsLoading={resumeStatsLoading}
          />
        </div>

        <div style={{ height: '100%', overflow: 'hidden' }}>
          <RightPanel
            dateRange={dateRange}
            onDateChange={setDateRange}
            assignments={assignments}
            loading={assignmentsLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

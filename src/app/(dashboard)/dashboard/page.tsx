// File: page.tsx
// Path: src/app/(dashboard)/dashboard/page.tsx

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
// // import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
//         {/* <XAxis
//           dataKey="name"
//           tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
//           tickLine={false}
//           axisLine={false}
//           interval={0}
//         /> */}
//         <XAxis
//           dataKey="name"
//           interval={0}
//           angle={-40}
//           textAnchor="end"
//           height={60}
//           tick={{
//             fontSize: 10,
//             fill: 'hsl(var(--muted-foreground))',
//           }}
//           tickLine={false}
//           axisLine={false}
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

// // ─── Filter Bar (all dropdown filters, top of page) ──────────────────────────

// function FilterBar({
//   dateRange,
//   onDateChange,
//   buId,
//   onBuChange,
//   deptId,
//   onDeptChange,
//   serviceLineId,
//   onSlChange,
//   teamLeadId,
//   onTeamLeadChange,
//   reportingToId,
//   onReportingToChange,
//   busData,
//   deptsData,
//   slData,
//   hierarchyData,
//   isRecruiter,
// }: {
//   dateRange: DateRange | undefined;
//   onDateChange: (r: DateRange | undefined) => void;
//   buId: string;
//   onBuChange: (v: string) => void;
//   deptId: string;
//   onDeptChange: (v: string) => void;
//   serviceLineId: string;
//   onSlChange: (v: string) => void;
//   teamLeadId: string;
//   onTeamLeadChange: (v: string) => void;
//   reportingToId: string;
//   onReportingToChange: (v: string) => void;
//   busData: { id: string; name: string }[] | undefined;
//   deptsData: Department[] | undefined;
//   slData: { id: string; name: string }[] | undefined;
//   hierarchyData: { teamLeads: HierarchyUser[]; reportingTo: HierarchyUser[] } | undefined;
//   isRecruiter: boolean;
// }) {
//   const hasAnyFilter =
//     !!buId || !!deptId || !!teamLeadId || !!reportingToId || !!serviceLineId || !!dateRange?.from;

//   function clearAll() {
//     onBuChange('');
//     onDeptChange('');
//     onTeamLeadChange('');
//     onReportingToChange('');
//     onSlChange('');
//     onDateChange(undefined);
//   }

//   return (
//     <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border bg-background shrink-0">
//       <DateRangePicker range={dateRange} onChange={onDateChange} />

//       {!isRecruiter && busData && busData.length > 0 && (
//         <Select value={buId || '_all'} onValueChange={v => onBuChange(v === '_all' ? '' : v)}>
//           <SelectTrigger className="h-8 w-[150px] text-xs gap-1.5">
//             <Building2 size={12} className="text-muted-foreground shrink-0" />
//             <SelectValue placeholder="All BUs" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="_all">All BUs</SelectItem>
//             {busData.map(b => (
//               <SelectItem key={b.id} value={b.id}>
//                 {b.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       )}

//       {deptsData && deptsData.length > 0 && (
//         <Select value={deptId || '_all'} onValueChange={v => onDeptChange(v === '_all' ? '' : v)}>
//           <SelectTrigger className="h-8 w-[170px] text-xs gap-1.5">
//             <Building2 size={12} className="text-muted-foreground shrink-0" />
//             <SelectValue placeholder="All departments" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="_all">All departments</SelectItem>
//             {deptsData.map(d => (
//               <SelectItem key={d.id} value={d.id}>
//                 {d.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       )}

//       {!isRecruiter && hierarchyData?.teamLeads && hierarchyData.teamLeads.length > 0 && (
//         <Select
//           value={teamLeadId || '_all'}
//           onValueChange={v => onTeamLeadChange(v === '_all' ? '' : v)}
//         >
//           <SelectTrigger className="h-8 w-[170px] text-xs gap-1.5">
//             <Users size={12} className="text-muted-foreground shrink-0" />
//             <SelectValue placeholder="All team leads" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="_all">All team leads</SelectItem>
//             {hierarchyData.teamLeads.map(t => (
//               <SelectItem key={t.id} value={t.id}>
//                 {fullName(t)}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       )}

//       {!isRecruiter && hierarchyData?.reportingTo && hierarchyData.reportingTo.length > 0 && (
//         <Select
//           value={reportingToId || '_all'}
//           onValueChange={v => onReportingToChange(v === '_all' ? '' : v)}
//         >
//           <SelectTrigger className="h-8 w-[180px] text-xs gap-1.5">
//             <Users size={12} className="text-muted-foreground shrink-0" />
//             <SelectValue placeholder="All managers" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="_all">All managers</SelectItem>
//             {hierarchyData.reportingTo.map(r => (
//               <SelectItem key={r.id} value={r.id}>
//                 {fullName(r)}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       )}

//       {!isRecruiter && slData && slData.length > 0 && (
//         <Select
//           value={serviceLineId || '_all'}
//           onValueChange={v => onSlChange(v === '_all' ? '' : v)}
//         >
//           <SelectTrigger className="h-8 w-[160px] text-xs">
//             <SelectValue placeholder="All service lines" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="_all">All service lines</SelectItem>
//             {slData.map(s => (
//               <SelectItem key={s.id} value={s.id}>
//                 {s.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       )}

//       {hasAnyFilter && (
//         <button
//           onClick={clearAll}
//           className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 ml-1"
//         >
//           <X size={11} /> Clear all
//         </button>
//       )}
//     </div>
//   );
// }

// // ─── Status Tabs ──────────────────────────────────────────────────────────────

// function StatusTabs({
//   statusFilter,
//   onStatusChange,
//   byStatus,
// }: {
//   statusFilter: string;
//   onStatusChange: (v: string) => void;
//   byStatus: Record<string, number>;
// }) {
//   const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
//   const tabs = [
//     { key: '_all', label: 'All', count: total },
//     ...SIDEBAR_STATUSES.map(s => ({ key: s.key, label: s.label, count: byStatus[s.key] ?? 0 })),
//   ];

//   return (
//     <div className="px-5 pt-3 shrink-0">
//       {/* <Tabs
//         value={statusFilter || '_all'}
//         onValueChange={v => onStatusChange(v === '_all' ? '' : v)}
//       >
//         <TabsList className="h-9 bg-muted/50">
//           {tabs.map(t => (
//             <TabsTrigger key={t.key} value={t.key} className="text-[12px] gap-1.5">
//               {t.label}
//               {t.count > 0 && (
//                 <span className="text-[10px] tabular-nums text-muted-foreground">{t.count}</span>
//               )}
//             </TabsTrigger>
//           ))}
//         </TabsList>
//       </Tabs> */}
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
//       {/* {!isRecruiter && (
//         <div className="grid grid-cols-2 gap-3 px-5 pb-4 shrink-0"> */}
//       {/* Pipeline funnel */}
//       {/* <div className="bg-card border border-border rounded-xl p-5">
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
//           </div> */}

//       {/* Resume stats */}
//       {/* {!isRecruiter && (
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
//           )} */}

//       {/* BU breakdown */}
//       {/* <div className="bg-card border border-border rounded-xl p-5">
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
//       )} */}

//       {!isRecruiter && (
//         <div className="px-5 pb-4 shrink-0 space-y-3">
//           {/* ========================= FIRST ROW ========================= */}
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

//           {/* ========================= SECOND ROW ========================= */}
//           <div className="grid grid-cols-2 gap-3">
//             {/* Resume stats */}
//             <div className="bg-card border border-border rounded-xl p-5">
//               <div className="flex items-center justify-between mb-1">
//                 <p className="text-[13px] font-semibold text-foreground">Resumes parsed</p>

//                 <Select
//                   value={resumeBreakdownDim}
//                   onValueChange={v => setResumeBreakdownDim(v as typeof resumeBreakdownDim)}
//                 >
//                   <SelectTrigger className="h-7 w-36 text-[11px]">
//                     <SelectValue />
//                   </SelectTrigger>

//                   <SelectContent>
//                     <SelectItem value="department">By department</SelectItem>
//                     <SelectItem value="teamLead">By team lead</SelectItem>
//                     <SelectItem value="businessUnit">By business unit</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="flex gap-4 mb-3">
//                 <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
//                   <span
//                     className="w-2 h-2 rounded-sm shrink-0"
//                     style={{ backgroundColor: '#10B981' }}
//                   />
//                   Resumes
//                 </span>

//                 <span className="text-[11px] text-muted-foreground ml-auto">
//                   {resumeStats?.total ?? 0} total
//                 </span>
//               </div>

//               <ResumeBreakdownChart
//                 items={
//                   resumeBreakdownDim === 'department'
//                     ? (resumeStats?.byDepartment ?? [])
//                     : resumeBreakdownDim === 'teamLead'
//                       ? (resumeStats?.byTeamLead ?? [])
//                       : (resumeStats?.byBusinessUnit ?? [])
//                 }
//                 loading={resumeStatsLoading}
//               />
//             </div>

//             {/* BU breakdown */}
//             <div className="bg-card border border-border rounded-xl p-5">
//               <div className="flex items-center justify-between mb-1">
//                 <p className="text-[13px] font-semibold text-foreground">By business unit</p>

//                 <p className="text-[11px] text-muted-foreground">active requirements</p>
//               </div>

//               <div className="flex gap-4 mb-3">
//                 <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
//                   <span
//                     className="w-2 h-2 rounded-sm shrink-0"
//                     style={{ backgroundColor: '#7F77DD' }}
//                   />
//                   Requirements
//                 </span>
//               </div>

//               <BUBreakdownChart items={stats?.buBreakdown ?? []} loading={statsLoading} />
//             </div>
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
//       </div>

//       {/* ── Filter bar ── */}
//       <FilterBar
//         dateRange={dateRange}
//         onDateChange={setDateRange}
//         buId={buId}
//         onBuChange={setBuId}
//         deptId={deptId}
//         onDeptChange={setDeptId}
//         serviceLineId={serviceLineId}
//         onSlChange={setServiceLineId}
//         teamLeadId={teamLeadId}
//         onTeamLeadChange={setTeamLeadId}
//         reportingToId={reportingToId}
//         onReportingToChange={setReportingToId}
//         busData={busData}
//         deptsData={deptsData}
//         slData={slData}
//         hierarchyData={hierarchyData}
//         isRecruiter={isRecruiter}
//       />

//       {/* ── Status tabs (non-recruiter only) ── */}
//       {!isRecruiter && (
//         <StatusTabs
//           statusFilter={statusFilter}
//           onStatusChange={setStatusFilter}
//           byStatus={byStatus}
//         />
//       )}

//       {/* ── 2-column layout: main + right panel ── */}
//       <div
//         style={{
//           display: 'grid',
//           gridTemplateColumns: '1fr 256px',
//           flex: 1,
//           minHeight: 0,
//           overflow: 'hidden',
//         }}
//       >
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

'use client';

import { Suspense, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
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
import { cn } from '@/lib/utils';
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  Users,
  Briefcase,
  CalendarIcon,
  X,
  ChevronRight,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';

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

// ── Enhanced recruiter stat — now includes group membership for drill-down ──
interface RecruiterStat {
  recruiterId: string;
  name: string;
  count: number;
  departmentId: string | null;
  departmentName: string | null;
  teamLeadId: string | null;
  teamLeadName: string | null;
  buId: string | null;
  buName: string | null;
}

interface ResumeStats {
  total: number;
  bySource: { source: string; count: number }[];
  byDepartment: { id: string; name: string; count: number }[];
  byTeamLead: { id: string; name: string; count: number }[];
  byBusinessUnit: { id: string; name: string; count: number }[];
  byRecruiter: RecruiterStat[];
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

// ─── Source colors ────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  Naukri: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  LinkedIn: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
  Manual: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  Referral: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  Unspecified: { bg: 'bg-slate-500/10', text: 'text-slate-500 dark:text-slate-400' },
};

function sourceStyle(source: string) {
  return (
    SOURCE_COLORS[source] ?? {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
    }
  );
}

// ─── Chart configs ────────────────────────────────────────────────────────────

const funnelChartConfig: ChartConfig = {
  active: { label: 'Active', color: '#378ADD' },
  onHold: { label: 'On hold', color: '#EF9F27' },
  inactive: { label: 'Inactive', color: '#e2e8f0' },
};

const buChartConfig: ChartConfig = {
  count: { label: 'Requirements', color: '#7F77DD' },
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

function nameInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

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

      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60"
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
  if (loading) return <Skeleton className="h-55 w-full" />;

  const data = stages.map(s => ({
    name: s.label.length > 9 ? s.label.slice(0, 9) + '…' : s.label,
    fullLabel: s.label,
    active: s.active,
    onHold: s.onHold,
    inactive: s.inactive,
    code: s.code,
  }));

  return (
    <ChartContainer config={funnelChartConfig} className="h-55 w-full">
      <BarChart data={data} barSize={16} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          interval={0}
          angle={-40}
          textAnchor="end"
          height={60}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
  if (loading) return <Skeleton className="h-55 w-full" />;

  const data = items.slice(0, 6).map(i => ({
    name: i.name.length > 18 ? i.name.slice(0, 18) + '…' : i.name,
    fullName: i.name,
    count: i.count,
  }));

  return (
    <ChartContainer config={buChartConfig} className="h-55 w-full">
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

// ─── Resume: clickable grouped bar chart ──────────────────────────────────────

function ResumeDimBarChart({
  items,
  loading,
  onBarClick,
  emptyMessage,
}: {
  items: { id: string; name: string; count: number }[];
  loading: boolean;
  onBarClick: (item: { id: string; name: string }) => void;
  emptyMessage: React.ReactNode;
}) {
  if (loading) return <Skeleton className="h-50 w-full" />;

  const data = items.slice(0, 7).map(i => ({
    id: i.id,
    name: i.name.length > 18 ? i.name.slice(0, 18) + '…' : i.name,
    fullName: i.name,
    count: i.count,
  }));

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-50 gap-2 px-6 text-center">
        <Info size={16} className="text-muted-foreground/40" />
        <p className="text-[11.5px] text-muted-foreground leading-relaxed">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map(item => (
        <div
          key={item.id}
          onClick={() => onBarClick({ id: item.id, name: item.fullName })}
          className="flex items-center gap-3 cursor-pointer rounded-md hover:bg-muted p-2"
        >
          <div className="w-28 text-xs truncate">{item.name}</div>

          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{
                width: `${(item.count / data[0].count) * 100}%`,
              }}
            />
          </div>

          <div className="w-8 text-right text-xs font-semibold">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Resume Parsed Card ───────────────────────────────────────────────────────
// Popup overlay appears ON TOP of the chart when a bar is clicked.
// No separate "By recruiter" tab — just click the chart to see who parsed.

type ResumeDim = 'department' | 'teamLead' | 'businessUnit';

const DIM_EMPTY: Record<ResumeDim, React.ReactNode> = {
  department: 'No department data for this period.',
  teamLead: (
    <>
      No team lead data.
      <br />
      Users may not have a team lead assigned to their profile.
    </>
  ),
  businessUnit: (
    <>
      No business unit data.
      <br />
      Users may not have a BU assigned to their profile.
    </>
  ),
};

function ResumeParsedCard({
  resumeStats,
  loading,
}: {
  resumeStats: ResumeStats | undefined;
  loading: boolean;
}) {
  const [dim, setDim] = useState<ResumeDim>('department');
  const [popup, setPopup] = useState<{ id: string; name: string } | null>(null);

  const dimItems: { id: string; name: string; count: number }[] =
    dim === 'department'
      ? (resumeStats?.byDepartment ?? [])
      : dim === 'teamLead'
        ? (resumeStats?.byTeamLead ?? [])
        : (resumeStats?.byBusinessUnit ?? []);

  const popupPeople = popup
    ? (resumeStats?.byRecruiter ?? [])
        .filter(r =>
          dim === 'department'
            ? r.departmentId === popup.id
            : dim === 'teamLead'
              ? r.teamLeadId === popup.id
              : r.buId === popup.id
        )
        .sort((a, b) => b.count - a.count)
    : [];

  const popupTotal = popupPeople.reduce((s, r) => s + r.count, 0);
  const popupMax = popupPeople[0]?.count ?? 1;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Resumes parsed</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {loading ? '—' : (resumeStats?.total ?? 0)} total
          </p>
        </div>
        <Select
          value={dim}
          onValueChange={v => {
            setDim(v as ResumeDim);
            setPopup(null);
          }}
        >
          <SelectTrigger className="h-7 w-40 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="department">By department</SelectItem>
            <SelectItem value="teamLead">By team lead</SelectItem>
            <SelectItem value="businessUnit">By business unit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Source pills ── */}
      {!loading && (resumeStats?.bySource ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {resumeStats!.bySource.map(s => {
            const style = sourceStyle(s.source);
            return (
              <span
                key={s.source}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                  style.bg,
                  style.text
                )}
              >
                {s.source}
                <span className="opacity-50">·</span>
                {s.count}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Chart + popup ── */}
      {/*
        FIX 2: overflow-visible so the popup (taller than the 200px chart)
        isn't clipped by this container. The popup uses top-0/left-0/right-0
        without bottom-0 and max-h-72, letting it grow as needed.
      */}
      <div className="relative" style={{ overflow: 'visible' }}>
        <ResumeDimBarChart
          items={dimItems}
          loading={loading}
          onBarClick={setPopup}
          emptyMessage={DIM_EMPTY[dim]}
        />

        {popup && (
          <div
            className={cn(
              'absolute top-0 left-0 right-0 z-20',
              'bg-card border border-emerald-500/20 rounded-lg shadow-xl',
              'flex flex-col overflow-hidden'
            )}
            style={{ height: '350px' }}
          >
            {/* Popup header */}
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0"
              style={{ borderLeftColor: '#10B981', borderLeftWidth: 3 }}
            >
              <div>
                <p className="text-[12px] font-semibold text-foreground">{popup.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {popupPeople.length} person{popupPeople.length !== 1 ? 's' : ''}
                  &nbsp;&middot;&nbsp;
                  {popupTotal} resumes
                </p>
              </div>
              <button
                onClick={() => setPopup(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
                aria-label="Close"
              >
                <X size={13} />
              </button>
            </div>

            {/* Scrollable people list — min-h-0 is required for flex+scroll */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-2 space-y-0.5">
                {popupPeople.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground py-6 text-center">
                    No data available for this group
                  </p>
                ) : (
                  popupPeople.map((r, i) => (
                    <div
                      key={r.recruiterId}
                      className="flex items-center gap-2.5 py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      {/* rank */}
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums w-4 text-right shrink-0 font-mono">
                        {i + 1}
                      </span>

                      {/* initials avatar */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                        style={{
                          background: `hsl(${(i * 53 + 140) % 360}deg 55% 92%)`,
                          color: `hsl(${(i * 53 + 140) % 360}deg 45% 35%)`,
                        }}
                      >
                        {nameInitials(r.name)}
                      </div>

                      {/* name */}
                      <p className="flex-1 text-[11.5px] font-medium text-foreground truncate">
                        {r.name}
                      </p>

                      {/* mini bar */}
                      <div className="w-14 h-0.75 bg-muted rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(r.count / popupMax) * 100}%` }}
                        />
                      </div>

                      {/* count */}
                      <span className="text-[12px] font-semibold tabular-nums text-foreground shrink-0 w-7 text-right">
                        {r.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!popup && dimItems.length > 0 && !loading && (
        <p className="text-[10px] text-muted-foreground/40 mt-3 pt-2 border-t border-border">
          Click anywhere on a row to see who parsed resumes
        </p>
      )}
    </div>
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
      <p className="text-[11.5px] text-muted-foreground leading-tight mb-3 min-h-7.5 line-clamp-2">
        {stage.label}
      </p>
      <p
        className="text-[32px] font-semibold tabular-nums leading-none mb-3"
        style={{ color: stage.total === 0 ? 'hsl(var(--muted-foreground))' : color }}
      >
        {stage.total}
      </p>
      <div className="h-0.75 rounded-full bg-muted overflow-hidden mb-2">
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
        isBreached && 'border-l-2 border-l-destructive pl-3.5'
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
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: priorityColor }}
        />
        {a.requirement.title}
      </p>

      <p className="text-[11px] text-muted-foreground mb-2 truncate">
        {a.requirement.client?.name}
        {a.requirement.serviceLine ? ` · ${a.requirement.serviceLine.name}` : ''}
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-0.75 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fillPct}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {a.filledOpenings}/{a.requirement.totalOpenings} filled
        </span>
      </div>
    </div>
  );
}

// ─── Recruiter Hero ───────────────────────────────────────────────────────────

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

// ─── Filter Bar ──────────────────────────────────────────────────────────────

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
          <SelectTrigger className="h-8 w-37.5 text-xs gap-1.5">
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
          <SelectTrigger className="h-8 w-42.5 text-xs gap-1.5">
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
          <SelectTrigger className="h-8 w-42.5 text-xs gap-1.5">
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
          <SelectTrigger className="h-8 w-45 text-xs gap-1.5">
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
          <SelectTrigger className="h-8 w-40 text-xs">
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
  // const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  // const tabs = [
  //   { key: '_all', label: 'All', count: total },
  //   ...SIDEBAR_STATUSES.map(s => ({ key: s.key, label: s.label, count: byStatus[s.key] ?? 0 })),
  // ];

  return <div className="px-5 pt-3 shrink-0" />;
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

// ─── Main Content ─────────────────────────────────────────────────────────────

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
      {!isRecruiter && (
        <div className="px-5 pb-4 shrink-0 space-y-3">
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

          {/* Second row: Resume card + BU breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {/* ── REPLACED: ResumeParsedCard handles all resume breakdown logic ── */}
            <ResumeParsedCard resumeStats={resumeStats} loading={resumeStatsLoading} />

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

// ─── Dashboard Content ────────────────────────────────────────────────────────

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

  const { data: deptsData } = useQuery({
    queryKey: ['departments-filter'],
    queryFn: async () => (await axios.get('/departments?isActive=true')).data?.data as Department[],
    enabled: isSuperAdmin,
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

      {/* ── Status tabs placeholder ── */}
      {!isRecruiter && (
        <StatusTabs
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          byStatus={byStatus}
        />
      )}

      {/* ── 2-column layout ── */}
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

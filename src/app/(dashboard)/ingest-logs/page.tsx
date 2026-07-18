// /* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

// // =============================================================================
// // /ingest-logs  —  Resume ingestion log viewer
// // Consumes:  GET /candidate/api/resume/ingestion-logs?include=list,stats&<filters>
// //
// // Backend filters used directly (NO backend change needed for these):
// //   recruiterId, requirementId, reqCode, source, status, duplicateType,
// //   failedStep, isDuplicate, needsManualReview, from, to, search
// //
// // NOTE: Requirement lives in a different microservice — the log only stores
// // requirementId + reqCode. So titles are resolved on the CLIENT from
// // /dashboard/my-assignments (same source the dashboard uses). The table shows
// // reqCode straight from the row (no lookup); the dropdown + drawer show titles.
// //
// // teamLeadId / reportingToId are sent in the query string but only narrow results
// // once buildWhere() resolves them to a recruiter set server-side.
// // =============================================================================

// import { Suspense, useEffect, useMemo, useState } from 'react';
// import { useQuery, keepPreviousData } from '@tanstack/react-query';
// import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
// import { DateRange } from 'react-day-picker';
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
// import { Input } from '@/components/ui/input';
// import { cn } from '@/lib/utils';
// import {
//   CalendarIcon,
//   X,
//   Search,
//   RefreshCw,
//   ChevronLeft,
//   ChevronRight,
//   ChevronDown,
//   ChevronUp,
//   Users,
//   Building2,
//   FileText,
//   CheckCircle2,
//   Copy,
//   AlertTriangle,
//   Sparkles,
//   FileEdit,
//   Cpu,
//   Hash,
//   Mail,
//   Briefcase,
//   UserSearch,
//   Info,
// } from 'lucide-react';
// import { useAxios } from '@/hooks/useAxios';

// // ─── Types ────────────────────────────────────────────────────────────────────

// type IngestionStatus = 'SUCCESS' | 'DUPLICATE' | 'MANUAL_REVIEW' | 'FAILED' | 'DRAFT';

// interface LogRow {
//   id: string;
//   uploadedById: string | null;
//   recruiterId: string | null;
//   recruiterName?: string | null;
//   source: string;
//   inputType: string | null;
//   reqCode: string | null;
//   requirementId: string | null;
//   assignmentId: string | null;
//   fileName: string | null;
//   mimeType: string | null;
//   fileSizeKb: number | null;
//   checksum: string | null;
//   textChecksum: string | null;
//   extractedEmail: string | null;
//   extractedPhone: string | null;
//   parsedEmail: string | null;
//   parsedName: string | null;
//   status: IngestionStatus;
//   failedStep: string | null;
//   httpStatus: number | null;
//   errorCode: string | null;
//   errorMessage: string | null;
//   isDuplicate: boolean;
//   duplicateType: string | null;
//   existingResumeId: string | null;
//   existingCandidateId: string | null;
//   modelUsed: string | null;
//   tokensUsed: number | null;
//   confidence: number | null;
//   needsManualReview: boolean;
//   escalationReasons: string[];
//   candidateId: string | null;
//   resumeId: string | null;
//   isDraft: boolean;
//   durationMs: number | null;
//   createdAt: string;
// }

// interface LogStats {
//   total: number;
//   successRate: number;
//   byStatus: Record<string, number>;
//   bySource: Record<string, number>;
//   duplicatesByType: Record<string, number>;
//   failuresByStep: Record<string, number>;
//   tokensUsed: number;
//   avgDurationMs: number;
//   avgConfidence: number | null;
// }

// interface Pagination {
//   page: number;
//   pageSize: number;
//   total: number;
//   totalPages: number;
//   hasNext: boolean;
// }

// interface ListResponse {
//   success: boolean;
//   rows: LogRow[];
//   pagination: Pagination;
//   stats?: LogStats;
// }

// interface HierarchyUser {
//   id: string;
//   firstName: string;
//   lastName: string;
//   employeeId?: string | null;
// }

// interface RecruiterLite {
//   id: string;
//   name: string;
// }

// interface RequirementLite {
//   id: string;
//   reqCode: string;
//   title: string;
// }

// // ─── Constants ────────────────────────────────────────────────────────────────

// const STATUS_META: Record<
//   IngestionStatus,
//   { label: string; color: string; bg: string; text: string; icon: React.ElementType }
// > = {
//   SUCCESS: {
//     label: 'Success',
//     color: '#10B981',
//     bg: 'bg-emerald-500/10',
//     text: 'text-emerald-600 dark:text-emerald-400',
//     icon: CheckCircle2,
//   },
//   DUPLICATE: {
//     label: 'Duplicate',
//     color: '#EF9F27',
//     bg: 'bg-amber-500/10',
//     text: 'text-amber-600 dark:text-amber-500',
//     icon: Copy,
//   },
//   MANUAL_REVIEW: {
//     label: 'Manual review',
//     color: '#7F77DD',
//     bg: 'bg-violet-500/10',
//     text: 'text-violet-600 dark:text-violet-400',
//     icon: UserSearch,
//   },
//   FAILED: {
//     label: 'Failed',
//     color: '#E24B4A',
//     bg: 'bg-red-500/10',
//     text: 'text-red-600 dark:text-red-400',
//     icon: AlertTriangle,
//   },
//   DRAFT: {
//     label: 'Draft',
//     color: '#94a3b8',
//     bg: 'bg-slate-500/10',
//     text: 'text-slate-500 dark:text-slate-400',
//     icon: FileEdit,
//   },
// };

// const SOURCE_META: Record<string, { label: string; bg: string; text: string }> = {
//   MANUAL_UPLOAD: {
//     label: 'Manual',
//     bg: 'bg-violet-500/10',
//     text: 'text-violet-600 dark:text-violet-400',
//   },
//   PORTAL: { label: 'Portal', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
//   CHROME_EXTENSION: {
//     label: 'Extension',
//     bg: 'bg-sky-500/10',
//     text: 'text-sky-600 dark:text-sky-400',
//   },
//   BATCH: { label: 'Batch', bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
//   UNKNOWN: { label: 'Unknown', bg: 'bg-slate-500/10', text: 'text-slate-500 dark:text-slate-400' },
// };

// const DUP_LABEL: Record<string, string> = {
//   BINARY_CHECKSUM: 'Binary (same file)',
//   TEXT_CHECKSUM: 'Text (re-encoded)',
//   EMAIL_PHONE: 'Email / phone',
// };

// const STEP_LABEL: Record<string, string> = {
//   NORMALIZE_INPUT: 'Normalize input',
//   EXTRACT_TEXT: 'Extract text',
//   EMAIL_PRECHECK: 'Email pre-check',
//   DUPLICATE_CHECK: 'Duplicate check',
//   S3_UPLOAD: 'S3 upload',
//   AI_PARSE: 'AI parse',
//   PERSIST: 'Persist',
//   CORE_SYNC: 'Core sync',
// };

// const STATUS_OPTIONS: IngestionStatus[] = [
//   'SUCCESS',
//   'DUPLICATE',
//   'MANUAL_REVIEW',
//   'FAILED',
//   'DRAFT',
// ];
// const SOURCE_OPTIONS = ['MANUAL_UPLOAD', 'PORTAL', 'CHROME_EXTENSION', 'BATCH', 'UNKNOWN'];
// const DUP_OPTIONS = ['BINARY_CHECKSUM', 'TEXT_CHECKSUM', 'EMAIL_PHONE'];

// const PRESETS = [
//   { label: 'Today', from: () => new Date(), to: () => new Date() },
//   { label: 'Last 7 days', from: () => subDays(new Date(), 6), to: () => new Date() },
//   { label: 'Last 30 days', from: () => subDays(new Date(), 29), to: () => new Date() },
//   { label: 'This month', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
//   { label: 'This year', from: () => startOfYear(new Date()), to: () => new Date() },
// ];

// const PAGE_SIZES = [20, 50, 100];

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function fmtDuration(ms: number | null): string {
//   if (ms == null) return '—';
//   if (ms < 1000) return `${ms}ms`;
//   return `${(ms / 1000).toFixed(1)}s`;
// }

// function timeAgo(iso: string): string {
//   const d = new Date(iso);
//   const diff = Date.now() - d.getTime();
//   const m = Math.floor(diff / 60000);
//   if (m < 1) return 'just now';
//   if (m < 60) return `${m}m ago`;
//   const h = Math.floor(m / 60);
//   if (h < 24) return `${h}h ago`;
//   const days = Math.floor(h / 24);
//   if (days < 7) return `${days}d ago`;
//   return format(d, 'dd MMM');
// }

// function nameInitials(name: string) {
//   const parts = name.trim().split(' ');
//   return parts.length >= 2
//     ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
//     : name.slice(0, 2).toUpperCase();
// }

// function userName(u: { firstName?: string; lastName?: string; name?: string }) {
//   if (u.name) return u.name;
//   return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
// }

// function useDebounced<T>(value: T, delay = 350): T {
//   const [v, setV] = useState(value);
//   useEffect(() => {
//     const t = setTimeout(() => setV(value), delay);
//     return () => clearTimeout(t);
//   }, [value, delay]);
//   return v;
// }

// // ─── Date Range Picker (same as dashboard) ────────────────────────────────────

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
//       <PopoverContent className="w-auto p-0" align="start">
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

// // ─── Searchable recruiter picker ───────────────────────────────────────────────

// function RecruiterPicker({
//   recruiters,
//   value,
//   onChange,
//   loading,
// }: {
//   recruiters: RecruiterLite[];
//   value: string;
//   onChange: (id: string) => void;
//   loading?: boolean;
// }) {
//   const [open, setOpen] = useState(false);
//   const [q, setQ] = useState('');

//   const selected = recruiters.find(r => r.id === value);
//   const filtered = q.trim()
//     ? recruiters.filter(r => r.name.toLowerCase().includes(q.toLowerCase()))
//     : recruiters;

//   return (
//     <Popover open={open} onOpenChange={setOpen}>
//       <PopoverTrigger asChild>
//         <Button
//           variant="outline"
//           size="sm"
//           className={cn(
//             'h-8 gap-1.5 text-xs font-medium w-44 justify-between',
//             value && 'border-primary/40 bg-primary/5 text-primary'
//           )}
//         >
//           <span className="flex items-center gap-1.5 truncate">
//             <UserSearch size={12} className="shrink-0 text-muted-foreground" />
//             <span className="truncate">{selected ? selected.name : 'All users'}</span>
//           </span>
//           {value ? (
//             <span
//               role="button"
//               aria-label="Clear recruiter"
//               onClick={e => {
//                 e.stopPropagation();
//                 onChange('');
//               }}
//               className="text-muted-foreground hover:text-destructive"
//             >
//               <X size={11} />
//             </span>
//           ) : (
//             <ChevronDown size={12} className="text-muted-foreground shrink-0" />
//           )}
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-56 p-0" align="start">
//         <div className="p-2 border-b border-border">
//           <div className="relative">
//             <Search
//               size={12}
//               className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
//             />
//             <input
//               autoFocus
//               value={q}
//               onChange={e => setQ(e.target.value)}
//               placeholder="Search recruiter…"
//               className="w-full h-7 pl-7 pr-2 text-xs bg-muted/50 rounded-md outline-none focus:ring-1 focus:ring-primary/30"
//             />
//           </div>
//         </div>
//         <div className="max-h-64 overflow-y-auto p-1">
//           {loading ? (
//             <div className="p-2 space-y-1">
//               {[1, 2, 3, 4].map(i => (
//                 <Skeleton key={i} className="h-7 w-full" />
//               ))}
//             </div>
//           ) : filtered.length === 0 ? (
//             <p className="text-[11px] text-muted-foreground text-center py-4">
//               No recruiters found
//             </p>
//           ) : (
//             filtered.slice(0, 200).map(r => (
//               <button
//                 key={r.id}
//                 onClick={() => {
//                   onChange(r.id);
//                   setOpen(false);
//                   setQ('');
//                 }}
//                 className={cn(
//                   'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] hover:bg-muted transition-colors',
//                   r.id === value && 'bg-primary/5 text-primary'
//                 )}
//               >
//                 <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">
//                   {nameInitials(r.name)}
//                 </span>
//                 <span className="truncate">{r.name}</span>
//               </button>
//             ))
//           )}
//         </div>
//       </PopoverContent>
//     </Popover>
//   );
// }

// // ─── Searchable requirement picker ─────────────────────────────────────────────

// function RequirementPicker({
//   requirements,
//   value,
//   onChange,
//   loading,
// }: {
//   requirements: RequirementLite[];
//   value: string;
//   onChange: (id: string) => void;
//   loading?: boolean;
// }) {
//   const [open, setOpen] = useState(false);
//   const [q, setQ] = useState('');

//   const selected = requirements.find(r => r.id === value);
//   const filtered = q.trim()
//     ? requirements.filter(r => `${r.reqCode} ${r.title}`.toLowerCase().includes(q.toLowerCase()))
//     : requirements;

//   return (
//     <Popover open={open} onOpenChange={setOpen}>
//       <PopoverTrigger asChild>
//         <Button
//           variant="outline"
//           size="sm"
//           className={cn(
//             'h-8 gap-1.5 text-xs font-medium w-52 justify-between',
//             value && 'border-primary/40 bg-primary/5 text-primary'
//           )}
//         >
//           <span className="flex items-center gap-1.5 truncate">
//             <Briefcase size={12} className="shrink-0 text-muted-foreground" />
//             <span className="truncate">{selected ? selected.reqCode : 'All requirements'}</span>
//           </span>
//           {value ? (
//             <span
//               role="button"
//               aria-label="Clear requirement"
//               onClick={e => {
//                 e.stopPropagation();
//                 onChange('');
//               }}
//               className="text-muted-foreground hover:text-destructive"
//             >
//               <X size={11} />
//             </span>
//           ) : (
//             <ChevronDown size={12} className="text-muted-foreground shrink-0" />
//           )}
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-72 p-0" align="start">
//         <div className="p-2 border-b border-border">
//           <div className="relative">
//             <Search
//               size={12}
//               className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
//             />
//             <input
//               autoFocus
//               value={q}
//               onChange={e => setQ(e.target.value)}
//               placeholder="Search req code or title…"
//               className="w-full h-7 pl-7 pr-2 text-xs bg-muted/50 rounded-md outline-none focus:ring-1 focus:ring-primary/30"
//             />
//           </div>
//         </div>
//         <div className="max-h-64 overflow-y-auto p-1">
//           {loading ? (
//             <div className="p-2 space-y-1">
//               {[1, 2, 3].map(i => (
//                 <Skeleton key={i} className="h-8 w-full" />
//               ))}
//             </div>
//           ) : filtered.length === 0 ? (
//             <p className="text-[11px] text-muted-foreground text-center py-4">
//               No requirements found
//             </p>
//           ) : (
//             filtered.slice(0, 200).map(r => (
//               <button
//                 key={r.id}
//                 onClick={() => {
//                   onChange(r.id);
//                   setOpen(false);
//                   setQ('');
//                 }}
//                 className={cn(
//                   'w-full flex flex-col items-start px-2 py-1.5 rounded-md text-left hover:bg-muted transition-colors',
//                   r.id === value && 'bg-primary/5'
//                 )}
//               >
//                 <span className="text-[11px] font-mono text-muted-foreground">{r.reqCode}</span>
//                 <span className="text-[12px] text-foreground truncate w-full">{r.title}</span>
//               </button>
//             ))
//           )}
//         </div>
//       </PopoverContent>
//     </Popover>
//   );
// }

// // ─── Small badges ─────────────────────────────────────────────────────────────

// function StatusBadge({ status }: { status: IngestionStatus }) {
//   const m = STATUS_META[status];
//   const Icon = m.icon;
//   return (
//     <span
//       className={cn(
//         'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
//         m.bg,
//         m.text
//       )}
//     >
//       <Icon size={10} />
//       {m.label}
//     </span>
//   );
// }

// function SourceBadge({ source }: { source: string }) {
//   const m = SOURCE_META[source] ?? SOURCE_META.UNKNOWN;
//   return (
//     <span
//       className={cn(
//         'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
//         m.bg,
//         m.text
//       )}
//     >
//       {m.label}
//     </span>
//   );
// }

// // ─── Stat card ────────────────────────────────────────────────────────────────

// function StatCard({
//   label,
//   value,
//   sub,
//   icon: Icon,
//   accentColor,
//   loading,
//   active,
//   onClick,
// }: {
//   label: string;
//   value: string | number;
//   sub?: string;
//   icon: React.ElementType;
//   accentColor: string;
//   loading?: boolean;
//   active?: boolean;
//   onClick?: () => void;
// }) {
//   return (
//     <div
//       onClick={onClick}
//       style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
//       className={cn(
//         'bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5 relative overflow-hidden',
//         onClick && 'cursor-pointer hover:shadow-sm hover:border-border/80 transition-all',
//         active && 'ring-1 ring-primary/40'
//       )}
//     >
//       <div
//         className="absolute right-3 top-3 opacity-[0.07]"
//         style={{ color: accentColor }}
//         aria-hidden
//       >
//         <Icon size={34} />
//       </div>
//       <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
//         {label}
//       </p>
//       {loading ? (
//         <Skeleton className="h-8 w-14 mt-1" />
//       ) : (
//         <p className="text-[30px] font-semibold tabular-nums leading-none">{value}</p>
//       )}
//       {sub && <p className="text-[10.5px] text-muted-foreground">{sub}</p>}
//     </div>
//   );
// }

// // ─── Detail drawer ────────────────────────────────────────────────────────────

// function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
//   return (
//     <div className="flex flex-col gap-0.5">
//       <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
//         {label}
//       </p>
//       <p className={cn('text-[12px] text-foreground break-all', mono && 'font-mono text-[11px]')}>
//         {value ?? '—'}
//       </p>
//     </div>
//   );
// }

// function DetailDrawer({
//   row,
//   recruiterName,
//   requirementLabel,
//   onClose,
// }: {
//   row: LogRow | null;
//   recruiterName: (id: string | null) => string;
//   requirementLabel: (id: string | null) => string;
//   onClose: () => void;
// }) {
//   if (!row) return null;
//   const m = STATUS_META[row.status];

//   return (
//     <>
//       <div className="fixed inset-0 bg-black/30 z-40 animate-in fade-in" onClick={onClose} />
//       <div className="fixed right-0 top-0 bottom-0 w-110 max-w-[90vw] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right">
//         {/* header */}
//         <div
//           className="px-5 py-4 border-b border-border flex items-start justify-between shrink-0"
//           style={{ borderLeftColor: m.color, borderLeftWidth: 3 }}
//         >
//           <div className="min-w-0">
//             <div className="flex items-center gap-2 mb-1">
//               <StatusBadge status={row.status} />
//               {row.httpStatus && (
//                 <span className="text-[10px] font-mono text-muted-foreground">
//                   HTTP {row.httpStatus}
//                 </span>
//               )}
//             </div>
//             <p className="text-[14px] font-semibold text-foreground truncate">
//               {row.parsedName ?? row.fileName ?? 'Ingestion attempt'}
//             </p>
//             <p className="text-[11px] text-muted-foreground mt-0.5">
//               {format(new Date(row.createdAt), 'dd MMM yyyy, HH:mm:ss')} ·{' '}
//               {fmtDuration(row.durationMs)}
//             </p>
//           </div>
//           <button
//             onClick={onClose}
//             className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted shrink-0"
//             aria-label="Close"
//           >
//             <X size={15} />
//           </button>
//         </div>

//         {/* body */}
//         <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
//           {/* Outcome / error */}
//           {(row.errorCode ||
//             row.errorMessage ||
//             row.failedStep ||
//             row.escalationReasons?.length > 0) && (
//             <section className="space-y-2">
//               <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
//                 <AlertTriangle size={12} className="text-red-500" /> Outcome
//               </p>
//               <div className="bg-muted/40 rounded-lg p-3 space-y-2">
//                 {row.failedStep && (
//                   <Field label="Failed step" value={STEP_LABEL[row.failedStep] ?? row.failedStep} />
//                 )}
//                 {row.errorCode && <Field label="Error code" value={row.errorCode} mono />}
//                 {row.errorMessage && <Field label="Message" value={row.errorMessage} />}
//                 {row.escalationReasons?.length > 0 && (
//                   <Field label="Escalation reasons" value={row.escalationReasons.join(', ')} mono />
//                 )}
//               </div>
//             </section>
//           )}

//           {/* Duplicate */}
//           {row.isDuplicate && (
//             <section className="space-y-2">
//               <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
//                 <Copy size={12} className="text-amber-500" /> Duplicate
//               </p>
//               <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-lg p-3">
//                 <Field
//                   label="Type"
//                   value={
//                     row.duplicateType ? (DUP_LABEL[row.duplicateType] ?? row.duplicateType) : '—'
//                   }
//                 />
//                 <Field label="Existing candidate" value={row.existingCandidateId} mono />
//                 <Field label="Existing resume" value={row.existingResumeId} mono />
//               </div>
//             </section>
//           )}

//           {/* Identity */}
//           <section className="space-y-2">
//             <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
//               <Mail size={12} className="text-sky-500" /> Identity
//             </p>
//             <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-lg p-3">
//               <Field label="Parsed name" value={row.parsedName} />
//               <Field label="Parsed email" value={row.parsedEmail} />
//               <Field label="Regex email" value={row.extractedEmail} />
//               <Field label="Regex phone" value={row.extractedPhone} />
//             </div>
//           </section>

//           {/* File */}
//           <section className="space-y-2">
//             <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
//               <FileText size={12} className="text-violet-500" /> File
//             </p>
//             <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-lg p-3">
//               <Field label="File name" value={row.fileName} />
//               <Field label="MIME" value={row.mimeType} mono />
//               <Field label="Size" value={row.fileSizeKb ? `${row.fileSizeKb} KB` : '—'} />
//               <Field label="Input type" value={row.inputType} />
//               <Field label="Binary checksum" value={row.checksum} mono />
//               <Field label="Text checksum" value={row.textChecksum} mono />
//             </div>
//           </section>

//           {/* Routing */}
//           <section className="space-y-2">
//             <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
//               <Briefcase size={12} className="text-emerald-500" /> Routing
//             </p>
//             <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-lg p-3">
//               <Field label="Source" value={<SourceBadge source={row.source} />} />
//               <Field label="Recruiter" value={recruiterName(row.recruiterId)} />
//               <Field label="Uploaded by" value={recruiterName(row.uploadedById)} />
//               <Field label="Requirement" value={requirementLabel(row.requirementId)} />
//               <Field label="Req code" value={row.reqCode} mono />
//               <Field label="Requirement id" value={row.requirementId} mono />
//               <Field label="Assignment id" value={row.assignmentId} mono />
//             </div>
//           </section>

//           {/* AI */}
//           <section className="space-y-2">
//             <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
//               <Cpu size={12} className="text-indigo-500" /> AI parse
//             </p>
//             <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-lg p-3">
//               <Field label="Model" value={row.modelUsed} mono />
//               <Field label="Tokens" value={row.tokensUsed?.toLocaleString() ?? '—'} />
//               <Field
//                 label="Confidence"
//                 value={row.confidence != null ? row.confidence.toFixed(2) : '—'}
//               />
//               <Field label="Needs manual review" value={row.needsManualReview ? 'Yes' : 'No'} />
//             </div>
//           </section>

//           {/* Result */}
//           <section className="space-y-2">
//             <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
//               <CheckCircle2 size={12} className="text-emerald-500" /> Result
//             </p>
//             <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-lg p-3">
//               <Field label="Candidate id" value={row.candidateId} mono />
//               <Field label="Resume id" value={row.resumeId} mono />
//               <Field label="Is draft" value={row.isDraft ? 'Yes' : 'No'} />
//               <Field label="Log id" value={row.id} mono />
//             </div>
//           </section>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Table ────────────────────────────────────────────────────────────────────

// type SortKey = 'createdAt' | 'durationMs' | 'tokensUsed';

// function SortHeader({
//   label,
//   col,
//   sortBy,
//   sortDir,
//   onSort,
//   align = 'left',
// }: {
//   label: string;
//   col: SortKey;
//   sortBy: string;
//   sortDir: 'asc' | 'desc';
//   onSort: (c: SortKey) => void;
//   align?: 'left' | 'right';
// }) {
//   const activeSort = sortBy === col;
//   return (
//     <button
//       onClick={() => onSort(col)}
//       className={cn(
//         'inline-flex items-center gap-1 hover:text-foreground transition-colors',
//         align === 'right' && 'flex-row-reverse'
//       )}
//     >
//       {label}
//       {activeSort && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
//     </button>
//   );
// }

// function LogTable({
//   rows,
//   loading,
//   recruiterName,
//   onRowClick,
//   requirementLabel,
//   sortBy,
//   sortDir,
//   onSort,
// }: {
//   rows: LogRow[];
//   loading: boolean;
//   recruiterName: (id: string | null) => string;
//   onRowClick: (r: LogRow) => void;
//   sortBy: string;
//   requirementLabel: (id: string | null, reqCode?: string | null) => string;
//   sortDir: 'asc' | 'desc';
//   onSort: (c: SortKey) => void;
// }) {
//   return (
//     <div className="bg-card border border-border rounded-xl overflow-hidden">
//       {/* header */}
//       <div className="grid grid-cols-[110px_1fr_90px_130px_90px_1fr_80px_90px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
//         <div>Status</div>
//         <div>Candidate</div>
//         <div>Source</div>
//         <div>Recruiter</div>
//         <div>Req</div>
//         <div>Detail</div>
//         <div className="text-right">
//           <SortHeader
//             label="Tokens"
//             col="tokensUsed"
//             sortBy={sortBy}
//             sortDir={sortDir}
//             onSort={onSort}
//             align="right"
//           />
//         </div>
//         <div className="text-right">
//           <SortHeader
//             label="When"
//             col="createdAt"
//             sortBy={sortBy}
//             sortDir={sortDir}
//             onSort={onSort}
//             align="right"
//           />
//         </div>
//       </div>

//       {loading ? (
//         <div className="divide-y divide-border/60">
//           {Array.from({ length: 8 }).map((_, i) => (
//             <div key={i} className="px-4 py-3">
//               <Skeleton className="h-8 w-full" />
//             </div>
//           ))}
//         </div>
//       ) : rows.length === 0 ? (
//         <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
//           <Info size={22} className="opacity-40" />
//           <p className="text-[13px]">No ingestion logs match these filters</p>
//         </div>
//       ) : (
//         <div className="divide-y divide-border/60">
//           {rows.map(row => {
//             const detail =
//               row.status === 'DUPLICATE' && row.duplicateType
//                 ? (DUP_LABEL[row.duplicateType] ?? row.duplicateType)
//                 : row.status === 'FAILED' && row.failedStep
//                   ? `${STEP_LABEL[row.failedStep] ?? row.failedStep}${row.errorCode ? ` · ${row.errorCode}` : ''}`
//                   : row.status === 'MANUAL_REVIEW'
//                     ? 'No email found'
//                     : (row.modelUsed ?? '—');

//             return (
//               <div
//                 key={row.id}
//                 onClick={() => onRowClick(row)}
//                 className="grid grid-cols-[110px_1fr_90px_130px_90px_1fr_80px_90px] gap-3 px-4 py-3 items-center hover:bg-muted/40 cursor-pointer transition-colors text-[12px]"
//               >
//                 <div>
//                   <StatusBadge status={row.status} />
//                 </div>
//                 <div className="min-w-0">
//                   <p className="font-medium text-foreground truncate">
//                     {row.parsedName ?? row.fileName ?? '—'}
//                   </p>
//                   <p className="text-[11px] text-muted-foreground truncate">
//                     {row.parsedEmail ?? row.extractedEmail ?? '—'}
//                   </p>
//                 </div>
//                 <div>
//                   <SourceBadge source={row.source} />
//                 </div>
//                 <div className="truncate text-muted-foreground">
//                   {row.recruiterName ?? recruiterName(row.recruiterId)}
//                 </div>
//                 <div
//                   className="truncate text-muted-foreground"
//                   title={requirementLabel(row.requirementId, row.reqCode)}
//                 >
//                   {/* {requirementLabel(row.requirementId)} */}
//                   {requirementLabel(row.requirementId, row.reqCode)}
//                 </div>
//                 <div className="truncate text-muted-foreground">{detail}</div>
//                 <div className="text-right tabular-nums text-muted-foreground">
//                   {row.tokensUsed ? row.tokensUsed.toLocaleString() : '—'}
//                 </div>
//                 <div
//                   className="text-right text-muted-foreground"
//                   title={format(new Date(row.createdAt), 'dd MMM yyyy HH:mm:ss')}
//                 >
//                   {timeAgo(row.createdAt)}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Filters model (single source of truth → fixes setState-in-effect) ─────────

// interface Filters {
//   dateRange: DateRange | undefined;
//   status: string;
//   source: string;
//   duplicateType: string;
//   recruiterId: string;
//   teamLeadId: string;
//   reportingToId: string;
//   requirementId: string;
//   reqCode: string;
//   searchInput: string;
// }

// const EMPTY_FILTERS: Filters = {
//   dateRange: undefined,
//   status: '',
//   source: '',
//   duplicateType: '',
//   recruiterId: '',
//   teamLeadId: '',
//   reportingToId: '',
//   requirementId: '',
//   reqCode: '',
//   searchInput: '',
// };

// // ─── Main ─────────────────────────────────────────────────────────────────────

// function IngestLogsContent() {
//   const axios = useAxios();

//   // One filters object → any edit resets page in the SAME render (no effect).
//   const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(20);
//   const [sortBy, setSortBy] = useState<SortKey>('createdAt');
//   const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
//   const [selected, setSelected] = useState<LogRow | null>(null);

//   function patchFilters(patch: Partial<Filters>) {
//     setFilters(f => ({ ...f, ...patch }));
//     setPage(1); // synchronous with the filter change → single render, no cascade
//   }

//   function changePageSize(size: number) {
//     setPageSize(size);
//     setPage(1);
//   }

//   const {
//     dateRange,
//     status,
//     source,
//     duplicateType,
//     recruiterId,
//     teamLeadId,
//     reportingToId,
//     requirementId,
//     reqCode,
//     searchInput,
//   } = filters;

//   const search = useDebounced(searchInput, 350);
//   const reqCodeDebounced = useDebounced(reqCode, 350);

//   const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
//   const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

//   const qs = useMemo(() => {
//     const p = new URLSearchParams();
//     p.set('include', 'list,stats');
//     p.set('page', String(page));
//     p.set('pageSize', String(pageSize));
//     p.set('sortBy', sortBy);
//     p.set('sortDir', sortDir);
//     if (dateFrom) p.set('from', dateFrom);
//     if (dateTo) p.set('to', dateTo);
//     if (status) p.set('status', status);
//     if (source) p.set('source', source);
//     if (duplicateType) {
//       p.set('duplicateType', duplicateType);
//       p.set('isDuplicate', 'true');
//     }
//     if (recruiterId) p.set('recruiterId', recruiterId);
//     if (teamLeadId) p.set('teamLeadId', teamLeadId);
//     if (reportingToId) p.set('reportingToId', reportingToId);
//     if (requirementId) p.set('requirementId', requirementId);
//     if (reqCodeDebounced.trim()) p.set('reqCode', reqCodeDebounced.trim());
//     if (search.trim()) p.set('search', search.trim());
//     return p.toString();
//   }, [
//     page,
//     pageSize,
//     sortBy,
//     sortDir,
//     dateFrom,
//     dateTo,
//     status,
//     source,
//     duplicateType,
//     recruiterId,
//     teamLeadId,
//     reportingToId,
//     requirementId,
//     reqCodeDebounced,
//     search,
//   ]);

//   // ── Main data ──
//   const { data, isLoading, isFetching, refetch } = useQuery({
//     queryKey: ['ingestion-logs', qs],
//     queryFn: async () =>
//       (
//         await axios.get(`/candidate/api/resume/ingestion-logs?${qs}`, {
//           baseURL: '/api/proxy',
//           withCredentials: true,
//           headers: { 'Content-Type': undefined },
//           transformRequest: (d: any) => d,
//         })
//       ).data as ListResponse,
//     staleTime: 15_000,
//     placeholderData: keepPreviousData,
//   });

//   const rows = data?.rows ?? [];
//   const stats = data?.stats;
//   const pagination = data?.pagination;

//   // ── Filter option data (core service — same endpoints the dashboard uses) ──
//   const { data: hierarchyData } = useQuery({
//     queryKey: ['hierarchy-filters'],
//     queryFn: async () =>
//       (await axios.get('/users/hierarchy-filters')).data?.data as {
//         teamLeads: HierarchyUser[];
//         reportingTo: HierarchyUser[];
//       },
//     staleTime: 5 * 60 * 1000,
//   });

//   // Recruiter roster → names for the dropdown AND resolving row.recruiterId.
//   // ⚠️ Point this at YOUR users/recruiter-list endpoint if the path differs.
//   const { data: recruitersRaw, isLoading: recruitersLoading } = useQuery({
//     queryKey: ['ingest-recruiters'],
//     queryFn: async () => (await axios.get('/users?limit=1000')).data?.data as any[],
//     staleTime: 5 * 60 * 1000,
//   });

//   // Requirements → titles for the dropdown + drawer. Requirement lives in the
//   // core service, so we resolve titles here (NOT in the log service).
//   // Sourced from /dashboard/my-assignments (scoped to the current user's
//   // assignments). Swap to an org-wide /requirements list endpoint if you have one.
//   const { data: assignmentsRaw, isLoading: reqsLoading } = useQuery({
//     queryKey: ['ingest-requirements'],
//     queryFn: async () => (await axios.get('/dashboard/my-assignments')).data?.data as any[],
//     staleTime: 5 * 60 * 1000,
//   });

//   const recruiters: RecruiterLite[] = useMemo(
//     () =>
//       (recruitersRaw ?? [])
//         .map(u => ({ id: u.id, name: userName(u) || u.employeeId || u.id }))
//         .sort((a, b) => a.name.localeCompare(b.name)),
//     [recruitersRaw]
//   );

//   const recruiterMap = useMemo(() => {
//     const m = new Map<string, string>();
//     recruiters.forEach(r => m.set(r.id, r.name));
//     return m;
//   }, [recruiters]);

//   const recruiterName = (id: string | null) => {
//     if (!id) return '—';
//     return recruiterMap.get(id) ?? `${id.slice(0, 8)}…`;
//   };

//   const requirements: RequirementLite[] = useMemo(() => {
//     const map = new Map<string, RequirementLite>();
//     (assignmentsRaw ?? []).forEach(a => {
//       const r = a?.requirement;
//       if (r && !map.has(r.id)) map.set(r.id, { id: r.id, reqCode: r.reqCode, title: r.title });
//     });
//     return [...map.values()].sort((a, b) => a.reqCode.localeCompare(b.reqCode));
//   }, [assignmentsRaw]);

//   const reqMap = useMemo(() => {
//     const m = new Map<string, RequirementLite>();
//     requirements.forEach(r => m.set(r.id, r));
//     return m;
//   }, [requirements]);

//   //   const requirementLabel = (id: string | null) => {
//   //     console.log('lookup id:', id);
//   //     if (!id) return '—';
//   //     const r = reqMap.get(id);
//   //     console.log('lookup result:', r);

//   //     return r ? r.title : '—';
//   //   };
//   const requirementLabel = (id: string | null, reqCode?: string | null) => {
//     if (!id) return reqCode ?? '—';

//     const r = reqMap.get(id);

//     return r?.title ?? reqCode ?? 'Unknown Requirement';
//   };

//   function handleSort(col: SortKey) {
//     if (sortBy === col) {
//       setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
//     } else {
//       setSortBy(col);
//       setSortDir('desc');
//     }
//   }

//   const hasAnyFilter =
//     !!dateRange?.from ||
//     !!status ||
//     !!source ||
//     !!duplicateType ||
//     !!recruiterId ||
//     !!teamLeadId ||
//     !!reportingToId ||
//     !!requirementId ||
//     !!reqCode.trim() ||
//     !!searchInput.trim();

//   function clearAll() {
//     setFilters(EMPTY_FILTERS);
//     setPage(1);
//   }

//   const dupSub =
//     stats && (stats.duplicatesByType.TEXT_CHECKSUM || stats.duplicatesByType.BINARY_CHECKSUM)
//       ? `${stats.duplicatesByType.TEXT_CHECKSUM ?? 0} text · ${stats.duplicatesByType.BINARY_CHECKSUM ?? 0} binary`
//       : 'no duplicates';

//   const topFailStep = stats
//     ? Object.entries(stats.failuresByStep).sort((a, b) => b[1] - a[1])[0]?.[0]
//     : undefined;

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
//           <p className="text-[18px] font-semibold text-foreground leading-tight flex items-center gap-2">
//             <FileText size={18} className="text-emerald-500" />
//             Ingestion logs
//           </p>
//           <p className="text-[12px] text-muted-foreground mt-1">
//             Every resume ingestion attempt — success, duplicate, manual review and failure — across
//             manual uploads and portal pulls.
//           </p>
//         </div>
//         <Button
//           variant="outline"
//           size="sm"
//           className="h-8 gap-1.5 text-xs"
//           onClick={() => refetch()}
//           disabled={isFetching}
//         >
//           <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
//           Refresh
//         </Button>
//       </div>

//       {/* ── Filter bar ── */}
//       <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border bg-background shrink-0">
//         <DateRangePicker range={dateRange} onChange={r => patchFilters({ dateRange: r })} />

//         <Select
//           value={status || '_all'}
//           onValueChange={v => patchFilters({ status: v === '_all' ? '' : v })}
//         >
//           <SelectTrigger className="h-8 w-36 text-xs">
//             <SelectValue placeholder="All statuses" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="_all">All statuses</SelectItem>
//             {STATUS_OPTIONS.map(s => (
//               <SelectItem key={s} value={s}>
//                 {STATUS_META[s].label}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <Select
//           value={source || '_all'}
//           onValueChange={v => patchFilters({ source: v === '_all' ? '' : v })}
//         >
//           <SelectTrigger className="h-8 w-32 text-xs">
//             <SelectValue placeholder="All sources" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="_all">All sources</SelectItem>
//             {SOURCE_OPTIONS.map(s => (
//               <SelectItem key={s} value={s}>
//                 {SOURCE_META[s]?.label ?? s}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <Select
//           value={duplicateType || '_all'}
//           onValueChange={v => patchFilters({ duplicateType: v === '_all' ? '' : v })}
//         >
//           <SelectTrigger className="h-8 w-40 text-xs">
//             <SelectValue placeholder="Dup. type" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="_all">Any duplicate type</SelectItem>
//             {DUP_OPTIONS.map(d => (
//               <SelectItem key={d} value={d}>
//                 {DUP_LABEL[d]}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <RecruiterPicker
//           recruiters={recruiters}
//           value={recruiterId}
//           onChange={id => patchFilters({ recruiterId: id })}
//           loading={recruitersLoading}
//         />

//         <RequirementPicker
//           requirements={requirements}
//           value={requirementId}
//           onChange={id => patchFilters({ requirementId: id })}
//           loading={reqsLoading}
//         />

//         {hierarchyData?.teamLeads && hierarchyData.teamLeads.length > 0 && (
//           <Select
//             value={teamLeadId || '_all'}
//             onValueChange={v => patchFilters({ teamLeadId: v === '_all' ? '' : v })}
//           >
//             <SelectTrigger className="h-8 w-40 text-xs gap-1.5">
//               <Users size={12} className="text-muted-foreground shrink-0" />
//               <SelectValue placeholder="All team leads" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="_all">All team leads</SelectItem>
//               {hierarchyData.teamLeads.map(t => (
//                 <SelectItem key={t.id} value={t.id}>
//                   {userName(t)}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         )}

//         {hierarchyData?.reportingTo && hierarchyData.reportingTo.length > 0 && (
//           <Select
//             value={reportingToId || '_all'}
//             onValueChange={v => patchFilters({ reportingToId: v === '_all' ? '' : v })}
//           >
//             <SelectTrigger className="h-8 w-40 text-xs gap-1.5">
//               <Building2 size={12} className="text-muted-foreground shrink-0" />
//               <SelectValue placeholder="All managers" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="_all">All managers</SelectItem>
//               {hierarchyData.reportingTo.map(r => (
//                 <SelectItem key={r.id} value={r.id}>
//                   {userName(r)}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         )}

//         {/* Req code */}
//         <div className="relative">
//           <Hash
//             size={12}
//             className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
//           />
//           <Input
//             value={reqCode}
//             onChange={e => patchFilters({ reqCode: e.target.value })}
//             placeholder="Req code"
//             className="h-8 w-28 pl-7 text-xs"
//           />
//         </div>

//         {/* Free-text search */}
//         <div className="relative">
//           <Search
//             size={12}
//             className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
//           />
//           <Input
//             value={searchInput}
//             onChange={e => patchFilters({ searchInput: e.target.value })}
//             placeholder="Name, email, file…"
//             className="h-8 w-48 pl-7 text-xs"
//           />
//         </div>

//         {hasAnyFilter && (
//           <button
//             onClick={clearAll}
//             className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 ml-1"
//           >
//             <X size={11} /> Clear all
//           </button>
//         )}
//       </div>

//       {/* ── Scroll area ── */}
//       <div className="flex-1 overflow-y-auto bg-background">
//         {/* Stat cards */}
//         <div className="grid grid-cols-6 gap-3 px-5 py-4">
//           <StatCard
//             label="Total"
//             value={stats?.total ?? 0}
//             sub="attempts in range"
//             icon={FileText}
//             accentColor="#378ADD"
//             loading={isLoading}
//           />
//           <StatCard
//             label="Success rate"
//             value={stats ? `${stats.successRate}%` : '—'}
//             sub={`${(stats?.byStatus.SUCCESS ?? 0) + (stats?.byStatus.DRAFT ?? 0)} ingested`}
//             icon={CheckCircle2}
//             accentColor="#10B981"
//             loading={isLoading}
//           />
//           <StatCard
//             label="Duplicates"
//             value={stats?.byStatus.DUPLICATE ?? 0}
//             sub={dupSub}
//             icon={Copy}
//             accentColor="#EF9F27"
//             loading={isLoading}
//             active={status === 'DUPLICATE'}
//             onClick={() => patchFilters({ status: status === 'DUPLICATE' ? '' : 'DUPLICATE' })}
//           />
//           <StatCard
//             label="Manual review"
//             value={stats?.byStatus.MANUAL_REVIEW ?? 0}
//             sub="no email found"
//             icon={UserSearch}
//             accentColor="#7F77DD"
//             loading={isLoading}
//             active={status === 'MANUAL_REVIEW'}
//             onClick={() =>
//               patchFilters({ status: status === 'MANUAL_REVIEW' ? '' : 'MANUAL_REVIEW' })
//             }
//           />
//           <StatCard
//             label="Failed"
//             value={stats?.byStatus.FAILED ?? 0}
//             sub={topFailStep ? `most at ${STEP_LABEL[topFailStep] ?? topFailStep}` : 'no failures'}
//             icon={AlertTriangle}
//             accentColor="#E24B4A"
//             loading={isLoading}
//             active={status === 'FAILED'}
//             onClick={() => patchFilters({ status: status === 'FAILED' ? '' : 'FAILED' })}
//           />
//           <StatCard
//             label="Tokens used"
//             value={stats ? stats.tokensUsed.toLocaleString() : 0}
//             sub={stats ? `avg ${fmtDuration(stats.avgDurationMs)} / parse` : ''}
//             icon={Sparkles}
//             accentColor="#6366f1"
//             loading={isLoading}
//           />
//         </div>

//         {/* Table */}
//         <div className="px-5 pb-5">
//           <LogTable
//             rows={rows}
//             loading={isLoading}
//             recruiterName={recruiterName}
//             requirementLabel={requirementLabel}
//             onRowClick={setSelected}
//             sortBy={sortBy}
//             sortDir={sortDir}
//             onSort={handleSort}
//           />

//           {/* Pagination */}
//           {pagination && pagination.total > 0 && (
//             <div className="flex items-center justify-between mt-3 px-1">
//               <p className="text-[11px] text-muted-foreground">
//                 Showing{' '}
//                 <span className="font-medium text-foreground">
//                   {(pagination.page - 1) * pagination.pageSize + 1}–
//                   {Math.min(pagination.page * pagination.pageSize, pagination.total)}
//                 </span>{' '}
//                 of{' '}
//                 <span className="font-medium text-foreground">
//                   {pagination.total.toLocaleString()}
//                 </span>
//               </p>

//               <div className="flex items-center gap-3">
//                 <Select value={String(pageSize)} onValueChange={v => changePageSize(Number(v))}>
//                   <SelectTrigger className="h-7 w-24 text-[11px]">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {PAGE_SIZES.map(s => (
//                       <SelectItem key={s} value={String(s)}>
//                         {s} / page
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>

//                 <div className="flex items-center gap-1">
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="h-7 w-7 p-0"
//                     disabled={pagination.page <= 1 || isFetching}
//                     onClick={() => setPage(p => Math.max(1, p - 1))}
//                   >
//                     <ChevronLeft size={14} />
//                   </Button>
//                   <span className="text-[11px] text-muted-foreground px-1 tabular-nums">
//                     {pagination.page} / {pagination.totalPages}
//                   </span>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="h-7 w-7 p-0"
//                     disabled={!pagination.hasNext || isFetching}
//                     onClick={() => setPage(p => p + 1)}
//                   >
//                     <ChevronRight size={14} />
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Detail drawer */}
//       <DetailDrawer
//         row={selected}
//         recruiterName={recruiterName}
//         requirementLabel={requirementLabel}
//         onClose={() => setSelected(null)}
//       />
//     </div>
//   );
// }

// export default function IngestLogsPage() {
//   return (
//     <Suspense fallback={null}>
//       <IngestLogsContent />
//     </Suspense>
//   );
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// =============================================================================
// /ingest-logs  —  Recruiter parsing monitor
//
// Purely a RECRUITER monitoring view (no candidate data). One row per recruiter:
//   name · total parsed · by source (manual / portal-Naukri / extension) ·
//   success · duplicate · manual-review · failed · success rate.
// Click a recruiter → drawer with their individual attempts + the exact error.
//
// Defaults to YESTERDAY. Date range filter lets you check any day/range.
//
// Data:
//   Aggregates → GET /candidate/api/resume/ingestion-logs?include=stats,byRecruiter
//   Drill-down → GET /candidate/api/resume/ingestion-logs?include=list&recruiterId=…
//   Recruiter names → /users (core service, client-side map)
//
// Requires the getByRecruiter backend tweak (group by recruiterId+source+status).
// =============================================================================

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
} from 'date-fns';
import { DateRange } from 'react-day-picker';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  X,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  FileText,
  CheckCircle2,
  Copy,
  AlertTriangle,
  UserSearch,
  Info,
  Upload,
  Globe,
  Chrome,
  Clock,
  Briefcase,
  Hash,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

type IngestionStatus = 'SUCCESS' | 'DUPLICATE' | 'MANUAL_REVIEW' | 'FAILED' | 'DRAFT';

// Per-recruiter aggregate row (from getByRecruiter, grouped by recruiter+source+status)
interface RecruiterAgg {
  recruiterId: string;
  total: number;
  status: Record<string, number>; // { SUCCESS, DUPLICATE, MANUAL_REVIEW, FAILED, DRAFT }
  source: Record<string, number>; // { MANUAL_UPLOAD, PORTAL, CHROME_EXTENSION, BATCH, UNKNOWN }
}

interface LogStats {
  total: number;
  successRate: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  duplicatesByType: Record<string, number>;
  failuresByStep: Record<string, number>;
  tokensUsed: number;
  avgDurationMs: number;
  avgConfidence: number | null;
}

interface AggResponse {
  success: boolean;
  stats?: LogStats;
  byRecruiter?: RecruiterAgg[];
}

// Individual attempt row (drill-down; only the ops-relevant fields are used)
interface AttemptRow {
  id: string;
  source: string;
  status: IngestionStatus;
  fileName: string | null;
  reqCode: string | null;
  requirementId: string | null;
  failedStep: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  duplicateType: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  createdAt: string;
}

interface AttemptResponse {
  success: boolean;
  rows: AttemptRow[];
  pagination: { total: number };
}

interface HierarchyUser {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
}

interface RecruiterLite {
  id: string;
  name: string;
}

interface RequirementLite {
  id: string;
  reqCode: string;
  title: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  IngestionStatus,
  { label: string; color: string; bg: string; text: string; icon: React.ElementType }
> = {
  SUCCESS: {
    label: 'Success',
    color: '#10B981',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  DUPLICATE: {
    label: 'Duplicate',
    color: '#EF9F27',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-500',
    icon: Copy,
  },
  MANUAL_REVIEW: {
    label: 'Manual review',
    color: '#7F77DD',
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    icon: UserSearch,
  },
  FAILED: {
    label: 'Failed',
    color: '#E24B4A',
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    icon: AlertTriangle,
  },
  DRAFT: {
    label: 'Draft',
    color: '#94a3b8',
    bg: 'bg-slate-500/10',
    text: 'text-slate-500 dark:text-slate-400',
    icon: FileText,
  },
};

const SOURCE_META: Record<string, { label: string; bg: string; text: string }> = {
  MANUAL_UPLOAD: {
    label: 'Manual',
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
  },
  PORTAL: { label: 'Portal', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  CHROME_EXTENSION: {
    label: 'Extension',
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
  },
  BATCH: { label: 'Batch', bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
  UNKNOWN: { label: 'Unknown', bg: 'bg-slate-500/10', text: 'text-slate-500 dark:text-slate-400' },
};

const DUP_LABEL: Record<string, string> = {
  BINARY_CHECKSUM: 'Binary (same file)',
  TEXT_CHECKSUM: 'Text (re-encoded)',
  EMAIL_PHONE: 'Email / phone',
};

const STEP_LABEL: Record<string, string> = {
  NORMALIZE_INPUT: 'Normalize input',
  EXTRACT_TEXT: 'Extract text',
  EMAIL_PRECHECK: 'Email pre-check',
  DUPLICATE_CHECK: 'Duplicate check',
  S3_UPLOAD: 'S3 upload',
  AI_PARSE: 'AI parse',
  PERSIST: 'Persist',
  CORE_SYNC: 'Core sync',
};

const STATUS_OPTIONS: IngestionStatus[] = [
  'SUCCESS',
  'DUPLICATE',
  'MANUAL_REVIEW',
  'FAILED',
  'DRAFT',
];
const SOURCE_OPTIONS = ['MANUAL_UPLOAD', 'PORTAL', 'CHROME_EXTENSION', 'BATCH', 'UNKNOWN'];

function yesterdayRange(): DateRange {
  const y = subDays(new Date(), 1);
  return { from: y, to: y };
}

const PRESETS = [
  { label: 'Yesterday', from: () => subDays(new Date(), 1), to: () => subDays(new Date(), 1) },
  { label: 'Today', from: () => new Date(), to: () => new Date() },
  { label: 'Last 7 days', from: () => subDays(new Date(), 6), to: () => new Date() },
  { label: 'Last 30 days', from: () => subDays(new Date(), 29), to: () => new Date() },
  { label: 'This month', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
  { label: 'This year', from: () => startOfYear(new Date()), to: () => new Date() },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function nameInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function userName(u: { firstName?: string; lastName?: string; name?: string }) {
  if (u.name) return u.name;
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// ─── Date Range Picker ─────────────────────────────────────────────────────────

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
      ? range.from.getTime() === range.to.getTime()
        ? format(range.from, 'dd MMM yyyy')
        : `${format(range.from, 'dd MMM yy')} – ${format(range.to, 'dd MMM yy')}`
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
      <PopoverContent className="w-auto p-0" align="start">
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

// ─── Searchable recruiter picker ───────────────────────────────────────────────

function RecruiterPicker({
  recruiters,
  value,
  onChange,
  loading,
}: {
  recruiters: RecruiterLite[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = recruiters.find(r => r.id === value);
  const filtered = q.trim()
    ? recruiters.filter(r => r.name.toLowerCase().includes(q.toLowerCase()))
    : recruiters;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-medium w-44 justify-between',
            value && 'border-primary/40 bg-primary/5 text-primary'
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <UserSearch size={12} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{selected ? selected.name : 'All recruiters'}</span>
          </span>
          {value ? (
            <span
              role="button"
              aria-label="Clear recruiter"
              onClick={e => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X size={11} />
            </span>
          ) : (
            <ChevronDown size={12} className="text-muted-foreground shrink-0" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search recruiter…"
              className="w-full h-7 pl-7 pr-2 text-xs bg-muted/50 rounded-md outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {loading ? (
            <div className="p-2 space-y-1">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">
              No recruiters found
            </p>
          ) : (
            filtered.slice(0, 200).map(r => (
              <button
                key={r.id}
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                  setQ('');
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] hover:bg-muted transition-colors',
                  r.id === value && 'bg-primary/5 text-primary'
                )}
              >
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">
                  {nameInitials(r.name)}
                </span>
                <span className="truncate">{r.name}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Searchable requirement picker ─────────────────────────────────────────────

function RequirementPicker({
  requirements,
  value,
  onChange,
  loading,
}: {
  requirements: RequirementLite[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = requirements.find(r => r.id === value);
  const filtered = q.trim()
    ? requirements.filter(r => `${r.reqCode} ${r.title}`.toLowerCase().includes(q.toLowerCase()))
    : requirements;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-medium w-48 justify-between',
            value && 'border-primary/40 bg-primary/5 text-primary'
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Briefcase size={12} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{selected ? selected.reqCode : 'All requirements'}</span>
          </span>
          {value ? (
            <span
              role="button"
              aria-label="Clear requirement"
              onClick={e => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X size={11} />
            </span>
          ) : (
            <ChevronDown size={12} className="text-muted-foreground shrink-0" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search req code or title…"
              className="w-full h-7 pl-7 pr-2 text-xs bg-muted/50 rounded-md outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {loading ? (
            <div className="p-2 space-y-1">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">
              No requirements found
            </p>
          ) : (
            filtered.slice(0, 200).map(r => (
              <button
                key={r.id}
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                  setQ('');
                }}
                className={cn(
                  'w-full flex flex-col items-start px-2 py-1.5 rounded-md text-left hover:bg-muted transition-colors',
                  r.id === value && 'bg-primary/5'
                )}
              >
                <span className="text-[11px] font-mono text-muted-foreground">{r.reqCode}</span>
                <span className="text-[12px] text-foreground truncate w-full">{r.title}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IngestionStatus }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
        m.bg,
        m.text
      )}
    >
      <Icon size={10} />
      {m.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const m = SOURCE_META[source] ?? SOURCE_META.UNKNOWN;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
        m.bg,
        m.text
      )}
    >
      {m.label}
    </span>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor,
  loading,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accentColor: string;
  loading?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
      className={cn(
        'bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5 relative overflow-hidden',
        onClick && 'cursor-pointer hover:shadow-sm hover:border-border/80 transition-all',
        active && 'ring-1 ring-primary/40'
      )}
    >
      <div
        className="absolute right-3 top-3 opacity-[0.07]"
        style={{ color: accentColor }}
        aria-hidden
      >
        <Icon size={34} />
      </div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-8 w-14 mt-1" />
      ) : (
        <p className="text-[30px] font-semibold tabular-nums leading-none">{value}</p>
      )}
      {sub && <p className="text-[10.5px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Recruiter monitor table ───────────────────────────────────────────────────

type RecruiterRow = RecruiterAgg & { name: string };
type SortKey = 'name' | 'total' | 'success' | 'failed' | 'rate';

const GRID =
  'grid grid-cols-[minmax(170px,1.4fr)_64px_64px_64px_64px_72px_60px_60px_72px_92px] gap-2 px-4';

function HeaderCell({
  label,
  col,
  sortBy,
  sortDir,
  onSort,
  align = 'right',
  title,
}: {
  label: string;
  col?: SortKey;
  sortBy: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (c: SortKey) => void;
  align?: 'left' | 'right';
  title?: string;
}) {
  if (!col) {
    return (
      <div className={cn(align === 'right' && 'text-right')} title={title}>
        {label}
      </div>
    );
  }
  const active = sortBy === col;
  return (
    <button
      title={title}
      onClick={() => onSort(col)}
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground transition-colors',
        align === 'right' ? 'justify-end flex-row-reverse' : ''
      )}
    >
      {label}
      {active && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
    </button>
  );
}

function Num({ n, color }: { n: number; color?: string }) {
  return (
    <div className="text-right tabular-nums" style={{ color: n > 0 ? color : undefined }}>
      {n > 0 ? n : <span className="text-muted-foreground/30">—</span>}
    </div>
  );
}

function RecruiterMonitorTable({
  rows,
  loading,
  onRowClick,
  sortBy,
  sortDir,
  onSort,
}: {
  rows: RecruiterRow[];
  loading: boolean;
  onRowClick: (r: RecruiterRow) => void;
  sortBy: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (c: SortKey) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        {/* header */}
        <div
          className={cn(
            GRID,
            'py-2.5 border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[760px]'
          )}
        >
          <HeaderCell
            label="Recruiter"
            col="name"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            align="left"
          />
          <HeaderCell label="Total" col="total" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          <HeaderCell
            label="Manual"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            title="Manual uploads"
          />
          <HeaderCell
            label="Portal"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            title="Portal / Naukri"
          />
          <HeaderCell
            label="Ext"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            title="Chrome extension"
          />
          <HeaderCell
            label="Success"
            col="success"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
          />
          <HeaderCell
            label="Dup"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            title="Duplicates"
          />
          <HeaderCell
            label="Review"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            title="Manual review (no email)"
          />
          <HeaderCell
            label="Failed"
            col="failed"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
          />
          <HeaderCell label="Rate" col="rate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
        </div>

        {loading ? (
          <div className="divide-y divide-border/60 min-w-[760px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Info size={22} className="opacity-40" />
            <p className="text-[13px]">No recruiter activity in this period</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 min-w-[760px]">
            {rows.map(r => {
              const success = r.status.SUCCESS ?? 0;
              const draft = r.status.DRAFT ?? 0;
              const dup = r.status.DUPLICATE ?? 0;
              const review = r.status.MANUAL_REVIEW ?? 0;
              const failed = r.status.FAILED ?? 0;
              const rate = pct(success + draft, r.total);
              const rateColor = rate >= 80 ? '#10B981' : rate >= 50 ? '#EF9F27' : '#E24B4A';

              return (
                <div
                  key={r.recruiterId}
                  onClick={() => onRowClick(r)}
                  className={cn(
                    GRID,
                    'py-3 items-center hover:bg-muted/40 cursor-pointer transition-colors text-[12px]'
                  )}
                >
                  {/* recruiter */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                      {nameInitials(r.name)}
                    </span>
                    <span className="font-medium text-foreground truncate">{r.name}</span>
                  </div>

                  <div className="text-right tabular-nums font-semibold text-foreground">
                    {r.total}
                  </div>
                  <Num n={r.source.MANUAL_UPLOAD ?? 0} />
                  <Num n={r.source.PORTAL ?? 0} />
                  <Num n={r.source.CHROME_EXTENSION ?? 0} />
                  <Num n={success} color="#10B981" />
                  <Num n={dup} color="#BA7517" />
                  <Num n={review} color="#7F77DD" />
                  <Num n={failed} color="#E24B4A" />

                  {/* rate */}
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${rate}%`, background: rateColor }}
                      />
                    </div>
                    <span
                      className="tabular-nums text-[11px] w-8 text-right"
                      style={{ color: rateColor }}
                    >
                      {rate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Recruiter drill-down drawer (individual attempts + errors) ────────────────

function RecruiterDrawer({
  recruiter,
  dateFrom,
  dateTo,
  requirementId,
  reqCode,
  requirementLabel,
  onClose,
}: {
  recruiter: RecruiterRow | null;
  dateFrom?: string;
  dateTo?: string;
  requirementId?: string;
  reqCode?: string;
  requirementLabel: (id: string | null, reqCode?: string | null) => string;
  onClose: () => void;
}) {
  const axios = useAxios();

  const attemptsQs = useMemo(() => {
    if (!recruiter) return '';
    const p = new URLSearchParams();
    p.set('include', 'list');
    p.set('recruiterId', recruiter.recruiterId);
    p.set('pageSize', '100');
    p.set('sortBy', 'createdAt');
    p.set('sortDir', 'desc');
    if (dateFrom) p.set('from', dateFrom);
    if (dateTo) p.set('to', dateTo);
    // Keep the drill-down scoped to the same requirement filter as the table
    if (requirementId) p.set('requirementId', requirementId);
    if (reqCode) p.set('reqCode', reqCode);
    return p.toString();
  }, [recruiter, dateFrom, dateTo, requirementId, reqCode]);

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter-attempts', attemptsQs],
    enabled: !!recruiter,
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/resume/ingestion-logs?${attemptsQs}`, {
          baseURL: '/api/proxy',
          withCredentials: true,
          headers: { 'Content-Type': undefined },
          transformRequest: (d: any) => d,
        })
      ).data as AttemptResponse,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  if (!recruiter) return null;

  const attempts = data?.rows ?? [];
  const success = recruiter.status.SUCCESS ?? 0;
  const draft = recruiter.status.DRAFT ?? 0;
  const rate = pct(success + draft, recruiter.total);

  const summary: { key: string; label: string; count: number; color: string }[] = [
    { key: 'total', label: 'Total', count: recruiter.total, color: 'hsl(var(--foreground))' },
    { key: 'success', label: 'Success', count: success, color: '#10B981' },
    { key: 'dup', label: 'Duplicate', count: recruiter.status.DUPLICATE ?? 0, color: '#BA7517' },
    {
      key: 'review',
      label: 'Review',
      count: recruiter.status.MANUAL_REVIEW ?? 0,
      color: '#7F77DD',
    },
    { key: 'failed', label: 'Failed', count: recruiter.status.FAILED ?? 0, color: '#E24B4A' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 animate-in fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[460px] max-w-[92vw] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right">
        {/* header */}
        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold shrink-0">
                {nameInitials(recruiter.name)}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">
                  {recruiter.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {recruiter.total} attempts · {rate}% success
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted shrink-0"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* summary chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {summary.map(s => (
              <span
                key={s.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-muted/60"
                style={{ color: s.color }}
              >
                {s.label}
                <span className="opacity-50">·</span>
                {s.count}
              </span>
            ))}
          </div>

          {/* source split */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {SOURCE_OPTIONS.filter(s => (recruiter.source[s] ?? 0) > 0).map(s => (
              <span
                key={s}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                  SOURCE_META[s].bg,
                  SOURCE_META[s].text
                )}
              >
                {SOURCE_META[s].label}
                <span className="opacity-50">·</span>
                {recruiter.source[s]}
              </span>
            ))}
          </div>
        </div>

        {/* attempts list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
              Attempts (newest first)
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : attempts.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-8 text-center">
                No attempts in this period
              </p>
            ) : (
              <div className="space-y-2">
                {attempts.map(a => {
                  const isBad = a.status === 'FAILED' || a.status === 'MANUAL_REVIEW';
                  const detail =
                    a.status === 'DUPLICATE' && a.duplicateType
                      ? (DUP_LABEL[a.duplicateType] ?? a.duplicateType)
                      : a.status === 'FAILED' && a.failedStep
                        ? `${STEP_LABEL[a.failedStep] ?? a.failedStep}${a.errorCode ? ` · ${a.errorCode}` : ''}`
                        : a.status === 'MANUAL_REVIEW'
                          ? 'No email found in resume'
                          : null;

                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'rounded-lg border p-3',
                        isBad ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-border bg-muted/30'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <StatusBadge status={a.status} />
                          <SourceBadge source={a.source} />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(a.createdAt), 'dd MMM HH:mm')}
                        </span>
                      </div>

                      <p
                        className="text-[12px] text-foreground truncate"
                        title={requirementLabel(a.requirementId, a.reqCode)}
                      >
                        {a.fileName ?? 'resume'}
                        {(a.reqCode || a.requirementId) && (
                          <span className="text-muted-foreground text-[11px] ml-1.5">
                            · {requirementLabel(a.requirementId, a.reqCode)}
                          </span>
                        )}
                      </p>

                      {detail && (
                        <p
                          className={cn(
                            'text-[11px] mt-1',
                            isBad ? 'text-red-500' : 'text-muted-foreground'
                          )}
                        >
                          {detail}
                        </p>
                      )}
                      {a.errorMessage && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                          {a.errorMessage}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        {a.httpStatus && <span className="font-mono">HTTP {a.httpStatus}</span>}
                        <span>{fmtDuration(a.durationMs)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Filters model ─────────────────────────────────────────────────────────────

interface Filters {
  dateRange: DateRange | undefined;
  recruiterId: string;
  teamLeadId: string;
  reportingToId: string;
  requirementId: string;
  reqCode: string;
  source: string;
  status: string;
}

function defaultFilters(): Filters {
  return {
    dateRange: yesterdayRange(), // ← default: yesterday
    recruiterId: '',
    teamLeadId: '',
    reportingToId: '',
    requirementId: '',
    reqCode: '',
    source: '',
    status: '',
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function IngestLogsContent() {
  const axios = useAxios();

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortBy, setSortBy] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<RecruiterRow | null>(null);

  function patchFilters(patch: Partial<Filters>) {
    setFilters(f => ({ ...f, ...patch }));
  }

  const {
    dateRange,
    recruiterId,
    teamLeadId,
    reportingToId,
    requirementId,
    reqCode,
    source,
    status,
  } = filters;

  const reqCodeDebounced = useDebounced(reqCode, 350);

  // Send local day-boundaries as ISO so "yesterday" is correct in the user's TZ
  // (a plain yyyy-MM-dd "to" would be parsed as midnight and exclude the whole day).
  const dateFrom = dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined;
  const dateTo = dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('include', 'stats,byRecruiter');
    if (dateFrom) p.set('from', dateFrom);
    if (dateTo) p.set('to', dateTo);
    if (recruiterId) p.set('recruiterId', recruiterId);
    if (teamLeadId) p.set('teamLeadId', teamLeadId);
    if (reportingToId) p.set('reportingToId', reportingToId);
    if (requirementId) p.set('requirementId', requirementId);
    if (reqCodeDebounced.trim()) p.set('reqCode', reqCodeDebounced.trim());
    if (source) p.set('source', source);
    if (status) p.set('status', status);
    return p.toString();
  }, [
    dateFrom,
    dateTo,
    recruiterId,
    teamLeadId,
    reportingToId,
    requirementId,
    reqCodeDebounced,
    source,
    status,
  ]);

  // ── Aggregates ──
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['recruiter-monitor', qs],
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/resume/ingestion-logs?${qs}`, {
          baseURL: '/api/proxy',
          withCredentials: true,
          headers: { 'Content-Type': undefined },
          transformRequest: (d: any) => d,
        })
      ).data as AggResponse,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  const stats = data?.stats;

  // ── Filter option data (core service) ──
  const { data: hierarchyData } = useQuery({
    queryKey: ['hierarchy-filters'],
    queryFn: async () =>
      (await axios.get('/users/hierarchy-filters')).data?.data as {
        teamLeads: HierarchyUser[];
        reportingTo: HierarchyUser[];
      },
    staleTime: 5 * 60 * 1000,
  });

  // ⚠️ Point at YOUR users/recruiter-list endpoint if the path differs.
  const { data: recruitersRaw, isLoading: recruitersLoading } = useQuery({
    queryKey: ['ingest-recruiters'],
    queryFn: async () => (await axios.get('/users?limit=1000')).data?.data as any[],
    staleTime: 5 * 60 * 1000,
  });

  // Requirements → Requirement lives in the CORE microservice (the log table only
  // stores requirementId + reqCode), so titles are resolved here on the client.
  // ⚠️ /dashboard/my-assignments is scoped to the current user's assignments.
  // Swap to an org-wide /requirements list endpoint for full admin coverage.
  const { data: assignmentsRaw, isLoading: reqsLoading } = useQuery({
    queryKey: ['ingest-requirements'],
    queryFn: async () => (await axios.get('/dashboard/my-assignments')).data?.data as any[],
    staleTime: 5 * 60 * 1000,
  });

  const requirements: RequirementLite[] = useMemo(() => {
    const map = new Map<string, RequirementLite>();
    (assignmentsRaw ?? []).forEach(a => {
      const r = a?.requirement;
      if (r && !map.has(r.id)) map.set(r.id, { id: r.id, reqCode: r.reqCode, title: r.title });
    });
    return [...map.values()].sort((a, b) => a.reqCode.localeCompare(b.reqCode));
  }, [assignmentsRaw]);

  const reqMap = useMemo(() => {
    const m = new Map<string, RequirementLite>();
    requirements.forEach(r => m.set(r.id, r));
    return m;
  }, [requirements]);

  // Falls back to the reqCode stored on the log row when the title isn't in scope.
  const requirementLabel = (id: string | null, code?: string | null) => {
    if (!id) return code ?? '—';
    const r = reqMap.get(id);
    return r ? `${r.reqCode} · ${r.title}` : (code ?? `${id.slice(0, 8)}…`);
  };

  const recruiters: RecruiterLite[] = useMemo(
    () =>
      (recruitersRaw ?? [])
        .map(u => ({ id: u.id, name: userName(u) || u.employeeId || u.id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [recruitersRaw]
  );

  const recruiterMap = useMemo(() => {
    const m = new Map<string, string>();
    recruiters.forEach(r => m.set(r.id, r.name));
    return m;
  }, [recruiters]);

  // Merge names + sort client-side (aggregates are already in memory)
  const recruiterRows: RecruiterRow[] = useMemo(() => {
    const agg = data?.byRecruiter ?? [];
    const named = agg.map(a => ({
      ...a,
      name:
        recruiterMap.get(a.recruiterId) ??
        (a.recruiterId === 'UNKNOWN' ? 'Unknown / system' : `${a.recruiterId.slice(0, 8)}…`),
    }));

    const val = (r: RecruiterRow) => {
      switch (sortBy) {
        case 'name':
          return r.name.toLowerCase();
        case 'success':
          return (r.status.SUCCESS ?? 0) + (r.status.DRAFT ?? 0);
        case 'failed':
          return r.status.FAILED ?? 0;
        case 'rate':
          return pct((r.status.SUCCESS ?? 0) + (r.status.DRAFT ?? 0), r.total);
        default:
          return r.total;
      }
    };

    return named.sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data?.byRecruiter, recruiterMap, sortBy, sortDir]);

  // Keep the open drawer's summary numbers fresh when data reloads
  useEffect(() => {
    if (!selected) return;
    const fresh = recruiterRows.find(r => r.recruiterId === selected.recruiterId);
    if (fresh && fresh !== selected) setSelected(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recruiterRows]);

  function handleSort(col: SortKey) {
    if (sortBy === col) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortBy(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  }

  const hasAnyFilter =
    !!recruiterId ||
    !!teamLeadId ||
    !!reportingToId ||
    !!requirementId ||
    !!reqCode.trim() ||
    !!source ||
    !!status;

  function resetToYesterday() {
    setFilters(defaultFilters());
  }

  const rangeLabel =
    dateRange?.from && dateRange?.to
      ? dateRange.from.getTime() === dateRange.to.getTime()
        ? format(dateRange.from, 'dd MMM yyyy')
        : `${format(dateRange.from, 'dd MMM')} – ${format(dateRange.to, 'dd MMM yyyy')}`
      : 'all time';

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
          <p className="text-[18px] font-semibold text-foreground leading-tight flex items-center gap-2">
            <Users size={18} className="text-emerald-500" />
            Recruiter parsing monitor
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Per-recruiter resume ingestion for{' '}
            <span className="font-medium text-foreground">{rangeLabel}</span>
            {requirementId && (
              <>
                {' '}
                on{' '}
                <span className="font-medium text-foreground">
                  {requirementLabel(requirementId)}
                </span>
              </>
            )}{' '}
            — volume, source split, and failures. Click a recruiter for their attempts and errors.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border bg-background shrink-0">
        <DateRangePicker range={dateRange} onChange={r => patchFilters({ dateRange: r })} />

        <RecruiterPicker
          recruiters={recruiters}
          value={recruiterId}
          onChange={id => patchFilters({ recruiterId: id })}
          loading={recruitersLoading}
        />

        <RequirementPicker
          requirements={requirements}
          value={requirementId}
          onChange={id => patchFilters({ requirementId: id })}
          loading={reqsLoading}
        />

        {/* Req code — free text, for requirements not in the picker's scope */}
        <div className="relative">
          <Hash
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={reqCode}
            onChange={e => patchFilters({ reqCode: e.target.value })}
            placeholder="Req code"
            className="h-8 w-28 pl-7 text-xs"
          />
        </div>

        {hierarchyData?.teamLeads && hierarchyData.teamLeads.length > 0 && (
          <Select
            value={teamLeadId || '_all'}
            onValueChange={v => patchFilters({ teamLeadId: v === '_all' ? '' : v })}
          >
            <SelectTrigger className="h-8 w-40 text-xs gap-1.5">
              <Users size={12} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="All team leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All team leads</SelectItem>
              {hierarchyData.teamLeads.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {userName(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hierarchyData?.reportingTo && hierarchyData.reportingTo.length > 0 && (
          <Select
            value={reportingToId || '_all'}
            onValueChange={v => patchFilters({ reportingToId: v === '_all' ? '' : v })}
          >
            <SelectTrigger className="h-8 w-40 text-xs gap-1.5">
              <Building2 size={12} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="All managers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All managers</SelectItem>
              {hierarchyData.reportingTo.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {userName(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={source || '_all'}
          onValueChange={v => patchFilters({ source: v === '_all' ? '' : v })}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All sources</SelectItem>
            {SOURCE_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>
                {SOURCE_META[s]?.label ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status || '_all'}
          onValueChange={v => patchFilters({ status: v === '_all' ? '' : v })}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(hasAnyFilter ||
          !(
            dateRange?.from &&
            dateRange?.to &&
            dateRange.from.getTime() === dateRange.to.getTime() &&
            format(dateRange.from, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd')
          )) && (
          <button
            onClick={resetToYesterday}
            className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 ml-1"
          >
            <X size={11} /> Reset to yesterday
          </button>
        )}
      </div>

      {/* ── Scroll area ── */}
      <div className="flex-1 overflow-y-auto bg-background">
        {/* Top stat cards */}
        <div className="grid grid-cols-6 gap-3 px-5 py-4">
          <StatCard
            label="Total parsed"
            value={stats?.total ?? 0}
            sub={`${recruiterRows.length} recruiters active`}
            icon={FileText}
            accentColor="#378ADD"
            loading={isLoading}
          />
          <StatCard
            label="Success rate"
            value={stats ? `${stats.successRate}%` : '—'}
            sub={`${(stats?.byStatus.SUCCESS ?? 0) + (stats?.byStatus.DRAFT ?? 0)} ingested`}
            icon={CheckCircle2}
            accentColor="#10B981"
            loading={isLoading}
          />
          <StatCard
            label="Manual uploads"
            value={stats?.bySource.MANUAL_UPLOAD ?? 0}
            sub="recruiter uploads"
            icon={Upload}
            accentColor="#7F77DD"
            loading={isLoading}
            active={source === 'MANUAL_UPLOAD'}
            onClick={() =>
              patchFilters({ source: source === 'MANUAL_UPLOAD' ? '' : 'MANUAL_UPLOAD' })
            }
          />
          <StatCard
            label="Portal / Naukri"
            value={stats?.bySource.PORTAL ?? 0}
            sub="portal pulls"
            icon={Globe}
            accentColor="#378ADD"
            loading={isLoading}
            active={source === 'PORTAL'}
            onClick={() => patchFilters({ source: source === 'PORTAL' ? '' : 'PORTAL' })}
          />
          <StatCard
            label="Extension"
            value={stats?.bySource.CHROME_EXTENSION ?? 0}
            sub="chrome extension"
            icon={Chrome}
            accentColor="#0ea5e9"
            loading={isLoading}
            active={source === 'CHROME_EXTENSION'}
            onClick={() =>
              patchFilters({ source: source === 'CHROME_EXTENSION' ? '' : 'CHROME_EXTENSION' })
            }
          />
          <StatCard
            label="Failed"
            value={stats?.byStatus.FAILED ?? 0}
            sub={
              stats
                ? `${stats.byStatus.DUPLICATE ?? 0} dup · ${stats.byStatus.MANUAL_REVIEW ?? 0} review`
                : ''
            }
            icon={AlertTriangle}
            accentColor="#E24B4A"
            loading={isLoading}
            active={status === 'FAILED'}
            onClick={() => patchFilters({ status: status === 'FAILED' ? '' : 'FAILED' })}
          />
        </div>

        {/* Recruiter table */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[13px] font-semibold text-foreground">Recruiter breakdown</p>
            <p className="text-[11px] text-muted-foreground">
              click a recruiter for attempts & errors
            </p>
          </div>
          <RecruiterMonitorTable
            rows={recruiterRows}
            loading={isLoading}
            onRowClick={setSelected}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </div>
      </div>

      {/* Drill-down */}
      <RecruiterDrawer
        recruiter={selected}
        dateFrom={dateFrom}
        dateTo={dateTo}
        requirementId={requirementId}
        reqCode={reqCodeDebounced.trim() || undefined}
        requirementLabel={requirementLabel}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export default function IngestLogsPage() {
  return (
    <Suspense fallback={null}>
      <IngestLogsContent />
    </Suspense>
  );
}

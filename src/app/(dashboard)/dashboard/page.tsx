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
  { key: 'ACTIVE', label: 'Active', icon: Zap, color: 'text-emerald-600' },
  { key: 'ON_HOLD', label: 'On hold', icon: PauseCircle, color: 'text-amber-500' },
  { key: 'CLOSED', label: 'Closed', icon: X, color: 'text-muted-foreground' },
  { key: 'PENDING_APPROVAL', label: 'Pending', icon: CheckCircle2, color: 'text-amber-500' },
  { key: 'DRAFT', label: 'Draft', icon: FileText, color: 'text-muted-foreground' },
  { key: 'CANCELLED', label: 'Cancelled', icon: Ban, color: 'text-muted-foreground' },
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
  iconColor,
  loading,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  accentColor: string;
  iconColor: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
      className={cn(
        'bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5',
        onClick && 'cursor-pointer hover:shadow-sm hover:border-border/80 transition-all'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon size={15} style={{ color: accentColor }} className="opacity-70" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-14" />
      ) : (
        <p className="text-[28px] font-medium tabular-nums leading-none text-foreground">{value}</p>
      )}
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
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
  if (loading) return <Skeleton className="h-[200px] w-full" />;

  const data = stages.map(s => ({
    name: s.label.length > 9 ? s.label.slice(0, 9) + '…' : s.label,
    fullLabel: s.label,
    active: s.active,
    onHold: s.onHold,
    inactive: s.inactive,
    code: s.code,
  }));

  return (
    <ChartContainer config={funnelChartConfig} className="h-[200px] w-full">
      <BarChart data={data} barSize={14} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
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
  if (loading) return <Skeleton className="h-[200px] w-full" />;

  const data = items.slice(0, 6).map(i => ({
    name: i.name.length > 16 ? i.name.slice(0, 16) + '…' : i.name,
    fullName: i.name,
    count: i.count,
  }));

  return (
    <ChartContainer config={buChartConfig} className="h-[200px] w-full">
      <BarChart
        layout="vertical"
        data={data}
        barSize={12}
        margin={{ top: 4, right: 24, left: 4, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          tick={{ fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          width={90}
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
            <Cell key={i} fill="#7F77DD" fillOpacity={1 - i * 0.1} />
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
      className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-border/70 hover:shadow-sm transition-all group"
      style={{ borderTopColor: color, borderTopWidth: 2.5 }}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-[10px] font-mono font-medium" style={{ color }}>
          {stage.code}
        </span>
        <ChevronRight
          size={11}
          className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors"
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-tight mb-2.5 min-h-[28px] line-clamp-2">
        {stage.label}
      </p>
      <p
        className="text-[26px] font-medium tabular-nums leading-none mb-2.5"
        style={{ color: stage.total === 0 ? 'hsl(var(--muted-foreground))' : color }}
      >
        {stage.total}
      </p>
      <div className="h-[2.5px] rounded-full bg-muted overflow-hidden mb-1.5">
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

  const priorityColor =
    a.requirement.priority === 'HIGH'
      ? '#E24B4A'
      : a.requirement.priority === 'MEDIUM'
        ? '#BA7517'
        : '#639922';

  return (
    <div
      onClick={() => router.push(`/requirements/${a.requirement.id}`)}
      className={cn(
        'px-4 py-3 border-b border-border/60 hover:bg-muted/40 cursor-pointer transition-colors',
        isBreached && 'border-l-2 border-l-destructive'
      )}
    >
      <p className="text-[10px] font-mono text-muted-foreground mb-0.5">{a.requirement.reqCode}</p>
      <p className="text-[12.5px] font-medium text-foreground truncate mb-1.5">
        <span
          className="inline-block w-[5px] h-[5px] rounded-full mr-1.5 mb-px align-middle"
          style={{ backgroundColor: priorityColor }}
        />
        {a.requirement.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground truncate">
          {a.requirement.client?.name}
          {a.requirement.serviceLine ? ` · ${a.requirement.serviceLine.name}` : ''}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-10 h-[2.5px] bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fillPct}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {a.filledOpenings}/{a.requirement.totalOpenings}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  statusFilter,
  onStatusChange,
  buId,
  onBuChange,
  serviceLineId,
  onSlChange,
  byStatus,
  busData,
  slData,
  isRecruiter,
}: {
  statusFilter: string;
  onStatusChange: (v: string) => void;
  buId: string;
  onBuChange: (v: string) => void;
  serviceLineId: string;
  onSlChange: (v: string) => void;
  byStatus: Record<string, number>;
  busData: { id: string; name: string }[] | undefined;
  slData: { id: string; name: string }[] | undefined;
  isRecruiter: boolean;
}) {
  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);

  return (
    <div
      className="bg-card border-r border-border flex flex-col"
      style={{ height: '100%', overflow: 'hidden' }}
    >
      <div className="px-4 py-4 border-b border-border">
        <p className="text-[13px] font-medium text-foreground">Jobs</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{total} requirements total</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2 px-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1 mt-1">
            Status
          </p>
          {SIDEBAR_STATUSES.map(s => {
            const count = byStatus[s.key] ?? 0;
            const isActive = statusFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => onStatusChange(statusFilter === s.key ? '' : s.key)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors',
                  isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'
                )}
              >
                <span className="flex items-center gap-2">
                  <s.icon size={13} className={isActive ? 'text-foreground' : s.color} />
                  {s.label}
                </span>
                {count > 0 && (
                  <span
                    className={cn(
                      'text-[11px]',
                      isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {!isRecruiter && busData && busData.length > 0 && (
            <>
              <div className="h-px bg-border my-2 mx-1" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1 flex items-center gap-1.5">
                <Building2 size={9} /> Business Units
              </p>
              {[{ id: '', name: 'All BUs' }, ...busData].map(b => (
                <button
                  key={b.id}
                  onClick={() => onBuChange(b.id === buId ? '' : b.id)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] truncate transition-colors',
                    buId === b.id
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/60'
                  )}
                >
                  {b.name}
                </button>
              ))}
            </>
          )}

          {!isRecruiter && slData && slData.length > 0 && (
            <>
              <div className="h-px bg-border my-2 mx-1" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1">
                Service Lines
              </p>
              {[{ id: '', name: 'All service lines' }, ...slData].map(s => (
                <button
                  key={s.id}
                  onClick={() => onSlChange(s.id === serviceLineId ? '' : s.id)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] truncate transition-colors',
                    serviceLineId === s.id
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/60'
                  )}
                >
                  {s.name}
                </button>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
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
  return (
    <div
      className="bg-card border-l border-border flex flex-col"
      style={{ height: '100%', overflow: 'hidden' }}
    >
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
            {dateRange?.from ? format(dateRange.from, 'dd MMM yy') : 'Start date'}
          </div>
          <div
            className={cn(
              'px-2 py-1.5 rounded-md border text-[10.5px] text-center',
              dateRange?.to
                ? 'border-primary/40 bg-primary/5 text-primary'
                : 'border-border text-muted-foreground'
            )}
          >
            {dateRange?.to ? format(dateRange.to, 'dd MMM yy') : 'End date'}
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

      <div className="px-4 py-2.5 border-b border-border shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          My assignments
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[12px] text-muted-foreground">
            No active assignments
          </div>
        ) : (
          assignments.map(a => <AssignmentRow key={a.id} a={a} />)
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
  buId,
  onBuChange,
  slData,
  isRecruiter,
  onNavigate,
}: {
  stats: StatsData | undefined;
  statsLoading: boolean;
  stages: PipelineStageOverview[];
  pipelineLoading: boolean;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  buId: string;
  onBuChange: (v: string) => void;
  slData: { id: string; name: string }[] | undefined;
  isRecruiter: boolean;
  onNavigate: (params: Record<string, string>) => void;
}) {
  return (
    <div className="flex flex-col overflow-y-auto bg-background" style={{ height: '100%' }}>
      {/* Stats */}
      {!isRecruiter && (
        <div className="grid grid-cols-4 gap-3 px-5 py-4 shrink-0">
          <StatCard
            label="Active requirements"
            value={stats?.active ?? 0}
            sub={`of ${stats?.totalRequirements ?? 0} total`}
            icon={Zap}
            accentColor="#639922"
            iconColor="#639922"
            loading={statsLoading}
            onClick={() => onNavigate({ status: 'ACTIVE' })}
          />
          <StatCard
            label="High priority"
            value={stats?.highPriority ?? 0}
            sub="active reqs"
            icon={TrendingUp}
            accentColor="#E24B4A"
            iconColor="#E24B4A"
            loading={statsLoading}
            onClick={() => onNavigate({ status: 'ACTIVE', priority: 'HIGH' })}
          />
          <StatCard
            label="Breached"
            value={stats?.breached ?? 0}
            sub="deadline passed"
            icon={AlertTriangle}
            accentColor="#BA7517"
            iconColor="#BA7517"
            loading={statsLoading}
            onClick={() => onNavigate({ breached: 'true' })}
          />
          <StatCard
            label="In pipeline"
            value={stats?.totalCandidates ?? 0}
            sub="across all stages"
            icon={Users}
            accentColor="#378ADD"
            iconColor="#378ADD"
            loading={statsLoading}
          />
        </div>
      )}

      {/* Charts */}
      {!isRecruiter && (
        <div className="grid grid-cols-2 gap-3 px-5 pb-4 shrink-0">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[12px] font-medium text-foreground">Pipeline funnel</p>
              <p className="text-[10px] text-muted-foreground">candidates by stage</p>
            </div>
            <div className="flex gap-3 mb-3">
              {[
                { key: 'active', color: '#378ADD', label: 'Active' },
                { key: 'onHold', color: '#EF9F27', label: 'On hold' },
                { key: 'inactive', color: '#e2e8f0', label: 'Inactive', border: true },
              ].map(l => (
                <span
                  key={l.key}
                  className="flex items-center gap-1 text-[10.5px] text-muted-foreground"
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

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[12px] font-medium text-foreground">By business unit</p>
              <p className="text-[10px] text-muted-foreground">active requirements</p>
            </div>
            <div className="flex gap-3 mb-3">
              <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
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
      )}

      {/* Stage cards */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-medium text-foreground">Candidate pipeline</p>
          <p className="text-[11px] text-muted-foreground">click any stage to view candidates</p>
        </div>
        {pipelineLoading ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
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

  const isSuperAdmin = user?.isSuperAdmin;
  const isRecruiter = user?.role?.name?.toLowerCase().includes('recruiter') ?? false;

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState('');
  const [buId, setBuId] = useState('');
  const [serviceLineId, setServiceLineId] = useState('');

  const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    if (buId) p.set('buId', buId);
    if (serviceLineId) p.set('serviceLineId', serviceLineId);
    return p.toString();
  }, [dateFrom, dateTo, buId, serviceLineId]);

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

  const stages = pipelineRes?.stages ?? [];

  // byStatus derived from stats for sidebar
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background shrink-0">
        <div>
          <p className="text-[14px] font-medium text-foreground">
            {greeting()}, {user?.firstName ?? ''}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isSuperAdmin
              ? 'Full org view — all requirements, assignments and pipeline.'
              : isRecruiter
                ? 'Your active assignments and candidate pipeline.'
                : "Here's what's happening across your requirements."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker range={dateRange} onChange={setDateRange} />
          {!isRecruiter && slData && slData.length > 0 && (
            <Select
              value={serviceLineId || '_all'}
              onValueChange={v => setServiceLineId(v === '_all' ? '' : v)}
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
        </div>
      </div>

      {/* 3-column layout — hardcoded, everything visible */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr 240px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <Sidebar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            buId={buId}
            onBuChange={setBuId}
            serviceLineId={serviceLineId}
            onSlChange={setServiceLineId}
            byStatus={byStatus}
            busData={busData}
            slData={slData}
            isRecruiter={isRecruiter}
          />
        </div>

        {/* Main */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <MainContent
            stats={stats}
            statsLoading={statsLoading}
            stages={stages}
            pipelineLoading={pipelineLoading}
            dateFrom={dateFrom}
            dateTo={dateTo}
            buId={buId}
            onBuChange={setBuId}
            slData={slData}
            isRecruiter={isRecruiter}
            onNavigate={navigate}
          />
        </div>

        {/* Right panel */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <RightPanel
            dateRange={dateRange}
            onDateChange={setDateRange}
            assignments={assignmentsRes ?? []}
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
